import { useRef } from 'react';
import { FiSend } from 'react-icons/fi';

export default function ChatbotPanel({ forwardRef }) {
  // We'll expand this later with state for chat history, etc.
  return (
    <div className="bg-card/80 rounded-xl h-full flex flex-col p-4 gap-4">
      <div className="flex-grow border-b border-muted overflow-y-auto p-2">
        {/* Chat messages will be rendered here */}
        <p className="text-muted-foreground text-sm">Chatbot coming soon...</p>
      </div>
      <div className="flex-shrink-0 flex gap-2">
        <input
          ref={forwardRef} // Assign the forwarded ref here
          type="text"
          placeholder="Ask about this card... (/)"
          className="input-style flex-grow !h-12"
        />
        <button className="bg-primary h-12 px-4 rounded-lg text-primary-foreground">
          <FiSend />
        </button>
      </div>
    </div>
  );
}