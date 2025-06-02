'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Image, ListGroup } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import { HandThumbsUp, PencilSquare, Trash } from 'react-bootstrap-icons';
import ReactionPicker from './ReactionPicker';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ru } from 'date-fns/locale';

interface PostProps {
  username: string;
  content: string;
  createdAt: string | number;
  userId: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  postId: string;
  fetchPosts: () => Promise<void>;
  userAvatar?: string;
}

interface ErrorResponse {
  error?: string;
}

export default function Post({
  username,
  content,
  createdAt,
  userId,
  likes = [],
  reactions = [],
  images = [],
  postId,
  fetchPosts,
  userAvatar,
}: PostProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [userLiked, setUserLiked] = useState(false);
  const [userReactions, setUserReactions] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!user) return;

    const liked = likes.includes(user.userId);
    if (liked !== userLiked) {
      setUserLiked(liked);
    }

    const newReactionMap = reactions.reduce((acc, r) => {
      acc[r.emoji] = r.users.includes(user.userId);
      return acc;
    }, {} as { [key: string]: boolean });

    if (JSON.stringify(newReactionMap) !== JSON.stringify(userReactions)) {
      setUserReactions(newReactionMap);
    }
  }, [likes, reactions, user, userLiked, userReactions]);

  const handleLike = useCallback(async () => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: user.userId }),
      });

      let errorData: ErrorResponse = {};
      try {
        errorData = await res.json();
      } catch (jsonError) {
        console.error('Ошибка разбора JSON:', jsonError);
      }

      if (!res.ok) {
        throw new Error(errorData.error || `Ошибка сервера: ${res.status}`);
      }

      await fetchPosts();
    } catch (err: any) {
      console.error('Ошибка постановки лайка:', err.message);
    }
  }, [user, postId, fetchPosts]);

  const handleReaction = useCallback(async (emoji: string) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: user.userId, emoji }),
      });

      let errorData: ErrorResponse = {};
      try {
        errorData = await res.json();
      } catch (jsonError) {
        console.error('Ошибка разбора JSON:', jsonError);
      }

      if (!res.ok) {
        throw new Error(errorData.error || `Ошибка сервера: ${res.status}`);
      }

      await fetchPosts();
    } catch (err: any) {
      console.error('Ошибка добавления реакции:', err.message);
    }
  }, [user, postId, fetchPosts]);

  const handleEdit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
          'x-user-id': user.userId,
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
      console.error('Ошибка обновления поста:', err);
    }
  }, [user, postId, editContent, editImages, images, fetchPosts]);

  const handleDelete = useCallback(async () => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось удалить пост');
      }
      await fetchPosts();
    } catch (err: any) {
      console.error('Ошибка удаления поста:', err);
    }
  }, [user, postId, fetchPosts]);

  const avatarUrl = userAvatar && userAvatar.trim() && userAvatar !== '/default-avatar.png'
    ? userAvatar
    : '/default-avatar.png';

  const formattedDate = typeof createdAt === 'number'
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ru })
    : formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ru });

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
              console.error('Ошибка загрузки аватара:', avatarUrl);
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
            {images.length > 0 && (
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
            <div className="d-flex gap-3 align-items-center">
              <Button
                variant={userLiked ? 'primary' : 'outline-primary'}
                onClick={handleLike}
                className="telegram-post-like-button"
              >
                <HandThumbsUp className="me-1" /> Лайк ({likes.length})
              </Button>
              <ReactionPicker onSelect={handleReaction} />
              {user && user.userId === userId && (
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
            {reactions.length > 0 && (
              <ListGroup horizontal className="mt-2">
                {reactions.map((r) => (
                  <ListGroup.Item key={r.emoji} className="telegram-reaction-count">
                    {r.emoji} {r.users.length}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}