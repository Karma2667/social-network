import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';

interface IMessage {
  _id: string;
  senderId: string;
  recipientId?: string;
  chatId?: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
  readBy: string[];
}

export async function GET(request: Request) {
  console.time('GET /api/messages: Total');
  console.log('GET /api/messages: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('GET /api/messages: MongoDB подключен');

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const recipientId = searchParams.get('recipientId');
    const userId = request.headers.get('x-user-id')?.trim();

    console.log('GET /api/messages: Параметры:', { chatId, recipientId, userId });

    if (!userId) {
      console.log('GET /api/messages: Отсутствует userId');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    let query: any = {};
    if (chatId) {
      query.chatId = chatId;
    } else if (recipientId) {
      query.$or = [
        { senderId: userId, recipientId },
        { senderId: recipientId, recipientId: userId },
      ];
    } else {
      console.log('GET /api/messages: Отсутствуют chatId или recipientId');
      return NextResponse.json({ error: 'Требуются chatId или recipientId' }, { status: 400 });
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .lean()
      .exec() as unknown as IMessage[];
    console.log('GET /api/messages: Найдено сообщений:', messages.length);
    console.log('GET /api/messages: Данные:', messages);

    console.timeEnd('GET /api/messages: Total');
    return NextResponse.json(messages, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/messages ошибка:', errorMessage);
    console.timeEnd('GET /api/messages: Total');
    return NextResponse.json({ error: 'Не удалось загрузить сообщения', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/messages: Total');
  console.log('POST /api/messages: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('POST /api/messages: MongoDB подключен');

    const { chatId, recipientId, content } = await request.json();
    const userId = request.headers.get('x-user-id')?.trim();
    console.log('POST /api/messages получено:', { chatId, recipientId, content, userId });

    if (!userId || !content || (!chatId && !recipientId)) {
      console.log('POST /api/messages: Отсутствуют поля');
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    const message = new Message({
      chatId,
      recipientId,
      senderId: userId,
      content,
      createdAt: new Date(),
      isRead: false,
      readBy: [],
    });

    await message.save();
    console.log('POST /api/messages: Сообщение создано:', message.toObject());
    console.timeEnd('POST /api/messages: Total');
    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/messages ошибка:', errorMessage);
    console.timeEnd('POST /api/messages: Total');
    return NextResponse.json({ error: 'Не удалось отправить сообщение', details: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  console.time('PATCH /api/messages: Total');
  console.log('PATCH /api/messages: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('PATCH /api/messages: MongoDB подключен');

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const userId = request.headers.get('x-user-id')?.trim();
    console.log('PATCH /api/messages: Параметры:', { messageId, userId });

    if (!messageId || !userId) {
      console.log('PATCH /api/messages: Отсутствуют параметры');
      return NextResponse.json({ error: 'Требуются messageId и userId' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      console.log('PATCH /api/messages: Сообщение не найдено');
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    message.isRead = true;
    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
    }

    await message.save();
    console.log('PATCH /api/messages: Сообщение обновлено:', message.toObject());
    console.timeEnd('PATCH /api/messages: Total');
    return NextResponse.json(message, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PATCH /api/messages ошибка:', errorMessage);
    console.timeEnd('PATCH /api/messages: Total');
    return NextResponse.json({ error: 'Не удалось обновить сообщение', details: errorMessage }, { status: 500 });
  }
}