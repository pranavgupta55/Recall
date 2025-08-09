# api/main.py

import os
import json
from dotenv import load_dotenv
from pathlib import Path
import traceback

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, SecretStr
from typing import List, cast
from supabase import create_client, Client

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langchain_core.pydantic_v1 import SecretStr as PydanticSecretStr
from langchain_core.output_parsers import JsonOutputParser

# --- Configuration & Clients ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# --- Define the token limit on the server ---
TOKEN_LIMIT = 100000 

if not (SUPABASE_URL and SUPABASE_SERVICE_KEY and OPENAI_API_KEY):
    raise ValueError("One or more required environment variables are missing.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
app = FastAPI()

# --- CORS Middleware ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173", "https://recall-ai-beta.vercel.app/"]
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
    userId: str 
    topic: str
    context: str = ""
    links: str = ""
    userDefinedCards: List[Flashcard] = []
    numCards: int = 5
    conciseness: str = "standard"
    technicality: str = "standard"
    formatting: str = "standard"

class SaveRequest(BaseModel):
    userId: str
    deckName: str
    flashcards: List[Flashcard]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    userId: str
    messages: List[ChatMessage]
    
class DeleteDeckRequest(BaseModel):
    userId: str
    deckName: str

# --- LangChain Setup ---
model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, api_key=SecretStr(OPENAI_API_KEY))

# --- Helper function to check token usage ---
def check_token_limit(user_id: str):
    """Checks if a user is over their token limit. Raises HTTPException if they are."""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID is required for this operation.")
        
    try:
        profile_res = supabase.table("profiles").select("tokens_used").eq("id", user_id).single().execute()
        
        if not profile_res.data:
             raise HTTPException(status_code=404, detail="User profile not found.")

        tokens_used = profile_res.data.get("tokens_used", 0)
        
        if tokens_used >= TOKEN_LIMIT:
            raise HTTPException(
                status_code=429, # "Too Many Requests"
                detail=f"You have exceeded your monthly token limit of {TOKEN_LIMIT}. Please wait until next month."
            )
            
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Could not verify token usage: {str(e)}")


# --- API Endpoints ---
@app.post("/api/generate", response_model=FlashcardSet)
async def generate_cards(request: GenerateRequest):
    """
    Generates a set of flashcards, checking the user's token limit first.
    """
    check_token_limit(request.userId)
    
    try:
        template_path = Path(__file__).parent / "prompt_template.md"
        prompt_template = template_path.read_text()
        
        parser = JsonOutputParser(pydantic_object=FlashcardSet)

        prompt = prompt_template.format(
            num_cards=request.numCards,
            topic=request.topic,
            context=request.context,
            links=request.links,
            user_defined_cards=json.dumps([card.dict() for card in request.userDefinedCards], indent=2),
            conciseness=request.conciseness,
            technicality=request.technicality,
            formatting=request.formatting,
            format_instructions=parser.get_format_instructions()
        )
        
        # --- THIS IS THE FIX ---
        # Revert to using the LangChain Expression Language (LCEL) chain.
        # This correctly pipes the model's AIMessage output to the parser, 
        # which knows how to extract the string content before parsing the JSON.
        chain = model | parser
        response_data = await chain.ainvoke(prompt)
        
        # Note: This endpoint is only capped, it does not increment token usage.
        # The /api/chat endpoint handles the incrementing.

        return response_data

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred during generation: {str(e)}")


@app.post("/api/save")
async def save_cards(request: SaveRequest):
    """
    Saves a set of flashcards to a user's deck in the database.
    """
    if not request.userId or not request.deckName or not request.flashcards:
        raise HTTPException(status_code=400, detail="User ID, Deck Name, and flashcards are required.")

    try:
        records_to_insert = [
            {
                "user_id": request.userId,
                "deck": request.deckName,
                "question": card.question,
                "answer": card.answer,
            }
            for card in request.flashcards
        ]
        
        data, count = supabase.table("flashcards").insert(records_to_insert).execute()

        return {"message": f"Successfully saved {len(records_to_insert)} cards to deck '{request.deckName}'."}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while saving: {str(e)}")


@app.post("/api/chat")
async def chat_with_card(request: ChatRequest):
    """
    Handles a chat interaction, checking the token limit and tracking usage.
    """
    check_token_limit(request.userId)
    
    try:
        langchain_messages: List[BaseMessage] = []
        for msg in request.messages:
            if msg.role == 'system':
                langchain_messages.append(SystemMessage(content=msg.content))
            elif msg.role == 'user':
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == 'ai':
                langchain_messages.append(AIMessage(content=msg.content))
        
        response = await model.ainvoke(langchain_messages)
        
        token_usage = response.response_metadata.get('token_usage', {})
        total_tokens = token_usage.get('total_tokens', 0)

        if total_tokens > 0 and request.userId:
            supabase.rpc('increment_tokens', {'user_id_input': request.userId, 'token_increment': total_tokens}).execute()

        return {
            "reply": response.content,
            "token_info": {
                "prompt_tokens": token_usage.get('prompt_tokens', 0),
                "completion_tokens": token_usage.get('completion_tokens', 0),
                "total_tokens": total_tokens,
            }
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/delete-deck")
async def delete_deck(request: DeleteDeckRequest):
    """
    Deletes all flashcards associated with a specific user ID and deck name.
    """
    if not request.userId or not request.deckName:
        raise HTTPException(status_code=400, detail="User ID and Deck Name are required.")

    try:
        data, count = supabase.table("flashcards") \
            .delete() \
            .eq("user_id", request.userId) \
            .eq("deck", request.deckName) \
            .execute()
            
        if count == 0:
            return {"message": f"No cards found for deck '{request.deckName}' to delete."}

        return {"message": f"Successfully deleted deck '{request.deckName}' and its cards."}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")