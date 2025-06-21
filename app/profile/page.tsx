'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

const PREDEFINED_INTERESTS = [
  'Программирование', 'Музыка', 'Игры', 'Путешествия', 'Спорт',
  'Книги', 'Фильмы', 'Кулинария', 'Искусство', 'Наука',
];

export default function ProfilePage() {
  const { id: profileId } = useParams();
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
  const [posts, setPosts] = useState<any[]>([]);
  const [postContent, setPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
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
    if (!isInitialized) {
      console.log('ProfilePage: Ожидание инициализации AuthContext...');
      return;
    }

    if (!user) {
      console.log('ProfilePage: Пользователь не авторизован, редирект на /login');
      router.replace('/login');
      return;
    }

    setLoading(true);
    const fetchProfileAndPosts = async () => {
      try {
        const authToken = localStorage.getItem('authToken') || '';
        const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
        if (user.userId) headers['x-user-id'] = user.userId;

        const profileUrl = profileId ? `/api/users/${profileId}` : '/api/profile';
        const profileRes = await fetch(profileUrl, { headers, cache: 'no-store' });
        if (!profileRes.ok) {
          const errorData = await profileRes.json();
          throw new Error(`Не удалось загрузить профиль: ${profileRes.status} ${errorData.error || ''}`);
        }
        const data: ProfileData = await profileRes.json();
        setProfile(data);
        setName(data.name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setInterests(data.interests || []);

        const postsRes = await fetch('/api/posts', { headers, cache: 'no-store' });
        if (!postsRes.ok) {
          const errorData = await postsRes.json();
          throw new Error('Не удалось загрузить посты');
        }
        const postsData = await postsRes.json();
        setPosts(postsData);
      } catch (err: any) {
        console.error('ProfilePage: Ошибка загрузки:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndPosts();
  }, [isInitialized, user, router, profileId]);

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
      const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
      if (user?.userId) headers['x-user-id'] = user.userId;
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
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
      if (user.userId) headers['x-user-id'] = user.userId;
      const formData = new FormData();
      formData.append('name', name);
      formData.append('username', username);
      formData.append('bio', bio);
      formData.append('interests', JSON.stringify(interests));
      if (avatar) formData.append('avatar', avatar);

      const res = await fetch('/api/profile', { method: 'PUT', headers, body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }

      const updatedProfile: ProfileData = await res.json();
      setProfile(updatedProfile);
      setAvatar(null);
      setAvatarPreview(null);
      router.refresh();
    } catch (err: any) {
      console.error('ProfilePage: Ошибка обновления:', err.message);
      setError(err.message);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting || !postContent.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}`, 'x-user-id': user.userId };
      const url = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
      const method = editingPostId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify({ content: postContent, userId: user.userId }), cache: 'no-store' });

      if (!res.ok) {
        const errorData = await res.json();
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
      console.error('ProfilePage: Ошибка с постом:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = (postId: string, content: string) => {
    setPostContent(content);
    setEditingPostId(postId);
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}`, 'x-user-id': user.userId };
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE', headers });
      if (res.ok) {
        setPosts((prev) => prev.filter((post) => post._id !== postId));
      }
    } catch (err: any) {
      console.error('ProfilePage: Ошибка удаления поста:', err.message);
      setError(err.message);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
        ? [...prev, interest]
        : prev
    );
  };

  const handleAvatarChange = () => {
    if (avatarInputRef.current) avatarInputRef.current.click();
  };

  const getAvatarUrl = (avatarPath?: string) => {
    if (avatarPreview) return avatarPreview;
    return avatarPath || '/default-avatar.png';
  };

  const isOwnProfile = () => !profileId || (user && profile && user.userId === profile._id);

  if (!isInitialized || loading) return <div>Загрузка...</div>;
  if (!user) return null;

  return (
    <Container fluid>
      <Row>
        {isDesktop && (
          <Col md={3} className="border-end telegram-sidebar">
            <div className="p-3">
              <h5>Профиль</h5>
              <div className="text-center mb-4">
                <Image
                  src={getAvatarUrl(profile?.avatar)}
                  alt={profile?.username || 'User Profile'}
                  width={150}
                  height={150}
                  className="rounded-circle telegram-profile-avatar"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                />
                {isOwnProfile() && (
                  <Button variant="outline-primary" onClick={handleAvatarChange} className="mt-2 w-100">
                    Изменить аватар
                  </Button>
                )}
                {isOwnProfile() && (
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarInputRef}
                    onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                )}
              </div>
              {isOwnProfile() && (
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
                        interests.map((interest) => (
                          <span key={interest} className="badge bg-primary me-1 telegram-profile-button">
                            {interest}
                          </span>
                        ))
                      ) : <p>Нет интересов</p>}
                    </div>
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowInterestsModal(true)}
                      className="telegram-profile-button"
                    >
                      Выбрать интересы
                    </Button>
                  </Form.Group>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </Form>
              )}
              {!isOwnProfile() && profile && (
                <div>
                  <h5>@{profile.username}</h5>
                  {profile.name && <p>Имя: {profile.name}</p>}
                  {profile.bio && <p>О себе: {profile.bio}</p>}
                  {profile.interests.length > 0 && (
                    <p>
                      Интересы:{' '}
                      {profile.interests.map((interest) => (
                        <span key={interest} className="badge bg-primary me-1">
                          {interest}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Col>
        )}
        <Col md={isDesktop ? 9 : 12}>
          <div className="p-3 telegram-posts">
            <h5>Посты</h5>
            {isOwnProfile() && (
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
                    onClick={() => { setPostContent(''); setEditingPostId(null); }}
                    disabled={submitting}
                  >
                    Отмена
                  </Button>
                )}
              </Form>
            )}
            {error && <Alert variant="danger">{error}</Alert>}
            <ListGroup>
              {posts.map((post) => (
                <ListGroup.Item key={post._id} className="telegram-post-item">
                  <Post
                    postId={post._id}
                    username={post.userId.username}
                    content={post.content}
                    createdAt={post.createdAt}
                    userId={post.userId._id}
                    likes={post.likes || []}
                    reactions={post.reactions || []}
                    images={post.images || []}
                    comments={post.comments || []}
                    userAvatar={post.userId.avatar || '/default-avatar.png'}
                    fetchPosts={async () => {
                      const authToken = localStorage.getItem('authToken') || '';
                      const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}`, 'x-user-id': user.userId };
                      const res = await fetch('/api/posts', { headers, cache: 'no-store' });
                      if (res.ok) setPosts(await res.json());
                    }}
                    onDelete={handleDeletePost}
                    currentUserId={user.userId}
                    isAdmin={false}
                  />
                </ListGroup.Item>
              ))}
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
                    className="rounded-circle telegram-profile-avatar"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                  />
                  {isOwnProfile() && (
                    <Button variant="outline-primary" onClick={handleAvatarChange} className="mt-2 w-100">
                      Изменить аватар
                    </Button>
                  )}
                  {isOwnProfile() && (
                    <input
                      type="file"
                      accept="image/*"
                      ref={avatarInputRef}
                      onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                  )}
                </div>
                {isOwnProfile() ? (
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
                          interests.map((interest) => (
                            <span key={interest} className="badge bg-primary me-1 telegram-profile-button">
                              {interest}
                            </span>
                          ))
                        ) : <p>Нет интересов</p>}
                      </div>
                      <Button
                        variant="outline-primary"
                        onClick={() => setShowInterestsModal(true)}
                        className="telegram-profile-button"
                      >
                        Выбрать интересы
                      </Button>
                    </Form.Group>
                    <Button variant="primary" type="submit" disabled={submitting}>
                      {submitting ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </Form>
                ) : profile && (
                  <div>
                    <h5>@{profile.username}</h5>
                    {profile.name && <p>Имя: {profile.name}</p>}
                    {profile.bio && <p>О себе: {profile.bio}</p>}
                    {profile.interests.length > 0 && (
                      <p>
                        Интересы:{' '}
                        {profile.interests.map((interest) => (
                          <span key={interest} className="badge bg-primary me-1">
                            {interest}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                )}
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
              checked={interests.includes(interest)}
              onChange={() => handleInterestToggle(interest)}
              className="mb-2"
            />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInterestsModal(false)} className="telegram-profile-button">
            Закрыть
          </Button>
          <Button variant="primary" onClick={() => setShowInterestsModal(false)} className="telegram-profile-button">
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}