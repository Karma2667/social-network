import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  console.time('POST /api/upload: Total');
  process.stdout.write('POST /api/upload: Запрос получен\n');

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      process.stdout.write('POST /api/upload: Отсутствуют файлы\n');
      return NextResponse.json({ error: 'Требуются изображения' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const uploadedFiles = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      uploadedFiles.push(`/uploads/${fileName}`);
    }

    process.stdout.write(`POST /api/upload: Изображения загружены: ${JSON.stringify(uploadedFiles)}\n`);
    console.timeEnd('POST /api/upload: Total');
    return NextResponse.json({ files: uploadedFiles }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    process.stdout.write(`POST /api/upload: Ошибка: ${JSON.stringify({ message: errorMessage, rawError: error })}\n`);
    console.timeEnd('POST /api/upload: Total');
    return NextResponse.json({ error: 'Ошибка загрузки изображений', details: errorMessage }, { status: 500 });
  }
}