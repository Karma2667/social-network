"use client";

import { useState, useEffect, useRef } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  readBy: string[];
}

interface ChatProps {
  recipientId: string;
  recipientUsername: string;
}

export default function Chat({ recipientId, recipientUsername }: ChatProps) {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId || !recipientId) {
      console.log('Chat: Пропуск загрузки сообщений:', { userId, recipientId });
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log('Chat: Загрузка сообщений для recipientId:', recipientId);
        const res = await fetch(`/api/messages?recipientId=${recipientId}`, {
          headers: { 'x-user-id': userId },
          cache: 'no-store',
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Chat: Ошибка API:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить сообщения');
        }
        const data = await res.json();
        console.log('Chat: Сообщения загружены:', data);
        setMessages(data);

        // Отмечаем непрочитанные сообщения
        const unreadMessages = data.filter((msg: Message) => !msg.isRead && msg.senderId !== userId);
        for (const msg of unreadMessages) {
          await fetch(`/api/messages?messageId=${msg._id}`, {
            method: 'PATCH',
            headers: { 'x-user-id': userId },
          });
        }
      } catch (err: any) {
        console.error('Chat: Ошибка загрузки сообщений:', err.message);
        setError(err.message);
      }
    };

    fetchMessages();
  }, [userId, recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !userId || !recipientId) {
      console.log('Chat: Пропуск отправки:', { messageInput, userId, recipientId });
      return;
    }

    try {
      setSending(true);
      console.log('Chat: Отправка сообщения для recipientId:', recipientId);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          recipientId,
          content: messageInput,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Chat: Ошибка API отправки:', errorData);
        throw new Error(errorData.error || 'Не удалось отправить сообщение');
      }
      const newMessage = await res.json();
      console.log('Chat: Сообщение отправлено:', newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput('');
      setSending(false);
    } catch (err: any) {
      console.error('Chat: Ошибка отправки:', err.message);
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="telegram-message-container flex-grow-1 overflow-auto p-3">
      {error && <div className="alert alert-danger">{error}</div>}
      {messages.map((msg) => (
        <div
          key={msg._id}
          className={`telegram-message ${msg.senderId === userId ? 'sent' : 'received'} mb-2`}
        >
          <div>{msg.content}</div>
          <div className="telegram-message-time text-muted">
            {new Date(msg.createdAt).toLocaleTimeString()}
            {msg.senderId === userId && (
              <span className={msg.isRead ? 'is-read' : ''}>
                {msg.isRead ? '✓✓' : '✓'}
              </span>
            )}
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