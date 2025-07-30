// src/pages/ChatbotPage.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatbotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for the form inputs
  const [topic, setTopic] = useState('');
  const [deckName, setDeckName] = useState('');

  // State for the generation process
  const [generatedCards, setGeneratedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateCards = async (e) => {
    e.preventDefault();
    if (!topic) {
      setError('Please enter a topic.');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedCards([]);

    try {
      // Invoke the 'generate-cards' Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('generate-cards', {
        body: { topic },
      });

      if (functionError) {
        // This could be a network error, or an error from the function itself
        throw new Error(functionError.message);
      }
      
      if (data.error) {
        // This is a specific error message returned by our function's catch block
        throw new Error(data.error);
      }

      setGeneratedCards(data.flashcards);
      // Pre-fill the deck name based on the topic for user convenience
      setDeckName(topic);

    } catch (err) {
      console.error('Error invoking Edge Function:', err);
      setError(`Failed to generate cards. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveDeck = async () => {
    if (generatedCards.length === 0 || !deckName) {
        setError("There are no cards to save or the deck name is empty.");
        return;
    }

    setIsLoading(true);
    setError('');

    // Prepare the cards for insertion by adding user_id and deck name
    const cardsToInsert = generatedCards.map(card => ({
        ...card,
        user_id: user.id,
        deck: deckName,
    }));

    try {
        const { error: insertError } = await supabase.from('flashcards').insert(cardsToInsert);

        if (insertError) {
            throw new Error(insertError.message);
        }
        
        // Success! Clear the state and navigate the user to their decks.
        setTopic('');
        setGeneratedCards([]);
        setDeckName('');
        navigate('/my-flashcards');

    } catch (err) {
        console.error('Error saving cards to database:', err);
        setError(`Failed to save deck. ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">AI Assistant</h1>
      <p className="text-muted-foreground mb-8">Generate a new deck of flashcards on any topic.</p>
      
      {/* --- GENERATION FORM --- */}
      <form onSubmit={handleGenerateCards} className="bg-card p-6 rounded-lg mb-8">
        <label htmlFor="topic" className="block text-muted-foreground mb-2 font-semibold">Topic</label>
        <div className="flex gap-4">
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., 'The basics of Photosynthesis'"
            className="flex-grow px-3 py-2 bg-background border border-muted rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-lg" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </form>
      
      {error && <p className="text-secondary text-center mb-4">{error}</p>}

      {/* --- RESULTS AND SAVE SECTION --- */}
      {generatedCards.length > 0 && (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold mb-4">Generated Cards</h2>
          <p className="text-muted-foreground mb-4">Review the cards below. You can name the deck and save it to your collection.</p>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
             <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Enter a name for your new deck"
                className="flex-grow px-3 py-2 bg-card border border-muted rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
            <button onClick={handleSaveDeck} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-2 px-6 rounded-lg" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save to My Decks'}
            </button>
          </div>

          <div className="space-y-4">
            {generatedCards.map((card, index) => (
              <div key={index} className="bg-card p-4 rounded-lg">
                <p className="font-semibold text-muted-foreground">Q: {card.question}</p>
                <p className="text-foreground">A: {card.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}