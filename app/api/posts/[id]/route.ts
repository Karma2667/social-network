import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Post from '@/models/Post';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.time('PUT /api/posts/[id]: Total');
  console.log('PUT /api/posts/[id]: Запрос получен, id:', params.id);
  try {
    await dbConnect();
    console.log('PUT /api/posts/[id]: MongoDB подключен');

    const userId = request.headers.get('x-user-id');
    const { content, images } = await request.json();

    if (!userId) {
      console.log('PUT /api/posts/[id]: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      console.log('PUT /api/posts/[id]: Отсутствует или некорректный content');
      return NextResponse.json({ error: 'Требуется content' }, { status: 400 });
    }

    console.log('PUT /api/posts/[id]: Параметры:', { userId, content, images });

    const post = await Post.findOne({ _id: params.id, userId });
    if (!post) {
      console.log('PUT /api/posts/[id]: Пост не найден или не принадлежит пользователю');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    post.content = content;
    post.images = images || post.images;
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