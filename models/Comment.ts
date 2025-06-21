import mongoose, { Schema, Types, Document } from 'mongoose';

interface IComment extends Document {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  content: string;
  createdAt: Date;
  likes?: Types.ObjectId[];
  reactions?: { emoji: string; users: Types.ObjectId[] }[];
  images?: string[];
}

const CommentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{ emoji: String, users: [{ type: Schema.Types.ObjectId, ref: 'User' }] }],
  images: [String],
});

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);