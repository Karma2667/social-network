// app/communities/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import AppNavbar from '@/app/Components/Navbar';
import Post from '@/app/Components/Post';
import { useAuth } from '@/lib/AuthContext';

export default function CommunityPage() {
  const { id } = useParams();
  const { userId } = useAuth();
  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [inviteeId, setInviteeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchCommunity();
    fetchPosts();
  }, [id, userId]);

  const fetchCommunity = async () => {
    try {
      const res = await fetch(`/api/communities/${id}`, {
        headers: { 'x-user-id': userId || '' },
      });
      if (!res.ok) throw new Error('Failed to fetch community');
      const data = await res.json();
      console.log('Fetched community:', data);
      setCommunity(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?communityId=${id}`, {
        headers: { 'x-user-id': userId || '' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      console.log('Fetched posts:', data);
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) {
      setError('Content is required');
      return;
    }
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ userId, content, communityId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create post');
      setContent('');
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleInvite = async () => {
    if (!inviteeId) {
      alert('Please enter a user ID');
      return;
    }
    try {
      const res = await fetch(`/api/communities/${id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ inviteeId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('Invite sent!');
      setInviteeId('');
      fetchCommunity();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!userId) return <div>Please log in to view this page</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!community) return <div>Community not found</div>;

  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        <Row>
          <Col md={{ span: 8, offset: 2 }}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>{community.name}</Card.Title>
                <Card.Text>{community.description || 'No description yet'}</Card.Text>
                <Card.Subtitle className="text-muted">
                  Created by: {community.creator?.username || 'Unknown'} on{' '}
                  {new Date(community.createdAt).toLocaleDateString()}
                </Card.Subtitle>
                <p>Debug: userId={userId}, creatorId={community.creator?._id}</p>
                {userId === community.creator?._id.toString() && (
                  <Form className="mt-3">
                    <Form.Group controlId="inviteeId">
                      <Form.Label>Invite User (Enter User ID)</Form.Label>
                      <Form.Control
                        type="text"
                        value={inviteeId}
                        onChange={(e) => setInviteeId(e.target.value)}
                        placeholder="e.g., 67d14678b41c24eb00f7bfaf"
                      />
                    </Form.Group>
                    <Button variant="primary" onClick={handleInvite} className="mt-2">
                      Invite
                    </Button>
                  </Form>
                )}
              </Card.Body>
            </Card>
            <Form onSubmit={handlePostSubmit} className="mb-4">
              <Form.Group className="d-flex">
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a post..."
                />
                <Button variant="primary" type="submit" className="ms-2">
                  Post
                </Button>
              </Form.Group>
              {error && <p className="text-danger mt-2">{error}</p>}
            </Form>
            <h3>Posts</h3>
            {posts.length === 0 ? (
              <p>No posts yet</p>
            ) : (
              posts.map((post) => (
                <Post
                  key={post._id}
                  username={post.user?.username || 'Unknown'}
                  content={post.content || 'No content'}
                  createdAt={post.createdAt || Date.now()}
                  userId={post.user?._id || 'unknown'}
                  likes={post.likes || []}
                  postId={post._id}
                />
              ))
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
}