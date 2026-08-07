import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../middleware/error.middleware';
import {
  signupSchema,
  loginSchema,
  appleAuthSchema,
  googleAuthSchema,
  changePasswordSchema,
} from '../utils/validation';
import { AuthResponse, User } from '../types/shared';
import { logger } from '../utils/logger';
import { IUser } from '../models/User';
import { User as UserModel } from '../models/User';
import { getEffectiveTier } from '../utils/subscriptionTier';
import { EmailVerification } from '../models/EmailVerification';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendVerificationOTP, sendPasswordResetOTP, sendWelcomeEmail } from '../services/email.service';

/**
 * Compute a non-empty display name for a user. Falls back to the email
 * local part (capitalized) when no name is set, and finally to 'Guest'.
 *
 * This replaces the old "User" default that surfaced when Apple withheld
 * fullName on subsequent sign-ins. We pick email-local-part because most
 * email addresses contain the user's first name — a sensible default that
 * still feels personal. The birth-data onboarding form captures the real
 * name regardless, so this is purely a display safety net.
 */
const computeDisplayName = (user: IUser): string => {
  const trimmed = user.name?.trim();
  if (trimmed) return trimmed;
  if (user.email) {
    const local = user.email.split('@')[0];
    if (local && local.length > 0) {
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
  }
  return 'Guest';
};

/**
 * Convert IUser to User response format
 */
const userToResponse = (user: IUser): User & { emailVerified?: boolean } => ({
  _id: user._id.toString(),
  email: user.email,
  name: computeDisplayName(user),
  authProvider: user.authProvider,
  emailVerified: user.emailVerified ?? false,
  appleId: user.appleId,
  googleId: user.googleId,
  subscription: {
    // Effective tier (billing tier OR an active complimentary grant) so the
    // app's authStore gates on the comp while it's live, then auto-reverts.
    tier: getEffectiveTier(user),
    revenueCatId: user.subscription.revenueCatId,
    expiresAt: user.subscription.expiresAt?.toISOString(),
  },
  preferences: {
    notifications: user.preferences.notifications,
    dailyInsightTime: user.preferences.dailyInsightTime,
    timezone: user.preferences.timezone,
    oneSignalPlayerId: user.preferences.oneSignalPlayerId,
    platform: user.preferences.platform,
  },
  engagement: user.engagement ? {
    currentStreak: user.engagement.currentStreak,
    longestStreak: user.engagement.longestStreak,
    lastCheckIn: user.engagement.lastCheckIn?.toISOString() || '',
    totalCheckIns: user.engagement.totalCheckIns,
  } : undefined,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

/**
 * Auth controller class
 */
class AuthController {
  /**
   * POST /api/auth/signup
   * Sign up with email and password
   */
  signup = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = signupSchema.parse(req.body);
    const { verificationToken } = req.body;

    // Check if email was verified via OTP
    let emailVerified = false;
    if (verificationToken) {
      const verification = await EmailVerification.findOne({
        email: validatedData.email.toLowerCase().trim(),
        verificationToken,
        verified: true,
      });
      if (verification && verification.expiresAt > new Date()) {
        emailVerified = true;
        // Clean up used verification record
        await EmailVerification.deleteOne({ _id: verification._id });
      }
    }

    // Sign up user
    const { user, token } = await authService.signup(
      validatedData.name,
      validatedData.email,
      validatedData.password,
      emailVerified
    );

    // Send welcome email (fire-and-forget — don't block signup)
    sendWelcomeEmail(user.email, user.name || 'Explorer').catch((err) => {
      logger.warn('Failed to send welcome email', { email: user.email, error: err.message });
    });

    // Prepare response
    const response: AuthResponse = {
      user: userToResponse(user),
      token,
    };

    res.status(201).json({
      success: true,
      data: response,
    });
  });

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Login user
    const { user, token } = await authService.login(
      validatedData.email,
      validatedData.password
    );

    // Prepare response
    const response: AuthResponse = {
      user: userToResponse(user),
      token,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * POST /api/auth/apple
   * Login with Apple
   */
  appleAuth = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = appleAuthSchema.parse(req.body);

    // Login with Apple
    const { user, token } = await authService.loginWithApple(
      validatedData.identityToken,
      validatedData.user,
      validatedData.fullName
    );

    // Prepare response
    const response: AuthResponse = {
      user: userToResponse(user),
      token,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * POST /api/auth/google
   * Login with Google
   */
  googleAuth = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validatedData = googleAuthSchema.parse(req.body);

    // Login with Google
    const { user, token } = await authService.loginWithGoogle(
      validatedData.idToken,
      validatedData.name
    );

    // Prepare response
    const response: AuthResponse = {
      user: userToResponse(user),
      token,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * GET /api/auth/me
   * Get current user (requires authentication)
   */
  getMe = asyncHandler(async (req: Request, res: Response) => {
    // User is already attached by authenticateToken middleware
    const user = req.user!;

    res.status(200).json({
      success: true,
      data: {
        user: userToResponse(user),
      },
    });
  });

  /**
   * POST /api/auth/refresh
   * Refresh access token (not implemented yet)
   */
  refresh = asyncHandler(async (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: 'Refresh token functionality not implemented yet',
    });
  });

  /**
   * POST /api/auth/logout
   * Logout user (client-side token removal)
   */
  logout = asyncHandler(async (_req: Request, res: Response) => {
    // For now, logout is handled client-side by removing the token
    // In the future, we can implement token blacklisting here

    logger.info('User logged out');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  });

  /**
   * PATCH /api/auth/change-password
   * Change user password (email auth only)
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    
    // Validate request body
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;
    
    // Fetch user with password hash (it's excluded by default)
    const user = await UserModel.findById(userId).select('+passwordHash');
    if (!user) {
      res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
      return;
    }
    
    // Check auth provider (only email users can change password)
    if (user.authProvider !== 'email') {
      res.status(400).json({
        success: false,
        error: 'Password change not available for social auth users'
      });
      return;
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
      return;
    }
    
    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newHash;
    await user.save();
    
    logger.info(`Password changed for user ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  });
  /**
   * POST /api/auth/forgot-password
   * Send password reset code to email
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal whether user exists
      res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a reset code has been sent',
      });
      return;
    }

    if (user.authProvider !== 'email') {
      res.status(400).json({
        success: false,
        error: `This account uses ${user.authProvider} sign-in. Please use that method to log in.`,
      });
      return;
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await UserModel.findByIdAndUpdate(user._id, {
      $set: { resetCode, resetCodeExpiry },
    });

    // Send password reset email via SendGrid. In production, dispatch
    // failure throws — surface as 503 so mobile shows a clear error.
    // In dev, falls back to console output for local testing.
    try {
      const emailSent = await sendPasswordResetOTP(email, resetCode);
      if (!emailSent && process.env.NODE_ENV !== 'production') {
        logger.warn(`SendGrid unavailable — logging password reset code for ${email}`);
        console.log(`\n========================================`);
        console.log(`PASSWORD RESET CODE for ${email}: ${resetCode}`);
        console.log(`========================================\n`);
      }
    } catch (err: any) {
      logger.error('forgot_password_email_dispatch_failed', {
        email,
        error: err?.message,
      });
      res.status(503).json({
        success: false,
        error: 'We couldn\'t send your reset code right now. Please try again in a moment.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a reset code has been sent',
    });
  });

  /**
   * POST /api/auth/verify-reset-code
   * Verify password reset code
   */
  verifyResetCode = asyncHandler(async (req: Request, res: Response) => {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ success: false, error: 'Email and code are required' });
      return;
    }

    const user = await UserModel.findOne({
      email: email.toLowerCase().trim(),
    }).select('+resetCode +resetCodeExpiry');

    if (!user || !user.resetCode || !user.resetCodeExpiry) {
      res.status(400).json({ success: false, error: 'Invalid or expired reset code' });
      return;
    }

    if (user.resetCodeExpiry < new Date()) {
      res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new one.' });
      return;
    }

    if (user.resetCode !== code) {
      res.status(400).json({ success: false, error: 'Invalid reset code' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Code verified successfully',
    });
  });

  /**
   * POST /api/auth/reset-password
   * Reset password with verified code
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      res.status(400).json({ success: false, error: 'Email, code, and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    const user = await UserModel.findOne({
      email: email.toLowerCase().trim(),
    }).select('+resetCode +resetCodeExpiry +passwordHash');

    if (!user || !user.resetCode || !user.resetCodeExpiry) {
      res.status(400).json({ success: false, error: 'Invalid or expired reset code' });
      return;
    }

    if (user.resetCodeExpiry < new Date()) {
      res.status(400).json({ success: false, error: 'Reset code has expired. Please request a new one.' });
      return;
    }

    if (user.resetCode !== code) {
      res.status(400).json({ success: false, error: 'Invalid reset code' });
      return;
    }

    // Update password and clear reset code
    const newHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newHash;
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    logger.info(`Password reset completed for user ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  });

  /**
   * POST /api/auth/send-verification
   * Send email verification OTP code
   */
  sendVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already registered
    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'This email is already registered. Please log in.',
      });
      return;
    }

    // Rate limit: max 3 OTP requests per email per 15 minutes
    const recentRequests = await EmailVerification.countDocuments({
      email: normalizedEmail,
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });
    if (recentRequests >= 3) {
      res.status(429).json({
        success: false,
        error: 'Too many verification requests. Please wait before trying again.',
      });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing verifications for this email
    await EmailVerification.deleteMany({ email: normalizedEmail });

    // Store new verification
    await EmailVerification.create({
      email: normalizedEmail,
      otp,
      expiresAt,
    });

    // Send verification email via SendGrid. In production, dispatch
    // failure throws — surface as 503 so mobile shows a clear error.
    // In dev, falls back to console output for local testing.
    try {
      const emailSent = await sendVerificationOTP(normalizedEmail, otp);
      if (!emailSent && process.env.NODE_ENV !== 'production') {
        logger.warn(`SendGrid unavailable — logging verification code for ${normalizedEmail}`);
        console.log(`\n========================================`);
        console.log(`EMAIL VERIFICATION CODE for ${normalizedEmail}: ${otp}`);
        console.log(`========================================\n`);
      }
    } catch (err: any) {
      logger.error('send_verification_email_dispatch_failed', {
        email: normalizedEmail,
        error: err?.message,
      });
      res.status(503).json({
        success: false,
        error: 'We couldn\'t send your verification code right now. Please try again in a moment.',
      });
      return;
    }

    const responseBody: any = {
      success: true,
      message: 'Verification code sent to your email',
    };

    // Include OTP in response for development/testing (remove before production)
    if (process.env.NODE_ENV !== 'production') {
      responseBody.otp = otp;
    }

    res.status(200).json(responseBody);
  });

  /**
   * POST /api/auth/verify-email
   * Verify email with OTP code and return verification token
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, error: 'Email and verification code are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const verification = await EmailVerification.findOne({
      email: normalizedEmail,
    });

    if (!verification) {
      res.status(400).json({ success: false, error: 'No verification code found. Please request a new one.' });
      return;
    }

    // Check expiry
    if (verification.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ _id: verification._id });
      res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    // Rate limit: max 5 verification attempts per record
    if (verification.attempts >= 5) {
      await EmailVerification.deleteOne({ _id: verification._id });
      res.status(429).json({ success: false, error: 'Too many attempts. Please request a new code.' });
      return;
    }

    // Increment attempts
    verification.attempts += 1;

    // Check OTP
    if (verification.otp !== otp) {
      await verification.save();
      const remaining = 5 - verification.attempts;
      res.status(400).json({
        success: false,
        error: `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
      return;
    }

    // OTP is correct — generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    verification.verified = true;
    verification.verificationToken = verificationToken;
    // Extend expiry by 5 more minutes for signup completion
    verification.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await verification.save();

    logger.info(`Email verified: ${normalizedEmail}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      verificationToken,
    });
  });
}

export const authController = new AuthController();
