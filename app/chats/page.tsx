'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button, ListGroup } from 'react-bootstrap';
import AppNavbar from '@/app/Components/Navbar';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function Chats() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const recipientId = searchParams.get('recipientId');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatList, setChatList] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('Chats received userId from context:', userId);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchChats = async () => {
      try {
        if (recipientId) {
          // Загружаем сообщения для конкретного чата
          const res = await fetch(`/api/messages?userId=${userId}&recipientId=${recipientId}`);
          if (!res.ok) throw new Error('Failed to fetch messages');
          const data = await res.json();
          setMessages(data);
          const recipientRes = await fetch(`/api/users/${recipientId}`);
          const recipientData = await recipientRes.json();
          setRecipientName(recipientData.username);
        } else {
          // Загружаем список всех чатов
          const res = await fetch(`/api/messages?userId=${userId}`);
          if (!res.ok) throw new Error('Failed to fetch chat list');
          const data = await res.json();
          setChatList(data);
        }
      } catch (err) {
        console.error('Fetch chats error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [userId, recipientId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !recipientId || !content) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: userId, recipientId, content }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      setContent('');
      const fetchMessages = async () => {
        const res = await fetch(`/api/messages?userId=${userId}&recipientId=${recipientId}`);
        const data = await res.json();
        setMessages(data);
      };
      fetchMessages();
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  if (!userId) return <div>Please log in to view chats</div>;
  if (loading) return <div>Loading...</div>;

  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        {recipientId ? (
          <>
            <h1>Chat with {recipientName || 'Unknown User'}</h1>
            {messages.length === 0 ? (
              <p>No messages yet. Start the conversation!</p>
            ) : (
              <div>
                {messages.map((msg) => (
                  <p key={msg._id}>
                    <strong>{msg.sender.username}:</strong> {msg.content}
                  </p>
                ))}
              </div>
            )}
            <Form onSubmit={handleSend} className="mt-3">
              <Form.Group>
                <Form.Control
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type a message"
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="mt-2">
                Send
              </Button>
            </Form>
          </>
        ) : (
          <>
            <h1>Your Chats</h1>
            {chatList.length === 0 ? (
              <p>No chats yet. Start a conversation from the search page!</p>
            ) : (
              <ListGroup>
                {chatList.map((chat) => (
                  <ListGroup.Item key={chat.userId} action as={Link} href={`/chats?recipientId=${chat.userId}`}>
                    <strong>{chat.username}</strong>: {chat.lastMessage.content}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </>
        )}
      </Container>
    </>
  );
}