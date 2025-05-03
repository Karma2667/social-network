import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request) {
  await dbConnect();
  try {
    console.log('Users Profile API: GET запрос на получение профиля');
    const userId = request.headers.get('x-user-id');
    console.log('Users Profile API: Получен userId:', userId);

    if (!userId) {
      console.error('Users Profile API: Отсутствует x-user-id в заголовке');
      return NextResponse.json({ error: 'Пользователь не аутентифицирован' }, { status: 401 });
    }

    const user = await User.findById(userId).select('username bio avatar').lean();
    if (!user) {
      console.error('Users Profile API: Пользователь не найден для userId:', userId);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    console.log('Users Profile API: Профиль загружен:', user);
    return NextResponse.json(user, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Users Profile API: Ошибка загрузки профиля:', errorMessage);
    return NextResponse.json({ error: 'Не удалось загрузить профиль', details: errorMessage }, { status: 500 });
  }
}