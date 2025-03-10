'use client';

import { Card, Button } from 'react-bootstrap';
import Link from 'next/link';
import { useState } from 'react';

export default function Post({ username, content, createdAt, userId, likes = [], postId }: { 
  username: string; 
  content: string; 
  createdAt: string; 
  userId: string; 
  likes?: string[]; 
  postId: string;
}) {
  const currentUserId = '67bb0134b8e5bcf5a2c30fb4'; // Пока захардкодим
  const [localLikes, setLocalLikes] = useState(likes);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to toggle like: ${errorData.error}`);
      }
      const updatedPost = await res.json();
      setLocalLikes(updatedPost.likes.map((id: any) => id.toString()));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Like error:', errorMessage); // Оставим только ошибку
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <Card.Subtitle className="mb-2 text-muted">
          <Link href={`/profile/${userId}`}>{username}</Link> · {new Date(createdAt).toLocaleString()}
        </Card.Subtitle>
        <Card.Text>{content}</Card.Text>
        <div>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={handleLike} 
            disabled={isLiking}
          >
            {localLikes.includes(currentUserId) ? 'Unlike' : 'Like'} ({localLikes.length})
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}