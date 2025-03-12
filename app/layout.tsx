

'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/app/globals.css';
import React, { useState, useEffect } from 'react';



export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    setUserId(storedUserId);
  }, []);

  return (
    <html lang="en">
      <body>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, { userId })
          : children}
      </body>
    </html>
  );
}