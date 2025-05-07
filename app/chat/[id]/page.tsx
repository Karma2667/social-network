'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import Chat from '@/app/Components/Chat';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface User {
  _id: string;
  username: string;
  avatar: string;
  online: boolean;
}

export default function ChatPage() {
  const { userId, isInitialized } = useAuth();
  const { id } = useParams();
  const [recipient, setRecipient] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized || !userId || !id) {
      console.log('ChatPage: Ожидание инициализации, userId или id:', { userId, id });
      return;
    }

    const fetchRecipient = async () => {
      try {
        setLoading(true);
        console.log('ChatPage: Загрузка получателя для id:', id);
        const res = await fetch(`/api/users/${id}`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('ChatPage: Ошибка API:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить пользователя');
        }
        const data = await res.json();
        console.log('ChatPage: Получатель загружен:', data);
        setRecipient(data);
        setLoading(false);
      } catch (err: any) {
        console.error('ChatPage: Ошибка загрузки получателя:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchRecipient();
  }, [isInitialized, userId, id]);

  if (!isInitialized) {
    console.log('ChatPage: Рендеринг: Ожидание инициализации');
    return <div className="d-flex align-items-center justify-content-center vh-100">Загрузка...</div>;
  }

  if (!userId) {
    console.log('ChatPage: Рендеринг: Нет userId, перенаправление на /login');
    window.location.replace('/login');
    return null;
  }

  return (
    <Container fluid className="p-0 vh-100">
      <Row className="h-100 m-0">
        <Col xs={12} className="telegram-chat active p-0">
          <div className="telegram-chat-header">
            <Link href="/chat" className="d-md-none me-2">
              <Button variant="outline-primary" size="sm">
                Назад
              </Button>
            </Link>
            {recipient && (
              <>
                <img
                  src={recipient.avatar || '/default-avatar.png'}
                  alt={recipient.username}
                />
                <div>
                  <div className="fw-bold">{recipient.username}</div>
                  <div className="text-muted small">
                    {recipient.online ? 'Онлайн' : 'Офлайн'}
                  </div>
                </div>
              </>
            )}
          </div>
          {error && <div className="alert alert-danger m-3">{error}</div>}
          {loading ? (
            <div className="d-flex align-items-center justify-content-center h-100">
              Загрузка...
            </div>
          ) : recipient ? (
            <Chat recipientId={id as string} recipientUsername={recipient.username} />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100">
              Пользователь не найден
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}