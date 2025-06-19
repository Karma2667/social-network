'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { useRouter } from 'next/navigation';
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
    if (!isInitialized || !user) {
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
      if (!res.ok) {
        throw new Error(`Ошибка поиска: ${res.status} - ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Неверный тип содержимого ответа');
      }
      const results = await res.json();
      if (!Array.isArray(results)) {
        throw new Error('Неверный формат данных');
      }
      setSearchResults(results);
    } catch (err: any) {
      console.error('SearchPage: Ошибка при выполнении поиска:', err);
      setError(err.message || 'Ошибка поиска пользователей или сообществ');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const truncateBio = (bio: string, maxLength: number) => {
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength) + '...';
  };

  if (!isInitialized || !user) {
    return <div>Загрузка...</div>;
  }

  return (
    <Container className="telegram-search-page mt-4">
      <h2 className="telegram-search-title">Поиск пользователей и сообществ</h2>
      <Form className="d-flex mb-4" onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }}>
        <FormControl
          type="text"
          placeholder="Поиск (#игры, @test5, test5)"
          className="me-2 telegram-search-input"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
        />
        <Button
          variant="primary"
          onClick={() => handleSearch(searchQuery)}
          disabled={loading}
          className="telegram-search-button"
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
                <Card className="telegram-user-card">
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      {result.avatar ? (
                        <img
                          src={result.avatar}
                          alt={result.username}
                          className="telegram-user-card-avatar"
                        />
                      ) : (
                        <div className="telegram-user-card-avatar bg-secondary rounded-circle d-flex align-items-center justify-content-center">
                          <span>{result.username[0].toUpperCase()}</span>
                        </div>
                      )}
                      <div className="ms-3">
                        <Card.Title as={Link} href={`/profile/${result._id}`} className="telegram-user-card-username">
                          @{result.username}
                        </Card.Title>
                        {result.name && (
                          <Card.Subtitle className="text-muted telegram-user-card-name">
                            {result.name}
                          </Card.Subtitle>
                        )}
                      </div>
                    </div>
                    {result.bio ? (
                      <Card.Text className="telegram-user-card-bio">
                        {truncateBio(result.bio, 100)}
                      </Card.Text>
                    ) : (
                      <Card.Text className="telegram-user-card-bio text-muted">
                        Нет описания
                      </Card.Text>
                    )}
                    <div className="telegram-user-card-interests mb-3">
                      {result.interests?.length > 0 ? (
                        result.interests.map((interest: string, index: number) => (
                          <span key={index} className="telegram-user-card-interest">
                            {interest}
                          </span>
                        ))
                      ) : (
                        <span className="telegram-user-card-no-interests">
                          Нет интересов
                        </span>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      <Link href={`/chat/${result._id}`} className="telegram-user-card-button telegram-user-card-button-primary">
                        Написать
                      </Link>
                      <Link href={`/profile/${result._id}`} className="telegram-user-card-button telegram-user-card-button-secondary">
                        Профиль
                      </Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ) : result.type === 'community' ? (
              <Col key={result._id} xs={12} md={6} lg={4} className="mb-4">
                <Card className="telegram-user-card">
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      {result.avatar ? (
                        <img
                          src={result.avatar}
                          alt={result.name}
                          className="telegram-user-card-avatar"
                        />
                      ) : (
                        <div className="telegram-user-card-avatar bg-secondary rounded-circle d-flex align-items-center justify-content-center">
                          <span>{result.name[0].toUpperCase()}</span>
                        </div>
                      )}
                      <div className="ms-3">
                        <Card.Title as={Link} href={`/communities/${result._id}`} className="telegram-user-card-username">
                          {result.name}
                        </Card.Title>
                        {result.creator?.username && (
                          <Card.Subtitle className="text-muted telegram-user-card-name">
                            Создатель: {result.creator.username}
                          </Card.Subtitle>
                        )}
                      </div>
                    </div>
                    {result.description ? (
                      <Card.Text className="telegram-user-card-bio">
                        {truncateBio(result.description, 100)}
                      </Card.Text>
                    ) : (
                      <Card.Text className="telegram-user-card-bio text-muted">
                        Нет описания
                      </Card.Text>
                    )}
                    <div className="telegram-user-card-interests mb-3">
                      {result.interests?.length > 0 ? (
                        result.interests.map((interest: string, index: number) => (
                          <span key={index} className="telegram-user-card-interest">
                            {interest}
                          </span>
                        ))
                      ) : (
                        <span className="telegram-user-card-no-interests">
                          Нет интересов
                        </span>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      <Link href={`/communities/${result._id}`} className="telegram-user-card-button telegram-user-card-button-primary">
                        Перейти
                      </Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ) : null
          )}
        </Row>
      ) : (
        <p className="text-muted telegram-search-no-results">Нет результатов</p>
      )}
    </Container>
  );
}