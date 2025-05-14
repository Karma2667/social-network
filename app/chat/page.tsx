"use client";

import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, ListGroup, Alert, Button } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import AppNavbar from '@/app/Components/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  _id: string;
  username: string;
  avatar: string;
  online: boolean;
}

function ChatListContent() {
  const { userId, isInitialized } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized || !userId) {
      console.log('ChatList: Ожидание инициализации или userId:', { isInitialized, userId });
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log('ChatList: Загрузка пользователей для userId:', userId, 'поиск:', search);
        const res = await fetch(`/api/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
          headers: { 'x-user-id': userId },
          cache: 'no-store',
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('ChatList: Ошибка API:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить пользователей');
        }
        const data = await res.json();
        console.log('ChatList: Пользователи загружены:', data);
        setUsers(data);
        setLoading(false);
      } catch (err: any) {
        console.error('ChatList: Ошибка загрузки пользователей:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [isInitialized, userId, search]);

  if (!isInitialized) {
    console.log('ChatList: Ожидание инициализации');
    return (
      <>
        <AppNavbar />
        <div className="d-flex align-items-center justify-content-center vh-100">Загрузка...</div>
      </>
    );
  }

  return (
    <>
      <AppNavbar />
      <Container fluid className="p-0" style={{ height: 'calc(100vh - 56px)' }}>
        <Row className="h-100 m-0">
          <Col xs={12} className="telegram-sidebar p-0">
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
                      <span className="telegram-user-name">{user.username}</span>
                      <span className="text-muted small ms-auto">
                        {user.online ? 'Онлайн' : 'Офлайн'}
                      </span>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default function ChatList() {
  return <ChatListContent />;
}