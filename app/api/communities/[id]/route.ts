import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB';
import Community from '@/models/Community';
import User from '@/models/User';
import Post from '@/models/Post';
import mongoose from 'mongoose';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await connectToDB();
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  console.time(`GET /api/communities/${id}: Total`);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`GET /api/communities/${id}: Неверный ID сообщества`);
    return NextResponse.json({ error: 'Неверный ID сообщества' }, { status: 400 });
  }

  try {
    const community = await Community.findById(id)
      .populate('creator', 'username _id')
      .populate('members', 'username _id')
      .populate('admins', 'username _id')
      .select('name description interests avatar creator members admins createdAt updatedAt');

    if (!community) {
      console.log(`GET /api/communities/${id}: Сообщество не найдено`);
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    console.log(`GET /api/communities/${id}: Загружено сообщество:`, community.name);
    console.timeEnd(`GET /api/communities/${id}: Total`);
    return NextResponse.json(community, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`GET /api/communities/${id}: Ошибка:`, errorMessage, error);
    console.timeEnd(`GET /api/communities/${id}: Total`);
    return NextResponse.json({ error: 'Не удалось загрузить сообщество', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await connectToDB();
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  console.time(`POST /api/communities/${id}/subscribe: Total`);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    console.log(`POST /api/communities/${id}/subscribe: Неверный или отсутствует userId`);
    return NextResponse.json({ error: 'Неверный или отсутствует userId' }, { status: 400 });
  }

  try {
    const community = await Community.findById(id);
    if (!community) {
      console.log(`POST /api/communities/${id}/subscribe: Сообщество не найдено`);
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log(`POST /api/communities/${id}/subscribe: Пользователь не найден`);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (!community.members.includes(userId)) {
      community.members.push(userId);
      user.communities.push(community._id);
      await community.save();
      await user.save({ validateModifiedOnly: true });
      console.log(`POST /api/communities/${id}/subscribe: Пользователь ${userId} подписался на сообщество ${id}`);
      console.timeEnd(`POST /api/communities/${id}/subscribe: Total`);
      return NextResponse.json({ message: 'Вы успешно подписались на сообщество' }, { status: 200 });
    } else {
      console.log(`POST /api/communities/${id}/subscribe: Пользователь уже подписан`);
      console.timeEnd(`POST /api/communities/${id}/subscribe: Total`);
      return NextResponse.json({ message: 'Вы уже подписаны на это сообщество' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`POST /api/communities/${id}/subscribe: Ошибка:`, errorMessage, error);
    console.timeEnd(`POST /api/communities/${id}/subscribe: Total`);
    return NextResponse.json({ error: 'Не удалось подписаться на сообщество', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  await connectToDB();
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  console.time(`PUT /api/communities/${id}: Total`);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    console.log(`PUT /api/communities/${id}: Неверный или отсутствует userId`);
    return NextResponse.json({ error: 'Неверный или отсутствует userId' }, { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`PUT /api/communities/${id}: Неверный ID сообщества`);
    return NextResponse.json({ error: 'Неверный ID сообщества' }, { status: 400 });
  }

  try {
    const community = await Community.findById(id);
    if (!community) {
      console.log(`PUT /api/communities/${id}: Сообщество не найдено`);
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    const isAdmin = community.admins.includes(userId) || community.creator.toString() === userId;
    if (!isAdmin) {
      console.log(`PUT /api/communities/${id}: Недостаточно прав`);
      return NextResponse.json({ error: 'Недостаточно прав для выполнения действия' }, { status: 403 });
    }

    // Проверка Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.log(`PUT /api/communities/${id}: Неверный Content-Type`, contentType);
      return NextResponse.json({ error: 'Ожидается Content-Type: application/json' }, { status: 400 });
    }

    // Безопасный парсинг тела запроса
    let body;
    try {
      const text = await request.text();
      console.log(`PUT /api/communities/${id}: Тело запроса (raw):`, text);
      if (!text) {
        console.log(`PUT /api/communities/${id}: Пустое тело запроса`);
        return NextResponse.json({ error: 'Тело запроса не может быть пустым' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError: any) {
      console.error(`PUT /api/communities/${id}: Ошибка парсинга JSON:`, parseError.message);
      return NextResponse.json({ error: 'Некорректный формат JSON', details: parseError.message }, { status: 400 });
    }

    const { action, name, description, interests, avatar, memberId } = body;

    console.log(`PUT /api/communities/${id}: Получены данные`, { action, name, description, interests, avatar, memberId });

    if (!action) {
      console.log(`PUT /api/communities/${id}: Требуется action`);
      return NextResponse.json({ error: 'Требуется action' }, { status: 400 });
    }

    switch (action) {
      case 'editCommunity':
        // Валидация данных для редактирования сообщества
        if (!name || typeof name !== 'string' || name.trim().length < 3) {
          console.log(`PUT /api/communities/${id}: Неверное имя сообщества`);
          return NextResponse.json({ error: 'Имя сообщества должно быть строкой не короче 3 символов' }, { status: 400 });
        }

        if (description && typeof description !== 'string') {
          console.log(`PUT /api/communities/${id}: Неверное описание`);
          return NextResponse.json({ error: 'Описание должно быть строкой' }, { status: 400 });
        }

        if (interests && (!Array.isArray(interests) || interests.some((i: any) => typeof i !== 'string'))) {
          console.log(`PUT /api/communities/${id}: Неверные интересы`);
          return NextResponse.json({ error: 'Интересы должны быть массивом строк' }, { status: 400 });
        }

        if (avatar && typeof avatar !== 'string') {
          console.log(`PUT /api/communities/${id}: Неверный аватар`);
          return NextResponse.json({ error: 'Аватар должен быть строкой (URL)' }, { status: 400 });
        }

        // Обновление полей сообщества
        community.name = name.trim();
        if (description !== undefined) community.description = description.trim();
        if (interests) community.interests = interests.map((i: string) => i.trim());
        if (avatar) community.avatar = avatar;

        break;

      case 'addMember':
        if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
          console.log(`PUT /api/communities/${id}: Неверный memberId`);
          return NextResponse.json({ error: 'Неверный memberId' }, { status: 400 });
        }
        const userToAdd = await User.findById(memberId);
        if (!userToAdd) {
          console.log(`PUT /api/communities/${id}: Пользователь ${memberId} не найден`);
          return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }
        if (community.members.includes(memberId)) {
          console.log(`PUT /api/communities/${id}: Пользователь уже является членом сообщества`);
          return NextResponse.json({ error: 'Пользователь уже является членом сообщества' }, { status: 400 });
        }
        community.members.push(new mongoose.Types.ObjectId(memberId));
        userToAdd.communities.push(community._id);
        await userToAdd.save({ validateModifiedOnly: true });
        break;

      case 'removeMember':
        if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
          console.log(`PUT /api/communities/${id}: Неверный memberId`);
          return NextResponse.json({ error: 'Неверный memberId' }, { status: 400 });
        }
        if (!community.members.includes(memberId)) {
          console.log(`PUT /api/communities/${id}: Пользователь не является членом сообщества`);
          return NextResponse.json({ error: 'Пользователь не является членом сообщества' }, { status: 400 });
        }
        if (memberId === userId) {
          console.log(`PUT /api/communities/${id}: Нельзя удалить себя`);
          return NextResponse.json({ error: 'Нельзя удалить себя из сообщества' }, { status: 400 });
        }
        community.members = community.members.filter((m: mongoose.Types.ObjectId) => m.toString() !== memberId);
        const userToRemove = await User.findById(memberId);
        if (userToRemove) {
          userToRemove.communities = userToRemove.communities.filter((c: mongoose.Types.ObjectId) => c.toString() !== id);
          await userToRemove.save({ validateModifiedOnly: true });
        }
        break;

      case 'addModerator':
        if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
          console.log(`PUT /api/communities/${id}: Неверный memberId`);
          return NextResponse.json({ error: 'Неверный memberId' }, { status: 400 });
        }
        if (community.admins.includes(memberId)) {
          console.log(`PUT /api/communities/${id}: Пользователь уже является модератором`);
          return NextResponse.json({ error: 'Пользователь уже является модератором' }, { status: 400 });
        }
        if (!community.members.includes(memberId)) {
          console.log(`PUT /api/communities/${id}: Пользователь не является членом сообщества`);
          return NextResponse.json({ error: 'Пользователь не является членом сообщества' }, { status: 400 });
        }
        community.admins.push(new mongoose.Types.ObjectId(memberId));
        break;

      case 'removeModerator':
        if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
          console.log(`PUT /api/communities/${id}: Неверный memberId`);
          return NextResponse.json({ error: 'Неверный memberId' }, { status: 400 });
        }
        if (!community.admins.includes(memberId)) {
          console.log(`PUT /api/communities/${id}: Пользователь не является модератором`);
          return NextResponse.json({ error: 'Пользователь не является модератором' }, { status: 400 });
        }
        community.admins = community.admins.filter((a: mongoose.Types.ObjectId) => a.toString() !== memberId);
        break;

      default:
        console.log(`PUT /api/communities/${id}: Неверное действие`, action);
        return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
    }

    await community.save();

    const updatedCommunity = await Community.findById(id)
      .populate('creator', 'username _id')
      .populate('members', 'username _id')
      .populate('admins', 'username _id')
      .select('name description interests avatar creator members admins createdAt updatedAt');

    console.log(`PUT /api/communities/${id}: Сообщество обновлено, действие: ${action}`);
    console.timeEnd(`PUT /api/communities/${id}: Total`);
    return NextResponse.json(updatedCommunity, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`PUT /api/communities/${id}: Ошибка:`, errorMessage, error);
    console.timeEnd(`PUT /api/communities/${id}: Total`);
    return NextResponse.json({ error: 'Не удалось обновить сообщество', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await connectToDB();
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  console.time(`DELETE /api/communities/${id}: Total`);
  console.log(`DELETE /api/communities/${id}: Запрос получен, id: ${id}, userId: ${userId}`);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    console.log(`DELETE /api/communities/${id}: Неверный или отсутствует userId`);
    return NextResponse.json({ error: 'Неверный или отсутствует userId' }, { status: 400 });
  }

  try {
    const community = await Community.findById(id);
    if (!community) {
      console.log(`DELETE /api/communities/${id}: Сообщество не найдено`);
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    console.log(`DELETE /api/communities/${id}: Проверка прав - userId: ${userId}, creator: ${community.creator}, admins: ${community.admins}`);
    if (community.creator.toString() !== userId && !community.admins.includes(userId)) {
      console.log(`DELETE /api/communities/${id}: Недостаточно прав для удаления`);
      return NextResponse.json({ error: 'Только создатель или администратор может удалить сообщество' }, { status: 403 });
    }

    await Post.deleteMany({ community: id });
    await User.updateMany({ communities: id }, { $pull: { communities: id } });
    await Community.deleteOne({ _id: id });

    console.log(`DELETE /api/communities/${id}: Сообщество успешно удалено, id: ${id}`);
    console.timeEnd(`DELETE /api/communities/${id}: Total`);
    return NextResponse.json({ message: 'Сообщество успешно удалено' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`DELETE /api/communities/${id}: Ошибка:`, errorMessage, error);
    console.timeEnd(`DELETE /api/communities/${id}: Total`);
    return NextResponse.json({ error: 'Не удалось удалить сообщество', details: errorMessage }, { status: 500 });
  }
}