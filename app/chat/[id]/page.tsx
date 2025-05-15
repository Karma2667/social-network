"use client";

import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Image } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import Chat from '@/app/Components/Chat';
import { useParams, useRouter } from 'next/navigation';

interface User {
  _id: string;
  username: string;
  avatar: string;
  online: boolean;
}

export default function ChatPage() {
  const { userId, isInitialized } = useAuth();
  const { id } = useParams();
  const router = useRouter();
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
          cache: 'no-store',
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
    router.replace('/login');
    return null;
  }

  return (
    <Container fluid className="p-0 vh-100">
      <Row className="h-100 m-0">
        <Col xs={12} className="telegram-chat active p-0">
          <div className="telegram-chat-header d-flex align-items-center p-3 border-bottom">
            <Button
              variant="link"
              className="me-2 p-0"
              onClick={() => router.push('/chat')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"
                />
              </svg>
            </Button>
            {recipient && (
              <>
                <Image
                  src={recipient.avatar || '/default-avatar.png'}
                  alt={recipient.username}
                  roundedCircle
                  className="telegram-user-avatar"
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