import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const recipientId = searchParams.get('recipientId');

  try {
    if (recipientId) {
      // Возвращаем сообщения между userId и recipientId
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
      // Возвращаем список всех чатов (уникальных собеседников)
      const messages = await Message.find({
        $or: [{ sender: userId }, { recipient: userId }],
      })
        .populate('sender', 'username')
        .populate('recipient', 'username')
        .sort({ createdAt: -1 });

      // Группируем по собеседникам
      const chatList = Array.from(
        new Map(
          messages.map((msg) => {
            const otherUserId =
              msg.sender._id.toString() === userId ? msg.recipient._id.toString() : msg.sender._id.toString();
            const otherUsername =
              msg.sender._id.toString() === userId ? msg.recipient.username : msg.sender.username;
            return [otherUserId, { userId: otherUserId, username: otherUsername, lastMessage: msg }];
          })
        ).values()
      );
      return NextResponse.json(chatList);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Fetch messages error:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { senderId, recipientId, content } = await request.json();
    if (!senderId || !recipientId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      content,
      read: false,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Send message error:', errorMessage);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}