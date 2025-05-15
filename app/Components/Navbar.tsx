"use client";

import { useState, useEffect } from 'react';
import { Navbar, Nav, Badge, Button } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function AppNavbar() {
  const { userId, isInitialized, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);

  console.log('Navbar: Рендеринг:', { userId, isInitialized });

  useEffect(() => {
    if (!isInitialized || !userId) {
      console.log('Navbar: Ожидание инициализации или userId:', { isInitialized, userId });
      return;
    }

    console.log('Navbar: Загрузка уведомлений для userId:', userId);
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${userId}`, {
          headers: { 'x-user-id': userId },
          cache: 'no-store',
        });
        console.log('Navbar: Ответ сервера для /api/notifications:', res.status, res.statusText);
        if (!res.ok) {
          throw new Error('Не удалось загрузить уведомления');
        }
        const data = await res.json();
        console.log('Navbar: Уведомления загружены:', data);
        setNotifications(data);
      } catch (err) {
        console.error('Navbar: Ошибка загрузки уведомлений:', err);
      }
    };

    fetchNotifications();
  }, [userId, isInitialized]);

  const handleLogout = async () => {
    console.log('Navbar: Запрос на выход, userId:', userId);
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'x-user-id': userId! },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка выхода');
      }
      console.log('Navbar: Выход успешен');
      logout();
      router.push('/login');
    } catch (err) {
      console.error('Navbar: Ошибка выхода:', err);
    }
  };

  if (!isInitialized) {
    console.log('Navbar: Ожидание инициализации');
    return <div className="p-3">Загрузка...</div>;
  }

  return (
    <Navbar bg="dark" variant="dark" expand="lg" fixed="top">
      <Navbar.Brand href="/chat" className="ms-3">
        Социальная сеть
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="navbar-nav" />
      <Navbar.Collapse id="navbar-nav">
        <Nav className="ms-auto align-items-center">
          {userId && (
            <>
              <Nav.Link as="div" className="d-flex align-items-center">
                <span className="text-white">Уведомления:</span>
                <Badge bg="primary" className="ms-2">
                  {notifications.length}
                </Badge>
              </Nav.Link>
              <Button
                variant="outline-light"
                onClick={handleLogout}
                className="ms-3 me-3"
              >
                Выйти
              </Button>
            </>
          )}
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}