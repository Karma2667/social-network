import { NextResponse } from 'next/server';
import mongoose, { Schema, Types, Document } from 'mongoose';
import { connectToDB } from '@/app/lib/mongoDB';
import Post, { PostDocument } from '@/models/Post';
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
  isCommunityPost?: boolean;
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
  console.log('GET /api/posts: Запрос получен, URL:', request.url);
  try {
    await connectToDB();
    console.log('GET /api/posts: Успешное подключение к MongoDB');

    const userId = request.headers.get('x-user-id');
    console.log('GET /api/posts: Получен userId из заголовка:', userId);
    if (!userId) {
      console.log('GET /api/posts: Отсутствует заголовок x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    let postsQuery = Post.find().sort({ createdAt: -1 }).lean();
    console.log('GET /api/posts: Инициализирован базовый запрос к коллекции Post');

    postsQuery = postsQuery.populate({
      path: 'userId',
      model: 'User',
      select: 'username userAvatar',
    });
    console.log('GET /api/posts: Установлена популяция для userId');

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
      console.log('GET /api/posts: Установлена популяция для комментариев');
    } else {
      console.log('GET /api/posts: Модель Comment не найдена, популяция комментариев пропущена');
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
        console.error('GET /api/posts: Некорректный communityId:', communityId, 'Ошибка:', e);
        return NextResponse.json({ message: 'Посты не найдены' }, { status: 200 });
      }
    } else {
      console.log('GET /api/posts: Фильтрация по communityId не применена');
    }

    const posts: any[] = await postsQuery;
    console.log('GET /api/posts: Получено записей из базы:', posts.length);

    if (!posts || posts.length === 0) {
      console.log('GET /api/posts: Посты не найдены');
      return NextResponse.json({ message: 'Посты не найдены' }, { status: 200 });
    }

    const formattedPosts: PostData[] = await Promise.all(posts.map(async (post: any) => {
      console.log('GET /api/posts: Форматирование поста с _id:', post._id);
      const userData = post.isCommunityPost && post.community
        ? { 
            _id: '', 
            username: (await mongoose.model('Community').findById(post.community).select('name'))?.name || 'Community', 
            userAvatar: '/community-avatar.png' 
          }
        : post.userId
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
        isCommunityPost: post.isCommunityPost || false,
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
        likes: post.likes || [],
        reactions: post.reactions || [],
        images: post.images || [],
        comments,
      };
    }));

    console.log('GET /api/posts: Форматированные посты:', formattedPosts);
    console.timeEnd('GET /api/posts: Total');
    return NextResponse.json(formattedPosts, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/posts: Ошибка на этапе выполнения:', errorMessage, 'Полная ошибка:', error);
    console.timeEnd('GET /api/posts: Total');
    return NextResponse.json({ error: 'Ошибка загрузки постов', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/posts: Total');
  console.log('POST /api/posts: Запрос получен, метод:', request.method, 'URL:', request.url);
  try {
    await connectToDB();
    console.log('POST /api/posts: Успешное подключение к MongoDB');

    const userId = request.headers.get('x-user-id');
    console.log('POST /api/posts: Получен userId из заголовка:', userId);
    if (!userId) {
      console.log('POST /api/posts: Отсутствует заголовок x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const formData = await request.formData();
    console.log('POST /api/posts: Получен formData, содержимое:', Object.fromEntries(formData));

    const content = formData.get('content') as string | null;
    const files = formData.getAll('images') as File[];
    const communityId = formData.get('communityId') as string | null;
    const isCommunityPost = formData.get('isCommunityPost') === 'true';

    console.log('POST /api/posts: Разобранные данные:', { userId, content, communityId, isCommunityPost, filesLength: files.length });

    if (!userId || !content || typeof content !== 'string') {
      console.log('POST /api/posts: Валидация данных провалена: отсутствуют userId или content');
      return NextResponse.json({ error: 'Требуется userId и content' }, { status: 400 });
    }

    let communityObjectId: Types.ObjectId | undefined = undefined;
    if (communityId) {
      try {
        communityObjectId = new Types.ObjectId(communityId);
        console.log('POST /api/posts: Преобразование communityId в ObjectId:', communityObjectId);
        const community = await mongoose.model('Community').findById(communityObjectId);
        if (!community) {
          console.log('POST /api/posts: Сообщество не найдено для communityId:', communityId);
          return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
        }
        if (isCommunityPost && !community.admins.includes(userId)) {
          console.log('POST /api/posts: Пользователь не является модератором для communityId:', communityId);
          return NextResponse.json({ error: 'Только модераторы могут публиковать от лица сообщества' }, { status: 403 });
        }
      } catch (e) {
        console.error('POST /api/posts: Ошибка при проверке communityId:', communityId, 'Ошибка:', e);
        return NextResponse.json({ error: 'Некорректный communityId' }, { status: 400 });
      }
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

    const postData = {
      userId: isCommunityPost ? null : new Types.ObjectId(userId),
      community: communityObjectId,
      isCommunityPost: isCommunityPost,
      content,
      images,
      comments: [],
    };

    console.log('POST /api/posts: Данные для создания поста перед сохранением:', JSON.stringify(postData, null, 2));

    const post = await Post.create(postData);
    console.log('POST /api/posts: Пост успешно создан с _id:', post._id, 'community:', post.community);

    const user = await User.findById(userId).select('username userAvatar');
    const community = communityObjectId ? await mongoose.model('Community').findById(communityObjectId).select('name') : null;

    const responseData: PostData = {
      _id: post._id.toString(),
      content: post.content,
      communityId: communityId || undefined,
      userId: post.isCommunityPost && community
        ? { _id: '', username: community.name || 'Community', userAvatar: '/community-avatar.png' }
        : user
          ? {
              _id: user._id.toString(),
              username: user.username || 'Unknown User',
              userAvatar: user.userAvatar || '/default-avatar.png',
            }
          : { _id: userId, username: 'Unknown User', userAvatar: '/default-avatar.png' },
      isCommunityPost: post.isCommunityPost,
      createdAt: post.createdAt.toISOString(),
      likes: post.likes || [],
      reactions: post.reactions || [],
      images: post.images || [],
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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  console.time('PUT /api/posts/[id]: Total');
  console.log('PUT /api/posts/[id]: Запрос получен, id:', params.id, 'URL:', request.url);
  try {
    await connectToDB();
    console.log('PUT /api/posts/[id]: Успешное подключение к MongoDB');

    const userId = request.headers.get('x-user-id');
    console.log('PUT /api/posts/[id]: Получен userId из заголовка:', userId);
    if (!userId) {
      console.log('PUT /api/posts/[id]: Отсутствует заголовок x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const { content, images } = await request.json();
    console.log('PUT /api/posts/[id]: Полученные данные из тела запроса:', { content, images });

    if (!content || typeof content !== 'string') {
      console.log('PUT /api/posts/[id]: Валидация данных провалена: отсутствует content');
      return NextResponse.json({ error: 'Требуется content' }, { status: 400 });
    }

    const post = await Post.findById(params.id).lean() as Partial<PostDocument> | null;
    console.log('PUT /api/posts/[id]: Результат поиска поста:', { postId: params.id, postExists: !!post, post });
    if (!post) {
      console.log('PUT /api/posts/[id]: Пост не найден для id:', params.id);
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const isAuthor = post.userId?.toString() === userId;
    let isCommunityAdmin = false;
    if (post.community) {
      const community = await mongoose.model('Community').findById(post.community).select('creator admins');
      console.log('PUT /api/posts/[id]: Проверка прав сообщества:', { communityId: post.community, creator: community?.creator, admins: community?.admins });
      const isCreator = community?.creator?.toString() === userId;
      isCommunityAdmin = isCreator || community?.admins.includes(userId) || false;
    }

    if (!isAuthor && !isCommunityAdmin) {
      console.log('PUT /api/posts/[id]: Недостаточно прав для редактирования поста, userId:', userId);
      return NextResponse.json({ error: 'Недостаточно прав для редактирования поста' }, { status: 403 });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      params.id,
      { content, images, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('userId', 'username userAvatar');

    const responseData: PostData = {
      _id: updatedPost._id.toString(),
      content: updatedPost.content,
      userId: updatedPost.isCommunityPost && updatedPost.community
        ? { _id: '', username: (await mongoose.model('Community').findById(updatedPost.community).select('name'))?.name || 'Community', userAvatar: '/community-avatar.png' }
        : updatedPost.userId
          ? {
              _id: updatedPost.userId._id.toString(),
              username: updatedPost.userId.username || 'Unknown User',
              userAvatar: updatedPost.userId.userAvatar || '/default-avatar.png',
            }
          : { _id: '', username: 'Unknown User', userAvatar: '/default-avatar.png' },
      communityId: updatedPost.community ? updatedPost.community.toString() : undefined,
      isCommunityPost: updatedPost.isCommunityPost || false,
      createdAt: updatedPost.createdAt.toISOString(),
      likes: updatedPost.likes || [],
      reactions: updatedPost.reactions || [],
      images: updatedPost.images || [],
      comments: updatedPost.comments || [],
    };

    console.log('PUT /api/posts/[id]: Форматированные данные ответа:', responseData);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/posts/[id]: Ошибка на этапе выполнения:', errorMessage, 'Полная ошибка:', error);
    console.timeEnd('PUT /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Failed to update post', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  console.time('DELETE /api/posts/[id]: Total');
  console.log('DELETE /api/posts/[id]: Запрос получен, id:', params.id, 'URL:', request.url);

  try {
    await connectToDB();
    console.log('DELETE /api/posts/[id]: Успешное подключение к MongoDB');

    const userId = request.headers.get('x-user-id');
    console.log('DELETE /api/posts/[id]: Получен userId из заголовка:', userId);

    if (!userId) {
      console.log('DELETE /api/posts/[id]: Отсутствует заголовок x-user-id');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const post = await Post.findById(params.id).lean() as Partial<PostDocument> | null;
    console.log('DELETE /api/posts/[id]: Результат поиска поста:', { postId: params.id, postExists: !!post, post });

    if (!post) {
      console.log('DELETE /api/posts/[id]: Пост не найден для id:', params.id);
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    const isAuthor = post.userId?.toString() === userId;
    let isCommunityAdmin = false;
    if (post.community) {
      const community = await mongoose.model('Community').findById(post.community).select('creator admins');
      console.log('DELETE /api/posts/[id]: Проверка прав сообщества:', { communityId: post.community, creator: community?.creator, admins: community?.admins });
      const isCreator = community?.creator?.toString() === userId;
      isCommunityAdmin = isCreator || community?.admins.includes(userId) || false;
    }

    console.log('DELETE /api/posts/[id]: Права доступа:', { isAuthor, isCommunityAdmin });

    if (!isAuthor && !isCommunityAdmin) {
      console.log('DELETE /api/posts/[id]: Недостаточно прав для удаления поста, userId:', userId);
      return NextResponse.json({ error: 'Недостаточно прав для удаления поста' }, { status: 403 });
    }

    const deleteResult = await Post.deleteOne({ _id: params.id });
    console.log('DELETE /api/posts/[id]: Результат удаления:', { deletedCount: deleteResult.deletedCount });

    if (deleteResult.deletedCount === 0) {
      console.log('DELETE /api/posts/[id]: Пост не был удален (возможно, уже удален)');
      return NextResponse.json({ error: 'Пост не найден для удаления' }, { status: 404 });
    }

    console.log('DELETE /api/posts/[id]: Пост успешно удалён, id:', params.id);
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ message: 'Пост удалён' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/posts/[id]: Ошибка на этапе выполнения:', errorMessage, 'Полная ошибка:', error);
    console.timeEnd('DELETE /api/posts/[id]: Total');
    return NextResponse.json({ error: 'Failed to delete post', details: errorMessage }, { status: 500 });
  }
}