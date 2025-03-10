import mongoose, { Schema } from 'mongoose';

const PostSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  community: { type: Schema.Types.ObjectId, ref: 'Community', default: null }, // Добавляем связь с сообществом
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Post || mongoose.model('Post', PostSchema);