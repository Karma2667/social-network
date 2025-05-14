import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
  readBy: string[];
}

const MessageSchema: Schema = new Schema({
  chatId: { type: String, required: true },
  senderId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: String, default: [] }],
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);