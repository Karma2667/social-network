'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/lib/AuthContext';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { Paperclip } from 'react-bootstrap-icons';
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
  createdAt: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: CommentData[];
}

export default function Home() {
  const { user, isInitialized } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    if (!user?.userId || !isInitialized) {
      console.log('Home: Нет userId или инициализация не завершена, пропуск загрузки');
      return;
    }
    try {
      console.log('Home: Загрузка постов для userId:', user.userId);
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch('/api/posts', {
        headers: {
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
      });
      console.log('Home: Ответ от API, статус:', res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Неизвестная ошибка (статус: ${res.status})` }));
        throw new Error(errorData.error || `Ошибка загрузки постов (статус: ${res.status})`);
      }
      const data = await res.json();
      console.log('Home: Получены данные постов:', data);
      setPosts(data);
    } catch (err: any) {
      console.error('Home: Ошибка загрузки постов:', err);
      setError(err.message || 'Ошибка загрузки постов');
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
      console.log('Home: Отправка поста для userId:', user.userId);
      const authToken = localStorage.getItem('authToken') || '';
      const formData = new FormData();
      formData.append('content', postContent);
      postImages.forEach((file) => formData.append('images', file));

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      console.log('Home: Ответ от API при создании поста, статус:', res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Неизвестная ошибка (статус: ${res.status})` }));
        throw new Error(errorData.error || `Не удалось создать пост (статус: ${res.status})`);
      }

      await fetchPosts();
      setPostContent('');
      setPostImages([]);
    } catch (err: any) {
      console.error('Home: Ошибка создания поста:', err);
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

  if (!isInitialized) return <div>Загрузка...</div>;
  if (!user) return null;

  return (
    <Container fluid>
      <div className="p-3 telegram-posts">
        <h5>Посты</h5>
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
            disabled={submitting || !postContent.trim()}
            className="telegram-post-button"
          >
            {submitting ? 'Отправка...' : 'Опубликовать'}
          </Button>
        </Form>
        {error && <Alert variant="danger">{error}</Alert>}
        {posts.length > 0 ? (
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
              fetchPosts={fetchPosts}
              userAvatar={post.userId.avatar || '/default-avatar.png'}
              comments={post.comments}
            />
          ))
        ) : (
          <p className="text-muted">Нет постов для отображения.</p>
        )}
      </div>
    </Container>
  );
}