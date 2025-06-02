'use client';

import { useState } from 'react';
import { Card, Button, Form, Image } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import { HandThumbsUp, PencilSquare, Trash } from 'react-bootstrap-icons'; // Исправленные иконки

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
  likes = [],
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
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
          'Authorization': `Bearer ${authToken}`,
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

      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
          'Authorization': `Bearer ${authToken}`,
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
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUserId,
          'Authorization': `Bearer ${authToken}`,
        },
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

  const avatarUrl = userAvatar && userAvatar.trim() && userAvatar !== '/default-avatar.png'
    ? userAvatar
    : '/default-avatar.png';

  const formattedDate = typeof createdAt === 'number'
    ? new Date(createdAt).toLocaleString()
    : new Date(createdAt).toLocaleString();

  return (
    <Card className="telegram-post-card">
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          <Image
            src={avatarUrl}
            roundedCircle
            width={40}
            height={40}
            className="telegram-post-avatar me-3"
            onError={(e) => {
              console.error('Post: Ошибка загрузки аватара:', avatarUrl);
              e.currentTarget.src = '/default-avatar.png';
            }}
          />
          <div>
            <Card.Title className="telegram-post-username">{username}</Card.Title>
            <Card.Subtitle className="telegram-post-date">{formattedDate}</Card.Subtitle>
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
                className="telegram-post-textarea"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="telegram-post-label">Загрузить новые изображения</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) setEditImages(Array.from(files));
                }}
                className="telegram-post-file-input"
              />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="primary" type="submit" className="telegram-post-button">
                Сохранить
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)} className="telegram-post-button-secondary">
                Отмена
              </Button>
            </div>
          </Form>
        ) : (
          <>
            <Card.Text className="telegram-post-content">{content}</Card.Text>
            {images && images.length > 0 && (
              <div className="mb-3 d-flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <Image
                    key={index}
                    src={image}
                    thumbnail
                    className="telegram-post-image"
                  />
                ))}
              </div>
            )}
            <div className="d-flex gap-3">
              <Button
                variant="outline-primary"
                onClick={handleLike}
                className="telegram-post-like-button"
              >
                <HandThumbsUp className="me-1" /> Лайк ({likes.length})
              </Button>
              {currentUserId === userId && (
                <>
                  <Button
                    variant="outline-secondary"
                    onClick={() => setIsEditing(true)}
                    className="telegram-post-edit-button"
                  >
                    <PencilSquare className="me-1" /> Редактировать
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={handleDelete}
                    className="telegram-post-delete-button"
                  >
                    <Trash className="me-1" /> Удалить
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}