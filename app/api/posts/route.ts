import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import Community from '@/models/Community';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const userId = request.headers.get('x-user-id');
    console.log('Posts API: Получен userId:', userId);
    
    if (!userId) {
      console.error('Posts API: Отсутствует x-user-id в заголовке');
      return NextResponse.json({ error: 'Пользователь не аутентифицирован' }, { status: 401 });
    }

    const posts = await Post.find()
      .populate({
        path: 'user',
        model: User,
        select: 'username avatar',
      })
      .populate({
        path: 'community',
        model: Community,
        select: 'name',
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log('Posts API: Посты успешно загружены, количество:', posts.length);
    return NextResponse.json(posts, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Posts API: Ошибка загрузки постов:', errorMessage);
    return NextResponse.json({ error: 'Не удалось загрузить посты', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const userId = request.headers.get('x-user-id');
    console.log('Posts API: Получен userId для создания поста:', userId);
    
    if (!userId) {
      console.error('Posts API: Отсутствует x-user-id в заголовке');
      return NextResponse.json({ error: 'Пользователь не аутентифицирован' }, { status: 401 });
    }

    const { content, images } = await request.json();
    if (!content) {
      console.error('Posts API: Отсутствует содержимое поста');
      return NextResponse.json({ error: 'Требуется текст поста' }, { status: 400 });
    }

    const post = await Post.create({
      user: userId,
      content,
      images: images || [],
      likes: [],
      createdAt: new Date(),
    });

    console.log('Posts API: Пост создан, postId:', post._id);
    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Posts API: Ошибка создания поста:', errorMessage);
    return NextResponse.json({ error: 'Не удалось создать пост', details: errorMessage }, { status: 500 });
  }
}