import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

interface LeanUser {
  _id: string;
  email: string;
  username: string;
  name?: string;
  bio?: string;
  interests: string[];
  avatar?: string;
  __v?: number;
}

export async function GET(request: Request) {
  console.time('GET /api/profile: Total');
  console.log('GET /api/profile: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/profile: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    console.log('GET /api/profile: Параметры:', { userId, authToken });

    if (!userId || !authToken) {
      console.log('GET /api/profile: Отсутствует userId или authToken');
      return NextResponse.json({ error: 'Требуются userId и authToken' }, { status: 400 });
    }

    const user = await User.findById(userId).select('username name bio interests avatar').lean<LeanUser>();
    if (!user) {
      console.log('GET /api/profile: Пользователь не найден');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    user.interests = user.interests || [];
    console.log('GET /api/profile: Пользователь найден:', user);
    console.timeEnd('GET /api/profile: Total');
    return NextResponse.json(user, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/profile: Ошибка:', errorMessage, error);
    console.timeEnd('GET /api/profile: Total');
    return NextResponse.json({ error: 'Ошибка загрузки профиля', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  console.time('PUT /api/profile: Total');
  console.log('PUT /api/profile: Запрос получен');
  try {
    await dbConnect();
    console.log('PUT /api/profile: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const { name, username, bio, interests, avatar } = await request.json();
    console.log('PUT /api/profile: Данные:', { userId, authToken, name, username, bio, interests, avatar });

    if (!userId || !authToken || !username) {
      console.log('PUT /api/profile: Отсутствуют userId, authToken или username');
      return NextResponse.json({ error: 'Требуются userId, authToken и username' }, { status: 400 });
    }

    if (!interests || interests.length === 0) {
      console.log('PUT /api/profile: Отсутствуют интересы');
      return NextResponse.json({ error: 'Выберите хотя бы один интерес' }, { status: 400 });
    }

    if (interests && interests.length > 5) {
      console.log('PUT /api/profile: Слишком много интересов:', interests);
      return NextResponse.json({ error: 'Максимум 5 интересов' }, { status: 400 });
    }

    const existingUser = await User.findOne({ username, _id: { $ne: userId } });
    if (existingUser) {
      console.log('PUT /api/profile: Имя пользователя занято:', username);
      return NextResponse.json({ error: 'Имя пользователя уже занято' }, { status: 409 });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name, username, bio, interests: interests || [], avatar },
      { new: true }
    ).select('username name bio interests avatar').lean<LeanUser>();
    if (!user) {
      console.log('PUT /api/profile: Пользователь не найден');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    console.log('PUT /api/profile: Пользователь обновлен:', user);
    console.timeEnd('PUT /api/profile: Total');
    return NextResponse.json(user, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/profile: Ошибка:', errorMessage, error);
    console.timeEnd('PUT /api/profile: Total');
    return NextResponse.json({ error: 'Ошибка обновления профиля', details: errorMessage }, { status: 500 });
  }
}