'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { Container, Row, Col, Form, Button, Alert, Modal, FormCheck } from 'react-bootstrap';
import Image from 'next/image';

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
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false); // Инициализируем как false
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Устанавливаем isDesktop только на клиенте
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    handleResize(); // Устанавливаем начальное значение
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isInitialized || !user) {
      if (!user) router.replace('/login');
      return;
    }
    setLoading(true);
    const fetchProfile = async () => {
      try {
        const authToken = localStorage.getItem('authToken') || '';
        const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
        if (user.userId) headers['x-user-id'] = user.userId;
        const res = await fetch('/api/profile', {
          headers,
          cache: 'no-store',
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Не удалось загрузить профиль: ${res.status} ${errorData.error || ''}`);
        }
        const data: ProfileData = await res.json();
        setProfile(data);
        setName(data.name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setInterests(data.interests || []);
        setLoading(false);
      } catch (err: any) {
        console.error('ProfilePage: Ошибка загрузки профиля:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isInitialized, user, router]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) return false;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
      if (user?.userId) headers['x-user-id'] = user.userId;
      const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`, {
        headers,
      });
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

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }

      const updatedProfile: ProfileData = await res.json();
      setProfile(updatedProfile);
      setAvatar(null);
      setShowInterestsModal(false);
      router.refresh();
    } catch (err: any) {
      console.error('ProfilePage: Ошибка обновления:', err.message);
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
    if (!avatarPath) return '/default-avatar.png';
    return avatarPath; // Используем относительный путь
  };

  if (!isInitialized || loading) return <div>Загрузка...</div>;
  if (!user) return null;

  return (
    <Container fluid>
      <Row>
        {isDesktop && (
          <Col md={3} className="border-end">
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
                <Button variant="outline-primary" onClick={handleAvatarChange} className="mt-2">
                  Изменить аватар
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
                      interests.map((interest) => (
                        <span key={interest} className="badge bg-primary me-1">
                          {interest}
                        </span>
                      ))
                    ) : <p>Нет интересов</p>}
                  </div>
                  <Button
                    variant="outline-primary"
                    onClick={() => setShowInterestsModal(true)}
                  >
                    Выбрать интересы
                  </Button>
                </Form.Group>
                <Button variant="primary" type="submit">
                  Сохранить
                </Button>
              </Form>
            </div>
          </Col>
        )}
        <Col md={isDesktop ? 9 : 12}>
          <div className="p-3">
            {error && <Alert variant="danger">{error}</Alert>}
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
                  <Button variant="outline-primary" onClick={handleAvatarChange} className="mt-2">
                    Изменить аватар
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
                        interests.map((interest) => (
                          <span key={interest} className="badge bg-primary me-1">
                            {interest}
                          </span>
                        ))
                      ) : <p>Нет интересов</p>}
                    </div>
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowInterestsModal(true)}
                    >
                      Выбрать интересы
                    </Button>
                  </Form.Group>
                  <Button variant="primary" type="submit">
                    Сохранить
                  </Button>
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
              onChange={() => handleInterestToggle(interest)}
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
    </Container>
  );
}