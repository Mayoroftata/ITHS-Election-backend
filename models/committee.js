import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const committeeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  surname: {
    type: String,
    required: [true, 'Surname is required'],
  }
}, {
  timestamps: true
});

// Hash surname before saving
committeeSchema.pre('save', async function(next) {
  if (this.isModified('surname')) {
    this.surname = await bcrypt.hash(this.surname, 10);
  }
  next();
});

// Method to compare surname
committeeSchema.methods.compareSurname = async function(providedSurname) {
  return await bcrypt.compare(providedSurname, this.surname);
};

export default mongoose.model('Committee', committeeSchema);