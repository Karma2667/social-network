'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, Image, ListGroup } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import { HandThumbsUp, PencilSquare, Trash, Paperclip } from 'react-bootstrap-icons';
import EmojiPicker from './EmojiPicker';
import ReactionPicker from './ReactionPicker';
import Comment from './Comment';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

interface CommentProps {
  _id: string;
  userId: { _id: string; username: string; avatar?: string };
  content: string;
  createdAt: string;
  likes?: string[];
  reactions?: { emoji: string; users: string[] }[];
  images?: string[];
  userAvatar?: string;
}

interface PostProps {
  postId: string;
  username: string;
  content: string;
  createdAt: string | number;
  userId: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: CommentProps[];
  userAvatar?: string;
  fetchPosts: () => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
  currentUserId?: string;
  isAdmin?: boolean;
}

export default function Post({
  postId,
  username,
  content,
  createdAt,
  userId,
  likes = [],
  reactions = [],
  images = [],
  comments = [],
  userAvatar,
  fetchPosts,
  onDelete,
  currentUserId,
  isAdmin = false,
}: PostProps) {
  const { user, avatar } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [userLiked, setUserLiked] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState<null | boolean | string>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsState, setCommentsState] = useState<CommentProps[]>(comments);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setUserLiked(likes.includes(user.userId));
      const reaction = reactions.find((r) => r.users.includes(user.userId));
      setUserReaction(reaction ? reaction.emoji : null);
    }
    setCommentsState(comments);
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
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка лайка:', err.message);
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
      await fetchPosts();
      setShowReactions(null);
    } catch (err: any) {
      console.error('Post: Ошибка реакции:', err.message);
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
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Не удалось загрузить изображения');
        imagePaths = [...images, ...(await uploadRes.json()).files];
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
      setEditImages([]);
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка редактирования:', err.message);
    }
  };

  const handleDelete = async () => {
    if (!user || !onDelete) return;
    if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) return;

    try {
      await onDelete(postId);
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка удаления:', err.message);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setEditContent((prev) => prev + emoji);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmittingComment(true);

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const formData = new FormData();
      formData.append('content', newComment);
      formData.append('postId', postId);
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
      const userAvatar = avatar || '/default-avatar.png';
      const newCommentObj: CommentProps = {
        _id: responseData._id,
        userId: { 
          _id: user.userId, 
          username: user.username || 'Unknown', 
          avatar: userAvatar 
        },
        content: responseData.content,
        createdAt: responseData.createdAt,
        likes: responseData.likes || [],
        reactions: responseData.reactions || [],
        images: responseData.images || [],
      };
      setCommentsState((prev) => [...prev, newCommentObj]);
      setNewComment('');
      setCommentImages([]);
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка добавления комментария:', err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/comments/${commentId}/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: user.userId }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось поставить/убрать лайк к комментарию');
      const updatedComment = await res.json();
      setCommentsState((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, ...updatedComment, userId: { ...c.userId, ...updatedComment.userId } }
            : c
        )
      );
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка лайка комментария:', err.message);
    }
  };

  const handleCommentReaction = async (commentId: string, emoji: string) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId: user.userId, emoji }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось добавить реакцию к комментарию');
      const updatedComment = await res.json();
      setCommentsState((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, ...updatedComment, userId: { ...c.userId, ...updatedComment.userId } }
            : c
        )
      );
      await fetchPosts();
      setShowReactions(null);
    } catch (err: any) {
      console.error('Post: Ошибка реакции комментария:', err.message);
    }
  };

  const handleCommentEdit = async (commentId: string, newContent: string, newImages: string[]) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content: newContent, images: newImages }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось обновить комментарий');
      const updatedComment = await res.json();
      setCommentsState((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, ...updatedComment, userId: { ...c.userId, ...updatedComment.userId } }
            : c
        )
      );
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка редактирования комментария:', err.message);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось удалить комментарий');
      setCommentsState((prev) => prev.filter((c) => c._id !== commentId));
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка удаления комментария:', err.message);
    }
  };

  const handleAddCommentEmoji = (emoji: string) => {
    setNewComment((prev) => prev + emoji);
  };

  const avatarUrl = userAvatar && userAvatar.trim() && userAvatar !== '/default-avatar.png'
    ? userAvatar
    : '/default-avatar.png';

  const formattedDate = typeof createdAt === 'number'
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const canEditDelete = user?.userId === userId || (isAdmin && currentUserId);

  return (
    <Card className="telegram-post-card mb-3">
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          <Image
            src={avatarUrl}
            roundedCircle
            width={40}
            height={40}
            className="me-3"
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
          />
          <div>
            <Card.Title>{username || 'Unknown User'}</Card.Title>
            <Card.Subtitle className="text-muted">{formattedDate}</Card.Subtitle>
          </div>
        </div>
        {isEditing ? (
          <Form onSubmit={handleEdit}>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={4}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="mb-2"
              />
              <div className="d-flex gap-2 mb-2">
                <EmojiPicker onSelect={handleAddEmoji} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files) setEditImages(Array.from(target.files));
                  }}
                  style={{ display: 'none' }}
                  id={`edit-file-${postId}`}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => document.getElementById(`edit-file-${postId}`)?.click()}
                >
                  <Paperclip />
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
            <Card.Text>{content}</Card.Text>
            {images.length > 0 && (
              <div className="mb-3">
                {images.map((image, index) => (
                  <Image key={index} src={image} thumbnail className="me-2" style={{ maxWidth: '100px' }} />
                ))}
              </div>
            )}
            <div className="d-flex gap-3 align-items-center mt-2">
              <Button
                variant={userLiked ? 'primary' : 'outline-primary'}
                onClick={handleLike}
                className="d-flex align-items-center"
              >
                <HandThumbsUp className="me-1" /> {likes.length}
              </Button>
              <div className="position-relative">
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowReactions(true)}
                  className="d-flex align-items-center"
                >
                  Реакции
                </Button>
                {showReactions === true && (
                  <div className="position-absolute bg-light border rounded p-2" style={{ zIndex: 1000 }}>
                    <ReactionPicker onSelect={handleReaction} />
                  </div>
                )}
              </div>
              {canEditDelete && (
                <>
                  <Button variant="outline-secondary" onClick={() => setIsEditing(true)}>
                    <PencilSquare /> Редактировать
                  </Button>
                  <Button variant="outline-danger" onClick={handleDelete}>
                    <Trash /> Удалить
                  </Button>
                </>
              )}
            </div>
            {reactions.length > 0 && (
              <div className="mt-2">
                {reactions.map((r) => (
                  <span key={r.emoji} className="me-2">{r.emoji} ({r.users.length})</span>
                ))}
              </div>
            )}
            <Button
              variant="link"
              onClick={() => setShowComments(!showComments)}
              className="mt-2"
            >
              {showComments ? 'Скрыть комментарии' : 'Показать комментарии'} ({commentsState.length})
            </Button>
            {showComments && (
              <div className="mt-2">
                <ListGroup>
                  {commentsState.map((comment) => (
                    <ListGroup.Item key={comment._id} className="mb-2">
                      <Comment
                        _id={comment._id}
                        userId={comment.userId}
                        content={comment.content}
                        createdAt={comment.createdAt}
                        likes={comment.likes}
                        reactions={comment.reactions}
                        images={comment.images}
                        userAvatar={comment.userId.avatar}
                        onCommentLike={handleCommentLike}
                        onCommentReaction={handleCommentReaction}
                        currentUserId={user?.userId}
                        onCommentEdit={handleCommentEdit}
                        onCommentDelete={handleCommentDelete}
                      />
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <Form onSubmit={handleAddComment} className="mt-3">
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Напишите комментарий..."
                      disabled={submittingComment}
                    />
                    <div className="d-flex gap-2 mt-2" style={{ position: 'relative', zIndex: 1001 }}>
                      <EmojiPicker onSelect={handleAddCommentEmoji} />
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
                        variant="outline-secondary"
                        onClick={() => document.getElementById(`comment-file-${postId}`)?.click()}
                      >
                        <Paperclip />
                      </Button>
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="ms-2"
                      >
                        {submittingComment ? 'Отправка...' : 'Отправить'}
                      </Button>
                    </div>
                    {commentImages.length > 0 && (
                      <div className="mt-2">
                        <p>Выбранные файлы:</p>
                        <ul>
                          {commentImages.map((file, index) => (
                            <li key={index}>{file.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Form.Group>
                </Form>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}