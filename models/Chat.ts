import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  name: string;
  members: string[];
  avatar: string;
  createdAt: Date;
}

const ChatSchema: Schema = new Schema({
  name: { type: String, required: true },
  members: [{ type: String, required: true }],
  avatar: { type: String, default: '/default-chat-avatar.png' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);