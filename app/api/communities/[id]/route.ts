import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';

// Получение данных сообщества по ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const community = await Community.findById(params.id).populate('creator', 'username').populate('members', 'username');
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }
    return NextResponse.json(community);
  } catch (error) {
    console.error('GET community error:', error);
    return NextResponse.json({ error: 'Failed to fetch community' }, { status: 500 });
  }
}