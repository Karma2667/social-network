import { NextResponse } from "next/server";
import { connectToDB, mongoose } from "@/app/lib/mongoDB";
import Message from "@/models/Message";

interface Reaction {
  emoji: string;
  users: string[];
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  console.time("POST /api/messages/[id]/reactions: Total");
  try {
    await connectToDB();
    const { userId, emoji } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(params.id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Некорректные ID" }, { status: 400 });
    }

    if (!emoji || typeof emoji !== "string") {
      return NextResponse.json({ error: "Требуется emoji" }, { status: 400 });
    }

    const allowedEmojis = ["🤡", "👍", "👎", "❤️", "😂", "😢", "😮", "😡", "🤯", "🤩", "👏", "🙌", "🔥", "🎉"];
    if (!allowedEmojis.includes(emoji)) {
      return NextResponse.json({ error: "Недопустимый emoji" }, { status: 400 });
    }

    const headerUserId = request.headers.get("x-user-id");
    if (!headerUserId || headerUserId !== userId) {
      return NextResponse.json({ error: "Неавторизованный доступ" }, { status: 401 });
    }

    const message = await Message.findById(params.id);
    if (!message) {
      return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
    }

    message.reactions = message.reactions || [];
    const userCurrentReaction = message.reactions.find((r: Reaction) => r.users.includes(userId));
    if (userCurrentReaction && userCurrentReaction.emoji === emoji) {
      userCurrentReaction.users = userCurrentReaction.users.filter((id: string) => id !== userId);
      if (userCurrentReaction.users.length === 0) {
        message.reactions = message.reactions.filter((r: Reaction) => r.users.length > 0);
      }
    } else {
      if (userCurrentReaction) {
        userCurrentReaction.users = userCurrentReaction.users.filter((id: string) => id !== userId);
        if (userCurrentReaction.users.length === 0) {
          message.reactions = message.reactions.filter((r: Reaction) => r.users.length > 0);
        }
      }
      const reactionIndex = message.reactions.findIndex((r: Reaction) => r.emoji === emoji);
      if (reactionIndex === -1) {
        message.reactions.push({ emoji, users: [userId] });
      } else {
        message.reactions[reactionIndex].users.push(userId);
      }
    }

    await message.save();

    console.log("POST /api/messages/[id]/reactions: Реакция обновлена:", params.id);
    console.timeEnd("POST /api/messages/[id]/reactions: Total");
    return NextResponse.json({
      _id: message._id.toString(),
      reactions: message.reactions,
    });
  } catch (error: any) {
    console.error("POST /api/messages/[id]/reactions: Ошибка:", error);
    console.timeEnd("POST /api/messages/[id]/reactions: Total");
    return NextResponse.json({ error: error.message || "Внутренняя ошибка сервера" }, { status: 500 });
  }
}