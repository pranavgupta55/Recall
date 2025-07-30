// src/components/Navbar.jsx

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-card shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-foreground font-bold text-xl">AI Flashcards</Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/my-flashcards" className="text-gray-300 hover:bg-muted/90 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium">My Cards</Link>
                <Link to="/ai-assistant" className="text-gray-300 hover:bg-muted/90 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium">AI Assistant</Link>
                <Link to="/community-flashcards" className="text-gray-300 hover:bg-muted/90 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium">Community</Link>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-muted-foreground text-sm mr-4">{user.email}</span>
            <button
              onClick={signOut}
              className="bg-secondary hover:bg-secondary/90 text-foreground px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}