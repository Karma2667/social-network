import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

console.log('SessionSchema: Модель создана, token required:', SessionSchema.path('token').isRequired);

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);