'use client';

import { AuthProvider } from '@/lib/AuthContext';
import { ReactNode } from 'react';

export default function ClientAuthProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}