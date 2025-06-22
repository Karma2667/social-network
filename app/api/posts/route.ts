import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB';
import Post, { PostDocument, LeanPostDocument } from '@/models/Post';
import Comment from '@/models/Comment';
import User, { UserDocument } from '@/models/User';
import mongoose, { Types, ObjectId, HydratedDocument } from 'mongoose';

// Обновленный UserDocument с явным указанием _id
interface UserDocumentWithId extends UserDocument {
  _id: Types.ObjectId;
}

// Интерфейсы для данных ответа
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

interface PopulatedPost extends Omit<PostDocument, 'userId' | 'comments'> {
  _id: Types.ObjectId;
  userId: HydratedDocument<UserDocumentWithId> | null;
  comments: HydratedDocument<{
    _id: Types.ObjectId;
    userId: HydratedDocument<UserDocumentWithId> | null;
    content: string;
    createdAt: Date;
    images?: string[];
    likes?: Types.ObjectId[];
    reactions?: { emoji: string; users: Types.ObjectId[] }[];
  }>[];
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

// GET метод для получения постов пользователя
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

    const postsQuery = Post.find({
      userId: new Types.ObjectId(userId),
      isCommunityPost: false,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'userId',
        model: User,
        select: 'username avatar _id',
      })
      .populate({
        path: 'comments',
        model: Comment,
        populate: {
          path: 'userId',
          model: User,
          select: 'username _id avatar',
        },
      });

    console.log('GET /api/posts: Инициализирован запрос к коллекции Post с фильтром по userId и isCommunityPost');
    console.log('GET /api/posts: Установлена популяция для userId и комментариев');

    const posts = await postsQuery as PopulatedPost[];
    console.log('GET /api/posts: Получено записей из базы:', posts.length);

    if (!posts || posts.length === 0) {
      console.log('GET /api/posts: Посты не найдены');
      return NextResponse.json({ message: 'Посты не найдены' }, { status: 200 });
    }

