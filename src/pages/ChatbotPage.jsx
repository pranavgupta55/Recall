import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ReactMarkdown from 'react-markdown';
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiSave, FiZap } from 'react-icons/fi';

// --- Helper Functions & Components ---
const LoadingSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>;

const calculateQuestionWidth = (q, a) => {
  const qLen = q.length || 1;
  const aLen = a.length || 1;
  const baseRatio = (qLen / (qLen + aLen) + 0.5) / 2;
  return Math.max(30, Math.min(70, baseRatio * 100));
};

export default function ChatbotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nextId = useRef(5);
  const scrollRef = useRef(null);

  // --- State Management ---
  const [deckName, setDeckName] = useState('');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [links, setLinks] = useState('');
  const [tone, setTone] = useState('neutral');
  const [conciseness, setConciseness] = useState('standard');
  const [cardRows, setCardRows] = useState(() => Array.from({ length: 5 }, (_, i) => ({ id: i, question: '', answer: '' })));
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [promptSent, setPromptSent] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  
  const [deletingId, setDeletingId] = useState(null);

  // --- Handlers & Effects ---
  const handleCardChange = (id, field, value) => setCardRows(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));
  
  const addCardRow = () => {
    setCardRows(p => [...p, { id: nextId.current++, question: '', answer: '' }]);
  };

  const removeCardRow = (id) => {
    setDeletingId(id);
    // The actual removal is handled by onAnimationEnd to allow the animation to complete
  };
  
  const handleAnimationEnd = (id) => {
      if (id === deletingId) {
          setCardRows(p => p.filter(c => c.id !== id));
          setDeletingId(null);
      }
  };

  useEffect(() => { if (topic && !deckName) setDeckName(topic); }, [topic, deckName]);
  
  // Smooth scroll on add
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [cardRows.length]);

  // --- API Calls ---
  const handleGenerate = async () => {
    if (!topic) { setError('Topic is required.'); return; }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setRawOutput('');
    setPromptSent('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, context, links, tone, conciseness,
          userDefinedCards: cardRows.filter(c => c.question.trim() || c.answer.trim()),
          numCards: cardRows.length,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail);
      
      const newCards = cardRows.map((orig, i) => ({...orig, ...result.flashcards[i]}));
      setCardRows(newCards);
      setRawOutput(result.raw_output);
      setPromptSent(result.prompt_sent);
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (!deckName) { setError('Deck Name is required.'); return; }
    setIsLoading(true);
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
    finally { setIsLoading(false); }
  };

  const parsedOutput = useMemo(() => {
    try { return JSON.parse(rawOutput); }
    catch { return { flashcards: [] }; }
  }, [rawOutput]);

  return (
    <div className="w-screen h-screen bg-background text-foreground overflow-hidden flex flex-col p-10 gap-5">
      <div className="flex-shrink-0 flex items-center justify-between gap-4">
        <div className="glass-pane w-full">
          <input type="text" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="Enter Deck Title..." className="input-style text-lg font-bold h-12 bg-transparent border-none" required />
        </div>
      </div>

      <div className="flex-grow flex gap-5 overflow-hidden">
        {/* LEFT COLUMN: INPUTS */}
        <div className="w-1/2 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-pane p-3 space-y-1">
              <label className="font-semibold text-muted-foreground text-sm">Main Topic</label>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., The Roman Empire" className="input-style h-24 text-base resize-none" />
            </div>
            <div className="glass-pane p-3 space-y-1">
              <label className="font-semibold text-muted-foreground text-sm">Relevant Links</label>
              <textarea value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://... (one per line)" className="input-style h-24 resize-none" />
            </div>
          </div>
          <div className="glass-pane p-3 space-y-1 flex-grow flex flex-col">
            <label className="font-semibold text-muted-foreground text-sm">Context / Notes</label>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste any relevant text here..." className="input-style flex-grow resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-pane p-3 space-y-1">
              <label className="font-semibold text-muted-foreground text-sm">Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="input-style !h-12"><option value="neutral">Neutral</option><option value="formal">Formal</option><option value="casual">Casual</option></select>
            </div>
            <div className="glass-pane p-3 space-y-1">
              <label className="font-semibold text-muted-foreground text-sm">Conciseness</label>
              <select value={conciseness} onChange={(e) => setConciseness(e.target.value)} className="input-style !h-12"><option value="standard">Standard</option><option value="concise">Concise</option><option value="detailed">Detailed</option></select>
            </div>
          </div>
           <div className="flex-shrink-0 grid grid-cols-2 gap-4">
             <button onClick={handleGenerate} disabled={isLoading} className="glass-pane h-14 bg-primary/90 hover:bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-3 transition-colors duration-300 disabled:opacity-50">
                {isLoading ? <><LoadingSpinner /> Generating...</> : <><FiZap size={18}/> Generate</>}
              </button>
             <button onClick={handleSave} disabled={isLoading || cardRows.every(c => !c.question || !c.answer)} className="glass-pane h-14 bg-secondary/90 hover:bg-secondary text-secondary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-3 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <LoadingSpinner /> : <><FiSave size={18} /> Save Deck</>}
              </button>
           </div>
        </div>

        {/* RIGHT COLUMN: FLASHCARDS */}
        <div className="w-1/2 flex flex-col gap-4">
          <div ref={scrollRef} className="flex-grow glass-pane p-4 pr-1 space-y-3 overflow-y-auto scroll-fade">
            {cardRows.map((card, index) => (
              <div
                key={card.id}
                onAnimationEnd={() => handleAnimationEnd(card.id)}
                className={`p-3 rounded-xl relative group transition-colors duration-300 ${deletingId === card.id ? 'animate-shrink-and-fade' : 'hover:bg-background/60'}`}
              >
                <button onClick={() => removeCardRow(card.id)} className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary/20 hover:text-secondary transition-opacity"><FiTrash2 size={16}/></button>
                <div className="flex gap-3">
                  <div style={{ width: `${calculateQuestionWidth(card.question, card.answer)}%` }} className="transition-[width] duration-500 ease-in-out">
                    <textarea value={card.question} onChange={(e) => handleCardChange(card.id, 'question', e.target.value)} placeholder={`Question ${index + 1}...`} className="input-style min-h-[7rem] bg-transparent border-white/5 group-hover:border-white/20 resize-none" />
                  </div>
                  <div className="flex-grow">
                    <textarea value={card.answer} onChange={(e) => handleCardChange(card.id, 'answer', e.target.value)} placeholder="Answer..." className="input-style min-h-[7rem] bg-transparent border-white/5 group-hover:border-white/20 resize-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addCardRow} className="flex-shrink-0 glass-pane h-12 text-muted-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors duration-300">
            <FiPlus /> Add New Card
          </button>
        </div>
      </div>

      {/* BOTTOM BAR: STATUS & RAW OUTPUT */}
      <div className="flex-shrink-0">
        {(error || successMessage) && <div className={`text-center font-semibold p-2 rounded-lg ${error ? 'text-secondary' : 'text-primary'}`}>{error || successMessage}</div>}
        {promptSent && (
          <div className="glass-pane mt-2">
            <button onClick={() => setIsOutputVisible(!isOutputVisible)} className="w-full p-3 font-semibold text-muted-foreground flex justify-between items-center rounded-t-xl">
              <span>Developer Output</span>
              {isOutputVisible ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {isOutputVisible && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-t border-white/10">
                <div>
                  <h4 className="font-bold mb-2">Prompt Sent to AI</h4>
                  <div className="text-xs bg-black/30 p-3 rounded-md overflow-auto h-48 prose prose-invert prose-sm"><ReactMarkdown>{promptSent}</ReactMarkdown></div>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Raw JSON Response</h4>
                  <pre className="text-xs bg-black/30 p-3 rounded-md overflow-auto h-48"><code>{rawOutput}</code></pre>
                </div>
                 <div>
                  <h4 className="font-bold mb-2">Parsed Text</h4>
                  <div className="text-xs bg-black/30 p-3 rounded-md overflow-y-auto h-48 space-y-2">
                    {parsedOutput.flashcards.map((c, i) => <div key={i}><strong>Q:</strong> {c.question}<br/><strong>A:</strong> {c.answer}</div>)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}