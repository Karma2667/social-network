import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Post from '@/models/Post';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { userId } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(params.id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
    }

    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const headerUserId = request.headers.get('x-user-id');
    if (!authToken || !headerUserId || headerUserId !== userId) {
      return NextResponse.json({ error: 'Неавторизованный доступ' }, { status: 401 });
    }

    const post = await Post.findById(params.id).populate('userId', 'username');
    if (!post) {
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    if (!post.reactions) post.reactions = [];
    if (!post.likes) post.likes = [];

    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((id: string) => id !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    if (post.userId._id.toString() !== userId && !post.likes.includes(userId)) {
      await Notification.create({
        userId: post.userId._id,
        type: 'post_like',
        content: `Ваш пост получил лайк от пользователя ${headerUserId}`,
        relatedId: post._id,
        relatedModel: 'Post',
        senderId: userId,
      });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Ошибка в POST /api/posts/[id]/like:', error);
    return NextResponse.json({ error: error.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}