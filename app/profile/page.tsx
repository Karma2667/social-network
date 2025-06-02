'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { Container, Row, Col, Form, Button, Alert, ListGroup, Modal, FormCheck, Image } from 'react-bootstrap';

interface ProfileData {
  _id: string;
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

export default function ProfilePage() {
  const { id: profileId } = useParams();
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postContent, setPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (!isInitialized || !user) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const authToken = localStorage.getItem('authToken') || '';
        const profileUrl = profileId ? `/api/users/${profileId}` : '/api/profile';
        const res = await fetch(profileUrl, {
          headers: {
            'x-user-id': user.userId,
            'Authorization': `Bearer ${authToken}`,
          },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();
        setProfile({
          _id: data._id,
          name: data.name || '',
          username: data.username || '',
          bio: data.bio || '',
          interests: data.interests || [],
        });
        setSelectedInterests(data.interests || []);
        setPosts(data.posts || []);
        setFriendStatus(data.friendStatus || 'none');
        setIsFollowing(data.isFollowing || false); // Предполагаем, что API возвращает isFollowing
      } catch (error: any) {
        console.error('Fetch profile error:', error.message);
        setError('Ошибка загрузки профиля');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isInitialized, user, profileId]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !isOwnProfile()) return;
    setSubmitting(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const updateData = { ...profile, interests: selectedInterests };
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.userId || '',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }

      const updatedProfile = await res.json();
      localStorage.setItem('username', updatedProfile.username);
      setProfile({
        _id: updatedProfile._id,
        name: updatedProfile.name || '',
        username: updatedProfile.username || '',
        bio: updatedProfile.bio || '',
        interests: updatedProfile.interests || [],
      });
      setSelectedInterests(updatedProfile.interests || []);
    } catch (err: any) {
      console.error('Ошибка обновления:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !postContent.trim() || !isOwnProfile()) return;
    setSubmitting(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const url = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
      const method = editingPostId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.userId || '',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content: postContent, userId: user?.userId }),
      });

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
      console.error('Ошибка с постом:', err.message);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = (post: any) => {
    if (!isOwnProfile()) return;
    setPostContent(post.content);
    setEditingPostId(post._id);
  };

  const handleDeletePost = async (postId: string) => {
    if (!isOwnProfile()) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.userId || '',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((post) => post._id !== postId));
      }
    } catch (err: any) {
      console.error('Ошибка удаления поста:', err.message);
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

  const handleFriendRequest = async () => {
    if (!user || !profile || isOwnProfile()) return;

    try {
      const authToken = localStorage.getItem('authToken') || '';
      if (friendStatus === 'pending') {
        const res = await fetch(`/api/friends?requestId=${friendStatus}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.userId,
            'Authorization': `Bearer ${authToken}`,
          },
        });
        if (res.ok) setFriendStatus('none');
      } else if (friendStatus === 'none') {
        const res = await fetch('/api/friends', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.userId,
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ toUserId: profile._id }),
        });
        if (res.ok) setFriendStatus('pending');
      }
    } catch (error: any) {
      console.error('Ошибка при обработке запроса:', error.message);
      setError('Ошибка при отправке запроса');
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !profile || isOwnProfile()) return;

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const action = isFollowing ? 'unfollow' : 'follow';
      const method = action === 'follow' ? 'POST' : 'PUT';
      const res = await fetch('/api/friends', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ toUserId: profile._id, action }),
      });
      if (res.ok) {
        setIsFollowing(!isFollowing);
      } else {
        const data = await res.json();
        setError(data.error || 'Ошибка при подписке');
      }
    } catch (error: any) {
      console.error('Ошибка при подписке:', error.message);
      setError('Ошибка при подписке');
    }
  };

  const isOwnProfile = () => {
    return !profileId || (user && profile && user.userId === profile._id);
  };

  if (!isInitialized || loading) {
    return <div>Загрузка...</div>;
  }

  if (!user || !profile) {
    router.replace('/login');
    return null;
  }

  return (
    <Container fluid>
      <Row>
        {isDesktop && (
          <Col md={3} className="border-end telegram-sidebar">
            <div className="p-3">
              <h5>Профиль</h5>
              {isOwnProfile() ? (
                <Form onSubmit={handleProfileSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Имя</Form.Label>
                    <Form.Control
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value } as ProfileData)}
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
                      onChange={(e) => setProfile({ ...profile, username: e.target.value } as ProfileData)}
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
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value } as ProfileData)}
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
                </Form>
              ) : (
                <div>
                  <Image
                    src="/default-avatar.png"
                    alt={profile.username}
                    roundedCircle
                    className="telegram-profile-avatar mb-3"
                  />
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
                  <Button
                    variant={friendStatus === 'pending' ? 'warning' : friendStatus === 'friends' ? 'success' : 'primary'}
                    onClick={handleFriendRequest}
                    disabled={friendStatus === 'friends'}
                    className="telegram-profile-button mt-2 me-2"
                  >
                    {friendStatus === 'pending' ? 'Отменить запрос' : friendStatus === 'friends' ? 'Друзья' : 'Добавить в друзья'}
                  </Button>
                  <Button
                    variant={isFollowing ? 'secondary' : 'outline-primary'}
                    onClick={handleFollowToggle}
                    className="telegram-profile-button mt-2"
                  >
                    {isFollowing ? 'Отписаться' : 'Подписаться'}
                  </Button>
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
            )}
            {error && <Alert variant="danger">{error}</Alert>}
            <ListGroup>
              {posts.map((post) => (
                <ListGroup.Item key={post._id} className="telegram-post-item">
                  <p>{post.content}</p>
                  {isOwnProfile() && (
                    <>
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
                    </>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
            {!isDesktop && (
              <div className="mt-4">
                <h5>Профиль</h5>
                {isOwnProfile() ? (
                  <Form onSubmit={handleProfileSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Имя</Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value } as ProfileData)}
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
                        onChange={(e) => setProfile({ ...profile, username: e.target.value } as ProfileData)}
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
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value } as ProfileData)}
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
                  </Form>
                ) : (
                  <div>
                    <Image
                      src="/default-avatar.png"
                      alt={profile.username}
                      roundedCircle
                      className="telegram-profile-avatar mb-3"
                    />
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
                    <Button
                      variant={friendStatus === 'pending' ? 'warning' : friendStatus === 'friends' ? 'success' : 'primary'}
                      onClick={handleFriendRequest}
                      disabled={friendStatus === 'friends'}
                      className="telegram-profile-button mt-2 me-2"
                    >
                      {friendStatus === 'pending' ? 'Отменить запрос' : friendStatus === 'friends' ? 'Друзья' : 'Добавить в друзья'}
                    </Button>
                    <Button
                      variant={isFollowing ? 'secondary' : 'outline-primary'}
                      onClick={handleFollowToggle}
                      className="telegram-profile-button mt-2"
                    >
                      {isFollowing ? 'Отписаться' : 'Подписаться'}
                    </Button>
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
              setProfile((prev) => prev ? { ...prev, interests: selectedInterests } : null);
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