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
      const messages = await Message.find({
        $or: [{ sender: userId }, { recipient: userId }],
      })
        .populate('sender', 'username')
        .populate('recipient', 'username')
        .sort({ createdAt: -1 });

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

    const sender = await User.findById(senderId);
    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      content,
      read: false,
    });

    const notificationRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: recipientId,
        type: 'message',
        content: `${sender.username} sent you a message`,
        relatedId: message._id,
        relatedModel: 'Message',
        senderId: senderId, // Добавляем senderId
      }),
    });

    if (!notificationRes.ok) {
      console.error('Failed to create notification:', await notificationRes.text());
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Send message error:', errorMessage);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}