import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';

const router = express.Router();

/**
 * POST /api/webhooks/revenuecat
 * Handle RevenueCat webhook events
 * @auth Webhook secret in Authorization header
 */
router.post('/revenuecat', subscriptionController.handleWebhook);

export default router;
