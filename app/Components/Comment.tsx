'use client';

interface CommentProps {
  _id: string;
  userId: { _id: string; username: string };
  content: string;
  createdAt: string;
  likes?: string[];
  reactions?: { emoji: string; users: string[] }[];
  images?: string[]; // Добавлено поле для поддержки изображений
}

export default function Comment({ _id, userId, content, createdAt, likes = [], reactions = [], images = [] }: CommentProps) {
  return (
    <div>
      <p>
        <strong>{userId.username || userId._id}</strong>: {content} ({new Date(createdAt).toLocaleString()})
        {likes.length > 0 && <span className="ms-2">👍 {likes.length}</span>}
        {reactions.length > 0 && (
          <span className="ms-2">
            {reactions.map((r) => `${r.emoji} ${r.users.length}`).join(', ')}
          </span>
        )}
      </p>
      {images.length > 0 && (
        <div className="mt-2">
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Comment image ${index + 1}`}
              style={{ maxHeight: '100px', marginRight: '10px' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}