import mongoose, { Schema } from 'mongoose';

const PostSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  community: { type: Schema.Types.ObjectId, ref: 'Community', default: null },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Массив ID пользователей, лайкнувших пост
});

export default mongoose.models.Post || mongoose.model('Post', PostSchema);