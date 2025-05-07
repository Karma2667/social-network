'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

interface ChatProps {
  recipientId: string;
  recipientUsername: string;
}

export default function Chat({ recipientId, recipientUsername }: ChatProps) {
  const { userId, isInitialized } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInitialized || !userId || !recipientId) {
      console.log('Chat: Ожидание инициализации, userId или recipientId:', { userId, recipientId });
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        console.log('Chat: Загрузка сообщений для userId:', userId, 'recipientId:', recipientId);
        const res = await fetch(`/api/messages?recipientId=${recipientId}`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Chat: Ошибка API:', errorData);
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

    fetchMessages();
  }, [isInitialized, userId, recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      console.error('Chat: Пустое сообщение');
      setError('Сообщение не может быть пустым');
      return;
    }

    try {
      console.log('Chat: Отправка сообщения:', { content: newMessage, recipientId });
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId!,
        },
        body: JSON.stringify({ recipientId, content: newMessage }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Chat: Ошибка API:', errorData);
        throw new Error(errorData.error || 'Не удалось отправить сообщение');
      }

      const data = await res.json();
      console.log('Chat: Сообщение отправлено:', data);
      setMessages([...messages, data]);
      setNewMessage('');
      setError(null);
    } catch (err: any) {
      console.error('Chat: Ошибка отправки сообщения:', err.message);
      setError(err.message);
    }
  };

  if (!isInitialized || loading) {
    console.log('Chat: Рендеринг: Ожидание инициализации или загрузки');
    return <div className="d-flex align-items-center justify-content-center h-100">Загрузка...</div>;
  }

  if (!userId) {
    console.log('Chat: Рендеринг: Нет userId, перенаправление на /login');
    window.location.replace('/login');
    return null;
  }

  return (
    <div className="telegram-chat active d-flex flex-column h-100">
      <div className="telegram-message-container">
        {error && <div className="alert alert-danger m-3">{error}</div>}
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`telegram-message ${msg.senderId === userId ? 'sent' : 'received'}`}
          >
            <div>{msg.content}</div>
            <div className="telegram-message-time">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <Form onSubmit={handleSendMessage} className="p-3 border-top">
        <div className="d-flex align-items-center">
          <Form.Control
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Сообщение ${recipientUsername}...`}
            className="telegram-message-input me-2"
          />
          <Button type="submit" className="telegram-send-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="white"
              viewBox="0 0 24 24"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </Button>
        </div>
      </Form>
    </div>
  );
}