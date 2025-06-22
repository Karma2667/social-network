'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateKeyPair } from './crypto';

interface User {
  userId: string;
  username: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  userId: string | null;
  username: string | null;
  avatar: string | null;
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
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok && isMounted) {
            const data = await res.json();
            setUser({ userId: data.userId, username: data.username, avatar: data.avatar || '/default-avatar.png' });

            // Проверяем наличие ключей шифрования
            const privateKey = localStorage.getItem(`privateKey_${data.userId}`);
            if (!privateKey) {
              const { publicKey, privateKey } = await generateKeyPair();
              localStorage.setItem(`privateKey_${data.userId}`, privateKey);
              // Отправляем публичный ключ на сервер
              await fetch('/api/users/keys', {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ publicKey }),
              });
            }
          } else if (isMounted) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
          }
        }
      } catch (error) {
        console.error('AuthProvider: Ошибка инициализации авторизации:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    console.log('AuthProvider: Выход выполнен');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userId: user?.userId || null, 
      username: user?.username || null, 
      avatar: user?.avatar || null,
      isInitialized, 
      logout 
    }}>
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