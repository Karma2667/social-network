import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  console.time('GET /api/notifications: Total');
  console.log('GET /api/notifications: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('GET /api/notifications: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    console.log('GET /api/notifications: Параметры:', { userId });

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('GET /api/notifications: Некорректный userId');
      return NextResponse.json({ error: 'Некорректный userId' }, { status: 400 });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    console.log('GET /api/notifications: Найдено уведомлений:', notifications.length);
    console.log('GET /api/notifications: Данные:', notifications);

    console.timeEnd('GET /api/notifications: Total');
    return NextResponse.json(notifications, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/notifications ошибка:', errorMessage);
    console.timeEnd('GET /api/notifications: Total');
    return NextResponse.json({ error: 'Не удалось загрузить уведомления', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/notifications: Total');
  console.log('POST /api/notifications: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('POST /api/notifications: MongoDB подключен');

    const { userId, type, content, relatedId, relatedModel, senderId } = await request.json();
    console.log('POST /api/notifications получено:', { userId, type, content, relatedId, relatedModel, senderId });

    if (!userId || !type || !content || !relatedId || !relatedModel) {
      console.log('POST /api/notifications: Отсутствуют поля');
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(relatedId) ||
      (senderId && !mongoose.Types.ObjectId.isValid(senderId))
    ) {
      console.log('POST /api/notifications: Некорректные ID');
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
    console.log('POST /api/notifications: Уведомление создано:', notification.toObject());
    console.timeEnd('POST /api/notifications: Total');
    return NextResponse.json(notification, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/notifications ошибка:', errorMessage);
    console.timeEnd('POST /api/notifications: Total');
    return NextResponse.json({ error: 'Не удалось создать уведомление', details: errorMessage }, { status: 500 });
  }
}