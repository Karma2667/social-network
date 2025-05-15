import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';

interface ISession {
  _id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export async function GET(request: Request) {
  console.time('GET /api/auth/me: Total');
  console.log('GET /api/auth/me: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('GET /api/auth/me: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    console.log('GET /api/auth/me: Параметры:', { userId, authToken });

    if (!userId && !authToken) {
      console.log('GET /api/auth/me: Отсутствуют userId и authToken');
      return NextResponse.json({ error: 'Требуется userId или токен авторизации' }, { status: 401 });
    }

    let session: ISession | null;
    if (authToken) {
      session = await Session.findOne({ token: authToken, expiresAt: { $gt: new Date() } }).lean<ISession>();
      console.log('GET /api/auth/me: Сессия по токену:', session ? session._id : 'не найдена');
    } else {
      session = await Session.findOne({ userId, expiresAt: { $gt: new Date() } }).lean<ISession>();
      console.log('GET /api/auth/me: Сессия по userId:', session ? session._id : 'не найдена');
    }

    if (!session) {
      console.log('GET /api/auth/me: Активная сессия не найдена');
      return NextResponse.json({ error: 'Сессия не найдена или истекла' }, { status: 401 });
    }

    console.timeEnd('GET /api/auth/me: Total');
    return NextResponse.json({ userId: session.userId }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/auth/me: Ошибка:', errorMessage, error);
    console.timeEnd('GET /api/auth/me: Total');
    return NextResponse.json({ error: 'Не удалось проверить авторизацию', details: errorMessage }, { status: 500 });
  }
}