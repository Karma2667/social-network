import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Кому уведомление
  type: { type: String, enum: ['like', 'mention', 'message', 'invite'], required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  relatedId: { type: Schema.Types.ObjectId, refPath: 'relatedModel' },
  relatedModel: { type: String, enum: ['Post', 'Message', 'Community'], required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
});

// Индексы для оптимизации запросов
NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);