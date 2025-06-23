import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message, { LeanMessage } from '@/models/Message';
import mongoose from 'mongoose';

interface Reaction {
  emoji: string;
  users: string[];
}

export async function GET(request: Request) {
  console.time('GET /api/messages: Total');
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');

    console.log('GET /api/messages: Параметры:', { userId, recipientId });

    if (!userId || !recipientId) {
      console.log('GET /api/messages: Отсутствует userId или recipientId', { userId, recipientId });
      return NextResponse.json({ error: 'Требуется userId и recipientId' }, { status: 400 });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId },
        { senderId: recipientId, recipientId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean() as LeanMessage[];

    console.log('GET /api/messages: Найдено сообщений:', messages.length);
    console.timeEnd('GET /api/messages: Total');
    return NextResponse.json(messages, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/messages: Ошибка сервера:', error.message);
    console.timeEnd('GET /api/messages: Total');
    return NextResponse.json({ error: 'Ошибка сервера', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time('POST /api/messages: Total');
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { recipientId, content, encryptedContent, replyTo } = await request.json();

    console.log('POST /api/messages: Получены данные:', { userId, recipientId, content, encryptedContent, replyTo });

    if (!userId || !recipientId || !content || !encryptedContent) {
      console.log('POST /api/messages: Отсутствуют необходимые данные', { userId, recipientId, content, encryptedContent });
      return NextResponse.json({ error: 'Требуются userId, recipientId, content и encryptedContent' }, { status: 400 });
    }

    const messageData: Partial<LeanMessage> = {
      senderId: userId,
      recipientId,
      content,
      encryptedContent,
      isRead: userId === recipientId,
      readBy: userId === recipientId ? [userId] : [],
      replyTo: replyTo || null,
    };

    const message = await Message.create(messageData);
    console.log('POST /api/messages: Сообщение создано:', message._id);
    console.timeEnd('POST /api/messages: Total');
    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/messages: Ошибка сервера:', error.message);
    console.timeEnd('POST /api/messages: Total');
    return NextResponse.json({ error: 'Не удалось отправить сообщение', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  console.time('PUT /api/messages: Total');
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { messageId, content, encryptedContent } = await request.json();

    console.log('PUT /api/messages: Получены данные:', { userId, messageId, content, encryptedContent });

    if (!userId || !messageId || !content || !encryptedContent) {
      console.log('PUT /api/messages: Отсутствуют необходимые данные', { userId, messageId, content, encryptedContent });
      return NextResponse.json({ error: ' Support for message editing is not implemented' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      console.log('PUT /api/messages: Сообщение не найдено:', messageId);
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    if (message.senderId !== userId) {
      console.log('PUT /api/messages: Нет доступа для редактирования, userId:', userId, 'senderId:', message.senderId);
      return NextResponse.json({ error: 'Нет доступа для редактирования' }, { status: 403 });
    }

    message.content = content;
    message.encryptedContent = encryptedContent;
    message.editedAt = new Date();
    await message.save();

    console.log('PUT /api/messages: Сообщение обновлено:', messageId);
    console.timeEnd('PUT /api/messages: Total');
    return NextResponse.json(message, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/messages: Ошибка сервера:', error.message);
    console.timeEnd('PUT /api/messages: Total');
    return NextResponse.json({ error: 'Не удалось отредактировать сообщение', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  console.time('PATCH /api/messages: Total');
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const { emoji } = await request.json();

    console.log('PATCH /api/messages: Получены данные:', { userId, messageId, emoji });

    if (!userId || !messageId) {
      console.log('PATCH /api/messages: Отсутствуют необходимые данные', { userId, messageId });
      return NextResponse.json({ error: 'Требуются userId и messageId' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      console.log('PATCH /api/messages: Сообщение не найдено:', messageId);
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    if (!message.isRead) {
      message.isRead = true;
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
      }
    }

    if (emoji) {
      const reaction = message.reactions.find((r: Reaction) => r.emoji === emoji);
      if (reaction) {
        if (!reaction.users.includes(userId)) {
          reaction.users.push(userId);
        }
      } else {
        message.reactions.push({ emoji, users: [userId] });
      }
    }

    await message.save();
    console.log('PATCH /api/messages: Сообщение обновлено:', messageId);
    console.timeEnd('PATCH /api/messages: Total');
    return NextResponse.json(message, { status: 200 });
  } catch (error: any) {
    console.error('PATCH /api/messages: Ошибка сервера:', error.message);
    console.timeEnd('PATCH /api/messages: Total');
    return NextResponse.json({ error: 'Не удалось обновить сообщение', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  console.time('DELETE /api/messages: Total');
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { messageId } = await request.json();

    console.log('DELETE /api/messages: Получены данные:', { userId, messageId });

    if (!userId || !messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      console.log('DELETE /api/messages: Отсутствуют или некорректны данные', { userId, messageId });
      return NextResponse.json({ error: 'Требуются валидные userId и messageId' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      console.log('DELETE /api/messages: Сообщение не найдено:', messageId);
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    if (message.senderId !== userId) {
      console.log('DELETE /api/messages: Нет доступа для удаления, userId:', userId, 'senderId:', message.senderId);
      return NextResponse.json({ error: 'Нет доступа для удаления' }, { status: 403 });
    }

    await Message.deleteOne({ _id: messageId });
    console.log('DELETE /api/messages: Сообщение удалено:', messageId);
    console.timeEnd('DELETE /api/messages: Total');
    return NextResponse.json({ message: 'Сообщение успешно удалено' }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE /api/messages: Ошибка сервера:', error.message);
    console.timeEnd('DELETE /api/messages: Total');
    return NextResponse.json({ error: 'Не удалось удалить сообщение', details: error.message }, { status: 500 });
  }
}