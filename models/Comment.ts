import mongoose, { Schema, Types, Document } from 'mongoose';

interface IComment extends Document {
  userId: Types.ObjectId; // Временно используем ObjectId без рефа, если User отсутствует
  postId: Types.ObjectId;
  content: string;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, required: true }, // Убери ref: 'User' пока
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);