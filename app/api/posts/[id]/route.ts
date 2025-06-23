import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB';
import Post, { LeanPostDocument, PopulatedPost } from '@/models/Post';
import Comment from '@/models/Comment';
import User from '@/models/User';
import Community from '@/models/Community';
import mongoose, { Types, Document } from 'mongoose';

interface CommunityDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  avatar?: string;
  admins: string[];
  creator: Types.ObjectId;
}

interface UserData {
  _id: string;
  username: string;
  avatar?: string;
}

interface CommentData {
  _id: string;
  userId: UserData;
  content: string;
  createdAt: string;
  images?: string[];
  likes?: string[];
  reactions?: { emoji: string; users: string[] }[];
}

interface PostData {
  _id: string;
  content: string;
  userId: UserData;
  communityId?: string;
  isCommunityPost?: boolean;
  createdAt: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: CommentData[];
}

// Промежуточный тип для результата .lean()
interface LeanPopulatedPost {
  _id: string;
  content: string;
  userId: { _id: string; username: string; avatar?: string } | null;
  community: { _id: string; name: string; avatar?: string } | null;
  isCommunityPost: boolean;
  createdAt: Date;
  updatedAt?: Date;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: {
    _id: string;
    userId: { _id: string; username: string; avatar?: string } | null;
    content: string;
    createdAt: Date;
    images?: string[];
    likes?: string[];
    reactions?: { emoji: string; users: string[] }[];
  }[];
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  console.time('PUT /api/posts/[id]: Total');
  const { id } = await context.params;
  console.log('PUT /api/posts/[id]: Запрос получен, id:', id);

