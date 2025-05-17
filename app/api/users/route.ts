import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

interface IUser {
  _id: string;
  name: string;
  username: string;
  email: string;
}

export async function GET(request: Request) {
  console.time('GET /api/users: Total');
  console.log('GET /api/users: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/users: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    console.log('GET /api/users: userId:', userId, 'search:', search);

    if (!userId) {
      console.log('GET /api/users: Отсутствует userId');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const query: any = { _id: { $ne: userId } };
    if (search) {
      const searchTerm = search.startsWith('@') ? search.slice(1) : search;
      query.username = { $regex: searchTerm, $options: 'i' };
    }

    const users = await User.find(query, 'name username email').lean<IUser[]>();
    console.log('GET /api/users: Найдено пользователей:', users.length);

    console.timeEnd('GET /api/users: Total');
    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/users: Ошибка:', errorMessage, error);
    console.timeEnd('GET /api/users: Total');
    return NextResponse.json({ error: 'Не удалось загрузить пользователей', details: errorMessage }, { status: 500 });
  }
}