import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB'; // Исправлен импорт
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import mongoose from 'mongoose';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.time('PUT /api/comments/[id]: Total');
  console.log('PUT /api/comments/[id]: Запрос получен, id:', params.id);
  try {
    await connectToDB();
    console.log('PUT /api/comments/[id]: MongoDB подключен');

    const userId = request.headers.get('x-user-id');
    const { content } = await request.json();

    if (!userId) {
      console.log('PUT /api/comments/[id]: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      console.log('PUT /api/comments/[id]: Отсутствует или некорректный content');
      return NextResponse.json({ error: 'Требуется content' }, { status: 400 });
    }

    console.log('PUT /api/comments/[id]: Параметры:', { userId, content });

    const comment = await Comment.findOne({ _id: params.id, userId });
    if (!comment) {
      console.log('PUT /api/comments/[id]: Комментарий не найден или не принадлежит пользователю');
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
    }

    comment.content = content;
    comment.updatedAt = new Date();
    await comment.save();

    console.log('PUT /api/comments/[id]: Комментарий обновлен:', comment);
    console.timeEnd('PUT /api/comments/[id]: Total');
    return NextResponse.json(comment, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/comments/[id]: Ошибка:', errorMessage, error);
    console.timeEnd('PUT /api/comments/[id]: Total');
    return NextResponse.json({ error: 'Ошибка обновления комментария', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  console.time('DELETE /api/comments/[id]: Total');
  console.log('DELETE /api/comments/[id]: Запрос получен, id:', params.id);
  try {
    await connectToDB();
    console.log('DELETE /api/comments/[id]: MongoDB подключен');

    const userId = request.headers.get('x-user-id');

    if (!userId) {
      console.log('DELETE /api/comments/[id]: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    console.log('DELETE /api/comments/[id]: Параметры:', { userId });

    const comment = await Comment.findOne({ _id: params.id, userId });
    if (!comment) {
      console.log('DELETE /api/comments/[id]: Комментарий не найден или не принадлежит пользователю');
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
    }

    await Comment.deleteOne({ _id: params.id, userId });
    await Post.findByIdAndUpdate(comment.postId, { $pull: { comments: params.id } });

    console.log('DELETE /api/comments/[id]: Комментарий удален');
    console.timeEnd('DELETE /api/comments/[id]: Total');
    return NextResponse.json({ message: 'Комментарий удален' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/comments/[id]: Ошибка:', errorMessage, error);
    console.timeEnd('DELETE /api/comments/[id]: Total');
    return NextResponse.json({ error: 'Ошибка удаления комментария', details: errorMessage }, { status: 500 });
  }
}