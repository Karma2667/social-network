import { NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/mongodb";
import Message, { LeanMessage } from "@/models/Message";
import User, { LeanUser } from "@/models/User";
import Chat, { IChat } from "@/models/Chat";

interface RawUser {
  _id: Types.ObjectId | string;
  username: string;
  name?: string;
  interests?: string[];
  avatar?: string; // Добавляем поле avatar для User
}

interface ChatData {
  user: {
    _id: string;
    username: string;
    name: string;
    interests?: string[];
    avatar?: string; // Добавляем avatar в user
  };
  lastMessage: {
    _id: string;
    content: string;
    createdAt: Date;
  } | null;
  avatar?: string; // Сохраняем для обратной совместимости, если нужно
}

export async function GET(request: Request) {
  console.time("GET /api/chats: Total");
  console.log("GET /api/chats: Request received");
  try {
    await dbConnect();
    console.log("GET /api/chats: MongoDB connected");

    const { searchParams } = new URL(request.url);
    const userId = request.headers.get("x-user-id");
    const search = searchParams.get("search") || "";

    if (!userId) {
      console.log("GET /api/chats: Missing x-user-id");
      return NextResponse.json({ error: "UserId is required" }, { status: 400 });
    }

    console.log("GET /api/chats: Parameters:", { userId, search });

    // Получаем все сообщения для пользователя
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { recipientId: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean() as LeanMessage[];

    console.log("GET /api/chats: Messages found:", messages.length);

    // Извлекаем уникальные ID пользователей для чатов
    const chatUserIds = Array.from(
      new Set(
        messages
          .map((msg) =>
            msg.senderId.toString() === userId ? msg.recipientId.toString() : msg.senderId.toString()
          )
          .filter((id) => id !== userId)
      )
    );

    console.log("GET /api/chats: Chat user IDs found:", chatUserIds);

    // Получаем пользователей с фильтром по поиску, включая avatar
    const rawUsers = await User.find({
      _id: { $in: chatUserIds.map((id) => new Types.ObjectId(id)) },
      username: { $regex: search, $options: "i" },
    })
      .select("_id username name interests avatar") // Добавляем avatar
      .lean() as unknown as RawUser[];

    console.log("GET /api/chats: Raw users found:", rawUsers.length);

    const users: LeanUser[] = rawUsers.map((user) => ({
      _id: user._id.toString(),
      username: user.username,
      name: user.name || "",
      interests: user.interests || [],
      avatar: user.avatar || "", // Сохраняем avatar из профиля, даже если пустой
    }));

    console.log("GET /api/chats: Users found:", users.length);

    // Формируем чаты, используя avatar из User, а затем из Chat как резерв
    const chats: ChatData[] = await Promise.all(users.map(async (user) => {
      const lastMessage = messages.find(
        (msg) =>
          (msg.senderId.toString() === userId && msg.recipientId.toString() === user._id.toString()) ||
          (msg.senderId.toString() === user._id.toString() && msg.recipientId.toString() === userId)
      );

      // Поиск чата для получения дополнительного аватара (если есть)
      const chat = await Chat.findOne({
        members: { $all: [userId, user._id.toString()] },
      }).select("avatar").lean() as IChat | null;

      return {
        user: {
          _id: user._id.toString(),
          username: user.username,
          name: user.name || "",
          interests: user.interests || [],
          avatar: user.avatar || chat?.avatar || "/default-chat-avatar.png", // Приоритет: User.avatar > Chat.avatar > default
        },
        lastMessage: lastMessage
          ? {
              _id: lastMessage._id.toString(),
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    }));

    console.log("GET /api/chats: Chats formed:", chats);
    console.timeEnd("GET /api/chats: Total");
    return NextResponse.json(chats, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("GET /api/chats: Error:", errorMessage, error);
    console.timeEnd("GET /api/chats: Total");
    return NextResponse.json(
      { error: "Failed to load chats", details: errorMessage },
      { status: 500 }
    );
  }
}