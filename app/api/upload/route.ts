import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/mongodb';

export async function POST(request: Request) {
  console.time('POST /api/upload: Total');
  console.log('POST /api/upload: Запрос получен');

  try {
    await dbConnect();
    console.log('POST /api/upload: MongoDB подключен');

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      console.log('POST /api/upload: Отсутствуют файлы');
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

    console.log('POST /api/upload: Изображения загружены:', uploadedFiles);
    console.timeEnd('POST /api/upload: Total');
    return NextResponse.json({ files: uploadedFiles }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('POST /api/upload: Ошибка:', errorMessage, error);
    console.timeEnd('POST /api/upload: Total');
    return NextResponse.json({ error: 'Ошибка загрузки изображений', details: errorMessage }, { status: 500 });
  }
}