'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { Container, Row, Col, Tabs, Tab, ListGroup, Button, Image, Spinner } from 'react-bootstrap';
import { PersonAdd, PersonCheck, PersonDash } from 'react-bootstrap-icons'; // Иконки для действий

interface Connection {
  _id: string;
  username: string;
}

interface FriendRequest {
  _id: string;
  fromUser: { _id: string; username: string };
  toUser: { _id: string; username: string };
}

export default function ConnectionsPage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Connection[]>([]);
  const [followers, setFollowers] = useState<Connection[]>([]);
  const [following, setFollowing] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      console.log('ConnectionsPage: Ожидание инициализации AuthContext...');
      return;
    }

    if (!user) {
      console.log('ConnectionsPage: Пользователь не авторизован, редирект на /login');
      router.replace('/login');
      return;
    }

    const fetchConnections = async () => {
      try {
        setLoading(true);
        const authToken = localStorage.getItem('authToken') || '';
        const res = await fetch('/api/friends', {
          headers: {
            'x-user-id': user.userId,
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Не удалось загрузить связи');
        }

        const data = await res.json();
        setIncomingRequests(data.incomingRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
        setFriends(data.friends || []);
        setFollowers(data.followers || []);
        setFollowing(data.following || []);
      } catch (err: any) {
        console.error('ConnectionsPage: Ошибка загрузки связей:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [isInitialized, user, router]);

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch('/api/friends', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.userId || '',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ requestId, action }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Не удалось ${action === 'accept' ? 'принять' : 'отклонить'} запрос`);
      }

      if (action === 'accept') {
        const acceptedRequest = incomingRequests.find((req) => req._id === requestId);
        if (acceptedRequest) {
          setFriends((prev) => [...prev, acceptedRequest.fromUser]);
        }
      }
      setIncomingRequests((prev) => prev.filter((req) => req._id !== requestId));
    } catch (err: any) {
      console.error('ConnectionsPage: Ошибка обработки запроса:', err.message);
      setError(err.message);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/friends?requestId=${requestId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.userId || '',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось отменить запрос');
      }

      setOutgoingRequests((prev) => prev.filter((req) => req._id !== requestId));
    } catch (err: any) {
      console.error('ConnectionsPage: Ошибка отмены запроса:', err.message);
      setError(err.message);
    }
  };

  const handleFollowToggle = async (toUserId: string, isCurrentlyFollowing: boolean) => {
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const action = isCurrentlyFollowing ? 'unfollow' : 'follow';
      const method = action === 'follow' ? 'POST' : 'PUT';
      const res = await fetch('/api/friends', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.userId || '',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ toUserId, action }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Не удалось ${action === 'follow' ? 'подписаться' : 'отписаться'}`);
      }

      if (action === 'follow') {
        setFollowing((prev) => [...prev, { _id: toUserId, username: followers.find((f) => f._id === toUserId)?.username || '' }]);
      } else {
        setFollowing((prev) => prev.filter((f) => f._id !== toUserId));
      }
    } catch (err: any) {
      console.error('ConnectionsPage: Ошибка подписки/отписки:', err.message);
      setError(err.message);
    }
  };

  if (!isInitialized || loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="telegram-main">
      <Row>
        <Col>
          <div className="p-3">
            <h4 className="telegram-search-title">Контакты</h4>
            <Tabs defaultActiveKey="friends" id="connections-tabs" className="mb-3">
              <Tab eventKey="friends" title={`Друзья (${friends.length})`}>
                <ListGroup>
                  {friends.length > 0 ? (
                    friends.map((friend) => (
                      <ListGroup.Item key={friend._id} className="telegram-user-item">
                        <div className="d-flex align-items-center">
                          <Image
                            src="/default-avatar.png"
                            alt={friend.username}
                            roundedCircle
                            className="telegram-user-avatar"
                          />
                          <div className="telegram-user-name">
                            {friend.username}
                          </div>
                          <Button
                            variant="link"
                            onClick={() => router.push(`/profile/${friend._id}`)}
                            className="telegram-link-button"
                          >
                            Профиль
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <p className="text-muted">У вас пока нет друзей.</p>
                  )}
                </ListGroup>
              </Tab>
              <Tab eventKey="followers" title={`Подписчики (${followers.length})`}>
                <ListGroup>
                  {followers.length > 0 ? (
                    followers.map((follower) => {
                      const isCurrentlyFollowing = following.some((f) => f._id === follower._id);
                      return (
                        <ListGroup.Item key={follower._id} className="telegram-user-item">
                          <div className="d-flex align-items-center">
                            <Image
                              src="/default-avatar.png"
                              alt={follower.username}
                              roundedCircle
                              className="telegram-user-avatar"
                            />
                            <div className="telegram-user-name">
                              {follower.username}
                            </div>
                            <Button
                              variant="link"
                              onClick={() => router.push(`/profile/${follower._id}`)}
                              className="telegram-link-button me-2"
                            >
                              Профиль
                            </Button>
                            <Button
                              className="telegram-profile-button"
                              onClick={() => handleFollowToggle(follower._id, isCurrentlyFollowing)}
                            >
                              {isCurrentlyFollowing ? (
                                <>
                                  <PersonDash className="me-1" /> Отписаться
                                </>
                              ) : (
                                <>
                                  <PersonAdd className="me-1" /> Подписаться
                                </>
                              )}
                            </Button>
                          </div>
                        </ListGroup.Item>
                      );
                    })
                  ) : (
                    <p className="text-muted">У вас пока нет подписчиков.</p>
                  )}
                </ListGroup>
              </Tab>
              <Tab eventKey="following" title={`Подписки (${following.length})`}>
                <ListGroup>
                  {following.length > 0 ? (
                    following.map((follow) => (
                      <ListGroup.Item key={follow._id} className="telegram-user-item">
                        <div className="d-flex align-items-center">
                          <Image
                            src="/default-avatar.png"
                            alt={follow.username}
                            roundedCircle
                            className="telegram-user-avatar"
                          />
                          <div className="telegram-user-name">
                            {follow.username}
                          </div>
                          <Button
                            variant="link"
                            onClick={() => router.push(`/profile/${follow._id}`)}
                            className="telegram-link-button me-2"
                          >
                            Профиль
                          </Button>
                          <Button
                            className="telegram-profile-button"
                            onClick={() => handleFollowToggle(follow._id, true)}
                          >
                            <PersonDash className="me-1" /> Отписаться
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <p className="text-muted">Вы пока ни на кого не подписаны.</p>
                  )}
                </ListGroup>
              </Tab>
              <Tab eventKey="incoming" title={`Входящие (${incomingRequests.length})`}>
                <ListGroup>
                  {incomingRequests.length > 0 ? (
                    incomingRequests.map((request) => (
                      <ListGroup.Item key={request._id} className="telegram-user-item">
                        <div className="d-flex align-items-center">
                          <Image
                            src="/default-avatar.png"
                            alt={request.fromUser.username}
                            roundedCircle
                            className="telegram-user-avatar"
                          />
                          <div className="telegram-user-name">
                            {request.fromUser.username}
                          </div>
                          <Button
                            className="telegram-profile-button me-2"
                            onClick={() => handleRequestAction(request._id, 'accept')}
                          >
                            <PersonCheck className="me-1" /> Принять
                          </Button>
                          <Button
                            variant="outline-secondary"
                            onClick={() => handleRequestAction(request._id, 'reject')}
                            className="telegram-profile-button"
                          >
                            Отклонить
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <p className="text-muted">Нет входящих запросов.</p>
                  )}
                </ListGroup>
              </Tab>
              <Tab eventKey="outgoing" title={`Исходящие (${outgoingRequests.length})`}>
                <ListGroup>
                  {outgoingRequests.length > 0 ? (
                    outgoingRequests.map((request) => (
                      <ListGroup.Item key={request._id} className="telegram-user-item">
                        <div className="d-flex align-items-center">
                          <Image
                            src="/default-avatar.png"
                            alt={request.toUser.username}
                            roundedCircle
                            className="telegram-user-avatar"
                          />
                          <div className="telegram-user-name">
                            {request.toUser.username}
                          </div>
                          <Button
                            variant="outline-secondary"
                            onClick={() => handleCancelRequest(request._id)}
                            className="telegram-profile-button"
                          >
                            Отменить
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <p className="text-muted">Нет исходящих запросов.</p>
                  )}
                </ListGroup>
              </Tab>
            </Tabs>
          </div>
        </Col>
      </Row>
    </Container>
  );
}