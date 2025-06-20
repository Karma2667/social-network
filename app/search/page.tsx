'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { Form, FormControl, Button, Card, Container, Row, Col } from 'react-bootstrap';
import Link from 'next/link';

interface UserResult {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
  bio?: string;
  interests: string[];
  type: 'user';
}

interface CommunityResult {
  _id: string;
  name: string;
  avatar?: string;
  description?: string;
  interests: string[];
  creator?: { _id: string; username: string } | null;
  createdAt: Date;
  updatedAt?: Date;
  type: 'community';
}

type SearchResult = UserResult | CommunityResult;

export default function SearchPage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [isInitialized, user, initialQuery, router]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setError(null);
      return;
    }

    const debouncedSearch = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const authToken = localStorage.getItem('authToken') || '';
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
          headers: {
            'x-user-id': user?.userId || '',
            'Authorization': `Bearer ${authToken}`,
          },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Ошибка поиска: ${res.status} - ${res.statusText}`);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Неверный тип содержимого ответа');
        }
        const results = await res.json();
        if (!Array.isArray(results)) throw new Error('Неверный формат данных');
        setSearchResults(results);
      } catch (err: any) {
        console.error('SearchPage: Ошибка при выполнении поиска:', err);
        setError(err.message || 'Ошибка поиска пользователей или сообществ');
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Дебаунс 300ms

    return () => clearTimeout(debouncedSearch);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isInitialized) return <div>Загрузка...</div>;

  return (
    <Container className="mt-4">
      <h2>Поиск пользователей и сообществ</h2>
      <Form className="d-flex mb-4" onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }}>
        <FormControl
          type="text"
          placeholder="Поиск (#игры, @test5, test5)"
          className="me-2"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button
          variant="primary"
          onClick={() => handleSearch(searchQuery)}
          disabled={loading}
        >
          {loading ? 'Поиск...' : 'Найти'}
        </Button>
      </Form>

      {error && <p className="text-danger">{error}</p>}
      {searchResults.length > 0 ? (
        <Row>
          {searchResults.map((result) =>
            result.type === 'user' ? (
              <Col key={result._id} xs={12} md={6} lg={4} className="mb-4">
                <Card>
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      {result.avatar ? (
                        <img src={result.avatar} alt={result.username} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '50px', height: '50px', background: '#ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span>{result.username[0].toUpperCase()}</span>
                        </div>
                      )}
                      <div className="ms-3">
                        <Card.Title as={Link} href={`/profile/${result._id}`} style={{ color: '#000', textDecoration: 'none' }}>
                          @{result.username}
                        </Card.Title>
                        {result.name && <Card.Subtitle className="text-muted">{result.name}</Card.Subtitle>}
                      </div>
                    </div>
                    {result.bio && (
                      <Card.Text>
                        {truncateText(result.bio, 100)}
                      </Card.Text>
                    )}
                    <div>
                      {result.interests.length > 0 ? (
                        result.interests.map((interest, index) => (
                          <span key={index} className="badge bg-secondary me-1">{interest}</span>
                        ))
                      ) : (
                        <span className="text-muted">Нет интересов</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <Link href={`/chat/${result._id}`} className="btn btn-primary btn-sm me-2">Написать</Link>
                      <Link href={`/profile/${result._id}`} className="btn btn-outline-primary btn-sm">Профиль</Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ) : result.type === 'community' ? (
              <Col key={result._id} xs={12} md={6} lg={4} className="mb-4">
                <Card>
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      {result.avatar ? (
                        <img src={result.avatar} alt={result.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '50px', height: '50px', background: '#ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span>{result.name[0].toUpperCase()}</span>
                        </div>
                      )}
                      <div className="ms-3">
                        <Card.Title as={Link} href={`/communities/${result._id}`} style={{ color: '#000', textDecoration: 'none' }}>
                          {result.name}
                        </Card.Title>
                        {result.creator?.username && (
                          <Card.Subtitle className="text-muted">Создатель: {result.creator.username}</Card.Subtitle>
                        )}
                      </div>
                    </div>
                    {result.description && (
                      <Card.Text>
                        {truncateText(result.description, 100)}
                      </Card.Text>
                    )}
                    <div>
                      {result.interests.length > 0 ? (
                        result.interests.map((interest, index) => (
                          <span key={index} className="badge bg-secondary me-1">{interest}</span>
                        ))
                      ) : (
                        <span className="text-muted">Нет интересов</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <Link href={`/communities/${result._id}`} className="btn btn-primary btn-sm">Перейти</Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ) : null
          )}
        </Row>
      ) : !loading && !error ? (
        <p className="text-muted">Нет результатов</p>
      ) : null}
    </Container>
  );
}