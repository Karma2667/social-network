'use client';

import { useState, useEffect } from 'react';
import { Navbar, Nav, Button, Dropdown } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import NotificationItem from '@/app/Components/NotificationItem';

export default function AppNavbar() {
  const { userId, isInitialized, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    console.log('Navbar: Текущий userId:', userId, 'isInitialized:', isInitialized);
    if (!isInitialized || !userId) return;
    const fetchNotifications = async () => {
      try {
        console.log('Navbar: Загрузка уведомлений для userId:', userId);
        const res = await fetch('/api/notifications', {
          headers: { 'x-user-id': userId },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        } else {
          console.error('Navbar: Ошибка загрузки уведомлений:', res.status);
        }
      } catch (err) {
        console.error('Navbar: Ошибка загрузки уведомлений:', err);
      }
    };
    fetchNotifications();
  }, [userId, isInitialized]);

  const handleLogout = () => {
    console.log('Navbar: handleLogout вызван, userId:', userId);
    try {
      console.log('Navbar: Вызов logout из AuthContext');
      logout();
      console.log('Navbar: Проверка localStorage после logout');
      if (localStorage.getItem('userId')) {
        console.warn('Navbar: localStorage не очищен, принудительная очистка');
        localStorage.removeItem('userId');
      }
      console.log('Navbar: Перенаправление на /login');
    } catch (err) {
      console.error('Navbar: Ошибка при выходе:', err);
      window.location.replace('/login');
    }
  };

  if (!isInitialized) {
    console.log('Navbar: Рендеринг: Ожидание инициализации AuthContext');
    return null;
  }

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Navbar.Brand href="/">Snapgramm</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link href="/">Главная</Nav.Link>
          <Nav.Link href="/communities">Сообщества</Nav.Link>
          <Nav.Link href="/chat">Чат</Nav.Link>
          {userId ? (
            <>
              <Nav.Link href="/profile">Профиль</Nav.Link>
              <Dropdown>
                <Dropdown.Toggle variant="outline-light" id="dropdown-notifications">
                  Уведомления ({notifications.filter((n) => !n.read).length})
                </Dropdown.Toggle>
                <Dropdown.Menu align="end" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <Dropdown.Item disabled>Нет уведомлений</Dropdown.Item>
                  ) : (
                    notifications.map((notif) => (
                      <NotificationItem key={notif._id} notif={notif} />
                    ))
                  )}
                </Dropdown.Menu>
              </Dropdown>
              <Button
                variant="outline-light"
                onClick={() => {
                  console.log('Navbar: Событие onClick для кнопки Выйти');
                  handleLogout();
                }}
                className="ms-2"
              >
                Выйти
              </Button>
            </>
          ) : (
            <Nav.Link href="/login">Войти</Nav.Link>
          )}
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}