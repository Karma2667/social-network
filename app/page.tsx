'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Post from '@/app/Components/Post';
import AppNavbar from '@/app/Components/Navbar';
import { useAuth } from '@/lib/AuthContext';

interface PostData {
  _id: string;
  content: string;
  user: { _id: string; username: string; avatar?: string };
  community?: { _id: string; name: string };
  createdAt: string;
  likes: string[];
  images: string[];
}

export default function Home() {
  const { userId, isInitialized, setUserId } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    try {
      console.log('Home: Fetching posts with userId:', userId);
      const res = await fetch('/api/posts', {
        headers: { 'x-user-id': userId },
        cache: 'no-store',
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Home: Ошибка API:', errorData);
        throw new Error(errorData.details || errorData.error || 'Не удалось загрузить посты');
      }
      const data = await res.json();
      console.log('Home: Fetched posts:', data);
      setPosts(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Home: Ошибка загрузки постов:', err.message);
      setError(err.message);
    }
  }, [userId]);

  useEffect(() => {
    console.log('Home: userId from useAuth:', userId, 'isInitialized:', isInitialized);
    if (!isInitialized) {
      console.log('Home: Ожидание инициализации AuthContext');
      return;
    }
    const storedUserId = localStorage.getItem('userId');
    if (!userId && storedUserId) {
      console.log('Home: userId отсутствует, но найден в localStorage:', storedUserId);
      setUserId(storedUserId);
      return;
    }
    if (!userId && !storedUserId) {
      console.log('Home: Нет userId, перенаправление на /login');
      window.location.replace('/login');
      return;
    }
    if (userId) {
      setLoading(true);
      fetchPosts().finally(() => setLoading(false));
    }
  }, [userId, isInitialized, fetchPosts, setUserId]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) {
      console.error('Home: Требуется текст поста');
      setError('Требуется текст поста');
      return;
    }
    if (!userId) {
      console.error('Home: Пользователь не аутентифицирован');
      setError('Пользователь не аутентифицирован');
      return;
    }
    try {
      let imagePaths: string[] = [];
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((file) => formData.append('files', file));
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || 'Не удалось загрузить изображения');
        }
        const { files } = await uploadRes.json();
        imagePaths = files;
      }

      const postData = {
        userId,
        content,
        images: imagePaths,
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(postData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось создать пост');
      }
      setContent('');
      setImages([]);
      setError(null);
      await fetchPosts();
    } catch (err: any) {
      console.error('Home: Ошибка создания поста:', err.message);
      setError(err.message);
    }
  };

  if (!isInitialized) {
    console.log('Home: Рендеринг: Ожидание инициализации AuthContext');
    return <div>Загрузка...</div>;
  }
  if (!userId && !localStorage.getItem('userId')) {
    console.log('Home: Рендеринг: Нет userId, перенаправление на /login');
    window.location.replace('/login');
    return null;
  }

  if (loading) return <div>Загрузка...</div>;

  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 8, offset: 2 }}>
            {error && <div className="alert alert-danger">{error}</div>}
            <Form onSubmit={handlePostSubmit} className="mb-4">
              <Form.Group className="mb-3">
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Напишите пост..."
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Загрузить изображения</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) setImages(Array.from(files));
                  }}
                />
              </Form.Group>
              <Button variant="primary" type="submit">
                Опубликовать
              </Button>
            </Form>
            <h3>Посты</h3>
            {posts.length === 0 ? (
              <p>Пока нет постов</p>
            ) : (
              posts.map((post) => (
                <Post
                  key={post._id}
                  username={
                    post.community
                      ? `${post.user?.username || 'Неизвестный'} в ${post.community.name}`
                      : post.user?.username || 'Неизвестный'
                  }
                  content={post.content || 'Нет содержимого'}
                  createdAt={post.createdAt || Date.now()}
                  userId={post.user?._id?.toString() || post.user?.toString() || 'unknown'}
                  likes={post.likes?.map((id: any) => id.toString()) || []}
                  images={post.images || []}
                  postId={post._id.toString()}
                  fetchPosts={fetchPosts}
                  userAvatar={post.user?.avatar || '/default-avatar.png'}
                />
              ))
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
}