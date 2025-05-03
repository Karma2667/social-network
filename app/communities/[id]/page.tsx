'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Post from '@/app/Components/Post';
import AppNavbar from '@/app/Components/Navbar';
import { useAuth } from '@/lib/AuthContext';
import { use } from 'react';

interface PostData {
  _id: string;
  content: string;
  user: { _id: string; username: string; avatar?: string };
  community?: { _id: string; name: string };
  createdAt: string;
  likes: string[];
  images: string[];
}

interface CommunityData {
  _id: string;
  name: string;
  description: string;
  creator: { username: string };
  members: { username: string }[];
}

export default function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { userId } = useAuth();
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunity = useCallback(async () => {
    try {
      console.log('CommunityPage: Загрузка сообщества с ID:', id);
      const res = await fetch(`/api/communities/${id}`, {
        headers: { 'x-user-id': userId || '' },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось загрузить сообщество');
      }
      const data = await res.json();
      setCommunity(data || null);
    } catch (err: any) {
      console.error('CommunityPage: Ошибка загрузки сообщества:', err);
      setError(err.message);
    }
  }, [id, userId]);

  const fetchPosts = useCallback(async () => {
    try {
      console.log('CommunityPage: Загрузка постов для сообщества:', id);
      const res = await fetch(`/api/posts?communityId=${id}`, {
        headers: { 'x-user-id': userId || '' },
        cache: 'no-store',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось загрузить посты');
      }
      const data = await res.json();
      setPosts(data || []);
    } catch (err: any) {
      console.error('CommunityPage: Ошибка загрузки постов:', err);
      setError(err.message);
    }
  }, [id, userId]);

  useEffect(() => {
    if (!userId) {
      console.log('CommunityPage: Нет userId, ожидание перенаправления');
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchCommunity(), fetchPosts()]).finally(() => setLoading(false));
  }, [userId, fetchCommunity, fetchPosts]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) {
      setError('Требуется текст поста');
      return;
    }
    if (!userId) {
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
        community: id,
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
      await fetchPosts();
    } catch (err: any) {
      console.error('CommunityPage: Ошибка создания поста:', err);
      setError(err.message);
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (!userId) return null;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 8, offset: 2 }}>
            {community ? (
              <>
                <h2>{community.name}</h2>
                <p>{community.description || 'Описание отсутствует'}</p>
                <p>Создатель: {community.creator?.username || 'Неизвестный'}</p>
                <p>Участники: {(community.members || []).map((m) => m.username).join(', ') || 'Нет участников'}</p>
              </>
            ) : (
              <p>Сообщество не найдено</p>
            )}
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