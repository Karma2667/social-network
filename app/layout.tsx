import 'bootstrap/dist/css/bootstrap.min.css';
import '@/app/globals.css';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"> {/* Укажи нужный язык */}
      <body>{children}</body>
    </html>
  );
}