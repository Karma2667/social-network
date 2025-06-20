import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
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
  await dbConnect();
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
        await user.save({ session, validateModifiedOnly: true, runValidators: false }); // Отключаем валидацию
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
  await dbConnect();
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

      if (community.members.includes(userId)) {
        community.members = community.members.filter((member: mongoose.Types.ObjectId | string) => member.toString() !== userId);
        user.communities = user.communities.filter((communityId: mongoose.Types.ObjectId) => communityId.toString() !== id);
        await community.save({ session });
        await user.save({ session, validateModifiedOnly: true, runValidators: false }); // Отключаем валидацию
        await session.commitTransaction();
        console.log(`DELETE /api/communities/${id}/subscribe: Пользователь ${userId} отписался от сообщества ${id}`);
        return NextResponse.json({ message: 'Вы успешно отписались от сообщества' }, { status: 200 });
      } else {
        await session.abortTransaction();
        return NextResponse.json({ message: 'Вы не подписаны на это сообщество' }, { status: 400 });
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`DELETE /api/communities/${id}/subscribe ошибка:`, error);
    return NextResponse.json({ error: 'Не удалось отписаться от сообщества', details: errorMessage }, { status: 500 });
  }
}