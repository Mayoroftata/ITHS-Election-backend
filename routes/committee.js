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
    const Candidate = (await import('../models/Candidate.js')).default;
    const Vote = (await import('../models/Vote.js')).default;

    // Aggregate votes per candidate
    const voteCounts = await Vote.aggregate([
      {
        $group: {
          _id: { candidateId: '$candidateId', position: '$position' },
          voteCount: { $sum: 1 }
        }
      },
      {
        $project: {
          candidateId: '$_id.candidateId',
          position: '$_id.position',
          voteCount: 1,
          _id: 0
        }
      }
    ]);

    // Fetch all candidates
    const candidates = await Candidate.find().sort({ createdAt: -1 });

    // Merge vote counts with candidates
    const candidatesWithVotes = candidates.map(candidate => {
      const voteData = voteCounts.find(v => v.candidateId === candidate._id.toString() && v.position === candidate.position);
      return {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        position: candidate.position,
        createdAt: candidate.createdAt,
        voteCount: voteData ? voteData.voteCount : 0
      };
    });

    // Group by position
    const groupedByPosition = candidatesWithVotes.reduce((acc, candidate) => {
      acc[candidate.position] = acc[candidate.position] || [];
      acc[candidate.position].push(candidate);
      return acc;
    }, {});

    res.json({ success: true, data: groupedByPosition });
  } catch (err) {
    console.error('Fetch candidates with votes error:', err);
    res.status(500).json({ success: false, msg: 'Error fetching candidates' });
  }
});

export default committeeRoutes;