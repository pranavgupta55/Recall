// src/pages/CommunityFlashcardsPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import StudyModal from '../components/StudyModal.jsx';
import DeckCard from '../components/DeckCard.jsx';

export default function CommunityFlashcardsPage() {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeckData, setSelectedDeckData] = useState(null);
  const [myDecks, setMyDecks] = useState([]); // <-- NEW: State for user's own decks

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user.id) return;
      setLoading(true);

      // --- MODIFIED: Fetch community cards and user's decks simultaneously ---
      const [communityRes, myDecksRes] = await Promise.all([
        supabase.from('flashcards').select('*').neq('user_id', user.id),
        supabase.from('flashcards').select('deck').eq('user_id', user.id)
      ]);

      if (communityRes.error) console.error('Error fetching community cards:', communityRes.error);
      else if (communityRes.data) setFlashcards(communityRes.data);
      
      if (myDecksRes.error) console.error('Error fetching user decks:', myDecksRes.error);
      else if (myDecksRes.data) {
        const uniqueDecks = [...new Set(myDecksRes.data.map(d => d.deck))];
        setMyDecks(uniqueDecks);
      }

      setLoading(false);
    };
    fetchAllData();
  }, [user.id]);

  const groupedByDeck = useMemo(() => {
    return flashcards.reduce((acc, card) => {
      const deck = card.deck || 'Uncategorized';
      if (!acc[deck]) {
        acc[deck] = { cards: [], owner_id: card.user_id };
      }
      acc[deck].cards.push(card);
      return acc;
    }, {});
  }, [flashcards]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-8">
      {selectedDeckData && (
        <StudyModal
          deck={selectedDeckData.deck}
          cards={selectedDeckData.cards}
          isOwner={false}
          onClose={() => setSelectedDeckData(null)}
          onCardsChange={() => {}}
          decks={myDecks} // <-- MODIFIED: Pass user's decks to the modal
          // Provide placeholder functions for owner-only actions
          onStartStudy={() => alert("Please copy this deck to your account to start a study session.")}
          onAddCard={() => {}}
          onEditCard={() => {}}
          onDeleteRequest={() => {}}
        />
      )}
      
      <h1 className="text-3xl font-bold mb-8">Community Decks</h1>
      
      {loading ? (<p>Loading...</p>) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-auto-rows-fr">
          {Object.keys(groupedByDeck).length > 0 ? (
            Object.keys(groupedByDeck).map(deck => (
              <DeckCard
                key={deck}
                deck={deck}
                cards={groupedByDeck[deck].cards}
                onClick={() => setSelectedDeckData({ 
                  deck, 
                  cards: groupedByDeck[deck].cards,
                  owner_id: groupedByDeck[deck].owner_id,
                })}
              />
            ))
          ) : (
            <p className="text-muted-foreground col-span-3 text-center">No community decks found yet.</p>
          )}
        </div>
      )}
    </div>
  );
}