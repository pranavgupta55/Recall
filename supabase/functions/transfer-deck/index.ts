// supabase/functions/transfer-deck/index.ts

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define the shape of data for TypeScript safety
interface Flashcard {
  question: string;
  answer: string;
}
interface TransferRequest {
  source_deck_name: string;
  source_owner_id: string;
}

// Helper for consistent responses and CORS
const sendResponse = (body: object, status: number = 200) => {
  return new Response(JSON.stringify(body), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
    status,
  });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const { source_deck_name, source_owner_id }: TransferRequest = await req.json();
    if (!source_deck_name || !source_owner_id) {
      return sendResponse({ error: 'Missing source_deck_name or source_owner_id' }, 400);
    }

    // 1. Get the current user making the request
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return sendResponse({ error: 'Authentication error' }, 401);

    // 2. Create a privileged admin client to bypass RLS
    const adminClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. Fetch the source owner's profile to get their email for the new deck name
    const { data: ownerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', source_owner_id)
      .single();

    if (profileError || !ownerProfile) {
      throw new Error("Could not find the source deck's owner.");
    }
    const ownerEmail = ownerProfile.email.split('@')[0]; // Use the part before the @
    const baseDeckName = `${source_deck_name} by ${ownerEmail}`;

    // 4. LOGIC TO FIND A UNIQUE DECK NAME
    let newDeckName = baseDeckName;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const { count, error: checkError } = await adminClient
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('deck', newDeckName);

      if (checkError) throw checkError;

      if (count === 0) {
        isUnique = true; // We found a unique name, exit the loop
      } else {
        newDeckName = `${baseDeckName} (${counter})`; // Append counter and try again
        counter++;
      }
    }

    // 5. Fetch the actual cards from the source deck
    const { data: sourceCards, error: selectError } = await adminClient
      .from('flashcards')
      .select('question, answer')
      .eq('deck', source_deck_name)
      .eq('user_id', source_owner_id)
      .neq('question', '---PLACEHOLDER---'); // Ignore placeholder cards

    if (selectError) throw selectError;
    if (!sourceCards || sourceCards.length === 0) {
      return sendResponse({ success: true, count: 0, message: "Source deck was empty." });
    }

    // 6. Prepare the cards for insertion with new ownership and the unique deck name
    const newCards = sourceCards.map((card: Flashcard) => ({
      question: card.question,
      answer: card.answer,
      deck: newDeckName, // Use the new unique name
      user_id: user.id,   // Assign to the current user
    }));

    // 7. Bulk insert the new cards
    const { error: insertError } = await adminClient.from('flashcards').insert(newCards);
    if (insertError) throw insertError;

    const message = `Successfully copied ${newCards.length} cards into a new deck: "${newDeckName}".`;
    return sendResponse({ success: true, count: newCards.length, message, newDeckName });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return sendResponse({ error: errorMessage }, 500);
  }
});