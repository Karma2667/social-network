'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Form, Image, ListGroup } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import { HandThumbsUp, PencilSquare, Trash, Paperclip } from 'react-bootstrap-icons';
import ReactionPicker from './ReactionPicker';
import Comment from './Comment';
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
  comments: CommentProps[];
}

interface CommentProps {
  _id: string;
  userId: { _id: string; username: string };
  content: string;
  createdAt: string;
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
  comments: initialComments = [],
}: PostProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [userLiked, setUserLiked] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [comments, setComments] = useState<CommentProps[]>(initialComments); // Локальное состояние для комментариев

  useEffect(() => {
    if (user) {
      setUserLiked(likes.includes(user.userId));
      const reaction = reactions.find((r) => r.users.includes(user.userId));
      setUserReaction(reaction ? reaction.emoji : null);
    }
    console.log('Post: Инициализация с комментариями:', comments); // Отладка
  }, [likes, reactions, user, comments]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: user.userId }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось поставить/убрать лайк');
      const updatedPost = await res.json();
      setUserLiked(updatedPost.likes.includes(user.userId));
      setUserReaction(null);
      if (!userLiked && updatedPost.likes.includes(user.userId)) {
        await fetch(`/api/posts/${postId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.userId,
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ userId: user.userId, emoji: '👍' }),
        });
      }
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка лайка:', err);
    }
  };

  const handleReaction = async (emoji: string) => {
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
      if (!res.ok) throw new Error(await res.text() || 'Не удалось добавить реакцию');
      const updatedPost = await res.json();
      const userNewReaction = updatedPost.reactions.find((r: { users: string[] }) => r.users.includes(user.userId));
      setUserReaction(userNewReaction ? userNewReaction.emoji : null);
      await fetchPosts();
      setShowReactions(false);
    } catch (err: any) {
      console.error('Post: Ошибка реакции:', err);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      let imagePaths = images || [];
      if (editImages.length > 0) {
        const formData = new FormData();
        editImages.forEach((file) => formData.append('files', file));
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Не удалось загрузить изображения');
        imagePaths = (await uploadRes.json()).files;
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
      if (!res.ok) throw new Error((await res.json()).error || 'Не удалось обновить пост');
      setIsEditing(false);
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка редактирования:', err);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.userId, 'Authorization': `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Не удалось удалить пост');
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка удаления:', err);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setEditContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmittingComment(true);

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const formData = new FormData();
      formData.append('content', newComment);
      commentImages.forEach((file) => formData.append('images', file));

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text() || 'Не удалось добавить комментарий');
      const responseData = await res.json();
      console.log('Post: Ответ от /api/comments:', responseData);

      // Временное добавление комментария в локальное состояние
      const newCommentObj = {
        ...responseData,
        userId: { _id: user.userId, username: user.username || user.userId },
      };
      setComments((prevComments) => [...prevComments, newCommentObj]);

      setNewComment('');
      setCommentImages([]);
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка добавления комментария:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddCommentEmoji = (emoji: string) => {
    setNewComment((prev) => prev + emoji);
    setShowEmojiPicker(false);
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
            onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
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
                      <Button key={emoji} variant="link" onClick={() => handleAddEmoji(emoji)} style={{ padding: '2px 6px', fontSize: '1.2rem', lineHeight: 1 }}>
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
                  const target = e.target as HTMLInputElement;
                  if (target.files) setEditImages(Array.from(target.files));
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
                  <Image key={index} src={image} thumbnail className="telegram-post-image" />
                ))}
              </div>
            )}
            <div className="d-flex gap-3 align-items-center">
              <div className="position-relative" onMouseEnter={() => setShowReactions(true)} onMouseLeave={() => setShowReactions(false)}>
                <Button variant={userLiked ? 'primary' : 'outline-primary'} onClick={handleLike} className="telegram-post-like-button">
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
                  <Button variant="outline-secondary" onClick={() => setIsEditing(true)} className="telegram-post-edit-button">
                    <PencilSquare className="me-1" /> Редактировать
                  </Button>
                  <Button variant="outline-danger" onClick={handleDelete} className="telegram-post-delete-button">
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
            <Button variant="link" onClick={() => setShowComments(!showComments)} className="mt-2">
              {showComments ? 'Скрыть комментарии' : 'Показать комментарии'} ({comments.length})
            </Button>
            {showComments && (
              <div className="mt-2">
                <ListGroup>
                  {comments.map((comment) => (
                    <Comment key={comment._id} {...comment} />
                  ))}
                </ListGroup>
                <Form onSubmit={handleAddComment} className="mt-3">
                  <Form.Group className="position-relative">
                    <Form.Control
                      as="textarea"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Напишите комментарий..."
                      disabled={submittingComment}
                    />
                    <div
                      className="position-absolute"
                      style={{ bottom: '10px', right: '10px', display: 'flex', alignItems: 'center' }}
                    >
                      <Button
                        variant="link"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        style={{ color: '#0088cc', padding: '2px 6px' }}
                        disabled={submittingComment}
                      >
                        😊
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files) setCommentImages(Array.from(target.files));
                        }}
                        style={{ display: 'none' }}
                        id={`comment-file-${postId}`}
                      />
                      <Button
                        variant="link"
                        onClick={() => document.getElementById(`comment-file-${postId}`)?.click()}
                        style={{ color: '#0088cc', padding: '2px 6px' }}
                        disabled={submittingComment}
                      >
                        <Paperclip size={18} />
                      </Button>
                    </div>
                    {showEmojiPicker && (
                      <div className="emoji-picker position-absolute bg-light border rounded p-2" style={{ zIndex: 1000, bottom: '100%', right: 0 }}>
                        {['👍', '❤️', '😂', '😢', '😮', '🤡', '😡', '🤯', '🤩', '👏', '🙌', '🔥', '🎉'].map((emoji) => (
                          <Button key={emoji} variant="link" onClick={() => handleAddCommentEmoji(emoji)} style={{ padding: '2px 6px', fontSize: '1.2rem', lineHeight: 1 }}>
                            {emoji}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Form.Group>
                  {commentImages.length > 0 && (
                    <div className="mt-2">
                      <p>Выбранные файлы:</p>
                      <ul>
                        {commentImages.map((file, index) => (
                          <li key={index} className="text-muted">
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button variant="primary" type="submit" disabled={submittingComment} className="mt-2">
                    {submittingComment ? 'Отправка...' : 'Отправить'}
                  </Button>
                </Form>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}