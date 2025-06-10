import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Comment from '@/models/Comment';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const comment = await Comment.findById(params.id).populate('userId', 'username');
    if (!comment) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
    }

    // Инициализация массивов, если они отсутствуют
    if (!comment.reactions) comment.reactions = [];
    if (!comment.likes) comment.likes = [];

    // Проверяем текущую реакцию пользователя
    const userCurrentReaction = comment.reactions.find((r) => r.users.includes(userId));
    let action = '';

    if (userCurrentReaction && userCurrentReaction.emoji === emoji) {
      // Удаляем реакцию пользователя
      comment.reactions = comment.reactions.filter((r) => !r.users.includes(userId));
      action = 'removed';
    } else {
      // Удаляем все предыдущие реакции пользователя
      comment.reactions = comment.reactions.filter((r) => !r.users.includes(userId));

      // Добавляем новую реакцию
      const reactionIndex = comment.reactions.findIndex((r) => r.emoji === emoji);
      if (reactionIndex === -1) {
        comment.reactions.push({ emoji, users: [userId] });
      } else {
        comment.reactions[reactionIndex].users.push(userId);
      }
      action = 'reacted';

      // Добавляем лайк, если его ещё нет
      if (!comment.likes.includes(userId)) {
        comment.likes.push(userId);
      }
    }

    await comment.save();

    if (action === 'reacted' && comment.userId._id.toString() !== userId) {
      await Notification.create({
        userId: comment.userId._id,
        type: 'comment_reaction',
        content: `Ваш комментарий получил реакцию ${emoji} от пользователя ${headerUserId}`,
        relatedId: comment._id,
        relatedModel: 'Comment',
        senderId: userId,
      });
    }

    // Возвращаем обновлённый комментарий
    const updatedComment = await Comment.findById(params.id).populate('userId', 'username');
    return NextResponse.json(updatedComment, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка в POST /api/comments/[id]/reactions:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера', stack: error.stack },
      { status: 500 }
    );
  }
}