import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import User from '@/models/User';
import { Types } from 'mongoose'; // Импортируем Types для ObjectId

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
      likes: [],
      reactions: [],
    });

    const post = await Post.findById(postId);
    if (post) {
      post.comments.push(newComment._id);
      await post.save();
    }

    const user = await User.findById(userId).select('username avatar');
    if (!user) throw new Error('Пользователь не найден');

    const responseData = {
      _id: newComment._id.toString(),
      userId: { 
        _id: userId, 
        username: user.username, 
        avatar: user.avatar || '/default-avatar.png' 
      },
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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.time('PUT /api/comments: Total');
  console.log('PUT /api/comments: Запрос получен для комментария:', params.id);
  try {
    await connectToDB();
    const userId = request.headers.get('x-user-id');
    const { content, images } = await request.json();

    if (!userId || !content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Требуется userId и content' }, { status: 400 });
    }

    const comment = await Comment.findById(params.id);
    if (!comment || comment.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Комментарий не найден или доступ запрещен' }, { status: 403 });
    }

    comment.content = content;
    if (images) comment.images = images;
    await comment.save();

    const user = await User.findById(userId).select('username avatar');
    if (!user) throw new Error('Пользователь не найден');

    const responseData = {
      _id: comment._id.toString(),
      userId: { 
        _id: userId, 
        username: user.username, 
        avatar: user.avatar || '/default-avatar.png' 
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      likes: comment.likes || [],
      reactions: comment.reactions || [],
      images: comment.images || [],
    };

    console.log('PUT /api/comments: Комментарий обновлен:', responseData);
    console.timeEnd('PUT /api/comments: Total');
    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/comments: Ошибка:', errorMessage, error);
    console.timeEnd('PUT /api/comments: Total');
    return NextResponse.json({ error: 'Ошибка обновления комментария', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  console.time('DELETE /api/comments: Total');
  console.log('DELETE /api/comments: Запрос получен для комментария:', params.id);
  try {
    await connectToDB();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const comment = await Comment.findById(params.id);
    if (!comment || comment.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Комментарий не найден или доступ запрещен' }, { status: 403 });
    }

    const post = await Post.findById(comment.postId);
    if (post) {
      post.comments = post.comments.filter((cid: Types.ObjectId | string) => cid.toString() !== params.id); // Явно типизируем cid
      await post.save();
    }

    await comment.remove();

    console.log('DELETE /api/comments: Комментарий удален:', params.id);
    console.timeEnd('DELETE /api/comments: Total');
    return NextResponse.json({ message: 'Комментарий удален' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/comments: Ошибка:', errorMessage, error);
    console.timeEnd('DELETE /api/comments: Total');
    return NextResponse.json({ error: 'Ошибка удаления комментария', details: errorMessage }, { status: 500 });
  }
}