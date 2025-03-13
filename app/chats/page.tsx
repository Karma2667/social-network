'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button } from 'react-bootstrap';
import AppNavbar from '@/app/Components/Navbar';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Chats() {
  const { userId } = useAuth(); // Получаем userId из контекста
  const searchParams = useSearchParams();
  const recipientId = searchParams.get('recipientId');
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('Chats received userId from context:', userId);

  useEffect(() => {
    if (!userId || !recipientId) {
      setLoading(false);
      return;
    }

    const fetchRecipient = async () => {
      try {
        const res = await fetch(`/api/users/${recipientId}`);
        const data = await res.json();
        setRecipientName(data.username);
      } catch (err) {
        console.error('Fetch recipient error:', err);
      }
    };

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?userId=${userId}&recipientId=${recipientId}`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error('Fetch messages error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipient();
    fetchMessages();
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
      <AppNavbar /> {/* Убрали userId */}
      <Container className="my-4">
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
        {recipientId && (
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
        )}
      </Container>
    </>
  );
}