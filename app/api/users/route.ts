import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Message from '@/models/Message';
import FriendRequest from '@/models/FriendRequest';
import Friendship from '@/models/Friendship';
import Post from '@/models/Post';
import { CommentModel } from '@/models/Post';

export async function GET(request: Request) {
  console.time('GET /api/users: Total');
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    console.log('GET /api/users: Параметры:', { search });

    const users = await User.find({
      username: { $regex: search, $options: 'i' },
    })
      .select('_id username name')
      .lean();

    console.log('GET /api/users: Найдены пользователи:', users.length);
    console.timeEnd('GET /api/users: Total');
    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/users: Ошибка:', errorMessage);
    console.timeEnd('GET /api/users: Total');
    return NextResponse.json({ error: 'Ошибка загрузки пользователей', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  console.time('DELETE /api/users: Total');
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id')?.trim();
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');

    console.log('DELETE /api/users: Получен userId:', userId);

    if (!userId || !authToken) {
      console.log('DELETE /api/users: Отсутствует userId или authToken');
      return NextResponse.json({ error: 'Требуются userId и authToken' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('DELETE /api/users: Пользователь не найден:', userId);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Находим все посты пользователя
    const userPosts = await Post.find({ userId }).select('comments');

    // Удаляем все комментарии, связанные с постами пользователя
    if (userPosts.length > 0) {
      const commentIds = userPosts.flatMap((post) => post.comments);
      if (commentIds.length > 0) {
        await CommentModel.deleteMany({ _id: { $in: commentIds } });
      }
    }

    // Удаляем комментарии, созданные пользователем
    await CommentModel.deleteMany({ userId });

    // Удаляем посты пользователя
    await Post.deleteMany({ userId });

    // Удаляем пользователя
    await User.deleteOne({ _id: userId });

    // Удаляем сообщения
    await Message.deleteMany({
      $or: [{ senderId: userId }, { recipientId: userId }],
    });

    // Удаляем запросы на дружбу
    await FriendRequest.deleteMany({
      $or: [{ fromUser: userId }, { toUser: userId }],
    });

    // Удаляем дружбы
    await Friendship.deleteMany({
      $or: [{ user1: userId }, { user2: userId }],
    });

    // Удаляем чаты, если коллекция существует
    try {
      const Chat = require('@/models/Chat').default;
      await Chat.deleteMany({
        $or: [{ userId: userId }, { recipientId: userId }],
      });
    } catch (err) {
      console.warn('DELETE /api/users: Коллекция chats не найдена или ошибка:', err);
    }

    console.log('DELETE /api/users: Аккаунт и данные удалены для userId:', userId);
    console.timeEnd('DELETE /api/users: Total');
    return NextResponse.json({ message: 'Аккаунт и все данные удалены' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/users: Ошибка:', errorMessage);
    console.timeEnd('DELETE /api/users: Total');
    return NextResponse.json({ error: 'Не удалось удалить аккаунт', details: errorMessage }, { status: 500 });
  }
}