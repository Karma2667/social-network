import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Неверный или отсутствует userId' }, { status: 400 });
  }

  try {
    const community = await Community.findById(id);
    if (!community) {
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (!community.members.includes(userId)) {
      community.members.push(userId);
      user.communities.push(community._id);
      await community.save();
      await user.save({ validateBeforeSave: false });
      console.log(`POST /api/communities/${id}/subscribe: Пользователь ${userId} подписался на сообщество ${id}`);
      const updatedCommunity = await Community.findById(id)
        .populate('creator', 'username')
        .populate('members', 'username')
        .populate('admins', 'username');
      return NextResponse.json(updatedCommunity);
    } else {
      return NextResponse.json({ message: 'Вы уже подписаны на это сообщество' }, { status: 400 });
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
    const community = await Community.findById(id);
    if (!community) {
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (community.members.includes(userId)) {
      // Проверяем, не является ли пользователь создателем
      if (community.creator && community.creator.toString() === userId) {
        return NextResponse.json({ error: 'Создатель сообщества не может отписаться' }, { status: 403 });
      }
      community.members = community.members.filter((memberId: mongoose.Types.ObjectId | string) => memberId.toString() !== userId);
      user.communities = user.communities.filter((communityId: mongoose.Types.ObjectId) => communityId.toString() !== id);
      await community.save();
      await user.save({ validateModifiedOnly: true });
      console.log(`DELETE /api/communities/${id}/subscribe: Пользователь ${userId} отписался от сообщества ${id}`);
      const updatedCommunity = await Community.findById(id)
        .populate('creator', 'username')
        .populate('members', 'username')
        .populate('admins', 'username');
      return NextResponse.json(updatedCommunity);
    } else {
      return NextResponse.json({ message: 'Вы не подписаны на это сообщество' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`DELETE /api/communities/${id}/subscribe ошибка:`, error);
    return NextResponse.json({ error: 'Не удалось отписаться от сообщества', details: errorMessage }, { status: 500 });
  }
}