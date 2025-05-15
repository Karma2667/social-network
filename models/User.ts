import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  bio: string;
  avatar: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '/default-avatar.png' },
  createdAt: { type: Date, default: Date.now },
});

console.log('UserSchema: Модель создана, email required:', UserSchema.path('email').isRequired);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);