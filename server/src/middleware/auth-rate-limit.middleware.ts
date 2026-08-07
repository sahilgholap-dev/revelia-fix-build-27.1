import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { productionConfig } from '../config/production';

/**
 * Rate limiter for authentication endpoints
 *
 * Prevents brute force attacks on login/signup:
 * - 30 attempts per 15 minutes per email (falls back to IP) in production
 * - Unlimited in development
 *
 * Why per-email instead of per-IP:
 *   TestFlight users frequently share Apple's CGNAT egress IPs (typically
 *   100.64.0.0/10). Two testers behind the same NAT would otherwise share
 *   the same auth budget. The actual security boundary we care about is
 *   the account being attacked, not the network — keying by normalized
 *   email matches that boundary.
 *
 * Applied to:
 * - POST /api/auth/login
 * - POST /api/auth/signup
 * - POST /api/auth/apple
 * - POST /api/auth/google
 * - POST /api/auth/forgot-password
 * - POST /api/auth/verify-reset-code
 * - POST /api/auth/reset-password
 */
export const authRateLimit = rateLimit({
  windowMs: productionConfig.rateLimit.auth.windowMs,
  max: productionConfig.rateLimit.auth.max,
  message: productionConfig.rateLimit.auth.message,

  /**
   * Key by lowercased+trimmed email when present, else fall back to IP.
   * Apple Sign In requests don't carry an email in the body — those
   * naturally fall through to per-IP, which is fine since Apple's identity
   * token verification handles abuse on that path.
   */
  keyGenerator: (req: any) => {
    const email = req.body?.email;
    if (typeof email === 'string' && email.length > 0) {
      return `email:${email.trim().toLowerCase()}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? '')}`;
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
