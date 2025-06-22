import { NextResponse } from 'next/server';
import { connectToDB, mongoose } from '@/app/lib/mongoDB';
import User from '@/models/User';
import FriendRequest from '@/models/FriendRequest';
import Friendship from '@/models/Friendship';

// Интерфейсы для типизации
interface UserMinimal {
  _id: string;
  username: string;
}

interface FriendRequestData {
  _id: string;
  fromUser: UserMinimal;
  toUser: UserMinimal;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

interface FriendshipData {
  _id: string;
  user1: UserMinimal;
  user2: UserMinimal;
}

// Промежуточные типы для данных после .populate() и .lean()
interface LeanPopulatedFriendRequest {
  _id: string;
  fromUser: { _id: mongoose.Types.ObjectId; username: string };
  toUser: { _id: mongoose.Types.ObjectId; username: string };
  status: string;
  createdAt: Date;
}

interface LeanPopulatedFriendship {
  _id: string;
  user1: { _id: mongoose.Types.ObjectId; username: string };
  user2: { _id: mongoose.Types.ObjectId; username: string };
}

export async function GET(request: Request) {
  try {
    console.log('GET /api/friends: Начало обработки запроса...');
    await connectToDB();
    console.log('GET /api/friends: Успешное подключение к MongoDB');

    const userId = request.headers.get('x-user-id');
    console.log('GET /api/friends: Получен userId:', userId);

    if (!userId) {
      console.log('GET /api/friends: Отсутствует userId в заголовке');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('GET /api/friends: Некорректный userId:', userId);
      return NextResponse.json({ error: 'Некорректный userId' }, { status: 400 });
    }

    // Получаем входящие запросы на дружбу
    const incomingRequestsRaw = await FriendRequest.find({
      toUser: userId,
      status: 'pending',
    }).populate('fromUser', 'username _id').lean() as unknown as LeanPopulatedFriendRequest[] || [];
    const incomingRequests = incomingRequestsRaw.length > 0 ? incomingRequestsRaw.map(req => ({
      _id: req._id.toString(),
      fromUser: { _id: req.fromUser._id.toString(), username: req.fromUser.username },
      toUser: { _id: req.toUser._id.toString(), username: req.toUser.username },
      status: req.status as 'pending' | 'accepted' | 'rejected',
      createdAt: req.createdAt,
    })) : [];

    // Получаем исходящие запросы
    const outgoingRequestsRaw = await FriendRequest.find({
      fromUser: userId,
      status: 'pending',
    }).populate('toUser', 'username _id').lean() as unknown as LeanPopulatedFriendRequest[] || [];
    const outgoingRequests = outgoingRequestsRaw.length > 0 ? outgoingRequestsRaw.map(req => ({
      _id: req._id.toString(),
      fromUser: { _id: req.fromUser._id.toString(), username: req.fromUser.username },
      toUser: { _id: req.toUser._id.toString(), username: req.toUser.username },
      status: req.status as 'pending' | 'accepted' | 'rejected',
      createdAt: req.createdAt,
    })) : [];

    // Получаем список друзей
    const friendshipsRaw = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
    }).populate('user1 user2', 'username _id').lean() as unknown as LeanPopulatedFriendship[] || [];
    const friendships = friendshipsRaw.length > 0 ? friendshipsRaw.map(friendship => ({
      _id: friendship._id.toString(),
      user1: { _id: friendship.user1._id.toString(), username: friendship.user1.username },
      user2: { _id: friendship.user2._id.toString(), username: friendship.user2.username },
    })) : [];

    const friends = friendships.length > 0 ? friendships.map((friendship) => {
      const friend = friendship.user1._id.toString() === userId ? friendship.user2 : friendship.user1;
      return { _id: friend._id, username: friend.username };
    }) : [];

    // Получаем подписчиков
    const rawFollowers = await User.find({ following: userId }).select('username _id').lean() as unknown as UserMinimal[] || [];
    const followers = rawFollowers.length > 0 ? rawFollowers.map((f) => ({ _id: f._id.toString(), username: f.username })) : [];

    // Получаем список тех, на кого подписан пользователь
    const user = await User.findById(userId).populate('following', 'username _id').lean() as { following: UserMinimal[] } | null;
    const following = user?.following ? user.following.map((f) => ({ _id: f._id.toString(), username: f.username })) : [];

