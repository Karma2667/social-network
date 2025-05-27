// app/communities/[id]/page.tsx
'use client';

import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';

export default function CommunityPage({ params }: { params: { id: string } }) {
  const { userId } = useAuth();
  const [inviteeId, setInviteeId] = useState('');

  const handleInvite = async () => {
    const res = await fetch(`/api/communities/${params.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteeId }),
    });
    if (res.ok) alert('Invite sent!');
  };

  return (
    <div>
      <h1>Community Page</h1>
      {userId && (
        <Form>
          <Form.Group>
            <Form.Label>Invite User (ID)</Form.Label>
            <Form.Control value={inviteeId} onChange={(e) => setInviteeId(e.target.value)} placeholder="Enter user ID" />
          </Form.Group>
          <Button onClick={handleInvite}>Invite</Button>
        </Form>
      )}
    </div>
  );
}