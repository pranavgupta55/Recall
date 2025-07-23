// src/components/DeckCard.jsx

import { useMemo } from 'react'; // This import was missing

export default function DeckCard({ deck, cards = [], onClick }) {
  // Filter out the placeholder card for UI display
  const displayableCards = cards.filter(card => card.question !== '---PLACEHOLDER---');
  const cardCount = displayableCards.length;

  // Find the earliest created_at date to represent the deck's creation date
  const creationDate = useMemo(() => {
    if (cards.length === 0) return null;
    // Ensure all cards have a valid created_at before trying to create a date
    const validDates = cards.map(card => new Date(card.created_at)).filter(date => !isNaN(date));
    if (validDates.length === 0) return null;
    
    const earliestDate = new Date(Math.min(...validDates));
    return earliestDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }, [cards]);

  return (
    // Made taller with h-60
    <div
      onClick={onClick}
      className="bg-card rounded-lg p-6 flex flex-col justify-between cursor-pointer
                 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group h-60"
    >
      <div>
        <h3 className="text-xl font-bold capitalize group-hover:text-primary transition-colors truncate">
          {deck}
        </h3>
        {/* Fixed height and overflow for consistent layout */}
        <div className="mt-4 space-y-2 text-sm text-muted-foreground h-24 overflow-hidden">
          {displayableCards.length > 0 ? (
            displayableCards.slice(0, 3).map((card, index) => (
              <p key={index} className="truncate"> - {card.question}</p>
            ))
          ) : (
            <p className="italic">This deck is empty.</p>
          )}
          {cardCount > 3 && <p className="truncate font-semibold">... and {cardCount - 3} more</p>}
        </div>
      </div>
      
      {/* Footer now includes the date */}
      <div className="mt-4 pt-4 border-t border-muted flex justify-between items-center">
        <p className="text-sm font-semibold text-muted-foreground">
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </p>
        {creationDate && (
          <p className="text-xs text-muted-foreground">
            Created: {creationDate}
          </p>
        )}
      </div>
    </div>
  );
}