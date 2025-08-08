import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDeckByName } from '../lib/studyHistory.js';
import { fetchProgressForDeck, updateCardStatus } from '../lib/progress.js';

import FlashcardViewer from '../components/FlashcardViewer.jsx';
import ChatbotPanel from '../components/ChatbotPanel.jsx';
import HotkeyHelpModal from '../components/HotkeyHelpModal.jsx';
import DeveloperModal from '../components/DeveloperModal.jsx';

const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export default function StudySessionPage() {
  const { deckName } = useParams();
  const decodedDeckName = decodeURIComponent(deckName);
  const { user } = useAuth();
  const chatInputRef = useRef(null);
  
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [devModalData, setDevModalData] = useState([]);

  useEffect(() => {
    const loadDeckAndProgress = async () => {
      setLoading(true);
      const deckData = getDeckByName(decodedDeckName);
      if (!deckData) {
        setCards([]);
        setLoading(false);
        return;
      }
      const studyCards = deckData.cards.filter(c => c.question !== '---PLACEHOLDER---');
      const cardIds = studyCards.map(c => c.id);
      const progressMap = await fetchProgressForDeck(user.id, cardIds);
      
      const cardsWithData = studyCards.map(card => ({
        ...card,
        status: progressMap.get(card.id) || 'new',
        randomRotation: Math.random() * 10 - 5,
        randomX: Math.random() * 4 - 2,
      }));

      setCards(cardsWithData);
      setLoading(false);
    };
    loadDeckAndProgress();
  }, [decodedDeckName, user.id]);

  const handleSetStatus = async (status) => {
    if (cards.length === 0) return;
    const cardId = cards[currentIndex].id;
    setCards(currentCards => currentCards.map(c => c.id === cardId ? {...c, status} : c));
    await updateCardStatus(user.id, cardId, status);
  };
  
  const handleNavigate = (direction) => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    if (direction === 'next') {
      setCurrentIndex(prev => (prev + 1) % cards.length);
    } else {
      setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length);
    }
  };

  const handleDevModalOpen = (messages) => {
    setDevModalData(messages);
    setIsDevModalOpen(true);
  };
  
  const handleClearChat = () => {
      const storageKey = `chat-history-${decodedDeckName}`;
      window.localStorage.removeItem(storageKey);
      return true;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        e.preventDefault();
        setIsHelpVisible(true);
      }
      if (document.activeElement === chatInputRef.current) return;
      
      switch (e.key) {
        case ' ': case 'ArrowRight': case 'ArrowLeft': e.preventDefault(); setIsFlipped(f => !f); break;
        case 'ArrowDown': e.preventDefault(); handleNavigate('next'); break;
        case 'ArrowUp': e.preventDefault(); handleNavigate('prev'); break;
        case '1': handleSetStatus('new'); break;
        case '2': handleSetStatus('learning'); break;
        case '3': handleSetStatus('reviewing'); break;
        case '4': handleSetStatus('mastered'); break;
        case '/': e.preventDefault(); chatInputRef.current?.focus(); break;
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Meta' || e.key === 'Control') { setIsHelpVisible(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cards, currentIndex, isFlipped]);

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading session...</div>;
  if (cards.length === 0) return <div className="flex flex-col items-center justify-center text-center p-8 h-full">The deck could not be found.</div>;

  return (
    // The root div provides height and padding, and its overflow is hidden.
    <div className="w-full h-[calc(100vh-var(--navbar-height,80px))] p-8 bg-background overflow-hidden">
      {isHelpVisible && <HotkeyHelpModal metaKey={isMac ? '⌘' : 'Ctrl'} />}
      {isDevModalOpen && <DeveloperModal messages={devModalData} onClose={() => setIsDevModalOpen(false)} />}
      <div className="fixed bottom-4 left-4 text-xs text-muted-foreground/60 bg-card/50 px-2 py-1 rounded-md z-10">
          Hold <kbd className="font-sans font-bold">{isMac ? '⌘' : 'Ctrl'}</kbd> for hotkeys
      </div>
      
      <div className="grid grid-cols-5 w-full h-full gap-8">
        {/* --- BUG FIX --- */}
        {/* Added `relative` and `overflow-hidden` to this grid cell. */}
        {/* This creates a clipping boundary that contains the transformed, off-screen cards from the FlashcardViewer. */}
        {/* This prevents the transformed elements from affecting the browser's layout and causing the unwanted page scroll. */}
        <div className={`col-span-3 ${isDevModalOpen ? 'z-0' : 'z-10'} relative overflow-hidden`}>
            <FlashcardViewer cards={cards} currentIndex={currentIndex} isFlipped={isFlipped} onFlip={() => setIsFlipped(!isFlipped)} onNext={() => handleNavigate('next')} onPrev={() => handleNavigate('prev')} onSetStatus={handleSetStatus} />
        </div>
        <div className="col-span-2 flex flex-col min-h-0">
          <ChatbotPanel forwardRef={chatInputRef} userId={user.id} deckName={decodedDeckName} fullDeck={cards} currentCardIndex={currentIndex} onDevOpen={handleDevModalOpen} onClearChat={handleClearChat} />
        </div>
      </div>
    </div>
  );
}