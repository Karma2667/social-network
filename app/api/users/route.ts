import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '../../../models/User';

export async function GET(request: Request) {
  console.time('GET /api/users: Total');
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    console.log('GET /api/users: Параметры:', { search });

    const users = await User.find({
      username: { $regex: search, $options: 'i' },
    })
      .select('_id username name')
      .lean();

    console.log('GET /api/users: Найдены пользователи:', users.length);
    console.timeEnd('GET /api/users: Total');
    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/users: Ошибка:', errorMessage);
    console.timeEnd('GET /api/users: Total');
    return NextResponse.json({ error: 'Ошибка загрузки пользователей', details: errorMessage }, { status: 500 });
  }
}