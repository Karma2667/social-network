// Обновлённый эндпоинт /app/api/messages/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Message from "@/models/Message";
import { Types } from "mongoose";

export async function GET(request: Request) {
  console.time("GET /api/messages: Total");
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = request.headers.get("x-user-id");
    const recipientId = searchParams.get("recipientId");

    if (!userId || !recipientId) {
      return NextResponse.json({ error: "Требуется userId и recipientId" }, { status: 400 });
    }

    console.log("GET /api/messages: Параметры:", { userId, recipientId });

    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId },
        { senderId: recipientId, recipientId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log("GET /api/messages: Найдены сообщения:", messages.length);

    await Message.updateMany(
      { senderId: recipientId, recipientId: userId, isRead: false },
      { $set: { isRead: true }, $addToSet: { readBy: userId } }
    );

    console.timeEnd("GET /api/messages: Total");
    return NextResponse.json(messages, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("GET /api/messages: Ошибка:", errorMessage);
    console.timeEnd("GET /api/messages: Total");
    return NextResponse.json({ error: "Ошибка загрузки сообщений", details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.time("POST /api/messages: Total");
  try {
    await dbConnect();
    const userId = request.headers.get("x-user-id");
    const { recipientId, content, replyTo } = await request.json();

    if (!userId || !recipientId || !content) {
      return NextResponse.json({ error: "Требуется userId, recipientId и content" }, { status: 400 });
    }

    console.log("POST /api/messages: Параметры:", { userId, recipientId, content, replyTo });

    const messageData = {
      senderId: userId,
      recipientId,
      content,
      isRead: false,
      readBy: [],
      reactions: [],
      replyTo: replyTo ? new Types.ObjectId(replyTo) : null, // Преобразуем replyTo в ObjectId, если указано
    };

    const message = await Message.create(messageData);

    console.log("POST /api/messages: Сообщение создано:", message);
    console.timeEnd("POST /api/messages: Total");
    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("POST /api/messages: Ошибка:", errorMessage);
    console.timeEnd("POST /api/messages: Total");
    return NextResponse.json({ error: "Ошибка отправки сообщения", details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  console.time("PUT /api/messages: Total");
  try {
    await dbConnect();
    const userId = request.headers.get("x-user-id");
    const { messageId, content } = await request.json();

    if (!userId || !messageId || !content) {
      return NextResponse.json({ error: "Требуется userId, messageId и content" }, { status: 400 });
    }

    console.log("PUT /api/messages: Параметры:", { userId, messageId, content });

    const message = await Message.findOne({ _id: messageId, senderId: userId });
    if (!message) {
      return NextResponse.json({ error: "Сообщение не найдено или доступ запрещён" }, { status: 404 });
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();

    console.log("PUT /api/messages: Сообщение обновлено:", messageId);
    console.timeEnd("PUT /api/messages: Total");
    return NextResponse.json(message, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("PUT /api/messages: Ошибка:", errorMessage);
    console.timeEnd("PUT /api/messages: Total");
    return NextResponse.json({ error: "Ошибка редактирования сообщения", details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  console.time("DELETE /api/messages: Total");
  try {
    await dbConnect();
    const userId = request.headers.get("x-user-id");
    const { messageId } = await request.json();

    if (!userId || !messageId) {
      return NextResponse.json({ error: "Требуется userId и messageId" }, { status: 400 });
    }

    console.log("DELETE /api/messages: Параметры:", { userId, messageId });

    const message = await Message.findOneAndDelete({ _id: messageId, senderId: userId });
    if (!message) {
      return NextResponse.json({ error: "Сообщение не найдено или доступ запрещён" }, { status: 404 });
    }

    console.log("DELETE /api/messages: Сообщение удалено:", messageId);
    console.timeEnd("DELETE /api/messages: Total");
    return NextResponse.json({ message: "Сообщение удалено" }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("DELETE /api/messages: Ошибка:", errorMessage);
    console.timeEnd("DELETE /api/messages: Total");
    return NextResponse.json({ error: "Ошибка удаления сообщения", details: errorMessage }, { status: 500 });
  }
}