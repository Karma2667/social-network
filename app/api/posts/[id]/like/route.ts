import { NextResponse } from 'next/server';
import Post from '@/models/Post';
import mongoose, { Types } from 'mongoose';
import { connectToDB } from '@/app/lib/mongoDB';
import dbConnect from '@/lib/mongodb';

// Интерфейс для реакции
interface Reaction {
  emoji: string;
  users: string[];
}

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

    post.reactions = post.reactions || [];
    post.likes = post.likes || [];

    const wasLiked = post.likes.includes(userId);
    if (wasLiked) {
      post.likes = post.likes.filter((id: string) => id !== userId);
      // Удаляем реакцию "👍", если она была связана с этим лайком
      const thumbsUpReaction = post.reactions.find((r: Reaction) => r.emoji === '👍' && r.users.includes(userId));
      if (thumbsUpReaction) {
        thumbsUpReaction.users = thumbsUpReaction.users.filter((id: string) => id !== userId);
        if (thumbsUpReaction.users.length === 0) {
          post.reactions = post.reactions.filter((r: Reaction) => r.users.length > 0);
        }
      }
    } else {
      post.likes.push(userId);
      // Добавляем реакцию "👍", если её ещё нет
      if (!post.reactions.some((r: Reaction) => r.emoji === '👍' && r.users.includes(userId))) {
        const reactionIndex = post.reactions.findIndex((r: Reaction) => r.emoji === '👍');
        if (reactionIndex === -1) {
          post.reactions.push({ emoji: '👍', users: [userId] });
        } else {
          post.reactions[reactionIndex].users.push(userId);
        }
      }
    }

    await post.save();

    return NextResponse.json({
      _id: post._id.toString(),
      likes: post.likes,
      reactions: post.reactions,
    });
  } catch (error: any) {
    console.error('Ошибка в POST /api/posts/[id]/like:', error);
    return NextResponse.json({ error: error.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}