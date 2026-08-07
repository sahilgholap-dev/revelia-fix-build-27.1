/**
 * Production configuration
 * Security settings, rate limits, and CORS origins for production environment
 */

export const productionConfig = {
  /**
   * CORS configuration for production
   */
  cors: {
    origin: [
      'https://revelia.me',
      'https://www.revelia.me',
      'https://admin.revelia.me',
      // Add staging if needed
      'https://staging.revelia.me',
    ],
    credentials: true,
  },

  /**
   * Rate limiting configuration
   */
  rateLimit: {
    /**
     * General API rate limit
     * Applied to all endpoints — generous for testing, per-user for authenticated routes
     */
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // 500 requests per key (generous for multi-tester environments)
      message: {
        success: false,
        error: 'Too many requests, please try again later.',
      },
    },

    /**
     * Authentication endpoints rate limit (per-email, falls back to IP)
     * Prevents brute force attacks on login/signup. Keyed by email so
     * TestFlight users sharing a CGNAT egress IP don't share an auth budget.
     */
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30, // 30 auth attempts per 15 min per email
      message: {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.',
      },
    },

    /**
     * Verification endpoint rate limit (per-email, falls back to IP)
     * Prevents OTP spam and brute-forcing.
     */
    verification: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 verification requests per 15 min per email
      message: {
        success: false,
        error: 'Too many verification attempts. Please try again in 15 minutes.',
      },
    },

    /**
     * AI reading generation rate limit (per-user)
     * Prevents abuse of expensive Claude API calls
     */
    readings: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 reading generations per hour per user
      message: {
        success: false,
        error: 'You have generated too many readings. Please try again in an hour.',
      },
    },
  },

  /**
   * Security headers configuration
   */
  helmet: {
    contentSecurityPolicy: false, // Allow our CORS origins
    crossOriginEmbedderPolicy: false,
  },
};
