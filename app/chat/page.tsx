"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Container, Row, Col, Form, ListGroup, Button, FormControl, Alert, Image } from "react-bootstrap";
import Link from "next/link";
import Chat from "@/app/Components/Chat";

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  readBy: string[];
}

interface Chat {
  user: {
    _id: string;
    username: string;
    name?: string;
    interests?: string[];
    avatar?: string; // Добавляем поле avatar в интерфейс
  };
  lastMessage?: Message;
  avatar?: string; // Уберем фиксированный дефолт, будем брать из user.avatar
}

function ChatArea({ chatUserId, currentUserId }: { chatUserId: string | null; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (retryCount = 3) => {
    if (!chatUserId) return;
    console.log("ChatArea: Загрузка сообщений для chatUserId:", chatUserId);
    try {
      const res = await fetch(`/api/messages?recipientId=${encodeURIComponent(chatUserId)}`, {
        headers: {
          "x-user-id": currentUserId,
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ошибка ${res.status}: ${res.statusText}`);
      const data = await res.json();
      console.log("ChatArea: Сообщения загружены:", data);
      setMessages(data);
      setError(null);
    } catch (err: any) {
      console.error("ChatArea: Ошибка загрузки сообщений:", err.message);
      if (retryCount > 0) {
        console.log(`ChatArea: Повторная попытка (${retryCount} осталось)`);
        setTimeout(() => fetchMessages(retryCount - 1), 1000);
      } else {
        setError("Не удалось загрузить сообщения. Проверьте подключение к сети.");
      }
    }
  }, [chatUserId, currentUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatUserId || !message.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUserId,
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify({ recipientId: chatUserId, content: message }),
      });
      console.log("ChatArea: Ответ /api/messages:", res.status, res.statusText);
      if (!res.ok) throw new Error("Ошибка отправки сообщения");
      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
    } catch (err: any) {
      console.error("ChatArea: Ошибка отправки:", err.message);
      setError("Не удалось отправить сообщение.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!chatUserId) {
    return <div className="p-3 telegram-placeholder">Выберите чат</div>;
  }

  return (
    <div className="telegram-chat-container p-3" style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#f0f2f5" }}>
      {error && <Alert variant="danger" className="telegram-alert">{error}</Alert>}
      <div className="telegram-messages" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100% - 80px)" }}>
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`telegram-message ${msg.senderId === currentUserId ? "sent" : "received"} mb-2`}
            style={{
              display: "flex",
              flexDirection: msg.senderId === currentUserId ? "row-reverse" : "row",
              alignItems: "flex-end",
            }}
          >
            <div
              className="telegram-message-bubble p-2 rounded"
              style={{
                backgroundColor: msg.senderId === currentUserId ? "#0088cc" : "#e9ecef",
                color: msg.senderId === currentUserId ? "#fff" : "#000",
                maxWidth: "70%",
                borderRadius: "10px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
              }}
            >
              {msg.content}
            </div>
            <div className="telegram-message-time text-muted small ms-2" style={{ marginBottom: "2px" }}>
              {new Date(msg.createdAt).toLocaleTimeString()}
              {msg.senderId === currentUserId && (
                <span className={msg.isRead ? "is-read" : ""} style={{ marginLeft: "4px" }}>
                  {msg.isRead ? "✓✓" : "✓"}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <Form onSubmit={handleSendMessage} className="telegram-input-area mt-3">
        <div className="d-flex align-items-center">
          <FormControl
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите сообщение..."
            className="telegram-input flex-grow-1 me-2"
            disabled={submitting}
            style={{
              borderRadius: "20px",
              border: "1px solid #ced4da",
              padding: "8px 12px",
              fontSize: "14px",
            }}
          />
          <Button
            type="submit"
            disabled={submitting || !message.trim()}
            className="telegram-send-button"
            style={{
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              backgroundColor: "#0088cc",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#006bb3")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0088cc")}
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
      </Form>
    </div>
  );
}

export default function ChatPage() {
  const { userId, isInitialized, username } = useAuth();
  const router = useRouter();
  const params = useParams();
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id; // Приводим к string | undefined
  const selectedChatUserId: string | null = chatId || null; // Явно приводим к string | null
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [isDesktop, setIsDesktop] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchChatsRef = useRef(false);
  const lastFetchTime = useRef(0);
  const [isServerDown, setIsServerDown] = useState(false); // Флаг состояния сервера
  const [avatarLoadAttempts, setAvatarLoadAttempts] = useState<{ [key: string]: number }>({}); // Ограничение попыток загрузки аватаров

  console.log(
    "ChatPage: Инициализация, userId:",
    userId,
    "isInitialized:",
    isInitialized,
    "username:",
    username,
    "selectedChatUserId:",
    selectedChatUserId
  );

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
      console.log("ChatPage: Проверка isDesktop:", desktop);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const fetchChats = useCallback(async (retryCount = 3) => {
    if (!userId || !isInitialized || fetchChatsRef.current || isServerDown) return;
    const now = Date.now();
    if (now - lastFetchTime.current < 1000) return; // Debounce 1 second
    fetchChatsRef.current = true;
    lastFetchTime.current = now;
    console.log("ChatPage: Загрузка чатов для userId:", userId);
    try {
      const res = await fetch(`/api/chats?search=${encodeURIComponent(search)}`, {
        headers: {
          "x-user-id": userId,
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ошибка ${res.status}: ${res.statusText}`);
      const data = await res.json();
      // Обновляем chats, используя avatar из user.avatar
      const updatedChats = data.map((chat: any) => ({
        user: {
          ...chat.user,
          avatar: chat.user.avatar || "/default-chat-avatar.png", // Фallback на дефолт, если avatar отсутствует
        },
        lastMessage: chat.lastMessage,
      }));
      console.log("ChatPage: Чаты загружены с данными:", JSON.stringify(updatedChats, null, 2));
      setChats(updatedChats);
      setError(null);
      setIsServerDown(false); // Сброс флага при успешном запросе
    } catch (err: any) {
      console.error("ChatPage: Ошибка загрузки чатов:", err.message);
      if (err.message.includes("NetworkError")) {
        setIsServerDown(true);
        setError("Сервер недоступен. Проверьте подключение.");
      }
      if (retryCount > 0) {
        console.log(`ChatPage: Повторная попытка (${retryCount} осталось)`);
        setTimeout(() => {
          fetchChatsRef.current = false;
          fetchChats(retryCount - 1);
        }, 1000);
      } else {
        setError("Не удалось загрузить чаты после нескольких попыток.");
      }
    } finally {
      fetchChatsRef.current = false;
    }
  }, [userId, isInitialized, search, isServerDown]);

  useEffect(() => {
    if (!isInitialized) {
      console.log("ChatPage: Ожидание инициализации");
      return;
    }
    if (!userId) {
      console.log("ChatPage: Нет userId, перенаправление на /login");
      router.replace("/login");
      return;
    }
    fetchChats();
    const intervalId = setInterval(() => {
      if (!fetchChatsRef.current && !isServerDown) fetchChats(); // Останавливаем при проблемах с сервером
    }, 5000); // Обновление каждые 5 сек
    return () => clearInterval(intervalId);
  }, [userId, isInitialized, router, fetchChats, isServerDown]);

  if (!isInitialized) {
    console.log("ChatPage: Ожидание инициализации");
    return <div>Загрузка...</div>;
  }

  if (!userId) {
    console.log("ChatPage: Нет userId, отображение пустого состояния");
    return null;
  }

  if (!isDesktop && selectedChatUserId) {
    return <ChatArea chatUserId={selectedChatUserId} currentUserId={userId} />;
  }

  return (
    <Container fluid className="telegram-chat-page" style={{ backgroundColor: "#f0f2f5", height: "100vh", overflow: "hidden", position: "relative", minHeight: "100vh" }}>
      {error && <Alert variant="danger" className="telegram-alert">{error}</Alert>}
      <Row style={{ height: "100%", overflow: "hidden" }}>
        <Col md={4} className="border-end telegram-chat-list" style={{ backgroundColor: "#fff", height: "100%", overflowY: "auto" }}>
          <div className="p-3">
            <Form.Group className="mb-3">
              <FormControl
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск @username"
                className="telegram-search"
                style={{
                  borderRadius: "20px",
                  border: "1px solid #ced4da",
                  padding: "8px 12px",
                  fontSize: "14px",
                }}
              />
            </Form.Group>
            <ListGroup className="telegram-chat-list-group">
              {chats.length === 0 && !error && <ListGroup.Item className="telegram-placeholder">Нет чатов</ListGroup.Item>}
              {chats.map((chat) => {
                const username = chat.user.username;
                const attempts = avatarLoadAttempts[username] || 0;
                return (
                  <ListGroup.Item
                    key={chat.user._id}
                    as={Link}
                    href={`/chat/${chat.user._id}`} // Динамический маршрут
                    action
                    active={selectedChatUserId === chat.user._id}
                    className="telegram-chat-item"
                    style={{
                      borderRadius: "8px",
                      marginBottom: "4px",
                      transition: "background-color 0.3s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e9ecef")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedChatUserId === chat.user._id ? "#e9ecef" : "#fff")}
                  >
                    <div className="d-flex align-items-center">
                      <div
                        className="telegram-avatar me-2"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: chat.user.avatar ? "transparent" : "#ddd",
                        }}
                      >
                        {chat.user.avatar && attempts < 3 ? (
                          <Image
                            src={chat.user.avatar.startsWith("http") ? chat.user.avatar : `http://localhost:3000${chat.user.avatar}`}
                            alt={`${chat.user.username}'s chat avatar`}
                            fluid
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              console.log(`Ошибка загрузки аватара чата для ${chat.user.username}: ${chat.user.avatar}`);
                              setAvatarLoadAttempts((prev) => ({
                                ...prev,
                                [username]: (prev[username] || 0) + 1,
                              }));
                              if (attempts < 2) {
                                (e.target as HTMLImageElement).src = "/default-chat-avatar.png"; // Фallback на дефолт
                              } else {
                                (e.target as HTMLImageElement).src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="; // Пустая заглушка
                              }
                            }}
                            onLoad={() => console.log(`Аватар для ${chat.user.username} загружен: ${chat.user.avatar}`)}
                          />
                        ) : (
                          <span style={{ fontSize: "18px", color: "#666" }}>
                            {chat.user.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        @{chat.user.username} {chat.user.name && `(${chat.user.name})`}
                        <div className="small text-muted">{chat.lastMessage?.content || "Нет сообщений"}</div>
                      </div>
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </div>
        </Col>
        {isDesktop && (
          <Col md={8} style={{ height: "100%", overflowY: "auto" }}>
            <ChatArea chatUserId={selectedChatUserId} currentUserId={userId} />
          </Col>
        )}
      </Row>
    </Container>
  );
}