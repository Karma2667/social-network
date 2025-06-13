// app/models/Community.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface CommunityDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  interests: string[];
  creator: Types.ObjectId;
  members: Types.ObjectId[];
  admins: Types.ObjectId[];
  avatar?: string;
  createdAt: Date;
  updatedAt?: Date;
}

const CommunitySchema = new mongoose.Schema<CommunityDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    interests: [{ type: String, default: [] }],
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    avatar: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Community || mongoose.model<CommunityDocument>('Community', CommunitySchema);