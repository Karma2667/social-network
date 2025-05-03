import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';

export async function GET(request: Request) {
  await dbConnect();
  try {
    console.log('Messages API: GET запрос на получение сообщений');
    const userId = request.headers.get('x-user-id');
    const recipientId = request.headers.get('x-recipient-id');
    console.log('Messages API: Параметры:', { userId, recipientId });

    if (!userId || !recipientId) {
      console.error('Messages API: Отсутствует userId или recipientId');
      return NextResponse.json({ error: 'Не указан пользователь или получатель' }, { status: 400 });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId },
        { senderId: recipientId, recipientId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log('Messages API: Сообщения найдены, количество:', messages.length);
    return NextResponse.json(messages, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Messages API: Ошибка получения сообщений:', errorMessage);
    return NextResponse.json({ error: 'Не удалось загрузить сообщения', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    console.log('Messages API: POST запрос на отправку сообщения');
    const userId = request.headers.get('x-user-id');
    const { recipientId, content } = await request.json();
    console.log('Messages API: Параметры:', { userId, recipientId, content });

    if (!userId || !recipientId || !content) {
      console.error('Messages API: Отсутствуют обязательные поля');
      return NextResponse.json({ error: 'Не указан пользователь, получатель или сообщение' }, { status: 400 });
    }

    const message = await Message.create({
      senderId: userId,
      recipientId,
      content,
      createdAt: new Date(),
    });

    console.log('Messages API: Сообщение создано, ID:', message._id);
    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Messages API: Ошибка отправки сообщения:', errorMessage);
    return NextResponse.json({ error: 'Не удалось отправить сообщение', details: errorMessage }, { status: 500 });
  }
}