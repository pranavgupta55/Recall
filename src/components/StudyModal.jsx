import { useState } from 'react';
import FlashcardEditor from './FlashcardEditor';
import MoveCardModal from './MoveCardModal';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function StudyModal({ deck, cards, onClose, onCardsChange, decks, isOwner = false, deckOwnerId = null }) {
  const { user } = useAuth();
  const [editingCard, setEditingCard] = useState(null);
  const [movingCard, setMovingCard] = useState(null);

  const displayableCards = cards.filter(c => c.question !== '---PLACEHOLDER---');

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // This is the new, frontend-only transfer logic, integrated into the full component.
  const handleTransferDeck = async () => {
    if (!deckOwnerId) {
      alert('Could not determine the owner of this deck.');
      return;
    }

    if (window.confirm(`Are you sure you want to copy the "${deck}" deck to your account?`)) {
      try {
        // Step 1: Fetch all cards from the source deck.
        // This is allowed by our public SELECT RLS policy.
        const { data: sourceCards, error: selectError } = await supabase
          .from('flashcards')
          .select('question, answer, deck') // Select only the data we need
          .eq('user_id', deckOwnerId)
          .eq('deck', deck)
          .neq('question', '---PLACEHOLDER---');

        if (selectError) throw selectError;
        if (!sourceCards || sourceCards.length === 0) {
          alert("This deck is empty and cannot be copied.");
          return;
        }

        // --- Logic to find a unique deck name (moved from backend to frontend) ---
        const { data: ownerProfile } = await supabase.from('profiles').select('email').eq('id', deckOwnerId).single();
        const ownerEmail = ownerProfile?.email.split('@')[0] || 'user';
        const baseDeckName = `${deck} by ${ownerEmail}`;

        let newDeckName = baseDeckName;
        let counter = 1;
        let isUnique = false;
        
        while (!isUnique) {
            const { count } = await supabase.from('flashcards')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('deck', newDeckName);
            if (count === 0) isUnique = true;
            else newDeckName = `${baseDeckName} (${counter++})`;
        }

        // Step 2: Prepare the new cards for insertion with the current user's ID.
        const newCardsToInsert = sourceCards.map(card => ({
          question: card.question,
          answer: card.answer,
          deck: newDeckName, // Use the new unique name
          user_id: user.id,   // Set the owner to the current user
        }));

        // Step 3: Bulk insert the new cards.
        // This is allowed by our INSERT RLS policy: (auth.uid() = user_id)
        const { error: insertError } = await supabase.from('flashcards').insert(newCardsToInsert);

        if (insertError) throw insertError;

        alert(`Successfully copied ${newCardsToInsert.length} cards into a new deck: "${newDeckName}".`);
        onClose();

      } catch (error) {
        alert(`Failed to transfer deck: ${error.message}`);
      }
    }
  };

  // All other handlers from the original file are maintained for full UI functionality.
  const handleSaveCard = async (cardToSave) => {
    if (!isOwner) return;
    if (cardToSave.id) {
        const { error } = await supabase.from('flashcards').update({ question: cardToSave.question, answer: cardToSave.answer }).eq('id', cardToSave.id);
        if (error) console.error('Error updating card:', error); else onCardsChange(cards.map(c => c.id === cardToSave.id ? cardToSave : c));
    } else {
        const placeholder = cards.find(c => c.question === '---PLACEHOLDER---');
        if (placeholder) await supabase.from('flashcards').delete().eq('id', placeholder.id);
        const { data, error } = await supabase.from('flashcards').insert({ ...cardToSave, deck: deck, user_id: user.id }).select();
        if (error) console.error('Error creating card:', error); else {
            const newCardList = placeholder ? [data[0]] : [...cards, data[0]];
            onCardsChange(newCardList);
        }
    }
    setEditingCard(null);
  };
  const handleDelete = async (cardId) => {
    if (!isOwner || !window.confirm('Are you sure?')) return;
    const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
    if (error) console.error('Error deleting card:', error); else {
      const remaining = cards.filter(c => c.id !== cardId);
      if (remaining.filter(c => c.question !== '---PLACEHOLDER---').length === 0) {
        const { data } = await supabase.from('flashcards').insert({ question: '---PLACEHOLDER---', answer: '', deck: deck, user_id: user.id }).select();
        onCardsChange(data);
      } else { onCardsChange(remaining); }
    }
  };
  const handleMoveCard = async (newDeck) => {
    if (!isOwner) return;
    const { data: destDeckCards } = await supabase.from('flashcards').select('id, question').eq('deck', newDeck).eq('user_id', user.id);
    const placeholderInDest = destDeckCards.find(c => c.question === '---PLACEHOLDER---');
    if (placeholderInDest) await supabase.from('flashcards').delete().eq('id', placeholderInDest.id);
    await supabase.from('flashcards').update({ deck: newDeck }).eq('id', movingCard.id);
    const remainingCards = cards.filter(c => c.id !== movingCard.id);
    if (remainingCards.filter(c => c.question !== '---PLACEHOLDER---').length === 0) {
      await supabase.from('flashcards').insert({ question: '---PLACEHOLDER---', answer: '', deck: deck, user_id: user.id });
    }
    onCardsChange(remainingCards.filter(c => c.id !== movingCard.id));
    setMovingCard(null);
  };
  

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 sm:p-8 z-50" onClick={handleOverlayClick}>
      {editingCard && isOwner && (
        <FlashcardEditor card={editingCard} onSave={handleSaveCard} onCancel={() => setEditingCard(null)} />
      )}
      {movingCard && isOwner && (
        <MoveCardModal currentDeck={deck} decks={decks} onMove={handleMoveCard} onCancel={() => setMovingCard(null)} />
      )}
      
      <div className="bg-card rounded-lg shadow-2xl w-full max-w-5xl h-[90%] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-muted">
          <h2 className="text-2xl font-bold capitalize">{deck}</h2>
          {!isOwner && (
            <button onClick={handleTransferDeck} className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg hover:bg-primary/90">
              Transfer to My Account
            </button>
          )}
          <button onClick={onClose} className="bg-secondary text-secondary-foreground font-bold p-2 rounded-full hover:bg-secondary/90" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
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