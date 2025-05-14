import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Chat from '@/models/Chat';

interface IChat {
  _id: string;
  name: string;
  members: string[];
  avatar: string;
}

export async function GET(request: Request) {
  console.time('GET /api/chats: Total');
  console.log('GET /api/chats: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('GET /api/chats: MongoDB подключен');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const userId = request.headers.get('x-user-id')?.trim();
    console.log('GET /api/chats: Параметры:', { search, userId });

    if (!userId) {
      console.log('GET /api/chats: Отсутствует userId');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const query: any = { members: { $in: [userId] } };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    console.log('GET /api/chats: Сформирован запрос:', JSON.stringify(query));

    const chats = await Chat.find(query)
      .select('name _id avatar')
      .lean()
      .exec() as unknown as IChat[];
    console.log('GET /api/chats: Найдено чатов:', chats.length);
    console.log('GET /api/chats: Данные:', chats);

    console.timeEnd('GET /api/chats: Total');
    return NextResponse.json(chats, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/chats ошибка:', errorMessage);
    console.timeEnd('GET /api/chats: Total');
    return NextResponse.json({ error: 'Не удалось загрузить чаты', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/chats: Total');
  console.log('POST /api/chats: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('POST /api/chats: MongoDB подключен');

    const { name, members, userId } = await request.json();
    console.log('POST /api/chats получено:', { name, members, userId });

    if (!name || !userId || !members || !Array.isArray(members)) {
      console.log('POST /api/chats: Отсутствуют поля');
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    const chat = new Chat({
      name,
      members: [userId, ...members],
      avatar: '/default-chat-avatar.png',
    });

    await chat.save();
    console.log('POST /api/chats: Создан чат:', chat.toObject());
    console.timeEnd('POST /api/chats: Total');
    return NextResponse.json(chat, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/chats ошибка:', errorMessage);
    console.timeEnd('POST /api/chats: Total');
    return NextResponse.json({ error: 'Не удалось создать чат', details: errorMessage }, { status: 500 });
  }
}