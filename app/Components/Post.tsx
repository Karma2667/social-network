'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, Image, ListGroup } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import { HandThumbsUp, PencilSquare, Trash, Paperclip } from 'react-bootstrap-icons';
import EmojiPicker from './EmojiPicker';
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
  likes?: string[];
  reactions?: { emoji: string; users: string[] }[];
  images?: string[];
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
  const [showReactions, setShowReactions] = useState<null | boolean | string>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [comments, setComments] = useState<CommentProps[]>(initialComments);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setUserLiked(likes.includes(user.userId));
      const reaction = reactions.find((r) => r.users.includes(user.userId));
      setUserReaction(reaction ? reaction.emoji : null);
    }
    console.log('Post: Инициализация с комментариями:', comments.map((c) => ({
      id: c._id,
      user: c.userId.username,
      content: c.content,
      likes: c.likes?.length,
      reactions: c.reactions?.map((r) => ({ emoji: r.emoji, users: r.users.length })),
      images: c.images?.length,
    })));
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
      let imagePaths = images || [];
      if (editImages.length > 0) {
        const formData = new FormData();
        editImages.forEach((file) => formData.append('files', file));
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Не удалось загрузить изображения');
        imagePaths = [...imagePaths, ...(await uploadRes.json()).files];
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
      const newCommentObj = {
        _id: responseData._id,
        userId: { _id: user.userId, username: responseData.userId.username || user.username || 'Unknown' },
        content: responseData.content,
        createdAt: responseData.createdAt,
        likes: responseData.likes || [],
        reactions: responseData.reactions || [],
        images: responseData.images || [],
      };
      setComments((prevComments) => [...prevComments, newCommentObj]);
      setNewComment('');
      setCommentImages([]);
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка добавления комментария:', err.message);
    } finally {
      setSubmittingComment(false);
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
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Не удалось добавить реакцию к комментарию');
      }
      const updatedComment = await res.json();
      console.log('Reaction response:', updatedComment);
      setComments((prevComments) =>
        prevComments.map((c) =>
          c._id === commentId
            ? { ...c, ...updatedComment, userId: { _id: updatedComment.userId._id, username: updatedComment.userId.username || 'Unknown' } }
            : c
        )
      );
      await fetchPosts();
      setShowReactions(null);
    } catch (err: any) {
      console.error('Post: Ошибка реакции комментария:', err.message);
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
      console.log('Like response:', updatedComment);
      setComments((prevComments) =>
        prevComments.map((c) =>
          c._id === commentId
            ? { ...c, ...updatedComment, userId: { _id: updatedComment.userId._id, username: updatedComment.userId.username || 'Unknown' } }
            : c
        )
      );
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка лайка комментария:', err.message);
    }
  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditCommentContent(currentContent);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!user || !editCommentContent.trim()) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content: editCommentContent }),
      });

      if (!res.ok) throw new Error(await res.text() || 'Не удалось обновить комментарий');
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment._id === commentId ? { ...comment, content: editCommentContent } : comment
        )
      );
      setEditingCommentId(null);
      setEditCommentContent('');
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка редактирования комментария:', err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.userId, 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) throw new Error(await res.text() || 'Не удалось удалить комментарий');
      setComments((prevComments) => prevComments.filter((comment) => comment._id !== commentId));
      await fetchPosts();
    } catch (err: any) {
      console.error('Post: Ошибка удаления комментария:', err.message);
    }
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
            <Card.Title className="telegram-post-username">{username || 'Unknown User'}</Card.Title>
            <Card.Subtitle className="telegram-post-date">{formattedDate}</Card.Subtitle>
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
                className="telegram-post-textarea mb-2"
                placeholder="Введите текст поста с эмодзи..."
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
                  style={{ padding: '2px 6px' }}
                >
                  <Paperclip size={18} />
                </Button>
              </div>
              {editImages.length > 0 && (
                <div className="mt-2">
                  <p>Выбранные файлы:</p>
                  <ul>
                    {editImages.map((file, index) => (
                      <li key={index} className="text-muted">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="primary" type="submit" className="telegram-post-button">
                Сохранить
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(content);
                  setEditImages([]);
                }}
                className="telegram-post-button-secondary"
              >
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
              <div className="position-relative" onMouseEnter={() => setShowReactions(true)} onMouseLeave={() => setShowReactions(null)}>
                <Button
                  variant={userLiked ? 'primary' : 'outline-primary'}
                  onClick={handleLike}
                  className="telegram-post-like-button"
                >
                  <HandThumbsUp className="me-1" /> Лайк ({likes.length})
                </Button>
                {showReactions === true && (
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
            <Button
              variant="link"
              onClick={() => setShowComments(!showComments)}
              className="mt-2"
            >
              {showComments ? 'Скрыть комментарии' : 'Показать комментарии'} ({comments.length})
            </Button>
            {showComments && (
              <div className="mt-2">
                <ListGroup>
                  {comments.map((comment) => (
                    <ListGroup.Item
                      key={comment._id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      {editingCommentId === comment._id ? (
                        <Form
                          onSubmit={(e) => { e.preventDefault(); handleSaveEditComment(comment._id); }}
                          className="d-flex align-items-center"
                        >
                          <Form.Control
                            type="text"
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            className="me-2"
                            style={{ flex: 1 }}
                          />
                          <Button
                            variant="success"
                            onClick={() => handleSaveEditComment(comment._id)}
                          >
                            Сохранить
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setEditingCommentId(null)}
                            className="ms-2"
                          >
                            Отмена
                          </Button>
                        </Form>
                      ) : (
                        <>
                          <Comment
                            _id={comment._id}
                            userId={{ _id: comment.userId._id, username: comment.userId.username || 'Unknown' }}
                            content={comment.content}
                            createdAt={comment.createdAt}
                            likes={comment.likes || []}
                            reactions={comment.reactions || []}
                            images={comment.images || []}
                          />
                          <div className="ms-2">
                            <div
                              className="position-relative"
                              onMouseEnter={() => setShowReactions(comment._id)}
                              onMouseLeave={() => setShowReactions(null)}
                            >
                              <Button
                                variant={comment.likes?.includes(user?.userId || '') ? 'primary' : 'outline-primary'}
                                onClick={() => handleCommentLike(comment._id)}
                                className="me-2"
                                size="sm"
                              >
                                <HandThumbsUp className="me-1" /> {comment.likes?.length || 0}
                              </Button>
                              {showReactions === comment._id && (
                                <div
                                  className="reaction-menu position-absolute bg-light border rounded p-2"
                                  style={{ zIndex: 1000 }}
                                >
                                  <ReactionPicker
                                    onSelect={(emoji) => handleCommentReaction(comment._id, emoji)}
                                  />
                                </div>
                              )}
                            </div>
                            {comment.reactions && comment.reactions.length > 0 && (
                              <ListGroup horizontal className="mt-1">
                                {comment.reactions.map((r) => (
                                  <ListGroup.Item key={r.emoji} className="telegram-reaction-count">
                                    {r.emoji} {r.users.length}
                                  </ListGroup.Item>
                                ))}
                              </ListGroup>
                            )}
                            {user && user.userId === comment.userId._id && (
                              <>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleEditComment(comment._id, comment.content)}
                                  className="me-2"
                                >
                                  <PencilSquare />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteComment(comment._id)}
                                >
                                  <Trash />
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <Form onSubmit={handleAddComment} className="mt-3">
                  <Form.Group className="position-relative">
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Напишите комментарий..."
                      disabled={submittingComment}
                    />
                    <div
                      className="position-absolute"
                      style={{ bottom: '10px', right: '10px', display: 'flex', alignItems: 'center', zIndex: 10 }}
                    >
                      <EmojiPicker onSelect={(emoji) => setNewComment((prev) => prev + emoji)} />
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
                        style={{ padding: '2px 6px', marginLeft: '5px' }}
                        disabled={submittingComment}
                      >
                        <Paperclip size={18} />
                      </Button>
                    </div>
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
                  </Form.Group>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={submittingComment}
                    className="mt-2"
                  >
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