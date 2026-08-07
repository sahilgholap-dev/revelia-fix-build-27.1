import rateLimit from 'express-rate-limit';
import { productionConfig } from '../config/production';

/**
 * Rate limiter for AI reading generation endpoints
 * 
 * Applies stricter rate limiting to expensive Claude API calls:
 * - 10 readings per hour per user in production
 * - Unlimited in development
 * 
 * Applied to:
 * - POST /api/readings/face
 * - POST /api/readings/palm
 * - POST /api/compatibility
 */
export const readingRateLimit = rateLimit({
  windowMs: productionConfig.rateLimit.readings.windowMs,
  max: productionConfig.rateLimit.readings.max,
  message: productionConfig.rateLimit.readings.message,
  
  /**
   * Rate limit per user ID, not per IP
   * This prevents users from bypassing limits by changing IPs
   */
  keyGenerator: (req: any, _res: any) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const user = req.user;
    if (user?._id) {
      return `user:${user._id.toString()}`;
    }
    // Return undefined to use default IP-based key generator
    return undefined as any;
  },
  
  /**
   * Skip rate limiting in development
   */
  skip: () => {
    return process.env.NODE_ENV !== 'production';
  },
  
  /**
   * Standard headers for rate limit info
   */
  standardHeaders: true,
  legacyHeaders: false,
}) as any;
