import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const userId = request.headers.get('x-user-id');
    const { publicKey } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 });
    }

    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: 'Требуется publicKey' }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { publicKey },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Публичный ключ обновлён' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PATCH /api/users/keys: Ошибка:', errorMessage, error);
    return NextResponse.json({ error: 'Не удалось обновить ключ', details: errorMessage }, { status: 500 });
  }
}