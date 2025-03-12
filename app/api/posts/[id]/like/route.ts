import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Notification from '@/models/Notification';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { userId } = await request.json();
    const { id } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const post = await Post.findById(id).populate('user', 'username');
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const userIndex = post.likes.indexOf(userId);
    let action = '';
    if (userIndex === -1) {
      post.likes.push(userId);
      action = 'liked';
    } else {
      post.likes.splice(userIndex, 1);
      action = 'unliked';
    }

    await post.save();

    // Отправляем уведомление автору поста, если это не он сам лайкнул
    if (action === 'liked' && post.user._id.toString() !== userId) {
      await Notification.create({
        user: post.user._id,
        type: 'like',
        content: `${post.user.username}, ваш пост лайкнули!`,
        relatedId: post._id,
        relatedModel: 'Post',
      });
    }

    return NextResponse.json(post);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST like error:', errorMessage);
    return NextResponse.json({ error: 'Failed to update likes', details: errorMessage }, { status: 500 });
  }
}