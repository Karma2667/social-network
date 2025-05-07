'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, ListGroup, Alert } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import AppNavbar from '@/app/Components/Navbar';
import Link from 'next/link';

interface User {
  _id: string;
  username: string;
  avatar: string;
}

export default function ChatList() {
  const { userId, isInitialized } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized || !userId || !search.trim()) {
      console.log('ChatList: Ожидание инициализации, userId или поискового запроса:', { userId, search });
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log('ChatList: Поиск пользователей для userId:', userId, 'с запросом:', search);
        const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('ChatList: Ошибка API:', errorData);
          throw new Error(errorData.error || 'Не удалось найти пользователей');
        }
        const data = await res.json();
        console.log('ChatList: Пользователи найдены:', data);
        setUsers(data);
        setLoading(false);
      } catch (err: any) {
        console.error('ChatList: Ошибка поиска пользователей:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [isInitialized, userId, search]);

  if (!isInitialized) {
    console.log('ChatList: Рендеринг: Ожидание инициализации');
    return (
      <>
        <AppNavbar />
        <div className="d-flex align-items-center justify-content-center vh-100">Загрузка...</div>
      </>
    );
  }

  if (!userId && typeof window !== 'undefined') {
    console.log('ChatList: Рендеринг: Нет userId, перенаправление на /login');
    window.location.replace('/login');
    return null;
  }

  return (
    <>
      <AppNavbar />
      <Container fluid className="p-0" style={{ height: 'calc(100vh - 56px)' }}>
        <Row className="h-100 m-0">
          <Col md={4} className="telegram-sidebar p-0">
            <div className="p-3 border-bottom">
              <Form.Control
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск пользователей..."
                className="telegram-search"
              />
            </div>
            <div className="overflow-auto">
              {error && <Alert variant="danger" className="m-3">{error}</Alert>}
              {loading ? (
                <div className="p-3">Загрузка...</div>
              ) : users.length === 0 && search.trim() ? (
                <div className="p-3 text-muted">Пользователи не найдены</div>
              ) : users.length === 0 ? (
                <div className="p-3 text-muted">Введите имя для поиска</div>
              ) : (
                <ListGroup variant="flush">
                  {users.map((user) => (
                    <ListGroup.Item
                      key={user._id}
                      action
                      as={Link}
                      href={`/chat/${user._id}`}
                      className="telegram-user-item"
                    >
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.username}
                        className="telegram-user-avatar"
                      />
                      <div>
                        <div className="fw-bold">{user.username}</div>
                        <div className="text-muted small">Нажмите, чтобы открыть чат</div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          </Col>
          <Col md={8} className="d-none d-md-flex align-items-center justify-content-center telegram-chat">
            <div className="text-muted">Выберите чат для начала общения</div>
          </Col>
        </Row>
      </Container>
    </>
  );
}