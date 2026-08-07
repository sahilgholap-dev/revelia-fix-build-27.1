import express from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * Build 27 R9 §14 step 3b — Personalized Cosmic Report routes.
 *
 * Mounted at `/api/reports`. All routes require authentication. The tier gate
 * (free → 402 locked) + the atomic credit reserve live in the controller, not
 * middleware, because the free-locked case must NOT create a Report doc and the
 * over-limit case is enforced by the DB (partial unique index), not a tier
 * check. v1 is SELF-only; `subject:'other'` is rejected in the controller.
 */
const router = express.Router();

router.use(authenticateToken);

// Credit for the entry screen ("1 credit remaining this month").
// Declared before `/:id` so "credit" is not captured as a report id.
router.get('/credit', reportController.getReportCredit);

// Static shared Monty sample report (all users; free "see before you buy" +
// paid "View Sample Reading"). Declared before `/:id` so "sample" is not
// captured as a report id.
router.get('/sample', reportController.getSampleReport);

// Enqueue: tier gate + atomic reserve + create `queued` → { reportId, status }.
router.post('/', reportController.createReport);

// History (newest first).
router.get('/', reportController.getReportHistory);

// FREE rebuild of an expired report's PDF (from the stored interpretation; no
// re-Fable, no credit). Declared before `/:id` GET is irrelevant (different verb),
// but kept grouped with the report-id routes for clarity. (R9 §14 step 9 DO 8.)
router.post('/:id/rebuild', reportController.rebuildReport);

// Single report (owner-only).
router.get('/:id', reportController.getReport);

export default router;
