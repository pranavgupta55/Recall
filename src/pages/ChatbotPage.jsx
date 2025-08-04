// src/pages/ChatbotPage.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatbotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for user inputs
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [links, setLinks] = useState('');
  const [subTopics, setSubTopics] = useState(['']); // Start with one empty sub-topic
  const [numCards, setNumCards] = useState(5);
  const [tone, setTone] = useState('neutral');
  const [conciseness, setConciseness] = useState('standard');
  
  // State for the generate/save flow
  const [generatedCards, setGeneratedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // --- Input Handlers ---
  const handleSubTopicChange = (index, value) => {
    const updatedSubTopics = [...subTopics];
    updatedSubTopics[index] = value;
    setSubTopics(updatedSubTopics);
  };

  const addSubTopicInput = () => setSubTopics([...subTopics, '']);
  const removeSubTopicInput = (index) => setSubTopics(subTopics.filter((_, i) => i !== index));

  const handleCardChange = (index, field, value) => {
    const updatedCards = [...generatedCards];
    updatedCards[index][field] = value;
    setGeneratedCards(updatedCards);
  };

  // --- API Call Handlers ---
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic) {
      setError('Topic is a required field.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setGeneratedCards([]);

    const payload = {
      topic,
      context,
      links,
      subTopics: subTopics.filter(st => st.trim() !== ''), // Only send non-empty sub-topics
      numCards,
      tone,
      conciseness,
    };

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Failed to generate cards.');
      setGeneratedCards(result.flashcards);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          deckName: topic,
          flashcards: generatedCards,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Failed to save deck.');
      setSuccessMessage(result.message);
      setTimeout(() => navigate('/my-flashcards'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      {/* --- INPUT SECTION --- */}
      <div className="bg-card p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">AI Assistant</h1>
        <p className="text-muted-foreground mb-6">Generate a new deck of flashcards on any topic.</p>
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Main Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-muted-foreground mb-1">Topic (Required)</label>
              <input id="topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., The basics of Photosynthesis" required className="input-style" />
            </div>
            <div>
              <label htmlFor="links" className="block text-sm font-medium text-muted-foreground mb-1">Relevant Links</label>
              <textarea id="links" value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://example.com/article1 (one per line)" className="input-style h-20"></textarea>
            </div>
          </div>
          <div>
            <label htmlFor="context" className="block text-sm font-medium text-muted-foreground mb-1">Context / Notes</label>
            <textarea id="context" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste any relevant notes or text here..." className="input-style h-32"></textarea>
          </div>
          
          {/* Sub Topics */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Specific Sub-Topics (Optional)</label>
            <div className="space-y-2">
              {subTopics.map((st, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="text" value={st} onChange={(e) => handleSubTopicChange(index, e.target.value)} placeholder={`Sub-topic ${index + 1}`} className="input-style flex-grow" />
                  <button type="button" onClick={() => removeSubTopicInput(index)} className="text-muted-foreground hover:text-secondary">×</button>
                </div>
              ))}
              <button type="button" onClick={addSubTopicInput} className="text-sm text-primary hover:underline">+ Add another sub-topic</button>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-muted">
            <div>
              <label htmlFor="numCards" className="block text-sm font-medium text-muted-foreground mb-1">Number of Cards: {numCards}</label>
              <input id="numCards" type="range" min="3" max="15" value={numCards} onChange={(e) => setNumCards(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-muted-foreground mb-1">Tone</label>
              <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className="input-style">
                <option value="neutral">Neutral</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div>
              <label htmlFor="conciseness" className="block text-sm font-medium text-muted-foreground mb-1">Conciseness</label>
              <select id="conciseness" value={conciseness} onChange={(e) => setConciseness(e.target.value)} className="input-style">
                <option value="standard">Standard</option>
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-lg" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Flashcards'}
          </button>
        </form>
      </div>

      {/* --- REFINEMENT SECTION --- */}
      {generatedCards.length > 0 && (
        <div className="bg-card p-6 rounded-lg space-y-4 animate-fade-in">
          <h2 className="text-2xl font-bold">Refine Your Flashcards</h2>
          <p className="text-muted-foreground">Edit the generated cards below before saving them to your collection.</p>
          {generatedCards.map((card, index) => (
            <div key={index} className="space-y-2 p-4 border border-muted rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Question {index + 1}</label>
              <textarea value={card.question} onChange={(e) => handleCardChange(index, 'question', e.target.value)} className="input-style w-full h-16" />
              <label className="text-sm font-medium text-muted-foreground">Answer {index + 1}</label>
              <textarea value={card.answer} onChange={(e) => handleCardChange(index, 'answer', e.target.value)} className="input-style w-full h-24" />
            </div>
          ))}
          <button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-3 px-6 rounded-lg" disabled={isLoading}>
            {isLoading ? 'Saving...' : `Save to Deck: "${topic}"`}
          </button>
        </div>
      )}

      {/* --- STATUS MESSAGES --- */}
      {error && <p className="text-secondary text-center">{error}</p>}
      {successMessage && <p className="text-primary text-center">{successMessage}</p>}
    </div>
  );
}
