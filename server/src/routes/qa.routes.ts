import express from 'express';
import * as qaController from '../controllers/qa.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * R7 §13d Step 3.1 — Conversational Q&A routes.
 *
 * Mounted at `/api/qa`. All routes require authentication (the router → context
 * → engine → answer pipeline needs the authed user's chart + subscription tier).
 * prod-dark: the route is mounted but there is no mobile surface yet, so R7 stays
 * unreleased until the mobile step + internal testing.
 */
const router = express.Router();

router.use(authenticateToken);

// Chat-screen entry signal — tier + remaining monthly allowance + reset instant.
// (Additive read; mirrors report.controller's credit endpoint — no counter/cron.)
router.get('/credit', qaController.getQaCredit);

router.post('/ask', qaController.ask);

export default router;
