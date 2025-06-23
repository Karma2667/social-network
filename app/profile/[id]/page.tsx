'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { Container, Alert, Image, ListGroup, Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from 'react-bootstrap';
import Post from '@/app/Components/Post';

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
  createdAt: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: CommentData[];
}

interface ProfileData {
  _id: string;
  username: string;
  name?: string;
  bio: string;
  avatar?: string;
  interests: string[];
  friendStatus: 'none' | 'pending' | 'friends';
  isFollowing: boolean;
}

interface ProfileView {
  _id: string;
  userId: string;
  viewerId: { _id: string; username: string };
  viewedAt: string;
}

export default function Profile() {
  const { user, isInitialized } = useAuth();
  const { id: profileId } = useParams() as { id: string };
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [profileViews, setProfileViews] = useState<ProfileView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showViewLogModal, setShowViewLogModal] = useState(false);

  const fetchProfileAndPosts = async () => {
    if (!user || !profileId) return;

    setLoading(true);
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'x-user-id': user.userId,
      };

      // Логируем просмотр профиля, если это не текущий пользователь
      if (user.userId !== profileId) {
        await fetch('/api/profile/views', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'x-user-id': user.userId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ profileId }),
        });
      }

      const profileRes = await fetch(`/api/users/${profileId}`, { headers, cache: 'no-store' });
      if (!profileRes.ok) throw new Error(`Не удалось загрузить профиль: ${await profileRes.text()}`);

      const profileData: ProfileData = await profileRes.json();
      setProfile(profileData);

      const postsRes = await fetch(`/api/posts?userId=${profileId}`, { headers, cache: 'no-store' });
      if (!postsRes.ok) throw new Error(`Не удалось загрузить посты: ${await postsRes.text()}`);

      const postsData = await postsRes.json();
      setPosts(Array.isArray(postsData) ? postsData : []);

      // Загружаем журнал посещений, если это профиль текущего пользователя
      if (profileId === user.userId) {
        const viewsRes = await fetch('/api/profile/views', { headers, cache: 'no-store' });
        if (!viewsRes.ok) throw new Error(`Не удалось загрузить журнал посещений: ${await viewsRes.text()}`);
        const viewsData: ProfileView[] = await viewsRes.json();
        setProfileViews(viewsData);
      }
    } catch (err: any) {
      setError(err.message.includes('404') ? 'Пользователь не найден' : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized || !user || !profileId) {
      setError(!profileId ? 'Неверный идентификатор профиля' : 'Не авторизован');
      setLoading(false);
      return;
    }

    fetchProfileAndPosts();
  }, [isInitialized, user, profileId]);

  const handleAddFriend = async () => {
    if (!user || !profileId) return;

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-user-id': user.userId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toUserId: profileId, action: 'friend' }),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Не удалось отправить запрос на дружбу');

      await fetchProfileAndPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !profileId) return;

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/friends?requestId=${profile?._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-user-id': user.userId,
        },
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Не удалось отменить запрос на дружбу');

      await fetchProfileAndPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-3 text-center text-muted">Загрузка...</div>;
  if (!user) {
    router.replace('/login');
    return null;
  }
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container className="telegram-profile">
      {profile && (
        <>
          <h2>Профиль @{profile.username}</h2>
          <div className="text-center mb-4">
            <Image
              src={profile.avatar || '/default-avatar.png'}
              alt={profile.username}
              width={150}
              height={150}
              className="rounded-circle"
            />
            {profile._id !== user.userId && (
              <div className="mt-2">
                {profile.friendStatus === 'none' && (
                  <Button variant="primary" onClick={handleAddFriend}>
                    Добавить в друзья
                  </Button>
                )}
                {profile.friendStatus === 'pending' && (
                  <Button variant="outline-secondary" onClick={handleCancelRequest}>
                    Отменить запрос
                  </Button>
                )}
                {profile.friendStatus === 'friends' && (
                  <p className="text-success">Уже друзья</p>
                )}
              </div>
            )}
          </div>
          <div>
            {profile.name && <p>Имя: {profile.name}</p>}
            {profile.bio && <p>О себе: {profile.bio}</p>}
            {profile.interests.length > 0 && (
              <p>
                Интересы:{' '}
                {profile.interests.map((interest) => (
                  <span key={interest} className="badge bg-primary me-1">{interest}</span>
                ))}
              </p>
            )}
          </div>
          <h4 className="mt-4">Посты</h4>
          <ListGroup>
            {posts.length > 0 ? (
              posts.map((post) => (
                <ListGroup.Item key={post._id} className="border-0 mb-2">
                  <Post
                    postId={post._id}
                    username={post.userId?.username || 'Unknown'}
                    content={post.content}
                    createdAt={post.createdAt}
                    userId={post.userId?._id || ''}
                    likes={post.likes || []}
                    reactions={post.reactions || []}
                    images={post.images || []}
                    comments={post.comments || []}
                    userAvatar={post.userId?.avatar || '/default-avatar.png'}
                    currentUserId={user.userId}
                    isAdmin={false}
                  />
                </ListGroup.Item>
              ))
            ) : (
              <p className="text-muted">Нет постов</p>
            )}
          </ListGroup>
          {profile._id === user.userId && (
            <Button
              variant="secondary"
              onClick={() => setShowViewLogModal(true)}
              className="mt-4 w-100"
            >
              Журнал посещений
            </Button>
          )}
          <Modal show={showViewLogModal} onHide={() => setShowViewLogModal(false)} centered>
            <ModalHeader closeButton>
              <ModalTitle>Журнал посещений</ModalTitle>
            </ModalHeader>
            <ModalBody>
              {profileViews.length > 0 ? (
                <ListGroup variant="flush">
                  {profileViews.map((view) => (
                    <ListGroup.Item key={view._id}>
                      Пользователь @{view.viewerId.username} просмотрел ваш профиль{' '}
                      {new Date(view.viewedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted">Нет данных о посещениях</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowViewLogModal(false)}>
                Закрыть
              </Button>
            </ModalFooter>
          </Modal>
        </>
      )}
    </Container>
  );
}