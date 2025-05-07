'use client';

import { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import AppNavbar from '@/app/Components/Navbar';
import Link from 'next/link';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Отладка: логируем данные перед отправкой
    console.log('Login: Отправка данных:', { email, password });

    if (!email.trim() || !password.trim()) {
      console.error('Login: Пустые поля:', { email, password });
      setError('Заполните все поля');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Login: Ошибка API:', data);
        throw new Error(data.error || 'Не удалось войти');
      }

      console.log('Login: Успешный вход:', data);
      login(data.userId); // Устанавливаем userId через AuthContext
      window.location.replace('/chat'); // Перенаправление после входа
    } catch (err: any) {
      console.error('Login: Ошибка входа:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <AppNavbar />
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
              disabled={loading}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Пароль</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              disabled={loading}
            />
          </Form.Group>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </Form>
        <p className="mt-3">
          Нет аккаунта? <Link href="/register">Зарегистрируйтесь</Link>
        </p>
      </Container>
    </>
  );
}