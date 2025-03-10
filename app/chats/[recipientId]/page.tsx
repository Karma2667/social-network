'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button, ListGroup } from 'react-bootstrap';
import AppNavbar from '@/app/Components/Navbar';

export default function Chat() {
  const { recipientId } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = '67bb0134b8e5bcf5a2c30fb4'; // Пока захардкодим

  useEffect(() => {
    fetchMessages();
  }, [recipientId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/messages?userId=${userId}&recipientId=${recipientId}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to fetch messages: ${res.status} - ${errorData}`);
      }
      const data = await res.json();
      setMessages(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: userId, recipient: recipientId, content }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      setContent('');
      fetchMessages();
    } catch (err: any) {
      setError(err.message);
      console.error('Send message error:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      <AppNavbar userId={userId} />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 8, offset: 2 }}>
            <Card>
              <Card.Header>Chat with {messages[0]?.recipient.username || 'User'}</Card.Header>
              <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <ListGroup variant="flush">
                  {messages.map((msg) => (
                    <ListGroup.Item
                      key={msg._id}
                      className={msg.sender._id === userId ? 'text-end' : 'text-start'}
                    >
                      <strong>{msg.sender.username}: </strong>
                      {msg.content}
                      <br />
                      <small className="text-muted">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </small>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
              <Card.Footer>
                <Form onSubmit={handleSendMessage}>
                  <Form.Group className="d-flex">
                    <Form.Control
                      type="text"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Type a message..."
                    />
                    <Button variant="primary" type="submit" className="ms-2">
                      Send
                    </Button>
                  </Form.Group>
                </Form>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}