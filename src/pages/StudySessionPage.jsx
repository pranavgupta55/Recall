import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDeckByName } from '../lib/studyHistory.js';
import { fetchProgressForDeck, updateCardStatus } from '../lib/progress.js';

import FlashcardViewer from '../components/FlashcardViewer.jsx';
import ChatbotPanel from '../components/ChatbotPanel.jsx';
import HotkeyHelpModal from '../components/HotkeyHelpModal.jsx';

const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export default function StudySessionPage() {
  const { deckName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatInputRef = useRef(null);
  
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  useEffect(() => {
    const loadDeckAndProgress = async () => {
      setLoading(true);
      const deckData = getDeckByName(decodeURIComponent(deckName));
      if (!deckData) {
        setCards([]);
        setLoading(false);
        return;
      }
      const studyCards = deckData.cards.filter(c => c.question !== '---PLACEHOLDER---');
      const cardIds = studyCards.map(c => c.id);
      const progressMap = await fetchProgressForDeck(user.id, cardIds);
      
      // --- THIS IS THE CORRECTED LOGIC ---
      // Map over the cards to add both progress AND persistent random values
      const cardsWithData = studyCards.map(card => ({
        ...card,
        status: progressMap.get(card.id) || 'new',
        // Generate random values ONCE and store them with the card data
        randomRotation: Math.random() * 10 - 5, // -5deg to 5deg
        randomX: Math.random() * 4 - 2,       // -2% to 2%
      }));

      setCards(cardsWithData);
      setLoading(false);
    };
    loadDeckAndProgress();
  }, [deckName, user.id]);

  const handleSetStatus = async (status) => {
    if (cards.length === 0) return;
    const cardId = cards[currentIndex].id;
    // This state update will now preserve the random rotations
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        e.preventDefault();
        setIsHelpVisible(true);
      }
      if (document.activeElement === chatInputRef.current) return;
      
      switch (e.key) {
        case ' ': e.preventDefault(); setIsFlipped(f => !f); break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault(); handleNavigate('next'); break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault(); handleNavigate('prev'); break;
        case '1': handleSetStatus('new'); break;
        case '2': handleSetStatus('learning'); break;
        case '3': handleSetStatus('reviewing'); break;
        case '4': handleSetStatus('mastered'); break;
        case '/': e.preventDefault(); chatInputRef.current?.focus(); break;
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setIsHelpVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cards, currentIndex, isFlipped]);

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading session...</div>;
  if (cards.length === 0) return <div className="flex flex-col items-center justify-center text-center p-8 h-full">...</div>;

  return (
    <div className="w-full h-[calc(100vh-var(--navbar-height,80px))] flex items-center justify-center p-8 bg-background overflow-hidden">
      {isHelpVisible && <HotkeyHelpModal metaKey={isMac ? '⌘' : 'Ctrl'} />}
      <div className="grid grid-cols-3 w-full h-full gap-8">
        <div className="col-span-2">
            <FlashcardViewer 
                cards={cards}
                currentIndex={currentIndex}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)}
                onNext={() => handleNavigate('next')}
                onPrev={() => handleNavigate('prev')}
                onSetStatus={handleSetStatus}
            />
        </div>
        <div className="col-span-1">
          <ChatbotPanel forwardRef={chatInputRef} />
        </div>
      </div>
    </div>
  );
}