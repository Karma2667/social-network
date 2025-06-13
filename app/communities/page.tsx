'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, FormControl, ListGroup, Alert, Button, Form } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import Link from 'next/link';
import { Pencil } from 'react-bootstrap-icons';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Paperclip } from 'react-bootstrap-icons';
import EmojiPicker from '@/app/Components/EmojiPicker';
import Post from '@/app/Components/Post';

interface CommunityData {
  _id: string;
  name: string;
  creator: { username: string } | null;
  avatar?: string;
  description?: string;
  interests?: string[];
  members?: { _id: string; username: string }[];
  admins?: { _id: string; username: string }[];
}

interface PostData {
  _id: string;
  content: string;
  communityId?: string;
  userId: {
    _id: string;
    username: string;
    userAvatar?: string;
  };
  createdAt: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: any[];
}

export default function Communities() {
  const { userId, isInitialized } = useAuth();
  const params = useParams();
  const communityId = params?.id as string | undefined;
  const [communities, setCommunities] = useState<CommunityData[]>([]);
  const [currentCommunity, setCurrentCommunity] = useState<CommunityData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [search, setSearch] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    if (!communityId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?communityId=${communityId}`, {
        headers: { 'x-user-id': userId || '' },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось загрузить посты');
      }
      const data = await res.json();
      console.log('fetchPosts: Полученные данные:', data);
      if (Array.isArray(data)) {
        setPosts(data);
      } else if (data.message === 'Посты не найдены') {
        setPosts([]);
      } else {
        throw new Error('Неверный формат данных постов');
      }
    } catch (err: any) {
      console.error('Communities: Ошибка загрузки постов:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunity = async () => {
    if (!communityId) return;
    try {
      const res = await fetch(`/api/communities/${communityId}`, {
        headers: { 'x-user-id': userId || '' },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось загрузить сообщество');
      }
      const data = await res.json();
      console.log('fetchCommunity: Загружено сообщество:', data);
      setCurrentCommunity(data);
    } catch (err: any) {
      console.error('Communities: Ошибка загрузки сообщества:', err);
      setError(err.message);
    }
  };

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/communities', {
        headers: { 'x-user-id': userId || '' },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось загрузить список сообществ');
      }
      const data = await res.json();
      console.log('fetchCommunities: Загружены сообщества:', data);
      setCommunities(data || []);
    } catch (err: any) {
      console.error('Communities: Ошибка загрузки сообществ:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
      console.log('Communities: Проверка isDesktop:', desktop);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (!isInitialized || !userId) {
      console.log('Communities: Ожидание инициализации или userId:', { isInitialized, userId });
      return;
    }
    fetchCommunities();
    if (communityId) {
      fetchCommunity();
      fetchPosts();
    }
  }, [isInitialized, userId, communityId]);

  if (loading) return <div>Загрузка...</div>;
  if (!isInitialized || !userId) return null;
  if (error) return <div>Ошибка: {error}</div>;

  const handleCreateClick = () => {
    router.push('/communities/create');
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !postContent.trim() || !communityId) return;
    setSubmitting(true);
    setError(null);

    try {
      console.log('Communities: Отправка поста для communityId:', communityId);
      const authToken = localStorage.getItem('authToken') || '';
      const formData = new FormData();
      formData.append('content', postContent);
      formData.append('communityId', communityId);
      postImages.forEach((file) => formData.append('images', file));

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось создать пост');
      }

      await fetchPosts();
      setPostContent('');
      setPostImages([]);
    } catch (err: any) {
      console.error('Communities: Ошибка создания поста:', err);
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

  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(search.toLowerCase())
  );

  console.log('Communities: Рендеринг, isDesktop:', isDesktop, 'communityId:', communityId, 'currentCommunity:', currentCommunity);

  return (
    <Container fluid className="mt-3">
      {error && <Alert variant="danger">{error}</Alert>}
      <Row>
        <Col md={4} className="border-end" style={{ backgroundColor: '#f8f9fa', height: 'calc(100vh - 56px)' }}>
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>Сообщества</h4>
              <Button
                variant="outline-secondary"
                size="sm"
                className="p-1"
                onClick={handleCreateClick}
              >
                <Pencil />
              </Button>
            </div>
            <FormControl
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Поиск сообщества..."
              className="mb-3"
            />
            <ListGroup>
              {filteredCommunities.length === 0 ? (
                <ListGroup.Item>Пока нет сообществ</ListGroup.Item>
              ) : (
                filteredCommunities.map((community) => (
                  <ListGroup.Item
                    key={community._id}
                    action
                    active={community._id === communityId}
                    onClick={() => router.push(`/communities/${community._id}`)}
                  >
                    <Image
                      src={community.avatar || '/default-community-avatar.png'}
                      alt={community.name}
                      width={30}
                      height={30}
                      className="rounded-circle me-2"
                    />
                    {community.name} (Создатель: {community.creator?.username || 'Неизвестный'})
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </div>
        </Col>
        {communityId && currentCommunity && (
          <Col md={8}>
            <div className="p-3" style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
              <Form onSubmit={handlePostSubmit} className="mb-3">
                <Form.Group className="mb-3 position-relative">
                  <Form.Control
                    as="textarea"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder={`Напишите пост от лица ${currentCommunity.name || 'сообщества'}...`}
                    disabled={submitting}
                    style={{ minHeight: '100px' }}
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
                >
                  {submitting ? 'Отправка...' : 'Опубликовать'}
                </Button>
              </Form>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Post
                    key={post._id}
                    postId={post._id}
                    username={currentCommunity.name || 'Сообщество'}
                    userId={post.communityId || communityId}
                    content={post.content}
                    createdAt={post.createdAt}
                    images={post.images}
                    likes={post.likes}
                    reactions={post.reactions}
                    fetchPosts={fetchPosts}
                    userAvatar={currentCommunity.avatar || '/default-community-avatar.png'}
                    comments={post.comments || []}
                  />
                ))
              ) : (
                <p className="text-muted">Нет постов для отображения.</p>
              )}
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
}