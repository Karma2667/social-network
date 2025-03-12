import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Кому уведомление
  type: { type: String, required: true }, // Тип: 'like', 'mention', 'message', 'invite'
  content: { type: String, required: true }, // Текст уведомления
  read: { type: Boolean, default: false }, // Прочитано или нет
  createdAt: { type: Date, default: Date.now },
  relatedId: { type: Schema.Types.ObjectId, refPath: 'relatedModel' }, // Ссылка на пост, сообщение и т.д.
  relatedModel: { type: String, enum: ['Post', 'Message', 'Community'] }, // Тип связанной сущности
});

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);