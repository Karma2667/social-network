import { NextResponse } from "next/server";
import { connectToDB, mongoose } from "@/app/lib/mongoDB";
import Message from "@/models/Message";

interface Reaction {
  emoji: string;
  users: string[];
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  console.time(`POST /api/messages/${params.id}/reactions: Total`);
  try {
    await connectToDB();
    const headerUserId = request.headers.get("x-user-id");
    const { emoji } = await request.json();

    console.log(`POST /api/messages/${params.id}/reactions: Получены данные`, { headerUserId, emoji });

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      console.log(`POST /api/messages/${params.id}/reactions: Некорректный messageId`);
      return NextResponse.json({ error: "Некорректный ID сообщения" }, { status: 400 });
    }

    if (!headerUserId || !mongoose.Types.ObjectId.isValid(headerUserId)) {
      console.log(`POST /api/messages/${params.id}/reactions: Отсутствует или некорректный x-user-id`);
      return NextResponse.json({ error: "Требуется валидный userId в заголовке" }, { status: 401 });
    }

    if (!emoji || typeof emoji !== "string") {
      console.log(`POST /api/messages/${params.id}/reactions: Требуется emoji`);
      return NextResponse.json({ error: "Требуется emoji" }, { status: 400 });
    }

    const allowedEmojis = ["🤡", "👍", "👎", "❤️", "😂", "😢", "😮", "😡", "🤯", "🤩", "👏", "🙌", "🔥", "🎉"];
    if (!allowedEmojis.includes(emoji)) {
      console.log(`POST /api/messages/${params.id}/reactions: Недопустимый emoji`, emoji);
      return NextResponse.json({ error: "Недопустимый emoji" }, { status: 400 });
    }

    const message = await Message.findById(params.id);
    if (!message) {
      console.log(`POST /api/messages/${params.id}/reactions: Сообщение не найдено`);
      return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
    }

    message.reactions = message.reactions || [];
    const userCurrentReaction = message.reactions.find((r: Reaction) => r.users.includes(headerUserId));
    if (userCurrentReaction && userCurrentReaction.emoji === emoji) {
      // Удаляем реакцию, если пользователь уже выбрал этот emoji
      userCurrentReaction.users = userCurrentReaction.users.filter((id: string) => id !== headerUserId);
      if (userCurrentReaction.users.length === 0) {
        message.reactions = message.reactions.filter((r: Reaction) => r.users.length > 0);
      }
    } else {
      // Удаляем старую реакцию пользователя, если она была
      if (userCurrentReaction) {
        userCurrentReaction.users = userCurrentReaction.users.filter((id: string) => id !== headerUserId);
        if (userCurrentReaction.users.length === 0) {
          message.reactions = message.reactions.filter((r: Reaction) => r.users.length > 0);
        }
      }
      // Добавляем новую реакцию
      const reactionIndex = message.reactions.findIndex((r: Reaction) => r.emoji === emoji);
      if (reactionIndex === -1) {
        message.reactions.push({ emoji, users: [headerUserId] });
      } else {
        message.reactions[reactionIndex].users.push(headerUserId);
      }
    }

    await message.save();

    console.log(`POST /api/messages/${params.id}/reactions: Реакция обновлена для сообщения`, params.id);
    console.timeEnd(`POST /api/messages/${params.id}/reactions: Total`);
    return NextResponse.json({
      _id: message._id.toString(),
      reactions: message.reactions,
    }, { status: 200 });
  } catch (error: any) {
    console.error(`POST /api/messages/${params.id}/reactions: Ошибка:`, error.message, error);
    console.timeEnd(`POST /api/messages/${params.id}/reactions: Total`);
    return NextResponse.json({ error: "Не удалось обновить реакцию", details: error.message }, { status: 500 });
  }
}