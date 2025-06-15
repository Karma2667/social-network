import { NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/mongodb";
import Message, { LeanMessage } from "@/models/Message";
import User, { LeanUser } from "@/models/User";

interface RawUser {
  _id: Types.ObjectId | string;
  username: string;
  name?: string;
  interests?: string[];
}

interface Chat {
  user: {
    _id: string;
    username: string;
    name: string;
    interests?: string[];
  };
  lastMessage: {
    _id: string;
    content: string;
    createdAt: Date;
  } | null;
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

    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { recipientId: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean() as LeanMessage[];

    console.log("GET /api/chats: Messages found:", messages.length, messages);

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

    const rawUsers = await User.find({
      _id: { $in: chatUserIds.map((id) => new Types.ObjectId(id)) },
      username: { $regex: search, $options: "i" },
    })
      .select("_id username name interests")
      .lean() as unknown as RawUser[];

    console.log("GET /api/chats: Raw users found:", rawUsers);

    const users: LeanUser[] = rawUsers.map((user) => ({
      _id: user._id.toString(),
      username: user.username,
      name: user.name || "",
      interests: user.interests || [],
    }));

    console.log("GET /api/chats: Users found:", users);

    const chats: Chat[] = users.map((user) => {
      const lastMessage = messages.find(
        (msg) =>
          (msg.senderId.toString() === userId && msg.recipientId.toString() === user._id.toString()) ||
          (msg.senderId.toString() === user._id.toString() && msg.recipientId.toString() === userId)
      );
      return {
        user: {
          _id: user._id.toString(),
          username: user.username,
          name: user.name || "",
          interests: user.interests || [],
        },
        lastMessage: lastMessage
          ? {
              _id: lastMessage._id.toString(),
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    });

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