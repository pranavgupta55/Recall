// src/pages/MyFlashcardsPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { addDeckToHistory } from '../lib/studyHistory.js';

import StudyModal from '../components/StudyModal.jsx';
import DeckCard from '../components/DeckCard.jsx';
import DeckCreatorModal from '../components/DeckCreatorModal.jsx';
import FlashcardEditor from '../components/FlashcardEditor.jsx';

export default function MyFlashcardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  // --- FIX: Use a simple string for the selected deck name instead of a complex object ---
  const [selectedDeckName, setSelectedDeckName] = useState(null);

  useEffect(() => {
    fetchMyDecks();
  }, [user.id]);

  const fetchMyDecks = async () => {
    // No need to set loading to true here on every refetch, just initially.
    const { data, error } = await supabase.from('flashcards').select('*').eq('user_id', user.id);
    if (error) console.error('Error fetching flashcards:', error);
    else if (data) setFlashcards(data);
    setLoading(false); // Only set loading false after the initial fetch is complete
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
    const { data, error } = await supabase.from('flashcards').insert({ 
      question: '---PLACEHOLDER---', answer: '', deck: newDeckName, user_id: user.id 
    }).select();
    setIsCreatingDeck(false);
    if (error) { console.error('Error creating new deck:', error); return; }
    await fetchMyDecks();
    setSelectedDeckName(newDeckName); // Open the new deck in the StudyModal
  };
  
  const handleStartStudy = (deckName, cards) => {
    addDeckToHistory({ deckName: deckName, cards: cards });
    navigate(`/study/${encodeURIComponent(deckName)}`);
  };

  const handleSaveCard = async (cardToSave) => {
    const isEditing = !!cardToSave.id;
    
    // --- FIX: Get the deck name from the corrected state variable ---
    const deckName = selectedDeckName;
    if (!deckName) {
        console.error("No deck selected to save card into.");
        return;
    }
    
    if (isEditing) {
      const { error } = await supabase.from('flashcards').update({
        question: cardToSave.question,
        answer: cardToSave.answer
      }).eq('id', cardToSave.id);
      if (error) console.error('Error updating card:', error);
    } else {
      const { error } = await supabase.from('flashcards').insert({
        question: cardToSave.question,
        answer: cardToSave.answer,
        deck: deckName,
        user_id: user.id
      });
      if (error) console.error('Error creating card:', error);
    }
    
    setEditingCard(null);
    await fetchMyDecks();
  };
  
  // --- REMOVED: The problematic useEffect that caused the infinite loop is gone. ---

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-8">
      {isCreatingDeck && (
        <DeckCreatorModal onSave={handleCreateDeck} onCancel={() => setIsCreatingDeck(false)} />
      )}

      {editingCard && (
        <FlashcardEditor
          card={editingCard === true ? {} : editingCard}
          onSave={handleSaveCard}
          onCancel={() => setEditingCard(null)}
        />
      )}

      {/* --- FIX: Conditionally render based on selectedDeckName --- */}
      {selectedDeckName && (
        <StudyModal
          deck={selectedDeckName}
          cards={groupedByDeck[selectedDeckName] || []}
          isOwner={true}
          onClose={() => setSelectedDeckName(null)} // This is now safe
          onCardsChange={fetchMyDecks}
          decks={decks}
          onStartStudy={() => handleStartStudy(selectedDeckName, groupedByDeck[selectedDeckName])}
          onEditCard={(card) => setEditingCard(card)}
          onAddCard={() => setEditingCard(true)}
        />
      )}
      
      <h1 className="text-3xl font-bold mb-8">My Decks</h1>
      
      {loading ? (<p>Loading...</p>) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-auto-rows-fr">
          <div
            onClick={() => setIsCreatingDeck(true)}
            className="bg-card border-2 border-dashed border-muted rounded-lg p-6 flex flex-col 
                       justify-center items-center cursor-pointer hover:border-primary hover:text-primary transition-all h-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            <span className="mt-2 font-bold">Add Deck</span>
          </div>

          {decks.map(deck => (
            <DeckCard
              key={deck}
              deck={deck}
              cards={groupedByDeck[deck]}
              onClick={() => setSelectedDeckName(deck)} // Set the name string on click
            />
          ))}
        </div>
      )}
    </div>
  );
}