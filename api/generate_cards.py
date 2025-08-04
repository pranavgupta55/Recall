# /api/generate_cards.py

import os
import json
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, SecretStr
from typing import List, cast
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
# --- FIX 1: Using the simpler, more robust JsonOutputParser ---
from langchain_core.output_parsers import JsonOutputParser

# --- Configuration ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if not (SUPABASE_URL and SUPABASE_SERVICE_KEY and OPENAI_API_KEY):
    raise ValueError("One or more required environment variables are missing.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# --- FastAPI and CORS Setup ---
app = FastAPI()

origins = [ "http://localhost:5173" ] # Your React app's origin

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class Flashcard(BaseModel):
    question: str = Field(description="The question for the flashcard")
    answer: str = Field(description="The answer to the flashcard")

class FlashcardSet(BaseModel):
    """A structured set of flashcards."""
    flashcards: List[Flashcard] = Field(description="An array of flashcard objects")

class GenerateRequest(BaseModel):
    topic: str
    userId: str

# --- LangChain Setup ---
model = ChatOpenAI(model="gpt-4-turbo", temperature=0.8, api_key=SecretStr(OPENAI_API_KEY))
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert flashcard creator. Generate a concise and informative set of 5 flashcards based on the user's topic."),
    ("human", "Please create flashcards for the following topic: {topic}"),
])

# --- FIX 2: Using the modern, stable .bind_tools() method ---
# This is the direct replacement for the deprecated `bind_functions`
structured_llm = model.bind_tools([FlashcardSet])

# The output of bind_tools is an AIMessage with tool_calls. We need to parse it.
# This chain extracts the arguments from the first tool call and parses them as JSON.
parser = lambda msg: msg.tool_calls[0]["args"]

chain = prompt | structured_llm | parser

@app.post("/api/generate_cards")
async def generate_and_save_cards(request: GenerateRequest):
    print(f"\n--- NEW REQUEST: Topic '{request.topic}' ---")
    try:
        result = await chain.ainvoke({"topic": request.topic})
        print(f"--- AI response received: {result} ---")
        
        generated_cards = result.get("flashcards", [])

        cards_to_insert = [
            {"question": card['question'], "answer": card['answer'], "deck": request.topic, "user_id": request.userId}
            for card in generated_cards
        ]
        
        if not cards_to_insert:
            raise HTTPException(status_code=400, detail="AI failed to generate cards.")

        print(f"--- Inserting {len(cards_to_insert)} cards into Supabase... ---")
        _, count = supabase.table("flashcards").insert(cards_to_insert).execute()
        print(f"--- Insertion successful. ---")

        return {"message": f"Successfully created {len(cards_to_insert)} flashcards!"}

    except Exception as e:
        import traceback
        print("\n!!! --- AN ERROR OCCURRED --- !!!")
        traceback.print_exc()
        print("!!! --- END OF ERROR --- !!!")
        raise HTTPException(status_code=500, detail=str(e))