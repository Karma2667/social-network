import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  images: { type: [String], default: [] },
  likes: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
});

console.log('PostSchema: Модель создана');
export default mongoose.models.Post || mongoose.model('Post', PostSchema);