'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import AppNavbar from './Components/Navbar';
import Post from './Components/Post';

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = '67bb0134b8e5bcf5a2c30fb4'; // Пока захардкодим

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/posts', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content }),
      });
      if (!res.ok) throw new Error('Failed to create post');
      setContent('');
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      <AppNavbar userId={userId} />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 6, offset: 3 }}>
            <h1>Home Feed</h1>
            <Form onSubmit={handleSubmit} className="mb-4">
              <Form.Group>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                />
              </Form.Group>
              <Button variant="primary" type="submit">Post</Button>
            </Form>
            {posts.map((post) => (
              <Post
                key={post._id}
                username={post.user.username}
                content={post.content}
                createdAt={post.createdAt}
                userId={post.user._id}
                likes={post.likes.map((id: any) => id.toString())} // Преобразуем ObjectId в строки
                postId={post._id}
              />
            ))}
          </Col>
        </Row>
      </Container>
    </>
  );
}