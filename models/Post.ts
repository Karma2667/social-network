import mongoose, { Schema, Document, Types } from 'mongoose';

export interface PostDocument extends Document {
  userId: Types.ObjectId;
  community: Types.ObjectId | null; // Добавлено поле для сообщества
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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null }, // Добавлено поле для сообщества
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    likes: [{ type: String, default: [] }],
    reactions: [{ emoji: String, users: [{ type: String }] }],
    images: [{ type: String, default: [] }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment', default: [] }],
    username: { type: String }, // Опционально, если нужно хранить локально
    userAvatar: { type: String }, // Опционально, если нужно хранить локально
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model<PostDocument>('Post', PostSchema);