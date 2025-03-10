'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import AppNavbar from './Components/Navbar';
import Post from './Components/Post';
import PostForm from './Components/PostForm';

export default function Home() {

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = '67bb0134b8e5bcf5a2c30fb4'; // Замени на свой ID

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/posts', { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to fetch posts: ${res.status} - ${errorData}`);
      }
      const data = await res.json();
      console.log('Fetched posts:', data);
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (content: string) => {
    try {
      console.log('Sending POST with:', { userId, content });
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create post');
      }
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
      console.error('Post error:', err);
    }
  };

  return (
    <>
      <AppNavbar userId={userId}/>
      <Container className="my-4">
        <Row>
          <Col md={{ span: 6, offset: 3 }}>
            <h1 className="mb-4">Home Feed</h1>
            <PostForm onSubmit={handlePostSubmit} />
            {loading && <p>Loading posts...</p>}
            {error && <Alert variant="danger">{error}</Alert>}
            {!loading && !error && posts.length === 0 && <p>No posts yet.</p>}
            {posts.map((post) => (
              <Post
                key={post._id}
                username={post.user.username}
                content={post.content}
                createdAt={post.createdAt}
                userId={post.user._id} // Передаем ID пользователя
              />
            ))}
          </Col>
        </Row>
      </Container>
    </>
  );
}