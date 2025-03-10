'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, ListGroup, Card } from 'react-bootstrap';
import AppNavbar from '../Components/Navbar';
import Link from 'next/link';

export default function Chats() {
  const [chatUsers, setChatUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = '67bb0134b8e5bcf5a2c30fb4'; // Убедись, что это твой ID

  useEffect(() => {
    fetchChatUsers();
  }, []);

  const fetchChatUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/messages?userId=${userId}`, { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to fetch chat users: ${res.status} - ${errorData.error}`);
      }
      const data = await res.json();
      setChatUsers(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch chat users error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      <AppNavbar userId={userId} />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 6, offset: 3 }}>
            <Card>
              <Card.Header>Chats</Card.Header>
              <ListGroup variant="flush">
                {chatUsers.length === 0 ? (
                  <ListGroup.Item>No chats yet</ListGroup.Item>
                ) : (
                  chatUsers.map((user) => (
                    <ListGroup.Item key={user._id} action as={Link} href={`/chats/${user._id}`}>
                      {user.username}
                    </ListGroup.Item>
                  ))
                )}
              </ListGroup>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}