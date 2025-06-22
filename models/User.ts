import mongoose, { Schema, Document, Types } from 'mongoose';

// Интерфейс пользователя
interface IUser extends Document {
  username: string;
  name?: string;
  email: string;
  password: string;
  bio?: string;
  interests: string[];
  avatar?: string;
  createdAt: Date;
  posts?: Types.ObjectId[];
  following?: Types.ObjectId[];
  communities?: Types.ObjectId[];
}

export interface LeanUser {
  _id: string;
  username: string;
  name?: string;
  email?: string;
  password?: string;
  bio?: string;
  interests?: string[];
  avatar?: string;
  createdAt?: Date;
  posts?: string[];
  following?: { _id: string; username: string }[];
  communities?: string[];
}

// Экспортируем UserDocument как синоним IUser
export type UserDocument = IUser;

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  interests: [{
    type: String,
    default: [],
    validate: {
      validator: (v: string[]) => v.length <= 5,
      message: 'Интересов не может быть больше 5',
    },
  }],
  avatar: { type: String, default: '/default-avatar.png' },
  createdAt: { type: Date, default: Date.now },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  communities: [{ type: Schema.Types.ObjectId, ref: 'Community' }],
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);