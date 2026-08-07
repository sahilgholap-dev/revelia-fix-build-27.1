import express from 'express';
import * as engagementController from '../controllers/engagement.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// All engagement routes require authentication
router.use(authenticateToken);

// Record check-in
router.post('/checkin', engagementController.checkIn);

// Get streak data
router.get('/streak', engagementController.getStreak);

export default router;
