import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB';
import Post from '@/models/Post';
import mongoose from 'mongoose';

interface Reaction {
  emoji: string;
  users: string[];
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.time('PUT /api/posts/[id]: Total');
  console.log('PUT /api/posts/[id]: Запрос получен, id:', params.id);

  try {
    await connectToDB();
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

    const post = await Post.findById(params.id);
    if (!post) {
      console.log('PUT /api/posts/[id]: Пост не найден');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const isAuthor = post.userId?.toString() === userId;
    let isCommunityAdmin = false;
    if (post.community) {
      const community = await mongoose.model('Community').findById(post.community).select('creator admins');
      const isCreator = community?.creator?.toString() === userId;
      isCommunityAdmin = isCreator || community?.admins.includes(userId) || false;
    }

    if (!isAuthor && !isCommunityAdmin) {
      console.log('PUT /api/posts/[id]: У пользователя нет прав на редактирование');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    await connectToDB();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      console.log('DELETE /api/posts/[id]: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const post = await Post.findById(params.id);
    if (!post) {
      console.log('DELETE /api/posts/[id]: Пост не найден');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const isAuthor = post.userId?.toString() === userId;
    let isCommunityAdmin = false;
    if (post.community) {
      const community = await mongoose.model('Community').findById(post.community).select('creator admins');
      const isCreator = community?.creator?.toString() === userId;
      isCommunityAdmin = isCreator || community?.admins.includes(userId) || false;
    }

    if (!isAuthor && !isCommunityAdmin) {
      console.log('DELETE /api/posts/[id]: У пользователя нет прав на удаление');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleteResult = await Post.deleteOne({ _id: params.id });
    if (deleteResult.deletedCount === 0) {
      console.log('DELETE /api/posts/[id]: Пост не был удален (возможно, уже удален)');
      return NextResponse.json({ error: 'Пост не найден для удаления' }, { status: 404 });
    }

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