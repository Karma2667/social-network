import mongoose from 'mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import Message from '@/models/Message';
import Community from '@/models/Community';
import Notification from '@/models/Notification';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-network';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      mongoose.model('User', User.schema);
      mongoose.model('Post', Post.schema);
      mongoose.model('Message', Message.schema);
      mongoose.model('Community', Community.schema);
      mongoose.model('Notification', Notification.schema);
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;