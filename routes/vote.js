// routes/votes.js or wherever your vote route is
import express from 'express';
import Vote from '../models/vote.js';
import mongoose from 'mongoose';

const router = express.Router();

const voteRoutes = router;

// POST /api/votes - Submit a vote
voteRoutes.post('/', async (req, res) => {
  try {
    const { voterName, voterEmail, position, candidateId } = req.body;

    // Validate required fields
    if (!voterName || !voterEmail || !position || !candidateId) {
      return res.status(400).json({ 
        success: false, 
        msg: 'All fields are required' 
      });
    }

    // Check if voter has already voted for this position
    const existingVote = await Vote.findOne({ 
      voterEmail: voterEmail.toLowerCase(), 
      position 
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        msg: `You have already voted for ${position} position`
      });
    }

    // Create new vote
    const vote = new Vote({
      voterName: voterName.trim(),
      voterEmail: voterEmail.toLowerCase().trim(),
      position,
      candidateId: new mongoose.Types.ObjectId(candidateId)
    });

    await vote.save();

    res.status(201).json({
      success: true,
      msg: 'Vote submitted successfully!',
      data: {
        id: vote._id,
        voterName: vote.voterName,
        position: vote.position
      }
    });

  } catch (err) {
    console.error('Vote submission error:', err);
    
    // Handle duplicate vote error (from unique index)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        msg: 'You have already voted for this position'
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        msg: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Error submitting vote'
    });
  }
});

export default voteRoutes;