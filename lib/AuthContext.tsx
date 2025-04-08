// lib/AuthContext.ts
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  userId: string | null;
}

const AuthContext = createContext<AuthContextType>({ userId: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    console.log('AuthProvider: Loaded userId from localStorage:', storedUserId); // Отладка
    setUserId(storedUserId);
  }, []);

  return (
    <AuthContext.Provider value={{ userId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}