"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/ClientAuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Row, Col, Form, ListGroup, Button, FormControl } from 'react-bootstrap';
import Link from 'next/link';

function ChatArea({ chatUserId, currentUserId }: { chatUserId: string | null; currentUserId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!chatUserId) return;
    console.log('ChatArea: Загрузка сообщений для chatUserId:', chatUserId);
    fetch(`/api/messages?recipientId=${chatUserId}`, {
      headers: { 'x-user-id': currentUserId },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('ChatArea: Сообщения загружены:', data);
        setMessages(data);
      })
      .catch((err) => console.error('ChatArea: Ошибка загрузки сообщений:', err.message));
  }, [chatUserId, currentUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatUserId || !message.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({ recipientId: chatUserId, content: message }),
      });
      console.log('ChatArea: Ответ /api/messages:', res.status, res.statusText);
      if (!res.ok) throw new Error('Ошибка отправки сообщения');
      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      setMessage('');
    } catch (err: any) {
      console.error('ChatArea: Ошибка отправки:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!chatUserId) {
    return <div className="p-3">Выберите чат</div>;
  }

  return (
    <div className="p-3" style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`mb-2 ${msg.senderId === currentUserId ? 'text-end' : 'text-start'}`}
          >
            <span
              className={`p-2 rounded ${msg.senderId === currentUserId ? 'bg-primary text-white' : 'bg-light'}`}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <Form onSubmit={handleSendMessage}>
        <div className="d-flex">
          <FormControl
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите сообщение..."
            disabled={submitting}
          />
          <Button type="submit" disabled={submitting || !message.trim()} className="ms-2">
            {submitting ? '...' : 'Отправить'}
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default function ChatPage() {
  const { userId, isInitialized, username } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isDesktop, setIsDesktop] = useState(true);
  const selectedChatUserId = searchParams.get('chat');

  console.log('ChatPage: Инициализация, userId:', userId, 'isInitialized:', isInitialized, 'username:', username, 'selectedChatUserId:', selectedChatUserId);

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
      console.log('ChatPage: Проверка isDesktop:', desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      console.log('ChatPage: Ожидание инициализации');
      return;
    }
    if (!userId) {
      console.log('ChatPage: Нет userId, перенаправление на /login');
      router.replace('/login');
      return;
    }
    console.log('ChatPage: Загрузка чатов для userId:', userId);
    fetch(`/api/chats?search=${encodeURIComponent(search)}`, {
      headers: { 'x-user-id': userId },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('ChatPage: Чаты загружены:', data);
        setChats(data);
      })
      .catch((err) => console.error('ChatPage: Ошибка загрузки чатов:', err.message));
  }, [userId, isInitialized, search, router]);

  if (!isInitialized) {
    console.log('ChatPage: Ожидание инициализации');
    return <div>Загрузка...</div>;
  }

  if (!userId) {
    console.log('ChatPage: Нет userId, отображение пустого состояния');
    return null;
  }

  if (!isDesktop && selectedChatUserId) {
    return <ChatArea chatUserId={selectedChatUserId} currentUserId={userId} />;
  }

  return (
    <Container fluid className="mt-3">
      <Row>
        <Col md={4} className="border-end" style={{ backgroundColor: '#f8f9fa', height: 'calc(100vh - 56px)' }}>
          <div className="p-3">
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск @username"
              />
            </Form.Group>
            <ListGroup>
              {chats.map((chat) => (
                <ListGroup.Item
                  key={chat.user._id}
                  as={Link}
                  href={`/chat?chat=${chat.user._id}`}
                  action
                  active={selectedChatUserId === chat.user._id}
                >
                  @{chat.user.username} {chat.user.name && `(${chat.user.name})`}
                  <div className="small text-muted">{chat.lastMessage?.content || 'Нет сообщений'}</div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        </Col>
        {isDesktop && (
          <Col md={8}>
            <ChatArea chatUserId={selectedChatUserId} currentUserId={userId} />
          </Col>
        )}
      </Row>
    </Container>
  );
}