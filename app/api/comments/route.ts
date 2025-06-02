import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  console.time('GET /api/comments: Total');
  console.log('GET /api/comments: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/comments: MongoDB подключен');

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      console.log('GET /api/comments: Отсутствует или некорректный postId');
      return NextResponse.json({ error: 'Требуется корректный postId' }, { status: 400 });
    }

    console.log('GET /api/comments: Параметры:', { postId });

    const comments = await Comment.find({ postId })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .lean();

    console.log('GET /api/comments: Комментарии загружены:', comments);
    console.timeEnd('GET /api/comments: Total');
    return NextResponse.json(comments, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/comments: Ошибка:', errorMessage, error);
    console.timeEnd('GET /api/comments: Total');
    return NextResponse.json({ error: 'Ошибка загрузки комментариев', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/comments: Total');
  console.log('POST /api/comments: Запрос получен');
  try {
    await dbConnect();
    console.log('POST /api/comments: MongoDB подключен');

    const userId = request.headers.get('x-user-id');
    const { postId, content } = await request.json();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('POST /api/comments: Отсутствует или некорректный userId');
      return NextResponse.json({ error: 'Требуется корректный userId' }, { status: 400 });
    }

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      console.log('POST /api/comments: Отсутствует или некорректный postId');
      return NextResponse.json({ error: 'Требуется корректный postId' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      console.log('POST /api/comments: Отсутствует или некорректный content');
      return NextResponse.json({ error: 'Требуется content' }, { status: 400 });
    }

    console.log('POST /api/comments: Параметры:', { userId, postId, content });

    const comment = await Comment.create({ postId, userId, content, reactions: [] });

    await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

    console.log('POST /api/comments: Комментарий создан:', comment);
    console.timeEnd('POST /api/comments: Total');
    return NextResponse.json(comment, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/comments: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/comments: Total');
    return NextResponse.json({ error: 'Ошибка создания комментария', details: errorMessage }, { status: 500 });
  }
}