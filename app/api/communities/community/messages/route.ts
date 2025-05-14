import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CommunityMessage from '@/models/CommunityMessage';

export async function GET(request: Request) {
  console.log('GET /api/community/messages: Запрос получен:', request.url);
  try {
    await dbConnect();
    console.log('GET /api/community/messages: MongoDB подключен');

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const userId = request.headers.get('x-user-id')?.trim();

    console.log('GET /api/community/messages: Параметры:', { communityId, userId });

    if (!communityId || !userId) {
      console.log('GET /api/community/messages: Отсутствуют параметры');
      return NextResponse.json({ error: 'Требуются communityId и userId' }, { status: 400 });
    }

    const messages = await CommunityMessage.find({ community: communityId })
      .sort({ createdAt: 1 })
      .lean();
    console.log('GET /api/community/messages: Найдено сообщений:', messages.length);

    return NextResponse.json(messages, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/community/messages ошибка:', errorMessage);
    return NextResponse.json({ error: 'Не удалось загрузить сообщения', details: errorMessage }, { status: 500 });
  }
}