import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import ProfileView from "@/models/ProfileView";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const params = await context.params;
  const { id } = params;
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "UserId is required" }, { status: 400 });
  }

  try {
    const user = await User.findById(id).select("-password").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Логируем просмотр профиля
    await ProfileView.create({ userId: id, viewerId: userId });

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}