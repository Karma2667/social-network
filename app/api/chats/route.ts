import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Message, { LeanMessage } from '@/models/Message';
import User, { LeanUser } from '@/models/User';

// Интерфейс для сырых данных от lean()
interface RawUser {
  _id: Types.ObjectId | string;
  username: string;
  name?: string;
}

// Интерфейс для объекта чата
interface Chat {
  user: {
    _id: string;
    username: string;
    name: string;
  };
  lastMessage: {
    _id: string;
    content: string;
    createdAt: Date;
  } | null;
}

export async function GET(request: Request) {
  console.time('GET /api/chats: Total');
  console.log('GET /api/chats: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/chats: MongoDB подключен');

    const { searchParams } = new URL(request.url);
    const userId = request.headers.get('x-user-id');
    const search = searchParams.get('search') || '';

    if (!userId) {
      console.log('GET /api/chats: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    console.log('GET /api/chats: Параметры:', { userId, search });

    // Находим все сообщения, где userId является отправителем или получателем
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { recipientId: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean() as LeanMessage[];

    console.log('GET /api/chats: Найдены сообщения:', messages.length, messages);

    // Собираем уникальные userId из сообщений (кроме текущего пользователя)
    const chatUserIds = Array.from(
      new Set(
        messages
          .map((msg) =>
            msg.senderId.toString() === userId ? msg.recipientId.toString() : msg.senderId.toString()
          )
          .filter((id) => id !== userId)
      )
    );

    console.log('GET /api/chats: Найдены chatUserIds:', chatUserIds);

    // Находим пользователей по chatUserIds с учетом поиска
    const rawUsers = await User.find({
      _id: { $in: chatUserIds.map((id) => new Types.ObjectId(id)) },
      username: { $regex: search, $options: 'i' },
    })
      .select('_id username name')
      .lean() as unknown as RawUser[];

    console.log('GET /api/chats: Сырые пользователи:', rawUsers);

    // Преобразуем rawUsers в LeanUser
    const users: LeanUser[] = rawUsers.map((user) => ({
      _id: user._id.toString(),
      username: user.username,
      name: user.name || '',
    }));

    console.log('GET /api/chats: Найдены пользователи:', users);

    // Формируем список чатов
    const chats: Chat[] = users.map((user) => {
      const lastMessage = messages.find(
        (msg) =>
          (msg.senderId.toString() === userId && msg.recipientId.toString() === user._id.toString()) ||
          (msg.senderId.toString() === user._id.toString() && msg.recipientId.toString() === userId)
      );
      return {
        user: {
          _id: user._id.toString(),
          username: user.username,
          name: user.name || '',
        },
        lastMessage: lastMessage
          ? {
              _id: lastMessage._id.toString(),
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    });

    console.log('GET /api/chats: Чаты сформированы:', chats);
    console.timeEnd('GET /api/chats: Total');
    return NextResponse.json(chats, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/chats: Ошибка:', errorMessage, error);
    console.timeEnd('GET /api/chats: Total');
    return NextResponse.json({ error: 'Ошибка загрузки чатов', details: errorMessage }, { status: 500 });
  }
}