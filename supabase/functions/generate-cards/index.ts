// File: supabase/functions/generate-cards/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenAI } from "https://esm.sh/langchain/llms/openai";
import { PromptTemplate } from "https://esm.sh/langchain/prompts";
import { CommaSeparatedListOutputParser } from "https://esm.sh/langchain/output_parsers";

// CORS Headers are essential for your web app to talk to this function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize the LangChain components
const llm = new OpenAI({ 
  openAIApiKey: Deno.env.get("OPENAI_API_KEY")!, // Securely reads the API key
  temperature: 0.7 
});
const parser = new CommaSeparatedListOutputParser();
const template = `You are a helpful assistant that generates flashcards. Based on the topic "{topic}", generate 5 flashcard questions and answers.
Return ONLY a comma-separated list of questions and answers, alternating. Do not include any other text, numbering, or explanations.
Format: "Question 1,Answer 1,Question 2,Answer 2,..."

{format_instructions}
`;
const prompt = new PromptTemplate({
  template,
  inputVariables: ["topic"],
  partialVariables: { format_instructions: parser.getFormatInstructions() },
});

// The main server logic
serve(async (req) => {
  // This is a preflight request. It's a security check browsers do.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { topic } = await req.json();
    if (!topic) throw new Error("No topic provided.");

    const input = await prompt.format({ topic });
    const response = await llm.call(input);
    const parsedResponse = await parser.parse(response);

    // LangChain returns a flat array: ['q1', 'a1', 'q2', 'a2', ...]
    // We need to group it back into an array of objects: [{q: 'q1', a: 'a1'}, ...]
    const flashcards = [];
    for (let i = 0; i < parsedResponse.length; i += 2) {
      if (parsedResponse[i+1]) { // Ensure we have a pair
        flashcards.push({ question: parsedResponse[i].trim(), answer: parsedResponse[i+1].trim() });
      }
    }

    return new Response(
      JSON.stringify({ flashcards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})