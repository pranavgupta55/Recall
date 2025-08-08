// src/components/StudyModal.jsx

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import DeckSelector from './DeckSelector.jsx';
import { FiTrash2 } from 'react-icons/fi'; // <-- IMPORT a trash icon

export default function StudyModal({
  deck,
  cards: initialCards,
  isOwner,
  onClose,
  onCardsChange,
  decks,
  onStartStudy,
  onAddCard,
  onEditCard,
  onDeleteRequest // <-- This prop is now used
}) {
  const [cards, setCards] = useState(initialCards);
  const [selectedCards, setSelectedCards] = useState([]);
  const [isMoving, setIsMoving] = useState(false);
  const [moveTargetDeck, setMoveTargetDeck] = useState('');

  // Keep internal `cards` state in sync with parent props
  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  const displayableCards = useMemo(() => {
    return cards.filter(c => c.question !== '---PLACEHOLDER---');
  }, [cards]);

  const toggleCardSelection = (cardId) => {
    setSelectedCards(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedCards.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedCards.length} card(s)?`)) return;

    const { error } = await supabase.from('flashcards').delete().in('id', selectedCards);
    if (error) {
      console.error('Error deleting cards:', error);
    } else {
      setSelectedCards([]);
      onCardsChange();
    }
  };

  const handleMoveSelected = async () => {
    const finalDeckName = moveTargetDeck.trim();
    if (selectedCards.length === 0 || !finalDeckName) return;
    if (!window.confirm(`Move ${selectedCards.length} card(s) to "${finalDeckName}"?`)) return;

    const { error } = await supabase.from('flashcards').update({ deck: finalDeckName }).in('id', selectedCards);
    if (error) {
      console.error('Error moving cards:', error);
    } else {
      setSelectedCards([]);
      setIsMoving(false);
      onCardsChange();
      onClose(); // Close the modal since the context has changed
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-40" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-4xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-3xl font-bold capitalize">{deck}</h2>
          
          {/* --- MODIFIED: Container for top-right buttons --- */}
          <div className="flex items-center gap-3">
            {/* --- NEW: Delete Deck Button --- */}
            {isOwner && (
              <button 
                onClick={() => onDeleteRequest(deck)} 
                className="p-2 rounded-full text-muted-foreground hover:bg-secondary/20 hover:text-secondary transition-colors"
                title="Delete Entire Deck"
              >
                <FiTrash2 size={22} />
              </button>
            )}
            <button onClick={onClose} className="text-4xl leading-none text-muted-foreground hover:text-foreground">&times;</button>
          </div>
        </div>

        {isOwner && (
          <div className="flex flex-wrap gap-4 items-center mb-6 pb-6 border-b border-muted">
            <button onClick={onAddCard} className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg">Add New Flashcard</button>
            <button onClick={onStartStudy} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Study Deck</button>
            {selectedCards.length > 0 && (
              <>
                <button onClick={() => setIsMoving(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Move ({selectedCards.length})</button>
                <button onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Delete ({selectedCards.length})</button>
              </>
            )}
          </div>
        )}
        
        {isMoving && (
          <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg animate-fade-in">
            <div className="flex-grow"><DeckSelector decks={decks} currentDeck={deck} onSelect={setMoveTargetDeck} /></div>
            <button onClick={handleMoveSelected} className="bg-primary text-primary-foreground font-bold py-2 px-6 rounded-lg">Move</button>
            <button onClick={() => setIsMoving(false)} className="bg-muted hover:bg-muted/80 font-bold py-2 px-6 rounded-lg">Cancel</button>
          </div>
        )}

        {/* --- REVERTED: Restored original card list layout --- */}
        <div className="flex-grow overflow-y-auto space-y-3 p-2">
          {displayableCards.length > 0 ? displayableCards.map(card => (
            <div
              key={card.id}
              className={`bg-card p-4 rounded-lg flex items-start gap-4 transition-colors duration-200 ${selectedCards.includes(card.id) ? 'ring-2 ring-primary' : 'ring-0'}`}
            >
              {isOwner && (
                <input
                  type="checkbox"
                  checked={selectedCards.includes(card.id)}
                  onChange={() => toggleCardSelection(card.id)}
                  className="w-5 h-5 rounded mt-1 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                  <p className="font-semibold break-words">{card.question}</p>
                  <p className="text-muted-foreground mt-1 break-words">{card.answer}</p>
              </div>
              {isOwner && (
                  <button onClick={() => onEditCard(card)} className="text-sm font-semibold hover:text-primary ml-auto pl-4">Edit</button>
              )}
            </div>
          )) : <p className="text-center text-muted-foreground italic mt-10">This deck has no cards. Click "Add New Flashcard" to get started.</p>}
        </div>
      </div>
    </div>
  );
}