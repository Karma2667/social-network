import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

console.log('PostSchema: Модель создана, userId indexed: true');
export default mongoose.models.Post || mongoose.model('Post', PostSchema);