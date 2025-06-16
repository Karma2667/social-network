import mongoose, { Schema, Document } from "mongoose";

// Интерфейс для документа Message
interface IMessage extends Document {
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
  readBy: string[];
  editedAt?: Date; // Добавляем поле для времени редактирования
  __v?: number;
}

// Интерфейс для lean-версии Message
export interface LeanMessage {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
  readBy: string[];
  editedAt?: Date; // Добавляем в lean-версию
  __v?: number;
}

const MessageSchema = new Schema<IMessage>({
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: String }],
  editedAt: { type: Date }, // Опциональное поле для времени редактирования
});

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);