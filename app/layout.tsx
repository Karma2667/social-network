'use client';

import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/app/globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}