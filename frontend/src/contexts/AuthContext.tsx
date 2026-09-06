import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../api/client.js';

// Resolve the backend origin for OAuth redirects (window.location.href bypasses the Vite proxy).
// VITE_API_URL is e.g. "https://reachinbox-backend-w6uq.onrender.com/api" — we strip "/api" to
// get the bare origin for building redirect URLs.
function getBackendBase(): string {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiUrl) {
    // Remove trailing "/api" suffix to get the root backend URL
    return apiUrl.replace(/\/api$/, '');
  }
  if (import.meta.env.PROD) {
    return 'https://reachinbox-backend-w6uq.onrender.com';
  }
  // Local dev: use relative path (proxied by Vite to localhost:5000)
  return '';
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      setLoading(true);
      const res = await api.auth.getMe();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginWithGoogle = () => {
    window.location.href = `${getBackendBase()}/api/auth/google`;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}