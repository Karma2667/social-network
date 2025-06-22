import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB'; // Исправленный импорт
import Community from '@/models/Community';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function GET() {
  try {
    console.log('GET /api/communities: Подключение к MongoDB...');
    await connectToDB();
    console.log('GET /api/communities: MongoDB подключен');

    const communities = await Community.find({})
      .populate('creator', 'username')
      .select('name _id creator avatar interests');
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
    await connectToDB();
    console.log('POST /api/communities: MongoDB подключен');

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const interestsJson = formData.get('interests') as string;
    const avatar = formData.get('avatar') as File | null;
    const userId = request.headers.get('x-user-id');
    const members = formData.getAll('members') as string[];

    console.log('POST /api/communities получено:', { name, description, interestsJson, userId, members, avatar });

    if (!name || !userId) {
      console.log('POST /api/communities: Отсутствуют обязательные поля');
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('POST /api/communities: Некорректный ID пользователя:', userId);
      return NextResponse.json({ error: 'Некорректный ID пользователя' }, { status: 400 });
    }

    let interests: string[] = [];
    try {
      interests = interestsJson ? JSON.parse(interestsJson) : [];
      if (!Array.isArray(interests)) throw new Error('Interests must be an array');
      if (interests.some((i) => typeof i !== 'string')) throw new Error('Interests must be strings');
    } catch (parseError) {
      console.error('POST /api/communities: Ошибка парсинга interests:', parseError);
      return NextResponse.json({ error: 'Invalid interests format', details: (parseError as Error).message }, { status: 400 });
    }

    let avatarPath = '';
    if (avatar) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public/uploads');
        await fs.mkdir(uploadsDir, { recursive: true });
        const fileName = `${Date.now()}-${avatar.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadsDir, fileName);
        const buffer = Buffer.from(await avatar.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        avatarPath = `/uploads/${fileName}`;
      } catch (fileError) {
        console.error('POST /api/communities: Ошибка загрузки аватарки:', fileError);
        return NextResponse.json({ error: 'Ошибка загрузки аватарки', details: (fileError as Error).message }, { status: 500 });
      }
    }

    const community = new Community({
      name,
      description: description || '',
      interests,
      creator: userId,
      members: [userId, ...members.filter((id) => mongoose.Types.ObjectId.isValid(id))],
      admins: [userId],
      avatar: avatarPath,
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