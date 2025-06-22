'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, Button, Alert, Dropdown } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';

interface Reaction {
  emoji: string;
  users: string[];
}

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  encryptedContent: string; // Новое поле для имитации шифрования
  createdAt: string;
  isRead: boolean;
  readBy: string[];
  editedAt?: string;
  reactions?: Reaction[];
  replyTo?: string;
}

interface ChatProps {
  recipientId: string;
  recipientUsername: string;
}

export default function Chat({ recipientId, recipientUsername }: ChatProps) {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId || !recipientId) {
      setError('Отсутствует userId или recipientId');
      console.error('Chat: Отсутствует userId или recipientId:', { userId, recipientId });
      return;
    }

    const initializeChat = async () => {
      try {
        console.log('Chat: Загрузка сообщений для recipientId:', recipientId);
        const messagesRes = await fetch(`/api/messages?recipientId=${encodeURIComponent(recipientId)}`, {
          headers: { 'x-user-id': userId },
          cache: 'no-store',
        });
        if (!messagesRes.ok) {
          const errorData = await messagesRes.json();
          throw new Error(`Не удалось загрузить сообщения: ${errorData.error}`);
        }

        const messages: Message[] = await messagesRes.json();
        console.log('Chat: Загружены сообщения:', messages.length);
        setMessages(messages);

        // Отмечаем непрочитанные сообщения как прочитанные
        const unreadMessages = messages.filter(
          (msg: Message) => !msg.isRead && msg.senderId !== userId
        );
        if (unreadMessages.length > 0) {
          console.log('Chat: Отмечаем как прочитанные сообщения:', unreadMessages.length);
          await Promise.all(
            unreadMessages.map((msg: Message) =>
              fetch(`/api/messages?messageId=${msg._id}`, {
                method: 'PATCH',
                headers: { 'x-user-id': userId },
              })
            )
          );
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Chat: Ошибка инициализации чата:', err);
      }
    };

    initializeChat();
  }, [userId, recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Chat: Попытка отправки сообщения:', { messageInput, userId, recipientId });

    if (!messageInput.trim() || !userId || !recipientId) {
      console.error('Chat: Не удалось отправить сообщение. Отсутствуют данные:', {
        messageInput: !!messageInput.trim(),
        userId,
        recipientId,
      });
      setError('Не удалось отправить сообщение: отсутствуют необходимые данные');
      return;
    }

    setSending(true);
    try {
      // Имитация шифрования: кодируем в base64
      const encryptedContent = btoa(unescape(encodeURIComponent(messageInput)));
      console.log('Chat: Закодированное сообщение:', encryptedContent);

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ recipientId, content: messageInput, encryptedContent, replyTo }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось отправить сообщение');
      }

      const newMessage: Message = await res.json();
      console.log('Chat: Новое сообщение:', newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput('');
      setReplyTo(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Chat: Ошибка отправки сообщения:', err);
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() || !userId) {
      console.error('Chat: Не удалось отредактировать сообщение. Отсутствуют данные:', {
        editContent: !!editContent.trim(),
        userId,
      });
      setError('Не удалось отредактировать сообщение: отсутствуют необходимые данные');
      return;
    }

    setSending(true);
    try {
      // Имитация шифрования: кодируем в base64
      const encryptedContent = btoa(unescape(encodeURIComponent(editContent)));
      console.log('Chat: Закодированное отредактированное сообщение:', encryptedContent);

      const res = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ messageId, content: editContent, encryptedContent }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось отредактировать сообщение');
      }

      const updatedMessage: Message = await res.json();
      console.log('Chat: Обновленное сообщение:', updatedMessage);
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? updatedMessage : msg))
      );
      setEditingMessageId(null);
      setEditContent('');
    } catch (err: any) {
      setError(err.message);
      console.error('Chat: Ошибка редактирования сообщения:', err);
    } finally {
      setSending(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/messages?messageId=${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ emoji }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось добавить реакцию');
      }

      const updatedMessage: Message = await res.json();
      console.log('Chat: Обновленное сообщение с реакцией:', updatedMessage);
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? updatedMessage : msg))
      );
    } catch (err: any) {
      setError(err.message);
      console.error('Chat: Ошибка добавления реакции:', err);
    }
  };

  const handleReply = (messageId: string) => {
    setReplyTo(messageId);
    const input = document.querySelector('.telegram-input') as HTMLInputElement;
    input?.focus();
  };

  const handleEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
    setReplyTo(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const getRepliedMessage = (replyToId?: string): Message | null => {
    if (!replyToId) return null;
    return messages.find((msg) => msg._id === replyToId) || null;
  };

  return (
    <div className="telegram-chat-container flex-grow-1 overflow-auto p-3" style={{ backgroundColor: '#f0f2f5' }}>
      <div className="encryption-notice d-flex align-items-center mb-3">
        <span role="img" aria-label="lock" className="me-2">🔒</span>
        <small className="text-muted">Сообщения шифруются для вашей безопасности</small>
      </div>
      {error && <Alert variant="danger" className="telegram-alert">{error}</Alert>}
      <div className="telegram-messages" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {messages.map((msg) => {
          const repliedMessage = getRepliedMessage(msg.replyTo);
          return (
            <div
              key={msg._id}
              className={`telegram-message ${msg.senderId === userId ? 'sent' : 'received'} mb-2`}
              style={{
                display: 'flex',
                flexDirection: msg.senderId === userId ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}
            >
              <div
                className="telegram-message-bubble p-2 rounded position-relative"
                style={{
                  backgroundColor: msg.senderId === userId ? '#0088cc' : '#e9ecef',
                  color: msg.senderId === userId ? 'white' : '#000',
                  maxWidth: '70%',
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                }}
              >
                {repliedMessage && (
                  <div
                    className="replied-message p-1 mb-1 rounded"
                    style={{
                      backgroundColor: msg.senderId === userId ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                      fontSize: '0.85em',
                    }}
                  >
                    <strong>{msg.senderId === userId ? 'Вы' : recipientUsername}</strong>:
                    {repliedMessage.content.substring(0, 50)}
                    {repliedMessage.content.length > 50 ? '...' : ''}
                  </div>
                )}
                {msg.content}
                {msg.editedAt && (
                  <small className="d-block text-muted" style={{ fontSize: '0.75em' }}>
                    (ред. {new Date(msg.editedAt).toLocaleTimeString()})
                  </small>
                )}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="reactions mt-1">
                    {msg.reactions.map((r) => (
                      <span key={r.emoji} className="me-2" onClick={() => handleAddReaction(msg._id, r.emoji)}>
                        {r.emoji} {r.users.length}
                      </span>
                    ))}
                  </div>
                )}
                <Dropdown
                  className="position-absolute"
                  style={{ top: '5px', right: msg.senderId === userId ? '5px' : 'auto', left: msg.senderId !== userId ? '5px' : 'auto' }}
                >
                  <Dropdown.Toggle variant="link" bsPrefix="p-0" className="text-muted">
                    ⋮
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleReply(msg._id)}>Ответить</Dropdown.Item>
                    {msg.senderId === userId && (
                      <Dropdown.Item onClick={() => handleEdit(msg._id, msg.content)}>Редактировать</Dropdown.Item>
                    )}
                    <Dropdown.Item onClick={() => handleAddReaction(msg._id, '👍')}>👍</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleAddReaction(msg._id, '❤️')}>❤️</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleAddReaction(msg._id, '😂')}>😂</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
              <div className="telegram-message-time text-muted small ms-2" style={{ marginBottom: '2px' }}>
                {new Date(msg.createdAt).toLocaleTimeString()}
                {msg.senderId === userId && (
                  <span className={msg.isRead ? 'is-read' : ''} style={{ marginLeft: '4px' }}>
                    {msg.isRead ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <Form
        onSubmit={editingMessageId ? (e) => { e.preventDefault(); handleEditMessage(editingMessageId); } : handleSendMessage}
        className="telegram-input-area mt-3"
      >
        <div className="d-flex align-items-center">
          {replyTo && (
            <div className="reply-preview p-2 mb-2 w-100" style={{ backgroundColor: '#e9ecef', borderRadius: '10px' }}>
              <small>
                Ответ на: {
                  getRepliedMessage(replyTo)
                    ? `${getRepliedMessage(replyTo)!.content.substring(0, 50)}${getRepliedMessage(replyTo)!.content.length > 50 ? '...' : ''}`
                    : '[Сообщение не найдено]'
                }
              </small>
              <Button variant="link" size="sm" onClick={() => setReplyTo(null)}>Отмена</Button>
            </div>
          )}
          {editingMessageId && (
            <div className="edit-preview p-2 mb-2 w-100" style={{ backgroundColor: '#e9ecef', borderRadius: '10px' }}>
              <small>Редактирование сообщения</small>
              <Button variant="link" size="sm" onClick={cancelEdit}>Отмена</Button>
            </div>
          )}
          <Form.Control
            type="text"
            value={editingMessageId ? editContent : messageInput}
            onChange={(e) => (editingMessageId ? setEditContent(e.target.value) : setMessageInput(e.target.value))}
            placeholder={editingMessageId ? 'Редактировать сообщение...' : `Сообщение для ${recipientUsername}`}
            className="telegram-input flex-grow-1 me-2"
            disabled={sending}
            style={{
              borderRadius: '20px',
              border: '1px solid #ced4da',
              padding: '8px 12px',
              fontSize: '14px',
            }}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={sending || (!editingMessageId ? !messageInput.trim() : !editContent.trim())}
            className="telegram-send-button"
            style={{
              borderRadius: '10px',
              padding: '8px 16px',
              backgroundColor: '#0088cc',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.3s ease',
            }}
          >
            {sending ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
      </Form>
    </div>
  );
}