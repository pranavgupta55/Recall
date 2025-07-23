// src/components/FlashcardEditor.jsx

import { useState, useEffect } from 'react';

export default function FlashcardEditor({ card, onSave, onCancel }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const isEditing = card && card.id;

  useEffect(() => {
    if (card) {
      setQuestion(card.question || '');
      setAnswer(card.answer || '');
    }
  }, [card]);

  const handleSave = () => {
    if (!question || !answer) {
      alert('Please fill out both the question and answer.');
      return;
    }
    onSave({ ...card, question, answer });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-card rounded-lg p-8 w-full max-w-4xl animate-fade-in">
        <h2 className="text-2xl font-bold mb-6">
          {isEditing ? 'Edit Flashcard' : 'Create New Flashcard'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className="text-muted-foreground mb-2 font-semibold">Front (Question)</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="bg-background text-foreground p-4 rounded-md w-full h-64 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter question..."
              autoFocus
            />
          </div>
          <div className="flex flex-col">
            <label className="text-muted-foreground mb-2 font-semibold">Back (Answer)</label>
            <textarea
              value={answer}
              // --- THIS IS THE FIX ---
              onChange={(e) => setAnswer(e.target.value)}
              className="bg-background text-foreground p-4 rounded-md w-full h-64 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter answer..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onCancel} className="bg-muted hover:bg-muted/80 text-foreground font-bold py-2 px-6 rounded-lg">Cancel</button>
          <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-lg">
            {isEditing ? 'Save Changes' : 'Create Card'}
          </button>
        </div>
      </div>
    </div>
  );
}