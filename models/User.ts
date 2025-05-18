import mongoose, { Schema, Document } from 'mongoose';

// Интерфейс для документа User
interface IUser extends Document {
  username: string;
  name?: string;
  email: string;
  password: string;
  bio?: string;
  createdAt: Date;
}

// Интерфейс для lean-версии User
export interface LeanUser {
  _id: string;
  username: string;
  name?: string;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);