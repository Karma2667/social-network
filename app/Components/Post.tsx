'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Form, Image, ListGroup } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import { HandThumbsUp, PencilSquare, Trash } from 'react-bootstrap-icons';
import ReactionPicker from './ReactionPicker';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

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

export default function Post({
  username,
  content,
  createdAt,
  userId,
  likes = [],
  reactions = [],
  images,
  postId,
  fetchPosts,
  userAvatar,
}: PostProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [userLiked, setUserLiked] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Новый стейт для показа меню эмодзи

  useEffect(() => {
    if (user) {
      setUserLiked(likes.includes(user.userId));
      const reaction = reactions.find((r) => r.users.includes(user.userId));
      setUserReaction(reaction ? reaction.emoji : null);
    }
  }, [likes, reactions, user]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      console.log('Отправка запроса на лайк:', `/api/posts/${postId}/likes`);
      const res = await fetch(`/api/posts/${postId}/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: user.userId }),
      });
      console.log('Ответ на запрос лайка:', res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.text();
        console.error('Ошибка ответа сервера:', errorData);
        throw new Error(errorData || 'Не удалось поставить/убрать лайк');
      }
      const updatedPost = await res.json();
      setUserLiked(updatedPost.likes.includes(user.userId));
      setUserReaction(null);

      // Если лайк добавлен, ставим реакцию 👍
      if (!userLiked && updatedPost.likes.includes(user.userId)) {
        console.log('Добавление реакции 👍');
        const reactionRes = await fetch(`/api/posts/${postId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.userId,
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ userId: user.userId, emoji: '👍' }),
        });
        console.log('Ответ на запрос реакции:', reactionRes.status, reactionRes.statusText);
        if (!reactionRes.ok) {
          const reactionErrorData = await reactionRes.text();
          console.error('Ошибка добавления реакции:', reactionErrorData);
        }
      }
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка постановки/снятия лайка:', err);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      console.log('Отправка запроса на реакцию:', emoji);
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: user.userId, emoji }),
      });
      console.log('Ответ на запрос реакции:', res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.text();
        console.error('Ошибка ответа сервера:', errorData);
        throw new Error(errorData || 'Не удалось добавить реакцию');
      }
      const updatedPost = await res.json();
      const userNewReaction = updatedPost.reactions.find((r: { users: string[] }) => r.users.includes(user.userId));
      setUserReaction(userNewReaction ? userNewReaction.emoji : null);
      await fetchPosts();
      setShowReactions(false);
    } catch (err: any) {
      console.error('Post: Ошибка добавления реакции:', err);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
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
      console.error('Post: Ошибка обновления поста:', err);
    }
  };

  const handleDelete = async () => {
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
      console.error('Post: Ошибка удаления поста:', err);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setEditContent((prev) => prev + emoji);
    setShowEmojiPicker(false); // Закрываем меню после выбора
  };

  const avatarUrl = userAvatar && userAvatar.trim() && userAvatar !== '/default-avatar.png'
    ? userAvatar
    : '/default-avatar.png';

  const formattedDate = typeof createdAt === 'number'
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <Card className="telegram-post-card position-relative">
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
              <div className="position-relative">
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="telegram-post-textarea"
                  placeholder="Введите текст поста с эмодзи..."
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="position-absolute top-0 end-0 mt-1 me-1"
                  style={{ padding: '2px 6px' }}
                >
                  😊
                </Button>
                {showEmojiPicker && (
                  <div className="emoji-picker position-absolute bg-light border rounded p-2" style={{ zIndex: 1000, top: '100%', right: 0 }}>
                    {['👍', '❤️', '😂', '😢', '😮', '🤡', '😡', '🤯', '🤩', '👏', '🙌', '🔥', '🎉'].map((emoji) => (
                      <Button
                        key={emoji}
                        variant="link"
                        onClick={() => handleAddEmoji(emoji)}
                        style={{ padding: '2px 6px', fontSize: '1.2rem', lineHeight: 1 }}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
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
            <div className="d-flex gap-3 align-items-center">
              <div
                className="position-relative"
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
              >
                <Button
                  variant={userLiked ? 'primary' : 'outline-primary'}
                  onClick={handleLike}
                  className="telegram-post-like-button"
                >
                  <HandThumbsUp className="me-1" /> Лайк ({likes.length})
                </Button>
                {showReactions && (
                  <div className="reaction-menu position-absolute bg-light border rounded p-2" style={{ zIndex: 1000 }}>
                    <ReactionPicker onSelect={handleReaction} />
                  </div>
                )}
              </div>
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