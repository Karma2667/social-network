import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const user = await User.findById(params.id, 'username');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Fetch user error:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}