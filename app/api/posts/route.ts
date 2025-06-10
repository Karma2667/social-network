import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/mongoDB';
import Post from '@/models/Post';
import User from '@/models/User';

export async function GET(request: Request) {
  console.time('GET /api/posts: Total');
  console.log('GET /api/posts: Запрос получен');
  try {
    const mongoose = await dbConnect();
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

    let postsQuery = Post.find().sort({ createdAt: -1 }).lean();
    console.log('GET /api/posts: Построен запрос к базе данных');

    // Популяция данных пользователя
    postsQuery = postsQuery.populate({
      path: 'userId',
      model: 'User',
      select: 'username userAvatar',
    });

    if (mongoose.models.Comment) {
      try {
        postsQuery = postsQuery.populate({
          path: 'comments',
          model: 'Comment',
          populate: {
            path: 'userId',
            model: 'User',
            select: 'username',
          },
        });
        console.log('GET /api/posts: Популяция комментариев выполнена');
      } catch (populateError: unknown) {
        console.warn('GET /api/posts: Ошибка при популяции комментариев:', populateError);
      }
    } else {
      console.warn('GET /api/posts: Модель Comment не зарегистрирована, пропускаем populate');
    }

    const posts: any[] = await postsQuery;

    if (!posts || posts.length === 0) {
      console.log('GET /api/posts: Посты не найдены');
      return NextResponse.json({ message: 'Посты не найдены' }, { status: 200 });
    }

    const formattedPosts = posts.map((post: any) => {
      console.log('GET /api/posts: Обработка поста:', post._id, 'Комментарии:', post.comments);
      return {
        username: post.userId?.username || 'Unknown User',
        content: post.content || '',
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
        userId: post.userId ? post.userId._id.toString() : '',
        likes: post.likes || [],
        reactions: post.reactions || [],
        images: post.images || [],
        postId: post._id.toString(),
        userAvatar: post.userId?.userAvatar || '/default-avatar.png',
        comments: Array.isArray(post.comments)
          ? post.comments.map((comment: any) => {
              console.log('GET /api/posts: Обработка комментария:', comment._id, 'createdAt:', comment.createdAt);
              let commentCreatedAt = comment.createdAt;
              if (commentCreatedAt) {
                if (typeof commentCreatedAt === 'string') {
                  commentCreatedAt = new Date(commentCreatedAt);
                } else if (!(commentCreatedAt instanceof Date)) {
                  commentCreatedAt = new Date();
                  console.warn('GET /api/posts: createdAt не является Date, установлен текущий timestamp:', comment._id);
                }
              } else {
                commentCreatedAt = new Date();
                console.warn('GET /api/posts: createdAt отсутствует, установлен текущий timestamp:', comment._id);
              }
              return {
                _id: comment._id ? comment._id.toString() : '',
                userId: comment.userId
                  ? { _id: comment.userId._id.toString(), username: comment.userId.username || 'Unknown User' }
                  : { _id: '', username: 'Unknown User' },
                content: comment.content || '',
                createdAt: commentCreatedAt.toISOString(),
                images: comment.images || [],
                likes: comment.likes || [],
                reactions: comment.reactions || [],
              };
            })
          : [],
      };
    });

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
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const files = formData.getAll('images') as File[];

    if (!userId || !content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Требуется userId и content' }, { status: 400 });
    }

    let images: string[] = [];
    if (files.length > 0) {
      const uploadFormData = new FormData();
      files.forEach((file) => uploadFormData.append('files', file));
      const uploadRes = await fetch('http://localhost:3000/api/upload', { method: 'POST', body: uploadFormData });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Не удалось загрузить изображения');
      images = (await uploadRes.json()).files;
    }

    const user = await User.findById(userId).select('username userAvatar');
    const post = await Post.create({ userId, content, images, comments: [] });
    return NextResponse.json({
      username: user?.username || 'Unknown User',
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      userId: post.userId.toString(),
      likes: post.likes || [],
      reactions: post.reactions || [],
      images: post.images || [],
      postId: post._id.toString(),
      userAvatar: user?.userAvatar || '/default-avatar.png',
      comments: [],
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/posts: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка создания поста', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.time('PUT /api/posts/[id]: Total');
  console.log('PUT /api/posts/[id]: Запрос получен, id:', params.id);
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { content, images } = await request.json();

    if (!userId || !content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Требуется userId и content' }, { status: 400 });
    }

    const post = await Post.findOne({ _id: params.id, userId }).populate('userId', 'username userAvatar');
    if (!post) return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });

    post.content = content;
    if (images) post.images = images;
    post.updatedAt = new Date();
    await post.save();

    return NextResponse.json({
      username: post.userId?.username || 'Unknown User',
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      userId: post.userId._id.toString(),
      likes: post.likes || [],
      reactions: post.reactions || [],
      images: post.images || [],
      postId: post._id.toString(),
      userAvatar: post.userId?.userAvatar || '/default-avatar.png',
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
    await dbConnect();
    const userId = request.headers.get('x-user-id');

    if (!userId) return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });

    const post = await Post.findOne({ _id: params.id, userId });
    if (!post) return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });

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