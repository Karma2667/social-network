'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Form, Button, Alert, Modal, FormCheck, Image } from 'react-bootstrap';
import { useAuth } from '@/app/lib/ClientAuthProvider';

const INTERESTS = [
  'Программирование', 'Музыка', 'Игры', 'Путешествия', 'Спорт',
  'Книги', 'Фильмы', 'Кулинария', 'Искусство', 'Наука',
];

interface ProfileData {
  _id: string;
  username: string;
  name?: string;
  bio: string;
  avatar?: string;
  interests: string[];
}

export default function Profile() {
  const { userId, isInitialized, username } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isInitialized || !userId) {
      console.log('Profile: Ожидание инициализации или userId');
      return;
    }
    setLoading(true);
    const fetchProfile = async () => {
      try {
        const authToken = localStorage.getItem('authToken') || '';
        const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
        if (userId) headers['x-user-id'] = userId;
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
        setNewUsername(data.username || '');
        setName(data.name || '');
        setBio(data.bio || '');
        setInterests(data.interests || []);
        setLoading(false);
      } catch (err: any) {
        console.error('Profile: Ошибка загрузки профиля:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, isInitialized]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) return false;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
      if (userId) headers['x-user-id'] = userId;
      const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`, {
        headers,
      });
      const data = await res.json();
      return res.ok && !data.exists;
    } catch {
      return false;
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userId) {
      setError('Пользователь не аутентифицирован');
      return;
    }
    if (!newUsername.trim()) {
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

    const isUsernameAvailable = await checkUsernameAvailability(newUsername);
    if (!isUsernameAvailable && (!profile || profile.username !== newUsername)) {
      setError('Имя пользователя уже занято');
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = { 'Authorization': `Bearer ${authToken}` };
      if (userId) headers['x-user-id'] = userId;
      const formData = new FormData();
      formData.append('name', name || '');
      formData.append('username', newUsername);
      formData.append('bio', bio || '');
      formData.append('interests', JSON.stringify(interests));
      if (avatar) formData.append('avatar', avatar);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Не удалось обновить профиль: ${res.status} ${errorData.error || ''}`);
      }

      const updatedProfile: ProfileData = await res.json();
      setProfile(updatedProfile);
      setAvatar(null);
      setShowInterestsModal(false);
    } catch (err: any) {
      console.error('Profile: Ошибка обновления:', err.message);
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

  if (!isInitialized || loading) return <div>Загрузка...</div>;
  if (!userId) return null;

  return (
    <Container className="telegram-profile">
      <h2>Профиль @{username}</h2>
      <div className="text-center mb-4">
        <Image
          src={profile?.avatar || '/default-avatar.png'}
          alt="Аватар"
          roundedCircle
          className="telegram-profile-avatar"
          style={{ width: '150px', height: '150px' }}
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
      {error && <Alert variant="danger">{error}</Alert>}
      {profile && (
        <Form onSubmit={handleUpdate} className="w-100" style={{ maxWidth: '400px' }}>
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
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Введите @username"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Биография</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Расскажите о себе"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Button
              variant="outline-primary"
              onClick={() => setShowInterestsModal(true)}
            >
              Выбрать интересы
            </Button>
          </Form.Group>
          <Button variant="primary" type="submit">
            Обновить профиль
          </Button>
        </Form>
      )}
      <Modal show={showInterestsModal} onHide={() => setShowInterestsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Выберите интересы</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {INTERESTS.map((interest) => (
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
      <h4 className="mt-4">Мои интересы</h4>
      <div>
        {profile?.interests.length ? (
          profile.interests.map((interest) => (
            <span key={interest} className="badge bg-primary me-1">
              {interest}
            </span>
          ))
        ) : (
          <p>Выберите интересы, чтобы другие могли вас найти!</p>
        )}
      </div>
    </Container>
  );
}