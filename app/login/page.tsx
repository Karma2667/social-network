"use client";

import { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    console.log('Login: Попытка входа:', { email, password: password ? '[provided]' : '[missing]' });

    if (!email.trim() || !password.trim()) {
      console.log('Login: Пустой email или password');
      setError('Пожалуйста, заполните все поля');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      console.log('Login: Ответ /api/auth/login:', res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.json();
        console.log('Login: Ошибка сервера:', errorData);
        throw new Error(errorData.error || 'Ошибка входа');
      }

      const data = await res.json();
      console.log('Login: Вход успешен:', { userId: data.userId, token: data.token, username: data.username });

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('username', data.username);
      router.push('/chat');
    } catch (err: any) {
      console.error('Login: Ошибка входа:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center vh-100">
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <h2 className="text-center mb-4">Вход</h2>
        {error && <Alert variant="danger">{error}</Alert>}
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
          <Button variant="primary" type="submit" className="w-100" disabled={submitting}>
            {submitting ? 'Вход...' : 'Войти'}
          </Button>
        </Form>
        <div className="text-center mt-3">
          <p>Нет аккаунта? <Link href="/register">Зарегистрироваться</Link></p>
        </div>
      </div>
    </Container>
  );
}