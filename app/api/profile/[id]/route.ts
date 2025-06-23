// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  const userId = request.headers.get('x-user-id');

  console.log('GET /api/users/[id]: Получен userId из заголовка:', userId);
  console.log('GET /api/users/[id]: ID профиля:', id);

  if (!userId) {
    return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
  }

  try {
    const user = await User.findById(id).select('-password').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Логируем просмотр профиля (если это не сам пользователь)
    if (userId !== id) {
      const ProfileView = (await import('@/models/ProfileView')).default;
      const existingView = await ProfileView.findOne({ userId: id, viewerId: userId });
      if (!existingView) {
        await ProfileView.create({ userId: id, viewerId: userId });
        console.log('GET /api/users/[id]: Просмотр профиля залогирован');
      }
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}