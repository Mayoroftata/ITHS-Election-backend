// models/newVote.js
import mongoose from 'mongoose';

const newVoteSchema = new mongoose.Schema({
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
  },
  candidateName: {
    type: String,
    required: true
  },
  system: {
    type: String,
    default: 'new',
    enum: ['new']
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate votes per email per position in NEW system
newVoteSchema.index({ voterEmail: 1, position: 1 }, { unique: true });

// Use a different model name - 'BulkVote' instead of 'newVote'
export default mongoose.model('BulkVote', newVoteSchema);