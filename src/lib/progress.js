import { supabase } from './supabaseClient.js';

/**
 * Fetches all progress records for a user for a given list of card IDs.
 * @param {string} userId The user's ID.
 * @param {number[]} cardIds An array of flashcard IDs.
 * @returns {Promise<Map<number, string>>} A map of cardId -> status.
 */
export const fetchProgressForDeck = async (userId, cardIds) => {
  if (!userId || !cardIds || cardIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('progress')
    .select('flashcard_id, status')
    .eq('user_id', userId)
    .in('flashcard_id', cardIds);

  if (error) {
    console.error('Error fetching progress:', error);
    return new Map();
  }

  // Convert the array of objects to a Map for quick lookups
  const progressMap = new Map();
  for (const record of data) {
    progressMap.set(record.flashcard_id, record.status);
  }
  return progressMap;
};

/**
 * Updates (or inserts) the status for a single card for a user.
 * @param {string} userId The user's ID.
 * @param {number} cardId The flashcard's ID.
 * @param {'learning' | 'mastered'} newStatus The new status for the card.
 */
export const updateCardStatus = async (userId, cardId, newStatus) => {
  if (!userId || !cardId || !newStatus) return;

  const { data, error } = await supabase
    .from('progress')
    .upsert({
      user_id: userId,
      flashcard_id: cardId,
      status: newStatus,
      last_seen: new Date().toISOString(),
    }, {
      onConflict: 'user_id, flashcard_id' // This is Supabase syntax for "if conflict on these columns, update instead of insert"
    })
    .select(); // Return the updated record

  if (error) {
    console.error('Error updating card status:', error);
  }

  return data;
};