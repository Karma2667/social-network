import mongoose, { Schema } from 'mongoose';

const CommunitySchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

export default mongoose.models.Community || mongoose.model('Community', CommunitySchema);