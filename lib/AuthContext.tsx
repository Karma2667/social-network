'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  userId: string | null;
  isInitialized: boolean;
  logout: () => void;
  login: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  isInitialized: false,
  logout: () => {},
  login: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsInitialized(true);
      return;
    }

    const storedUserId = localStorage.getItem('userId');
    if (storedUserId !== userId) {
      setUserId(storedUserId);
    }
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, []); // Пустой массив зависимостей

  const login = (userId: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('userId', userId);
      setUserId(userId);
    } catch (err) {
      console.error('AuthProvider: Ошибка при входе:', err);
    }
  };

  const logout = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('userId');
      setUserId(null);
      window.location.replace('/login');
    } catch (err) {
      console.error('AuthProvider: Ошибка при выходе:', err);
      window.location.replace('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ userId, isInitialized, logout, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}