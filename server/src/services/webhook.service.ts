import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { SubscriptionTier } from '../types/shared';
import { TIER_RANK } from '../utils/subscriptionTier';
import { invalidateUserInsightCache } from './insightCache.service';

type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'SUBSCRIPTION_PAUSED'
  | 'TRANSFER'
  | 'SUBSCRIBER_ALIAS'
  | 'TEST';

interface RevenueCatWebhookEvent {
  api_version?: string;
  event: {
    type: RevenueCatEventType | string;
    app_user_id: string;
    original_app_user_id?: string;
    aliases?: string[];
    product_id?: string;
    entitlement_ids?: string[] | null;
    entitlement_id?: string | null;
    period_type?: 'TRIAL' | 'INTRO' | 'NORMAL';
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    store?: 'PLAY_STORE' | 'APP_STORE' | 'AMAZON' | 'MAC_APP_STORE' | 'STRIPE' | 'PROMOTIONAL';
    environment?: 'PRODUCTION' | 'SANDBOX';
  };
}

function deriveTierFromEntitlements(entitlementIds: string[] | null | undefined): SubscriptionTier | null {
  if (!entitlementIds || entitlementIds.length === 0) return null;
  if (entitlementIds.includes('premium_plus')) return 'premium_plus';
  if (entitlementIds.includes('premium')) return 'premium';
  return null;
}

async function findUserForEvent(appUserId: string, originalAppUserId?: string): Promise<IUser | null> {
  const candidates = [appUserId, originalAppUserId].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );

  for (const id of candidates) {
    const byRcId = await User.findOne({ 'subscription.revenueCatId': id });
    if (byRcId) return byRcId;
  }

  for (const id of candidates) {
    if (Types.ObjectId.isValid(id)) {
      const byUserId = await User.findById(id);
      if (byUserId) return byUserId;
    }
  }

  return null;
}

export async function handleRevenueCatWebhook(
  payload: RevenueCatWebhookEvent
): Promise<{ ok: true; event: string; user?: string; reason?: string }> {
  const event = payload?.event;
  if (!event || !event.type || !event.app_user_id) {
    console.warn('[RC webhook] malformed payload — missing event.type or event.app_user_id');
    return { ok: true, event: 'unknown', reason: 'malformed_payload' };
  }

  const { type, app_user_id, original_app_user_id, product_id, entitlement_ids, expiration_at_ms } = event;

  if (type === 'TEST') {
    console.log(`[RC webhook] TEST event received (app_user_id=${app_user_id}) — webhook reachable`);
    return { ok: true, event: 'TEST' };
  }

  const user = await findUserForEvent(app_user_id, original_app_user_id);

  if (!user) {
    console.warn(
      `[RC webhook] user not found for app_user_id=${app_user_id} original_app_user_id=${original_app_user_id ?? 'n/a'} type=${type}`
    );
    return { ok: true, event: type, reason: 'user_not_found' };
  }

  const beforeTier = user.subscription.tier;
  const derivedTier = deriveTierFromEntitlements(entitlement_ids ?? null);
  const expiresAt = typeof expiration_at_ms === 'number' ? new Date(expiration_at_ms) : null;

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
    case 'NON_RENEWING_PURCHASE': {
      if (derivedTier) {
        user.subscription.tier = derivedTier;
        // A real paid purchase supersedes any complimentary grant. Clear the
        // comp so state stays clean; getEffectiveTier's max() already prevents
        // a comp from downgrading a higher real tier, this just retires it.
        if (user.subscription.comp?.active) {
          user.subscription.comp.active = false;
        }
      }
      if (expiresAt) user.subscription.expiresAt = expiresAt;
      if (product_id) user.subscription.productId = product_id;
      user.subscription.willRenew = type !== 'NON_RENEWING_PURCHASE';
      break;
    }

    case 'CANCELLATION': {
      // User cancelled auto-renew but retains access until expiration.
      user.subscription.willRenew = false;
      if (expiresAt) user.subscription.expiresAt = expiresAt;
      break;
    }

    case 'EXPIRATION': {
      user.subscription.tier = 'free';
      user.subscription.expiresAt = undefined;
      user.subscription.productId = undefined;
      user.subscription.willRenew = false;
      break;
    }

    case 'BILLING_ISSUE': {
      // Don't revoke yet — RC may resolve within grace period.
      console.warn(`[RC webhook] billing issue for user=${user._id} product=${product_id ?? 'n/a'}`);
      break;
    }

    case 'SUBSCRIPTION_PAUSED':
    case 'TRANSFER':
    case 'SUBSCRIBER_ALIAS': {
      console.log(`[RC webhook] informational event type=${type} user=${user._id} — no tier change`);
      break;
    }

    default: {
      console.log(`[RC webhook] unhandled event type=${type} user=${user._id}`);
      break;
    }
  }

  // Always link the user to the RC app_user_id so future lookups are O(1).
  if (!user.subscription.revenueCatId) {
    user.subscription.revenueCatId = app_user_id;
  }
  user.subscription.lastEventType = type;
  user.subscription.lastEventAt = new Date();
  user.subscription.lastSyncedAt = new Date();

  await user.save();

  const afterTier = user.subscription.tier;

  // On ANY tier upgrade, invalidate cached insights so the next
  // /insights/monthly (and daily/weekly) fetch regenerates content matching
  // the new tier. Two distinct stale-cache cases this catches:
  //   - free → premium / premium_plus: the free-tier monthly prompt omits
  //     numerology / astrology / life-areas entirely, so an upgraded user
  //     keeps seeing empty premium sections.
  //   - premium → premium_plus: the cached premium-tier reading is missing
  //     the Plus-exclusive sections (Cosmic Advice, Money, Health), which
  //     would otherwise stay as placeholders until end-of-month.
  // Downgrades and same-tier renewals are intentionally skipped (cached
  // content is a superset of what the lower tier needs; UI gates display
  // per current tier).
  // Mirrors the cache-bust in profile.service.ts when birth data changes.
  const isUpgrade = (TIER_RANK[afterTier] ?? 0) > (TIER_RANK[beforeTier] ?? 0);
  if (isUpgrade) {
    try {
      const deletedCount = await invalidateUserInsightCache(user._id);
      console.log(
        `[RC webhook] tier upgrade ${beforeTier}→${afterTier} for user=${user._id} — invalidated ${deletedCount} cached insights`
      );
    } catch (err: any) {
      // Don't fail the webhook on cache cleanup — RC retries on non-200,
      // and the cache self-heals at end-of-month. User can also force regen
      // via Profile → Update Birth Data in the meantime.
      console.warn(
        `[RC webhook] failed to invalidate insight cache after upgrade for user=${user._id}: ${err?.message ?? err}`
      );
    }
  }

  console.log(
    `[RC webhook] handled type=${type} user=${user._id} beforeTier=${beforeTier} afterTier=${afterTier} entitlements=${JSON.stringify(entitlement_ids ?? [])} product=${product_id ?? 'n/a'}`
  );

  return { ok: true, event: type, user: user._id.toString() };
}
