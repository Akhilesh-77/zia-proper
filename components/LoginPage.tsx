import React, { useState } from 'react';
import type { User } from '../types';
import { signInWithGoogle } from '../services/authService';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      // In a real app, this would open a Google sign-in popup.
      // Here, our mock service simulates a successful login.
      const user = await signInWithGoogle();
      // The onLogin prop is now mainly for notifying the parent,
      // but the auth state will be managed by the onAuthStateChanged listener in App.tsx.
      onLogin(user);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
      setIsLoggingIn(false);
    }
    // No need to set isLoggingIn to false on success, as the component will unmount.
  };

  return (
    <div className="w-full h-full max-w-md mx-auto flex flex-col items-center justify-center font-sans bg-dark-bg text-dark-text p-8 animate-fadeIn">
      <div className="text-center">
        <img 
          src="https://i.postimg.cc/qRB2Gnw2/Gemini-Generated-Image-vfkohrvfkohrvfko-1.png" 
          alt="Zia.ai Logo" 
          className="h-24 w-24 mx-auto mb-4"
        />
        <h1 className="text-5xl font-bold mb-2">Zia.ai</h1>
        <p className="text-lg text-gray-400 mb-12">Your personal AI Mates.</p>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={isLoggingIn}
        className="w-full max-w-sm bg-white text-black font-semibold py-3 px-6 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50 shadow-lg hover:shadow-white/20 disabled:opacity-50"
      >
        <svg className="w-6 h-6 mr-4" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          <path fill="none" d="M0 0h48v48H0z"></path>
        </svg>
        {isLoggingIn ? 'Logging in...' : 'Continue with Google'}
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      <div className="mt-auto text-center text-xs text-gray-500">
        <p>© 2025 Zia.ai from(ziaakia.ai team) — Securely stored on your broswer cloud.</p>
      </div>
    </div>
  );
};

export default LoginPage;