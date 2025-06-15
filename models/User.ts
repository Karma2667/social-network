import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  username: string;
  name?: string;
  email: string;
  password: string;
  bio?: string;
  interests: string[];
  avatar?: string;
  createdAt: Date;
  posts?: mongoose.Types.ObjectId[];
  following?: mongoose.Types.ObjectId[];
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
  posts?: any[];
  following?: { _id: string; username: string }[];
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
    validate: (v: string[]) => v.length <= 5,
  }],
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);