'use client';

import { useState, useEffect } from 'react';
import { Navbar, Nav, Button, Badge, Container } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Notification {
  _id: string;
  type: string;
  content: string;
  createdAt: string;
}

export default function AppNavbar() {
  const { userId, isInitialized, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  // Функция для повторных попыток запроса
  const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 3, delay: number = 1000): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (err) {
        if (i < retries - 1) {
          console.log(`Navbar: Повторная попытка (${i + 1}/${retries}) для ${url}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }
    throw new Error('Не удалось выполнить запрос');
  };

  useEffect(() => {
    if (!isInitialized) {
      console.log('Navbar: Рендеринг: Ожидание инициализации AuthContext');
      return;
    }

    if (!userId) {
      console.log('Navbar: Нет userId, перенаправление на /login');
      router.replace('/login');
      return;
    }

    console.log('Navbar: Текущий userId:', userId, 'isInitialized:', isInitialized);

    const fetchNotifications = async () => {
      try {
        console.log('Navbar: Загрузка уведомлений для userId:', userId);
        const res = await fetchWithRetry(`/api/notifications?userId=${userId}`, {
          headers: { 'x-user-id': userId },
        });
        console.log('Navbar: Ответ сервера для /api/notifications:', res.status, res.statusText);
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Navbar: Ошибка API уведомлений:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить уведомления');
        }
        const data = await res.json();
        console.log('Navbar: Уведомления загружены:', data);
        setNotifications(data);
      } catch (err: any) {
        console.error('Navbar: Ошибка загрузки уведомлений:', err.message);
        setNotifications([]);
      }
    };

    fetchNotifications();
  }, [userId, isInitialized, router]);

  if (!isInitialized) {
    return null;
  }

  return (
    <Navbar bg="light" expand="lg" className="telegram-header">
      <Container fluid>
        <Navbar.Brand as={Link} href="/">
          Social Network
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="navbar-nav" />
        <Navbar.Collapse id="navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} href="/chat">
              Чаты{' '}
              {notifications.length > 0 && (
                <Badge bg="danger">{notifications.length}</Badge>
              )}
            </Nav.Link>
            <Nav.Link as={Link} href="/profile/edit">
              Профиль
            </Nav.Link>
            <Button variant="outline-danger" onClick={logout}>
              Выйти
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}