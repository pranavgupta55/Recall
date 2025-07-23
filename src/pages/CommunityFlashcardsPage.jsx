// src/pages/CommunityFlashcardsPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import StudyModal from '../components/StudyModal';
import DeckCard from '../components/DeckCard';

export default function CommunityFlashcardsPage() {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeckData, setSelectedDeckData] = useState(null);

  useEffect(() => {
    const fetchCommunityFlashcards = async () => {
      setLoading(true);
      // We must fetch user_id to know who owns each card
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .neq('user_id', user.id);

      if (error) console.error('Error fetching cards:', error);
      else if (data) setFlashcards(data);
      setLoading(false);
    };
    fetchCommunityFlashcards();
  }, [user.id]);

  // Grouping logic now also stores the owner_id for the deck
  const groupedByDeck = useMemo(() => {
    return flashcards.reduce((acc, card) => {
      const deck = card.deck || 'Uncategorized';
      if (!acc[deck]) {
        // Initialize with cards array and the owner's ID
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
          isOwner={false} // This is a community deck
          // Pass the owner_id to the modal for the transfer function
          deckOwnerId={selectedDeckData.owner_id} 
          onClose={() => setSelectedDeckData(null)}
          onCardsChange={() => {}}
          decks={[]}
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