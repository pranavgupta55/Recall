// src/pages/ChatbotPage.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatbotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleGenerateAndSave = async (e) => {
    e.preventDefault();
    if (!topic || isLoading) return;

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // The new fetch call to our Python backend endpoint.
      // It sends the topic and the user's ID.
      const response = await fetch('/api/generate_cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          userId: user.id, // Pass the authenticated user's ID
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // The Python backend will return a detailed error message
        throw new Error(result.detail || 'An unknown error occurred.');
      }

      // The backend now handles saving, so we just show its success message.
      setSuccessMessage(result.message);
      
      // Optionally, navigate away after success
      setTimeout(() => navigate('/my-flashcards'), 2000);

    } catch (err) {
      console.error('Error calling backend API:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // The UI is the same, but the form submission now calls our new single function.
  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">AI Assistant</h1>
      <p className="text-muted-foreground mb-8">Generate and save a new deck of flashcards on any topic.</p>
      
      <form onSubmit={handleGenerateAndSave} className="bg-card p-6 rounded-lg mb-8">
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
            {isLoading ? 'Generating & Saving...' : 'Generate Deck'}
          </button>
        </div>
      </form>
      
      {error && <p className="text-secondary text-center mb-4">{error}</p>}
      {successMessage && <p className="text-primary text-center mb-4">{successMessage}</p>}
    </div>
  );
}