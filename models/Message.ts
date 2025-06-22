import mongoose, { Schema, Document } from "mongoose";

// Интерфейс для реакции
interface Reaction {
  emoji: string;
  users: string[];
}

// Интерфейс для документа Message
interface IMessage extends Document {
  senderId: string;
  recipientId: string;
  content: string;
  encryptedContent: string;
  createdAt: Date;
  isRead: boolean;
  readBy: string[];
  editedAt?: Date;
  reactions?: Reaction[];
  replyTo?: string;
  __v?: number;
}

// Интерфейс для lean-версии Message
export interface LeanMessage {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  encryptedContent: string;
  createdAt: Date;
  isRead: boolean;
  readBy: string[];
  editedAt?: Date;
  reactions?: Reaction[];
  replyTo?: string;
  __v?: number;
}

const MessageSchema = new Schema<IMessage>({
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  content: { type: String, required: true },
  encryptedContent: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: String }],
  editedAt: { type: Date },
  reactions: [{ emoji: String, users: [{ type: String }] }],
  replyTo: { type: String, ref: "Message", default: null },
});

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);