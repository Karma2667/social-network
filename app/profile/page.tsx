'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { Container, Row, Col, Form, Button, Alert, ListGroup, Modal, FormCheck } from 'react-bootstrap';
import Image from 'next/image';
import Post from '@/app/Components/Post';

interface ProfileData {
  _id: string;
  name: string;
  username: string;
  bio: string;
  avatar?: string;
  interests: string[];
}

interface UserData {
  _id: string;
  username: string;
  avatar?: string;
}

interface CommentData {
  _id: string;
  userId: UserData;
  content: string;
  createdAt: string;
  images?: string[];
  likes?: string[];
  reactions?: { emoji: string; users: string[] }[];
}

interface PostData {
  _id: string;
  content: string;
  userId: UserData;
  communityId?: string;
  isCommunityPost?: boolean;
  createdAt: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: CommentData[];
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

export default function ProfilePage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [showAboutMeModal, setShowAboutMeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    const fetchProfileAndPosts = async () => {
      try {
        const authToken = localStorage.getItem('authToken') || '';
        const headers: Record<string, string> = {
          Authorization: `Bearer ${authToken}`,
          'x-user-id': user.userId,
        };

        const profileRes = await fetch('/api/profile', { headers, cache: 'no-store' });
        if (!profileRes.ok) {
          const errorData = await profileRes.json();
          throw new Error(`Не удалось загрузить профиль: ${errorData.message || 'Неизвестная ошибка'}`);
        }
        const data: ProfileData = await profileRes.json();
        setProfile(data);
        setName(data.name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setInterests(data.interests || []);

        const postsRes = await fetch(`/api/posts?userId=${user.userId}&isCommunityPost=false`, { headers, cache: 'no-store' });
        if (!postsRes.ok) {
          const errorData = await postsRes.json();
          throw new Error(`Не удалось загрузить посты: ${errorData.message || 'Неизвестная ошибка'}`);
        }
        const postsData: PostData[] = await postsRes.json();
        setPosts(postsData.filter((post) => post.isCommunityPost !== true));
      } catch (err: any) {
        setError(err.message || 'Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (avatar) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(avatar);
    } else {
      setAvatarPreview(null);
    }
  }, [avatar]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) return false;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { Authorization: `Bearer ${authToken}`, 'x-user-id': user?.userId || '' };
      const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`, { headers });
      const data = await res.json();
      return res.ok && !data.exists;
    } catch {
      return false;
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading) return;
    setError(null);

    if (!username.trim()) {
      setError('Введите имя пользователя');
      return;
    }
    if (interests.length === 0) {
      setError('Выберите хотя бы один интерес');
      return;
    }
    if (interests.length > 5) {
      setError('Максимум 5 интересов');
      return;
    }

    const isUsernameAvailable = await checkUsernameAvailability(username);
    if (!isUsernameAvailable && (!profile || profile.username !== username)) {
      setError('Имя пользователя уже занято');
      return;
    }

    try {
      setSubmitting(true);
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { Authorization: `Bearer ${authToken}`, 'x-user-id': user.userId };
      const formData = new FormData();
      formData.append('name', name);
      formData.append('username', username);
      formData.append('bio', bio);
      formData.append('interests', JSON.stringify(interests));
      if (avatar) formData.append('avatar', avatar);

      const res = await fetch('/api/profile', { method: 'PUT', headers, body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Ошибка обновления профиля');
      }

      const updatedProfile: ProfileData = await res.json();
      setProfile(updatedProfile);
      setAvatar(null);
      setAvatarPreview(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при обновлении профиля');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = async (postId: string, content: string, images: File[]) => {
    if (!user) return;
    setError(null);
    try {
      setSubmitting(true);
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { Authorization: `Bearer ${authToken}`, 'x-user-id': user.userId };
      const formData = new FormData();
      formData.append('content', content);
      images.forEach((file) => formData.append('images', file));
      const res = await fetch(`/api/posts/${postId}`, { method: 'PUT', headers, body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Ошибка редактирования поста');
      }
      const updatedPost: PostData = await res.json();
      setPosts((prev: PostData[]) => prev.map((post) => (post._id === postId ? updatedPost : post)));
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при редактировании поста');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;
    setError(null);
    try {
      setSubmitting(true);
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { Authorization: `Bearer ${authToken}`, 'x-user-id': user.userId };
      console.log(`Sending DELETE request to /api/posts/${postId} with headers:`, headers);
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('handleDeletePost: Ответ сервера:', errorData);
        throw new Error(errorData.message || 'Ошибка удаления поста');
      }
      setPosts((prev: PostData[]) => prev.filter((post) => post._id !== postId));
      console.log(`Post ${postId} deleted successfully`);
    } catch (err: any) {
      console.error('handleDeletePost: Ошибка:', err.message);
      setError(err.message || 'Произошла ошибка при удалении поста');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm('Вы уверены, что хотите удалить аккаунт? Все данные будут безвозвратно удалены.')) return;

    setSubmitting(true);
    setError(null);
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { Authorization: `Bearer ${authToken}`, 'x-user-id': user.userId };
      const res = await fetch('/api/users', { method: 'DELETE', headers });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Ошибка удаления аккаунта');
      }
      localStorage.removeItem('authToken');
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Не удалось удалить аккаунт');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvatarUrl = (avatarPath?: string) => {
    if (avatarPreview) return avatarPreview;
    return avatarPath || '/default-avatar.png';
  };

  if (!isInitialized || loading) return <div className="p-4 text-center text-muted">Загрузка...</div>;
  if (!user) return null;

  return (
    <Container fluid className="telegram-profile-page">
      {error && <Alert variant="danger">{error}</Alert>}
      <Row>
        {isDesktop && (
          <Col md={3}>
            <div className="p-3">
              <h5>Профиль</h5>
              <div className="text-center mb-4">
                <Image
                  src={getAvatarUrl(profile?.avatar)}
                  alt={profile?.username || 'User Profile'}
                  width={150}
                  height={150}
                  className="rounded-circle"
                />
                <Button
                  variant="outline-primary"
                  onClick={() => avatarInputRef.current?.click()}
                  className="mt-2 w-100"
                >
                  Изменить фото
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarInputRef}
                  onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>
              <Form onSubmit={handleProfileSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Имя</Form.Label>
                  <Form.Control
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введите имя"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Имя пользователя</Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Введите @username"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Био</Form.Label>
                  <Form.Control
                    as="textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Расскажите о себе"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <div className="mb-2">
                    {interests.length > 0 ? (
                      interests.map((interest: string) => (
                        <span key={interest} className="badge bg-primary me-1">{interest}</span>
                      ))
                    ) : (
                      <p className="text-muted">Нет интересов</p>
                    )}
                  </div>
                  <Button variant="outline-secondary" onClick={() => setShowInterestsModal(true)}>
                    Выбрать интересы
                  </Button>
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteAccount}
                    disabled={submitting}
                  >
                    Удалить аккаунт
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowAboutMeModal(true)}
                    disabled={submitting}
                  >
                    Данные обо мне
                  </Button>
                </div>
              </Form>
            </div>
          </Col>
        )}
        <Col md={isDesktop ? 9 : 12}>
          <div className="post-list p-3 telegram-posts">
            <h5>Посты</h5>
            {error && <Alert variant="danger">{error}</Alert>}
            <ListGroup>
              {Array.isArray(posts) && posts.length > 0 ? (
                posts.map((post) => (
                  <ListGroup.Item key={post._id} className="border-0 mb-2">
                    <Post
                      postId={post._id}
                      username={post.userId?.username || profile?.username || 'Unknown'}
                      content={post.content || ''}
                      createdAt={post.createdAt}
                      userId={post.userId?._id || user.userId}
                      likes={post.likes || []}
                      reactions={post.reactions || []}
                      images={post.images || []}
                      comments={post.comments || []}
                      userAvatar={post.userId?.avatar || profile?.avatar || '/default-avatar.png'}
                      currentUserId={user.userId}
                      isAdmin={false}
                      isCommunityPost={post.isCommunityPost || false}
                      communityId={post.communityId || ''}
                      onEdit={(postId, content, images) => handleEditPost(postId, content, images)}
                      onDelete={() => handleDeletePost(post._id)}
                    />
                  </ListGroup.Item>
                ))
              ) : (
                <p className="text-muted text-center">Нет постов</p>
              )}
            </ListGroup>
            {!isDesktop && (
              <div className="mt-4">
                <h5>Профиль</h5>
                <div className="text-center mb-4">
                  <Image
                    src={getAvatarUrl(profile?.avatar)}
                    alt={profile?.username || 'User Profile'}
                    width={150}
                    height={150}
                    className="rounded-circle"
                  />
                  <Button
                    variant="outline-primary"
                    onClick={() => avatarInputRef.current?.click()}
                    className="mt-2 w-100"
                  >
                    Изменить фото
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarInputRef}
                    onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </div>
                <Form onSubmit={handleProfileSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Имя</Form.Label>
                    <Form.Control
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Введите имя"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Имя пользователя</Form.Label>
                    <Form.Control
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Введите @username"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Био</Form.Label>
                    <Form.Control
                      as="textarea"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Расскажите о себе"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <div className="mb-2">
                      {interests.length > 0 ? (
                        interests.map((interest: string) => (
                          <span key={interest} className="badge bg-primary me-1">{interest}</span>
                        ))
                      ) : (
                        <p className="text-muted">Нет интересов</p>
                      )}
                    </div>
                    <Button variant="outline-secondary" onClick={() => setShowInterestsModal(true)}>
                      Выбрать интересы
                    </Button>
                  </Form.Group>
                  <div className="d-flex gap-2 flex-column flex-md-row">
                    <Button variant="primary" type="submit" disabled={submitting}>
                      {submitting ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDeleteAccount}
                      disabled={submitting}
                    >
                      Удалить аккаунт
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowAboutMeModal(true)}
                      disabled={submitting}
                    >
                      Данные обо мне
                    </Button>
                  </div>
                </Form>
              </div>
            )}
          </div>
        </Col>
      </Row>
      <Modal show={showInterestsModal} onHide={() => setShowInterestsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Выберите интересы</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {PREDEFINED_INTERESTS.map((interest) => (
            <FormCheck
              key={interest}
              type="checkbox"
              label={interest}
              checked={interests.includes(interest)}
              onChange={() => {
                setInterests((prev: string[]) =>
                  prev.includes(interest)
                    ? prev.filter((i) => i !== interest)
                    : prev.length < 5
                    ? [...prev, interest]
                    : prev
                );
              }}
              className="mb-2"
            />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInterestsModal(false)}>
            Закрыть
          </Button>
          <Button variant="primary" onClick={() => setShowInterestsModal(false)}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showAboutMeModal} onHide={() => setShowAboutMeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Данные обо мне</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Мы собираем следующие данные о вашей активности:</p>
          <ListGroup>
            <ListGroup.Item>Посты</ListGroup.Item>
            <ListGroup.Item>Комментарии</ListGroup.Item>
            <ListGroup.Item>Лайки</ListGroup.Item>
            <ListGroup.Item>Реакции</ListGroup.Item>
            <ListGroup.Item>Интересы</ListGroup.Item>
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAboutMeModal(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}