import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

const voteSchema = new mongoose.Schema({
  voterEmail: { type: String, required: true },
  position: { type: String, required: true },
  candidateId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Vote = mongoose.model('Vote', voteSchema);

router.post('/', async (req, res) => {
  try {
    const { voterEmail, position, candidateId } = req.body;
    if (!voterEmail || !position || !candidateId) {
      return res.status(400).json({ success: false, msg: 'All fields required' });
    }

    // Verify candidate exists
    const Candidate = (await import('../models/Candidate.js')).default;
    const candidate = await Candidate.findOne({ _id: candidateId, position });
    if (!candidate) {
      return res.status(400).json({ success: false, msg: 'Invalid candidate for this position' });
    }

    const vote = new Vote({ voterEmail, position, candidateId });
    await vote.save();

    res.status(201).json({ success: true, msg: 'Vote recorded', data: vote });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

export default router;