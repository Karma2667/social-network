import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FriendRequest, { IFriendRequest } from '@/models/FriendRequest';
import Friendship from '@/models/Friendship';
import User, { LeanUser, LeanUserMinimal } from '@/models/User';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    // Получаем входящие запросы на дружбу
    const incomingRequests = await FriendRequest.find({
      toUser: userId,
      status: 'pending',
    }).populate('fromUser', 'username');

    // Получаем исходящие запросы
    const outgoingRequests = await FriendRequest.find({
      fromUser: userId,
      status: 'pending',
    }).populate('toUser', 'username');

    // Получаем список друзей
    const friendships = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
    }).populate('user1 user2', 'username');

    const friends = friendships.map((friendship) => {
      const friend = friendship.user1.toString() === userId ? friendship.user2 : friendship.user1;
      return { _id: friend._id, username: friend.username };
    });

    // Получаем подписчиков (тех, кто подписан на текущего пользователя)
    const rawFollowers = await User.find({ following: userId }).select('username _id').lean() as unknown;
    const followers = rawFollowers as LeanUserMinimal[];

    // Получаем список тех, на кого подписан пользователь
    const user = await User.findById(userId).populate('following', 'username').lean() as LeanUser | null;
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }
    const following = user.following || [];

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
      followers: followers.map((f) => ({ _id: f._id, username: f.username })),
      following: following.map((f) => ({ _id: f._id, username: f.username })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { toUserId, action } = await request.json();
    const fromUserId = request.headers.get('x-user-id');

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'Требуются fromUserId и toUserId' }, { status: 400 });
    }

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Нельзя взаимодействовать с самим собой' }, { status: 400 });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (action === 'follow') {
      // Подписка
      const user = await User.findById(fromUserId);
      if (!user) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }
      if (user.following?.includes(toUserId)) {
        return NextResponse.json({ error: 'Вы уже подписаны' }, { status: 400 });
      }
      await User.findByIdAndUpdate(fromUserId, { $push: { following: toUserId } });
      return NextResponse.json({ message: 'Вы подписались на пользователя' }, { status: 200 });
    } else {
      // Запрос на дружбу
      const existingRequest = await FriendRequest.findOne({
        fromUser: fromUserId,
        toUser: toUserId,
        status: 'pending',
      });

      if (existingRequest) {
        return NextResponse.json({ error: 'Запрос уже отправлен' }, { status: 400 });
      }

      const existingFriendship = await Friendship.findOne({
        $or: [
          { user1: fromUserId, user2: toUserId },
          { user1: toUserId, user2: fromUserId },
        ],
      });

      if (existingFriendship) {
        return NextResponse.json({ error: 'Вы уже друзья' }, { status: 400 });
      }

      const friendRequest = await FriendRequest.create({
        fromUser: fromUserId,
        toUser: toUserId,
        status: 'pending',
      });

      return NextResponse.json({ message: 'Запрос на дружбу отправлен', requestId: friendRequest._id }, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { requestId, action, toUserId } = await request.json();
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (action === 'unfollow') {
      if (!toUserId) {
        return NextResponse.json({ error: 'Требуется toUserId' }, { status: 400 });
      }
      await User.findByIdAndUpdate(userId, { $pull: { following: toUserId } });
      return NextResponse.json({ message: 'Вы отписались от пользователя' }, { status: 200 });
    }

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Требуются requestId и корректное действие (accept/reject)' }, { status: 400 });
    }

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return NextResponse.json({ error: 'Запрос на дружбу не найден' }, { status: 404 });
    }

    if (friendRequest.toUser.toString() !== userId) {
      return NextResponse.json({ error: 'Нет доступа к этому запросу' }, { status: 403 });
    }

    if (friendRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Запрос уже обработан' }, { status: 400 });
    }

    if (action === 'accept') {
      friendRequest.status = 'accepted';
      await friendRequest.save();

      await Friendship.create({
        user1: friendRequest.fromUser,
        user2: friendRequest.toUser,
      });

      return NextResponse.json({ message: 'Запрос на дружбу принят' });
    } else {
      friendRequest.status = 'rejected';
      await friendRequest.save();

      return NextResponse.json({ message: 'Запрос на дружбу отклонён' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const userId = request.headers.get('x-user-id');

    if (!requestId || !userId) {
      return NextResponse.json({ error: 'Требуются requestId и userId' }, { status: 400 });
    }

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return NextResponse.json({ error: 'Запрос на дружбу не найден' }, { status: 404 });
    }

    if (friendRequest.fromUser.toString() !== userId) {
      return NextResponse.json({ error: 'Нет доступа к этому запросу' }, { status: 403 });
    }

    await friendRequest.deleteOne();
    return NextResponse.json({ message: 'Запрос на дружбу отменён' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}