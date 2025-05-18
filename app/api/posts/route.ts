import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET(request: Request) {
  console.time('GET /api/posts: Total');
  console.log('GET /api/posts: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/posts: MongoDB подключен');

    const userId = request.headers.get('x-user-id');

    if (!userId) {
      console.log('GET /api/posts: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    console.log('GET /api/posts: Параметры:', { userId });

    const posts = await Post.find({ userId }).sort({ createdAt: -1 }).lean();

    console.log('GET /api/posts: Посты загружены:', posts);
    console.timeEnd('GET /api/posts: Total');
    return NextResponse.json(posts, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/posts: Ошибка:', errorMessage, error);
    console.timeEnd('GET /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка загрузки постов', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/posts: Total');
  console.log('POST /api/posts: Запрос получен');
  try {
    await dbConnect();
    console.log('POST /api/posts: MongoDB подключен');

    const userId = request.headers.get('x-user-id');
    const { content } = await request.json();

    if (!userId) {
      console.log('POST /api/posts: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      console.log('POST /api/posts: Отсутствует или некорректный content');
      return NextResponse.json({ error: 'Требуется content' }, { status: 400 });
    }

    console.log('POST /api/posts: Параметры:', { userId, content });

    const post = await Post.create({ userId, content });

    console.log('POST /api/posts: Пост создан:', post);
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/posts: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка создания поста', details: errorMessage }, { status: 500 });
  }
}