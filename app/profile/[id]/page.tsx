'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import AppNavbar from '@/app/Components/Navbar';
import Post from '@/app/Components/Post';
import React from 'react'; // Добавляем импорт React для use()

export default function Profile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params); // Распаковываем params
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${resolvedParams.id}`); // Используем resolvedParams
        const data = await res.json();
        setProfile(data);
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Fetch profile error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [resolvedParams.id]); // Зависимость от resolvedParams.id

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>User not found</div>;

  return (
    <>
      <AppNavbar userId={resolvedParams.id} />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 6, offset: 3 }}>
            <h1>{profile.username}</h1>
            <p>{profile.bio || 'No bio yet'}</p>
            <h3>Posts</h3>
            {posts.map((post) => (
              <Post
                key={post._id}
                username={post.user.username}
                content={post.content}
                createdAt={post.createdAt}
                userId={post.user._id}
                likes={post.likes.map((id: any) => id.toString())}
                postId={post._id}
              />
            ))}
          </Col>
        </Row>
      </Container>
    </>
  );
}