import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    return NextResponse.json(notifications);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET notifications error:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch notifications', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { userId, type, content, relatedId, relatedModel } = await request.json();
    if (!userId || !type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const notification = await Notification.create({
      user: userId,
      type,
      content,
      relatedId,
      relatedModel,
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST notification error:', errorMessage);
    return NextResponse.json({ error: 'Failed to create notification', details: errorMessage }, { status: 500 });
  }
}