import React from 'react';
import ReactMarkdown from 'react-markdown';

const progressLevels = [
    { status: 'new', label: 'New', color: 'text-status-new', borderColor: 'border-status-new', buttonBg: 'hover:bg-status-new/20' },
    { status: 'learning', label: 'Learning', color: 'text-status-learning', borderColor: 'border-status-learning', buttonBg: 'hover:bg-status-learning/20' },
    { status: 'reviewing', label: 'Reviewing', color: 'text-status-reviewing', borderColor: 'border-status-reviewing', buttonBg: 'hover:bg-status-reviewing/20' },
    { status: 'mastered', label: 'Mastered', color: 'text-status-mastered', borderColor: 'border-status-mastered', buttonBg: 'hover:bg-status-mastered/20' }
];

// This function now reads the persistent random values from the card object itself.
const getCardStyle = (card, index, currentIndex, totalCards) => {
    const offset = index - currentIndex;
    
    let transform = `translateY(-50%)`; 
    let zIndex = totalCards - Math.abs(offset);
    let opacity = 1;
    let cursor = 'pointer';

    if (offset === 0) { // Current, Active Card
        transform += ` translateX(0%) rotate(0deg) scale(1.0)`;
        zIndex = 100;
    } else if (offset < 0) { // Top (previous) stack
        const stackOffset = Math.abs(offset);
        const y = -100 - (stackOffset * 10); 
        const scale = 1 - (stackOffset * 0.04);
        transform += ` translateX(${card.randomX}%) translateY(${y}%) rotate(${card.randomRotation}deg) scale(${scale})`;
        opacity = stackOffset > 5 ? 0 : 1;
    } else { // Bottom (next) stack
        const stackOffset = offset;
        const y = 100 + (stackOffset * 10);
        const scale = 1 - (stackOffset * 0.04);
        transform += ` translateX(${card.randomX}%) translateY(${y}%) rotate(${card.randomRotation}deg) scale(${scale})`;
        opacity = stackOffset > 5 ? 0 : 1;
    }

    return {
        transform,
        zIndex,
        opacity,
        cursor,
        position: 'absolute',
        top: '50%',
        left: '32%',
        width: '50%',
        height: '12rem',
        transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
    };
};


export default function FlashcardViewer({ cards, currentIndex, isFlipped, onFlip, onNext, onPrev, onSetStatus }) {
  const currentCard = cards[currentIndex];
  const currentStatusStyle = progressLevels.find(p => p.status === currentCard.status) || progressLevels[0];

  // The useMemo hook has been removed from this component.

  return (
    <div className="w-full h-full relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-[101]">
            {progressLevels.map(({status, label, color, buttonBg}, index) => (
                <button 
                    key={status}
                    onClick={() => onSetStatus(status)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors focus:outline-none ${buttonBg} ${currentCard.status === status ? `${color} font-bold` : 'text-muted-foreground'}`}
                >
                   {label} <span className="text-xs">({index + 1})</span>
                </button>
            ))}
        </div>

        {cards.map((card, index) => {
            // The style function now takes the full card object
            const style = getCardStyle(card, index, currentIndex, cards.length);
            const isCurrent = index === currentIndex;

            return (
                <div
                    key={card.id}
                    style={style}
                    onClick={isCurrent ? onFlip : (index < currentIndex ? onPrev : onNext)}
                >
                    <div className={`relative w-full h-full transform-style-3d transition-transform duration-500 ease-in-out ${isCurrent && isFlipped ? 'rotate-y-180' : ''}`}>
                        <div className={`absolute w-full h-full backface-hidden bg-card rounded-xl flex items-center justify-center p-8 border-4 ${isCurrent ? currentStatusStyle.borderColor : 'border-muted'}`}>
                            <div className="text-lg font-semibold text-center text-foreground"><ReactMarkdown>{card.question}</ReactMarkdown></div>
                        </div>
                        <div className={`absolute w-full h-full backface-hidden rotate-y-180 bg-card rounded-xl flex items-center justify-center p-8 border-4 ${isCurrent ? currentStatusStyle.borderColor : 'border-muted'}`}>
                            <div className="text-lg text-center text-foreground"><ReactMarkdown>{card.answer}</ReactMarkdown></div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
}