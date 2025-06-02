'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Post from './Components/Post';

interface PostData {
  _id: string;
  username: string;
  userId: string;
  content: string;
  createdAt: string | number;
  images: string[];
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  userAvatar?: string;
}

export default function Home() {
  const [posts, setPosts] = useState<PostData[]>([]);

  const fetchPosts = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const userId = localStorage.getItem('userId') || '';
      const res = await fetch('/api/posts', {
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!res.ok) throw new Error('Не удалось загрузить посты');
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      console.error('Ошибка загрузки постов:', err);
    }
  }, []); // Пустой массив зависимостей, так как authToken и userId из localStorage

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <Container fluid>
      <Row>
        <Col md={9}>
          {posts.map((post) => (
            <Post
              key={post._id}
              postId={post._id}
              username={post.username}
              userId={post.userId}
              content={post.content}
              createdAt={post.createdAt}
              images={post.images}
              likes={post.likes}
              reactions={post.reactions}
              fetchPosts={fetchPosts}
              userAvatar={post.userAvatar}
            />
          ))}
        </Col>
      </Row>
    </Container>
  );
}