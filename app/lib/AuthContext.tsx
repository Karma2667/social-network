'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  userId: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  userId: string | null;
  username: string | null;
  isInitialized: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        console.log('AuthProvider: Токен из localStorage:', token);
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          console.log('AuthProvider: Ответ /api/auth/me:', res.status, res.statusText);
          if (res.ok && isMounted) {
            const data = await res.json();
            console.log('AuthProvider: Данные /api/auth/me:', data);
            setUser({ userId: data.userId, username: data.username });
          } else if (isMounted) {
            localStorage.removeItem('authToken');
            console.log('AuthProvider: Токен удалён из-за ошибки:', res.status);
          }
        } else if (isMounted) {
          console.log('AuthProvider: Токен отсутствует');
        }
      } catch (error) {
        console.error('AuthProvider: Ошибка инициализации авторизации:', error);
        localStorage.removeItem('authToken');
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isInitialized) {
      console.log('AuthProvider: Инициализация завершена, user:', user, 'isInitialized:', isInitialized);
    }
  }, [user, isInitialized]);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, userId: user?.userId || null, username: user?.username || null, isInitialized, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};