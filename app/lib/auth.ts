import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

export function getUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET || 'Jesus-is-die') as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('Auth: JWT verification failed:', error);
    return null;
  }
}