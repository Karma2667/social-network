'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';

export default function Profile() {
  const { userId, isInitialized, setUserId } = useAuth();
  const [profile, setProfile] = useState<{ username: string; bio: string; avatar: string } | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Profile: Проверка userId:', { userId, storedUserId: localStorage.getItem('userId') });
    if (!isInitialized) {
      console.log('Profile: Ожидание инициализации AuthContext');
      return;
    }
    const storedUserId = localStorage.getItem('userId');
    if (!userId && storedUserId) {
      console.log('Profile: userId отсутствует, но найден в localStorage:', storedUserId);
      setUserId(storedUserId);
      return;
    }
    if (!userId && !storedUserId) {
      console.log('Profile: Нет userId, перенаправление на /login');
      window.location.replace('/login');
      return;
    }
    if (userId) {
      setLoading(true);
      const fetchProfile = async () => {
        try {
          console.log('Profile: Загрузка профиля для userId:', userId);
          const res = await fetch('/api/users/profile', {
            headers: { 'x-user-id': userId },
          });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Не удалось загрузить профиль');
          }
          const data = await res.json();
          console.log('Profile: Профиль загружен:', data);
          setProfile(data);
          setUsername(data.username || '');
          setBio(data.bio || '');
          setLoading(false);
        } catch (err: any) {
          console.error('Profile: Ошибка загрузки профиля:', err.message);
          setError(err.message);
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [userId, isInitialized, setUserId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userId) {
      console.error('Profile: Пользователь не аутентифицирован');
      setError('Пользователь не аутентифицирован');
      return;
    }
    try {
      let avatarUrl = profile?.avatar || '/default-avatar.png';
      if (avatar) {
        const formData = new FormData();
        formData.append('files', avatar);
        console.log('Profile: Отправка файла на /api/upload:', avatar.name);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          console.error('Profile: Ошибка загрузки аватара:', errorData);
          throw new Error(errorData.error || 'Не удалось загрузить аватар');
        }
        const { files } = await uploadRes.json();
        avatarUrl = files[0];
        console.log('Profile: Аватар загружен:', avatarUrl);
      }

      const updateData = { username, bio, avatar: avatarUrl };
      console.log('Profile: Отправка обновления профиля:', updateData);
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = await res.text();
        }
        console.error('Profile: Ошибка API:', { status: res.status, errorData });
        throw new Error(errorData.error || errorData || `Ошибка ${res.status}: Не удалось обновить профиль`);
      }

      const updatedProfile = await res.json();
      console.log('Profile: Профиль успешно обновлен:', updatedProfile);
      setProfile(updatedProfile);
      setAvatar(null);
    } catch (err: any) {
      console.error('Profile: Ошибка обновления профиля:', err.message);
      setError(err.message);
    }
  };

  if (!isInitialized || loading) {
    console.log('Profile: Рендеринг: Ожидание инициализации или загрузки');
    return <div>Загрузка...</div>;
  }

  if (!userId && !localStorage.getItem('userId')) {
    console.log('Profile: Рендеринг: Нет userId, перенаправление на /login');
    window.location.replace('/login');
    return null;
  }

  return (
    <Container className="my-4">
      <h2>Профиль</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {profile ? (
        <Form onSubmit={handleUpdate}>
          <Form.Group className="mb-3">
            <Form.Label>Имя пользователя</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
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
            <Form.Label>Аватар</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e) => {
                const files = (e.target as HTMLInputElement).files;
                setAvatar(files && files.length > 0 ? files[0] : null);
              }}
            />
            {profile.avatar && (
              <img
                src={profile.avatar}
                alt="Аватар"
                style={{ width: '100px', height: '100px', marginTop: '10px' }}
              />
            )}
          </Form.Group>
          <Button variant="primary" type="submit">
            Обновить профиль
          </Button>
        </Form>
      ) : (
        <p>Профиль не загружен</p>
      )}
    </Container>
  );
}