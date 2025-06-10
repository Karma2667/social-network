import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Comment from '@/models/Comment';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

// Определение интерфейса для реакции
interface Reaction {
  emoji: string;
  users: string[];
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const comment = await Comment.findById(params.id).populate('userId', 'username');
    if (!comment) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
    }

    // Инициализация массивов, если они отсутствуют
    if (!comment.likes) comment.likes = [];
    if (!comment.reactions) comment.reactions = [];

    let action = '';
    if (comment.likes.includes(userId)) {
      comment.likes = comment.likes.filter((id: string) => id !== userId);
      action = 'removed';
    } else {
      comment.likes.push(userId);
      action = 'liked';

      // Добавляем базовую реакцию (например, 👍) при лайке, если её нет
      const defaultEmoji = '👍';
      const reactionIndex = comment.reactions.findIndex((r: Reaction) => r.emoji === defaultEmoji);
      if (reactionIndex === -1) {
        comment.reactions.push({ emoji: defaultEmoji, users: [userId] });
      } else if (!comment.reactions[reactionIndex].users.includes(userId)) {
        comment.reactions[reactionIndex].users.push(userId);
      }
    }

    await comment.save();

    if (action === 'liked' && comment.userId._id.toString() !== userId) {
      await Notification.create({
        userId: comment.userId._id,
        type: 'comment_like',
        content: `Ваш комментарий получил лайк от пользователя ${headerUserId}`,
        relatedId: comment._id,
        relatedModel: 'Comment',
        senderId: userId,
      });
    }

    // Возвращаем обновлённый комментарий
    const updatedComment = await Comment.findById(params.id).populate('userId', 'username');
    return NextResponse.json(updatedComment, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка в POST /api/comments/[id]/likes:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера', stack: error.stack },
      { status: 500 }
    );
  }
}