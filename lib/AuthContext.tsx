"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  userId: string | null;
  isInitialized: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  isInitialized: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  console.log('AuthProvider: Начало инициализации, pathname:', pathname);

  const checkAuth = useCallback(async () => {
    console.log('AuthProvider: Проверка авторизации, текущий путь:', pathname);
    const authToken = localStorage.getItem('authToken');
    console.log('AuthProvider: Токен из localStorage:', authToken);

    if (!authToken) {
      console.log('AuthProvider: Токен отсутствует, установка isInitialized');
      setIsInitialized(true);
      if (pathname !== '/login' && pathname !== '/register') {
        console.log('AuthProvider: Нет токена, перенаправление на /login');
        router.replace('/login');
      }
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      console.log('AuthProvider: Ответ /api/auth/me:', res.status, res.statusText);

      if (!res.ok) {
        throw new Error(`Не удалось проверить авторизацию: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log('AuthProvider: Данные /api/auth/me:', data);
      if (data.userId) {
        setUserId(data.userId);
      } else {
        setUserId(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
      }
      setIsInitialized(true);

      if (!data.userId && pathname !== '/login' && pathname !== '/register') {
        console.log('AuthProvider: Нет userId, перенаправление на /login');
        router.replace('/login');
      }
    } catch (err) {
      console.error('AuthProvider: Ошибка инициализации:', err instanceof Error ? err.message : 'Неизвестная ошибка');
      setUserId(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
      setIsInitialized(true);
      if (pathname !== '/login' && pathname !== '/register') {
        console.log('AuthProvider: Ошибка авторизации, перенаправление на /login');
        router.replace('/login');
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!isInitialized && !userId) {
      checkAuth();
    }
  }, [checkAuth, isInitialized, userId]);

  const logout = useCallback(() => {
    console.log('AuthProvider: Выполнение logout, userId:', userId);
    setUserId(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ userId, isInitialized, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}