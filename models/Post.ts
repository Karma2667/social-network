import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  user: mongoose.Types.ObjectId;
  content: string;
  images: string[];
  likes: mongoose.Types.ObjectId[];
  community?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PostSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  images: [{ type: String }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  community: { type: Schema.Types.ObjectId, ref: 'Community' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);