// src/components/MoveCardModal.jsx

import { useState } from 'react';
import DeckSelector from './DeckSelector.jsx';

export default function MoveCardModal({ currentDeck, decks, onMove, onCancel }) {
  const [targetDeck, setTargetDeck] = useState('');

  const handleMove = () => {
    const finalDeck = targetDeck.trim().toLowerCase();
    if (finalDeck && finalDeck !== currentDeck) {
      onMove(finalDeck);
    } else if (finalDeck === currentDeck) {
      alert("You can't move a card to the same deck.");
    } else {
      alert('Please select or create a deck to move the card to.');
    }
  };

  return (
    // The main overlay now stops click propagation
    <div 
      className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-card rounded-lg shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-4">Move Card to...</h2>
        <DeckSelector
          decks={decks}
          currentDeck={currentDeck}
          onSelect={(deck) => setTargetDeck(deck)}
        />
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={onCancel} className="bg-muted hover:bg-muted/80 text-foreground font-bold py-2 px-6 rounded-lg">Cancel</button>
          <button onClick={handleMove} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-lg">Move</button>
        </div>
      </div>
    </div>
  );
}