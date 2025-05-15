import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }, // Без required
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

console.log('MessageSchema: Модель создана, chatId required:', MessageSchema.path('chatId').isRequired);

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);