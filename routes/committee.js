import express from 'express';
import Committee from '../models/committee.js';
import Candidate from '../models/candidate.js'; // Use static import
import Vote from '../models/vote.js'; // Use static import
import BulkVote from '../models/newVote.js'; // Use static import
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

// routes/committee.js - Updated candidates endpoint
committeeRoutes.get('/candidates', protect, async (req, res) => {
  try {
    console.log('Fetching candidates with votes from both systems...');

    // Aggregate votes per candidate from OLD system
    const oldVoteCounts = await Vote.aggregate([
      {
        $group: {
          _id: { candidateId: '$candidateId', position: '$position' },
          oldVoteCount: { $sum: 1 }
        }
      },
      {
        $project: {
          candidateId: '$_id.candidateId',
          position: '$_id.position',
          oldVoteCount: 1,
          _id: 0
        }
      }
    ]);

    // Aggregate votes per candidate from NEW system
    const newVoteCounts = await BulkVote.aggregate([
      {
        $group: {
          _id: { candidateId: '$candidateId', position: '$position' },
          newVoteCount: { $sum: 1 }
        }
      },
      {
        $project: {
          candidateId: '$_id.candidateId',
          position: '$_id.position',
          newVoteCount: 1,
          _id: 0
        }
      }
    ]);

    console.log(`Found ${oldVoteCounts.length} vote counts from OLD system`);
    console.log(`Found ${newVoteCounts.length} vote counts from NEW system`);

    // Fetch all candidates
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    console.log(`Found ${candidates.length} candidates`);

    // Merge vote counts from both systems with candidates
    const candidatesWithVotes = candidates.map(candidate => {
      const oldVoteData = oldVoteCounts.find(v => 
        v.candidateId && 
        v.candidateId.toString() === candidate._id.toString() && 
        v.position === candidate.position
      );
      
      const newVoteData = newVoteCounts.find(v => 
        v.candidateId && 
        v.candidateId.toString() === candidate._id.toString() && 
        v.position === candidate.position
      );

      const oldCount = oldVoteData ? oldVoteData.oldVoteCount : 0;
      const newCount = newVoteData ? newVoteData.newVoteCount : 0;
      const totalCount = oldCount + newCount;

      return {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        position: candidate.position,
        createdAt: candidate.createdAt,
        voteCount: totalCount,
        breakdown: {
          oldSystem: oldCount,
          newSystem: newCount
        }
      };
    });

    // Group by position
    const groupedByPosition = candidatesWithVotes.reduce((acc, candidate) => {
      acc[candidate.position] = acc[candidate.position] || [];
      acc[candidate.position].push(candidate);
      return acc;
    }, {});

    console.log('Grouped by positions:', Object.keys(groupedByPosition));

    res.json({ 
      success: true, 
      data: groupedByPosition 
    });

  } catch (err) {
    console.error('Fetch candidates with votes error:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Error fetching candidates: ' + err.message
    });
  }
});

export default committeeRoutes;