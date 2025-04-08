// app/api/communities/[id]/invite/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';
import Notification from '@/models/Notification';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const userId = getUserId(request);
  const { inviteeId } = await request.json();
  const { id } = params;

  try {
    const community = await Community.findById(id);
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    if (community.creator.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (community.invites.some((invite: any) => invite.user.toString() === inviteeId)) {
      return NextResponse.json({ error: 'User already invited' }, { status: 400 });
    }

    community.invites.push({ user: inviteeId, status: 'pending' });
    await community.save();

    await Notification.create({
      user: inviteeId,
      type: 'invite',
      content: `You have been invited to join ${community.name}`,
      relatedId: community._id,
      relatedModel: 'Community',
      senderId: userId,
      read: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: 'Invite sent' }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Failed to send invite', details: errorMessage }, { status: 500 });
  }
}