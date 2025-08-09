// src/components/ChatbotPanel.jsx

import { useState, useRef, useEffect } from 'react';
import { FiSend, FiCode, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { getChatbotSystemPrompt } from '../lib/promptTemplates.js';

const LoadingSpinner = () => <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>;

function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) { return initialValue; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(state)); } catch (error) { console.error(error); }
  }, [key, state]);
  return [state, setState];
}

// --- MODIFIED: Added isOverLimit prop ---
export default function ChatbotPanel({ forwardRef, userId, deckName, fullDeck, currentCardIndex, onDevOpen, onClearChat, isOverLimit }) {
  const storageKey = `chat-history-${deckName}`;
  const [messages, setMessages] = usePersistentState(storageKey, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const lastChattedIndex = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleClear = () => {
    if (onClearChat()) {
        setMessages([]);
        lastChattedIndex.current = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isOverLimit) return;

    let messageQueue = [...messages];
    if (messageQueue.length === 0) {
      const deckContent = fullDeck.map(c => `- Q: ${c.question}\n  A: ${c.answer}`).join('\n');
      const systemPrompt = getChatbotSystemPrompt(deckName, deckContent);
      messageQueue.push({ role: 'system', content: systemPrompt });
    }
    if (lastChattedIndex.current !== currentCardIndex) {
      const currentCard = fullDeck[currentCardIndex];
      const cardContext = `The user is now looking at this flashcard:\nQ: ${currentCard.question}\nA: ${currentCard.answer}`;
      messageQueue.push({ role: 'system', content: cardContext });
      lastChattedIndex.current = currentCardIndex;
    }
    const userMessage = { role: 'user', content: input };
    messageQueue.push(userMessage);
    setMessages(messageQueue);
    setInput('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, messages: messageQueue }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'An unknown error occurred.');
      const aiMessage = { role: 'ai', content: result.reply, tokenInfo: result.token_info };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = { role: 'ai', content: `Error: ${error.message}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally { setIsLoading(false); }
  };
  
  const lastAiMessage = messages.filter(m => m.role === 'ai').pop();

  return (
    <div className="bg-card/80 rounded-xl h-full flex flex-col p-4 gap-4">
      <div className="flex-grow border-b border-muted overflow-y-auto p-2 space-y-4 custom-scrollbar min-h-0">
        {/* --- MODIFIED: Show limit message if applicable --- */}
        {isOverLimit && messages.length === 0 && (
             <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-2xl text-sm prose prose-sm prose-invert bg-background/80 text-foreground rounded-bl-none">
                    <div className='flex items-center gap-2 not-prose text-secondary'>
                        <FiAlertTriangle/>
                        <p className='font-semibold'>Token Limit Reached</p>
                    </div>
                   <p className='mt-2'>The AI assistant is unavailable until your limit resets.</p>
                </div>
            </div>
        )}
        
        {messages.filter(m => m.role !== 'system').map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm prose prose-sm prose-invert ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background/80 text-foreground rounded-bl-none'}`}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {isLoading && ( <div className="flex justify-start"><div className="p-3 rounded-2xl bg-background/80 rounded-bl-none"><LoadingSpinner /></div></div> )}
        <div ref={messagesEndRef} />
      </div>
       <div className="flex-shrink-0 flex justify-between items-center h-5 text-xs text-muted-foreground px-1">
        <div>{lastAiMessage?.tokenInfo && !isOverLimit && (<p>Tokens: {lastAiMessage.tokenInfo.total_tokens}</p>)}</div>
        <div>{messages.length > 0 && (<button onClick={() => onDevOpen(messages)} className="flex items-center gap-1 hover:text-white"><FiCode size={14}/> Dev</button>)}</div>
       </div>
      <form onSubmit={handleSubmit} className="flex-shrink-0 flex gap-2">
        <input 
            ref={forwardRef} 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder={isOverLimit ? "Token limit reached" : "Ask about this card... (/)"}
            className="input-style flex-grow !h-12" 
            disabled={isLoading || isOverLimit}
        />
        <button type="submit" disabled={isLoading || !input.trim() || isOverLimit} className="bg-primary h-12 w-12 flex items-center justify-center rounded-lg text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? <LoadingSpinner/> : <FiSend />}
        </button>
        <button type="button" onClick={handleClear} title="Clear chat history" className="bg-muted h-12 w-12 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">
            <FiTrash2 />
        </button>
      </form>
    </div>
  );
}