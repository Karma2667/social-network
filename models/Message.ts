import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }, // Прочитано ли сообщение
});

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);