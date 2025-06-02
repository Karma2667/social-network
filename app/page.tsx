'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace('/login');
    } else {
      router.replace('/profile');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized) {
    return <div>Загрузка...</div>;
  }

  return null;
}