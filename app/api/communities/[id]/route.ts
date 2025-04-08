// app/api/communities/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;

  try {
    const community = await Community.findById(id)
      .populate('creator', 'username')
      .populate('members', 'username');
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }
    return NextResponse.json(community);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET community error:', error);
    return NextResponse.json({ error: 'Failed to fetch community', details: errorMessage }, { status: 500 });
  }
}