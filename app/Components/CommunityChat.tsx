'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';

interface Message {
  _id: string;
  senderId: string;
  communityId: string;
  content: string;
  createdAt: string;
}

interface CommunityChatProps {
  communityId: string;
  communityName: string;
}

export default function CommunityChat({ communityId, communityName }: CommunityChatProps) {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Загрузка сообщений
  useEffect(() => {
    if (!userId || !communityId) {
      console.log('CommunityChat: Пропуск загрузки сообщений, отсутствует userId или communityId:', { userId, communityId });
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log('CommunityChat: Загрузка сообщений для userId:', userId, 'communityId:', communityId);
        const res = await fetch(`/api/community/messages?communityId=${communityId}`, {
          headers: { 'x-user-id': userId },
        });
        const contentType = res.headers.get('Content-Type') || 'unknown';
        console.log('CommunityChat: Content-Type ответа:', contentType);
        const rawText = await res.text();
        console.log('CommunityChat: Сырой ответ сервера:', rawText);
        if (!res.ok) {
          let errorData;
          try {
            errorData = JSON.parse(rawText);
          } catch {
            errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
          }
          console.error('CommunityChat: Ошибка API сообщений:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить сообщения');
        }
        if (!rawText) {
          console.log('CommunityChat: Пустой ответ сервера, устанавливаем пустой массив сообщений');
          setMessages([]);
          return;
        }
        if (!contentType.includes('application/json')) {
          console.error('CommunityChat: Ответ не является JSON:', { contentType, rawText });
          throw new Error('Сервер вернул не-JSON ответ');
        }
        const data = JSON.parse(rawText);
        console.log('CommunityChat: Сообщения загружены:', data);
        setMessages(data);
      } catch (err: any) {
        console.error('CommunityChat: Ошибка загрузки сообщений:', err.message);
        setError(err.message);
      }
    };

    fetchMessages();
  }, [userId, communityId]);

  // Автоскролл
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !userId) {
      console.log('CommunityChat: Пропуск отправки сообщения, отсутствует messageInput или userId:', { messageInput, userId });
      return;
    }

    try {
      setSending(true);
      console.log('CommunityChat: Отправка сообщения для communityId:', communityId, 'userId:', userId);
      const res = await fetch('/api/community/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          communityId,
          content: messageInput,
        }),
      });
      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          const rawText = await res.text();
          console.error('CommunityChat: Сырой ответ сервера:', rawText);
          errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
        }
        console.error('CommunityChat: Ошибка API отправки сообщения:', errorData);
        throw new Error(errorData.error || 'Не удалось отправить сообщение');
      }
      const newMessage = await res.json();
      console.log('CommunityChat: Сообщение отправлено:', newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput('');
      setSending(false);
    } catch (err: any) {
      console.error('CommunityChat: Ошибка отправки сообщения:', err.message);
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="telegram-message-container flex-grow-1">
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
      <div className="p-3 border-top d-flex">
        <Form.Control
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Напишите сообщение..."
          className="telegram-message-input me-2"
          disabled={sending}
        />
        <Button
          className="telegram-send-button"
          onClick={handleSendMessage}
          disabled={sending || !messageInput.trim()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="white"
            viewBox="0 0 16 16"
          >
            <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm4.452-7.868L.756 7.848l4.921 3.034z" />
          </svg>
        </Button>
      </div>
    </div>
  );
}