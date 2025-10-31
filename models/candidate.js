import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
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
  }
}, {
  timestamps: true
});

// Index for faster queries
candidateSchema.index({ email: 1 });
candidateSchema.index({ position: 1 });
candidateSchema.index({ createdAt: -1 });

export default mongoose.model('Candidates', candidateSchema);