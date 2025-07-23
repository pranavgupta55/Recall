// src/pages/MyFlashcardsPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import StudyModal from '../components/StudyModal';
import DeckCard from '../components/DeckCard'; // Renamed
import DeckCreatorModal from '../components/DeckCreatorModal'; // Renamed

export default function MyFlashcardsPage() {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeckData, setSelectedDeckData] = useState(null);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);

  useEffect(() => {
    fetchMyDecks();
  }, [user.id]);

  const fetchMyDecks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('flashcards').select('*').eq('user_id', user.id);
    if (error) console.error('Error fetching flashcards:', error);
    else if (data) setFlashcards(data);
    setLoading(false);
  };

  const groupedByDeck = useMemo(() => {
    return flashcards.reduce((acc, card) => {
      const deck = card.deck || 'Uncategorized';
      if (!acc[deck]) acc[deck] = [];
      acc[deck].push(card);
      return acc;
    }, {});
  }, [flashcards]);

  const decks = Object.keys(groupedByDeck).sort();

  const handleCreateDeck = async (newDeckName) => {
    // Create the placeholder card to represent an empty deck
    const { data, error } = await supabase.from('flashcards').insert({ 
      question: '---PLACEHOLDER---', 
      answer: '', 
      deck: newDeckName, 
      user_id: user.id 
    }).select();
    
    setIsCreatingDeck(false);
    if (error) { console.error('Error creating new deck:', error); return; }
    
    await fetchMyDecks();
    // Immediately open the new empty deck in the study modal
    setSelectedDeckData({ deck: newDeckName, cards: data });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-8">
      {isCreatingDeck && (
        <DeckCreatorModal onSave={handleCreateDeck} onCancel={() => setIsCreatingDeck(false)} />
      )}

      {selectedDeckData && (
        <StudyModal
          deck={selectedDeckData.deck}
          cards={selectedDeckData.cards}
          isOwner={true}
          onClose={() => setSelectedDeckData(null)}
          onCardsChange={(updatedCards) => {
            // This is complex because a change inside the modal affects the whole page
            // The simplest, most reliable way is to just re-fetch everything
            fetchMyDecks();
            // And also update the modal's view in real-time
            setSelectedDeckData(prev => ({ ...prev, cards: updatedCards }));
          }}
          decks={decks}
        />
      )}
      
      <h1 className="text-3xl font-bold mb-8">My Decks</h1>
      
      {loading ? (<p>Loading...</p>) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-auto-rows-fr">
          <div
            onClick={() => setIsCreatingDeck(true)}
            className="bg-card border-2 border-dashed border-muted rounded-lg p-6 flex flex-col 
                       justify-center items-center cursor-pointer hover:border-primary hover:text-primary transition-all h-60" // Made taller
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            <span className="mt-2 font-bold">Add Deck</span>
          </div>

          {decks.map(deck => (
            <DeckCard
              key={deck}
              deck={deck}
              cards={groupedByDeck[deck]}
              onClick={() => setSelectedDeckData({ deck, cards: groupedByDeck[deck] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}