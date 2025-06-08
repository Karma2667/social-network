import { NextResponse } from 'next/server';
import connectToDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Post from '@/models/Post';

export async function POST(request: Request) {
  console.time('POST /api/comments: Total');
  console.log('POST /api/comments: Запрос получен');
  try {
    await connectToDB();
    const { postId, content } = await request.json();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }
    if (!postId || !content) {
      return NextResponse.json({ error: 'Требуются postId и content' }, { status: 400 });
    }

    const comment = await Comment.create({ userId, postId, content });
    await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

    console.log('POST /api/comments: Комментарий создан:', comment);
    console.timeEnd('POST /api/comments: Total');
    return NextResponse.json({
      _id: comment._id.toString(),
      userId,
      content,
      createdAt: comment.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/comments: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/comments: Total');
    return NextResponse.json({ error: 'Ошибка создания комментария', details: errorMessage }, { status: 500 });
  }
}