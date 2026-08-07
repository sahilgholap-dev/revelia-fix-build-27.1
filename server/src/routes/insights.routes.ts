import express from 'express';
import * as insightController from '../controllers/insight.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Daily insights
router.get('/daily', insightController.getDailyInsight);         // Premium Plus only
router.get('/daily/teaser', insightController.getDailyTeaser);   // All tiers

// Weekly forecast
router.get('/weekly', insightController.getWeeklyForecast);      // Premium Plus only

// Monthly reading
router.get('/monthly', insightController.getMonthlyReading);     // Free (basic) + Premium (full)

export default router;
