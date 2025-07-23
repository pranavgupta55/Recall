// src/components/DeckCreatorModal.jsx

import { useState } from 'react';

export default function DeckCreatorModal({ onSave, onCancel }) {
  const [deckName, setDeckName] = useState('');

  const handleSave = () => {
    const finalDeckName = deckName.trim().toLowerCase();
    if (finalDeckName) {
      onSave(finalDeckName);
    } else {
      alert('Please enter a deck name.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div className="bg-card rounded-lg shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-center mb-4">Create New Deck</h2>
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-background text-foreground text-center p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter deck name..."
          autoFocus
        />
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={onCancel} className="bg-muted hover:bg-muted/80 text-foreground font-bold py-2 px-6 rounded-lg">Cancel</button>
          <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-lg">Create</button>
        </div>
      </div>
    </div>
  );
}