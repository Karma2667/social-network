'use client';

import { useState, useEffect } from 'react';
import { Container, Form, ListGroup, Alert } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import AppNavbar from '@/app/Components/Navbar';

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
      setUsers([]);
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
    return <div>Загрузка...</div>;
  }

  if (!userId) {
    console.log('ChatList: Рендеринг: Нет userId, перенаправление на /login');
    window.location.replace('/login');
    return null;
  }

  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        <h2>Поиск чатов</h2>
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Введите имя пользователя"
          />
        </Form.Group>
        {error && <Alert variant="danger">{error}</Alert>}
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <ListGroup>
            {users.length === 0 && search.trim() ? (
              <p>Пользователи не найдены</p>
            ) : users.length === 0 ? (
              <p>Введите имя для поиска</p>
            ) : (
              users.map((user) => (
                <ListGroup.Item
                  key={user._id}
                  action
                  onClick={() => {
                    console.log('ChatList: Переход к чату с пользователем:', user._id);
                    window.location.href = `/chat/${user._id}`;
                  }}
                >
                  <img
                    src={user.avatar || '/default-avatar.png'}
                    alt={user.username}
                    style={{ width: '30px', height: '30px', marginRight: '10px' }}
                  />
                  {user.username}
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        )}
      </Container>
    </>
  );
}