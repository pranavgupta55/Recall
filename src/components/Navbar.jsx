// src/components/Navbar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, signOut } = useAuth();

  const linkStyle = "px-4 py-2 rounded-md hover:bg-card transition-colors";
  const activeLinkStyle = `${linkStyle} bg-card font-semibold`;

  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-muted">
      <div className="flex items-center gap-4">
        <NavLink to="/" className="text-xl font-bold">AI Flashcards</NavLink>
        <div className="flex items-center gap-2">
          <NavLink to="/my-flashcards" className={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>My Cards</NavLink>
          <NavLink to="/ai-assistant" className={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>AI Assistant</NavLink>
          <NavLink to="/community-flashcards" className={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Community</NavLink>
          <NavLink to="/study" className={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Study</NavLink>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground">{user.email}</span>
        <button onClick={signOut} className="bg-secondary text-secondary-foreground font-bold py-2 px-4 rounded-lg hover:bg-secondary/90">Sign Out</button>
      </div>
    </nav>
  );
}