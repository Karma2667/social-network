import mongoose from 'mongoose';

const CommunityMessageSchema = new mongoose.Schema({
  community: { type: String, required: true },
  sender: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.CommunityMessage || mongoose.model('CommunityMessage', CommunityMessageSchema, 'communityMessages');