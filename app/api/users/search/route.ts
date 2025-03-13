import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Поиск пользователей по username с использованием regex (частичного совпадения)
    const users = await User.find(
      { username: { $regex: query, $options: 'i' } }, // i - нечувствительность к регистру
      { username: 1, _id: 1 } // Возвращаем только username и _id
    ).limit(10); // Ограничиваем до 10 результатов

    return NextResponse.json(users);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Search users error:', errorMessage);
    return NextResponse.json({ error: 'Failed to search users', details: errorMessage }, { status: 500 });
  }
}