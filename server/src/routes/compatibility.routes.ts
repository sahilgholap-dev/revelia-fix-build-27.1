import express from 'express';
import * as compatibilityController from '../controllers/compatibility.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { readingRateLimit } from '../middleware/reading-rate-limit.middleware';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * Generate compatibility reading
 * POST /api/compatibility
 * Rate limited: 10 generations per hour per user (production only)
 * Body: { partnerName: string, partnerImageUrl: string, partnerBirthDate?: string }
 */
router.post('/', readingRateLimit, compatibilityController.generateCompatibility);

/**
 * Get all compatibility readings
 * GET /api/compatibility
 */
router.get('/', compatibilityController.getCompatibilityReadings);

/**
 * Get specific compatibility reading
 * GET /api/compatibility/:id
 */
router.get('/:id', compatibilityController.getCompatibilityById);

/**
 * Delete compatibility reading
 * DELETE /api/compatibility/:id
 */
router.delete('/:id', compatibilityController.deleteCompatibility);

export default router;
