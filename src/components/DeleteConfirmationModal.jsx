// src/components/DeleteConfirmationModal.jsx

import { useState } from 'react';

export default function DeleteConfirmationModal({ deckName, onConfirm, onCancel, isDeleting }) {
  const [inputValue, setInputValue] = useState('');

  const isMatch = inputValue === deckName;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]"
      onClick={onCancel}
    >
      <div 
        className="bg-card rounded-lg p-8 w-full max-w-lg animate-fade-in shadow-lg border border-secondary/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-secondary mb-4">Delete Deck</h2>
        <p className="text-muted-foreground mb-6">
          This action is irreversible and will permanently delete the deck <strong className="text-foreground">{deckName}</strong> and all of its associated flashcards.
        </p>
        
        <div className="flex flex-col gap-2">
          <label htmlFor="deckNameConfirm" className="text-sm font-semibold">
            To confirm, please type the name of the deck:
          </label>
          <input
            id="deckNameConfirm"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-muted rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onCancel} className="bg-muted hover:bg-muted/80 text-foreground font-bold py-2 px-6 rounded-lg transition-colors">
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            disabled={!isMatch || isDeleting}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}