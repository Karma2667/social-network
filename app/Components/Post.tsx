'use client';

import { useState } from 'react';
import { Card, Button, Form, Image } from 'react-bootstrap';
import { useAuth } from '@/lib/AuthContext';

interface PostProps {
  username: string;
  content: string;
  createdAt: string | number;
  userId: string;
  likes: string[];
  images: string[];
  postId: string;
  fetchPosts: () => Promise<void>;
  userAvatar?: string;
}

export default function Post({
  username,
  content,
  createdAt,
  userId,
  likes,
  images,
  postId,
  fetchPosts,
  userAvatar,
}: PostProps) {
  const { userId: currentUserId } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editImages, setEditImages] = useState<File[]>([]);

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось поставить лайк');
      }
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка постановки лайка:', err);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;
    try {
      let imagePaths = images;
      if (editImages.length > 0) {
        const formData = new FormData();
        editImages.forEach((file) => formData.append('files', file));
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || 'Не удалось загрузить изображения');
        }
        const { files } = await uploadRes.json();
        imagePaths = files;
      }

      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({ content: editContent, images: imagePaths }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось обновить пост');
      }
      setIsEditing(false);
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка обновления поста:', err);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUserId },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось удалить пост');
      }
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка удаления поста:', err);
    }
  };

  // Используем userAvatar, если он не пустой и не дефолтный
  const avatarUrl = userAvatar && userAvatar.trim() && userAvatar !== '/default-avatar.png' 
    ? userAvatar 
    : '/default-avatar.png';

  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex align-items-center mb-2">
          <Image
            src={avatarUrl}
            roundedCircle
            width={40}
            height={40}
            className="me-2"
            onError={(e) => {
              console.error('Post: Ошибка загрузки аватара:', avatarUrl);
              e.currentTarget.src = '/default-avatar.png';
            }}
          />
          <div>
            <Card.Title>{username}</Card.Title>
            <Card.Subtitle className="text-muted">
              {new Date(createdAt).toLocaleString()}
            </Card.Subtitle>
          </div>
        </div>
        {isEditing ? (
          <Form onSubmit={handleEdit}>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Загрузить новые изображения</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) setEditImages(Array.from(files));
                }}
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="me-2">
              Сохранить
            </Button>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Отмена
            </Button>
          </Form>
        ) : (
          <>
            <Card.Text>{content}</Card.Text>
            {images && images.length > 0 && (
              <div className="mb-3">
                {images.map((image, index) => (
                  <Image key={index} src={image} thumbnail width={100} className="me-2" />
                ))}
              </div>
            )}
            <Button variant="outline-primary" onClick={handleLike} className="me-2">
              Лайк ({likes.length})
            </Button>
            {currentUserId === userId && (
              <>
                <Button
                  variant="outline-secondary"
                  onClick={() => setIsEditing(true)}
                  className="me-2"
                >
                  Редактировать
                </Button>
                <Button variant="outline-danger" onClick={handleDelete}>
                  Удалить
                </Button>
              </>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}