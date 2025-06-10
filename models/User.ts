import mongoose, { Schema, Document } from 'mongoose';

// Предопределённые интересы
const INTERESTS = [
  'Программирование',
  'Музыка',
  'Игры',
  'Путешествия',
  'Спорт',
  'Книги',
  'Фильмы',
  'Кулинария',
  'Искусство',
  'Наука',
];

// Интерфейс для документа User
interface IUser extends Document {
  username: string;
  name?: string;
  email: string;
  password: string;
  bio?: string;
  interests: string[];
  createdAt: Date;
  posts?: mongoose.Types.ObjectId[];
  following?: mongoose.Types.ObjectId[];
}

// Интерфейс для lean-версии User с полной структурой
export interface LeanUser {
  _id: string;
  username: string;
  name?: string;
  email?: string;
  password?: string;
  bio?: string;
  interests?: string[];
  createdAt?: Date;
  posts?: any[];
  following?: { _id: string; username: string }[];
}

// Интерфейс для ограниченного результата (только _id и username)
export interface LeanUserMinimal {
  _id: string;
  username: string;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  interests: [{ 
    type: String, 
    default: [], 
    enum: INTERESTS,
    validate: {
      validator: (v: string[]) => v.length <= 5,
      message: 'Максимум 5 интересов'
    }
  }],
  createdAt: { type: Date, default: Date.now },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);