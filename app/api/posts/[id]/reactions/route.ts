import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Post from '@/models/Post';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const { userId, emoji } = await request.json();

    // Проверка валидности ID
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
    }

    // Проверка emoji
    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Требуется emoji' }, { status: 400 });
    }

    const allowedEmojis = ['👍', '❤️', '😂', '😢', '😮'];
    if (!allowedEmojis.includes(emoji)) {
      return NextResponse.json({ error: 'Недопустимый emoji' }, { status: 400 });
    }

    // Проверка заголовков авторизации
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const headerUserId = request.headers.get('x-user-id');
    if (!authToken || !headerUserId || headerUserId !== userId) {
      return NextResponse.json({ error: 'Неавторизованный доступ' }, { status: 401 });
    }

    // Поиск поста
    const post = await Post.findById(id).populate('userId', 'username');
    if (!post) {
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    // Инициализация reactions, если отсутствует
    if (!post.reactions) {
      post.reactions = [];
    }

    // Обработка реакции
    const reactionIndex = post.reactions.findIndex((r: { emoji: string }) => r.emoji === emoji);
    let action = '';

    if (reactionIndex === -1) {
      post.reactions.push({ emoji, users: [userId] });
      action = 'reacted';
    } else {
      const users = post.reactions[reactionIndex].users;
      const userIndex = users.indexOf(userId);
      if (userIndex === -1) {
        users.push(userId);
        action = 'reacted';
      } else {
        users.splice(userIndex, 1);
        if (users.length === 0) {
          post.reactions.splice(reactionIndex, 1);
        }
        action = 'unreacted';
      }
    }

    await post.save();

    // Создание уведомления
    if (action === 'reacted' && post.userId !== userId) {
      await Notification.create({
        userId: post.userId,
        type: 'message', // Используем допустимый тип из enum
        content: `Ваш пост получил реакцию ${emoji} от пользователя ${post.userId}`,
        relatedId: post._id,
        relatedModel: 'Post',
        senderId: userId,
      });
    }

    return NextResponse.json(post, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка в POST /api/posts/[id]/reactions:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}