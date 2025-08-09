// src/pages/AIHelperPage.jsx

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { FiPlus, FiTrash2, FiSave, FiZap, FiAlertTriangle } from 'react-icons/fi';

const TOKEN_LIMIT = 100000;

const LoadingSpinner = () => <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>;

const Tooltip = ({ text, children }) => (
  <div className="relative group w-full h-full">
    {children}
    <div className="absolute bottom-full mb-2 hidden group-hover:block w-max max-w-xs bg-card text-foreground text-xs rounded-md p-2 shadow-lg z-20 border border-muted">
      {text}
    </div>
  </div>
);

const calculateQuestionWidth = (q, a) => {
  const qLen = q.length || 1;
  const aLen = a.length || 1;
  const baseRatio = (qLen / (qLen + aLen) + 0.5) / 2;
  return Math.max(30, Math.min(70, baseRatio * 100));
};

export default function AIHelperPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nextId = useRef(5);
  const scrollRef = useRef(null);

  const [deckName, setDeckName] = useState('');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [links, setLinks] = useState('');
  const [conciseness, setConciseness] = useState('standard');
  const [technicality, setTechnicality] = useState('standard');
  const [formatting, setFormatting] = useState('standard');
  const [cardRows, setCardRows] = useState(() => Array.from({ length: 5 }, (_, i) => ({ id: i, question: '', answer: '' })));
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [deletingId, setDeletingId] = useState(null);

  // --- NEW: Token usage state ---
  const [tokensUsed, setTokensUsed] = useState(0);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const isOverLimit = tokensUsed >= TOKEN_LIMIT;

  const handleCardChange = (id, field, value) => setCardRows(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));
  const addCardRow = () => setCardRows(p => [...p, { id: nextId.current++, question: '', answer: '' }]);
  const removeCardRow = (id) => setDeletingId(id);
  
  const handleAnimationEnd = (id) => {
      if (id === deletingId) {
          setCardRows(p => p.filter(c => c.id !== id));
          setDeletingId(null);
      }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [cardRows.length]);

  // --- NEW: Effect to fetch token usage ---
  useEffect(() => {
    const fetchTokenUsage = async () => {
        if (!user?.id) return;
        setIsLoadingTokens(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('tokens_used')
            .eq('id', user.id)
            .single();
        if (error) console.error("Error fetching tokens:", error);
        else setTokensUsed(data?.tokens_used || 0);
        setIsLoadingTokens(false);
    };
    fetchTokenUsage();
  }, [user?.id]);

  const handleGenerate = async () => {
    if (!topic) { setError('Topic is required.'); return; }
    if (isOverLimit) { setError('You have exceeded your monthly token limit.'); return; }
    setIsGenerating(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          topic, context, links, conciseness, technicality, formatting,
          userDefinedCards: cardRows.filter(c => c.question.trim() || c.answer.trim()),
          numCards: cardRows.length,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail);
      
      const newCards = cardRows.map((orig, i) => ({...orig, ...result.flashcards[i]}));
      setCardRows(newCards);
      
    } catch (err) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  const handleSave = async () => {
    if (!deckName) { setError('Deck Name is required.'); return; }
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, deckName, flashcards: cardRows.filter(c => c.question && c.answer) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail);
      setSuccessMessage(result.message);
      setTimeout(() => navigate('/my-flashcards'), 2000);
    } catch (err) { setError(err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <>
      <div className="w-screen bg-background text-foreground overflow-hidden flex flex-col px-12 py-4 gap-4">
        {isOverLimit && (
          <div className="bg-secondary/20 border border-secondary text-secondary font-semibold p-3 rounded-xl flex items-center justify-center gap-3">
              <FiAlertTriangle />
              You have reached your monthly token limit. Generation is disabled.
          </div>
        )}
        <div className="grid gap-5 overflow-hidden min-h-0" style={{ gridTemplateColumns: '1fr 1.8fr' }}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <div className="glass-pane flex-grow">
                    <Tooltip text="The name for the new deck.">
                      <input type="text" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="Enter Deck Title..." className="input-style text-base font-bold h-11 bg-transparent border-none" required />
                    </Tooltip>
                </div>
            </div>
            <div className="flex flex-col gap-4 min-h-0">
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-pane p-3">
                        <Tooltip text="The main subject for the flashcards."><label className="font-bold text-muted-foreground text-sm mb-1 block">Main Topic</label><textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Photosynthesis" className="input-style h-16 text-sm resize-none" /></Tooltip>
                    </div>
                    <div className="glass-pane p-3">
                        <Tooltip text="Web links for the AI to use as context."><label className="font-bold text-muted-foreground text-sm mb-1 block">Relevant Links</label><textarea value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://... (one per line)" className="input-style h-16 text-sm resize-none" /></Tooltip>
                    </div>
                </div>
                <div className="glass-pane p-3 flex flex-col min-h-0">
                    <Tooltip text="Paste any notes or text for the AI to reference."><div className="flex flex-col"><label className="font-bold text-muted-foreground text-sm mb-1 block">Context / Notes</label><textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste any relevant text here..." className="input-style resize-none text-sm h-52" /></div></Tooltip>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="glass-pane p-2"><Tooltip text="Adjusts how brief or wordy the answers are."><label className="font-bold text-muted-foreground text-xs mb-1 block px-1">Conciseness</label><select value={conciseness} onChange={(e) => setConciseness(e.target.value)} className="input-style !h-9 text-sm"><option value="standard">Standard</option><option value="concise">Concise</option><option value="detailed">Detailed</option></select></Tooltip></div>
                    <div className="glass-pane p-2"><Tooltip text="Controls the complexity of the vocabulary."><label className="font-bold text-muted-foreground text-xs mb-1 block px-1">Technicality</label><select value={technicality} onChange={(e) => setTechnicality(e.target.value)} className="input-style !h-9 text-sm"><option value="standard">Standard</option><option value="layman">Layman's</option><option value="technical">Technical</option></select></Tooltip></div>
                    <div className="glass-pane p-2"><Tooltip text="Defines the structure of the answers (e.g., paragraph, list)."><label className="font-bold text-muted-foreground text-xs mb-1 block px-1">Formatting</label><select value={formatting} onChange={(e) => setFormatting(e.target.value)} className="input-style !h-9 text-sm"><option value="standard">Standard</option><option value="bullet_points">Bullets</option><option value="step_by_step">Step-by-step</option></select></Tooltip></div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
                <Tooltip text={isOverLimit ? "You have reached your monthly token limit." : "Generate flashcards using AI."}><div className='w-full h-full'><button onClick={handleGenerate} disabled={isGenerating || isSaving || isOverLimit || isLoadingTokens} className="w-full h-11 glass-pane bg-primary/90 hover:bg-primary text-primary-foreground font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">{isLoadingTokens ? <><LoadingSpinner /> Loading...</> : isGenerating ? <><LoadingSpinner /> Generating...</> : <><FiZap size={16}/> Generate</>}</button></div></Tooltip>
                <Tooltip text="Save the current flashcards to your account."><button onClick={handleSave} disabled={isSaving || isGenerating || cardRows.every(c => !c.question || !c.answer)} className="w-full h-11 glass-pane bg-secondary/90 hover:bg-secondary text-secondary-foreground font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? <><LoadingSpinner /> Saving...</> : <><FiSave size={16} /> Save Deck</>}</button></Tooltip>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex-grow glass-pane p-2 relative min-h-0" style={{ height: '436px' }}>
                <Tooltip text="This is your interactive editor. Pre-fill cards to guide the AI, or edit the results before you save.">
                    <div ref={scrollRef} className="absolute inset-2 space-y-1.5 overflow-y-auto custom-scrollbar">{cardRows.map((card, index) => (<div key={card.id} onAnimationEnd={() => handleAnimationEnd(card.id)} className={`p-2 rounded-xl relative group/card transition-colors duration-300 ${deletingId === card.id ? 'animate-shrink-and-fade' : 'hover:bg-background/60'}`}><button onClick={() => removeCardRow(card.id)} className="absolute top-1.5 right-1.5 p-1 rounded-full text-muted-foreground opacity-0 group-hover/card:opacity-100 hover:bg-secondary/20 hover:text-secondary transition-opacity"><FiTrash2 size={14}/></button><div className="flex gap-2"><div style={{ width: `${calculateQuestionWidth(card.question, card.answer)}%` }} className="transition-[width] duration-500 ease-out"><textarea value={card.question} onChange={(e) => handleCardChange(card.id, 'question', e.target.value)} placeholder={`Question ${index + 1}...`} className="input-style min-h-[4.5rem] bg-transparent border-white/5 group-hover/card:border-white/20 resize-none text-sm" /></div><div className="flex-grow"><textarea value={card.answer} onChange={(e) => handleCardChange(card.id, 'answer', e.target.value)} placeholder="Answer..." className="input-style min-h-[4.5rem] bg-transparent border-white/5 group-hover/card:border-white/20 resize-none text-sm" /></div></div></div>))}</div>
                </Tooltip>
            </div>
            <div className="pt-2"><Tooltip text="Add another blank card to the editor."><button onClick={addCardRow} className="w-full h-11 glass-pane text-muted-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors duration-300"><FiPlus /> Add New Card</button></Tooltip></div>
          </div>
        </div>
        <div className="h-6 flex-shrink-0 text-center">{(error || successMessage) && <div className={`font-semibold p-1 rounded-lg ${error ? 'text-secondary' : 'text-primary'}`}>{error || successMessage}</div>}</div>
      </div>
    </>
  );
}