'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button, ListGroup } from 'react-bootstrap';
import AppNavbar from '@/app/Components/Navbar';
import Post from '@/app/Components/Post';

export default function CommunityPage() {
  const { id } = useParams();
  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = '67bb0134b8e5bcf5a2c30fb4'; // Пока захардкодим

  useEffect(() => {
    fetchCommunity();
    fetchPosts();
  }, [id]);

  const fetchCommunity = async () => {
    try {
      const res = await fetch(`/api/communities/${id}`);
      if (!res.ok) throw new Error('Failed to fetch community');
      const data = await res.json();
      setCommunity(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?communityId=${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content, communityId: id }),
      });
      if (!res.ok) throw new Error('Failed to create post');
      setContent('');
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!community) return <div>Community not found</div>;

  return (
    <>
      <AppNavbar userId={userId} />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 8, offset: 2 }}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>{community.name}</Card.Title>
                <Card.Text>{community.description || 'No description yet'}</Card.Text>
                <Card.Subtitle className="text-muted">
                  Created by: {community.creator.username} on {new Date(community.createdAt).toLocaleDateString()}
                </Card.Subtitle>
              </Card.Body>
            </Card>
            <Form onSubmit={handlePostSubmit} className="mb-4">
              <Form.Group className="d-flex">
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a post..."
                />
                <Button variant="primary" type="submit" className="ms-2">Post</Button>
              </Form.Group>
            </Form>
            <h3>Posts</h3>
            {posts.length === 0 ? (
              <p>No posts yet</p>
            ) : (
              posts.map((post) => (
                <Post
                  key={post._id}
                  username={post.user.username}
                  content={post.content}
                  createdAt={post.createdAt}
                  userId={post.user._id}
                />
              ))
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
}