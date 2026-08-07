import { Request, Response, NextFunction } from 'express';
import { AppError, asyncHandler } from './error.middleware';
import { getEffectiveTier } from '../utils/subscriptionTier';

/**
 * Tier-based rate limit for the user-update-name endpoint.
 *
 * Limits per rolling 30-day window:
 *   free         → 1 update
 *   premium      → 5 updates
 *   premium_plus → 15 updates (capped, not unlimited, to prevent abuse)
 *
 * The single source of truth is the authenticated user's nameUpdateHistory
 * array. This middleware filters to entries within the last 30 days and
 * compares the count against the tier limit. On 429 it returns the next
 * available timestamp so the client can render a clear "try again on X"
 * message.
 *
 * 🔴 THE TIER COMES FROM `getEffectiveTier`, NEVER FROM `subscription.tier`
 *    (fixed 2026-08-06, P88). This middleware read the raw field directly and
 *    was the only entitlement decision in `server/` that did — so a COMPED
 *    influencer account silently got the FREE limit (1 change per 30 days)
 *    instead of their granted tier's. The comp mechanism deliberately bypasses
 *    RevenueCat, so `subscription.tier` on such an account is still 'free' and
 *    is CORRECT as billing truth; it is simply not the question this file asks.
 *
 * ⚠️ TWO GRANT MECHANISMS EXIST AND BOTH RESOLVE HERE NOW. `subscription.comp`
 *    (time-boxed, lazily expired at read time) and a DIRECT `subscription.tier`
 *    write with a far-future `expiresAt` (the owner's own account, and what
 *    `internal.routes.ts` / `updateTestAccounts.ts` do). `getEffectiveTier`
 *    returns the higher-ranked of the two, so a comp can only ever upgrade.
 *
 * ⚠️ AND THIS IS THE PROFILE-NAME change limit, NOT the Name Destiny reading
 *    limit — that is 1 per calendar month, Premium-Plus only, in the controller.
 */

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const TIER_LIMITS: Record<string, number> = {
  free: 1,
  premium: 5,
  premium_plus: 15,
};

export const nameUpdateRateLimit = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, 'User not authenticated');
    }

    const tier = getEffectiveTier(user);
    const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    const history = user.nameUpdateHistory ?? [];
    const recentEntries = history.filter(
      (e) => new Date(e.updatedAt).getTime() >= windowStart
    );

    if (recentEntries.length < limit) {
      return next();
    }

    // Compute the earliest entry within the window — that's the one that
    // ages out first and unblocks the next attempt.
    const oldestInWindow = recentEntries.reduce((acc, e) => {
      const t = new Date(e.updatedAt).getTime();
      return t < acc ? t : acc;
    }, Infinity);

    const nextAvailableAt = new Date(oldestInWindow + WINDOW_MS).toISOString();

    res.status(429).json({
      success: false,
      error: 'You have reached your name update limit',
      limit,
      windowDays: 30,
      nextAvailableAt,
      currentTier: tier,
    });
  }
);
