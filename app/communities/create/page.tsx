'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Modal, FormCheck } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import { useRouter } from 'next/navigation';

const PREDEFINED_INTERESTS = [
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

export default function CreateCommunity() {
  const { userId } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [friends, setFriends] = useState<{ _id: string; username: string }[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Community name is required');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('interests', JSON.stringify(interests));
    if (avatar) formData.append('avatar', avatar);
    selectedFriends.forEach((friendId) => formData.append('members', friendId));

    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'x-user-id': userId || '',
        },
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to create community (Status: ${res.status})`);
      }
      const data = await res.json();
      router.push(`/communities/${data._id}`);
    } catch (err: any) {
      console.error('POST /api/communities error:', err);
      setError(err.message || 'Unknown server error');
    }
  };

  useEffect(() => {
    if (!userId) return;

    const fetchFriends = async () => {
      try {
        const res = await fetch('/api/friends', {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) throw new Error('Failed to fetch friends');
        const data = await res.json();
        const friendsData = data.friends || [];
        setFriends(Array.isArray(friendsData) ? friendsData : []);
      } catch (err: any) {
        console.error('Error fetching friends:', err);
        setFriends([]);
      }
    };
    fetchFriends();
  }, [userId]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleInterestToggle = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
        ? [...prev, interest]
        : prev
    );
  };

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim()) && interests.length < 5) {
      setInterests((prev) => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  if (!userId) return <div>Please log in to create a community</div>;

  return (
    <Container className="my-4">
      <Row>
        <Col md={{ span: 6, offset: 3 }}>
          <Button variant="primary" href="/communities" className="mb-3">
            Back to Communities
          </Button>
          <h2>Create a Community</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter community name"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="avatar">
              <Form.Label>Avatar</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              {avatar && <p className="mt-1">Selected: {avatar.name}</p>}
            </Form.Group>

            <Form.Group className="mb-3" controlId="description">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description (optional)"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="interests">
              <Form.Label>Interests</Form.Label>
              <div className="mb-2">
                {interests.length > 0 ? (
                  interests.map((interest) => (
                    <span key={interest} className="badge bg-primary me-1">
                      {interest}
                    </span>
                  ))
                ) : (
                  <p>No interests selected</p>
                )}
              </div>
              <Button
                variant="outline-primary"
                onClick={() => setShowInterestsModal(true)}
                className="mb-3"
              >
                Select Interests
              </Button>
            </Form.Group>

            <Form.Group className="mb-3" controlId="members">
              <Form.Label>Add Members (Friends)</Form.Label>
              {friends.length === 0 ? (
                <p>No friends available</p>
              ) : (
                friends.map((friend) => (
                  <FormCheck
                    key={friend._id}
                    type="checkbox"
                    label={friend.username}
                    checked={selectedFriends.includes(friend._id)}
                    onChange={() => toggleFriend(friend._id)}
                  />
                ))
              )}
            </Form.Group>

            <Button variant="primary" type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </Form>

          <Modal show={showInterestsModal} onHide={() => setShowInterestsModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Select Interests</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {PREDEFINED_INTERESTS.map((interest) => (
                <FormCheck
                  key={interest}
                  type="checkbox"
                  label={interest}
                  checked={interests.includes(interest)}
                  onChange={() => handleInterestToggle(interest)}
                  className="mb-2"
                />
              ))}
              <Form.Group className="mt-3">
                <Form.Label>Add Custom Interest</Form.Label>
                <Form.Control
                  type="text"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  placeholder="Enter interest"
                  disabled={interests.length >= 5}
                />
                <Button
                  variant="outline-primary"
                  className="mt-2"
                  onClick={handleAddCustomInterest}
                  disabled={!customInterest.trim() || interests.length >= 5}
                >
                  Add
                </Button>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowInterestsModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowInterestsModal(false)}
              >
                Save
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
}