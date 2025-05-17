import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

interface LeanPost {
  _id: string;
  userId: string;
  content: string;
  createdAt: Date;
  __v?: number;
}

export async function GET(request: Request) {
  console.time('GET /api/posts: Total');
  console.log('GET /api/posts: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/posts: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    console.log('GET /api/posts: Параметры:', { userId });

    if (!userId) {
      console.log('GET /api/posts: Отсутствует userId');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const posts = await Post.find({ userId }).sort({ createdAt: -1 }).lean<LeanPost[]>();
    console.log('GET /api/posts: Найдено постов:', posts.length);

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

    const userId = request.headers.get('x-user-id')?.trim();
    const { content, userId: bodyUserId } = await request.json();
    console.log('POST /api/posts: Данные:', { userId, content, bodyUserId });

    if (!userId || !content || userId !== bodyUserId) {
      console.log('POST /api/posts: Отсутствуют или неверные данные');
      return NextResponse.json({ error: 'Требуются userId и content' }, { status: 400 });
    }

    const post = await Post.create({ userId, content });
    console.log('POST /api/posts: Пост создан:', post._id);

    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/posts: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка создания поста', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  console.time('PUT /api/posts: Total');
  console.log('PUT /api/posts: Запрос получен');
  try {
    await dbConnect();
    console.log('PUT /api/posts: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    const { content, postId } = await request.json();
    console.log('PUT /api/posts: Данные:', { userId, content, postId });

    if (!userId || !content || !postId) {
      console.log('PUT /api/posts: Отсутствуют или неверные данные');
      return NextResponse.json({ error: 'Требуются userId, content и postId' }, { status: 400 });
    }

    const post = await Post.findOneAndUpdate(
      { _id: postId, userId },
      { content },
      { new: true }
    ).lean<LeanPost>();
    if (!post) {
      console.log('PUT /api/posts: Пост не найден');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    console.log('PUT /api/posts: Пост обновлен:', post._id);
    console.timeEnd('PUT /api/posts: Total');
    return NextResponse.json(post, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/posts: Ошибка:', errorMessage, error);
    console.timeEnd('PUT /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка обновления поста', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  console.time('DELETE /api/posts: Total');
  console.log('DELETE /api/posts: Запрос получен');
  try {
    await dbConnect();
    console.log('DELETE /api/posts: MongoDB подключен');

    const userId = request.headers.get('x-user-id')?.trim();
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId')?.trim();
    console.log('DELETE /api/posts: Данные:', { userId, postId });

    if (!userId || !postId) {
      console.log('DELETE /api/posts: Отсутствуют или неверные данные');
      return NextResponse.json({ error: 'Требуются userId и postId' }, { status: 400 });
    }

    const post = await Post.findOneAndDelete({ _id: postId, userId }).lean<LeanPost>();
    if (!post) {
      console.log('DELETE /api/posts: Пост не найден');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    console.log('DELETE /api/posts: Пост удален:', post._id);
    console.timeEnd('DELETE /api/posts: Total');
    return NextResponse.json({ message: 'Пост удален' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/posts: Ошибка:', errorMessage, error);
    console.timeEnd('DELETE /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка удаления поста', details: errorMessage }, { status: 500 });
  }
}