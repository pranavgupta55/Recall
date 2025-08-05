// src/pages/DashboardPage.jsx

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tokensUsed: 0, cardCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // Fetch token count from the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tokens_used')
        .eq('id', user.id)
        .single(); // .single() gets one record instead of an array

      // Fetch the count of flashcards
      const { count: cardCount, error: countError } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true }) // This special syntax just gets the count
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-muted-foreground">Tokens Used This Month</h2>
          <p className="text-4xl font-bold">{loading ? '...' : stats.tokensUsed.toLocaleString()}</p>
        </div>
        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-muted-foreground">Total Flashcards Created</h2>
          <p className="text-4xl font-bold">{loading ? '...' : stats.cardCount}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Link to="/my-flashcards" className="bg-primary hover:bg-primary/90 text-foreground font-bold py-3 px-6 rounded-lg text-center">
          Manage My Flashcards
        </Link>
        <Link to="/community-flashcards" className="bg-primary hover:bg-primary/90 text-foreground font-bold py-3 px-6 rounded-lg text-center">
          Explore Community Decks
        </Link>
      </div>
    </div>
  );
}