// Add FiPlay to the import from react-icons/fi
import { FiPlay } from 'react-icons/fi';
import { useState } from 'react';
import FlashcardEditor from './FlashcardEditor.jsx';
import MoveCardModal from './MoveCardModal.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';

// Add the new onStartStudy prop
export default function StudyModal({ deck, cards, onClose, onCardsChange, decks, isOwner = false, deckOwnerId = null, onStartStudy }) {
  const { user } = useAuth();
  const [editingCard, setEditingCard] = useState(null);
  const [movingCard, setMovingCard] = useState(null);

  // ... (rest of the component logic remains the same)

  // --- Handlers from original file ---
  const displayableCards = cards.filter(c => c.question !== '---PLACEHOLDER---');
  const handleOverlayClick = (e) => { if (e.target === e.currentTarget) onClose(); };
  const handleTransferDeck = async () => { /* ... */ };
  const handleSaveCard = async (cardToSave) => { /* ... */ };
  const handleDelete = async (cardId) => { /* ... */ };
  const handleMoveCard = async (newDeck) => { /* ... */ };


  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 sm:p-8 z-40" onClick={handleOverlayClick}>
      {/* ... (editing and moving modals) ... */}
      
      <div className="bg-card rounded-lg shadow-2xl w-full max-w-5xl h-[90%] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-muted">
            <h2 className="text-2xl font-bold capitalize">{deck}</h2>
            <div className="flex items-center gap-4">
                {isOwner && (
                    <button onClick={onStartStudy} className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg hover:bg-primary/90 flex items-center gap-2">
                        <FiPlay /> Study Deck
                    </button>
                )}
                {!isOwner && (
                    <button onClick={handleTransferDeck} className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg hover:bg-primary/90">
                    Transfer to My Account
                    </button>
                )}
                <button onClick={onClose} className="bg-secondary text-secondary-foreground font-bold p-2 rounded-full hover:bg-secondary/90" title="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </header>
        
        {/* ... (rest of the modal content for viewing/editing cards) ... */}
         <div className="flex-grow p-6 overflow-y-auto space-y-4">
          {displayableCards.length === 0 && isOwner ? (
            <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full">
              <p>This deck is empty.</p>
              <p>Add a card to get started!</p>
            </div>
           ) : (
            displayableCards.map(card => (
              <div key={card.id} onClick={() => isOwner && setEditingCard(card)}
                className={`bg-background p-4 rounded-lg flex justify-between items-start group transition-all duration-300 ${isOwner ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer' : ''}`}
              >
                <div>
                  <p className="font-semibold">{card.question}</p>
                  <p className="text-muted-foreground mt-2">{card.answer}</p>
                </div>
                {isOwner && (
                  <div className="flex gap-2 flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditingCard(card)} className="bg-muted hover:bg-primary text-foreground hover:text-primary-foreground p-2 rounded-full" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setMovingCard(card)} className="bg-muted hover:bg-primary text-foreground hover:text-primary-foreground p-2 rounded-full" title="Move">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(card.id)} className="bg-muted hover:bg-secondary text-foreground hover:text-secondary-foreground p-2 rounded-full" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {isOwner && (
          <footer className="p-4 border-t border-muted">
            <button onClick={() => setEditingCard({})} className="w-full border-2 border-dashed border-muted rounded-lg p-4 text-muted-foreground flex justify-center items-center gap-2 hover:border-primary hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add New Card
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}