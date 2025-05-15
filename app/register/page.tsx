"use client";

import { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    console.log('Register: Попытка регистрации:', { username, email, password: password ? '[provided]' : '[missing]' });

    if (!username.trim() || !email.trim() || !password.trim()) {
      console.log('Register: Пустые поля');
      setError('Пожалуйста, заполните все поля');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password: password.trim() }),
      });
      console.log('Register: Ответ /api/auth/register:', res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.json();
        console.log('Register: Ошибка сервера:', errorData);
        throw new Error(errorData.error || 'Ошибка регистрации');
      }

      const data = await res.json();
      console.log('Register: Регистрация успешна:', { userId: data.userId, token: data.token, username: data.username });

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('username', data.username);
      router.push('/chat');
    } catch (err: any) {
      console.error('Register: Ошибка регистрации:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center vh-100">
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <h2 className="text-center mb-4">Регистрация</h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Имя пользователя</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              disabled={submitting}
            />
          </Form.Group>
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
            {submitting ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
        </Form>
        <div className="text-center mt-3">
          <p>Уже есть аккаунт? <Link href="/login">Войти</Link></p>
        </div>
      </div>
    </Container>
  );
}