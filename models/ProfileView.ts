import mongoose, { Schema, Document } from "mongoose";

export interface ProfileViewDocument extends Document {
  userId: string; // ID владельца профиля
  viewerId: string; // ID пользователя, просмотревшего профиль
  viewedAt: Date;
}

const ProfileViewSchema = new Schema<ProfileViewDocument>(
  {
    userId: { type: String, required: true },
    viewerId: { type: String, required: true },
  },
  { timestamps: { createdAt: "viewedAt", updatedAt: false } }
);

export default mongoose.models.ProfileView || mongoose.model<ProfileViewDocument>("ProfileView", ProfileViewSchema);