'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { Container, Row, Col, Form, ListGroup, Alert, Button, Image } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import AppNavbar from '@/app/Components/Navbar';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  username: string;
  avatar: string;
}

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

function ChatListContent() {
  const { userId, isInitialized } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Проверка ширины экрана
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mediaQuery.matches);

    const handleResize = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  // Перенаправление на /login, если нет userId
  useEffect(() => {
    if (isInitialized && !userId) {
      console.log('ChatList: Нет userId, перенаправление на /login');
      router.replace('/login');
    }
  }, [isInitialized, userId, router]);

  // Функция для повторных попыток запроса с подробным логированием
  const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 3, delay: number = 1000): Promise<Response> => {
    console.log('ChatList: Запрос:', {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
    });

    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        console.log('ChatList: Ответ:', {
          url,
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
        });
        return res;
      } catch (err) {
        if (i < retries - 1) {
          console.log(`ChatList: Повторная попытка (${i + 1}/${retries}) для ${url}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('ChatList: Ошибка запроса:', err);
          throw err;
        }
      }
    }
    throw new Error('Не удалось выполнить запрос');
  };

  // Поиск пользователей
  useEffect(() => {
    if (!isInitialized || !userId || !search.trim()) {
      console.log('ChatList: Ожидание инициализации, userId или поискового запроса:', { userId, search });
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log('ChatList: Поиск пользователей для userId:', userId, 'с запросом:', search);
        const res = await fetchWithRetry(`/api/users?search=${encodeURIComponent(search)}`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) {
          let errorData;
          try {
            errorData = await res.json();
          } catch {
            errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
          }
          console.error('ChatList: Ошибка API:', errorData);
          throw new Error(errorData.error || 'Не удалось найти пользователей');
        }
        const data = await res.json();
        console.log('ChatList: Пользователи найдены:', data);
        setUsers(data);
        setLoading(false);
      } catch (err: any) {
        console.error('ChatList: Ошибка поиска пользователей:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [isInitialized, userId, search]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Загрузка сообщений
  useEffect(() => {
    if (!selectedChat || !userId) {
      console.log('ChatList: Пропуск загрузки сообщений, отсутствует selectedChat или userId:', { selectedChat, userId });
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log('ChatList: Загрузка сообщений для userId:', userId, 'recipientId:', selectedChat._id);
        const res = await fetchWithRetry('/api/messages', {
          headers: {
            'x-user-id': userId,
            'x-recipient-id': selectedChat._id,
          },
        });
        const contentType = res.headers.get('Content-Type') || 'unknown';
        console.log('ChatList: Content-Type ответа:', contentType);
        const rawText = await res.text();
        console.log('ChatList: Сырой ответ сервера:', rawText);
        if (!res.ok) {
          let errorData;
          try {
            errorData = JSON.parse(rawText);
          } catch {
            errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
          }
          console.error('ChatList: Ошибка API сообщений:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить сообщения');
        }
        if (!rawText) {
          console.log('ChatList: Пустой ответ сервера, устанавливаем пустой массив сообщений');
          setMessages([]);
          return;
        }
        if (!contentType.includes('application/json')) {
          console.error('ChatList: Ответ не является JSON:', { contentType, rawText });
          throw new Error('Сервер вернул не-JSON ответ');
        }
        let data;
        try {
          data = JSON.parse(rawText);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
          console.error('ChatList: Ошибка парсинга JSON:', errorMessage, 'Сырой ответ:', rawText);
          throw new Error('Невалидный JSON в ответе сервера');
        }
        console.log('ChatList: Сообщения загружены:', data);
        setMessages(data);
      } catch (err: any) {
        console.error('ChatList: Ошибка загрузки сообщений:', err.message);
        setError(err.message);
      }
    };

    fetchMessages();
  }, [selectedChat, userId]);

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!selectedChat || !messageInput.trim() || !userId) {
      console.log('ChatList: Пропуск отправки сообщения, отсутствует selectedChat, messageInput или userId:', { selectedChat, messageInput, userId });
      return;
    }

    try {
      setSending(true);
      console.log('ChatList: Отправка сообщения для recipientId:', selectedChat._id, 'userId:', userId);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          recipientId: selectedChat._id,
          content: messageInput,
        }),
      });
      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          const rawText = await res.text();
          console.error('ChatList: Сырой ответ сервера:', rawText);
          errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
        }
        console.error('ChatList: Ошибка API отправки сообщения:', errorData);
        throw new Error(errorData.error || 'Не удалось отправить сообщение');
      }
      const newMessage = await res.json();
      console.log('ChatList: Сообщение отправлено:', newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput('');
      setSending(false);
    } catch (err: any) {
      console.error('ChatList: Ошибка отправки сообщения:', err.message);
      setError(err.message);
      setSending(false);
    }
  };

  // Обработка клика на пользователя
  const handleUserClick = (user: User) => {
    console.log('ChatList: Клик на пользователя:', user._id, 'isDesktop:', isDesktop);
    if (isDesktop) {
      setSelectedChat(user);
    } else {
      router.push(`/chat/${user._id}`);
    }
  };

  if (!isInitialized) {
    console.log('ChatList: Рендеринг: Ожидание инициализации');
    return (
      <>
        <AppNavbar />
        <div className="d-flex align-items-center justify-content-center vh-100">Загрузка...</div>
      </>
    );
  }

  return (
    <>
      <AppNavbar />
      <Container fluid className="p-0" style={{ height: 'calc(100vh - 56px)' }}>
        <Row className="h-100 m-0">
          <Col md={4} className="telegram-sidebar p-0">
            <div className="p-3 border-bottom">
              <Form.Control
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск пользователей..."
                className="telegram-search"
              />
            </div>
            <div className="overflow-auto">
              {error && <Alert variant="danger" className="m-3">{error}</Alert>}
              {loading ? (
                <div className="p-3">Загрузка...</div>
              ) : users.length === 0 && search.trim() ? (
                <div className="p-3 text-muted">Пользователи не найдены</div>
              ) : users.length === 0 ? (
                <div className="p-3 text-muted">Введите имя для поиска</div>
              ) : (
                <ListGroup variant="flush">
                  {users.map((user) => (
                    <ListGroup.Item
                      key={user._id}
                      action
                      onClick={() => handleUserClick(user)}
                      className={`telegram-user-item ${selectedChat?._id === user._id && isDesktop ? 'active' : ''}`}
                    >
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.username}
                        className="telegram-user-avatar"
                      />
                      <span className="telegram-user-name">{user.username}</span>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          </Col>
          <Col md={8} className="telegram-chat d-flex flex-column">
            {selectedChat && isDesktop ? (
              <>
                <div className="telegram-chat-header">
                  <Image
                    src={selectedChat.avatar || '/default-avatar.png'}
                    alt={selectedChat.username}
                    roundedCircle
                  />
                  <div className="fw-bold">{selectedChat.username}</div>
                </div>
                <div className="telegram-message-container">
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
              </>
            ) : (
              <div className="d-flex align-items-center justify-content-center flex-grow-1 text-muted">
                Выберите чат для начала общения
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default function ChatList() {
  return (
    <Suspense fallback={<div className="d-flex align-items-center justify-content-center vh-100">Загрузка...</div>}>
      <ChatListContent />
    </Suspense>
  );
}