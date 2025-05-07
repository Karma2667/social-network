import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  await dbConnect();
  try {
    console.log('Login API: POST запрос на вход');
    const { email, password } = await request.json();
    console.log('Login API: Получены данные:', { email, password });

    if (!email || !password) {
      console.error('Login API: Отсутствуют обязательные поля:', { email, password });
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    const user = await User.findOne({ email }).select('_id password');
    if (!user) {
      console.error('Login API: Пользователь не найден для email:', email);
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.error('Login API: Неверный пароль для email:', email);
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    console.log('Login API: Успешный вход, userId:', user._id);
    return NextResponse.json({ userId: user._id }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Login API: Ошибка входа:', errorMessage);
    return NextResponse.json({ error: 'Не удалось войти', details: errorMessage }, { status: 500 });
  }
}