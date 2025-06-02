import { NextResponse } from 'next/server';
import dbConnect from "@/app/lib/mongoDB";
import Comment from '@/models/Comment';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { userId } = await request.json();

  if (!mongoose.Types.ObjectId.isValid(params.id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
  }

  const comment = await Comment.findById(params.id).populate('userId', 'username');
  if (!comment) {
    return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
  }

  const index = comment.likes.indexOf(userId);
  let action = '';
  if (index === -1) {
    comment.likes.push(userId);
    action = 'liked';
  } else {
    comment.likes.splice(index, 1);
    action = 'unliked';
  }

  await comment.save();

  if (action === 'liked' && comment.userId._id.toString() !== userId) {
    await Notification.create({
      userId: comment.userId._id,
      type: 'comment_like',
      content: `Ваш комментарий получил лайк от пользователя`,
      relatedId: comment._id,
      relatedModel: 'Comment',
      senderId: userId,
    });
  }

  return NextResponse.json(comment);
}