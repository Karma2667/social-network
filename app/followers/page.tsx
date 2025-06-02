'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Container, ListGroup, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/app/lib/ClientAuthProvider';

export default function FollowersPage() {
  const { id } = useParams();
  const { userId } = useAuth();
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!id || id !== userId) {
      router.replace('/');
      return;
    }
    const fetchFollowers = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${id}`, {
          headers: { 'x-user-id': userId || '' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch followers');
        const data = await res.json();
        setFollowers(data.followers || []);
      } catch (error) {
        console.error('Fetch followers error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowers();
  }, [id, userId, router]);

  if (loading) return <div className="d-flex justify-content-center"><Spinner animation="border" /></div>;
  if (!id || id !== userId) return null;

  return (
    <Container>
      <h1>Подписчики</h1>
      {followers.length > 0 ? (
        <ListGroup>
          {followers.map((follower: any) => (
            <ListGroup.Item key={follower._id}>
              <Link href={`/profile/${follower._id}`}>@{follower.username}</Link>
            </ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        <p>У вас пока нет подписчиков</p>
      )}
    </Container>
  );
}