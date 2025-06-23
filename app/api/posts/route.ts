import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB';
import Post, { PostDocument, LeanPostDocument } from '@/models/Post';
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

interface PopulatedPost {
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const userId = url.searchParams.get('userId');
  const communityId = url.searchParams.get('communityId');
  const isCommunityPost = url.searchParams.get('isCommunityPost') === 'true';

  console.time(`GET ${endpoint}: Total`);
  console.log(`GET ${endpoint}: Запрос получен, URL:`, request.url, `userId:`, userId, `communityId:`, communityId);

  try {
    await connectToDB();
    console.log(`GET ${endpoint}: Успешное подключение к MongoDB`);

    const authUserId = request.headers.get('x-user-id');
    if (!authUserId || !mongoose.Types.ObjectId.isValid(authUserId)) {
      console.log(`GET ${endpoint}: Отсутствует или неверный authUserId`);
      return NextResponse.json({ error: 'Требуется валидный authUserId' }, { status: 400 });
    }

    const query: any = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = userId;
      console.log(`GET ${endpoint}: Фильтрация по userId:`, userId);
    }
    if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
      query.community = communityId;
      query.isCommunityPost = true;
      console.log(`GET ${endpoint}: Фильтрация по communityId:`, communityId);
    }
    if (isCommunityPost !== undefined && !communityId) {
      query.isCommunityPost = isCommunityPost;
      console.log(`GET ${endpoint}: Фильтрация по isCommunityPost:`, isCommunityPost);
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'userId',
        model: User,
        select: 'username avatar _id',
      })
      .populate({
        path: 'community',
        model: Community,
        select: 'name avatar _id',
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
      .lean() as unknown as PopulatedPost[];

    console.log(`GET ${endpoint}: Получено записей из базы:`, posts.length);

    if (!posts || posts.length === 0) {
      console.log(`GET ${endpoint}: Посты не найдены`);
      return NextResponse.json([], { status: 200 });
    }

    const formattedPosts: PostData[] = posts.map((post) => {
      console.log(`GET ${endpoint}: Форматирование поста с _id:`, post._id);
      if (post.isCommunityPost && !post.community) {
        console.warn(`GET ${endpoint}: Community not found for post: ${post._id}`);
      }
      const userData: UserData = post.isCommunityPost && post.community
        ? {
            _id: post.community._id.toString(),
            username: post.community.name || 'Unknown Community',
            avatar: post.community.avatar || '/default-community-avatar.png',
          }
        : post.userId
        ? {
            _id: post.userId._id.toString(),
            username: post.userId.username || 'Unknown User',
            avatar: post.userId.avatar || '/default-avatar.png',
          }
        : { _id: '', username: 'Unknown User', avatar: '/default-avatar.png' };

      const comments: CommentData[] = (post.comments || []).map((comment) => ({
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
        likes: (comment.likes || []).map((id: any) => id.toString()),
        reactions: (comment.reactions || []).map((r: any) => ({
          emoji: r.emoji,
          users: r.users.map((id: any) => id.toString()),
        })),
      }));

      return {
        _id: post._id.toString(),
        content: post.content || '',
        communityId: post.community?._id.toString(),
        userId: userData,
        isCommunityPost: post.isCommunityPost || false,
        createdAt: new Date(post.createdAt).toISOString(),
        likes: (post.likes || []).map((id: any) => id.toString()),
        reactions: (post.reactions || []).map((r: any) => ({
          emoji: r.emoji,
          users: r.users.map((id: any) => id.toString()),
        })),
        images: post.images || [],
        comments,
      };
    });

    console.log(`GET ${endpoint}: Форматированные посты:`, formattedPosts.length);
    console.timeEnd(`GET ${endpoint}: Total`);
    return NextResponse.json(formattedPosts, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`GET ${endpoint}: Ошибка на этапе выполнения:`, errorMessage, 'Полная ошибка:', error);
    console.timeEnd(`GET ${endpoint}: Total`);
    return NextResponse.json({ error: 'Ошибка загрузки постов', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/posts: Total');
  console.log('POST /api/posts: Запрос получен, URL:', request.url);

  try {
    await connectToDB();
    console.log('POST /api/posts: Успешное подключение к MongoDB');

    const userId = request.headers.get('x-user-id');
    console.log('POST /api/posts: Получен userId из заголовка:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('POST /api/posts: Отсутствует или неверный userId');
      return NextResponse.json({ error: 'Требуется валидный userId' }, { status: 400 });
    }

    const formData = await request.formData();
    const content = formData.get('content')?.toString();
    const files = formData.getAll('images') as File[];
    const isCommunityPost = formData.get('isCommunityPost') === 'true';
    const communityId = formData.get('communityId')?.toString();

    console.log('POST /api/posts: Полученные данные:', { userId, content, isCommunityPost, communityId, filesLength: files.length });

    if (!content?.trim()) {
      console.log('POST /api/posts: Валидация данных провалена: отсутствует content');
      return NextResponse.json({ error: 'Требуется содержимое поста' }, { status: 400 });
    }

    if (isCommunityPost && !communityId) {
      console.log('POST /api/posts: Требуется communityId для поста сообщества');
      return NextResponse.json({ error: 'Требуется communityId для поста сообщества' }, { status: 400 });
    }

    let images: string[] = [];
    if (files.length > 0) {
      console.log('POST /api/posts: Начало обработки файлов, количество:', files.length);
      const uploadFormData = new FormData();
      files.forEach((file, index) => {
        uploadFormData.append('files', file);
        console.log(`POST /api/posts: Добавлен файл ${index + 1}:`, file.name);
      });
      const uploadRes = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        console.error('POST /api/posts: Ошибка загрузки изображений:', errorData);
        throw new Error(`Не удалось загрузить изображения: ${errorData.error || 'Неизвестная ошибка'}`);
      }
      images = (await uploadRes.json()).files;
      console.log('POST /api/posts: Изображения успешно загружены:', images);
    }

    if (isCommunityPost && communityId && !mongoose.Types.ObjectId.isValid(communityId)) {
      console.log('POST /api/posts: Неверный формат communityId:', communityId);
      return NextResponse.json({ error: 'Неверный формат communityId' }, { status: 400 });
    }

    let community: CommunityDocument | null = null;
    if (isCommunityPost && communityId) {
      const communityResult = await Community.findById(communityId).select('admins name avatar creator').lean() as CommunityDocument | null;
      community = communityResult;
      if (!community) {
        console.log('POST /api/posts: Сообщество не найдено:', communityId);
        return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
      }
      if (!community.admins.includes(userId) && community.creator.toString() !== userId) {
        console.log('POST /api/posts: Недостаточно прав для создания поста сообщества');
        return NextResponse.json({ error: 'Создание постов сообщества доступно только администраторам или создателю' }, { status: 403 });
      }
    }

    const postData = {
      userId: new Types.ObjectId(userId),
      content,
      images,
      comments: [],
      isCommunityPost: isCommunityPost || false,
      ...(communityId && mongoose.Types.ObjectId.isValid(communityId) && { community: new Types.ObjectId(communityId) }),
    };

    console.log('POST /api/posts: Данные для создания поста:', JSON.stringify(postData, null, 2));
    const post = await Post.create(postData);
    console.log('POST /api/posts: Пост успешно создан с _id:', post._id);

    const populatedPost = await Post.findById(post._id)
      .populate('userId', 'username avatar _id')
      .populate('community', 'name avatar _id')
      .lean() as unknown as PopulatedPost;

    if (!populatedPost) {
      console.log('POST /api/posts: Пост не найден после создания:', post._id);
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const user = await User.findById(userId).select('username avatar').lean() as { username: string; avatar?: string } | null;
    const responseData: PostData = {
      _id: populatedPost._id.toString(),
      content: populatedPost.content,
      userId: isCommunityPost && populatedPost.community
        ? {
            _id: populatedPost.community._id.toString(),
            username: populatedPost.community.name || 'Unknown Community',
            avatar: populatedPost.community.avatar || '/default-community-avatar.png',
          }
        : populatedPost.userId
        ? {
            _id: populatedPost.userId._id.toString(),
            username: populatedPost.userId.username || 'Unknown User',
            avatar: populatedPost.userId.avatar || '/default-avatar.png',
          }
        : user
        ? {
            _id: userId,
            username: user.username || 'Unknown User',
            avatar: user.avatar || '/default-avatar.png',
          }
        : { _id: userId, username: 'Unknown User', avatar: '/default-avatar.png' },
      communityId: populatedPost.community?._id.toString(),
      isCommunityPost: populatedPost.isCommunityPost || false,
      createdAt: new Date(populatedPost.createdAt).toISOString(),
      likes: (populatedPost.likes || []).map((id: any) => id.toString()),
      reactions: (populatedPost.reactions || []).map((r: any) => ({
        emoji: r.emoji,
        users: r.users.map((id: any) => id.toString()),
      })),
      images: populatedPost.images || [],
      comments: [],
    };

    console.log('POST /api/posts: Форматированные данные ответа:', JSON.stringify(responseData, null, 2));
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json(responseData, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/posts: Ошибка на этапе выполнения:', errorMessage, 'Полная ошибка:', error);
    console.timeEnd('POST /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка создания поста', details: errorMessage }, { status: 500 });
  }
}