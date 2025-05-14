"use client";

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
    console.log('AuthProvider: Начало инициализации');
    if (typeof window === 'undefined') {
      setIsInitialized(true);
      return;
    }

    const storedUserId = localStorage.getItem('userId') || '67d2a7a473abc791ba0f20b8'; // Хардкод для теста
    setUserId(storedUserId);
    setIsInitialized(true);
    console.log('AuthProvider: Инициализация завершена, userId:', storedUserId);
  }, []); // Убраны зависимости

  const login = (userId: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('userId', userId);
      setUserId(userId);
      console.log('AuthProvider: Вход выполнен, userId:', userId);
    } catch (err) {
      console.error('AuthProvider: Ошибка при входе:', err);
    }
  };

  const logout = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('userId');
      setUserId(null);
      console.log('AuthProvider: Выход выполнен');
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