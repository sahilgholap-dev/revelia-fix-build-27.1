import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/auth-rate-limit.middleware';
import { verificationRateLimit } from '../middleware/verification-rate-limit.middleware';

const router = Router();

/**
 * POST /api/auth/signup
 * Sign up with email and password
 * Rate limited: 5 attempts per 15 minutes (production only)
 * 
 * Request body:
 * {
 *   name?: string,
 *   email: string,
 *   password: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     user: User,
 *     token: string
 *   }
 * }
 */
router.post('/signup', authRateLimit, authController.signup);

/**
 * POST /api/auth/login
 * Login with email and password
 * Rate limited: 5 attempts per 15 minutes (production only)
 * 
 * Request body:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     user: User,
 *     token: string
 *   }
 * }
 */
router.post('/login', authRateLimit, authController.login);

/**
 * POST /api/auth/apple
 * Login with Apple
 * Rate limited: 5 attempts per 15 minutes (production only)
 * 
 * Request body:
 * {
 *   identityToken: string,
 *   user?: {
 *     name?: {
 *       firstName?: string,
 *       lastName?: string
 *     },
 *     email?: string
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     user: User,
 *     token: string
 *   }
 * }
 */
router.post('/apple', authRateLimit, authController.appleAuth);

/**
 * POST /api/auth/google
 * Login with Google
 * Rate limited: 5 attempts per 15 minutes (production only)
 * 
 * Request body:
 * {
 *   idToken: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     user: User,
 *     token: string
 *   }
 * }
 */
router.post('/google', authRateLimit, authController.googleAuth);

/**
 * POST /api/auth/refresh
 * Refresh access token
 * 
 * Request body:
 * {
 *   refreshToken: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     token: string
 *   }
 * }
 */
router.post('/refresh', authController.refresh);

/**
 * GET /api/auth/me
 * Get current user
 * Requires: Authorization header with Bearer token
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     user: User
 *   }
 * }
 */
router.get('/me', authenticateToken, authController.getMe);

/**
 * POST /api/auth/logout
 * Logout user
 * 
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
router.post('/logout', authController.logout);

/**
 * PATCH /api/auth/change-password
 * Change user password (email auth only)
 * Requires: Authorization header with Bearer token
 * 
 * Request body:
 * {
 *   currentPassword: string,
 *   newPassword: string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
router.patch('/change-password', authenticateToken, authController.changePassword);

/**
 * POST /api/auth/send-verification
 * Send email verification OTP for signup
 * Rate limited: 10 attempts per 15 minutes (production only)
 */
router.post('/send-verification', verificationRateLimit, authController.sendVerification);

/**
 * POST /api/auth/verify-email
 * Verify email OTP and get verification token
 * Rate limited: 10 attempts per 15 minutes (production only)
 */
router.post('/verify-email', verificationRateLimit, authController.verifyEmail);

/**
 * POST /api/auth/forgot-password
 * Request password reset code
 * Rate limited: 5 attempts per 15 minutes (production only)
 */
router.post('/forgot-password', authRateLimit, authController.forgotPassword);

/**
 * POST /api/auth/verify-reset-code
 * Verify password reset code
 * Rate limited: 5 attempts per 15 minutes (production only)
 */
router.post('/verify-reset-code', authRateLimit, authController.verifyResetCode);

/**
 * POST /api/auth/reset-password
 * Reset password with verified code
 * Rate limited: 5 attempts per 15 minutes (production only)
 */
router.post('/reset-password', authRateLimit, authController.resetPassword);

export default router;
