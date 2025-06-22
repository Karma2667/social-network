"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/app/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import {
  Container,
  Row,
  Col,
  Form,
  ListGroup,
  Button,
  FormControl,
  Alert,
  Image,
  Modal,
  Badge,
  ProgressBar,
} from "react-bootstrap";
import Link from "next/link";
import ReactionPicker from "@/app/Components/ReactionPicker";

interface Reaction {
  emoji: string;
  users: string[];
}

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  encryptedContent: string;
  createdAt: string;
  isRead: boolean;
  readBy: string[];
  isEditing?: boolean;
  reactions?: Reaction[];
  replyTo?: string;
}

interface Chat {
  user: {
    _id: string;
    username: string;
    name?: string;
    interests?: string[];
    avatar?: string;
  };
  lastMessage?: Message;
}

function ChatArea({ chatUserId, currentUserId, chatUsername }: { chatUserId: string | null; currentUserId: string; chatUsername: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [displayMessage, setDisplayMessage] = useState(""); // Для отображения в поле ввода
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showEncryptionAnim, setShowEncryptionAnim] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Генерация случайных символов для имитации шифрования
  const generateRandomChars = (length: number) => {
    const chars = "#$%^&*()_+-=[]{}|;:,.<>?~";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

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
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`HTTP ошибка ${res.status}: ${errorData.error || res.statusText}`);
      }
      const data: Message[] = await res.json();
      console.log("ChatArea: Сообщения загружены:", data);
      setMessages(data);
      setError(null);

      const unreadMessages = data.filter((msg) => !msg.isRead && msg.senderId !== currentUserId);
      if (unreadMessages.length > 0) {
        console.log("ChatArea: Отмечаем как прочитанные сообщения:", unreadMessages.length);
        await Promise.all(
          unreadMessages.map((msg) =>
            fetch(`/api/messages?messageId=${msg._id}`, {
              method: "PATCH",
              headers: {
                "x-user-id": currentUserId,
                "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
              },
            })
          )
        );
      }
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

    // Имитация шифрования в поле ввода
    setDisplayMessage(generateRandomChars(message.length));
    await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5 секунды

    try {
      const encryptedContent = btoa(unescape(encodeURIComponent(message)));
      console.log("ChatArea: Закодированное сообщение:", encryptedContent);

      // Запускаем анимацию прогресс-бара
      setShowEncryptionAnim(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setEncryptionProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShowEncryptionAnim(false);
            setEncryptionProgress(0);
          }, 1000); // Исчезает через 1 секунду после завершения
        }
      }, 100);

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUserId,
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify({
          recipientId: chatUserId,
          content: message,
          encryptedContent,
          replyTo,
        }),
      });
      console.log("ChatArea: Ответ /api/messages:", res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ошибка отправки сообщения");
      }
      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
      setDisplayMessage("");
      setReplyTo(null);
    } catch (err: any) {
      console.error("ChatArea: Ошибка отправки:", err.message);
      setError("Не удалось отправить сообщение.");
      setShowEncryptionAnim(false);
      setEncryptionProgress(0);
      setDisplayMessage(message); // Восстанавливаем текст при ошибке
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() || !messageId) return;
    setSubmitting(true);
    try {
      const encryptedContent = btoa(unescape(encodeURIComponent(editContent)));
      console.log("ChatArea: Закодированное отредактированное сообщение:", encryptedContent);

      setShowEncryptionAnim(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setEncryptionProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShowEncryptionAnim(false);
            setEncryptionProgress(0);
          }, 1000);
        }
      }, 100);

      const res = await fetch("/api/messages", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUserId,
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify({ messageId, content: editContent, encryptedContent }),
      });
      console.log("ChatArea: Ответ /api/messages (edit):", res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ошибка редактирования сообщения");
      }
      const updatedMessage = await res.json();
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, content: updatedMessage.content, encryptedContent: updatedMessage.encryptedContent, isEditing: false } : msg))
      );
      setEditMessageId(null);
      setEditContent("");
    } catch (err: any) {
      console.error("ChatArea: Ошибка редактирования:", err.message);
      setError("Не удалось отредактировать сообщение.");
      setShowEncryptionAnim(false);
      setEncryptionProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUserId,
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify({ messageId }),
      });
      console.log("ChatArea: Ответ /api/messages (delete):", res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ошибка удаления сообщения");
      }
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      setShowDeleteConfirm(null);
    } catch (err: any) {
      console.error("ChatArea: Ошибка удаления:", err.message);
      setError("Не удалось удалить сообщение.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUserId,
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify({ emoji }),
      });
      console.log("ChatArea: Ответ /api/messages/[id]/reactions:", res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ошибка добавления реакции");
      }
      const updatedMessage = await res.json();
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions: updatedMessage.reactions } : msg))
      );
      setShowReactionPicker(null);
    } catch (err: any) {
      console.error("ChatArea: Ошибка добавления реакции:", err.message);
      setError("Не удалось добавить реакцию.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!chatUserId) {
    return <div className="p-4 text-center text-muted">Выберите чат для общения</div>;
  }

  return (
    <div className="telegram-chat-container p-3" style={{ height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #f0f2f5 0%, #e6e9ed 100%)" }}>
      <div className="d-flex align-items-center mb-3">
        <h5 className="mb-0 me-2">Чат с @{chatUsername}</h5>
        <Badge bg="success" className="d-flex align-items-center rounded-pill">
          <span role="img" aria-label="lock" className="me-1">🔒</span> Зашифровано
        </Badge>
      </div>
      {showEncryptionAnim && (
        <div className="encryption-animation d-flex align-items-center justify-content-center mb-3" style={{ animation: "fadeOut 2s ease-in-out" }}>
          <span role="img" aria-label="lock" style={{ fontSize: "1.5rem", marginRight: "8px", animation: "pulse 1s infinite" }}>🔒</span>
          <div style={{ flex: 1, maxWidth: "200px" }}>
            <span className="text-success">Шифрование...</span>
            <ProgressBar now={encryptionProgress} variant="success" style={{ height: "6px", borderRadius: "3px" }} />
          </div>
        </div>
      )}
      {error && <Alert variant="danger" className="telegram-alert rounded-3">{error}</Alert>}
      <div className="telegram-messages" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100% - 120px)" }}>
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`telegram-message ${msg.senderId === currentUserId ? "sent" : "received"} mb-3`}
            style={{
              display: "flex",
              flexDirection: msg.senderId === currentUserId ? "row-reverse" : "row",
              alignItems: "flex-end",
              position: "relative",
            }}
          >
            {msg.isEditing ? (
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditMessage(msg._id);
                }}
                style={{ width: "70%", display: "flex", flexDirection: "column" }}
              >
                <FormControl
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                  className="rounded-3 shadow-sm"
                  style={{ border: "1px solid #ced4da", padding: "10px", marginBottom: "8px" }}
                />
                <div style={{ display: "flex", justifyContent: msg.senderId === currentUserId ? "flex-end" : "flex-start", gap: "8px" }}>
                  <Button
                    variant="primary"
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="rounded-3"
                    style={{ backgroundColor: "#0088cc", border: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#006bb3")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0088cc")}
                  >
                    Сохранить
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditMessageId(null);
                      setEditContent("");
                      setMessages((prev) =>
                        prev.map((m) => (m._id === msg._id ? { ...m, isEditing: false } : m))
                      );
                    }}
                    disabled={submitting}
                    className="rounded-3"
                  >
                    Отмена
                  </Button>
                </div>
              </Form>
            ) : (
              <>
                <div
                  className="telegram-message-bubble p-3 rounded-3 shadow-sm"
                  style={{
                    backgroundColor: msg.senderId === currentUserId ? "#0088cc" : "#ffffff",
                    color: msg.senderId === currentUserId ? "#fff" : "#000",
                    maxWidth: "70%",
                    borderRadius: "15px",
                    transition: "transform 0.2s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {msg.replyTo && (
                    <div className="reply-preview p-2 mb-2 rounded-3" style={{ backgroundColor: msg.senderId === currentUserId ? "rgba(255,255,255,0.2)" : "#f0f2f5", fontSize: "0.85rem", borderLeft: "3px solid #ced4da" }}>
                      Ответ на: {messages.find(m => m._id === msg.replyTo)?.content?.substring(0, 50) || "Сообщение удалено"}
                    </div>
                  )}
                  {msg.content}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="reactions mt-2 d-flex gap-2 flex-wrap">
                      {msg.reactions.map((reaction, index) => (
                        <Badge
                          key={index}
                          bg="light"
                          text="dark"
                          className="rounded-pill px-2 py-1"
                          style={{ cursor: "pointer" }}
                          onClick={() => handleAddReaction(msg._id, reaction.emoji)}
                        >
                          {reaction.emoji} {reaction.users.length}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: msg.senderId === currentUserId ? "flex-end" : "flex-start", gap: "4px", margin: "0 8px" }}>
                  <div className="telegram-message-time text-muted small" style={{ fontSize: "0.75rem" }}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                    {msg.senderId === currentUserId && (
                      <span className={msg.isRead ? "is-read" : ""} style={{ marginLeft: "4px" }}>
                        {msg.isRead ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                  <div className="message-actions d-flex gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowReactionPicker(msg._id)}
                      style={{ padding: "0", color: "#28a745", fontSize: "0.85rem" }}
                    >
                      Реакция
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setReplyTo(msg._id)}
                      style={{ padding: "0", color: "#17a2b8", fontSize: "0.85rem" }}
                    >
                      Ответить
                    </Button>
                    {msg.senderId === currentUserId && (
                      <>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setEditMessageId(msg._id);
                            setEditContent(msg.content);
                            setMessages((prev) =>
                              prev.map((m) => (m._id === msg._id ? { ...m, isEditing: true } : m))
                            );
                          }}
                          style={{ padding: "0", color: "#006bb3", fontSize: "0.85rem" }}
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(msg._id)}
                          style={{ padding: "0", color: "#dc3545", fontSize: "0.85rem" }}
                        >
                          Удалить
                        </Button>
                      </>
                    )}
                  </div>
                  {showReactionPicker === msg._id && (
                    <ReactionPicker
                      onSelect={(emoji) => handleAddReaction(msg._id, emoji)}
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: msg.senderId === currentUserId ? "auto" : "0",
                        right: msg.senderId === currentUserId ? "0" : "auto",
                        zIndex: 1000,
                        backgroundColor: "#fff",
                        border: "1px solid #dee2e6",
                        borderRadius: "8px",
                        padding: "8px",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <Form onSubmit={handleSendMessage} className="telegram-input-area mt-3">
        <div className="d-flex align-items-center">
          {replyTo && (
            <div className="reply-preview p-2 me-2 rounded-3" style={{ backgroundColor: "#f0f2f5", fontSize: "0.85rem", borderLeft: "3px solid #0088cc" }}>
              Ответ на: {messages.find(m => m._id === replyTo)?.content?.substring(0, 50) || "Сообщение удалено"}
              <Button
                variant="link"
                size="sm"
                onClick={() => setReplyTo(null)}
                style={{ padding: "0 5px", color: "#dc3545", fontSize: "0.8rem" }}
              >
                Отменить
              </Button>
            </div>
          )}
          <FormControl
            value={displayMessage}
            onChange={(e) => {
              setMessage(e.target.value);
              setDisplayMessage(e.target.value);
            }}
            placeholder="Введите сообщение..."
            className="telegram-input flex-grow-1 me-2 rounded-3 shadow-sm"
            disabled={submitting}
            style={{ border: "1px solid #ced4da", padding: "10px 15px", fontSize: "14px" }}
          />
          <Button
            type="submit"
            disabled={submitting || !message.trim()}
            className="telegram-send-button rounded-circle"
            style={{
              width: "45px",
              height: "45px",
              backgroundColor: "#0088cc",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.3s ease, transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#006bb3";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0088cc";
              e.currentTarget.style.transform = "scale(1)";
            }}
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
      <Modal show={!!showDeleteConfirm} onHide={() => setShowDeleteConfirm(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>Вы уверены, что хотите удалить это сообщение?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(null)}
            className="rounded-3"
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={() => showDeleteConfirm && handleDeleteMessage(showDeleteConfirm)}
            disabled={submitting}
            className="rounded-3"
          >
            Удалить
          </Button>
        </Modal.Footer>
      </Modal>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeOut {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  const { userId, isInitialized, username } = useAuth();
  const router = useRouter();
  const params = useParams();
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id;
  const selectedChatUserId: string | null = chatId || null;
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [isDesktop, setIsDesktop] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchChatsRef = useRef(false);
  const lastFetchTime = useRef(0);
  const [isServerDown, setIsServerDown] = useState(false);
  const [avatarLoadAttempts, setAvatarLoadAttempts] = useState<{ [key: string]: number }>({});

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
    if (now - lastFetchTime.current < 1000) return;
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
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`HTTP ошибка ${res.status}: ${errorData.error || res.statusText}`);
      }
      const data = await res.json();
      const updatedChats = data.map((chat: any) => ({
        user: {
          ...chat.user,
          avatar: chat.user.avatar || "/default-chat-avatar.png",
        },
        lastMessage: chat.lastMessage,
      }));
      console.log("ChatPage: Чаты загружены с данными:", JSON.stringify(updatedChats, null, 2));
      setChats(updatedChats);
      setError(null);
      setIsServerDown(false);
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
      if (!fetchChatsRef.current && !isServerDown) fetchChats();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [userId, isInitialized, router, fetchChats, isServerDown]);

  if (!isInitialized) {
    return <div className="p-4 text-center text-muted">Загрузка...</div>;
  }

  if (!userId) {
    console.log("ChatPage: Нет userId, отображение пустого состояния");
    return null;
  }

  if (!isDesktop && selectedChatUserId) {
    return <ChatArea chatUserId={selectedChatUserId} currentUserId={userId} chatUsername={chats.find(c => c.user._id === selectedChatUserId)?.user.username || ""} />;
  }

  return (
    <Container fluid className="telegram-chat-page" style={{ background: "linear-gradient(180deg, #f0f2f5 0%, #e6e9ed 100%)", height: "100vh", overflow: "hidden", position: "relative" }}>
      {error && <Alert variant="danger" className="telegram-alert rounded-3 m-3">{error}</Alert>}
      <Row style={{ height: "100%", overflow: "hidden" }}>
        <Col md={4} className="telegram-chat-list border-end" style={{ backgroundColor: "#fff", height: "100%", overflowY: "auto", boxShadow: "2px 0 8px rgba(0,0,0,0.1)" }}>
          <div className="p-3">
            <Form.Group className="mb-3">
              <FormControl
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск @username"
                className="telegram-search rounded-3 shadow-sm"
                style={{ border: "1px solid #ced4da", padding: "10px 15px", fontSize: "14px", transition: "border-color 0.3s ease" }}
                onFocus={(e) => (e.target.style.borderColor = "#0088cc")}
                onBlur={(e) => (e.target.style.borderColor = "#ced4da")}
              />
            </Form.Group>
            <ListGroup className="telegram-chat-list-group">
              {chats.length === 0 && !error && <ListGroup.Item className="telegram-placeholder text-muted">Нет чатов</ListGroup.Item>}
              {chats.map((chat) => {
                const username = chat.user.username;
                const attempts = avatarLoadAttempts[username] || 0;
                return (
                  <ListGroup.Item
                    key={chat.user._id}
                    as={Link}
                    href={`/chat/${chat.user._id}`}
                    action
                    active={selectedChatUserId === chat.user._id}
                    className="telegram-chat-item rounded-3 mb-2"
                    style={{
                      transition: "background-color 0.3s ease, transform 0.2s ease",
                      backgroundColor: selectedChatUserId === chat.user._id ? "#e9ecef" : "#fff",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedChatUserId !== chat.user._id) {
                        e.currentTarget.style.backgroundColor = "#f0f2f5";
                        e.currentTarget.style.transform = "scale(1.02)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedChatUserId !== chat.user._id) {
                        e.currentTarget.style.backgroundColor = "#fff";
                        e.currentTarget.style.transform = "scale(1)";
                      }
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <div
                        className="telegram-avatar me-3"
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: chat.user.avatar ? "transparent" : "#e0e0e0",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
                                (e.target as HTMLImageElement).src = "/default-chat-avatar.png";
                              } else {
                                (e.target as HTMLImageElement).src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
                              }
                            }}
                            onLoad={() => console.log(`Аватар для ${chat.user.username} загружен: ${chat.user.avatar}`)}
                          />
                        ) : (
                          <span style={{ fontSize: "20px", color: "#666", fontWeight: "bold" }}>{chat.user.username[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="d-flex align-items-center">
                          <strong style={{ color: "#212529" }}>@{chat.user.username}</strong>
                          {chat.user.name && <span className="text-muted ms-2">({chat.user.name})</span>}
                        </div>
                        <div className="text-muted small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {chat.lastMessage?.content?.substring(0, 50) || "Нет сообщений"}
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </div>
        </Col>
        {isDesktop && (
          <Col md={8} style={{ height: "100%", overflow: "auto" }}>
            <ChatArea
              chatUserId={selectedChatUserId}
              currentUserId={userId}
              chatUsername={chats.find(c => c.user._id === selectedChatUserId)?.user.username || "-"}
            />
          </Col>
        )}
      </Row>
    </Container>
  );
}