"use client";

import { useState, useEffect } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function EditProfilePage() {
  const { userId, isInitialized, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  console.log('EditProfile: Инициализация, userId:', userId, 'isInitialized:', isInitialized);

  useEffect(() => {
    if (isInitialized && !userId) {
      console.log('EditProfile: Нет userId, перенаправление на /login');
      router.replace('/login');
    } else if (userId) {
      console.log('EditProfile: Загрузка текущего username для userId:', userId);
      setUsername(localStorage.getItem('username') || '');
    }
  }, [userId, isInitialized, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    console.log('EditProfile: Попытка обновления профиля:', { username });

    if (!username.trim()) {
      console.log('EditProfile: Пустой username');
      setError('Пожалуйста, введите имя пользователя');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ username: username.trim() }),
      });
      console.log('EditProfile: Ответ /api/profile:', res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.json();
        console.log('EditProfile: Ошибка сервера:', errorData);
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }

      const data = await res.json();
      console.log('EditProfile: Профиль обновлен:', { userId: data.userId, username: data.username });

      localStorage.setItem('username', data.username);
      setSuccess('Имя пользователя успешно обновлено');
    } catch (err: any) {
      console.error('EditProfile: Ошибка обновления:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isInitialized || !userId) {
    console.log('EditProfile: Ожидание инициализации');
    return <div>Загрузка...</div>;
  }

  return (
    <Container className="d-flex align-items-center justify-content-center vh-100">
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <h2 className="text-center mb-4">Редактировать профиль</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Имя пользователя</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите новое имя пользователя"
              disabled={submitting}
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="w-100" disabled={submitting}>
            {submitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </Form>
        <div className="text-center mt-3">
          <p>
            <Link href="/chat">Вернуться к чатам</Link>
          </p>
        </div>
      </div>
    </Container>
  );
}