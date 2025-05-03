'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button, ListGroup, Alert } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import { useParams } from 'next/navigation';

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

interface Recipient {
  _id: string;
  username: string;
  avatar: string;
}

export default function Chat() {
  const { userId, isInitialized } = useAuth();
  const params = useParams();
  const recipientId = params.id as string;
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized || !userId || !recipientId) {
      console.log('Chat: Ожидание инициализации, userId или recipientId:', { userId, recipientId });
      return;
    }

    const fetchRecipient = async () => {
      try {
        console.log('Chat: Получение пользователя с ID:', recipientId);
        const res = await fetch('/api/users/profile', {
          headers: { 'x-user-id': recipientId },
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Chat: Ошибка API при загрузке пользователя:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить пользователя');
        }
        const data = await res.json();
        console.log('Chat: Пользователь загружен:', data);
        setRecipient(data);
      } catch (err: any) {
        console.error('Chat: Ошибка загрузки пользователя:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    const fetchMessages = async () => {
      try {
        console.log('Chat: Загрузка сообщений для:', { userId, recipientId });
        const res = await fetch('/api/messages', {
          headers: {
            'x-user-id': userId,
            'x-recipient-id': recipientId,
          },
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Chat: Ошибка API при загрузке сообщений:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить сообщения');
        }
        const data = await res.json();
        console.log('Chat: Сообщения загружены:', data);
        setMessages(data);
        setLoading(false);
      } catch (err: any) {
        console.error('Chat: Ошибка загрузки сообщений:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchRecipient();
    fetchMessages();
  }, [isInitialized, userId, recipientId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !recipientId || !newMessage.trim()) {
      console.error('Chat: Отсутствуют userId, recipientId или сообщение');
      setError('Введите сообщение');
      return;
    }

    try {
      console.log('Chat: Отправка сообщения:', { userId, recipientId, content: newMessage });
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ recipientId, content: newMessage }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Chat: Ошибка API при отправке сообщения:', errorData);
        throw new Error(errorData.error || 'Не удалось отправить сообщение');
      }
      const message = await res.json();
      console.log('Chat: Сообщение отправлено:', message);
      setMessages([...messages, message]);
      setNewMessage('');
    } catch (err: any) {
      console.error('Chat: Ошибка отправки сообщения:', err.message);
      setError(err.message);
    }
  };

  if (!isInitialized || loading) {
    console.log('Chat: Рендеринг: Ожидание инициализации или загрузки');
    return <div>Загрузка...</div>;
  }

  if (!userId || !recipientId) {
    console.log('Chat: Рендеринг: Нет userId или recipientId');
    setError('Не указан получатель или пользователь');
    return <Alert variant="danger">Не указан получатель или пользователь</Alert>;
  }

  return (
    <Container className="my-4">
      <h2>Чат с {recipient?.username || 'пользователем'}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <ListGroup className="mb-3">
        {messages.length === 0 ? (
          <p>Нет сообщений</p>
        ) : (
          messages.map((msg) => (
            <ListGroup.Item
              key={msg._id}
              className={msg.senderId === userId ? 'text-end' : 'text-start'}
            >
              <strong>{msg.senderId === userId ? 'Вы' : recipient?.username}:</strong> {msg.content}
              <br />
              <small>{new Date(msg.createdAt).toLocaleString()}</small>
            </ListGroup.Item>
          ))
        )}
      </ListGroup>
      <Form onSubmit={handleSendMessage}>
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Введите сообщение"
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          Отправить
        </Button>
      </Form>
    </Container>
  );
}