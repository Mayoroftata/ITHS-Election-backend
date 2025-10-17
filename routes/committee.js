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
committeeRoutes.get('/candidates', protect, async (req, res) => {
  try {
    const Candidate = (await import('../models/candidate.js')).default;
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default committeeRoutes;