// models/Vote.js
import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  voterName: {
    type: String,
    required: true,
    trim: true
  },
  voterEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  position: {
    type: String,
    required: true,
    enum: [
      'Chairman',
      'Vice-Chairman',
      'Treasurer 1',
      'Treasurer 2',
      'Welfare 1',
      'Welfare 2',
      'Secretary 1',
      'Secretary 2',
      'PRO 1',
      'PRO 2',
      'Social Director 1',
      'Social Director 2'
    ]
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  }
}, {
  timestamps: true
});

// Add compound index to prevent duplicate votes
voteSchema.index({ voterEmail: 1, position: 1 }, { unique: true });

export default mongoose.model('Vote', voteSchema);