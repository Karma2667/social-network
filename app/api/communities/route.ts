// app/api/communities/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const communities = await Community.find().populate('creator', 'username');
    return NextResponse.json(communities);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET communities error:', error);
    return NextResponse.json({ error: 'Failed to fetch communities', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  const { name, description } = await request.json();

  try {
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const community = await Community.create({
      name,
      description: description || '',
      creator: userId,
      members: [userId],
      invites: [],
    });
    return NextResponse.json(community, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST community error:', error);
    return NextResponse.json({ error: 'Failed to create community', details: errorMessage }, { status: 500 });
  }
}