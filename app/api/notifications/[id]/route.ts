import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await params;
    const { read } = await request.json();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Некорректный ID уведомления' }, { status: 400 });
    }
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read },
      { new: true }
    );
    if (!notification) {
      return NextResponse.json({ error: 'Уведомление не найдено' }, { status: 404 });
    }
    return NextResponse.json(notification);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('PUT notification ошибка:', errorMessage);
    return NextResponse.json({ error: 'Не удалось обновить уведомление', details: errorMessage }, { status: 500 });
  }
}