'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container, Row, Col, Card, Alert, Form, Button } from 'react-bootstrap';
import AppNavbar from '@/app/Components/Navbar';
import Post from '@/app/Components/Post';

export default function Profile() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    fetchUser();
    fetchUserPosts();
  }, [id]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to fetch user: ${res.status} - ${errorData}`);
      }
      const data = await res.json();
      setUser(data);
      setEditUsername(data.username);
      setEditBio(data.bio || '');
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch user error:', err);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await fetch(`/api/posts?userId=${id}`);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to fetch posts: ${res.status} - ${errorData}`);
      }
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch posts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editUsername, bio: editBio }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      const updatedUser = await res.json();
      setUser(updatedUser);
      setEditMode(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Edit profile error:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!user) return <Alert variant="warning">User not found</Alert>;

  return (
    <>
      <AppNavbar userId={id as string}/>
      <Container className="my-4">
        <Row>
          <Col md={{ span: 6, offset: 3 }}>
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <img
                    src="https://via.placeholder.com/100"
                    alt="Profile"
                    className="rounded-circle me-3"
                  />
                  {editMode ? (
                    <Form onSubmit={handleEditSubmit} className="flex-grow-1">
                      <Form.Group className="mb-2">
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          placeholder="Enter username"
                        />
                      </Form.Group>
                      <Form.Group className="mb-2">
                        <Form.Label>Bio</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          placeholder="Tell about yourself"
                        />
                      </Form.Group>
                      <Button variant="primary" type="submit" className="me-2">
                        Save
                      </Button>
                      <Button variant="secondary" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                    </Form>
                  ) : (
                    <div>
                      <Card.Title>{user.username}</Card.Title>
                      <Card.Text>{user.bio || 'No bio yet'}</Card.Text>
                      <Card.Subtitle className="text-muted">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </Card.Subtitle>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="mt-2"
                        onClick={() => setEditMode(true)}
                      >
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
            <h2>Posts</h2>
            {posts.length === 0 ? (
              <p>No posts yet.</p>
            ) : (
              posts.map((post) => (
                <Post
                  key={post._id}
                  username={user.username}
                  content={post.content}
                  createdAt={post.createdAt}
                  userId={user._id}
                />
              ))
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
}