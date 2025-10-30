import express from 'express';
import Committee from '../models/committee.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const committeeRoutes = router;

// Middleware to verify JWT
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await Committee.findById(decoded.id).select('-surname');
    next();
  } catch (err) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// POST /api/committee/signup
committeeRoutes.post('/signup', async (req, res) => {
  const { email, surname } = req.body;
  try {
    let committee = await Committee.findOne({ email });
    if (committee) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    committee = new Committee({ email, surname });
    await committee.save();
    res.status(201).json({ message: 'Signup successful. You can now login.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/committee/login
committeeRoutes.post('/login', async (req, res) => {
  const { email, surname } = req.body;
  try {
    const committee = await Committee.findOne({ email });
    if (!committee || !(await committee.compareSurname(surname))) {
      return res.status(401).json({ message: 'Invalid email or surname' });
    }
    const token = jwt.sign({ id: committee._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({
      msg: 'Login successful',
      token,
      user: { 
        email: committee.email,
        surname: committee.surname 
      }
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/committee/candidates - Protected, list all candidates


// GET /api/committee/candidates - List candidates with vote counts
committeeRoutes.get('/candidates', protect, async (req, res) => {
  try {
    const Candidate = require('../models/Candidate');
    const Vote = require('../models/Vote');

    // First, try just fetching candidates without votes
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    
    // If this works, then try the aggregation
    let voteCounts = [];
    try {
      voteCounts = await Vote.aggregate([
        {
          $group: {
            _id: '$candidateId',
            voteCount: { $sum: 1 },
            position: { $first: '$position' }
          }
        }
      ]);
    } catch (aggError) {
      console.log('Aggregation error, using empty vote counts:', aggError);
      voteCounts = [];
    }

    // Merge data
    const candidatesWithVotes = candidates.map(candidate => {
      const voteData = voteCounts.find(v => 
        v._id && v._id.toString() === candidate._id.toString()
      );
      return {
        ...candidate.toObject(),
        voteCount: voteData ? voteData.voteCount : 0
      };
    });

    // Group by position
    const groupedByPosition = candidatesWithVotes.reduce((acc, candidate) => {
      acc[candidate.position] = acc[candidate.position] || [];
      acc[candidate.position].push(candidate);
      return acc;
    }, {});

    res.json({ 
      success: true, 
      data: groupedByPosition 
    });

  } catch (err) {
    console.error('Error in /candidates:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Error fetching candidates: ' + err.message 
    });
  }
});

export default committeeRoutes;