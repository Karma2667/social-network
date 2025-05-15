import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Session from '@/models/Session';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  bio?: string;
  avatar?: string;
  createdAt?: Date;
}

export async function POST(request: Request) {
  console.time('POST /api/auth/login: Total');
  console.log('POST /api/auth/login: Запрос получен');
  try {
    await dbConnect();
    console.log('POST /api/auth/login: MongoDB подключен');

    const { email, password } = await request.json();
    console.log('POST /api/auth/login: Данные:', { email, password: password ? '[provided]' : '[missing]' });

    if (!email || !password) {
      console.log('POST /api/auth/login: Отсутствуют email или password');
      return NextResponse.json({ error: 'Требуются email и password' }, { status: 400 });
    }

    const user: IUser | null = await User.findOne({ email }).lean<IUser>();
    console.log('POST /api/auth/login: Пользователь:', user ? { _id: user._id, email: user.email, username: user.username } : 'не найден');

    if (!user) {
      console.log('POST /api/auth/login: Пользователь не найден');
      return NextResponse.json({ error: 'Неверные учетные данные' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('POST /api/auth/login: Проверка пароля:', isPasswordValid ? 'успешна' : 'неудачна');
    if (!isPasswordValid) {
      console.log('POST /api/auth/login: Неверный пароль');
      return NextResponse.json({ error: 'Неверные учетные данные' }, { status: 401 });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
    const session = new Session({
      userId: user._id,
      token,
      createdAt: new Date(),
      expiresAt,
    });
    await session.save();
    console.log('POST /api/auth/login: Сессия создана:', session._id.toString(), 'token:', token);

    console.timeEnd('POST /api/auth/login: Total');
    return NextResponse.json({ userId: user._id, token, username: user.username }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/auth/login: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/auth/login: Total');
    return NextResponse.json({ error: 'Ошибка входа', details: errorMessage }, { status: 500 });
  }
}