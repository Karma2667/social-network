import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb.js'; // Исправлено расширение на .ts
import User from '../models/User.js';      // Исправлено расширение на .ts

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-network';

async function migrateUsers() {
  try {
    await dbConnect();
    console.log('Подключение к MongoDB успешно');

    const users = await User.find();
    for (const user of users) {
      let updated = false;
      if (!user.followers) {
        user.followers = [];
        updated = true;
      }
      if (!user.following) {
        user.following = [];
        updated = true;
      }
      if (!user.friends) {
        user.friends = [];
        updated = true;
      }
      if (!user.friendRequests) {
        user.friendRequests = [];
        updated = true;
      }
      if (updated) {
        await user.save();
        console.log(`Обновлён пользователь: ${user.username}`);
      }
    }
    console.log('Миграция завершена');
  } catch (error) {
    console.error('Ошибка миграции:', error);
  } finally {
    await mongoose.connection.close();
  }
}

migrateUsers();