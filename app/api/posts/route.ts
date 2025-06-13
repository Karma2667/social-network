import { NextResponse } from 'next/server';
import mongoose, { Schema, Types, Document } from 'mongoose';
import dbConnect from '@/app/lib/mongoDB';
import Post from '@/models/Post';
import User from '@/models/User';

interface UserData {
  _id: string;
  username: string;
  userAvatar?: string;
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
  communityId?: string;
  userId: UserData;
  createdAt: string;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: CommentData[];
}

interface IComment extends Document {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  content: string;
  createdAt: Date;
  likes?: Types.ObjectId[];
  reactions?: { emoji: string; users: Types.ObjectId[] }[];
  images?: string[];
}

const CommentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{ emoji: String, users: [{ type: Schema.Types.ObjectId, ref: 'User' }] }],
  images: [String],
});

const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

export async function GET(request: Request) {
  console.time('GET /api/posts: Total');
  console.log('GET /api/posts: Запрос получен');
  try {
    await dbConnect();
    console.log('GET /api/posts: MongoDB подключен');

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      console.log('GET /api/posts: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    let postsQuery = Post.find().sort({ createdAt: -1 }).lean();

    postsQuery = postsQuery.populate({
      path: 'userId',
      model: 'User',
      select: 'username userAvatar',
    });

    if (mongoose.models.Comment) {
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
    }

    const url = new URL(request.url);
    const communityId = url.searchParams.get('communityId');
    if (communityId) {
      console.log('GET /api/posts: Фильтрация по communityId:', communityId);
      try {
        const objId = new Types.ObjectId(communityId);
        postsQuery = postsQuery.where('community').equals(objId);
        const postCount = await Post.countDocuments({ community: objId });
        console.log('GET /api/posts: Количество постов для communityId:', postCount);
        if (postCount === 0) {
          console.log('GET /api/posts: Нет постов для communityId, проверка всех записей:', await Post.find().lean());
        }
      } catch (e) {
        console.error('GET /api/posts: Некорректный communityId:', communityId, e);
        return NextResponse.json({ message: 'Посты не найдены' }, { status: 200 });
      }
    }

    const posts: any[] = await postsQuery;

    if (!posts || posts.length === 0) {
      console.log('GET /api/posts: Посты не найдены');
      return NextResponse.json({ message: 'Посты не найдены' }, { status: 200 });
    }

    const formattedPosts: PostData[] = posts.map((post: any) => {
      const userData = post.userId
        ? {
            _id: post.userId._id.toString(),
            username: post.userId.username || 'Unknown User',
            userAvatar: post.userId.userAvatar || '/default-avatar.png',
          }
        : { _id: '', username: 'Unknown User', userAvatar: '/default-avatar.png' };

      const comments: CommentData[] = Array.isArray(post.comments)
        ? post.comments.map((comment: any) => ({
            _id: comment._id ? comment._id.toString() : '',
            userId: comment.userId
              ? {
                  _id: comment.userId._id.toString(),
                  username: comment.userId.username || 'Unknown User',
                }
              : { _id: '', username: 'Unknown User' },
            content: comment.content || '',
            createdAt: comment.createdAt ? new Date(comment.createdAt).toISOString() : new Date().toISOString(),
            images: comment.images || [],
            likes: comment.likes?.map((id: Types.ObjectId) => id.toString()) || [],
            reactions: comment.reactions || [],
          }))
        : [];

      return {
        _id: post._id.toString(),
        content: post.content || '',
        communityId: post.community ? post.community.toString() : undefined,
        userId: userData,
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
        likes: post.likes || [],
        reactions: post.reactions || [],
        images: post.images || [],
        comments,
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
    const content = formData.get('content') as string | null;
    const files = formData.getAll('images') as File[];
    const communityId = formData.get('communityId') as string | null;

    if (!userId || !content || typeof content !== 'string') {
      console.log('POST /api/posts: Отсутствуют userId или content');
      return NextResponse.json({ error: 'Требуется userId и content' }, { status: 400 });
    }

    let communityObjectId: Types.ObjectId | undefined = undefined;
    if (communityId) {
      try {
        communityObjectId = new Types.ObjectId(communityId);
        console.log('POST /api/posts: Проверка formData.get("communityId"):', communityId, 'преобразовано в:', communityObjectId);
      } catch (e) {
        console.error('POST /api/posts: Некорректный communityId:', communityId, e);
      }
    }

    let images: string[] = [];
    if (files.length > 0) {
      const uploadFormData = new FormData();
      files.forEach((file) => uploadFormData.append('files', file));
      const uploadRes = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'Не удалось загрузить изображения');
      }
      images = (await uploadRes.json()).files;
      console.log('POST /api/posts: Изображения загружены:', images);
    }

    const postData = {
      userId: new Types.ObjectId(userId),
      community: communityObjectId, // Явно передаём преобразованный ObjectId или undefined
      content,
      images,
      comments: [],
    };

    console.log('POST /api/posts: Данные для создания поста перед сохранением:', JSON.stringify(postData, null, 2));
    const post = await Post.create(postData);
    console.log('POST /api/posts: Создан пост с _id:', post._id, 'community:', post.community);

    const user = await User.findById(userId).select('username userAvatar');
    const responseData: PostData = {
      _id: post._id.toString(),
      content: post.content,
      communityId: communityId || undefined,
      userId: user
        ? {
            _id: user._id.toString(),
            username: user.username || 'Unknown User',
            userAvatar: user.userAvatar || '/default-avatar.png',
          }
        : { _id: userId, username: 'Unknown User', userAvatar: '/default-avatar.png' },
      createdAt: post.createdAt.toISOString(),
      likes: post.likes || [],
      reactions: post.reactions || [],
      images: post.images || [],
      comments: [],
    };

    console.log('POST /api/posts: Пост создан:', JSON.stringify(responseData, null, 2));
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json(responseData, { status: 201 });
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
      console.log('PUT /api/posts/[id]: Отсутствуют userId или content');
      return NextResponse.json({ error: 'Требуется userId и content' }, { status: 400 });
    }

    const post = await Post.findOne({ _id: params.id, userId }).populate('userId', 'username userAvatar');
    if (!post) {
      console.log('PUT /api/posts/[id]: Пост не найден для userId:', userId, 'и id:', params.id);
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    post.content = content;
    if (images) post.images = images;
    post.updatedAt = new Date();
    await post.save();

    const responseData: PostData = {
      _id: post._id.toString(),
      content: post.content,
      userId: {
        _id: post.userId._id.toString(),
        username: post.userId.username || 'Unknown User',
        userAvatar: post.userId.userAvatar || '/default-avatar.png',
      },
      communityId: post.community ? post.community.toString() : undefined,
      createdAt: post.createdAt.toISOString(),
      likes: post.likes || [],
      reactions: post.reactions || [],
      images: post.images || [],
      comments: post.comments || [],
    };

    console.log('PUT /api/posts/[id]: Пост обновлён:', responseData);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json(responseData, { status: 200 });
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

    if (!userId) {
      console.log('DELETE /api/posts/[id]: Отсутствует x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const post = await Post.findOne({ _id: params.id, userId });
    if (!post) {
      console.log('DELETE /api/posts/[id]: Пост не найден для userId:', userId, 'и id:', params.id);
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    await Post.deleteOne({ _id: params.id, userId });
    console.log('DELETE /api/posts/[id]: Пост удалён');
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ message: 'Пост удалён' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/posts/[id]: Ошибка:', errorMessage, error);
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Failed to delete post', details: errorMessage }, { status: 500 });
  }
}