// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import AppNavbar from './Components/Navbar';
import Post from './Components/Post';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { userId } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Home: userId from useAuth:', userId); // Отладка
    if (!userId) return;
    fetchPosts();
  }, [userId]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/posts', {
        headers: { 'x-user-id': userId || '' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      console.log('Fetched posts:', data);
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) {
      setError('Content is required');
      return;
    }
    if (!userId) {
      setError('User not authenticated');
      console.log('No userId available for POST request'); // Отладка
      return;
    }
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ userId, content }), // Без communityId
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create post');
      }
      setContent('');
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!userId) return <div>Please log in to view this page</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 8, offset: 2 }}>
          <Button variant="primary" href="/communities" className="mb-3">
              Go to Communities
            </Button>
            <Form onSubmit={handlePostSubmit} className="mb-4">
              <Form.Group className="d-flex">
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a post..."
                />
                <Button variant="primary" type="submit" className="ms-2">
                  Post
                </Button>
              </Form.Group>
              {error && <p className="text-danger mt-2">{error}</p>}
            </Form>
            <h3>Posts</h3>
            {posts.length === 0 ? (
              <p>No posts yet</p>
            ) : (
              posts.map((post) => (
                <Post
                  key={post._id}
                  username={post.user?.username || 'Unknown'}
                  content={post.content || 'No content'}
                  createdAt={post.createdAt || Date.now()}
                  userId={post.user?._id || 'unknown'}
                  likes={post.likes || []}
                  postId={post._id}
                />
              ))
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
}