import mongoose, { Schema } from 'mongoose';

const CommunitySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Community || mongoose.model('Community', CommunitySchema);