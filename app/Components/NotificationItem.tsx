'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ListGroup } from 'react-bootstrap';

interface NotificationItemProps {
  notif: {
    _id: string;
    type: string;
    content: string;
    senderId?: string;
    read: boolean;
    createdAt: string;
  };
}

export default function NotificationItem({ notif }: NotificationItemProps) {
  const [isRead, setIsRead] = useState(notif.read);

  const handleMarkAsRead = async () => {
    if (isRead) return;
    try {
      const res = await fetch(`/api/notifications/${notif._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      if (res.ok) setIsRead(true);
    } catch (err) {
      console.error('NotificationItem: Ошибка пометки как прочитано:', err);
    }
  };

  return (
    <ListGroup.Item
      onClick={handleMarkAsRead}
      style={{
        maxWidth: '300px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '8px 16px',
        cursor: 'pointer',
        backgroundColor: isRead ? '#fff' : '#e6f3ff',
      }}
      title={notif.content}
    >
      <Link
        href={notif.type === 'message' && notif.senderId ? `/chat/${notif.senderId}` : '#'}
        style={{ textDecoration: 'none', color: isRead ? '#555' : '#000' }}
      >
        {notif.content.length > 25 ? `${notif.content.substring(0, 22)}...` : notif.content} ·{' '}
        {new Date(notif.createdAt).toLocaleTimeString()}
      </Link>
    </ListGroup.Item>
  );
}