import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB';
import Community from '@/models/Community';
import User from '@/models/User';
import mongoose from 'mongoose';
import Post from '@/models/Post'; // Добавлен импорт модели Post

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await connectToDB();
  const params = await context.params;
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Неверный ID сообщества' }, { status: 400 });
  }

  try {
    const community = await Community.findById(id)
      .populate('creator', 'username')
      .populate('members', 'username')
      .populate('admins', 'username')
      .select('name description interests avatar creator members admins createdAt updatedAt');

    if (!community) {
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    console.log(`GET /api/communities/${id}: Загружено сообщество:`, community);
    return NextResponse.json(community);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`GET /api/communities/${id} ошибка:`, error);
    return NextResponse.json({ error: 'Не удалось загрузить сообщество', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await connectToDB();
  const params = await context.params;
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Неверный или отсутствует userId' }, { status: 400 });
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const community = await Community.findById(id).session(session);
      if (!community) {
        await session.abortTransaction();
        return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
      }

      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }

      if (!community.members.includes(userId)) {
        community.members.push(userId);
        user.communities.push(community._id);
        await community.save({ session });
        await user.save({ session, validateModifiedOnly: true, runValidators: false });
        await session.commitTransaction();
        console.log(`POST /api/communities/${id}/subscribe: Пользователь ${userId} подписался на сообщество ${id}`);
        return NextResponse.json({ message: 'Вы успешно подписались на сообщество' }, { status: 200 });
      } else {
        await session.abortTransaction();
        return NextResponse.json({ message: 'Вы уже подписаны на это сообщество' }, { status: 400 });
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`POST /api/communities/${id}/subscribe ошибка:`, error);
    return NextResponse.json({ error: 'Не удалось подписаться на сообщество', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  await connectToDB();
  const params = await context.params;
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  console.log('DELETE /api/communities/[id]: Запрос получен, id:', id, 'userId:', userId);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    console.log('DELETE /api/communities/[id]: Неверный или отсутствует userId');
    return NextResponse.json({ error: 'Неверный или отсутствует userId' }, { status: 400 });
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const community = await Community.findById(id).session(session);
      if (!community) {
        await session.abortTransaction();
        console.log('DELETE /api/communities/[id]: Сообщество не найдено');
        return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
      }

      console.log('DELETE /api/communities/[id]: Проверка прав - userId:', userId, 'creator:', community.creator, 'admins:', community.admins);
      if (community.creator.toString() !== userId && !community.admins.includes(userId)) {
        await session.abortTransaction();
        console.log('DELETE /api/communities/[id]: Недостаточно прав для удаления');
        return NextResponse.json({ error: 'Только создатель или администратор может удалить сообщество' }, { status: 403 });
      }

      // Удаление связанных постов
      await Post.deleteMany({ community: id }).session(session);

      await Community.deleteOne({ _id: id }).session(session);
      await session.commitTransaction();
      console.log('DELETE /api/communities/[id]: Сообщество успешно удалено, id:', id);
      return NextResponse.json({ message: 'Сообщество успешно удалено' }, { status: 200 });
    } catch (error) {
      await session.abortTransaction();
      console.log('DELETE /api/communities/[id]: Ошибка транзакции:', error);
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/communities/[id]: Ошибка на этапе выполнения:', errorMessage, 'Полная ошибка:', error);
    return NextResponse.json({ error: 'Не удалось удалить сообщество', details: errorMessage }, { status: 500 });
  }
}