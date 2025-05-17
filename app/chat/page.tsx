"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/ClientAuthProvider';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Form, Button, ListGroup } from 'react-bootstrap';
import Link from 'next/link';

export default function ChatPage() {
  const { userId, isInitialized, username } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isDesktop, setIsDesktop] = useState(true);

  console.log('ChatList: Инициализация, userId:', userId, 'isInitialized:', isInitialized, 'username:', username);

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
      console.log('ChatList: Проверка isDesktop:', desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      console.log('ChatList: Ожидание инициализации');
      return;
    }
    if (!userId) {
      console.log('ChatList: Нет userId, перенаправление на /login');
      router.replace('/login');
      return;
    }
    console.log('ChatList: Загрузка пользователей для userId:', userId);
    fetch(`/api/users?search=${encodeURIComponent(search)}`, {
      headers: { 'x-user-id': userId },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('ChatList: Пользователи загружены:', data);
        setUsers(data);
      })
      .catch((err) => console.error('ChatList: Ошибка загрузки пользователей:', err.message));
  }, [userId, isInitialized, search, router]);

  if (!isInitialized) {
    console.log('ChatList: Ожидание инициализации');
    return <div>Загрузка...</div>;
  }

  if (!userId) {
    console.log('ChatList: Нет userId, отображение пустого состояния');
    return null; // Будет перенаправлено
  }

  return (
    <Container fluid>
      <Row>
        {isDesktop && (
          <Col md={3} className="border-end" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="p-3">
              <h5>Чаты</h5>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск @username"
                />
              </Form.Group>
              <ListGroup>
                {users.map((user) => (
                  <ListGroup.Item key={user._id} as={Link} href={`/chat/${user._id}`} action>
                    @{user.username} {user.name && `(${user.name})`}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          </Col>
        )}
        <Col md={isDesktop ? 9 : 12}>
          <div className="p-3">
            <h5>Выберите чат</h5>
            {!isDesktop && (
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск @username"
                />
              </Form.Group>
            )}
            <p>Добро пожаловать, @{username}!</p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}