import { NextRequest, NextResponse } from 'next/server';
import { broadcastMessage } from '@/lib/websocket';

export async function POST(request: NextRequest) {
  try {
    const { senderId, recipientId, content } = await request.json();
    console.log(`POST /api/ws: Получен запрос, senderId: ${senderId}, recipientId: ${recipientId}, content: ${content}`);
    
    if (!senderId || !recipientId) {
      console.error('POST /api/ws: Отсутствует senderId или recipientId');
      return NextResponse.json({ error: 'Требуются senderId и recipientId' }, { status: 400 });
    }

    const message = await broadcastMessage(senderId, recipientId, content || '');
    console.log('POST /api/ws: Сообщение успешно отправлено:', message._id);
    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/ws: Ошибка:', error.message);
    return NextResponse.json({ error: 'Ошибка отправки сообщения', details: error.message }, { status: 500 });
  }
}