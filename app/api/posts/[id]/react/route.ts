import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Post from '@/models/Post';
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

  const post = await Post.findById(params.id).populate('userId', 'username');
  if (!post) {
    return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
  }

  const reactionIndex = post.reactions.findIndex((r: any) => r.emoji === emoji);
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

  if (action === 'reacted' && post.userId._id.toString() !== userId) {
    await Notification.create({
      userId: post.userId._id,
      type: 'post_reaction',
      content: `Ваш пост получил реакцию ${emoji} от пользователя`,
      relatedId: post._id,
      relatedModel: 'Post',
      senderId: userId,
    });
  }

  return NextResponse.json(post);
}