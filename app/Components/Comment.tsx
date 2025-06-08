'use client';

interface CommentProps {
  _id: string;
  userId: { _id: string; username: string }; // Синхронизировано с Post.tsx
  content: string;
  createdAt: string;
}

export default function Comment({ _id, userId, content, createdAt }: CommentProps) {
  return (
    <div>
      <p>
        <strong>{userId.username || userId._id}</strong>: {content} ({new Date(createdAt).toLocaleString()})
      </p>
    </div>
  );
}