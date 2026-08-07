import { Types } from 'mongoose';
import { InsightCache } from '../models/InsightCache';

/**
 * Delete all cached insights (daily/weekly/monthly) for a user.
 *
 * Used whenever the user's effective tier changes upward so the next
 * /insights fetch regenerates content matching the new tier instead of
 * serving stale lower-tier content (e.g. a free-tier monthly reading that
 * omits the premium numerology/astrology/life-area sections).
 *
 * Extracted from the inline cache-bust in webhook.service.ts so the
 * RevenueCat upgrade path and complimentary-grant path share one helper.
 * Returns the number of deleted documents.
 */
export async function invalidateUserInsightCache(
  userId: Types.ObjectId | string
): Promise<number> {
  const result = await InsightCache.deleteMany({ userId });
  return result.deletedCount ?? 0;
}
