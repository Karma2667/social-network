import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB'; // Исправлен импорт
import Post from '@/models/Post';
import Comment from '@/models/Comment';

export async function POST(request: Request) {
  console.time('POST /api/comments: Total');
  console.log('POST /api/comments: Запрос получен');
  try {
    await connectToDB();
    const userId = request.headers.get('x-user-id');
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const postId = formData.get('postId') as string;
    const files = formData.getAll('images') as File[];

    if (!userId || !content || typeof content !== 'string' || !postId) {
      return NextResponse.json({ error: 'Требуется userId, content и postId' }, { status: 400 });
    }

    let images: string[] = [];
    if (files.length > 0) {
      const uploadFormData = new FormData();
      files.forEach((file) => uploadFormData.append('files', file));
      const uploadRes = await fetch('http://localhost:3000/api/upload', { method: 'POST', body: uploadFormData });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Не удалось загрузить изображения');
      images = (await uploadRes.json()).files;
    }

    const newComment = await Comment.create({
      userId,
      content,
      images,
      postId,
      createdAt: new Date(),
      likes: [], // Инициализация пустого массива
      reactions: [], // Инициализация пустого массива
    });

    const post = await Post.findById(postId);
    if (post) {
      post.comments.push(newComment._id);
      await post.save();
    }

    const responseData = {
      _id: newComment._id.toString(),
      userId: { _id: userId, username: 'test5' }, // Замените на реальное имя из базы, если доступно
      content: newComment.content,
      createdAt: newComment.createdAt.toISOString(),
      likes: newComment.likes || [],
      reactions: newComment.reactions || [],
      images: newComment.images || [],
    };

    console.log('POST /api/comments: Комментарий создан:', responseData);
    console.timeEnd('POST /api/comments: Total');
    return NextResponse.json(responseData, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/comments: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/comments: Total');
    return NextResponse.json({ error: 'Ошибка создания комментария', details: errorMessage }, { status: 500 });
  }
}