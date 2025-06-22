import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User, { LeanUser } from '@/models/User';
import FriendRequest from '@/models/FriendRequest';
import Friendship from '@/models/Friendship';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { id } = params;

    console.log('GET /api/users/[id]: Получен userId из заголовка:', userId);
    console.log('GET /api/users/[id]: ID профиля:', id);

    if (!userId) {
      console.log('GET /api/users/[id]: Отсутствует userId в заголовке');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    const user = await User.findById(id).populate('posts').lean() as LeanUser | null;
    if (!user) {
      console.log('GET /api/users/[id]: Пользователь не найден:', id);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    let friendStatus: 'none' | 'pending' | 'friends' = 'none';
    const currentUser = await User.findById(userId).lean() as LeanUser | null;
    if (!currentUser) {
      console.log('GET /api/users/[id]: Текущий пользователь не найден:', userId);
      return NextResponse.json({ error: 'Текущий пользователь не найден' }, { status: 404 });
    }

    // Проверяем статус дружбы
    const friendship = await Friendship.findOne({
      $or: [
        { user1: userId, user2: id },
        { user1: id, user2: userId },
      ],
    });
    if (friendship) {
      friendStatus = 'friends';
    } else {
      const pendingRequest = await FriendRequest.findOne({
        fromUser: userId,
        toUser: id,
        status: 'pending',
      });
      if (pendingRequest) {
        friendStatus = 'pending';
      }
    }

    // Проверяем, подписан ли текущий пользователь
    const isFollowing = currentUser.following?.some((follow) => follow.toString() === id) || false;

    return NextResponse.json({
      _id: user._id.toString(),
      username: user.username,
      name: user.name,
      bio: user.bio,
      interests: user.interests,
      posts: user.posts,
      friendStatus,
      isFollowing,
      publicKey: user.publicKey, // Добавляем publicKey
    }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/users/[id]: Ошибка сервера:', error.message);
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { id } = params;
    const { avatar, bio } = await request.json();

    console.log('PUT /api/users/[id]: Получен userId из заголовка:', userId);
    console.log('PUT /api/users/[id]: ID профиля:', id);

    if (!userId || userId !== id) {
      console.log('PUT /api/users/[id]: Нет доступа, userId:', userId, 'id:', id);
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const user = await User.findById(id);
    if (!user) {
      console.log('PUT /api/users/[id]: Пользователь не найден:', id);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (avatar) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    return NextResponse.json({
      _id: user._id.toString(),
      username: user.username,
      name: user.name,
      bio: user.bio,
      interests: user.interests,
      avatar: user.avatar,
      publicKey: user.publicKey,
    }, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/users/[id]: Ошибка сервера:', error.message);
    return NextResponse.json({ error: 'Не удалось обновить пользователя', details: error.message }, { status: 500 });
  }
}