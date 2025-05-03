import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    console.log('Upload API: Получено файлов:', files.length);
    
    if (!files || files.length === 0) {
      console.error('Upload API: Нет загруженных файлов');
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const uploadedFiles: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        console.error('Upload API: Неверный тип файла:', file.type);
        return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
      }

      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = join(process.cwd(), 'public', 'uploads', fileName);
      
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      
      uploadedFiles.push(`/uploads/${fileName}`);
      console.log('Upload API: Файл загружен:', fileName);
    }

    return NextResponse.json({ files: uploadedFiles }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Upload API: Ошибка загрузки:', errorMessage);
    return NextResponse.json({ error: 'Failed to upload files', details: errorMessage }, { status: 500 });
  }
}