import { Router } from 'express';
import { accountController } from '../controllers/account.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { nameUpdateRateLimit } from '../middleware/name-update-rate-limit.middleware';

const router = Router();

// All account routes require authentication
router.use(authenticateToken);

/**
 * POST /api/account/export
 * Request data export (GDPR compliance)
 * Requires: Authorization header with Bearer token
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     message: string,
 *     dataSize: {
 *       readings: number,
 *       compatibility: number,
 *       insights: number
 *     }
 *   }
 * }
 */
router.post('/export', accountController.exportData);

/**
 * DELETE /api/account
 * Delete user account and all associated data (GDPR compliance)
 * Requires: Authorization header with Bearer token
 * 
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
router.delete('/', accountController.deleteAccount);

/**
 * PATCH /api/account/name
 * Update the user's display name. Tier-based rate limit applied before
 * the controller runs. Body: { name: string }. Returns 200 with updated
 * user object on success, 400 on validation failure (with user-facing
 * reason), 429 on rate limit hit (with nextAvailableAt timestamp).
 */
router.patch('/name', nameUpdateRateLimit, accountController.updateName);

export default router;
