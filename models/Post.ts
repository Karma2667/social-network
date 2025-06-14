import mongoose, { Schema, Document, Types } from 'mongoose';

export interface PostDocument extends Document {
  userId: Types.ObjectId | null;
  community: Types.ObjectId | null;
  isCommunityPost: boolean;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: Types.ObjectId[];
  username?: string;
  userAvatar?: string;
}

const PostSchema = new mongoose.Schema<PostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null },
    isCommunityPost: { type: Boolean, default: false },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    likes: [{ type: String, default: [] }],
    reactions: [{ emoji: String, users: [{ type: String }] }],
    images: [{ type: String, default: [] }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment', default: [] }],
    username: { type: String },
    userAvatar: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model<PostDocument>('Post', PostSchema);