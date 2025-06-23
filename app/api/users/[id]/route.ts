import { NextResponse } from 'next/server';
import { connectToDB, mongoose } from '@/app/lib/mongoDB';
import User from '@/models/User';
import FriendRequest from '@/models/FriendRequest';
import Friendship from '@/models/Friendship';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import { Types } from 'mongoose'; // Импорт Types для ObjectId

// Интерфейсы для типизации
interface UserMinimal {
  _id: string;
  username: string;
}

interface UserData extends UserMinimal {
  name?: string;
  bio?: string;
  interests?: string[];
  avatar?: string;
  following?: string[]; // Массив строк для .lean()
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const userId = request.headers.get('x-user-id');
    const { id } = params;

    console.log('GET /api/users/[id]: Получен userId из заголовка:', userId);
    console.log('GET /api/users/[id]: ID профиля:', id);

    if (!userId) {
      console.log('GET /api/users/[id]: Отсутствует userId в заголовке');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(id)) {
      console.log('GET /api/users/[id]: Неверный формат userId или id:', { userId, id });
      return NextResponse.json({ error: 'Неверный формат идентификатора' }, { status: 400 });
    }

    const user = await User.findById(id).select('username name bio interests avatar').lean() as UserData | null;
    if (!user) {
      console.log('GET /api/users/[id]: Пользователь не найден:', id);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    let friendStatus: 'none' | 'pending' | 'friends' = 'none';
    let isFollowing = false;

    const currentUser = await User.findById(userId).select('following').lean() as UserData | null;
    if (!currentUser) {
      console.log('GET /api/users/[id]: Текущий пользователь не найден:', userId);
      return NextResponse.json({ error: 'Текущий пользователь не найден' }, { status: 404 });
    }

    // Проверка подписки (following)
    isFollowing = currentUser.following?.includes(id) || false;

    // Проверка статуса дружбы
    const friendship = await Friendship.findOne({
      $or: [
        { user1: new Types.ObjectId(userId), user2: new Types.ObjectId(id) },
        { user1: new Types.ObjectId(id), user2: new Types.ObjectId(userId) },
      ],
    }).lean() as { user1: UserMinimal; user2: UserMinimal } | null;
    if (friendship) {
      friendStatus = 'friends';
    } else {
      const pendingRequest = await FriendRequest.findOne({
        $or: [
          { fromUser: new Types.ObjectId(userId), toUser: new Types.ObjectId(id), status: 'pending' },
          { fromUser: new Types.ObjectId(id), toUser: new Types.ObjectId(userId), status: 'pending' },
        ],
      }).lean() as { fromUser: UserMinimal; toUser: UserMinimal; status: string } | null;
      if (pendingRequest) {
        friendStatus = 'pending';
      }
    }

    return NextResponse.json({
      _id: user._id.toString(),
      username: user.username,
      name: user.name,
      bio: user.bio,
      interests: user.interests,
      avatar: user.avatar,
      friendStatus,
      isFollowing,
    }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/users/[id]: Ошибка сервера:', error.message, error.stack);
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const userId = request.headers.get('x-user-id');
    const { id } = params;
    const { avatar, bio } = await request.json();

    console.log('PUT /api/users/[id]: Получен userId из заголовка:', userId);
    console.log('PUT /api/users/[id]: ID профиля:', id);

    if (!userId || userId !== id) {
      console.log('PUT /api/users/[id]: Нет доступа, userId:', userId, 'id:', id);
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('PUT /api/users/[id]: Неверный формат id:', id);
      return NextResponse.json({ error: 'Неверный формат идентификатора' }, { status: 400 });
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
    }, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/users/[id]: Ошибка сервера:', error.message, error.stack);
    return NextResponse.json({ error: 'Не удалось обновить пользователя', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDB();
    const userId = request.headers.get('x-user-id');
    console.log('DELETE /api/users: Получен userId из заголовка:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('DELETE /api/users: Отсутствует или неверный userId');
      return NextResponse.json({ error: 'Требуется валидный userId' }, { status: 400 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Удаляем все посты пользователя
      await Post.deleteMany({ userId: new Types.ObjectId(userId) }).session(session);
      console.log('DELETE /api/users: Удалены посты пользователя');

      // Удаляем все комментарии пользователя
      await Comment.deleteMany({ userId: new Types.ObjectId(userId) }).session(session);
      console.log('DELETE /api/users: Удалены комментарии пользователя');

      // Удаляем дружеские связи, где пользователь участвует
      await Friendship.deleteMany({
        $or: [{ user1: new Types.ObjectId(userId) }, { user2: new Types.ObjectId(userId) }],
      }).session(session);
      console.log('DELETE /api/users: Удалены дружеские связи');

      // Удаляем входящие и исходящие запросы на дружбу
      await FriendRequest.deleteMany({
        $or: [{ fromUser: new Types.ObjectId(userId) }, { toUser: new Types.ObjectId(userId) }],
      }).session(session);
      console.log('DELETE /api/users: Удалены запросы на дружбу');

      // Удаляем пользователя
      const deleteResult = await User.deleteOne({ _id: new Types.ObjectId(userId) }).session(session);
      if (deleteResult.deletedCount === 0) {
        await session.abortTransaction();
        console.log('DELETE /api/users: Пользователь не найден для удаления');
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }

      await session.commitTransaction();
      console.log('DELETE /api/users: Пользователь успешно удалён, id:', userId);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return NextResponse.json({ message: 'Пользователь удалён' }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE /api/users: Ошибка сервера:', error.message, error.stack);
    return NextResponse.json({ error: 'Не удалось удалить пользователя', details: error.message }, { status: 500 });
  }
}