  try {
    await connectToDB();
    console.log('PUT /api/posts/[id]: Успешное подключение к MongoDB');

    const userId = req.headers.get('x-user-id');
    console.log('PUT /api/posts/[id]: Получен userId из заголовка:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('PUT /api/posts/[id]: Отсутствует или неверный userId');
      return NextResponse.json({ error: 'Требуется валидный userId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('PUT /api/posts/[id]: Неверный формат postId:', id);
      return NextResponse.json({ error: 'Неверный формат postId' }, { status: 400 });
    }

    const formData = await req.formData();
    const content = formData.get('content')?.toString();
    const files = formData.getAll('images') as File[];

    console.log('PUT /api/posts/[id]: Полученные данные:', { content, postId: id, filesLength: files.length });

    if (!content?.trim()) {
      console.log('PUT /api/posts/[id]: Валидация данных провалена: отсутствует content');
      return NextResponse.json({ error: 'Требуется содержимое поста' }, { status: 400 });
    }

    const post = await Post.findById(id).lean() as LeanPostDocument | null;
    console.log('PUT /api/posts/[id]: Результат поиска поста:', { postId: id, postExists: !!post });

    if (!post) {
      console.log('PUT /api/posts/[id]: Пост не найден для id:', id);
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const isAuthor = typeof post.userId === 'object' && post.userId?._id.toString() === userId;
    let isCommunityAdmin = false;
    if (post.community && mongoose.Types.ObjectId.isValid(post.community)) {
      const community = await Community.findById(post.community).select('creator admins').lean() as CommunityDocument | null;
      console.log('PUT /api/posts/[id]: Проверка прав сообщества:', { communityId: post.community, creator: community?.creator, admins: community?.admins });
      const isCreator = community?.creator?.toString() === userId;
      isCommunityAdmin = isCreator || (community?.admins?.includes(userId) || false);
    }

    if (!isAuthor && !isCommunityAdmin) {
      console.log('PUT /api/posts/[id]: Недостаточно прав для редактирования поста, userId:', id);
      return NextResponse.json({ error: 'Недостаточно прав для редактирования поста' }, { status: 403 });
    }

    let images: string[] = [];
    if (files.length > 0) {
      console.log('PUT /api/posts/[id]: Начало обработки файлов, количество:', files.length);
      const uploadFormData = new FormData();
      files.forEach((file, index) => {
        uploadFormData.append('files', file);
        console.log(`PUT /api/posts/[id]: Добавлен файл ${index + 1}:`, file.name);
      });
      const uploadRes = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        console.error('PUT /api/posts/[id]: Ошибка загрузки изображений:', errorData);
        throw new Error(`Не удалось загрузить изображения: ${errorData.error || 'Неизвестная ошибка'}`);
      }
      images = (await uploadRes.json()).files;
      console.log('PUT /api/posts/[id]: Изображения успешно загружены:', images);
    }

    const updatedPostRaw = await Post.findByIdAndUpdate(
      id,
      { content, images, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate({
        path: 'userId',
        model: User,
        select: 'username _id avatar',
      })
      .populate({
        path: 'community',
        model: Community,
        select: 'name _id avatar',
      })
      .populate({
        path: 'comments',
        model: Comment,
        populate: {
          path: 'userId',
          model: User,
          select: 'username _id avatar',
        },
      })
      .lean() as LeanPopulatedPost | null;

    if (!updatedPostRaw) {
      console.log('PUT /api/posts/[id]: Пост не найден после обновления:', id);
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    // Проверка соответствия PopulatedPost
    const updatedPost: PopulatedPost = {
      _id: updatedPostRaw._id,
      content: updatedPostRaw.content,
      userId: updatedPostRaw.userId,
      community: updatedPostRaw.community,
      isCommunityPost: updatedPostRaw.isCommunityPost,
      createdAt: updatedPostRaw.createdAt,
      updatedAt: updatedPostRaw.updatedAt,
      likes: updatedPostRaw.likes,
      reactions: updatedPostRaw.reactions,
      images: updatedPostRaw.images,
      comments: updatedPostRaw.comments,
    };

    const formattedPost: PostData = {
      _id: updatedPost._id.toString(),
      content: updatedPost.content || '',
      userId: updatedPost.isCommunityPost && updatedPost.community
        ? {
            _id: updatedPost.community._id.toString(),
            username: updatedPost.community.name || 'Unknown Community',
            avatar: updatedPost.community.avatar || '/default-community-avatar.png',
          }
        : updatedPost.userId
        ? {
            _id: updatedPost.userId._id.toString(),
            username: updatedPost.userId.username || 'Unknown User',
            avatar: updatedPost.userId.avatar || '/default-avatar.png',
          }
        : { _id: '', username: 'Unknown User', avatar: '/default-avatar.png' },
      communityId: updatedPost.community?._id.toString(),
      isCommunityPost: updatedPost.isCommunityPost || false,
      createdAt: new Date(updatedPost.createdAt).toISOString(),
      likes: (updatedPost.likes || []).map((id) => id.toString()),
      reactions: (updatedPost.reactions || []).map((r) => ({
        emoji: r.emoji,
        users: r.users.map((id) => id.toString()),
      })),
      images: updatedPost.images || [],
      comments: (updatedPost.comments || []).map((comment) => ({
        _id: comment._id.toString(),
        userId: comment.userId
          ? {
              _id: comment.userId._id.toString(),
              username: comment.userId.username || 'Unknown User',
              avatar: comment.userId.avatar || '/default-avatar.png',
            }
          : { _id: '', username: 'Unknown User', avatar: '/default-avatar.png' },
        content: comment.content || '',
        createdAt: new Date(comment.createdAt).toISOString(),
        images: comment.images || [],
        likes: (comment.likes || []).map((id) => id.toString()),
        reactions: (comment.reactions || []).map((r) => ({
          emoji: r.emoji,
          users: r.users.map((id) => id.toString()),
        })),
      })),
    };

    console.log('PUT /api/posts/[id]: Форматированные данные ответа:', JSON.stringify(formattedPost, null, 2));
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json(formattedPost, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/posts/[id]: Ошибка на этапе выполнения:', errorMessage, 'Полная ошибка:', error);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Ошибка обновления поста', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  console.time('DELETE /api/posts/[id]: Total');
  const { id } = await context.params;
  console.log('DELETE /api/posts/[id]: Запрос получен, id:', id);

  try {
    await connectToDB();
    console.log('DELETE /api/posts/[id]: Успешное подключение к MongoDB');

    const userId = req.headers.get('x-user-id');
    console.log('DELETE /api/posts/[id]: Получен userId из заголовка:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('DELETE /api/posts/[id]: Отсутствует или неверный userId');
      return NextResponse.json({ error: 'Требуется валидный userId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('DELETE /api/posts/[id]: Неверный формат ObjectId:', id);
      return NextResponse.json({ error: 'Неверный формат идентификатора поста' }, { status: 400 });
    }

    const post = await Post.findById(id).lean() as LeanPostDocument | null;
    if (!post) {
      console.log('DELETE /api/posts/[id]: Пост не найден');
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const isAuthor = post.userId && typeof post.userId === 'object' && post.userId._id.toString() === userId;
    let isCommunityAdmin = false;
    if (post.community && mongoose.Types.ObjectId.isValid(post.community)) {
      const community = await Community.findById(post.community).select('creator admins').lean() as CommunityDocument | null;
      console.log('DELETE /api/posts/[id]: Проверка прав сообщества:', { communityId: post.community, creator: community?.creator, admins: community?.admins });
      const isCreator = community?.creator?.toString() === userId;
      isCommunityAdmin = isCreator || (community?.admins?.includes(userId) || false);
    }

    if (!isAuthor && !isCommunityAdmin) {
      console.log('DELETE /api/posts/[id]: У пользователя нет прав на удаление');
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const deletePostResult = await Post.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    if (deletePostResult.deletedCount === 0) {
      console.log('DELETE /api/posts/[id]: Пост не найден для удаления');
      return NextResponse.json({ error: 'Пост не найден для удаления' }, { status: 404 });
    }

    await Comment.deleteMany({ _id: { $in: post.comments || [] } });

    console.log('DELETE /api/posts/[id]: Пост и комментарии удалены');
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ message: 'Пост удалён' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/posts/[id]: Ошибка:', errorMessage, error);
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Не удалось удалить пост', details: errorMessage }, { status: 500 });
  }
}