    console.log('GET /api/friends: Данные собраны:', {
      incomingRequests: incomingRequests.length,
      outgoingRequests: outgoingRequests.length,
      friends: friends.length,
      followers: followers.length,
      following: following.length,
    });

    return NextResponse.json({
      incomingRequests: incomingRequests.map((req) => ({
        _id: req._id,
        fromUser: { _id: req.fromUser._id, username: req.fromUser.username },
      })),
      outgoingRequests: outgoingRequests.map((req) => ({
        _id: req._id,
        toUser: { _id: req.toUser._id, username: req.toUser.username },
      })),
      friends,
      followers,
      following,
    }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/friends: Ошибка сервера:', error.message, error.stack);
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/friends: Начало обработки запроса...');
    await connectToDB();
    const { toUserId, action } = await request.json();
    const fromUserId = request.headers.get('x-user-id');

    console.log('POST /api/friends: Получены данные:', { fromUserId, toUserId, action });

    if (!fromUserId || !toUserId) {
      console.log('POST /api/friends: Отсутствуют fromUserId или toUserId');
      return NextResponse.json({ error: 'Требуются fromUserId и toUserId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(fromUserId) || !mongoose.Types.ObjectId.isValid(toUserId)) {
      console.log('POST /api/friends: Некорректные ID:', { fromUserId, toUserId });
      return NextResponse.json({ error: 'Некорректные ID пользователей' }, { status: 400 });
    }

    if (fromUserId === toUserId) {
      console.log('POST /api/friends: Нельзя взаимодействовать с самим собой');
      return NextResponse.json({ error: 'Нельзя взаимодействовать с самим собой' }, { status: 400 });
    }

    const toUser = await User.findById(toUserId).lean() as UserMinimal | null;
    if (!toUser) {
      console.log('POST /api/friends: Пользователь не найден:', toUserId);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (action === 'follow') {
      console.log('POST /api/friends: Обработка подписки:', { fromUserId, toUserId });
      const user = await User.findById(fromUserId).lean() as { following: string[] } | null;
      if (!user) {
        console.log('POST /api/friends: Пользователь не найден:', fromUserId);
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }
      if (user.following?.includes(toUserId)) {
        console.log('POST /api/friends: Уже подписан:', { fromUserId, toUserId });
        return NextResponse.json({ error: 'Вы уже подписаны' }, { status: 400 });
      }
      await User.findByIdAndUpdate(fromUserId, { $push: { following: toUserId } });
      console.log('POST /api/friends: Подписка успешна:', { fromUserId, toUserId });
      return NextResponse.json({ message: 'Вы подписались на пользователя' }, { status: 200 });
    } else if (action === 'friend') {
      console.log('POST /api/friends: Обработка запроса на дружбу:', { fromUserId, toUserId });
      const existingRequest = await FriendRequest.findOne({
        fromUser: fromUserId,
        toUser: toUserId,
        status: 'pending',
      }).lean() as LeanPopulatedFriendRequest | null;

      if (existingRequest) {
        console.log('POST /api/friends: Запрос уже существует:', { fromUserId, toUserId });
        return NextResponse.json({ error: 'Запрос уже отправлен' }, { status: 400 });
      }

      const existingFriendship = await Friendship.findOne({
        $or: [
          { user1: fromUserId, user2: toUserId },
          { user1: toUserId, user2: fromUserId },
        ],
      }).lean() as LeanPopulatedFriendship | null;

      if (existingFriendship) {
        console.log('POST /api/friends: Уже друзья:', { fromUserId, toUserId });
        return NextResponse.json({ error: 'Вы уже друзья' }, { status: 400 });
      }

      const friendRequest = await FriendRequest.create({
        fromUser: fromUserId,
        toUser: toUserId,
        status: 'pending',
      });
      console.log('POST /api/friends: Запрос на дружбу создан:', { requestId: friendRequest._id });
      return NextResponse.json({ message: 'Запрос на дружбу отправлен', requestId: friendRequest._id }, { status: 201 });
    } else {
      console.log('POST /api/friends: Некорректное действие:', { action });
      return NextResponse.json({ error: 'Некорректное действие' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('POST /api/friends: Ошибка сервера:', error.message, error.stack);
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    console.log('PUT /api/friends: Начало обработки запроса...');
    await connectToDB();
    const { requestId, action, toUserId } = await request.json();
    const userId = request.headers.get('x-user-id');

    console.log('PUT /api/friends: Получены данные:', { userId, requestId, action, toUserId });

    if (!userId) {
      console.log('PUT /api/friends: Отсутствует userId');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (action === 'unfollow') {
      if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
        console.log('PUT /api/friends: Некорректный toUserId:', toUserId);
        return NextResponse.json({ error: 'Требуется корректный toUserId' }, { status: 400 });
      }
      const user = await User.findById(userId).lean() as { following: string[] } | null;
      if (!user) {
        console.log('PUT /api/friends: Пользователь не найден:', userId);
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }
      if (!user.following?.includes(toUserId)) {
        console.log('PUT /api/friends: Не подписан на пользователя:', { userId, toUserId });
        return NextResponse.json({ error: 'Вы не подписаны на этого пользователя' }, { status: 400 });
      }
      await User.findByIdAndUpdate(userId, { $pull: { following: toUserId } });
      console.log('PUT /api/friends: Отписка успешна:', { userId, toUserId });
      return NextResponse.json({ message: 'Вы отписались от пользователя' }, { status: 200 });
    }

    if (!requestId || !['accept', 'reject'].includes(action)) {
      console.log('PUT /api/friends: Некорректные данные:', { requestId, action });
      return NextResponse.json({ error: 'Требуются requestId и корректное действие (accept/reject)' }, { status: 400 });
    }

    const friendRequest = await FriendRequest.findById(requestId).lean() as LeanPopulatedFriendRequest | null;
    if (!friendRequest) {
      console.log('PUT /api/friends: Запрос не найден:', requestId);
      return NextResponse.json({ error: 'Запрос на дружбу не найден' }, { status: 404 });
    }

    if (friendRequest.toUser._id.toString() !== userId) {
      console.log('PUT /api/friends: Нет доступа к запросу:', { userId, requestId });
      return NextResponse.json({ error: 'Нет доступа к этому запросу' }, { status: 403 });
    }

    if (friendRequest.status !== 'pending') {
      console.log('PUT /api/friends: Запрос уже обработан:', requestId);
      return NextResponse.json({ error: 'Запрос уже обработан' }, { status: 400 });
    }

    if (action === 'accept') {
      await FriendRequest.findByIdAndUpdate(requestId, { status: 'accepted' });
      await Friendship.create({
        user1: friendRequest.fromUser._id,
        user2: friendRequest.toUser._id,
      });
      console.log('PUT /api/friends: Запрос принят:', requestId);
      return NextResponse.json({ message: 'Запрос на дружбу принят' }, { status: 200 });
    } else {
      await FriendRequest.findByIdAndUpdate(requestId, { status: 'rejected' });
      console.log('PUT /api/friends: Запрос отклонён:', requestId);
      return NextResponse.json({ message: 'Запрос на дружбу отклонён' }, { status: 200 });
    }
  } catch (error: any) {
    console.error('PUT /api/friends: Ошибка сервера:', error.message, error.stack);
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    console.log('DELETE /api/friends: Начало обработки запроса...');
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const userId = request.headers.get('x-user-id');

    console.log('DELETE /api/friends: Получены данные:', { userId, requestId });

    if (!requestId || !userId) {
      console.log('DELETE /api/friends: Отсутствуют requestId или userId');
      return NextResponse.json({ error: 'Требуются requestId и userId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(requestId)) {
      console.log('DELETE /api/friends: Некорректные ID:', { userId, requestId });
      return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
    }

    const friendRequest = await FriendRequest.findById(requestId).lean() as LeanPopulatedFriendRequest | null;
    if (!friendRequest) {
      console.log('DELETE /api/friends: Запрос не найден:', requestId);
      return NextResponse.json({ error: 'Запрос на дружбу не найден' }, { status: 404 });
    }

    if (friendRequest.fromUser._id.toString() !== userId) {
      console.log('DELETE /api/friends: Нет доступа к запросу:', { userId, requestId });
      return NextResponse.json({ error: 'Нет доступа к этому запросу' }, { status: 403 });
    }

    await FriendRequest.findByIdAndDelete(requestId);
    console.log('DELETE /api/friends: Запрос успешно удалён:', requestId);
    return NextResponse.json({ message: 'Запрос на дружбу отменён' }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE /api/friends: Ошибка сервера:', error.message, error.stack);
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}