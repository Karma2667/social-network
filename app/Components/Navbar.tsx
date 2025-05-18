"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/ClientAuthProvider';
import Link from 'next/link';
import { Navbar as BSNavbar, Nav, Badge, Form, FormControl, Dropdown } from 'react-bootstrap';

export default function Navbar() {
  const { userId, isInitialized, username, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  console.log('Navbar: Рендеринг:', { userId, username, isInitialized });

  const fetchNotifications = async (retryCount = 3) => {
    if (!userId) return;
    console.log('Navbar: Загрузка уведомлений для userId:', userId);
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ошибка ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log('Navbar: Уведомления загружены:', data);
      setNotifications(data);
      setError(null);
    } catch (err: any) {
      console.error('Navbar: Ошибка загрузки уведомлений:', err.message);
      if (retryCount > 0) {
        console.log(`Navbar: Повторная попытка (${retryCount} осталось)`);
        setTimeout(() => fetchNotifications(retryCount - 1), 1000);
      } else {
        setError('Не удалось загрузить уведомления.');
      }
    }
  };

  const fetchUsers = async () => {
    if (!search.trim()) {
      setUsers([]);
      return;
    }
    console.log('Navbar: Поиск пользователей:', search);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`, {
        headers: {
          'x-user-id': userId || '',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ошибка ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log('Navbar: Пользователи найдены:', data);
      setUsers(data);
    } catch (err: any) {
      console.error('Navbar: Ошибка поиска пользователей:', err.message);
      setError('Не удалось найти пользователей.');
    }
  };

  useEffect(() => {
    if (!isInitialized || !userId) {
      console.log('Navbar: Ожидание инициализации');
      return;
    }
    fetchNotifications();
  }, [userId, isInitialized]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <BSNavbar bg="light" expand="lg" className="mb-3">
      <BSNavbar.Brand as={Link} href="/">
        Соцсеть
      </BSNavbar.Brand>
      <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
      <BSNavbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link as={Link} href="/">
            Главная
          </Nav.Link>
          {userId && (
            <Nav.Link as={Link} href="/chat">
              Чаты{' '}
              {notifications.length > 0 && (
                <Badge bg="danger">{notifications.length}</Badge>
              )}
            </Nav.Link>
          )}
        </Nav>
        {isInitialized && userId && (
          <Form className="d-flex me-3">
            <Dropdown show={users.length > 0} onToggle={() => {}}>
              <FormControl
                type="text"
                placeholder="Поиск пользователей..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '200px' }}
              />
              <Dropdown.Menu>
                {users.map((user) => (
                  <Dropdown.Item
                    key={user._id}
                    as={Link}
                    href={`/chat?chat=${user._id}`}
                  >
                    @{user.username} {user.name && `(${user.name})`}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Form>
        )}
        <Nav>
          {isInitialized && userId ? (
            <>
              <Nav.Link as={Link} href="/profile">
                @{username}
              </Nav.Link>
              <Nav.Link onClick={logout}>Выйти</Nav.Link>
            </>
          ) : (
            <>
              <Nav.Link as={Link} href="/login">
                Вход
              </Nav.Link>
              <Nav.Link as={Link} href="/register">
                Регистрация
              </Nav.Link>
            </>
          )}
        </Nav>
      </BSNavbar.Collapse>
    </BSNavbar>
  );
}