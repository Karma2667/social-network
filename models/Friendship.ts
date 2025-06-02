import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendship extends Document {
  user1: mongoose.Types.ObjectId;
  user2: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FriendshipSchema: Schema = new Schema({
  user1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Уникальный индекс, чтобы избежать дублирования дружбы
FriendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

export default mongoose.models.Friendship || mongoose.model<IFriendship>('Friendship', FriendshipSchema);