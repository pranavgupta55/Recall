// src/App.jsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import HomePage from './pages/HomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MyFlashcardsPage from './pages/MyFlashcardsPage.jsx';
import CommunityFlashcardsPage from './pages/CommunityFlashcardsPage.jsx';
import Navbar from './components/Navbar.jsx';
import AIHelperPage from './pages/AIHelperPage.jsx'; // Corrected name
import StudyDashboardPage from './pages/StudyDashboardPage.jsx';
import StudySessionPage from './pages/StudySessionPage.jsx';

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      {user ? (
        // --- FIX: Ensure the root div is a flex column so <main> can reliably grow ---
        <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/my-flashcards" element={<MyFlashcardsPage />} />
              <Route path="/ai-assistant" element={<AIHelperPage />} />
              <Route path="/community-flashcards" element={<CommunityFlashcardsPage />} />
              <Route path="/study" element={<StudyDashboardPage />} />
              <Route path="/study/:deckName" element={<StudySessionPage />} />
            </Routes>
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
          <HomePage />
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;