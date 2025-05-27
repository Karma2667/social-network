'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container, Row, Col, Image } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/app/lib/ClientAuthProvider';
import Post from '@/app/Components/Post';

export default function ProfilePage() {
  const { id } = useParams();
  const { userId } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${id}`, {
        headers: { 'x-user-id': userId || '' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Fetch profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id, userId]);

  if (loading) return <div className="d-flex align-items-center justify-content-center vh-100">Загрузка...</div>;
  if (!profile) return <div className="d-flex align-items-center justify-content-center vh-100">Пользователь не найден</div>;

  return (
    <Container fluid className="telegram-profile p-4">
      <Row>
        {/* Левая колонка: профиль */}
        <Col md={4} className="telegram-profile-info mb-4">
          <div className="text-center">
            <Image
              src={profile.avatar || '/default-avatar.png'}
              alt={profile.username}
              roundedCircle
              className="telegram-profile-avatar mb-3"
            />
            <h2 className="mb-2">@{profile.username}</h2>
            {profile.name && <p className="text-muted mb-2">{profile.name}</p>}
            {profile.bio && <p className="text-muted mb-3">{profile.bio}</p>}
            <div className="mb-4">
              {profile.interests?.length > 0 ? (
                profile.interests.map((interest: string, index: number) => (
                  <span key={index} className="badge bg-primary me-2 mb-2">
                    {interest}
                  </span>
                ))
              ) : (
                <p className="text-muted">Нет интересов</p>
              )}
            </div>
            <Link href={`/chat/${profile._id}`} className="telegram-profile-button">
              Написать
            </Link>
          </div>
        </Col>

        {/* Правая колонка: посты */}
        <Col md={8}>
          <h3 className="mb-4">Публикации</h3>
          {posts.length > 0 ? (
            posts.map((post) => (
              <Post
                key={post._id}
                username={post.user.username}
                content={post.content}
                createdAt={post.createdAt}
                userId={post.user._id}
                likes={post.likes.map((id: any) => id.toString())}
                postId={post._id}
                images={post.images || []}
                fetchPosts={fetchProfile}
                userAvatar={post.user.avatar || '/default-avatar.png'}
              />
            ))
          ) : (
            <p className="text-muted">Нет публикаций</p>
          )}
        </Col>
      </Row>
    </Container>
  );
}