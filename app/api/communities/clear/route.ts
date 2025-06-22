import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/mongoDB'; // Исправленный импорт
import Community from '@/models/Community';

export async function DELETE(request: Request) {
  try {
    await connectToDB();
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Требуется userId' }, { status: 401 });
    }

    const deletedCount = await Community.deleteMany({});
    console.log(`DELETE /api/communities/clear: Удалено сообществ: ${deletedCount.deletedCount}`);

    return NextResponse.json({ message: `Удалено ${deletedCount.deletedCount} сообществ` });
  } catch (error: any) {
    console.error('DELETE /api/communities/clear ошибка:', error);
    return NextResponse.json({ error: 'Не удалось очистить сообщества', details: error.message }, { status: 500 });
  }
}