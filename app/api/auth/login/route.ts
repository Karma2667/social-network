import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Session from '@/models/Session';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

interface LeanUser {
  _id: string;
  email: string;
  username: string;
  password: string;
  __v?: number;
}

export async function POST(request: Request) {
  console.time('POST /api/auth/login: Total');
  console.log('POST /api/auth/login: Запрос получен');
  try {
    await dbConnect();
    console.log('POST /api/auth/login: MongoDB подключен');

    const { email, password } = await request.json();
    console.log('POST /api/auth/login: Данные:', { email, password }); // Исправлено на { email, password }

    if (!email || !password) {
      console.log('POST /api/auth/login: Отсутствуют email или password');
      return NextResponse.json({ error: 'Требуются email и пароль' }, { status: 400 });
    }

    const user = await User.findOne({ email }).lean<LeanUser>();
    if (!user) {
      console.log('POST /api/auth/login: Пользователь не найден для email:', email);
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    console.log('POST /api/auth/login: Пользователь найден:', { userId: user._id, username: user.username });
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('POST /api/auth/login: Неверный пароль для userId:', user._id);
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    const token = uuidv4();
    const session = await Session.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Срок действия 24 часа
    });
    console.log('POST /api/auth/login: Сессия создана:', {
      userId: user._id,
      token,
      expiresAt: session.expiresAt,
    });

    console.timeEnd('POST /api/auth/login: Total');
    return NextResponse.json({
      userId: user._id,
      username: user.username,
      avatar: '/default-avatar.png', // Добавим аватар по умолчанию
      token,
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/auth/login: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/auth/login: Total');
    return NextResponse.json({ error: 'Ошибка входа', details: errorMessage }, { status: 500 });
  }
}