import mongoose, { Schema, Document, Types } from 'mongoose';

// Определение модели Comment
interface IComment extends Document {
  userId: Types.ObjectId;
  content: string;
  createdAt: Date;
  images?: string[];
  likes?: Types.ObjectId[];
  reactions?: { emoji: string; users: Types.ObjectId[] }[];
}

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  username: string;
  avatar?: string;
}

export interface PopulatedPost {
  _id: string;
  content: string;
  userId: { _id: string; username: string; avatar?: string } | null;
  community: { _id: string; name: string; avatar?: string } | null;
  isCommunityPost: boolean;
  createdAt: Date;
  updatedAt?: Date;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments: {
    _id: string;
    userId: { _id: string; username: string; avatar?: string } | null;
    content: string;
    createdAt: Date;
    images?: string[];
    likes?: string[];
    reactions?: { emoji: string; users: string[] }[];
  }[];
}

export interface PostDocument extends Document {
  userId: UserDocument | Types.ObjectId | null;
  community: Types.ObjectId | null;
  isCommunityPost: boolean;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: Types.ObjectId[];
  reactions: { emoji: string; users: Types.ObjectId[] }[];
  images: string[];
  comments: Types.ObjectId[]; // Ссылка на коллекцию Comment
}

export interface LeanPostDocument {
  _id: string;
  userId?: { _id: string; username: string; avatar?: string } | string | null;
  community?: string | null;
  isCommunityPost: boolean;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: string[];
  reactions: { emoji: string; users: string[] }[];
  images: string[];
  comments?: {
    _id: string;
    userId: { _id: string; username: string; avatar?: string } | string;
    content: string;
    createdAt: string;
    images?: string[];
    likes?: string[];
    reactions?: { emoji: string; users: string[] }[];
  }[];
}

const PostSchema = new mongoose.Schema<PostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null },
    isCommunityPost: { type: Boolean, default: false },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    reactions: [{ emoji: String, users: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] }],
    images: [{ type: String, default: [] }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment', default: [] }],
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model<PostDocument>('Post', PostSchema);

// Опционально: Добавление модели Comment
const CommentSchema = new mongoose.Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  images: [{ type: String, default: [] }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  reactions: [{ emoji: String, users: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] }],
});

export const CommentModel = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);