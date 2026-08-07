import { SubscriptionTier } from '../types/shared';

/**
 * Canonical tier ranking. Higher number = more access.
 * Previously inlined in webhook.service.ts; centralized here so upgrade
 * detection and effective-tier resolution share one source of truth.
 */
export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  premium: 1,
  premium_plus: 2,
};

/**
 * Minimal structural shape getEffectiveTier needs. Accepts a full Mongoose
 * IUser as well as lean/plain objects, so callers don't have to hydrate a
 * document just to resolve a tier.
 */
export interface CompGrant {
  tier?: SubscriptionTier;
  grantedAt?: Date;
  expiresAt?: Date | string | null;
  reason?: string;
  active?: boolean;
}

export interface TierResolvable {
  subscription: {
    tier: SubscriptionTier;
    comp?: CompGrant | null;
  };
}

/**
 * Resolve the tier a user should be gated at RIGHT NOW.
 *
 * subscription.tier is ALWAYS billing truth (only the RevenueCat webhook
 * writes it). A complimentary grant (subscription.comp) layers on top as a
 * time-boxed marketing comp that bypasses RevenueCat.
 *
 * Lazy auto-expiry, no cron: the comp is honored only while
 * `comp.active && comp.expiresAt > now`. Once expiresAt passes, the comp is
 * silently ignored and the user falls back to subscription.tier — which is
 * 'free' unless a real purchase has since set it higher. No background job
 * is required; expiry is evaluated here, at read time.
 *
 * The result is the HIGHER RANK of (comp.tier, billing tier), so a comp can
 * only ever upgrade — it can never downgrade a real paid subscription.
 */
export function getEffectiveTier(user: TierResolvable): SubscriptionTier {
  const billingTier = user?.subscription?.tier ?? 'free';
  const comp = user?.subscription?.comp;

  if (comp?.active && comp.tier && comp.expiresAt && new Date(comp.expiresAt) > new Date()) {
    const compTier = comp.tier;
    return (TIER_RANK[compTier] ?? 0) >= (TIER_RANK[billingTier] ?? 0) ? compTier : billingTier;
  }

  return billingTier;
}
