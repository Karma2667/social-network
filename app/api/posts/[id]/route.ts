import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB';
import Post, { LeanPostDocument } from '@/models/Post';
import Comment from '@/models/Comment';
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

    const post = await Post.findById(params.id).lean() as LeanPostDocument | null;
    if (!post) {
      console.log('PUT /api/posts/[id]: Пост не найден');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const isAuthor = post.userId?.toString() === userId;
    let isCommunityAdmin = false;
    if (post.community) {
      const community = await mongoose.model('Community').findById(post.community).select('creator admins');
      const isCreator = community?.creator?.toString() === userId;
      isCommunityAdmin = isCreator || (community?.admins?.includes(userId) || false);
    }

    if (!isAuthor && !isCommunityAdmin) {
      console.log('PUT /api/posts/[id]: У пользователя нет прав на редактирование');
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      params.id,
      { content, images, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    console.log('PUT /api/posts/[id]: Пост обновлен:', updatedPost);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json(updatedPost, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/posts/[id]: Ошибка:', errorMessage, error);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Не удалось обновить пост', details: errorMessage }, { status: 500 });
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

    const post = await Post.findById(params.id).lean() as LeanPostDocument | null;
    if (!post) {
      console.log('DELETE /api/posts/[id]: Пост не найден');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const isAuthor = post.userId?.toString() === userId;
    let isCommunityAdmin = false;
    if (post.community) {
      const community = await mongoose.model('Community').findById(post.community).select('creator admins');
      const isCreator = community?.creator?.toString() === userId;
      isCommunityAdmin = isCreator || (community?.admins?.includes(userId) || false);
    }

    if (!isAuthor && !isCommunityAdmin) {
      console.log('DELETE /api/posts/[id]: У пользователя нет прав на удаление');
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Удаляем пост
      const deletePostResult = await Post.deleteOne({ _id: params.id }).session(session);
      if (deletePostResult.deletedCount === 0) {
        await session.abortTransaction();
        console.log('DELETE /api/posts/[id]: Пост не был удален');
        return NextResponse.json({ error: 'Пост не найден для удаления' }, { status: 404 });
      }

      // Удаляем все комментарии, связанные с постом
      await Comment.deleteMany({ postId: params.id }).session(session);

      await session.commitTransaction();
      console.log('DELETE /api/posts/[id]: Пост и комментарии удалены');
      console.timeEnd('DELETE /api/posts/[id]: Total');
      return NextResponse.json({ message: 'Пост удалён' }, { status: 200 });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/posts/[id]: Ошибка:', errorMessage, error);
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Не удалось удалить пост', details: errorMessage }, { status: 500 });
  }
}