"use client";

import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, ListGroup, Alert, Image } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import AppNavbar from '@/app/Components/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Chat from '@/app/Components/Chat';

interface User {
  _id: string;
  username: string;
  avatar: string;
}

function ChatListContent() {
  const { userId, isInitialized } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  console.log('ChatList: Инициализация, userId:', userId, 'isInitialized:', isInitialized);

  // Проверка ширины экрана
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    console.log('ChatList: Начальная проверка isDesktop:', mediaQuery.matches);
    setIsDesktop(mediaQuery.matches);
    const handleResize = (e: MediaQueryListEvent) => {
      console.log('ChatList: Изменение mediaQuery:', e.matches);
      setIsDesktop(e.matches);
    };
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  // Перенаправление на /login
  useEffect(() => {
    if (isInitialized && !userId) {
      console.log('ChatList: Нет userId, перенаправление на /login');
      router.replace('/login');
    }
  }, [isInitialized, userId, router]);

  // Загрузка пользователей
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

  // Обработка клика по пользователю
  const handleUserClick = (user: User) => {
    console.log('ChatList: Клик на пользователя:', user._id, 'isDesktop:', isDesktop);
    if (isDesktop) {
      console.log('ChatList: Выбор пользователя для десктопа:', user.username);
      setSelectedUser(user);
    } else {
      console.log('ChatList: Переход на /chat/[id] для мобильного:', `/chat/${user._id}`);
      router.push(`/chat/${user._id}`);
    }
  };

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
          <Col xs={12} md={4} className="telegram-sidebar p-0">
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
                      onClick={() => handleUserClick(user)}
                      className={`telegram-user-item ${selectedUser?._id === user._id && isDesktop ? 'active' : ''}`}
                    >
                      <Image
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.username}
                        roundedCircle
                        className="telegram-user-avatar"
                      />
                      <span className="telegram-user-name">{user.username}</span>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          </Col>
          <Col md={8} className="telegram-chat d-none d-md-flex flex-column">
            {selectedUser ? (
              <>
                <div className="telegram-chat-header d-flex align-items-center p-3 border-bottom">
                  <Image
                    src={selectedUser.avatar || '/default-avatar.png'}
                    alt={selectedUser.username}
                    roundedCircle
                    className="telegram-user-avatar"
                  />
                  <div className="fw-bold">{selectedUser.username}</div>
                </div>
                <Chat
                  recipientId={selectedUser._id}
                  recipientUsername={selectedUser.username}
                />
              </>
            ) : (
              <div className="d-flex align-items-center justify-content-center flex-grow-1 text-muted">
                Выберите пользователя для начала общения
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default function ChatList() {
  return <ChatListContent />;
}