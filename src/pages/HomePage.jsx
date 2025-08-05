import { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setMessage('Signup successful! Please check your email to verify.');
    }
  };

  if (user) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome, {user.email}</h1>
        <p className="mb-8">You are now logged in. This is where your flashcard app will live.</p>
        <button
          onClick={signOut}
          className="px-4 py-2 bg-secondary hover:bg-secondary/90 rounded-md text-foreground"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 border border-muted rounded-lg">
      <h1 className="text-2xl font-bold text-center mb-6">Flashcard Login</h1>
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label className="block text-muted-foreground mb-2" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-card border border-muted rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-muted-foreground mb-2" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-card border border-muted rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        {error && <p className="text-secondary text-center mb-4">{error}</p>}
        {message && <p className="text-primary text-center mb-4">{message}</p>}
        <div className="flex items-center justify-between">
          <button type="submit" className="w-full mr-2 px-4 py-2 bg-primary hover:bg-primary/90 rounded-md text-foreground font-bold">
            Log In
          </button>
          <button onClick={handleSignup} type="button" className="w-full ml-2 px-4 py-2 bg-muted hover:bg-muted/90 rounded-md text-foreground font-bold">
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}