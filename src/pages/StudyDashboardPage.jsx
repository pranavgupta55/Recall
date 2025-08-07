import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRecentDecks } from '../lib/studyHistory.js';
import { supabase } from '../lib/supabaseClient.js';
import { FiPlayCircle, FiClock, FiCheckCircle } from 'react-icons/fi';

const ProgressBar = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className="bg-status-mastered h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

export default function StudyDashboardPage() {
  const [recentDecks, setRecentDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- THIS IS THE CORRECTED LOGIC ---
  useEffect(() => {
    const fetchDecksAndProgress = async () => {
      setLoading(true);
      const decksFromHistory = getRecentDecks();
      
      const decksWithProgress = await Promise.all(
        decksFromHistory.map(async (deck) => {
          const cardIds = deck.cards.map(c => c.id).filter(id => id);
          if (cardIds.length === 0) return { ...deck, masteredCount: 0 };

          const { count, error } = await supabase
            .from('progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('flashcard_id', cardIds)
            .eq('status', 'mastered');

          return { ...deck, masteredCount: error ? 0 : count };
        })
      );
      
      setRecentDecks(decksWithProgress);
      setLoading(false);
    };

    if (user) {
      fetchDecksAndProgress();
      
      // Add event listener to refetch data when the window/tab gets focus
      window.addEventListener('focus', fetchDecksAndProgress);

      // Cleanup listener when the component unmounts
      return () => {
        window.removeEventListener('focus', fetchDecksAndProgress);
      };
    }
  }, [user]);

  const handleSelectDeck = () => {
    navigate('/my-flashcards');
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto p-8 grid grid-cols-3 gap-12">
      <div className="col-span-1 flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Study Session</h1>
        <p className="text-muted-foreground">Select a deck to study from your collection or continue a recent session.</p>
        <button onClick={handleSelectDeck} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-lg text-center">
          Select a Deck
        </button>
      </div>

      <div className="col-span-2">
        <h2 className="text-2xl font-bold mb-4">Recent Decks</h2>
        <div className="space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-4">
          {loading ? (<p className="text-muted-foreground">Loading study history...</p>) : recentDecks.length > 0 ? (
            recentDecks.map(deck => (
              <div key={deck.deckName} className="bg-card p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold capitalize">{deck.deckName}</h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <FiCheckCircle className="text-status-mastered"/> {deck.masteredCount} / {deck.cardCount} Mastered
                        </p>
                    </div>
                    <Link to={`/study/${encodeURIComponent(deck.deckName)}`} className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary rounded-lg text-secondary-foreground font-semibold">
                        <FiPlayCircle /> Continue
                    </Link>
                </div>
                <ProgressBar value={deck.masteredCount} max={deck.cardCount} />
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-12">
              <FiClock className="mx-auto h-12 w-12 mb-4" />
              <p>You have no recent study sessions.</p>
              <p>Select a deck from "My Cards" to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}