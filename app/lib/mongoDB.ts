import mongoose, { Mongoose } from 'mongoose';

// Определяем тип для моделей Mongoose
type MongooseModels = typeof mongoose.models;

// Расширяем тип global для добавления свойства mongoose
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
    models: MongooseModels;
  } | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-network';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Инициализируем кэш для соединения
let cached: { conn: Mongoose | null; promise: Promise<Mongoose> | null; models: MongooseModels } =
  global.mongoose || {
    conn: null,
    promise: null,
    models: {},
  };

// Сохраняем кэш в global
if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectToDB(): Promise<Mongoose> {
  if (cached.conn) {
    console.log('MongoDB: Используется существующее соединение');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log('MongoDB: Подключение к базе данных...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('MongoDB: Соединение установлено');
      cached.models = mongooseInstance.models;
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('MongoDB: Ошибка подключения:', errorMessage);
    throw new Error(`Ошибка подключения к MongoDB: ${errorMessage}`);
  }
}

export default connectToDB;