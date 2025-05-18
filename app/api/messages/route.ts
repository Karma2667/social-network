import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '../../../models/Message';
import { Types } from 'mongoose';

export async function GET(request: Request) {
  console.time('GET /api/messages: Total');
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = request.headers.get('x-user-id');
    const recipientId = searchParams.get('recipientId');

    if (!userId || !recipientId) {
      return NextResponse.json({ error: 'Требуется userId и recipientId' }, { status: 400 });
    }

    console.log('GET /api/messages: Параметры:', { userId, recipientId });

    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId },
        { senderId: recipientId, recipientId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log('GET /api/messages: Найдены сообщения:', messages.length);

    // Обновляем isRead и readBy для входящих сообщений
    await Message.updateMany(
      { senderId: recipientId, recipientId: userId, isRead: false },
      { $set: { isRead: true }, $addToSet: { readBy: userId } }
    );

    console.timeEnd('GET /api/messages: Total');
    return NextResponse.json(messages, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/messages: Ошибка:', errorMessage);
    console.timeEnd('GET /api/messages: Total');
    return NextResponse.json({ error: 'Ошибка загрузки сообщений', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/messages: Total');
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { recipientId, content } = await request.json();

    if (!userId || !recipientId || !content) {
      return NextResponse.json({ error: 'Требуется userId, recipientId и content' }, { status: 400 });
    }

    console.log('POST /api/messages: Параметры:', { userId, recipientId, content });

    const message = await Message.create({
      senderId: userId,
      recipientId,
      content,
      isRead: false,
      readBy: [],
    });

    console.log('POST /api/messages: Сообщение создано:', message);
    console.timeEnd('POST /api/messages: Total');
    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/messages: Ошибка:', errorMessage);
    console.timeEnd('POST /api/messages: Total');
    return NextResponse.json({ error: 'Ошибка отправки сообщения', details: errorMessage }, { status: 500 });
  }
}