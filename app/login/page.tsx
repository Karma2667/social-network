'use client';

import { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      console.log('Login: Попытка входа с email:', email);
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось войти');
      }
      const { userId } = await res.json();
      console.log('Login: Успешный вход, userId:', userId);
      localStorage.setItem('userId', userId);
      console.log('Login: userId сохранен в localStorage:', localStorage.getItem('userId'));
      // Задержка для синхронизации localStorage
      setTimeout(() => {
        router.push('/');
      }, 100);
    } catch (err: any) {
      console.error('Login: Ошибка входа:', err);
      setError(err.message);
    }
  };

  return (
    <Container className="my-4">
      <h2>Вход</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
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
          Войти
        </Button>
        <Button
          variant="outline-primary"
          onClick={() => router.push('/register')}
        >
          Регистрация
        </Button>
      </Form>
    </Container>
  );
}