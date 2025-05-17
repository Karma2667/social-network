"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { useAuth } from '@/lib/ClientAuthProvider';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    console.log('Login: Попытка входа:', { email, password });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('Login: Ответ /api/auth/login:', res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.json();
        console.log('Login: Ошибка сервера:', errorData);
        throw new Error(errorData.error || 'Ошибка входа');
      }

      const data = await res.json();
      console.log('Login: Вход успешен:', data);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('username', data.username);
      await logout(); // Сбрасываем текущее состояние
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Login: Ошибка входа:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="mt-5">
      <h2>Вход</h2>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Введите email"
            disabled={submitting}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Пароль</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            disabled={submitting}
          />
        </Form.Group>
        {error && <Alert variant="danger">{error}</Alert>}
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? 'Вход...' : 'Войти'}
        </Button>
      </Form>
    </Container>
  );
}