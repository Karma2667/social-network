// app/communities/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Button } from 'react-bootstrap';
import AppNavbar from '../Components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function Communities() {
  const { userId } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchCommunities();
  }, [userId]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/communities', {
        headers: { 'x-user-id': userId || '' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch communities');
      const data = await res.json();
      setCommunities(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return <div>Please log in to view communities</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 6, offset: 3 }}>
            <Button variant="primary" as={Link} href="/communities/create" className="mb-3">
              Create Community
            </Button>
            <Card>
              <Card.Header>Communities</Card.Header>
              <ListGroup variant="flush">
                {communities.length === 0 ? (
                  <ListGroup.Item>No communities yet</ListGroup.Item>
                ) : (
                  communities.map((community) => (
                    <ListGroup.Item key={community._id} action as={Link} href={`/communities/${community._id}`}>
                      {community.name}
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