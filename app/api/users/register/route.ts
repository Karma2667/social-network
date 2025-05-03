import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { username, email, password } = await request.json();
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    // Проверка существующего пользователя
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email или именем уже существует' },
        { status: 400 }
      );
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание нового пользователя
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      bio: '',
      avatar: '/default-avatar.png',
    });

    console.log('Register API: Пользователь создан, userId:', user._id);
    return NextResponse.json({ userId: user._id }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Register API: Ошибка регистрации:', errorMessage);
    return NextResponse.json({ error: 'Не удалось зарегистрироваться', details: errorMessage }, { status: 500 });
  }
}