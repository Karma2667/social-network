import { NextResponse } from 'next/server';
import connectToDB from '@/lib/mongodb';
import User from '@/models/User';

interface LeanUser {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
  bio?: string;
  interests: string[];
}

export async function GET(request: Request) {
  console.time('GET /api/users/search: Total');
  console.log('GET /api/users/search: Запрос получен');
  try {
    await connectToDB();
    console.log('GET /api/users/search: MongoDB подключен');

    const { searchParams } = new URL(request.url);
    let query = searchParams.get('query')?.trim() || '';
    const currentUserId = request.headers.get('x-user-id') || '';
    console.log('GET /api/users/search: Исходный запрос:', query, 'Current User ID:', currentUserId);

    if (!query) {
      console.log('GET /api/users/search: Пустой запрос, возвращаем пустой результат');
      console.timeEnd('GET /api/users/search: Total');
      return NextResponse.json([], { status: 200 });
    }

    const isHashtag = query.startsWith('#');
    const isUsernameSearch = query.startsWith('@');
    const searchQuery = isHashtag || isUsernameSearch ? query.slice(1).trim() : query.trim();
    console.log('GET /api/users/search: Обработанный запрос:', searchQuery);

    if (!searchQuery) {
      console.log('GET /api/users/search: Пустой запрос после обработки, возвращаем пустой результат');
      console.timeEnd('GET /api/users/search: Total');
      return NextResponse.json([], { status: 200 });
    }

    const searchCriteria = isHashtag
      ? { interests: { $regex: searchQuery, $options: 'i' } }
      : {
          $or: [
            { username: { $regex: searchQuery, $options: 'i' } },
            { name: { $regex: searchQuery, $options: 'i' } },
            { interests: { $regex: searchQuery, $options: 'i' } },
          ],
        };

    const finalCriteria = {
      ...searchCriteria,
      _id: { $ne: currentUserId },
    };

    console.log('GET /api/users/search: Критерии поиска:', finalCriteria);
    const users = await User.find(finalCriteria)
      .select('username name avatar bio interests _id') // Добавлен bio
      .limit(20)
      .lean<LeanUser[]>();
    console.log('GET /api/users/search: Пользователи найдены:', users);

    console.timeEnd('GET /api/users/search: Total');
    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/users/search: Ошибка:', errorMessage, error);
    console.timeEnd('GET /api/users/search: Total');
    return NextResponse.json({ error: 'Ошибка поиска пользователей', details: errorMessage }, { status: 500 });
  }
}