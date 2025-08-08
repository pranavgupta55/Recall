// src/lib/studyHistory.js

const HISTORY_KEY = 'studyHistory';
const TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Adds or updates a deck in the study history in localStorage.
 * @param {{ deckName: string, cards: any[] }} deckData - The deck to add.
 */
export const addDeckToHistory = (deckData) => {
  if (!deckData || !deckData.deckName) return;
  const now = new Date().getTime();
  
  const history = getRecentDecks(true); // Get all decks, including expired ones

  // Remove existing entry for this deck to move it to the front
  const filteredHistory = history.filter(d => d.deckName !== deckData.deckName);

  const newEntry = {
    deckName: deckData.deckName,
    cardCount: deckData.cards.filter(c => c.question !== '---PLACEHOLDER---').length,
    timestamp: now,
    cards: deckData.cards, // Store the full card data
  };

  const newHistory = [newEntry, ...filteredHistory];
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
};

/**
 * Retrieves recent, non-expired decks from localStorage.
 * @param {boolean} includeExpired - If true, returns all decks regardless of timestamp.
 * @returns {any[]} An array of recent deck objects.
 */
export const getRecentDecks = (includeExpired = false) => {
  const historyStr = localStorage.getItem(HISTORY_KEY);
  if (!historyStr) return [];

  try {
    const history = JSON.parse(historyStr);
    if (!Array.isArray(history)) return [];

    if (includeExpired) return history;

    const now = new Date().getTime();
    return history.filter(deck => (now - deck.timestamp) < TIMEOUT_MS);
  } catch (error) {
    console.error("Error reading study history:", error);
    return [];
  }
};

/**
 * Retrieves a single deck by its name from the history.
 * @param {string} deckName - The name of the deck to find.
 * @returns {any | null} The deck object or null if not found.
 */
export const getDeckByName = (deckName) => {
    const history = getRecentDecks(true); // Check all decks, even old ones
    return history.find(deck => deck.deckName === deckName) || null;
}

/**
 * --- BUG FIX FUNCTION ---
 * Removes a deck from the study history in localStorage after it has been deleted.
 * @param {string} deckNameToDelete - The name of the deck to remove.
 */
export const removeDeckFromHistory = (deckNameToDelete) => {
  // Get all decks, including expired ones, to ensure it's removed completely.
  const allHistory = getRecentDecks(true);
  const updatedHistory = allHistory.filter(deck => deck.deckName !== deckNameToDelete);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
};