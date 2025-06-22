import './globals.css';
import { ReactNode } from 'react';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from '@/app/lib/AuthContext';

// Определяем тип для Navbar
import type { ComponentType } from 'react';

let Navbar: ComponentType | null = null;
try {
  Navbar = require('@/app/Components/Navbar').default;
} catch (e) {
  console.error('Ошибка импорта Navbar:', e);
  Navbar = () => <div>Ошибка загрузки навигации</div>;
}

export const metadata = {
  title: 'Социальная сеть',
  description: 'Telegram-подобная социальная сеть',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  console.log('RootLayout: Рендеринг начат');
  return (
    <html lang="ru" className="telegram-root" suppressHydrationWarning>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <AuthProvider>
          <div className="telegram-header">
            {Navbar && <Navbar />}
          </div>
          <Container fluid className="telegram-main p-0">
            {children}
          </Container>
        </AuthProvider>
      </body>
    </html>
  );
}