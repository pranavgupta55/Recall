// src/components/DeckSelector.jsx

import { useState, useEffect, useRef, useMemo } from 'react';

export default function DeckSelector({ decks, currentDeck, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Filter decks based on the search term
  const filteredDecks = useMemo(() => {
    if (!searchTerm) return decks.filter(d => d !== currentDeck);
    return decks.filter(deck =>
      deck.toLowerCase().includes(searchTerm.toLowerCase()) && deck !== currentDeck
    );
  }, [searchTerm, decks, currentDeck]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleSelect = (deck) => {
    setSearchTerm(deck);
    onSelect(deck);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="bg-background text-foreground p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Select or type a new deck"
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-muted rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {filteredDecks.map(deck => (
              <li
                key={deck}
                onClick={() => handleSelect(deck)}
                className="px-4 py-2 text-foreground hover:bg-muted cursor-pointer"
              >
                {deck}
              </li>
            ))}
            {filteredDecks.length === 0 && searchTerm && (
               <li className="px-4 py-2 text-muted-foreground">No existing decks match. Click "Move" to create a new one.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}