'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Form, Image } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';

interface ProfileProps {
  userId: string;
  username: string;
  name?: string;
  bio?: string;
  avatar?: string;
  interests?: string[];
}

export default function Profile({ userId, username, name, bio, avatar, interests }: ProfileProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name || '');
  const [editedBio, setEditedBio] = useState(bio || '');
  const [editedInterests, setEditedInterests] = useState(interests || []);

  useEffect(() => {
    setEditedName(name || '');
    setEditedBio(bio || '');
    setEditedInterests(interests || []);
  }, [name, bio, interests]);

  const handleSave = async () => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: editedName, bio: editedBio, interests: editedInterests }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось обновить профиль');
      }

      setIsEditing(false);
    } catch (err: any) {
      console.error('Profile: Ошибка обновления:', err.message);
    }
  };

  const avatarUrl = avatar && avatar.trim() && avatar !== '/default-avatar.png'
    ? avatar
    : '/default-avatar.png';

  return (
    <Card className="telegram-profile-card">
      <Card.Body>
        <div className="text-center mb-4">
          <Image
            src={avatarUrl}
            alt="Аватар"
            roundedCircle
            className="telegram-profile-avatar"
            style={{ width: '150px', height: '150px' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
          />
        </div>
        {isEditing ? (
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Имя</Form.Label>
              <Form.Control
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Введите имя"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Биография</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                placeholder="Расскажите о себе"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Интересы</Form.Label>
              <div>
                {editedInterests.map((interest, index) => (
                  <span key={index} className="badge bg-primary me-1 mb-1">
                    {interest}
                  </span>
                ))}
                <Button
                  variant="outline-primary"
                  onClick={() => {/* Логика выбора интересов */}}
                  className="mt-2"
                >
                  Добавить интерес
                </Button>
              </div>
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="primary" onClick={handleSave}>
                Сохранить
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Отмена
              </Button>
            </div>
          </Form>
        ) : (
          <>
            <Card.Title className="text-center">{username}</Card.Title>
            {name && <Card.Text className="text-center">Имя: {name}</Card.Text>}
            {bio && <Card.Text className="text-center">О себе: {bio}</Card.Text>}
            {interests && interests.length > 0 && (
              <Card.Text className="text-center">
                Интересы:{' '}
                {interests.map((interest, index) => (
                  <span key={index} className="badge bg-primary me-1">
                    {interest}
                  </span>
                ))}
              </Card.Text>
            )}
            {user && user.userId === userId && (
              <Button variant="outline-primary" onClick={() => setIsEditing(true)} className="w-100 mt-3">
                Редактировать профиль
              </Button>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}