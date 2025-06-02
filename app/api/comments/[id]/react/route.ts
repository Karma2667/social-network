import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Comment from '@/models/Comment';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { userId, emoji } = await request.json();

  if (!mongoose.Types.ObjectId.isValid(params.id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
  }

  if (!emoji || typeof emoji !== 'string') {
    return NextResponse.json({ error: 'Требуется emoji' }, { status: 400 });
  }

  const allowedEmojis = ['👍', '❤️', '😂', '😢', '😮'];
  if (!allowedEmojis.includes(emoji)) {
    return NextResponse.json({ error: 'Недопустимый emoji' }, { status: 400 });
  }

  const comment = await Comment.findById(params.id).populate('userId', 'username');
  if (!comment) {
    return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
  }

  const reactionIndex = comment.reactions.findIndex((r: any) => r.emoji === emoji);
  let action = '';

  if (reactionIndex === -1) {
    comment.reactions.push({ emoji, users: [userId] });
    action = 'reacted';
  } else {
    const users = comment.reactions[reactionIndex].users;
    const userIndex = users.indexOf(userId);
    if (userIndex === -1) {
      users.push(userId);
      action = 'reacted';
    } else {
      users.splice(userIndex, 1);
      if (users.length === 0) {
        comment.reactions.splice(reactionIndex, 1);
      }
      action = 'unreacted';
    }
  }

  await comment.save();

  if (action === 'reacted' && comment.userId._id.toString() !== userId) {
    await Notification.create({
      userId: comment.userId._id,
      type: 'comment_reaction',
      content: `Ваш комментарий получил реакцию ${emoji} от пользователя`,
      relatedId: comment._id,
      relatedModel: 'Comment',
      senderId: userId,
    });
  }

  return NextResponse.json(comment);
}