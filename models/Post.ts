import mongoose, { Schema, Document, Types } from 'mongoose';

export interface PostDocument extends Document {
  userId: Types.ObjectId | null;
  community: Types.ObjectId | null;
  isCommunityPost: boolean;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: Types.ObjectId[];
  reactions: { emoji: string; users: Types.ObjectId[] }[];
  images: string[];
  comments: Types.ObjectId[];
}

const PostSchema = new mongoose.Schema<PostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null },
    isCommunityPost: { type: Boolean, default: false },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    reactions: [{ emoji: String, users: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] }],
    images: [{ type: String, default: [] }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment', default: [] }],
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model<PostDocument>('Post', PostSchema);