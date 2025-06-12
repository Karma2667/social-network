'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, FormControl, ListGroup, Alert, Button } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import Link from 'next/link';
import { Pencil } from 'react-bootstrap-icons';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Используем Image для оптимизации изображений

export default function Communities() {
  const { userId, isInitialized } = useAuth();
  const [communities, setCommunities] = useState<{ _id: string; name: string; creator: { username: string } | null; avatar?: string }[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const router = useRouter();

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
    const fetchCommunities = async () => {
      try {
        console.log('Communities: Загрузка сообществ для userId:', userId);
        setLoading(true);
        const res = await fetch('/api/communities', {
          headers: { 'x-user-id': userId },
          cache: 'no-store',
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Не удалось загрузить сообщества');
        }
        const data = await res.json();
        setCommunities(data || []);
      } catch (err: any) {
        console.error('Communities: Ошибка загрузки сообществ:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunities();
  }, [isInitialized, userId]);

  if (loading) return <div>Загрузка...</div>;
  if (!isInitialized || !userId) return null;
  if (error) return <div>Ошибка: {error}</div>;

  const handleCreateClick = () => {
    router.push('/communities/create');
  };

  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(search.toLowerCase())
  );

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
                    active={false} // Активное состояние не используется здесь
                    onClick={() => router.push(`/communities/${community._id}`)}
                  >
                    <Image
                      src={community.avatar || '/default-community-avatar.png'} // Используем avatar с fallback
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
        {isDesktop && (
          <Col md={8}>
            <div className="p-3" style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
              <h2>Выбранное сообщество</h2>
              <p>Выберите сообщество для просмотра деталей.</p>
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
}