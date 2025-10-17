import express from 'express';
import Candidate from '../models/candidate.js'; // Fixed import name
import { sendRegistrationEmail } from '../services/emailService.js';

const router = express.Router();

const candidateRoutes = router;

// Get all candidates
candidateRoutes.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error fetching candidates'
    });
  }
});

// Register new candidate
candidateRoutes.post('/register', async (req, res) => {
  try {
    const { name, email, position } = req.body;

    // Validation
    if (!name || !email || !position) {
      return res.status(400).json({
        success: false,
        msg: 'All fields are required'
      });
    }

    // Check if already registered
    const existingCandidate = await Candidate.findOne({ email });
    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        msg: 'This email has already been used to register for a position'
      });
    }

    // Create candidate - FIXED: Use correct variable name
    const newCandidate = new Candidate({
      name,
      email,
      position
    });

    await newCandidate.save();

    // Send email notification (non-blocking) - FIXED: Use newCandidate instead of candidate
    sendRegistrationEmail(newCandidate).catch(error => {
      console.error('Email notification failed:', error);
    });

    res.status(201).json({
      success: true,
      msg: 'Registration successful! The election committee has been notified.',
      data: newCandidate // FIXED: Use newCandidate instead of candidate
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        msg: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Server error during registration'
    });
  }
});

export default router; 