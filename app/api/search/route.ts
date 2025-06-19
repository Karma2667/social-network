import { NextResponse } from 'next/server';
import connectToDB from '@/lib/mongodb';
import User from '@/models/User';
import Community from '@/models/Community';

interface LeanUser {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
  bio?: string;
  interests: string[];
  type: 'user';
}

interface LeanCommunity {
  _id: string;
  name: string;
  avatar?: string;
  description?: string;
  interests: string[];
  creator?: { _id: string; username: string } | null;
  createdAt: Date;
  updatedAt?: Date;
  type: 'community';
}

type SearchResult = LeanUser | LeanCommunity;

export async function GET(request: Request) {
  console.time('GET /api/search: Total');
  console.log('GET /api/search: Обработчик вызван', { url: request.url, method: request.method });
  try {
    await connectToDB();
    console.log('GET /api/search: MongoDB подключен успешно');

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim() || '';
    const currentUserId = request.headers.get('x-user-id') || null;
    console.log('GET /api/search: Параметры запроса', { query, currentUserId });

    if (!query) {
      console.log('GET /api/search: Пустой запрос, возвращаем пустой результат');
      console.timeEnd('GET /api/search: Total');
      return NextResponse.json([], { status: 200 });
    }

    const isHashtag = query.startsWith('#');
    const isUsernameSearch = query.startsWith('@');
    const searchQuery = isHashtag || isUsernameSearch ? query.slice(1).trim() : query.trim();
    console.log('GET /api/search: Обработанный запрос', { searchQuery });

    if (!searchQuery) {
      console.log('GET /api/search: Пустой запрос после обработки, возвращаем пустой результат');
      console.timeEnd('GET /api/search: Total');
      return NextResponse.json([], { status: 200 });
    }

    const searchCriteria = isHashtag
      ? { interests: { $regex: searchQuery, $options: 'i' } }
      : {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { username: { $regex: searchQuery, $options: 'i' } },
            { interests: { $regex: searchQuery, $options: 'i' } },
          ],
        };

    const finalCriteria = currentUserId
      ? { ...searchCriteria, _id: { $ne: currentUserId } }
      : searchCriteria;

    console.log('GET /api/search: Критерии поиска', { finalCriteria });

    // Поиск пользователей
    const users = await User.find(finalCriteria)
      .select('username name avatar bio interests _id')
      .limit(10)
      .lean<LeanUser[]>()
      .then((results) => results.map(user => ({ ...user, type: 'user' as const })));

    // Поиск сообществ
    const communities = await Community.find(finalCriteria)
      .select('name avatar description interests _id createdAt updatedAt')
      .populate('creator', 'username _id')
      .limit(10)
      .lean<LeanCommunity[]>()
      .then((results) =>
        results.map(community => ({
          ...community,
          type: 'community' as const,
          creator: community.creator ? { _id: community.creator._id.toString(), username: community.creator.username } : null,
        }))
      );

    const results = [...users, ...communities];
    console.log('GET /api/search: Результаты поиска', { count: results.length, results });

    console.timeEnd('GET /api/search: Total');
    return NextResponse.json(results, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/search: Ошибка', { error: errorMessage, stack: (error as any)?.stack });
    console.timeEnd('GET /api/search: Total');
    return NextResponse.json(
      { error: 'Ошибка поиска пользователей или сообществ', details: errorMessage },
      { status: 500 }
    );
  }
}