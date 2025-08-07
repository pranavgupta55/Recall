import React from 'react'; // <-- FIX: Added this line to resolve the crash.
import { FiArrowUp, FiArrowDown, FiArrowLeft, FiArrowRight } from 'react-icons/fi';

export default function HotkeyHelpModal({ metaKey }) {
  const hotkeys = [
    { keys: [<FiArrowUp />, <FiArrowLeft />], action: 'Previous Card' },
    { keys: [<FiArrowDown />, <FiArrowRight />], action: 'Next Card' },
    { keys: ['Space'], action: 'Flip Card' },
    { keys: ['1', '2', '3', '4'], action: 'Set Progress' },
    { keys: ['/'], action: 'Focus Chat' },
  ];

  return (
    <div className="fixed top-4 left-4 bg-card/80 backdrop-blur-md border border-muted rounded-lg shadow-lg p-4 z-50 animate-fade-in">
      <h3 className="font-bold text-center mb-2">Hotkeys</h3>
      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {hotkeys.map(({ keys, action }) => (
          // Using React.Fragment explicitly to be clear
          <React.Fragment key={action}>
            <div className="flex items-center justify-end gap-1 font-mono font-semibold">
              {keys.map((key, i) => <kbd key={i} className="px-2 py-1 bg-muted rounded-md">{key}</kbd>)}
            </div>
            <span>{action}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}