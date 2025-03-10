import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('GET user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const { username, bio } = await request.json();
    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Обновляем только переданные поля
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio; // Позволяем очистить bio
    await user.save();
    return NextResponse.json(user);
  } catch (error) {
    console.error('PUT user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}