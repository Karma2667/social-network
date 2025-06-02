'use client';

import { useState } from 'react';
import { Button, Form, Image } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import ReactionPicker from './ReactionPicker';

interface CommentProps {
  commentId: string;
  postId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string | number;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  fetchComments: () => Promise<void>;
  userAvatar?: string;
}

export default function Comment({
  commentId,
  postId,
  userId,
  username,
  content,
  createdAt,
  likes,
  reactions = [],
  fetchComments,
  userAvatar,
}: CommentProps) {
  const { userId: currentUserId } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
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
      await fetchComments();
    } catch (err: any) {
      console.error('Comment: Ошибка постановки лайка:', err);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось обновить комментарий');
      }
      setIsEditing(false);
      await fetchComments();
    } catch (err: any) {
      console.error('Comment: Ошибка обновления комментария:', err);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUserId },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось удалить комментарий');
      }
      await fetchComments();
    } catch (err: any) {
      console.error('Comment: Ошибка удаления комментария:', err);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({ userId: currentUserId, emoji }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось добавить реакцию');
      }
      setShowReactionPicker(false);
      await fetchComments();
    } catch (err: any) {
      console.error('Comment: Ошибка добавления реакции:', err);
    }
  };

  const avatarUrl = userAvatar && userAvatar.trim() && userAvatar !== '/default-avatar.png'
    ? userAvatar
    : '/default-avatar.png';

  const formattedDate = typeof createdAt === 'number'
    ? new Date(createdAt).toLocaleString()
    : new Date(createdAt).toLocaleString();

  return (
    <div className="telegram-comment mb-2">
      <div className="d-flex align-items-center mb-1">
        <Image
          src={avatarUrl}
          roundedCircle
          width={30}
          height={30}
          className="me-2"
          onError={(e) => {
            console.error('Comment: Ошибка загрузки аватара:', avatarUrl);
            e.currentTarget.src = '/default-avatar.png';
          }}
        />
        <div>
          <span className="telegram-comment-username">{username}</span>
          <span className="telegram-comment-time text-muted ms-2">{formattedDate}</span>
        </div>
      </div>
      {isEditing ? (
        <Form onSubmit={handleEdit}>
          <Form.Group className="mb-2">
            <Form.Control
              className="telegram-comment-input"
              as="textarea"
              rows={2}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="telegram-comment-button me-2">
            Сохранить
          </Button>
          <Button variant="secondary" onClick={() => setIsEditing(false)}>
            Отмена
          </Button>
        </Form>
      ) : (
        <>
          <p className="telegram-comment-content">{content}</p>
          <div className="telegram-reactions mb-2">
            {reactions.map((reaction, index) => (
              <Button
                key={index}
                variant="outline-secondary"
                className="telegram-reaction-button me-1"
                onClick={() => handleReaction(reaction.emoji)}
              >
                {reaction.emoji} {reaction.users.length}
              </Button>
            ))}
            <Button
              variant="outline-secondary"
              className="telegram-reaction-button"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
            >
              😊
            </Button>
            {showReactionPicker && (
              <ReactionPicker onSelect={handleReaction} />
            )}
          </div>
          <Button variant="outline-primary" onClick={handleLike} className="telegram-comment-like me-2">
            Лайк ({likes.length})
          </Button>
          {currentUserId === userId && (
            <>
              <Button
                variant="outline-secondary"
                onClick={() => setIsEditing(true)}
                className="telegram-comment-edit me-2"
              >
                Редактировать
              </Button>
              <Button
                variant="outline-danger"
                onClick={handleDelete}
                className="telegram-comment-delete"
              >
                Удалить
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}