import mongoose, { Schema, Document, Types } from 'mongoose';

export interface SessionDocument extends Document {
  userId: Types.ObjectId;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

const SessionSchema = new Schema<SessionDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), expires: 7 * 24 * 60 * 60 }, // TTL 7 дней
});

// Добавляем TTL-индекс
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

console.log('SessionSchema: Модель создана');
export default mongoose.models.Session || mongoose.model<SessionDocument>('Session', SessionSchema);