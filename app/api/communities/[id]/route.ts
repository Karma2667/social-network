import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';
import User from '@/models/User';
import fs from 'fs/promises';
import path from 'path';
import mongoose, { Types } from 'mongoose';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;

  try {
    console.log('GET /api/communities/[id]: Подключение к MongoDB...');
    const community = await Community.findById(id)
      .populate('creator', 'username')
      .populate('members', 'username')
      .populate('admins', '_id username');

    if (!community) {
      console.log('GET /api/communities/[id]: Сообщество не найдено:', id);
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    console.log('GET /api/communities/[id]: Загружено сообщество с создателем:', {
      _id: community._id,
      name: community.name,
      creator: community.creator,
    });
    return NextResponse.json(community);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/communities/[id] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось загрузить сообщество', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const community = await Community.findById(id).populate('members', 'username');

    if (!community) {
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    const isCreator = community.creator?.toString() === userId;
    const isAdmin = community.admins.includes(userId);

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to edit' }, { status: 403 });
    }

    let body;
    if (request.headers.get('content-type')?.includes('application/json')) {
      body = await request.json();
      console.log('PUT JSON body:', body);
    } else {
      body = await request.formData();
      console.log('PUT FormData body:', Object.fromEntries(body));
    }

    if (body instanceof FormData) {
      const name = body.get('name') as string;
      const description = body.get('description') as string;
      const interests = body.get('interests') as string;
      const avatarFile = body.get('avatar') as File | string;

      if (name) community.name = name;
      if (description) community.description = description;
      if (interests) community.interests = interests.split(',').map((interest) => interest.trim());

      if (avatarFile instanceof File) {
        const uploadsDir = path.join(process.cwd(), 'public/uploads');
        await fs.mkdir(uploadsDir, { recursive: true });
        const fileName = `${Date.now()}-${avatarFile.name}`;
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, Buffer.from(await avatarFile.arrayBuffer()));
        community.avatar = `/uploads/${fileName}`;
      } else if (typeof avatarFile === 'string' && avatarFile) {
        community.avatar = avatarFile;
      }
    }

    if (body && typeof body === 'object' && 'action' in body) {
      const { action, memberId } = body;

      if (!memberId) {
        return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
      }

      console.log('Processing action:', action, 'for memberId:', memberId);

      if (action === 'removeMember') {
        if (!isCreator) {
          return NextResponse.json({ error: 'Only the creator can remove members' }, { status: 403 });
        }
        if (memberId === userId) {
          return NextResponse.json({ error: 'Cannot remove yourself from the community' }, { status: 403 });
        }
        const memberIndex = community.members.findIndex((m: any) => m._id?.toString() === memberId);
        if (memberIndex === -1) {
          return NextResponse.json({ error: 'Member not found in community' }, { status: 404 });
        }
        community.members.splice(memberIndex, 1);
        console.log('Member removed, updated members:', community.members);
      } else if (action === 'addMember') {
        if (!isCreator) {
          return NextResponse.json({ error: 'Only the creator can add members' }, { status: 403 });
        }
        const user = await User.findById(memberId).select('username _id');
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        if (!community.members.some((m: any) => m._id?.toString() === memberId)) {
          community.members.push({ _id: user._id, username: user.username });
        }
      } else if (action === 'addModerator') {
        if (!isCreator) {
          return NextResponse.json({ error: 'Only the creator can add moderators' }, { status: 403 });
        }
        const user = await User.findById(memberId).select('_id');
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        if (!community.members.some((m: any) => m._id?.toString() === memberId)) {
          return NextResponse.json({ error: 'User is not a member of the community' }, { status: 400 });
        }
        if (!community.admins.includes(memberId)) {
          community.admins.push(memberId);
          console.log('Moderator added, updated admins:', community.admins);
        }
      } else if (action === 'removeModerator') {
        if (!isCreator) {
          return NextResponse.json({ error: 'Only the creator can remove moderators' }, { status: 403 });
        }
        community.admins = community.admins.filter((admin: Types.ObjectId | string) => admin.toString() !== memberId);
        console.log('Moderator removed, updated admins:', community.admins);
      } else {
        return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
      }
    }

    const updatedCommunity = await community.save();
    const populatedCommunity = await Community.findById(id)
      .populate('members', 'username')
      .populate('admins', '_id username')
      .populate('creator', 'username');
    console.log('PUT /api/communities/[id]: Сообщество обновлено:', populatedCommunity);
    return NextResponse.json(populatedCommunity);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT /api/communities/[id] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось обновить сообщество', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const community = await Community.findById(id);

    if (!community) {
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    if (community.creator?.toString() !== userId) {
      return NextResponse.json({ error: 'Only the creator can delete the community' }, { status: 403 });
    }

    await Community.findByIdAndDelete(id);
    console.log('DELETE /api/communities/[id]: Сообщество удалено:', id);
    return NextResponse.json({ message: 'Сообщество удалено' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('DELETE /api/communities/[id] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось удалить сообщество', details: errorMessage }, { status: 500 });
  }
}