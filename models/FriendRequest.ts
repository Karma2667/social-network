import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendRequest extends Document {
  fromUser: mongoose.Types.ObjectId;
  toUser: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

const FriendRequestSchema: Schema = new Schema({
  fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Уникальный индекс, чтобы избежать дублирования запросов
FriendRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

export default mongoose.models.FriendRequest || mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);