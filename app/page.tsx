'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Image, ListGroup, Alert } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';
import AppNavbar from '@/app/Components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Post {
  _id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  createdAt: string;
}

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  avatar: string;
}

export default function Home() {
  const { userId, isInitialized, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [postInput, setPostInput] = useState('');
  const [posting, setPosting] = useState(false);
  const router = useRouter();

  // Перенаправление на /login, если нет userId
  useEffect(() => {
    if (isInitialized && !userId) {
      console.log('Home: Нет userId, перенаправление на /login');
      router.replace('/login');
    }
  }, [isInitialized, userId, router]);

  // Загрузка профиля и постов
  useEffect(() => {
    if (!isInitialized || !userId) {
      console.log('Home: Ожидание инициализации или userId:', { userId });
      return;
    }

    const fetchProfile = async () => {
      try {
        console.log('Home: Загрузка профиля для userId:', userId);
        const res = await fetch(`/api/users/${userId}`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Home: Ошибка API профиля:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить профиль');
        }
        const data = await res.json();
        console.log('Home: Профиль загружен:', data);
        setProfile(data);
      } catch (err: any) {
        console.error('Home: Ошибка загрузки профиля:', err.message);
        setError(err.message);
      }
    };

    const fetchPosts = async () => {
      try {
        setLoading(true);
        console.log('Home: Загрузка постов для userId:', userId);
        const res = await fetch(`/api/posts?userId=${userId}`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Home: Ошибка API постов:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить посты');
        }
        const data = await res.json();
        console.log('Home: Посты загружены:', data);
        setPosts(data);
        setLoading(false);
      } catch (err: any) {
        console.error('Home: Ошибка загрузки постов:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProfile();
    fetchPosts();
  }, [isInitialized, userId]);

  // Создание поста
  const handleCreatePost = async () => {
    if (!postInput.trim() || !userId) return;

    try {
      setPosting(true);
      console.log('Home: Создание поста для userId:', userId);
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ content: postInput, userId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Home: Ошибка API создания поста:', errorData);
        throw new Error(errorData.error || 'Не удалось создать пост');
      }
      const newPost = await res.json();
      console.log('Home: Пост создан:', newPost);
      setPosts((prev) => [newPost, ...prev]);
      setPostInput('');
      setPosting(false);
    } catch (err: any) {
      console.error('Home: Ошибка создания поста:', err.message);
      setError(err.message);
      setPosting(false);
    }
  };

  if (!isInitialized) {
    console.log('Home: Рендеринг: Ожидание инициализации');
    return (
      <>
        <AppNavbar />
        <div className="d-flex align-items-center justify-content-center vh-100">Загрузка...</div>
      </>
    );
  }

  return (
    <>
      <AppNavbar />
      <Container fluid className="p-0" style={{ height: 'calc(100vh - 56px)' }}>
        <Row className="h-100 m-0">
          <Col md={4} className="telegram-sidebar p-0">
            <div className="p-3 border-bottom">
              <h5 className="telegram-profile-title">Профиль</h5>
            </div>
            <div className="p-3">
              {error && <Alert variant="danger">{error}</Alert>}
              {profile ? (
                <div className="telegram-profile">
                  <Image
                    src={profile.avatar || '/default-avatar.png'}
                    alt={profile.username}
                    className="telegram-profile-avatar"
                    roundedCircle
                  />
                  <div className="telegram-profile-info">
                    <div className="fw-bold">{profile.username}</div>
                    <div className="text-muted">{profile.email}</div>
                  </div>
                  <Link href="/profile/edit" passHref>
                    <Button variant="outline-primary" className="telegram-profile-button">
                      Редактировать профиль
                    </Button>
                  </Link>
                  <Button
                    variant="outline-danger"
                    className="telegram-profile-button"
                    onClick={logout}
                  >
                    Выйти
                  </Button>
                </div>
              ) : (
                <div className="text-muted">Загрузка профиля...</div>
              )}
            </div>
          </Col>
          <Col md={8} className="telegram-posts d-flex flex-column">
            <div className="p-3 border-bottom">
              <h5>Ваши посты</h5>
            </div>
            <div className="p-3 border-bottom">
              <Form.Control
                as="textarea"
                rows={3}
                value={postInput}
                onChange={(e) => setPostInput(e.target.value)}
                placeholder="Напишите пост..."
                className="telegram-post-input mb-2"
                disabled={posting}
              />
              <Button
                className="telegram-post-button"
                onClick={handleCreatePost}
                disabled={posting || !postInput.trim()}
              >
                Опубликовать
              </Button>
            </div>
            <div className="overflow-auto p-3 flex-grow-1">
              {loading ? (
                <div>Загрузка...</div>
              ) : posts.length === 0 ? (
                <div className="text-muted">У вас нет постов</div>
              ) : (
                <ListGroup variant="flush">
                  {posts.map((post) => (
                    <ListGroup.Item key={post._id} className="telegram-post-item">
                      <div className="d-flex align-items-center">
                        <Image
                          src={post.avatar || '/default-avatar.png'}
                          alt={post.username}
                          className="telegram-post-avatar"
                          roundedCircle
                        />
                        <div>
                          <div className="fw-bold">{post.username}</div>
                          <div className="text-muted small">
                            {new Date(post.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">{post.content}</div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}