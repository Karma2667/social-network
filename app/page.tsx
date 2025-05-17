"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/ClientAuthProvider';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Form, Button, Alert, ListGroup } from 'react-bootstrap';

export default function HomePage() {
  const { userId, isInitialized, username } = useAuth();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(true);
  const [profile, setProfile] = useState({ name: '', username: '', bio: '' });
  const [posts, setPosts] = useState<any[]>([]);
  const [postContent, setPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  console.log('HomePage: Инициализация, userId:', userId, 'isInitialized:', isInitialized, 'username:', username);

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
      console.log('HomePage: Проверка isDesktop:', desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      console.log('HomePage: Ожидание инициализации');
      return;
    }
    if (!userId) {
      console.log('HomePage: Нет userId, перенаправление на /login');
      router.replace('/login');
      return;
    }
    console.log('HomePage: Загрузка данных профиля и постов для userId:', userId);
    Promise.all([
      fetch('/api/profile', { headers: { 'x-user-id': userId } }).then((res) => res.json()),
      fetch('/api/posts', { headers: { 'x-user-id': userId } }).then((res) => res.json()),
    ])
      .then(([profileData, postsData]) => {
        console.log('HomePage: Данные профиля загружены:', profileData);
        console.log('HomePage: Посты загружены:', postsData);
        setProfile({
          name: profileData.name || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
        });
        setPosts(postsData);
      })
      .catch((err) => {
        console.error('HomePage: Ошибка загрузки данных:', err.message);
        setError('Ошибка загрузки данных');
      });
  }, [userId, isInitialized, router]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    console.log('HomePage: Попытка обновления профиля:', profile);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify(profile),
      });
      console.log('HomePage: Ответ /api/profile:', res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }

      const updatedProfile = await res.json();
      localStorage.setItem('username', updatedProfile.username);
      setProfile(updatedProfile);
    } catch (err: any) {
      console.error('HomePage: Ошибка обновления:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !postContent.trim()) return;
    setSubmitting(true);
    setError(null);
    console.log('HomePage: Попытка создания/обновления поста:', { postContent, editingPostId });

    try {
      const url = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
      const method = editingPostId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ content: postContent, userId }),
      });
      console.log('HomePage: Ответ /api/posts:', res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.json();
        console.log('HomePage: Ошибка сервера:', errorData);
        throw new Error(errorData.error || 'Ошибка с постом');
      }

      const updatedPost = await res.json();
      setPosts((prev) =>
        editingPostId
          ? prev.map((post) => (post._id === editingPostId ? updatedPost : post))
          : [updatedPost, ...prev]
      );
      setPostContent('');
      setEditingPostId(null);
    } catch (err: any) {
      console.error('HomePage: Ошибка с постом:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = (post: any) => {
    setPostContent(post.content);
    setEditingPostId(post._id);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId || '' },
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((post) => post._id !== postId));
      }
    } catch (err: any) {
      console.error('HomePage: Ошибка удаления поста:', err.message);
      setError(err.message);
    }
  };

  if (!isInitialized || !userId) {
    console.log('HomePage: Ожидание инициализации или userId');
    return <div>Загрузка...</div>;
  }

  return (
    <Container fluid>
      <Row>
        {isDesktop && (
          <Col md={3} className="border-end" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="p-3">
              <h5>Профиль</h5>
              <Form onSubmit={handleProfileSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Имя</Form.Label>
                  <Form.Control
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Введите имя"
                    disabled={submitting}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Имя пользователя</Form.Label>
                  <Form.Control
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    placeholder="Введите @username"
                    disabled={submitting}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Био</Form.Label>
                  <Form.Control
                    as="textarea"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Расскажите о себе"
                    disabled={submitting}
                  />
                </Form.Group>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button
                  variant="danger"
                  className="ms-2"
                  onClick={() => useAuth().logout()}
                  disabled={submitting}
                >
                  Выйти
                </Button>
              </Form>
            </div>
          </Col>
        )}
        <Col md={isDesktop ? 9 : 12}>
          <div className="p-3">
            <h5>Посты</h5>
            <Form onSubmit={handlePostSubmit} className="mb-3">
              <Form.Group className="mb-3">
                <Form.Control
                  as="textarea"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Что нового?"
                  disabled={submitting}
                />
              </Form.Group>
              <Button variant="primary" type="submit" disabled={submitting || !postContent.trim()}>
                {submitting ? 'Отправка...' : editingPostId ? 'Обновить' : 'Опубликовать'}
              </Button>
              {editingPostId && (
                <Button
                  variant="secondary"
                  className="ms-2"
                  onClick={() => {
                    setPostContent('');
                    setEditingPostId(null);
                  }}
                  disabled={submitting}
                >
                  Отмена
                </Button>
              )}
            </Form>
            {error && <Alert variant="danger">{error}</Alert>}
            <ListGroup>
              {posts.map((post) => (
                <ListGroup.Item key={post._id}>
                  <p>{post.content}</p>
                  <Button
                    variant="link"
                    onClick={() => handleEditPost(post)}
                    className="me-2"
                  >
                    Редактировать
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => handleDeletePost(post._id)}
                    className="text-danger"
                  >
                    Удалить
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
            {!isDesktop && (
              <div className="mt-4">
                <h5>Настройки</h5>
                <Form onSubmit={handleProfileSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Имя</Form.Label>
                    <Form.Control
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Введите имя"
                      disabled={submitting}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Имя пользователя</Form.Label>
                    <Form.Control
                      type="text"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="Введите @username"
                      disabled={submitting}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Био</Form.Label>
                    <Form.Control
                      as="textarea"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Расскажите о себе"
                      disabled={submitting}
                    />
                  </Form.Group>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button
                    variant="danger"
                    className="ms-2"
                    onClick={() => useAuth().logout()}
                    disabled={submitting}
                  >
                    Выйти
                  </Button>
                </Form>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
}