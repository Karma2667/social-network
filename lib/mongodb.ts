import mongoose from 'mongoose';
import User from '@/models/User'; // Import User model
import Post from '@/models/Post'; // Import Post model

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = {
  conn: null,
  promise: null,
};

async function dbConnect() {
  if (cached.conn) {
    console.log('MongoDB: Using cached connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log('MongoDB: Establishing new connection');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB: Connected successfully');
      // Ensure models are registered
      console.log('MongoDB: Registering models (User, Post)');
      mongoose.model('User', User.schema);
      mongoose.model('Post', Post.schema);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('MongoDB: Connection failed:', error);
    cached.promise = null;
    throw error;
  }
}

export default dbConnect;