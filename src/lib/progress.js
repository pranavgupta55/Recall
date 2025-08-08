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

  const progressMap = new Map();
  for (const record of data) {
    progressMap.set(record.flashcard_id, record.status);
  }
  return progressMap;
};

/**
 * Updates (or inserts) the status for a single card for a user.
 * This function relies on a UNIQUE constraint on the (user_id, flashcard_id) columns in the 'progress' table.
 * @param {string} userId The user's ID.
 * @param {number} cardId The flashcard's ID.
 * @param {'new' | 'learning' | 'reviewing' | 'mastered'} newStatus The new status for the card.
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
      onConflict: 'user_id, flashcard_id' // This requires a UNIQUE constraint on these columns
    })
    .select();

  if (error) {
    // Log the specific error message from Supabase to make debugging easier.
    console.error('Error updating card status:', error.message);
  }

  return data;
};