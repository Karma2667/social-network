import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  name: string;
  bio: string;
  avatar: string;
  createdAt: Date;
}

const UserSchema: Schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: '', trim: true },
  bio: { type: String, default: '', trim: true },
  avatar: { type: String, default: '/default-avatar.png' },
  createdAt: { type: Date, default: Date.now },
});

// Создание индекса для username
UserSchema.index({ username: 1 }, { unique: true });

console.log('UserSchema: Модель создана, username unique:', UserSchema.path('username').options.unique);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);