'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Modal, FormCheck } from 'react-bootstrap';
import { useAuth } from '@/app/lib/ClientAuthProvider';

const INTERESTS = [
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

interface ProfileData {
  username: string;
  name?: string;
  bio: string;
  avatar: string;
  interests: string[];
}

export default function Profile() {
  const { userId, isInitialized, username } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('Profile: Инициализация, userId:', userId, 'isInitialized:', isInitialized, 'username:', username);

  useEffect(() => {
    if (!isInitialized || !userId) {
      console.log('Profile: Ожидание инициализации или userId');
      return;
    }
    setLoading(true);
    const fetchProfile = async () => {
      console.log('Profile: Загрузка профиля для userId:', userId);
      try {
        const authToken = localStorage.getItem('authToken') || '';
        const res = await fetch('/api/profile', {
          headers: {
            'x-user-id': userId,
            'Authorization': `Bearer ${authToken}`,
          },
          cache: 'no-store',
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Не удалось загрузить профиль: ${res.status} ${errorData.error || ''}`);
        }
        const data: ProfileData = await res.json();
        console.log('Profile: Данные профиля:', data);
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userId) {
      setError('Пользователь не аутентифицирован');
      console.log('Profile: Ошибка: Пользователь не аутентифицирован');
      return;
    }
    if (interests.length === 0) {
      setError('Выберите хотя бы один интерес');
      console.log('Profile: Ошибка: Не выбраны интересы');
      return;
    }
    try {
      let avatarUrl = profile?.avatar || '/default-avatar.png';
      if (avatar) {
        const formData = new FormData();
        formData.append('files', avatar);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) throw new Error('Не удалось загрузить аватар');
        const { files } = await uploadRes.json();
        avatarUrl = files[0];
      }

      if (interests.length > 5) {
        setError('Максимум 5 интересов');
        console.log('Profile: Ошибка: Слишком много интересов:', interests);
        return;
      }

      const updateData = { username: newUsername, name, bio, avatar: avatarUrl, interests };
      console.log('Profile: Обновление профиля:', updateData);
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Не удалось обновить профиль: ${res.status} ${errorData.error || ''}`);
      }
      const updatedProfile: ProfileData = await res.json();
      console.log('Profile: Профиль обновлен:', updatedProfile);
      setProfile(updatedProfile);
      setAvatar(null);
      setShowInterestsModal(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Profile: Ошибка обновления:', err.message);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  if (!isInitialized || loading) {
    console.log('Profile: Рендеринг: Загрузка...');
    return <div>Загрузка...</div>;
  }
  if (!userId) {
    console.log('Profile: Рендеринг: Нет userId, ожидание перенаправления');
    return null;
  }

  console.log('Profile: Рендеринг формы, profile:', profile);

  return (
    <Container className="telegram-profile">
      <h2>Профиль @{username}</h2>
      <img
        src={profile?.avatar || '/default-avatar.png'}
        alt="Аватар"
        className="telegram-profile-avatar"
      />
      {error && <Alert variant="danger">{error}</Alert>}
      {profile ? (
        <Form onSubmit={handleUpdate} className="w-100" style={{ maxWidth: '400px' }}>
          <Form.Group className="mb-3">
            <Form.Label>Никнейм</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите никнейм"
              className="telegram-post-input"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Имя пользователя</Form.Label>
            <Form.Control
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              className="telegram-post-input"
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
              className="telegram-post-input"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Button
              variant="outline-primary"
              onClick={() => setShowInterestsModal(true)}
              className="telegram-profile-button"
            >
              Выбрать интересы
            </Button>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Аватар</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e) => {
                const files = (e.target as HTMLInputElement).files;
                setAvatar(files && files.length > 0 ? files[0] : null);
              }}
              className="telegram-post-input"
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="telegram-profile-button">
            Обновить профиль
          </Button>
        </Form>
      ) : (
        <p>Профиль не загружен</p>
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
          <Button
            variant="secondary"
            onClick={() => setShowInterestsModal(false)}
          >
            Закрыть
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowInterestsModal(false)}
            className="telegram-profile-button"
          >
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
      <h4 className="mt-4">Мои интересы</h4>
      <div>
        {profile && profile.interests && profile.interests.length > 0 ? (
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