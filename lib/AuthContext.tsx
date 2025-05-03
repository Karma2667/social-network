'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  userId: string | null;
  isInitialized: boolean;
  logout: () => void;
  setUserId: (userId: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  isInitialized: false,
  logout: () => {},
  setUserId: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('AuthProvider: Ожидание инициализации...');
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      console.log('AuthProvider: Загружен userId из localStorage:', storedUserId);
      setUserId(storedUserId);
    } else {
      console.log('AuthProvider: Нет userId в localStorage');
    }
    setIsInitialized(true);
    console.log('AuthProvider: Инициализация завершена, isInitialized:', true);
  }, []);

  // Слушаем изменения localStorage
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userId') {
        const newUserId = event.newValue;
        console.log('AuthProvider: Обнаружено изменение userId в localStorage:', newUserId);
        setUserId(newUserId);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const logout = () => {
    console.log('AuthProvider: Выход из системы');
    try {
      localStorage.removeItem('userId');
      setUserId(null);
      console.log('AuthProvider: localStorage очищен, перенаправление на /login');
      window.location.replace('/login');
    } catch (err) {
      console.error('AuthProvider: Ошибка при выходе:', err);
      window.location.replace('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ userId, isInitialized, logout, setUserId }}>
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