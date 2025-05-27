import './globals.css';
import { ReactNode } from 'react';
import Navbar from '@/app/Components/Navbar';
import ClientAuthProvider from '@/app/lib/ClientAuthProvider';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

export const metadata = {
  title: 'Социальная сеть',
  description: 'Telegram-подобная социальная сеть',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  console.log('RootLayout: Рендеринг начат');
  return (
    <html lang="ru" className="telegram-root" suppressHydrationWarning>
      <body>
        <ClientAuthProvider>
          <div className="telegram-header">
            <Navbar />
          </div>
          <Container fluid className="telegram-main p-0">
            {children}
          </Container>
        </ClientAuthProvider>
      </body>
    </html>
  );
}