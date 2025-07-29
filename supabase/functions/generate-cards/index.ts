// File: supabase/functions/generate-cards/index.ts

import { corsHeaders } from '../_shared/cors.ts';
// --- NO MORE LANGCHAIN ---
// We now use the official, stable OpenAI library.
import OpenAI from "https://esm.sh/openai@4.52.7";

// Initialize the OpenAI client directly.
// It automatically looks for the OPENAI_API_KEY in the environment.
const openai = new OpenAI();

type Flashcard = {
  question: string;
  answer: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();

    if (!topic) {
      throw new Error("Missing 'topic' in request body");
    }

    // Manually create the prompt string. This is all LangChain was doing for us.
    const prompt = `You are a helpful assistant that generates flashcards. Based on the topic "${topic}", generate 5 flashcard questions and answers. Return ONLY a comma-separated list of questions and answers, alternating. Format: "Question 1,Answer 1,Question 2,Answer 2,..."`;

    // Use the official OpenAI client to call the API.
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // A standard, cost-effective model
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;

    if (!responseText) {
      throw new Error("Received an empty response from OpenAI.");
    }

    // Parse the comma-separated list.
    const parsedResponse = responseText.split(',').map(item => item.trim());

    const flashcards = parsedResponse.reduce<Flashcard[]>((acc, cur, i) => {
      if (i % 2 === 0) {
        acc.push({ question: cur, answer: '' });
      } else {
        if (acc.length > 0) {
          acc[acc.length - 1].answer = cur;
        }
      }
      return acc;
    }, []);

    return new Response(JSON.stringify({ flashcards }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error("Error in generate-cards function:", error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});