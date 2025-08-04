# /api/main.py

import os
import json
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
    userDefinedCards: List[Flashcard] = []
    numCards: int = 5
    tone: str = "neutral"
    conciseness: str = "standard"

class SaveRequest(BaseModel):
    userId: str
    deckName: str
    flashcards: List[Flashcard]

# --- Prompt Building Logic ---
def build_prompt_text(req: GenerateRequest) -> str:
    template_path = Path(__file__).parent / "prompt_template.md"
    template = template_path.read_text()

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
    
    context_section = f"**Additional Context/Notes Provided by User:**\n{req.context}" if req.context else ""
    links_section = f"**Relevant Links Provided by User:**\n{req.links}" if req.links else ""
    
    user_cards_str = "\n".join([f"- Q: {card.question if card.question else '(empty)'} | A: {card.answer if card.answer else '(empty)'}" for card in req.userDefinedCards])
    user_cards_section = f"{user_cards_str}" if user_cards_str else "None"

    num_to_generate = req.numCards - len(req.userDefinedCards)

    return template.format(
        persona_details=tone_map.get(req.tone, "neutral and informative"),
        num_cards_to_generate=max(req.numCards, len(req.userDefinedCards)), # Ensure we generate at least enough to fill user cards
        conciseness_instruction=conciseness_map.get(req.conciseness, "direct and easy to understand"),
        topic=req.topic,
        context_section=context_section,
        links_section=links_section,
        user_cards_section=user_cards_section
    )

# --- LangChain Setup ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0.8, api_key=SecretStr(OPENAI_API_KEY))

# --- API Endpoints ---
@app.post("/api/generate")
async def generate_cards(request: GenerateRequest):
    try:
        full_prompt_text = build_prompt_text(request)
        prompt = ChatPromptTemplate.from_messages([("human", full_prompt_text)])
        chain = prompt | model.with_structured_output(FlashcardSet)
        
        raw_result = await chain.ainvoke({})
        result = cast(FlashcardSet, raw_result)
        
        # We need the raw output for the new UI feature
        raw_output_for_frontend = json.dumps(result.dict(), indent=2)

        return {
            "flashcards": result.flashcards, 
            "raw_output": raw_output_for_frontend,
            "prompt_sent": full_prompt_text  # Add this line
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save")
async def save_cards(request: SaveRequest):
    # This endpoint remains largely the same
    try:
        cards_to_insert = [
            {"question": card.question, "answer": card.answer, "deck": request.deckName, "user_id": request.userId}
            for card in request.flashcards
        ]
        
        if not cards_to_insert:
            raise HTTPException(status_code=400, detail="No flashcards provided to save.")

        _, count = supabase.table("flashcards").insert(cards_to_insert).execute()
        
        return {"message": f"Successfully created deck '{request.deckName}'!"}
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))