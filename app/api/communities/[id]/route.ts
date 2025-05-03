import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Community from '@/models/Community';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const params = await context.params; // Асинхронное получение params
  const { id } = params;

  try {
    console.log('GET /api/communities/[id]: Подключение к MongoDB...');
    await dbConnect();
    console.log('GET /api/communities/[id]: MongoDB подключен');

    const community = await Community.findById(id)
      .populate('creator', 'username')
      .populate('members', 'username')
      .populate('admins', 'username');

    if (!community) {
      console.log('GET /api/communities/[id]: Сообщество не найдено:', id);
      return NextResponse.json({ error: 'Сообщество не найдено' }, { status: 404 });
    }

    console.log('GET /api/communities/[id]: Загружено сообщество:', community);
    return NextResponse.json(community);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/communities/[id] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось загрузить сообщество', details: errorMessage }, { status: 500 });
  }
}