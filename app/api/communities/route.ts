import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';
import mongoose from 'mongoose';

export async function GET() {
  try {
    console.log('GET /api/communities: Подключение к MongoDB...');
    await dbConnect();
    console.log('GET /api/communities: MongoDB подключен');

    const communities = await Community.find({})
      .populate('creator', 'username')
      .select('name _id creator');
    console.log('GET /api/communities: Загружены сообщества:', communities);
    return NextResponse.json(communities);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/communities ошибка:', error);
    return NextResponse.json({ error: 'Не удалось загрузить сообщества', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/communities: Подключение к MongoDB...');
    await dbConnect();
    console.log('POST /api/communities: MongoDB подключен');

    const { name, description, userId } = await request.json();
    console.log('POST /api/communities получено:', { name, description, userId });

    if (!name || !userId) {
      console.log('POST /api/communities: Отсутствуют поля');
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('POST /api/communities: Некорректный ID пользователя:', userId);
      return NextResponse.json({ error: 'Некорректный ID пользователя' }, { status: 400 });
    }

    const community = new Community({
      name,
      description: description || '',
      creator: userId,
      members: [userId],
      admins: [userId],
    });

    await community.save();
    await community.populate('creator', 'username');
    console.log('POST /api/communities: Создано сообщество:', community);
    return NextResponse.json(community);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/communities ошибка:', error);
    return NextResponse.json({ error: 'Не удалось создать сообщество', details: errorMessage }, { status: 500 });
  }
}