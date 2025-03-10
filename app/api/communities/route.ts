import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';

    export async function GET(request: Request) {
    console.log('GET /api/communities called');
    await dbConnect();
    try {
        const communities = await Community.find();
        console.log('Communities found:', communities);
        return NextResponse.json(communities);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('GET communities error:', error);
        return NextResponse.json({ error: 'Failed to fetch communities', details: errorMessage }, { status: 500 });
    }
    }

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { name, description, creator } = await request.json();
    if (!name || !creator) {
      return NextResponse.json({ error: 'Missing name or creator' }, { status: 400 });
    }
    const community = await Community.create({ name, description, creator, members: [creator] });
    console.log('Community created:', community);
    return NextResponse.json(community, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST community error:', error);
    return NextResponse.json({ error: 'Failed to create community', details: errorMessage }, { status: 500 });
  }
}