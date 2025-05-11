import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import ClientAuthProvider from './ClientAuthProvider';
import { Container } from 'react-bootstrap';

export const metadata = {
  title: 'Social Network',
  description: 'A Telegram-like social network',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientAuthProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <Container fluid className="p-0">
            {children}
          </Container>
        </body>
      </html>
    </ClientAuthProvider>
  );
}