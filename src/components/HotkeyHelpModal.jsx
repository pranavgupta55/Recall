import React from 'react';
import { FiArrowUp, FiArrowDown, FiArrowLeft, FiArrowRight } from 'react-icons/fi';

export default function HotkeyHelpModal({ metaKey }) {
  // --- HOTKEY CHANGE ---
  // - "Previous" and "Next" card actions now only use Up and Down arrows.
  // - "Flip Card" action now includes Left and Right arrows.
  const hotkeys = [
    { keys: [<FiArrowUp />], action: 'Previous Card' },
    { keys: [<FiArrowDown />], action: 'Next Card' },
    { keys: ['Space', <FiArrowLeft />, <FiArrowRight />], action: 'Flip Card' },
    { keys: ['1', '2', '3', '4'], action: 'Set Progress' },
    { keys: ['/'], action: 'Focus Chat' },
  ];

  return (
    <div className="fixed top-4 left-4 bg-card/80 backdrop-blur-md border border-muted rounded-lg shadow-lg p-4 z-50 animate-fade-in">
      <h3 className="font-bold text-center mb-2">Hotkeys</h3>
      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {hotkeys.map(({ keys, action }) => (
          <React.Fragment key={action}>
            <div className="flex items-center justify-end gap-1 font-mono font-semibold">
              {/* FIX: Ensure React components passed as keys are rendered correctly */}
              {keys.map((key, i) => <kbd key={i} className="px-2 py-1 bg-muted rounded-md flex items-center justify-center">{key}</kbd>)}
            </div>
            <span>{action}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}