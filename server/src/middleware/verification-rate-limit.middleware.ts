import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { productionConfig } from '../config/production';

/**
 * Rate limiter for email verification endpoints
 *
 * Prevents OTP spam and brute-forcing:
 * - 20 attempts per 15 minutes per email (falls back to IP) in production
 * - Unlimited in development
 *
 * Why per-email: see auth-rate-limit.middleware.ts. CGNAT-shared TestFlight
 * users were exhausting per-IP budgets when multiple accounts requested
 * verification codes from the same egress IP. Keying by normalized email
 * binds the limit to the abused account rather than the shared network.
 */
export const verificationRateLimit = rateLimit({
  windowMs: productionConfig.rateLimit.verification.windowMs,
  max: productionConfig.rateLimit.verification.max,
  message: productionConfig.rateLimit.verification.message,

  keyGenerator: (req: any) => {
    const email = req.body?.email;
    if (typeof email === 'string' && email.length > 0) {
      return `email:${email.trim().toLowerCase()}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? '')}`;
  },

  skip: () => {
    return process.env.NODE_ENV !== 'production';
  },

  standardHeaders: true,
  legacyHeaders: false,
}) as any;
