import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Session from '@/models/Session';

// Define interfaces for lean documents
interface LeanSession {
  _id: string;
  userId: string;
  token: string;
  __v?: number;
}

interface LeanUser {
  _id: string;
  username: string;
  avatar?: string; // Добавляем поддержку avatar
  __v?: number;
}

export async function GET(request: Request) {
  console.time('GET /api/auth/me: Total');
  console.log('GET /api/auth/me: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/auth/me: MongoDB подключен');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('GET /api/auth/me: Отсутствует или неверный заголовок Authorization');
      return NextResponse.json({ error: 'Требуется токен авторизации' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('GET /api/auth/me: Токен:', token);

    const session = await Session.findOne({ token }).lean<LeanSession>();
    if (!session) {
      console.log('GET /api/auth/me: Сессия не найдена');
      return NextResponse.json({ error: 'Неверный токен' }, { status: 401 });
    }

    const user = await User.findById(session.userId).select('username avatar').lean<LeanUser>(); // Добавляем avatar
    if (!user) {
      console.log('GET /api/auth/me: Пользователь не найден');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    console.log('GET /api/auth/me: Пользователь найден:', { userId: session.userId, username: user.username, avatar: user.avatar });
    console.timeEnd('GET /api/auth/me: Total');
    return NextResponse.json({
      userId: session.userId,
      username: user.username,
      avatar: user.avatar || '/default-avatar.png', // Возвращаем avatar или заглушку
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/auth/me: Ошибка:', errorMessage, error);
    console.timeEnd('GET /api/auth/me: Total');
    return NextResponse.json({ error: 'Ошибка проверки авторизации', details: errorMessage }, { status: 500 });
  }
}