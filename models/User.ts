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
}

// Интерфейс для lean-версии User
export interface LeanUser {
  _id: string;
  username: string;
  name?: string;
  interests: string[];
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
      validator: (v: string[]) => v.length <= 5, // Ограничение до 5 интересов
      message: 'Максимум 5 интересов'
    }
  }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);