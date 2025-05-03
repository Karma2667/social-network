import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;
  const { userId } = await request.json();

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
  }

  const post = await Post.findById(id).populate('user', 'username');
  if (!post) {
    return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
  }

  const index = post.likes.indexOf(userId);
  let action = '';
  if (index === -1) {
    post.likes.push(userId);
    action = 'liked';
  } else {
    post.likes.splice(index, 1);
    action = 'unliked';
  }

  await post.save();

  if (action === 'liked' && post.user._id.toString() !== userId) {
    await Notification.create({
      userId: post.user._id,
      type: 'like',
      content: `Ваш пост получил лайк от пользователя`,
      relatedId: post._id,
      relatedModel: 'Post',
      senderId: userId,
    });
  }

  return NextResponse.json(post);
}