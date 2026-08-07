import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * GET /api/subscription/status
 * Get current subscription status
 * @auth Required
 */
router.get('/status', authenticateToken, subscriptionController.getStatus);

/**
 * POST /api/subscription/sync
 * Sync subscription with RevenueCat
 * @auth Required
 */
router.post('/sync', authenticateToken, subscriptionController.syncSubscription);

/**
 * POST /api/subscription/link
 * Link user to RevenueCat app user ID
 * @auth Required
 * @body { revenueCatAppUserId: string }
 */
router.post('/link', authenticateToken, subscriptionController.linkRevenueCatUser);

export default router;
