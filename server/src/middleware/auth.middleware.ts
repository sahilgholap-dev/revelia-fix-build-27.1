import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { User, IUser } from '../models/User';
import { AppError, asyncHandler } from './error.middleware';
import { logger } from '../utils/logger';

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

/**
 * Authenticate JWT token middleware
 */
export const authenticateToken = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, 'Authorization header missing');
    }

    // Check if header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Invalid authorization format. Use: Bearer <token>');
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AppError(401, 'Token missing');
    }

    try {
      // Verify token
      const decoded = authService.verifyToken(token);

      // Fetch user from database
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new AppError(401, 'User not found');
      }

      // Attach user to request
      req.user = user;

      // Fire-and-forget — keep lastSeenAt current for re-engagement logic
      User.updateOne({ _id: user._id }, { $set: { lastSeenAt: new Date() } }).catch((err) => {
        logger.error('Failed to update lastSeenAt:', err);
      });

      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Token verification error:', error);
      throw new AppError(401, 'Invalid or expired token');
    }
  }
);

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't throw error if missing
 */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = authService.verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
      logger.debug('Optional auth failed:', error);
    }

    next();
  }
);
