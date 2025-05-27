"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/lib/ClientAuthProvider';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Form, Button, Alert, ListGroup, Modal, FormCheck } from 'react-bootstrap';

interface ProfileData {
  name: string;
  username: string;
  bio: string;
  interests: string[];
}

const PREDEFINED_INTERESTS = [
  'Программирование',
  'Музыка',
  'Игры',
  'Путешествия',
  'Спорт',
  'Книги',
  'Фильмы',
  'Кулинария',
  'Искусство',
  'Наука',
];

export default function HomePage() {
  const { userId, isInitialized, username } = useAuth();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({ name: '', username: '', bio: '', interests: [] });
  const [posts, setPosts] = useState<any[]>([]);
  const [postContent, setPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

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
    const authToken = localStorage.getItem('authToken') || '';
    Promise.all([
      fetch('/api/profile', {
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${authToken}`,
        },
        cache: 'no-store',
      }).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Ошибка загрузки профиля');
        }
        return res.json();
      }),
      fetch('/api/posts', {
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${authToken}`,
        },
        cache: 'no-store',
      }).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Ошибка загрузки постов');
        }
        return res.json();
      }),
    ])
      .then(([profileData, postsData]) => {
        console.log('HomePage: Данные профиля загружены:', profileData);
        console.log('HomePage: Посты загружены:', postsData);
        setProfile({
          name: profileData.name || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
          interests: profileData.interests || [],
        });
        setSelectedInterests(profileData.interests || []);
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
      const authToken = localStorage.getItem('authToken') || '';
      const updateData = { ...profile, interests: selectedInterests };
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });
      console.log('HomePage: Ответ /api/profile:', res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }

      const updatedProfile = await res.json();
      localStorage.setItem('username', updatedProfile.username);
      setProfile({
        name: updatedProfile.name || '',
        username: updatedProfile.username || '',
        bio: updatedProfile.bio || '',
        interests: updatedProfile.interests || [],
      });
      setSelectedInterests(updatedProfile.interests || []);
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
      const authToken = localStorage.getItem('authToken') || '';
      const url = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
      const method = editingPostId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
          'Authorization': `Bearer ${authToken}`,
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
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId || '',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((post) => post._id !== postId));
      }
    } catch (err: any) {
      console.error('HomePage: Ошибка удаления поста:', err.message);
      setError(err.message);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
        ? [...prev, interest]
        : prev
    );
  };

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim()) && selectedInterests.length < 5) {
      setSelectedInterests((prev) => [...prev, customInterest.trim()]);
      setCustomInterest('');
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
          <Col md={3} className="border-end telegram-sidebar">
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
                    className="telegram-post-input"
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
                    className="telegram-post-input"
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
                    className="telegram-post-input"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Интересы</Form.Label>
                  <div className="mb-2">
                    {profile.interests.length > 0 ? (
                      profile.interests.map((interest) => (
                        <span key={interest} className="badge bg-primary me-1 telegram-profile-button">
                          {interest}
                        </span>
                      ))
                    ) : (
                      <p>Нет интересов</p>
                    )}
                  </div>
                  <Button
                    variant="outline-primary"
                    onClick={() => setShowInterestsModal(true)}
                    className="telegram-profile-button"
                  >
                    Выбрать интересы
                  </Button>
                </Form.Group>
                <Button variant="primary" type="submit" disabled={submitting} className="telegram-profile-button">
                  {submitting ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button
                  variant="danger"
                  className="ms-2 telegram-profile-button"
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
          <div className="p-3 telegram-posts">
            <h5>Посты</h5>
            <Form onSubmit={handlePostSubmit} className="mb-3">
              <Form.Group className="mb-3">
                <Form.Control
                  as="textarea"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Что нового?"
                  disabled={submitting}
                  className="telegram-post-input"
                />
              </Form.Group>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting || !postContent.trim()}
                className="telegram-post-button"
              >
                {submitting ? 'Отправка...' : editingPostId ? 'Обновить' : 'Опубликовать'}
              </Button>
              {editingPostId && (
                <Button
                  variant="secondary"
                  className="ms-2 telegram-profile-button"
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
                <ListGroup.Item key={post._id} className="telegram-post-item">
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
                      className="telegram-post-input"
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
                      className="telegram-post-input"
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
                      className="telegram-post-input"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Интересы</Form.Label>
                    <div className="mb-2">
                      {profile.interests.length > 0 ? (
                        profile.interests.map((interest) => (
                          <span key={interest} className="badge bg-primary me-1 telegram-profile-button">
                            {interest}
                          </span>
                        ))
                      ) : (
                        <p>Нет интересов</p>
                      )}
                    </div>
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowInterestsModal(true)}
                      className="telegram-profile-button"
                    >
                      Выбрать интересы
                    </Button>
                  </Form.Group>
                  <Button variant="primary" type="submit" disabled={submitting} className="telegram-profile-button">
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button
                    variant="danger"
                    className="ms-2 telegram-profile-button"
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
      <Modal show={showInterestsModal} onHide={() => setShowInterestsModal(false)} className="telegram-profile">
        <Modal.Header closeButton>
          <Modal.Title>Выберите интересы</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {PREDEFINED_INTERESTS.map((interest) => (
            <FormCheck
              key={interest}
              type="checkbox"
              label={interest}
              checked={selectedInterests.includes(interest)}
              onChange={() => handleInterestToggle(interest)}
              className="mb-2"
            />
          ))}
          <Form.Group className="mt-3">
            <Form.Label>Добавить свой интерес</Form.Label>
            <Form.Control
              type="text"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              placeholder="Введите интерес"
              className="telegram-post-input"
              disabled={selectedInterests.length >= 5}
            />
            <Button
              variant="outline-primary"
              className="mt-2 telegram-profile-button"
              onClick={handleAddCustomInterest}
              disabled={!customInterest.trim() || selectedInterests.length >= 5}
            >
              Добавить
            </Button>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowInterestsModal(false)}
            className="telegram-profile-button"
          >
            Закрыть
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setProfile((prev) => ({ ...prev, interests: selectedInterests }));
              setShowInterestsModal(false);
            }}
            className="telegram-profile-button"
          >
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}