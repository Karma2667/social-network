// lib/auth.ts
import { NextRequest } from 'next/server';

export function getUserId(request: Request): string {
  const userId = request.headers.get('x-user-id');
  console.log('getUserId: Extracted userId from headers:', userId); // Отладка
  if (!userId) throw new Error('No user ID provided');
  return userId;
}