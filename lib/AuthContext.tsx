'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext<{ userId: string | null }>({ userId: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem('userId'));

  useEffect(() => {
    const updateUserId = () => {
      const currentUserId = localStorage.getItem('userId');
      if (currentUserId !== userId) {
        setUserId(currentUserId);
      }
    };

    window.addEventListener('userIdUpdated', updateUserId);
    window.addEventListener('storage', updateUserId);
    const interval = setInterval(updateUserId, 100);

    return () => {
      window.removeEventListener('userIdUpdated', updateUserId);
      window.removeEventListener('storage', updateUserId);
      clearInterval(interval);
    };
  }, [userId]);

  console.log('AuthProvider userId:', userId);

  return (
    <AuthContext.Provider value={{ userId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);