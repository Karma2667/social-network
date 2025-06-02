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
    console.log('POST /api/posts: userId из заголовков:', userId);

    const formData = await request.formData();
    const content = formData.get('content') as string;
    const files = formData.getAll('images') as File[];

    console.log('POST /api/posts: Полученные данные:', { content, filesCount: files.length });

    if (!userId) {
      console.log('POST /api/posts: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      console.log('POST /api/posts: Отсутствует или некорректный content');
      return NextResponse.json({ error: 'Требуется content' }, { status: 400 });
    }

    let images: string[] = [];
    if (files.length > 0) {
      console.log('POST /api/posts: Загрузка изображений через /api/upload');
      const uploadFormData = new FormData();
      files.forEach((file) => uploadFormData.append('files', file));
      const uploadRes = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        console.error('POST /api/posts: Ошибка загрузки изображений:', errorData);
        throw new Error(errorData.error || 'Не удалось загрузить изображения');
      }
      const { files: uploadedFiles } = await uploadRes.json();
      console.log('POST /api/posts: Изображения загружены:', uploadedFiles);
      images = uploadedFiles;
    }

    const post = await Post.create({ userId, content, images });
    console.log('POST /api/posts: Пост создан:', post);

    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/posts: Подробная ошибка:', errorMessage, error);
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка создания поста', details: errorMessage }, { status: 500 });
  }
}

// Остальные методы (PUT, DELETE) остаются без изменений
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.time('PUT /api/posts/[id]: Total');
  console.log('PUT /api/posts/[id]: Запрос получен, id:', params.id);
  try {
    await dbConnect();
    console.log('PUT /api/posts/[id]: MongoDB подключен');

    const userId = request.headers.get('x-user-id');
    const { content } = await request.json();

    if (!userId) {
      console.log('PUT /api/posts/[id]: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      console.log('PUT /api/posts/[id]: Отсутствует или некорректный content');
      return NextResponse.json({ error: 'Требуется content' }, { status: 400 });
    }

    console.log('PUT /api/posts/[id]: Параметры:', { userId, content });

    const post = await Post.findOne({ _id: params.id, userId });
    if (!post) {
      console.log('PUT /api/posts/[id]: Пост не найден или не принадлежит пользователю');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    post.content = content;
    post.updatedAt = new Date();
    await post.save();

    console.log('PUT /api/posts/[id]: Пост обновлен:', post);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json(post, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/posts/[id]: Ошибка:', errorMessage, error);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Failed to update post', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  console.time('DELETE /api/posts/[id]: Total');
  console.log('DELETE /api/posts/[id]: Запрос получен, id:', params.id);
  try {
    await dbConnect();
    console.log('DELETE /api/posts/[id]: MongoDB подключен');

    const userId = request.headers.get('x-user-id');

    if (!userId) {
      console.log('DELETE /api/posts/[id]: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    console.log('DELETE /api/posts/[id]: Параметры:', { userId });

    const post = await Post.findOne({ _id: params.id, userId });
    if (!post) {
      console.log('DELETE /api/posts/[id]: Пост не найден или не принадлежит пользователю');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    await Post.deleteOne({ _id: params.id, userId });

    console.log('DELETE /api/posts/[id]: Пост удален');
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ message: 'Пост удален' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/posts/[id]: Ошибка:', errorMessage, error);
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Failed to delete post', details: errorMessage }, { status: 500 });
  }
}