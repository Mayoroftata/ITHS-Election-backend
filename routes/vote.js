// routes/votes.js
import express from 'express';
import Vote from '../models/vote.js'; // Old model - single votes
import BulkVote from '../models/newVote.js'; // New model - bulk votes (renamed from newVote)
import Candidate from '../models/candidate.js';
import mongoose from 'mongoose';
import { sendVoteConfirmationEmail, sendCommitteeVoteNotification } from '../services/emailService.js';

const router = express.Router();

const voteRoutes = router;

// POST /api/votes - Submit a single vote (OLD system - for backward compatibility)
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

    // Check if voter has already voted for this position in OLD system
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

    // Also check in NEW system to prevent cross-system duplicates
    const existingBulkVote = await BulkVote.findOne({
      voterEmail: voterEmail.toLowerCase(),
      position
    });

    if (existingBulkVote) {
      return res.status(400).json({
        success: false,
        msg: `You have already voted for ${position} position in the new system`
      });
    }

    // Create new vote in OLD system
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

// POST /api/votes/bulk - Submit multiple votes at once (NEW system)
voteRoutes.post('/bulk', async (req, res) => {
  let session;
  try {
    const { voterName, voterEmail, votes } = req.body;

    // Validate required fields
    if (!voterName || !voterEmail || !votes || !Array.isArray(votes)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Voter name, email, and votes array are required' 
      });
    }

    // Check if voter has already voted for any position in NEW system
    const existingBulkVotes = await BulkVote.find({ 
      voterEmail: voterEmail.toLowerCase() 
    });

    if (existingBulkVotes.length > 0) {
      const votedPositions = existingBulkVotes.map(vote => vote.position).join(', ');
      return res.status(400).json({
        success: false,
        msg: `You have already voted for the following positions in the new system: ${votedPositions}. Each email can only vote once per position.`
      });
    }

    // Also check OLD system to prevent cross-system voting
    const existingOldVotes = await Vote.find({
      voterEmail: voterEmail.toLowerCase()
    });

    if (existingOldVotes.length > 0) {
      const votedPositions = existingOldVotes.map(vote => vote.position).join(', ');
      return res.status(400).json({
        success: false,
        msg: `You have already voted for the following positions in the old system: ${votedPositions}. Please contact the election committee if you need assistance.`
      });
    }

    // Validate each vote and get candidate details for email
    const voteDetails = [];
    for (const vote of votes) {
      if (!vote.position || !vote.candidateId) {
        return res.status(400).json({
          success: false,
          msg: 'Each vote must have a position and candidateId'
        });
      }

      // Get candidate details for email notification
      const candidate = await Candidate.findById(vote.candidateId);
      if (!candidate) {
        return res.status(400).json({
          success: false,
          msg: `Invalid candidate selected for ${vote.position}`
        });
      }

      voteDetails.push({
        position: vote.position,
        candidateId: vote.candidateId,
        candidateName: candidate.name,
        candidateEmail: candidate.email
      });
    }

    // Create vote documents for NEW system
    const voteDocuments = voteDetails.map(vote => ({
      voterName: voterName.trim(),
      voterEmail: voterEmail.toLowerCase().trim(),
      position: vote.position,
      candidateId: new mongoose.Types.ObjectId(vote.candidateId),
      candidateName: vote.candidateName // Store for reference
    }));

    // Insert all votes in a transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      const savedVotes = await BulkVote.insertMany(voteDocuments, { session });
      await session.commitTransaction();
      
      // Send email notifications (don't await to avoid blocking response)
      sendEmailNotifications({
        voterName,
        voterEmail,
        votes: voteDetails,
        savedVotes
      }).catch(emailError => {
        console.error('Email notification failed:', emailError);
        // Don't throw error - voting was successful even if email fails
      });

      res.status(201).json({
        success: true,
        msg: `Successfully submitted ${savedVotes.length} votes!`,
        data: {
          voterName,
          positionsVoted: savedVotes.map(vote => vote.position),
          system: 'new' // Indicate which system was used
        }
      });
      console.log(`✅ ${savedVotes.length} votes submitted for ${voterEmail} in NEW system`);
      
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (err) {
    // End session if it exists
    if (session) {
      await session.endSession();
    }
    
    console.error('Bulk vote submission error:', err);
    
    // Handle duplicate vote error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        msg: 'Duplicate vote detected. You may have already voted for one of these positions.'
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
      msg: 'Error submitting votes: ' + err.message
    });
  }
});

// GET /api/votes/stats - Get voting statistics from both systems
voteRoutes.get('/stats', async (req, res) => {
  try {
    // Get stats from OLD system
    const oldVotesCount = await Vote.countDocuments();
    const oldVotersCount = await Vote.distinct('voterEmail').then(emails => emails.length);
    
    // Get stats from NEW system
    const newVotesCount = await BulkVote.countDocuments();
    const newVotersCount = await BulkVote.distinct('voterEmail').then(emails => emails.length);

    // Combined stats
    const totalVotes = oldVotesCount + newVotesCount;
    const totalVoters = oldVotersCount + newVotersCount;

    res.json({
      success: true,
      data: {
        oldSystem: {
          votes: oldVotesCount,
          voters: oldVotersCount
        },
        newSystem: {
          votes: newVotesCount,
          voters: newVotersCount
        },
        combined: {
          totalVotes,
          totalVoters
        }
      }
    });

  } catch (err) {
    console.error('Error getting vote stats:', err);
    res.status(500).json({
      success: false,
      msg: 'Error retrieving voting statistics'
    });
  }
});

// Helper function to send email notifications
async function sendEmailNotifications({ voterName, voterEmail, votes, savedVotes }) {
  try {
    console.log('📧 Starting email notifications for vote submission...');

    // 1. Send confirmation email to voter
    await sendVoteConfirmationEmail({
      voterName,
      voterEmail,
      votes: votes.map(vote => ({
        position: vote.position,
        candidateName: vote.candidateName
      }))
    });

    // 2. Send notification to committee
    await sendCommitteeVoteNotification({
      voterName,
      voterEmail,
      totalVotes: savedVotes.length,
      positions: votes.map(vote => vote.position),
      system: 'new' // Indicate this is from the new system
    });

    console.log('✅ All email notifications sent successfully');
    
  } catch (error) {
    console.error('❌ Email notification error:', error);
    // Don't throw - we don't want email failures to affect voting
  }
}

export default voteRoutes;