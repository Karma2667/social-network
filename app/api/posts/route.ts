// app/api/posts/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET(request: Request) {
  console.log('GET /api/posts called');
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const communityId = searchParams.get('communityId');
    const query: any = {};
    if (userId) query.user = userId;
    if (communityId) query.community = communityId;
    else query.community = null; // Посты без сообщества
    console.log('Query:', query);

    const posts = await Post.find(query).populate('user', 'username').sort({ createdAt: -1 });
    console.log('Posts found:', posts);
    return NextResponse.json(posts);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { userId, content, communityId } = await request.json();
    console.log('POST /api/posts received:', { userId, content, communityId });
    if (!userId || !content) {
      return NextResponse.json({ error: 'Missing fields', details: { userId, content } }, { status: 400 });
    }
    const post = await Post.create({ user: userId, content, community: communityId || null });
    await post.populate('user', 'username');
    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Failed to create post', details: errorMessage }, { status: 500 });
  }
}