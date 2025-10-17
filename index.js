import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import candidateRoutes from './routes/candidate.js';
import committeeRoutes from './routes/committee.js';
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'https://iths-election-frontend.vercel.app'
]

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin 
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/candidates', candidateRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

app.use('/api/committee', committeeRoutes);

app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'ITHS Election Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      candidates: '/api/candidates',
      committee: '/api/committee',
      votes: '/api/votes' // You'll need to implement this
    },
    documentation: 'Add your API docs link here'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    msg: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    msg: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});