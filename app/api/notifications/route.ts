import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Некорректный userId' }, { status: 400 });
    }
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(notifications);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET notifications ошибка:', errorMessage);
    return NextResponse.json({ error: 'Не удалось загрузить уведомления', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { userId, type, content, relatedId, relatedModel, senderId } = await request.json();
    if (!userId || !type || !content || !relatedId || !relatedModel) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(relatedId) ||
      (senderId && !mongoose.Types.ObjectId.isValid(senderId))
    ) {
      return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
    }
    const notification = await Notification.create({
      userId,
      type,
      content,
      relatedId,
      relatedModel,
      senderId,
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST notification ошибка:', errorMessage);
    return NextResponse.json({ error: 'Не удалось создать уведомление', details: errorMessage }, { status: 500 });
  }
}