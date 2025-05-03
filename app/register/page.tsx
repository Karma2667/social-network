'use client';

import { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUserId } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      console.log('Register: Попытка регистрации с email:', email);
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Register: Ошибка API:', errorData);
        throw new Error(errorData.error || 'Не удалось зарегистрироваться');
      }
      const { userId } = await res.json();
      console.log('Register: Успешная регистрация, userId:', userId);
      localStorage.setItem('userId', userId);
      setUserId(userId); // Прямо обновляем AuthContext
      console.log('Register: userId сохранен в localStorage и AuthContext:', userId);
      setTimeout(() => {
        router.push('/');
      }, 200); // Увеличена задержка
    } catch (err: any) {
      console.error('Register: Ошибка регистрации:', err.message);
      setError(err.message);
    }
  };

  return (
    <Container className="my-4">
      <h2>Регистрация</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Имя пользователя</Form.Label>
          <Form.Control
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Введите имя пользователя"
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Введите email"
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Пароль</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            required
          />
        </Form.Group>
        <Button variant="primary" type="submit" className="me-2">
          Зарегистрироваться
        </Button>
        <Button
          variant="outline-primary"
          onClick={() => router.push('/login')}
        >
          Вход
        </Button>
      </Form>
    </Container>
  );
}