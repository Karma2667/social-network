import { NextResponse } from 'next/server';
import { connectToDB, mongoose } from '@/app/lib/mongoDB';
import User from '@/models/User';

// Интерфейсы для типизации
interface UserMinimal {
  _id: string;
  username: string;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('GET /api/users/[id]/follow-friends: Подключение к MongoDB...');
    await connectToDB();
    console.log('GET /api/users/[id]/follow-friends: MongoDB подключен');

    const params = await context.params;
    const userId = params.id;
    console.log('GET /api/users/[id]/follow-friends: Получен userId:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('GET /api/users/[id]/follow-friends: Некорректный ID пользователя:', userId);
      return NextResponse.json({ error: 'Некорректный ID пользователя' }, { status: 400 });
    }

    const user = await User.findById(userId)
      .populate('followers', 'username _id')
      .populate('friends', 'username _id')
      .lean() as { followers: UserMinimal[]; friends: UserMinimal[] } | null;

    if (!user) {
      console.log('GET /api/users/[id]/follow-friends: Пользователь не найден:', userId);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    console.log('GET /api/users/[id]/follow-friends: Загружены данные:', {
      followers: user.followers,
      friends: user.friends,
    });
    return NextResponse.json({
      followers: user.followers || [],
      friends: user.friends || [],
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('GET /api/users/[id]/follow-friends ошибка:', errorMessage);
    return NextResponse.json({ error: 'Не удалось загрузить данные', details: errorMessage }, { status: 500 });
  }
}