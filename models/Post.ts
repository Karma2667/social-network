import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  images: { type: [String], default: [] },
  likes: { type: [String], default: [] }, // Добавляем поле likes
});

console.log('PostSchema: Модель создана');
export default mongoose.models.Post || mongoose.model('Post', PostSchema);