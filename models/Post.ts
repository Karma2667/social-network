import mongoose, { Schema, Document, Types } from 'mongoose';
import Comment from './Comment';

export interface PostDocument extends Document {
  userId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: Types.ObjectId[];
  username?: string; // Добавь, если нужно
  userAvatar?: string; // Добавь, если нужно
}

const PostSchema = new Schema<PostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    likes: [{ type: String, default: [] }],
    reactions: [{ emoji: String, users: [{ type: String }] }],
    images: [{ type: String, default: [] }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment', default: [] }],
    username: { type: String }, // Добавь, если нужно
    userAvatar: { type: String }, // Добавь, если нужно
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model<PostDocument>('Post', PostSchema);