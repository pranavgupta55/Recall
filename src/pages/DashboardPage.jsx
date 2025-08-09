// src/pages/DashboardPage.jsx

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

// --- NEW: Token limit constant ---
const TOKEN_LIMIT = 100000;

// --- NEW: Progress bar component to visualize token usage ---
const TokenProgressBar = ({ value, max }) => {
    const percentage = Math.min(100, (value / max) * 100);
    const isOverLimit = value >= max;
    
    return (
        <div className="mt-2">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>{value.toLocaleString()} / {max.toLocaleString()}</span>
                <span>{percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
                <div 
                    className={`h-3 rounded-full transition-all duration-500 ${isOverLimit ? 'bg-secondary' : 'bg-primary'}`} 
                    style={{ width: `${percentage}%` }}>
                </div>
            </div>
             {isOverLimit && <p className="text-secondary text-xs mt-2 text-center font-semibold">You have reached your monthly limit. AI features are unavailable.</p>}
        </div>
    );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tokensUsed: 0, cardCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tokens_used')
        .eq('id', user.id)
        .single();

      const { count: cardCount, error: countError } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (profileError || countError) {
        console.error('Error fetching dashboard data:', profileError || countError);
      } else {
        setStats({
          tokensUsed: profileData?.tokens_used || 0,
          cardCount: cardCount || 0,
        });
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [user.id]);

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome back, {user.email}!</p>

      {/* --- MODIFIED: Grid layout to accommodate new usage meter --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-muted-foreground">Monthly Token Usage</h2>
          {loading ? <p className="text-4xl font-bold">...</p> : <TokenProgressBar value={stats.tokensUsed} max={TOKEN_LIMIT} />}
        </div>
        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-muted-foreground">Total Flashcards Created</h2>
          <p className="text-4xl font-bold">{loading ? '...' : stats.cardCount.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Link to="/my-flashcards" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-lg text-center">
          Manage My Flashcards
        </Link>
        <Link to="/community-flashcards" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-lg text-center">
          Explore Community Decks
        </Link>
      </div>
    </div>
  );
}