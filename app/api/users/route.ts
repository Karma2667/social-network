import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  await dbConnect();
  try {
    console.log('Users API: GET запрос на получение списка пользователей');
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    console.log('Users API: Получен userId:', userId, 'поиск:', search);
    
    if (!userId) {
      console.error('Users API: Отсутствует x-user-id в заголовке');
      return NextResponse.json({ error: 'Пользователь не аутентифицирован' }, { status: 401 });
    }

    const query: any = { _id: { $ne: userId } };
    if (search) {
      query.username = { $regex: search, $options: 'i' }; // Регистронезависимый поиск
    }

    const users = await User.find(query).select('username avatar').lean();
    console.log('Users API: Пользователи найдены, количество:', users.length);
    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Users API: Ошибка получения пользователей:', errorMessage);
    return NextResponse.json({ error: 'Не удалось загрузить пользователей', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    console.log('Users API: POST запрос на регистрацию');
    const { username, email, password } = await request.json();
    if (!username || !email || !password) {
      console.error('Users API: Отсутствуют обязательные поля');
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.error('Users API: Пользователь уже существует, email:', email);
      return NextResponse.json(
        { error: 'Пользователь с таким email или именем уже существует' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      bio: '',
      avatar: '/default-avatar.png',
    });

    console.log('Users API: Пользователь создан, userId:', user._id);
    return NextResponse.json({ userId: user._id }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Users API: Ошибка регистрации:', errorMessage);
    return NextResponse.json({ error: 'Не удалось зарегистрироваться', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await dbConnect();
  try {
    console.log('Users API: PUT запрос на обновление профиля');
    const userId = request.headers.get('x-user-id');
    console.log('Users API: Получен userId:', userId);
    
    if (!userId) {
      console.error('Users API: Отсутствует x-user-id в заголовке');
      return NextResponse.json({ error: 'Пользователь не аутентифицирован' }, { status: 401 });
    }

    const { username, bio, avatar } = await request.json();
    console.log('Users API: Данные для обновления:', { username, bio, avatar });
    if (!username && !bio && !avatar) {
      console.error('Users API: Отсутствуют данные для обновления');
      return NextResponse.json({ error: 'Требуются данные для обновления' }, { status: 400 });
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (bio) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, select: 'username bio avatar' }
    );

    if (!user) {
      console.error('Users API: Пользователь не найден для userId:', userId);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    console.log('Users API: Профиль обновлен для userId:', userId);
    return NextResponse.json(user, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Users API: Ошибка обновления профиля:', errorMessage);
    return NextResponse.json({ error: 'Не удалось обновить профиль', details: errorMessage }, { status: 500 });
  }
}