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
  console.time('POST /api/auth/register: Total');
  console.log('POST /api/auth/register: Запрос получен');
  try {
    await dbConnect();
    console.log('POST /api/auth/register: MongoDB подключен');

    const { username, email, password } = await request.json();
    console.log('POST /api/auth/register: Данные:', { username, email, password: password ? '[provided]' : '[missing]' });

    if (!username || !email || !password) {
      console.log('POST /api/auth/register: Отсутствуют username, email или password');
      return NextResponse.json({ error: 'Требуются username, email и password' }, { status: 400 });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('POST /api/auth/register: Пользователь уже существует:', { email, username });
      return NextResponse.json({ error: 'Пользователь с таким email или именем уже существует' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('POST /api/auth/register: Пароль захеширован');

    const user = new User({
      username,
      email,
      password: hashedPassword,
      bio: '',
      avatar: '/default-avatar.png',
      createdAt: new Date(),
    });
    await user.save();
    console.log('POST /api/auth/register: Пользователь создан:', user._id.toString());

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
    const session = new Session({
      userId: user._id,
      token,
      createdAt: new Date(),
      expiresAt,
    });
    await session.save();
    console.log('POST /api/auth/register: Сессия создана:', session._id.toString(), 'token:', token);

    console.timeEnd('POST /api/auth/register: Total');
    return NextResponse.json({ userId: user._id, token, username }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/auth/register: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/auth/register: Total');
    return NextResponse.json({ error: 'Ошибка регистрации', details: errorMessage }, { status: 500 });
  }
}