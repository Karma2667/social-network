import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ message: 'Connected to MongoDB!' });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ error: 'Connection failed' }, { status: 500 });
  }
}