import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata = {
  title: 'Snapgramm',
  description: 'A social network platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}