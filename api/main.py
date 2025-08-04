# /api/main.py

import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, SecretStr
from typing import List, cast
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# --- Configuration & Clients ---
# ... (This part remains the same, loading from .env)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if not (SUPABASE_URL and SUPABASE_SERVICE_KEY and OPENAI_API_KEY):
    raise ValueError("One or more required environment variables are missing.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
app = FastAPI()

# --- CORS Middleware ---
origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class Flashcard(BaseModel):
    question: str
    answer: str

class FlashcardSet(BaseModel):
    flashcards: List[Flashcard]

class GenerateRequest(BaseModel):
    topic: str
    context: str = ""
    links: str = ""
    subTopics: List[str] = []
    numCards: int = 5
    tone: str = "neutral"
    conciseness: str = "standard"

class SaveRequest(BaseModel):
    userId: str
    deckName: str
    flashcards: List[Flashcard]

# --- Prompt Building Logic ---
def build_prompt_text(req: GenerateRequest) -> str:
    # Read the master template from the .md file
    template_path = Path(__file__).parent / "prompt_template.md"
    template = template_path.read_text()

    # Define persona and conciseness based on user input
    tone_map = {
        "formal": "highly formal and academic",
        "casual": "casual and easy-to-understand",
        "neutral": "neutral and informative"
    }
    conciseness_map = {
        "concise": "extremely concise, ideally a single sentence",
        "detailed": "detailed and comprehensive, providing thorough explanations",
        "standard": "direct and easy to understand"
    }
    
    # Conditionally build sections only if data is provided
    context_section = f"**Additional Context/Notes Provided by User:**\n{req.context}" if req.context else ""
    links_section = f"**Relevant Links Provided by User:**\n{req.links}" if req.links else ""
    
    if req.subTopics:
        sub_topics_text = '\n- '.join(req.subTopics)
        sub_topics_section = f"**Required Sub-Topics:**\n- {sub_topics_text}"
    else:
        sub_topics_section = ""

    # sub_topics_section = f"**Required Sub-Topics:**\n- {'\n- '.join(req.subTopics)}" if req.subTopics else ""

    # Populate the template
    return template.format(
        persona_details=tone_map.get(req.tone, "neutral and informative"),
        num_cards=req.numCards,
        conciseness_instruction=conciseness_map.get(req.conciseness, "direct and easy to understand"),
        topic=req.topic,
        context_section=context_section,
        links_section=links_section,
        sub_topics_section=sub_topics_section
    )

# --- LangChain Setup ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0.8, api_key=SecretStr(OPENAI_API_KEY))

# --- API Endpoints ---
@app.post("/api/generate", response_model=FlashcardSet)
async def generate_cards(request: GenerateRequest):
    print("\n--- NEW GENERATE REQUEST ---")
    try:
        # 1. Build the dynamic prompt
        full_prompt_text = build_prompt_text(request)
        print("--- BUILT PROMPT ---")
        print(full_prompt_text)
        
        # 2. Create the chain with the dynamic prompt
        prompt = ChatPromptTemplate.from_messages([("human", full_prompt_text)])
        chain = prompt | model.with_structured_output(FlashcardSet)
        
        # 3. Invoke the chain and cast the result
        raw_result = await chain.ainvoke({}) # Topic is now inside the formatted prompt
        result = cast(FlashcardSet, raw_result)
        
        print(f"--- AI response received with {len(result.flashcards)} cards. ---")
        return result

    except Exception as e:
        import traceback
        print("\n!!! --- AN ERROR OCCURRED --- !!!")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save")
async def save_cards(request: SaveRequest):
    print(f"\n--- NEW SAVE REQUEST for deck '{request.deckName}' ---")
    try:
        cards_to_insert = [
            {"question": card.question, "answer": card.answer, "deck": request.deckName, "user_id": request.userId}
            for card in request.flashcards
        ]
        
        if not cards_to_insert:
            raise HTTPException(status_code=400, detail="No flashcards provided to save.")

        _, count = supabase.table("flashcards").insert(cards_to_insert).execute()
        print(f"--- Successfully inserted {len(cards_to_insert)} cards. ---")
        
        return {"message": f"Successfully created deck '{request.deckName}'!"}
    
    except Exception as e:
        import traceback
        print("\n!!! --- AN ERROR OCCURRED --- !!!")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))