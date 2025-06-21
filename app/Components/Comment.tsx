'use client';

import { Image, Button, Form } from 'react-bootstrap';
import { useState, useRef } from 'react';
import EmojiPicker from './EmojiPicker'; // Проверьте этот путь
import ReactionPicker from './ReactionPicker';

interface CommentProps {
  _id: string;
  userId: { _id: string; username: string; avatar?: string };
  content: string;
  createdAt: string;
  likes?: string[];
  reactions?: { emoji: string; users: string[] }[];
  images?: string[];
  userAvatar?: string;
  onCommentLike?: (commentId: string) => Promise<void>;
  onCommentReaction?: (commentId: string, emoji: string) => Promise<void>;
  currentUserId?: string;
  onCommentEdit?: (commentId: string, newContent: string, newImages: string[]) => Promise<void>;
  onCommentDelete?: (commentId: string) => Promise<void>;
}

export default function Comment({
  _id,
  userId,
  content,
  createdAt,
  likes = [],
  reactions = [],
  images = [],
  userAvatar,
  onCommentLike,
  onCommentReaction,
  currentUserId,
  onCommentEdit,
  onCommentDelete,
}: CommentProps) {
  const displayUserId = typeof userId === 'string'
    ? { _id: userId, username: userId, avatar: undefined }
    : userId || { _id: '', username: 'Unknown', avatar: undefined };

  const avatarUrl = userAvatar || (displayUserId.avatar && displayUserId.avatar.trim() && displayUserId.avatar !== '/default-avatar.png')
    ? displayUserId.avatar
    : '/default-avatar.png';

  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editImages, setEditImages] = useState<File[]>([]);
  const userLiked = currentUserId && likes.includes(currentUserId);
  const canEditDelete = currentUserId === displayUserId._id;

  const handleLike = async () => {
    if (onCommentLike && currentUserId) {
      await onCommentLike(_id);
    }
  };

  const handleReactionSelect = async (emoji: string) => {
    if (onCommentReaction && currentUserId) {
      await onCommentReaction(_id, emoji);
      setShowReactions(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onCommentEdit && currentUserId) {
      let imagePaths = images || [];
      if (editImages.length > 0) {
        const formData = new FormData();
        editImages.forEach((file) => formData.append('files', file));
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Не удалось загрузить изображения');
        imagePaths = [...images, ...(await uploadRes.json()).files];
      }
      await onCommentEdit(_id, editContent, imagePaths);
      setIsEditing(false);
      setEditImages([]);
    }
  };

  const handleDelete = async () => {
    if (onCommentDelete && currentUserId && window.confirm('Вы уверены, что хотите удалить комментарий?')) {
      await onCommentDelete(_id);
    }
  };

  return (
    <div className="d-flex align-items-start mb-3 position-relative" style={{ zIndex: 0 }}>
      <Image
        src={avatarUrl}
        alt={displayUserId.username}
        roundedCircle
        width={30}
        height={30}
        className="me-3"
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/default-avatar.png'; }}
      />
      <div className="flex-grow-1">
        {isEditing ? (
          <Form onSubmit={handleEdit}>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={2}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="mb-2"
              />
              <div className="d-flex gap-2 mb-2" style={{ position: 'relative', zIndex: 1002 }}>
                <div style={{ position: 'relative' }}>
                  <EmojiPicker onSelect={(emoji) => {
                    console.log('Emoji selected:', emoji); // Отладочный лог
                    setEditContent((prev) => prev + emoji);
                  }} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files) setEditImages(Array.from(target.files));
                  }}
                  style={{ display: 'none' }}
                  id={`edit-file-${_id}`}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => document.getElementById(`edit-file-${_id}`)?.click()}
                  className="me-2"
                >
                  Прикрепить
                </Button>
              </div>
              {editImages.length > 0 && (
                <div className="mt-2">
                  <p>Выбранные файлы:</p>
                  <ul>
                    {editImages.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="primary" type="submit">
                Сохранить
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Отмена
              </Button>
            </div>
          </Form>
        ) : (
          <>
            <p>
              <strong>{displayUserId.username}</strong>: {content}
              <br />
              <small className="text-muted">{new Date(createdAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</small>
            </p>
            <div className="d-flex gap-2 align-items-center mb-1">
              <Button
                variant={userLiked ? 'primary' : 'outline-primary'}
                onClick={handleLike}
                size="sm"
                disabled={!onCommentLike || !currentUserId}
                className="d-flex align-items-center"
              >
                <span className="me-1">👍</span> {likes.length}
              </Button>
              <div className="position-relative">
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowReactions(!showReactions)}
                  size="sm"
                  disabled={!onCommentReaction || !currentUserId}
                >
                  Реакции
                </Button>
                {showReactions && (
                  <div className="position-absolute bg-light border rounded p-2" style={{ zIndex: 1000, top: '100%' }}>
                    <ReactionPicker onSelect={handleReactionSelect} />
                  </div>
                )}
              </div>
              {canEditDelete && (
                <>
                  <Button variant="outline-secondary" size="sm" onClick={() => setIsEditing(true)}>
                    Редактировать
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={handleDelete}>
                    Удалить
                  </Button>
                </>
              )}
            </div>
            {likes.length > 0 && <span className="me-2">👍 {likes.length}</span>}
            {reactions.length > 0 && (
              <span className="me-2">
                {reactions.map((r) => `${r.emoji} ${r.users.length}`).join(', ')}
              </span>
            )}
            {images.length > 0 && (
              <div className="mt-2">
                {images.map((image, index) => (
                  <Image
                    key={index}
                    src={image}
                    alt={`Comment image ${index + 1}`}
                    fluid
                    style={{ maxHeight: '150px', marginRight: '10px', borderRadius: '5px' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}