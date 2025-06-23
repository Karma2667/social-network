import mongoose, { Schema, Document } from 'mongoose';

export interface ProfileViewDocument extends Document {
  userId: string;
  viewerId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

const ProfileViewSchema = new Schema<ProfileViewDocument>(
  {
    userId: { type: String, required: true },
    viewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'viewedAt', updatedAt: false } }
);

export default mongoose.models.ProfileView || mongoose.model<ProfileViewDocument>('ProfileView', ProfileViewSchema);