import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('GET /api/users/[id]: Подключение к MongoDB...');
    await dbConnect();
    console.log('GET /api/users/[id]: MongoDB подключен');

    const params = await context.params; // Асинхронное получение params
    const userId = params.id;
    console.log('GET /api/users/[id] получено:', { userId });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('GET /api/users/[id]: Некорректный ID пользователя:', userId);
      return NextResponse.json({ error: 'Некорректный ID пользователя' }, { status: 400 });
    }

    const user = await User.findById(userId).select('username bio avatar createdAt');
    if (!user) {
      console.log('GET /api/users/[id]: Пользователь не найден:', userId);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    console.log('GET /api/users/[id]: Загружен пользователь:', user);
    return NextResponse.json(user);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/users/[id] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось загрузить пользователя', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('PUT /api/users/[id]: Подключение к MongoDB...');
    await dbConnect();
    console.log('PUT /api/users/[id]: MongoDB подключен');

    const params = await context.params;
    const userId = params.id;
    const { avatar, bio } = await request.json();
    console.log('PUT /api/users/[id] получено:', { userId, avatar, bio });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('PUT /api/users/[id]: Некорректный ID пользователя:', userId);
      return NextResponse.json({ error: 'Некорректный ID пользователя' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('PUT /api/users/[id]: Пользователь не найден:', userId);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (avatar) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    console.log('PUT /api/users/[id]: Обновлен пользователь:', user);
    return NextResponse.json(user);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/users/[id] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось обновить пользователя', details: errorMessage }, { status: 500 });
  }
}