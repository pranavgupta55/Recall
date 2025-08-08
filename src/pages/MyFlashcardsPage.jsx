// src/pages/MyFlashcardsPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
// --- MODIFIED: Import the new cleanup function ---
import { addDeckToHistory, removeDeckFromHistory } from '../lib/studyHistory.js';

import StudyModal from '../components/StudyModal.jsx';
import DeckCard from '../components/DeckCard.jsx';
import DeckCreatorModal from '../components/DeckCreatorModal.jsx';
import FlashcardEditor from '../components/FlashcardEditor.jsx';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.jsx';

export default function MyFlashcardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [selectedDeckName, setSelectedDeckName] = useState(null);

  const [deckToDelete, setDeckToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMyDecks();
  }, [user.id]);

  const fetchMyDecks = async () => {
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
    const { error } = await supabase.from('flashcards').insert({ 
      question: '---PLACEHOLDER---', answer: '', deck: newDeckName, user_id: user.id 
    });
    setIsCreatingDeck(false);
    if (error) { console.error('Error creating new deck:', error); return; }
    await fetchMyDecks();
    setSelectedDeckName(newDeckName);
  };
  
  const handleStartStudy = (deckName, cards) => {
    // We update the history with the latest card count here
    addDeckToHistory({ 
        deckName: deckName, 
        cardCount: cards.filter(c => c.question !== '---PLACEHOLDER---').length,
        cards: cards 
    });
    navigate(`/study/${encodeURIComponent(deckName)}`);
  };

  const handleSaveCard = async (cardToSave) => {
    if (!cardToSave) return;
    const { id, ...otherFields } = cardToSave;
    const dataToUpsert = { ...otherFields, user_id: user.id };
    if (!dataToUpsert.deck) dataToUpsert.deck = selectedDeckName;
    const { error } = await supabase.from('flashcards').upsert(dataToUpsert);
    if (error) console.error('Error saving card:', error);
    setEditingCard(null);
    await fetchMyDecks();
  };

  // --- MODIFIED: This function now cleans up localStorage ---
  const handleConfirmDelete = async () => {
    if (!deckToDelete) return;
    setIsDeleting(true);
    try {
        const response = await fetch('/api/delete-deck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, deckName: deckToDelete })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Failed to delete deck.');
        
        // --- BUG FIX: Remove the deleted deck from localStorage history ---
        removeDeckFromHistory(deckToDelete);
        
        // Close modals and refresh data from the database
        setDeckToDelete(null);
        setSelectedDeckName(null);
        await fetchMyDecks();

    } catch (error) {
        console.error("Error deleting deck:", error);
        alert(`Error: ${error.message}`);
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-8">
      {deckToDelete && (
        <DeleteConfirmationModal
            deckName={deckToDelete}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeckToDelete(null)}
            isDeleting={isDeleting}
        />
      )}
      
      {isCreatingDeck && <DeckCreatorModal onSave={handleCreateDeck} onCancel={() => setIsCreatingDeck(false)} />}
      {editingCard && <FlashcardEditor card={editingCard === true ? {deck: selectedDeckName} : editingCard} onSave={handleSaveCard} onCancel={() => setEditingCard(null)} />}

      {selectedDeckName && (
        <StudyModal
          deck={selectedDeckName}
          cards={groupedByDeck[selectedDeckName] || []}
          isOwner={true}
          onClose={() => setSelectedDeckName(null)}
          onCardsChange={fetchMyDecks}
          decks={decks}
          onStartStudy={() => handleStartStudy(selectedDeckName, groupedByDeck[selectedDeckName])}
          onEditCard={(card) => setEditingCard(card)}
_         onAddCard={() => setEditingCard(true)}
          onDeleteRequest={(deck) => setDeckToDelete(deck)}
        />
      )}
      
      <h1 className="text-3xl font-bold mb-8">My Decks</h1>
      
      {loading ? (<p>Loading...</p>) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-auto-rows-fr">
          <div
            onClick={() => setIsCreatingDeck(true)}
            className="bg-card border-2 border-dashed border-muted rounded-lg p-6 flex flex-col justify-center items-center cursor-pointer hover:border-primary hover:text-primary transition-all h-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            <span className="mt-2 font-bold">Add Deck</span>
          </div>

          {decks.map(deck => (
            <DeckCard
              key={deck}
              deck={deck}
              cards={groupedByDeck[deck]}
              onClick={() => setSelectedDeckName(deck)}
            />
          ))}
        </div>
      )}
    </div>
  );
}