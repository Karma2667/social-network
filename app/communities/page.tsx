'use client';

import { useState, useEffect } from 'react';
import { Container, ListGroup, Button, Form } from 'react-bootstrap';
import AppNavbar from '@/app/Components/Navbar';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function Communities() {
  const { userId } = useAuth();
  const [communities, setCommunities] = useState<{ _id: string; name: string; creator: { username: string } }[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      console.log('Communities: Нет userId, ожидание перенаправления');
      setLoading(false);
      return;
    }
    const fetchCommunities = async () => {
      try {
        console.log('Communities: Загрузка сообществ');
        const res = await fetch('/api/communities', {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Не удалось загрузить сообщества');
        }
        const data = await res.json();
        setCommunities(data || []);
      } catch (err: any) {
        console.error('Communities: Ошибка загрузки сообществ:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunities();
  }, [userId]);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !userId) {
      setError('Требуется название и аутентификация');
      return;
    }
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ name, description, userId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось создать сообщество');
      }
      const newCommunity = await res.json();
      setCommunities([...communities, newCommunity]);
      setName('');
      setDescription('');
    } catch (err: any) {
      console.error('Communities: Ошибка создания сообщества:', err);
      setError(err.message);
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (!userId) return null; // Ожидаем перенаправления
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        <h2>Сообщества</h2>
        <Form onSubmit={handleCreateCommunity} className="mb-4">
          <Form.Group className="mb-3">
            <Form.Label>Название сообщества</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название..."
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Описание</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание..."
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Создать сообщество
          </Button>
        </Form>
        <h3>Список сообществ</h3>
        <ListGroup>
          {communities.length === 0 ? (
            <p>Пока нет сообществ</p>
          ) : (
            communities.map((community) => (
              <ListGroup.Item key={community._id}>
                <Link href={`/communities/${community._id}`}>
                  {community.name} (Создатель: {community.creator?.username || 'Неизвестный'})
                </Link>
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
      </Container>
    </>
  );
}