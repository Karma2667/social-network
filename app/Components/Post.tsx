'use client';

import { Card, Image } from 'react-bootstrap';
import Link from 'next/link';

interface PostProps {
  username: string;
  content: string;
  createdAt: string;
  userId?: string; // Добавляем userId
}

export default function Post({ username, content, createdAt, userId }: PostProps) {
  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex align-items-center mb-2">
          <Image
            src="https://via.placeholder.com/40"
            roundedCircle
            className="me-2"
          />
          <Card.Title className="mb-0">
            {userId ? (
              <Link href={`/profile/${userId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {username}
              </Link>
            ) : (
              username
            )}
          </Card.Title>
        </div>
        <Card.Text>{content}</Card.Text>
        <Card.Subtitle className="text-muted">
          {new Date(createdAt).toLocaleString()}
        </Card.Subtitle>
      </Card.Body>
    </Card>
  );
}