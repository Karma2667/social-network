import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import fs from 'fs/promises';
import path from 'path';

interface LeanUser {
  _id: string;
  username: string;
  name?: string;
  bio?: string;
  interests: string[];
  avatar?: string;
}

export async function GET(request: Request) {
  console.time('GET /api/profile: Total');
  console.log('GET /api/profile: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/profile: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    console.log('GET /api/profile: Параметры:', { userId, authToken, username });

    if (!userId || !authToken) {
      console.log('GET /api/profile: Отсутствует userId или authToken');
      return NextResponse.json({ error: 'Требуются userId и authToken' }, { status: 400 });
    }

    if (username) {
      const user = await User.findOne({ username });
      console.log('GET /api/profile/check-username: Результат:', { exists: !!user });
      console.timeEnd('GET /api/profile: Total');
      return NextResponse.json({ exists: !!user }, { status: 200 });
    }

    const user = await User.findById(userId).select('username name bio interests avatar').lean<LeanUser>();
    if (!user) {
      console.log('GET /api/profile: Пользователь не найден');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    user.interests = user.interests || [];
    console.log('GET /api/profile: Пользователь найден:', user);
    console.timeEnd('GET /api/profile: Total');
    return NextResponse.json(user, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/profile: Ошибка:', errorMessage);
    console.timeEnd('GET /api/profile: Total');
    return NextResponse.json({ error: 'Ошибка загрузки профиля', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  console.time('PUT /api/profile: Total');
  console.log('PUT /api/profile: Запрос получен');
  try {
    await dbConnect();
    console.log('PUT /api/profile: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const formData = await request.formData();
    console.log('PUT /api/profile: FormData получено:', Object.fromEntries(formData));

    if (!userId || !authToken) {
      console.log('PUT /api/profile: Отсутствуют userId или authToken');
      return NextResponse.json({ error: 'Требуются userId и authToken' }, { status: 400 });
    }

    const username = formData.get('username')?.toString();
    const name = formData.get('name')?.toString();
    const bio = formData.get('bio')?.toString();
    const interests = JSON.parse(formData.get('interests')?.toString() || '[]') as string[];
    const avatarFile = formData.get('avatar') as File | null;

    if (!username) {
      console.log('PUT /api/profile: Отсутствует username');
      return NextResponse.json({ error: 'Требуется username' }, { status: 400 });
    }

    if (!interests || interests.length === 0) {
      console.log('PUT /api/profile: Отсутствуют интересы');
      return NextResponse.json({ error: 'Выберите хотя бы один интерес' }, { status: 400 });
    }

    if (interests.length > 5) {
      console.log('PUT /api/profile: Слишком много интересов:', interests);
      return NextResponse.json({ error: 'Максимум 5 интересов' }, { status: 400 });
    }

    const existingUser = await User.findOne({ username, _id: { $ne: userId } });
    if (existingUser) {
      console.log('PUT /api/profile: Имя пользователя занято:', username);
      return NextResponse.json({ error: 'Имя пользователя уже занято' }, { status: 409 });
    }

    const user = await User.findById(userId).lean<LeanUser>();
    if (!user) {
      console.log('PUT /api/profile: Пользователь не найден');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    let newAvatarPath = user.avatar; // Сохраняем текущий путь по умолчанию
    if (avatarFile instanceof File) {
      const file = avatarFile;
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Аватар должен быть изображением размером менее 5MB' }, { status: 400 });
      }
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      const uniqueSuffix = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, uniqueSuffix);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      console.log('PUT /api/profile: Файл сохранён по пути:', filePath);
      newAvatarPath = `/uploads/${uniqueSuffix}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, username, bio, interests, avatar: newAvatarPath },
      { new: true }
    ).select('username name bio interests avatar').lean<LeanUser>();

    console.log('PUT /api/profile: Пользователь обновлен:', updatedUser);
    console.timeEnd('PUT /api/profile: Total');
    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/profile: Ошибка:', errorMessage);
    console.timeEnd('PUT /api/profile: Total');
    return NextResponse.json({ error: 'Ошибка обновления профиля', details: errorMessage }, { status: 500 });
  }
}