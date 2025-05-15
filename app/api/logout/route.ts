import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('POST /api/logout: Запрос получен');
  try {
    const userId = request.headers.get('x-user-id')?.trim();
    console.log('POST /api/logout: userId:', userId);

    if (!userId) {
      console.log('POST /api/logout: Отсутствует userId');
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    console.log('POST /api/logout: Сессия завершена для userId:', userId);
    return NextResponse.json({ message: 'Выход успешен' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/logout: Ошибка:', errorMessage, error);
    return NextResponse.json({ error: 'Не удалось выйти', details: errorMessage }, { status: 500 });
  }
}