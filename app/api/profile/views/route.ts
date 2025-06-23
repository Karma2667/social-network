import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ProfileView from "@/models/ProfileView";
import mongoose from "mongoose";

export async function GET(request: Request) {
  console.time("GET /api/profile/views: Total");
  console.log("GET /api/profile/views: Request received");
  try {
    await dbConnect();
    console.log("GET /api/profile/views: MongoDB connected");

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      console.log("GET /api/profile/views: Missing x-user-id");
      return NextResponse.json({ error: "UserId is required" }, { status: 400 });
    }

    const views = await ProfileView.find({ userId })
      .populate("viewerId", "username")
      .sort({ viewedAt: -1 })
      .lean();

    console.log("GET /api/profile/views: Views found:", views.length);
    console.timeEnd("GET /api/profile/views: Total");
    return NextResponse.json(views, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("GET /api/profile/views: Error:", errorMessage);
    console.timeEnd("GET /api/profile/views: Total");
    return NextResponse.json(
      { error: "Failed to load profile views", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('POST /api/profile/views: Request received');
  await dbConnect();
  const userId = request.headers.get("x-user-id");
  const { profileId } = await request.json();

  console.log('POST /api/profile/views: Parameters:', { userId, profileId });

  if (!userId || !profileId) {
    console.log('POST /api/profile/views: Missing required fields');
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    if (userId === profileId) {
      console.log('POST /api/profile/views: Self-view ignored');
      return NextResponse.json({ message: "Self-view ignored" }, { status: 200 });
    }

    const existingView = await ProfileView.findOne({ userId: profileId, viewerId: new mongoose.Types.ObjectId(userId) });
    if (!existingView) {
      console.log('POST /api/profile/views: Creating new view entry');
      await ProfileView.create({ userId: profileId, viewerId: new mongoose.Types.ObjectId(userId) });
    } else {
      console.log('POST /api/profile/views: View already exists');
    }
    return NextResponse.json({ message: "View logged" }, { status: 201 });
  } catch (error) {
    console.error('POST /api/profile/views: Error:', error);
    return NextResponse.json({ error: "Failed to log profile view" }, { status: 500 });
  }
}