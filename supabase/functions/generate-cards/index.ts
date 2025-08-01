// File: supabase/functions/generate-cards/index.ts

import { corsHeaders } from '../_shared/cors.ts';

// Using the correct, stable URLs and import paths.
import { ChatOpenAI } from "https://esm.sh/@langchain/openai@0.2.0";
import { ChatPromptTemplate } from "https://esm.sh/@langchain/core@0.2.1/prompts";
import { z } from "https://esm.sh/zod@3.23.8";

// 1. Define the schema for the final JSON object we want.
const outputSchema = z.object({
  flashcards: z.array(
    z.object({
      question: z.string().describe("The question for the flashcard"),
      answer: z.string().describe("The answer to the flashcard"),
    })
  ).describe("An array of flashcard objects"),
});

// 2. Initialize the powerful GPT-4 model.
const model = new ChatOpenAI({
  model: "gpt-4-turbo",
  temperature: 0.8,
});

// 3. Create the prompt template.
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are an expert flashcard creator. Generate a concise and informative set of 5 flashcards based on the user's topic."],
  ["human", "Please create flashcards for the following topic: {topic}"],
]);

// 4. --- THE CORRECT APPROACH ---
//    Create a new runnable model that is bound to our desired output schema.
const structuredModel = model.withStructuredOutput(outputSchema);

// 5. Create the final chain by piping the prompt directly to our new structured model.
const chain = prompt.pipe(structuredModel);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    if (!topic) {
      throw new Error("Missing 'topic' in request body");
    }

    // 6. Invoke the chain. The result is now a guaranteed-to-be-correct JS object.
    const result = await chain.invoke({ topic: topic });
    
    // The result directly matches our schema, so we can access result.flashcards
    return new Response(JSON.stringify({ flashcards: result.flashcards }), {
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