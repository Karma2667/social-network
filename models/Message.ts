import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, required: true },
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);