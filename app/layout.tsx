import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import ClientAuthProvider from '@/lib/ClientAuthProvider';
import Navbar from '@/app/Components/Navbar';
import { Container } from 'react-bootstrap';

export const metadata = {
  title: 'Social Network',
  description: 'A Telegram-like social network',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  console.log('RootLayout: Рендеринг начат');
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/_next/static/css/app/layout.css" />
      </head>
      <body>
        <ClientAuthProvider>
          <Navbar />
          <Container fluid className="p-0">
            {children}
          </Container>
        </ClientAuthProvider>
      </body>
    </html>
  );
}