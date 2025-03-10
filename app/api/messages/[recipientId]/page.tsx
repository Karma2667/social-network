import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const recipientId = searchParams.get('recipientId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (recipientId) {
      // Получение сообщений между двумя пользователями
      const messages = await Message.find({
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId },
        ],
      })
        .populate('sender', 'username')
        .populate('recipient', 'username')
        .sort({ createdAt: 1 });
      return NextResponse.json(messages);
    } else {
      // Получение списка всех собеседников
      const messages = await Message.find({
        $or: [{ sender: userId }, { recipient: userId }],
      })
        .populate('sender', 'username')
        .populate('recipient', 'username')
        .sort({ createdAt: -1 });

      // Извлекаем уникальных собеседников
      const uniqueUsers = new Set<string>();
      messages.forEach((msg) => {
        if (msg.sender._id.toString() !== userId) uniqueUsers.add(msg.sender._id.toString());
        if (msg.recipient._id.toString() !== userId) uniqueUsers.add(msg.recipient._id.toString());
      });

      const chatUsers = await Promise.all(
        [...uniqueUsers].map(async (id) => {
          const user = await import('@/models/User').then((m) => m.default.findById(id));
          return { _id: id, username: user?.username || 'Unknown' };
        })
      );

      return NextResponse.json(chatUsers);
    }
  } catch (error) {
    console.error('GET messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { sender, recipient, content } = await request.json();
    if (!sender || !recipient || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const message = await Message.create({ sender, recipient, content });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('POST message error:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}