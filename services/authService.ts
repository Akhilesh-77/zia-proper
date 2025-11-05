import { User } from '../types';

// This is a mock implementation of a Google OAuth service.
// In a real application, you would use a library like Firebase Authentication
// or Google Identity Services.

const MOCK_USER_SESSION_KEY = 'mock_google_user_session';

let authStateListener: ((user: User | null) => void) | null = null;

// Simulate a successful Google login
export const signInWithGoogle = async (): Promise<User> => {
  const user: User = {
    id: `google_${Math.random().toString(36).substring(2, 15)}`, // Unique ID for the session
    name: 'Alex Doe', // Mock user name
    email: 'alex.doe@example.com', // Mock user email
    photoUrl: `https://i.pravatar.cc/150?u=${Date.now()}`, // Unique photo for the session
  };

  try {
    sessionStorage.setItem(MOCK_USER_SESSION_KEY, JSON.stringify(user));
    if (authStateListener) {
      authStateListener(user);
    }
  } catch (error) {
    console.error("Failed to save mock user session", error);
  }
  
  return user;
};

// Simulate signing out
export const signOut = async (): Promise<void> => {
   try {
    sessionStorage.removeItem(MOCK_USER_SESSION_KEY);
    if (authStateListener) {
      authStateListener(null);
    }
  } catch (error) {
    console.error("Failed to clear mock user session", error);
  }
};

// Simulate an auth state change listener (like onAuthStateChanged in Firebase)
export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  authStateListener = callback;
  
  // Immediately check for an existing session when the listener is attached
  try {
    const savedUserJson = sessionStorage.getItem(MOCK_USER_SESSION_KEY);
    if (savedUserJson) {
      const user: User = JSON.parse(savedUserJson);
      callback(user);
    } else {
      callback(null);
    }
  } catch (error) {
    console.error("Failed to load mock user session", error);
    callback(null);
  }
  
  // Return an unsubscribe function
  return () => {
    authStateListener = null;
  };
};