import { NextResponse } from 'next/server';

// Тестовый лог для проверки загрузки
process.stdout.write('POST /api/comments: Файл route.ts загружен и выполняется\n');

export async function POST(request: Request) {
  process.stdout.write('POST /api/comments: Запрос получен\n');
  try {
    process.stdout.write('POST /api/comments: Обработка запроса...\n');
    const formData = await request.formData();
    const content = formData.get('content') as string;
    process.stdout.write(`POST /api/comments: Получен content: ${content}\n`);

    // Имитация структуры комментария
    const mockComment = {
      _id: `test_${Date.now()}`,
      userId: { _id: '67d2a7a473abc791ba0f20b8', username: 'test5' },
      content,
      createdAt: new Date().toISOString(),
      images: [],
    };

    process.stdout.write(`POST /api/comments: Возвращаемый комментарий: ${JSON.stringify(mockComment)}\n`);
    return NextResponse.json(mockComment, { status: 201 }); // 201 для создания ресурса
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    process.stdout.write(`POST /api/comments: Ошибка: ${errorMessage}\n`);
    return NextResponse.json({ error: 'Ошибка обработки комментария', details: errorMessage }, { status: 500 });
  }
}