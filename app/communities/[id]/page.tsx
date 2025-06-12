'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { 
  Container, 
  Row, 
  Col, 
  FormControl, 
  ListGroup, 
  Alert, 
  Modal, 
  Image, 
  OverlayTrigger, 
  Tooltip, 
  Button, 
  Form, 
  FormGroup, 
  FormLabel 
} from 'react-bootstrap';
import { Pencil, Trash, Plus } from 'react-bootstrap-icons';
import Post from '@/app/Components/Post';

interface CommunityData {
  _id: string;
  name: string;
  description: string;
  interests: string[];
  avatar: string;
  creator: { _id: string; username: string } | null;
  members: { _id: string; username: string }[];
  admins: ({ _id: string; username: string } | string)[];
}

interface CommunityListItem {
  _id: string;
  name: string;
  avatar: string;
  creator: { username: string } | null;
}

interface Friend {
  _id: string;
  username: string;
}

interface PostData {
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
  comments?: CommentProps[];
}

interface CommentProps {
  _id: string;
  userId: { _id: string; username: string };
  content: string;
  createdAt: string;
}

export default function CommunityPage() {
  const params = useParams();
  const paramId = params?.id;
  const { userId, isInitialized } = useAuth();
  const router = useRouter();

  const id = typeof paramId === 'string' ? paramId : null;
  if (!id) {
    return <div>Неверный ID сообщества</div>;
  }

  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInterests, setNewInterests] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [communities, setCommunities] = useState<CommunityListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const fetchCommunity = async (retry = false) => {
    if (!isInitialized || !userId) {
      setError('Пользователь не инициализирован');
      return;
    }
    try {
      const res = await fetch(`/api/communities/${id}`, {
        headers: { 'x-user-id': userId! },
      });
      if (!res.ok) throw new Error('Не удалось загрузить сообщество');
      const data = await res.json();
      setCommunity(data);
      setNewName(data.name);
      setNewDescription(data.description || '');
      setNewInterests(data.interests.join(', '));
      setNewAvatar(data.avatar || '');
    } catch (err: any) {
      console.error('Ошибка загрузки сообщества:', err);
      if (retry && retryCount < maxRetries) {
        setTimeout(() => fetchCommunity(true), 1000 * (retryCount + 1));
        setRetryCount(retryCount + 1);
      } else {
        setError(err.message);
      }
    }
  };

  const fetchPosts = async (retry = false) => {
    if (!isInitialized || !userId) {
      setError('Пользователь не инициализирован');
      return;
    }
    try {
      const res = await fetch(`/api/posts?communityId=${id}`, {
        headers: { 'x-user-id': userId! },
      });
      if (!res.ok) throw new Error('Не удалось загрузить посты');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPosts(data.map((post: any) => ({ ...post, fetchPosts })));
      } else {
        console.error('Неверный формат данных постов:', data);
        setPosts([]);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки постов:', err);
      if (retry && retryCount < maxRetries) {
        setTimeout(() => fetchPosts(true), 1000 * (retryCount + 1));
        setRetryCount(retryCount + 1);
      } else {
        setError(err.message);
      }
    }
  };

  const fetchFriends = async (retry = false) => {
    if (!isInitialized || !userId) {
      setError('Пользователь не инициализирован');
      return;
    }
    try {
      const res = await fetch('/api/friends', {
        headers: { 'x-user-id': userId! },
      });
      if (!res.ok) throw new Error('Не удалось загрузить список друзей');
      const data = await res.json();
      console.log('API friends response:', data);
      if (data && Array.isArray(data.friends)) {
        setFriends(data.friends.map((friend: any) => ({
          _id: friend._id.toString(),
          username: friend.username || 'Unknown',
        })));
      } else {
        console.error('Неверный формат данных друзей:', data);
        setFriends([]);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки друзей:', err);
      if (retry && retryCount < maxRetries) {
        setTimeout(() => fetchFriends(true), 1000 * (retryCount + 1));
        setRetryCount(retryCount + 1);
      } else {
        setError(err.message);
      }
    }
  };

  const fetchCommunities = async (retry = false) => {
    if (!isInitialized || !userId) {
      setError('Пользователь не инициализирован');
      return;
    }
    try {
      const res = await fetch('/api/communities', {
        headers: { 'x-user-id': userId! },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Не удалось загрузить список сообществ');
      const data = await res.json();
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
      if (retry && retryCount < maxRetries) {
        setTimeout(() => fetchCommunities(true), 1000 * (retryCount + 1));
        setRetryCount(retryCount + 1);
      } else {
        setError(err.message);
      }
    }
  };

  const handleEdit = async () => {
    if (!community || !userId || !isAdmin || loading) {
      setError('Сообщество или пользователь не инициализированы, или данные загружаются');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', newName || '');
      formData.append('description', newDescription || '');
      formData.append('interests', newInterests.split(',').map((interest) => interest.trim()).join(',') || '');
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (newAvatar) {
        formData.append('avatar', newAvatar);
      }

      const res = await fetch(`/api/communities/${id}`, {
        method: 'PUT',
        headers: {
          'x-user-id': userId!,
        },
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось обновить сообщество');
      const updatedCommunity = await res.json();
      console.log('Обновленные данные сообщества:', updatedCommunity);
      setCommunity(updatedCommunity);
      setIsEditing(false);
      setShowModal(false);
    } catch (err: any) {
      console.error('Ошибка обновления сообщества:', err);
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!community || !userId || !isAdmin) return;
    if (!window.confirm('Вы уверены, что хотите удалить это сообщество?')) return;
    try {
      const res = await fetch(`/api/communities/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId! },
      });
      if (!res.ok) throw new Error('Не удалось удалить сообщество');
      router.push('/communities');
    } catch (err: any) {
      console.error('Ошибка удаления сообщества:', err);
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!community || !userId || !isAdmin || loading) {
      setError('Сообщество или пользователь не инициализированы, или данные загружаются');
      return;
    }
    if (memberId === userId) {
      setError('Нельзя удалить себя из сообщества');
      return;
    }
    console.log('Removing member with ID:', memberId);
    try {
      const res = await fetch(`/api/communities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId!,
        },
        body: JSON.stringify({ action: 'removeMember', memberId }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось удалить пользователя');
      const updatedCommunity = await res.json();
      setCommunity(updatedCommunity);
    } catch (err: any) {
      console.error('Ошибка удаления пользователя:', err);
      setError(err.message);
    }
  };

  const handleAddMember = async (friendId: string) => {
    if (!community || !userId || !isAdmin || loading) {
      setError('Сообщество или пользователь не инициализированы, или данные загружаются');
      return;
    }
    console.log('Adding member with ID:', friendId);
    try {
      const res = await fetch(`/api/communities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId!,
        },
        body: JSON.stringify({ action: 'addMember', memberId: friendId }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Не удалось добавить пользователя');
      const updatedCommunity = await res.json();
      setCommunity(updatedCommunity);
      setShowAddFriendModal(false);
    } catch (err: any) {
      console.error('Ошибка добавления пользователя:', err);
      setError(err.message);
    }
  };

  const handleCreateClick = () => {
    router.push('/communities/create');
  };

  useEffect(() => {
    if (!isInitialized || !userId) {
      setError('Ошибка инициализации');
      return;
    }
    setLoading(true);
    Promise.all([fetchCommunity(), fetchPosts(), fetchFriends(), fetchCommunities()])
      .then(() => {
        setLoading(false);
        setRetryCount(0); // Сбросить счётчик повторов при успехе
      })
      .catch((err) => {
        console.error('Ошибка при загрузке данных:', err);
        setError('Ошибка загрузки данных');
        setLoading(false);
      });
  }, [id, isInitialized, userId]);

  const isAdmin = community && userId
    ? community.admins.some((admin) => 
        (typeof admin === 'string' ? admin : admin._id) === userId
      )
    : false;

  const filteredCommunities = communities.filter((comm) =>
    comm.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Загрузка...</div>;
  if (!community) return <div>Сообщество не найдено</div>;

  return (
    <Container fluid>
      <Row>
        <Col md={3} className="border-end" style={{ backgroundColor: '#f8f9fa', height: 'calc(100vh - 56px)' }}>
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
                filteredCommunities.map((comm) => (
                  <ListGroup.Item
                    key={comm._id}
                    action
                    active={comm._id === id}
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
        <Col md={6} className="p-3">
          <h3>{community.name}</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          {posts.length > 0 ? (
            posts.map((post) => (
              <Post
                key={post.postId}
                username={post.username}
                content={post.content}
                createdAt={post.createdAt}
                userId={post.userId}
                likes={post.likes || []}
                reactions={post.reactions || []}
                images={post.images || []}
                postId={post.postId}
                fetchPosts={fetchPosts}
                userAvatar={post.userAvatar || '/default-avatar.png'}
                comments={post.comments || []}
              />
            ))
          ) : (
            <p>Пока нет постов.</p>
          )}
        </Col>
        <Col md={3} className="p-3">
          <div
            style={{
              position: 'sticky',
              top: '20px',
              background: '#fff',
              padding: '10px',
              borderRadius: '5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div className="mb-3">
              <h5>{community.name}</h5>
            </div>
            {community.avatar && (
              <Image src={community.avatar} roundedCircle className="mb-2" style={{ width: '100px', height: '100px' }} />
            )}
            <p><strong>Описание:</strong> {community.description || 'Нет описания'}</p>
            <p><strong>Интересы:</strong> {community.interests.length > 0 ? community.interests.join(', ') : 'Нет интересов'}</p>
            <p><strong>Создатель:</strong> {community.creator ? community.creator.username : 'Неизвестно'}</p>
            <p>
              <strong>Подписчики:</strong>{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setShowMembersModal(true); }}>
                {community.members.length}
              </a>
            </p>
            {isAdmin && (
              <div className="mt-3">
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="edit-tooltip">Редактировать сообщество</Tooltip>}
                >
                  <Button variant="link" onClick={() => setShowModal(true)}>
                    <Pencil size={18} />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="delete-tooltip">Удалить сообщество</Tooltip>}
                >
                  <Button variant="link" onClick={handleDelete} className="ms-2">
                    <Trash size={18} color="red" />
                  </Button>
                </OverlayTrigger>
                <Button variant="primary" onClick={() => setShowAddFriendModal(true)} className="ms-2">
                  <Plus size={18} /> Добавить друга
                </Button>
              </div>
            )}
          </div>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать сообщество</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <FormGroup className="mb-3">
              <FormLabel>Новое название</FormLabel>
              <FormControl
                type="text"
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                placeholder="Введите новое название"
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <FormLabel>Описание</FormLabel>
              <FormControl
                as="textarea"
                rows={3}
                value={newDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDescription(e.target.value)}
                placeholder="Введите новое описание"
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <FormLabel>Интересы (через запятую)</FormLabel>
              <FormControl
                type="text"
                value={newInterests}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInterests(e.target.value)}
                placeholder="Введите интересы (например, Кулинария, Гейминг)"
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <FormLabel>Аватар</FormLabel>
              <FormControl
                type="text"
                value={newAvatar}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAvatar(e.target.value)}
                placeholder="Введите URL или путь к аватару"
              />
              <FormControl
                type="file"
                className="mt-2"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) setAvatarFile(file);
                }}
                accept="image/*"
              />
            </FormGroup>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleEdit}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showMembersModal} onHide={() => setShowMembersModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подписчики</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {community.members.length > 0 ? (
            <ul>
              {community.members.map((member) => (
                <li key={member._id} className="d-flex justify-content-between align-items-center">
                  {member.username}
                  {isAdmin && member._id !== userId && (
                    <Button
                      variant="link"
                      className="text-danger p-0 ms-2"
                      onClick={() => handleRemoveMember(member._id)}
                    >
                      <Trash size={16} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Нет подписчиков.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMembersModal(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showAddFriendModal} onHide={() => setShowAddFriendModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Добавить друга</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {friends.length > 0 ? (
            <ul>
              {friends.map((friend) => (
                <li key={friend._id} className="d-flex justify-content-between align-items-center">
                  {friend.username}
                  {!community.members.some((m) => m._id === friend._id) && (
                    <Button
                      variant="primary"
                      className="ms-2"
                      onClick={() => handleAddMember(friend._id)}
                    >
                      Добавить
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>У вас нет друзей или список не загружен.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddFriendModal(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}