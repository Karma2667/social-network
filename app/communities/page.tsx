'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { 
  Container, 
  Row, 
  Col, 
  FormControl, 
  ListGroup, 
  Alert, 
  Button,
  Image // Ensure Image is imported from react-bootstrap
} from 'react-bootstrap';
import { Pencil } from 'react-bootstrap-icons';

interface CommunityListItem {
  _id: string;
  name: string;
  avatar: string;
  creator: { username: string } | null;
}

export default function CommunitiesPage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();

  const [communities, setCommunities] = useState<CommunityListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCommunities = async () => {
    if (!user?.userId || !isInitialized) {
      setError('Пользователь не инициализирован');
      return;
    }
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch('/api/communities', {
        headers: {
          'x-user-id': user.userId,
          'Authorization': `Bearer ${authToken}`,
        },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось загрузить список сообществ');
      const data = await res.json();
      console.log('Полученные сообщества:', data);
      if (Array.isArray(data)) {
        setCommunities(data.map((item: any) => ({
          _id: item._id,
          name: item.name,
          avatar: item.avatar || '/default-community-avatar.png',
          creator: item.creator || null,
        })));
      } else {
        console.error('Неверный формат данных сообществ:', data);
        setCommunities([]);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки сообществ:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    router.push('/communities/create');
  };

  useEffect(() => {
    if (isInitialized && user) {
      fetchCommunities();
    }
  }, [isInitialized, user]);

  const filteredCommunities = communities.filter((comm) =>
    comm.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <Container fluid>
      <Row>
        <Col md={3} className="border-end" style={{ backgroundColor: '#f8f9fa', height: 'calc(100vh - 56px)' }}>
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>Сообщества</h4>
              <Button variant="outline-secondary" size="sm" className="p-1" onClick={handleCreateClick}>
                <Pencil />
              </Button>
            </div>
            <FormControl
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск сообщества..."
              className="mb-3"
            />
            <ListGroup>
              {filteredCommunities.length === 0 ? (
                <ListGroup.Item>Пока нет сообществ</ListGroup.Item>
              ) : (
                filteredCommunities.map((comm) => (
                  <ListGroup.Item
                    key={comm._id}
                    action
                    onClick={() => router.push(`/communities/${comm._id}`)}
                  >
                    <Image
                      src={comm.avatar}
                      roundedCircle
                      style={{ width: '30px', height: '30px', marginRight: '10px' }}
                    />
                    {comm.name} (Создатель: {comm.creator?.username || 'Неизвестный'})
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </div>
        </Col>
        <Col md={9}>
          <h3>Список сообществ</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          {communities.length === 0 && <p>Пока нет сообществ.</p>}
        </Col>
      </Row>
    </Container>
  );
}