import express from 'express';
import * as readingController from '../controllers/reading.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { readingRateLimit } from '../middleware/reading-rate-limit.middleware';
import { requirePremiumPlus } from '../middleware/subscription.middleware';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * Face reading routes
 * POST is rate limited: 10 generations per hour per user (production only)
 */
router.post('/face', readingRateLimit, readingController.generateFaceReading);
router.get('/face', readingController.getCachedFaceReading);

/**
 * Palm reading routes
 * POST is rate limited: 10 generations per hour per user (production only)
 */
router.post('/palm', readingRateLimit, readingController.generatePalmReading);
router.get('/palm', readingController.getCachedPalmReading);

/**
 * Name Destiny Analysis routes (Premium Plus only)
 */
router.get('/name-destiny/credits', requirePremiumPlus, readingController.getNameDestinyCredits);
router.get('/name-destiny', requirePremiumPlus, readingController.getNameDestiny);
router.post('/name-destiny', requirePremiumPlus, readingRateLimit, readingController.generateNameDestiny);

/**
 * Career Destiny Path routes (Premium Plus only)
 */
router.get('/career-destiny', requirePremiumPlus, readingController.getCareerDestiny);
router.post('/career-destiny', requirePremiumPlus, readingRateLimit, readingController.generateCareerDestiny);

/**
 * History route
 */
router.get('/history', readingController.getReadingHistory);

export default router;
