import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { userId } = await request.json();
    const { id } = await context.params; // Асинхронно получаем id

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const post = await Post.findById(id); // Используем id вместо params.id
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const userIndex = post.likes.indexOf(userId);
    if (userIndex === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(userIndex, 1);
    }

    await post.save();
    return NextResponse.json(post);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST like error:', errorMessage);
    return NextResponse.json({ error: 'Failed to update likes', details: errorMessage }, { status: 500 });
  }
}