    const formattedPosts: PostData[] = posts.map((post: PopulatedPost) => {
      console.log('GET /api/posts: Форматирование поста с _id:', post._id.toString());
      const userData: UserData = post.userId
        ? {
            _id: post.userId._id.toString(),
            username: post.userId.username || 'Unknown User',
            avatar: post.userId.avatar || undefined,
          }
        : { _id: '', username: 'Unknown User', avatar: undefined };

      const comments: CommentData[] = post.comments.map((comment) => {
        const commentUser = comment.userId;
        return {
          _id: comment._id.toString(),
          userId: commentUser
            ? {
                _id: commentUser._id.toString(),
                username: commentUser.username || 'Unknown User',
                avatar: commentUser.avatar || undefined,
              }
            : { _id: '', username: 'Unknown User', avatar: undefined },
          content: comment.content || '',
          createdAt: new Date(comment.createdAt).toISOString(),
          images: comment.images || [],
          likes: comment.likes?.map((id: Types.ObjectId) => id.toString()) || [],
          reactions: comment.reactions?.map((r: { emoji: string; users: Types.ObjectId[] }) => ({
            emoji: r.emoji,
            users: r.users.map((u: Types.ObjectId) => u.toString()),
          })) || [],
        };
      });

      return {
        _id: post._id.toString(),
        content: post.content || '',
        communityId: post.community?.toString(),
        userId: userData,
        isCommunityPost: post.isCommunityPost || false,
        createdAt: new Date(post.createdAt).toISOString(),
        likes: post.likes.map((id: Types.ObjectId) => id.toString()) || [],
        reactions: post.reactions.map((r: { emoji: string; users: Types.ObjectId[] }) => ({
          emoji: r.emoji,
          users: r.users.map((u: Types.ObjectId) => u.toString()),
        })) || [],
        images: post.images || [],
        comments,
      };
    });

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

// POST метод для создания нового поста
export async function POST(request: Request) {
  console.time('POST /api/posts: Total');
  console.log('POST /api/posts: Запрос получен, URL:', request.url);

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
    const content = formData.get('content') as string | null;
    const files = formData.getAll('images') as File[];
    const isCommunityPost = formData.get('isCommunityPost') === 'true';

    console.log('POST /api/posts: Полученные данные:', { userId, content, isCommunityPost, filesLength: files.length });

    if (!content || typeof content !== 'string') {
      console.log('POST /api/posts: Валидация данных провалена: отсутствуют content');
      return NextResponse.json({ error: 'Требуется content' }, { status: 400 });
    }

    if (isCommunityPost) {
      console.log('POST /api/posts: Создание поста сообщества запрещено для личного профиля');
      return NextResponse.json({ error: 'Создание постов сообщества недоступно на этой странице' }, { status: 403 });
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
      userId: new Types.ObjectId(userId),
      content,
      images,
      comments: [],
      isCommunityPost: false,
    };

    console.log('POST /api/posts: Данные для создания поста:', JSON.stringify(postData, null, 2));
    const post = await Post.create(postData);
    console.log('POST /api/posts: Пост успешно создан с _id:', post._id);

    const user = await User.findById(userId).select('username avatar');
    const responseData: PostData = {
      _id: post._id.toString(),
      content: post.content,
      userId: user
        ? {
            _id: user._id.toString(),
            username: user.username || 'Unknown User',
            avatar: user.avatar || undefined,
          }
        : { _id: userId, username: 'Unknown User', avatar: undefined },
      isCommunityPost: false,
      createdAt: post.createdAt.toISOString(),
      likes: post.likes.map((id: Types.ObjectId) => id.toString()) || [],
      reactions: post.reactions.map((r: { emoji: string; users: Types.ObjectId[] }) => ({
        emoji: r.emoji,
        users: r.users.map((u: Types.ObjectId) => u.toString()),
      })) || [],
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

// PUT метод для обновления поста
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

    const post = await Post.findById(params.id).lean() as LeanPostDocument | null;
    console.log('PUT /api/posts/[id]: Результат поиска поста:', { postId: params.id, postExists: !!post });

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
      isCommunityAdmin = isCreator || (community?.admins?.includes(userId) || false);
    }

    if (!isAuthor && !isCommunityAdmin) {
      console.log('PUT /api/posts/[id]: Недостаточно прав для редактирования поста, userId:', userId);
      return NextResponse.json({ error: 'Недостаточно прав для редактирования поста' }, { status: 403 });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      params.id,
      { content, images, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('userId', 'username avatar _id') as PopulatedPost;

    const comments: CommentData[] = updatedPost.comments.map((comment) => {
      const commentUser = comment.userId;
      return {
        _id: comment._id.toString(),
        userId: commentUser
          ? {
              _id: commentUser._id.toString(),
              username: commentUser.username || 'Unknown User',
              avatar: commentUser.avatar || undefined,
            }
          : { _id: '', username: 'Unknown User', avatar: undefined },
        content: comment.content || '',
        createdAt: new Date(comment.createdAt).toISOString(),
        images: comment.images || [],
        likes: comment.likes?.map((id: Types.ObjectId) => id.toString()) || [],
        reactions: comment.reactions?.map((r: { emoji: string; users: Types.ObjectId[] }) => ({
          emoji: r.emoji,
          users: r.users.map((u: Types.ObjectId) => u.toString()),
        })) || [],
      };
    });

    const responseData: PostData = {
      _id: updatedPost._id.toString(),
      content: updatedPost.content,
      userId: updatedPost.userId
        ? {
            _id: updatedPost.userId._id.toString(),
            username: updatedPost.userId.username || 'Unknown User',
            avatar: updatedPost.userId.avatar || undefined,
          }
        : { _id: '', username: 'Unknown User', avatar: undefined },
      communityId: updatedPost.community?.toString(),
      isCommunityPost: updatedPost.isCommunityPost || false,
      createdAt: updatedPost.createdAt.toISOString(),
      likes: updatedPost.likes.map((id: Types.ObjectId) => id.toString()) || [],
      reactions: updatedPost.reactions.map((r: { emoji: string; users: Types.ObjectId[] }) => ({
        emoji: r.emoji,
        users: r.users.map((u: Types.ObjectId) => u.toString()),
      })) || [],
      images: updatedPost.images || [],
      comments,
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

// DELETE метод для удаления поста
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

    const post = await Post.findById(params.id).lean() as LeanPostDocument | null;
    console.log('DELETE /api/posts/[id]: Результат поиска поста:', { postId: params.id, postExists: !!post });

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
      isCommunityAdmin = isCreator || (community?.admins?.includes(userId) || false);
    }

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