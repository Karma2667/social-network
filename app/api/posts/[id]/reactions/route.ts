import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Post from '@/models/Post';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { userId, emoji } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(params.id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
    }

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Требуется emoji' }, { status: 400 });
    }

    const allowedEmojis = ['🤡', '👍', '👎', '❤️', '😂', '😢', '😮', '😡', '🤯', '🤩', '👏', '🙌', '🔥', '🎉'];
    if (!allowedEmojis.includes(emoji)) {
      return NextResponse.json({ error: 'Недопустимый emoji' }, { status: 400 });
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

    const userCurrentReaction = post.reactions.find((r: { users: string[] }) => r.users.includes(userId));
    if (userCurrentReaction && userCurrentReaction.emoji === emoji) {
      post.reactions = post.reactions.filter((r: { users: string[] }) => !r.users.includes(userId));
    } else {
      if (userCurrentReaction) post.reactions = post.reactions.filter((r: { users: string[] }) => !r.users.includes(userId));
      const reactionIndex = post.reactions.findIndex((r: { emoji: string }) => r.emoji === emoji);
      if (reactionIndex === -1) {
        post.reactions.push({ emoji, users: [userId] });
      } else {
        post.reactions[reactionIndex].users.push(userId);
      }
    }

    await post.save();

    if (post.userId._id.toString() !== userId) {
      await Notification.create({
        userId: post.userId._id,
        type: 'post_reaction',
        content: `Ваш пост получил реакцию ${emoji} от пользователя ${headerUserId}`,
        relatedId: post._id,
        relatedModel: 'Post',
        senderId: userId,
      });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Ошибка в POST /api/posts/[id]/reactions:', error);
    return NextResponse.json({ error: error.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}