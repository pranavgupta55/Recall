// src/App.jsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import HomePage from './pages/HomePage.jsx'; // This is our Login/Signup page
import DashboardPage from './pages/DashboardPage.jsx';
import MyFlashcardsPage from './pages/MyFlashcardsPage.jsx';
import CommunityFlashcardsPage from './pages/CommunityFlashcardsPage.jsx';
import Navbar from './components/Navbar.jsx';
import ChatbotPage from './pages/ChatbotPage.jsx';

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      {user ? (
        // --- User is Logged In ---
        <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
          <Navbar />
          <main className="flex-grow flex items-start justify-center py-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/my-flashcards" element={<MyFlashcardsPage />} />
              <Route path="/ai-assistant" element={<ChatbotPage />} />
              <Route path="/community-flashcards" element={<CommunityFlashcardsPage />} />
            </Routes>
          </main>
        </div>
      ) : (
        // --- User is Not Logged In ---
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
          <HomePage />
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;