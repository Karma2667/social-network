'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/lib/AuthContext';
import { Container, Form, Button, Alert, Modal } from 'react-bootstrap';
import { Paperclip, Trash } from 'react-bootstrap-icons';
import EmojiPicker from '@/app/Components/EmojiPicker';
import Post from '@/app/Components/Post';

interface UserData {
  _id: string;
  username: string;
  avatar?: string;
}

interface CommentData {
  _id: string;
  userId: UserData;
  content: string;
  createdAt: string;
  images?: string[];
  likes?: string[];
  reactions?: { emoji: string; users: string[] }[];
}

interface PostData {
  _id: string;
  content: string;
  userId: UserData;
  communityId?: string;
  isCommunityPost?: boolean;
  createdAt: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: CommentData[];
}

export default function Home() {
  const { user, isInitialized, logout } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<File[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    if (!user?.userId || !isInitialized) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers = {
        'x-user-id': user.userId,
        'Authorization': `Bearer ${authToken}`,
      };

      const res = await fetch('/api/posts', {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Неизвестная ошибка (статус: ${res.status})` }));
        throw new Error(errorData.error || `Ошибка загрузки ленты новостей (статус: ${res.status})`);
      }
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки ленты новостей');
    }
  };

  useEffect(() => {
    if (isInitialized && user) {
      fetchPosts();
    }
  }, [isInitialized, user]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !postContent.trim() || !user?.userId) return;
    setSubmitting(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('authToken') || '';
      const headers: Record<string, string> = {
        'x-user-id': user.userId,
        'Authorization': `Bearer ${authToken}`,
      };

      const url = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
      const method = editingPostId ? 'PUT' : 'POST';
      const formData = new FormData();
      formData.append('content', postContent);
      postImages.forEach((file) => formData.append('images', file));

      const res = await fetch(url, {
        method,
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Неизвестная ошибка (статус: ${res.status})` }));
        throw new Error(errorData.error || `Не удалось ${editingPostId ? 'обновить' : 'создать'} пост`);
      }

      const updatedPost = await res.json();
      setPosts((prev) =>
        editingPostId
          ? prev.map((post) => (post._id === editingPostId ? updatedPost : post))
          : [updatedPost, ...prev]
      );
      setPostContent('');
      setPostImages([]);
      setEditingPostId(null);
      if (!editingPostId) await fetchPosts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setPostContent((prev) => prev + emoji);
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleEditPost = async (postId: string, content: string, images: File[]) => {
    if (!user) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const formData = new FormData();
      formData.append('content', content);
      images.forEach((file) => formData.append('images', file));

      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Не удалось обновить пост');
      const updatedPost = await res.json();
      setPosts((prev) => prev.map((post) => (post._id === postId ? updatedPost : post)));
      setEditingPostId(null);
      await fetchPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!user?.userId) return;
    try {
      setSubmitting(true);
      setError(null);
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Неизвестная ошибка (статус: ${res.status})` }));
        throw new Error(errorData.error || 'Не удалось удалить пользователя');
      }

      await logout();
      setShowDeleteModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isInitialized) return <div>Загрузка...</div>;
  if (!user) return null;

  return (
    <Container fluid>
      <div className="p-3 telegram-posts">
        <h5>Все посты</h5> {/* Изменил заголовок для отражения всех постов */}
        <Form onSubmit={handlePostSubmit} className="mb-3">
          <Form.Group className="mb-3 position-relative">
            <Form.Control
              as="textarea"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Что нового?"
              disabled={submitting}
              className="telegram-post-input"
            />
            <div className="position-absolute top-0 end-0 mt-1 me-2 d-flex align-items-center">
              <EmojiPicker onSelect={handleEmojiSelect} />
              <Button
                variant="link"
                onClick={handleFileSelect}
                disabled={submitting}
                className="ms-2"
                title="Прикрепить изображения"
              >
                <Paperclip size={24} />
              </Button>
              <Button
                variant="link"
                onClick={() => setShowDeleteModal(true)}
                disabled={submitting}
                className="ms-2 text-danger"
                title="Удалить аккаунт"
              >
                <Trash size={24} />
              </Button>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={(e) => {
                const files = e.target.files;
                if (files) setPostImages(Array.from(files));
              }}
              style={{ display: 'none' }}
            />
            {postImages.length > 0 && (
              <div className="mt-2">
                <p>Выбранные файлы:</p>
                <ul>
                  {postImages.map((file, index) => (
                    <li key={index} className="text-muted">{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </Form.Group>
          <Button
            variant="primary"
            type="submit"
            disabled={submitting || !postContent.trim()}
            className="telegram-post-button"
          >
            {submitting ? 'Отправка...' : editingPostId ? 'Обновить' : 'Опубликовать'}
          </Button>
          {editingPostId && (
            <Button
              variant="secondary"
              onClick={() => {
                setPostContent('');
                setPostImages([]);
                setEditingPostId(null);
              }}
              disabled={submitting}
              className="ms-2 telegram-profile-button"
            >
              Отмена
            </Button>
          )}
        </Form>
        {error && <Alert variant="danger">{error}</Alert>}
        {Array.isArray(posts) && posts.length > 0 ? (
          posts.map((post) => (
            <Post
              key={post._id}
              postId={post._id}
              username={post.userId.username}
              userId={post.userId._id}
              content={post.content}
              createdAt={post.createdAt}
              images={post.images}
              likes={post.likes}
              reactions={post.reactions}
              userAvatar={post.userId.avatar || '/default-avatar.png'}
              comments={post.comments}
              currentUserId={user.userId}
              isAdmin={false}
              fetchPosts={fetchPosts}
              onEdit={post.userId._id === user.userId ? handleEditPost : undefined}
            />
          ))
        ) : (
          <p className="text-muted">Нет постов для отображения.</p>
        )}
      </div>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Удаление аккаунта</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить свой аккаунт? Это действие нельзя отменить, и все ваши данные будут потеряны.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteUser} disabled={submitting}>
            {submitting ? 'Удаление...' : 'Удалить аккаунт'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}