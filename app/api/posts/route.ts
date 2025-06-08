import { NextResponse } from 'next/server';
import connectToDB from '@/app/lib/mongoDB';
import Post from '@/models/Post';
import Comment from '@/models/Comment';

export async function GET(request: Request) {
  console.time('GET /api/posts: Total');
  console.log('GET /api/posts: Запрос получен');
  try {
    const mongoose = await connectToDB();
    console.log('GET /api/posts: MongoDB подключен');

    const userId = request.headers.get('x-user-id');
    console.log('GET /api/posts: Получен userId:', userId);

    if (!userId) {
      console.log('GET /api/posts: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (typeof userId !== 'string') {
      console.log('GET /api/posts: userId имеет некорректный тип:', typeof userId);
      return NextResponse.json({ error: 'Некорректный userId' }, { status: 400 });
    }

    let postsQuery = Post.find({ userId }).sort({ createdAt: -1 }).lean();
    if (mongoose.models.Comment) {
      postsQuery = postsQuery.populate('comments');
    } else {
      console.warn('GET /api/posts: Модель Comment не зарегистрирована, пропускаем populate');
    }

    const posts: any[] = await postsQuery;

    if (!posts || posts.length === 0) {
      console.log('GET /api/posts: Посты не найдены для userId:', userId);
      return NextResponse.json({ message: 'Посты не найдены' }, { status: 200 });
    }

    const formattedPosts = posts.map((post: any) => ({
      username: 'Unknown User',
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      userId: post.userId,
      likes: post.likes || [],
      reactions: post.reactions || [],
      images: post.images || [],
      postId: post._id.toString(),
      userAvatar: '/default-avatar.png',
      comments: post.comments
        ? post.comments.map((comment: any) => ({
            _id: comment._id.toString(),
            userId: comment.userId,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
          }))
        : [],
    }));

    console.log('GET /api/posts: Посты загружены:', formattedPosts);
    console.timeEnd('GET /api/posts: Total');
    return NextResponse.json(formattedPosts, { status: 200 });
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
    await connectToDB();
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

    const post = await Post.create({ userId, content, images, comments: [] });
    console.log('POST /api/posts: Пост создан:', post);

    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json({
      username: 'Unknown User',
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      userId: post.userId,
      likes: post.likes || [],
      reactions: post.reactions || [],
      images: post.images || [],
      postId: post._id.toString(),
      userAvatar: '/default-avatar.png',
      comments: [],
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/posts: Подробная ошибка:', errorMessage, error);
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка создания поста', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.time('PUT /api/posts/[id]: Total');
  console.log('PUT /api/posts/[id]: Запрос получен, id:', params.id);
  try {
    await connectToDB();
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

    console.log('PUT /api/posts/[id]: Параметры:', { userId, content });

    const post = await Post.findOne({ _id: params.id, userId });
    if (!post) {
      console.log('PUT /api/posts/[id]: Пост не найден или не принадлежит пользователю');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    post.content = content;
    if (images) post.images = images;
    post.updatedAt = new Date();
    await post.save();

    console.log('PUT /api/posts/[id]: Пост обновлен:', post);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json({
      username: 'Unknown User',
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      userId: post.userId,
      likes: post.likes || [],
      reactions: post.reactions || [],
      images: post.images || [],
      postId: post._id.toString(),
      userAvatar: '/default-avatar.png',
      comments: post.comments || [],
    }, { status: 200 });
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