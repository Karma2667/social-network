'use client';

import Link from 'next/link';

interface NotificationItemProps {
  notif: {
    _id: string;
    type: string;
    content: string;
    senderId?: string;
    createdAt: string;
  };
}

export default function NotificationItem({ notif }: NotificationItemProps) {
  return (
    <div
      style={{
        maxWidth: '250px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '8px 16px',
        cursor: 'pointer',
      }}
      title={notif.content}
    >
      <Link
        href={notif.type === 'message' && notif.senderId ? `/chats?recipientId=${notif.senderId}` : '#'}
        style={{ textDecoration: 'none', color: '#000' }}
      >
        {notif.content.length > 25 ? `${notif.content.substring(0, 22)}...` : notif.content} ·{' '}
        {new Date(notif.createdAt).toLocaleTimeString()}
      </Link>
    </div>
  );
}