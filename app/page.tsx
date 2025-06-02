'use client';

import { useState, useEffect } from 'react';
import Post from '@/app/Components/Post';
import { useAuth } from '@/app/lib/AuthContext';

interface PostData {
  _id: string;
  userId: string;
  username: string;
  content: string;
  images: string[];
  likes: string[];
  createdAt: string;
  userAvatar?: string;
}

export default function Home() {
  const { user, userId } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);

  const fetchPosts = async () => {
    if (!userId) return;
    try {
      const authToken = localStorage.getItem('authToken') || '';
      const res = await fetch('/api/posts', {
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Не удалось загрузить посты');
      }
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      console.error('Home: Ошибка загрузки постов:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [userId]);

  return (
    <div className="telegram-posts">
      {posts.length > 0 ? (
        posts.map((post) => (
          <Post
            key={post._id}
            postId={post._id}
            username={post.username || 'Unknown User'}
            userId={post.userId}
            content={post.content}
            createdAt={post.createdAt}
            images={post.images}
            likes={post.likes}
            fetchPosts={fetchPosts}
            userAvatar={post.userAvatar}
          />
        ))
      ) : (
        <p className="text-center text-muted">Нет постов для отображения.</p>
      )}
    </div>
  );
}