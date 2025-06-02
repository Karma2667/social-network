'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { Container, ListGroup, Button, Alert } from 'react-bootstrap';

interface FriendRequest {
  _id: string;
  username: string;
}

interface Friend {
  _id: string;
  username: string;
}

export default function FriendsPage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized || !user) return;

    const fetchFriends = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/friends', {
          headers: {
            'x-user-id': user.userId,
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setFriendRequests(data.requests || []);
          setFriends(data.friends || []);
        } else {
          setError(data.error || 'Ошибка загрузки данных');
        }
      } catch (err: any) {
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [isInitialized, user]);

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      if (!user) return;
      const res = await fetch('/api/friends', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((req) => req._id !== requestId));
        if (action === 'accept') {
          const request = friendRequests.find((req) => req._id === requestId);
          if (request) {
            setFriends((prev) => [...prev, { _id: request._id, username: request.username }]);
          }
        }
      } else {
        setError(data.error || 'Ошибка при обработке запроса');
      }
    } catch (err: any) {
      setError('Ошибка при обработке запроса');
    }
  };

  if (!isInitialized || loading) {
    return <div>Загрузка...</div>;
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <Container className="p-4">
      {error && <Alert variant="danger">{error}</Alert>}
      <h1>Друзья</h1>
      <h2>Запросы на дружбу</h2>
      {friendRequests.length === 0 ? (
        <p>Нет запросов</p>
      ) : (
        <ListGroup className="mb-4">
          {friendRequests.map((request) => (
            <ListGroup.Item key={request._id} className="d-flex justify-content-between align-items-center">
              <span>@{request.username}</span>
              <div>
                <Button
                  variant="success"
                  size="sm"
                  className="me-2"
                  onClick={() => handleRequestAction(request._id, 'accept')}
                >
                  Принять
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRequestAction(request._id, 'reject')}
                >
                  Отклонить
                </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
      <h2>Мои друзья</h2>
      {friends.length === 0 ? (
        <p>У вас нет друзей</p>
      ) : (
        <ListGroup>
          {friends.map((friend) => (
            <ListGroup.Item key={friend._id}>@{friend.username}</ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </Container>
  );
}