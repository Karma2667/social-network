// app/models/Comment.ts
import mongoose, { Schema, Types } from 'mongoose';

interface IComment {
  userId: Types.ObjectId;
  content: string; // Changed from 'comment' to 'content' for consistency
  createdAt: number;
}

const CommentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
  content: { type: String, required: true },
  createdAt: { type: Number, default: Date.now },
});

export default mongoose.models.comment || mongoose.model<IComment>('Comment', CommentSchema);