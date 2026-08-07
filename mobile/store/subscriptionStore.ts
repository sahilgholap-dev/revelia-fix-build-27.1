import { create } from 'zustand';
import {
  getOfferings,
  purchasePackage as rcPurchasePackage,
  restorePurchases as rcRestorePurchases,
  getCustomerInfo,
  mapCustomerInfoToTier,
  addCustomerInfoListener,
} from '../lib/revenuecat';
import { subscriptionService } from '../services/subscription.service';
import { useAuthStore } from './authStore';
import { FEATURE_ACCESS } from '../lib/constants';

interface SubscriptionState {
  tier: 'free' | 'premium' | 'premium_plus';
  isActive: boolean;
  expiresAt: string | null;
  offerings: any | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<'free' | 'premium' | 'premium_plus'>;
  checkSubscriptionStatus: () => Promise<void>;

  // Helpers
  isPremium: () => boolean;
  isPremiumPlus: () => boolean;
  canAccess: (feature: string) => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'free',
  isActive: false,
  expiresAt: null,
  offerings: null,
  isLoading: false,
  error: null,

  fetchOfferings: async () => {
    set({ isLoading: true, error: null });
    try {
      const offerings = await getOfferings();
      console.log('[RC] getOfferings result:', JSON.stringify(offerings));
      if (!offerings) {
        console.warn('[RC] getOfferings returned null - check RC key and internet connection');
      }
      set({ offerings, isLoading: false });
    } catch (e: any) {
      console.warn('[RC] fetchOfferings error:', e);
      set({ error: e.message || 'Failed to load offerings', isLoading: false });
    }
  },

  purchasePackage: async (pkg) => {
    set({ isLoading: true, error: null });
    try {
      const customerInfo = await rcPurchasePackage(pkg);
      if (!customerInfo) {
        set({ isLoading: false });
        return false;
      }
      const tier = mapCustomerInfoToTier(customerInfo);
      set({ tier, isActive: tier !== 'free', isLoading: false });
      // Write the new tier/expiry back to authStore so Profile (which reads
      // user.subscription.tier) updates immediately, no relaunch needed.
      // ⚠️ UPGRADE-ONLY, and on this path that is exactly what is wanted: a purchase always raises
      //    the tier, so the guard is invisible here and only bites when the derived value is LOWER
      //    than the server's — which on a purchase means something went wrong.
      applyTierToAuthUser(tier, customerInfo.latestExpirationDate);
      try {
        await subscriptionService.syncSubscription();
        // 🟢 THEN TAKE THE SERVER'S ANSWER. `sync` makes the server pull from RevenueCat; this reads
        //    back the EFFECTIVE tier, which is the only value that also knows about a comp grant.
        await get().checkSubscriptionStatus();
      } catch (e) {
        console.warn('[Subscription] Backend sync failed:', e);
      }
      return true;
    } catch (e: any) {
      set({ error: e.message || 'Purchase failed', isLoading: false });
      return false;
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const customerInfo = await rcRestorePurchases();
      if (!customerInfo) {
        set({ isLoading: false });
        return 'free';
      }
      const tier = mapCustomerInfoToTier(customerInfo);
      // 🔴 THE RETURN VALUE STAYS THE STORE'S ANSWER, DELIBERATELY, AND THE PAYWALL IS UNTOUCHED.
      //    This function answers "what did the store restore?", which is the right question for a
      //    Restore button and is NOT the same question as "what is this account entitled to". A
      //    comped user restoring finds nothing, correctly — and must not be demoted for it.
      if (rank(tier) > rank(get().tier)) set({ tier, isActive: tier !== 'free' });
      set({ isLoading: false });
      applyTierToAuthUser(tier, customerInfo.latestExpirationDate);
      // The server then has the last word, in both directions, without changing what we return.
      void get().checkSubscriptionStatus();
      return tier;
    } catch (e: any) {
      set({ error: e.message || 'Restore failed', isLoading: false });
      return 'free';
    }
  },

  /**
   * 🔴 THE SERVER DECIDES. THIS FUNCTION USED TO ASK REVENUECAT.
   *
   * `GET /subscription/status` returns `getEffectiveTier(user)` — the higher rank of the billing
   * tier and any live complimentary grant, with the grant's expiry evaluated at read time. That is
   * the only value that knows about a comp; RevenueCat cannot know, because a comp deliberately
   * bypasses it. Asking the store for the tier and then writing the answer into the user is the
   * client deciding entitlement, which R1 forbids.
   *
   * It is AUTHORITATIVE IN BOTH DIRECTIONS — this is the one path allowed to lower a tier, because
   * the value came from the server. A cancellation or an expired comp lands here.
   *
   * ⚠️ The RevenueCat read stays as a FALLBACK for the offline case only, and it may only ever
   *    UPGRADE (see `applyTierToAuthUser`). Offline, a real subscriber still gets their features
   *    from the cached entitlement; nobody gets demoted by a failed request.
   */
  checkSubscriptionStatus: async () => {
    try {
      const status = await subscriptionService.getStatus();
      set({ tier: status.tier, isActive: status.isActive, expiresAt: status.expiresAt ?? null });
      applyServerTierToAuthUser(status.tier, status.expiresAt ?? null);
      return;
    } catch (e) {
      console.warn('[Subscription] server status unavailable, falling back to the store:', e);
    }
    try {
      const customerInfo = await getCustomerInfo();
      if (!customerInfo) return;
      const tier = mapCustomerInfoToTier(customerInfo);
      // Upgrade-only, both here and in authStore: an offline free-read must not demote a comped or
      // server-granted account.
      if (rank(tier) > rank(get().tier)) set({ tier, isActive: tier !== 'free' });
      applyTierToAuthUser(tier, customerInfo.latestExpirationDate);
    } catch (e) {
      console.warn('[Subscription] checkSubscriptionStatus failed:', e);
    }
  },

  isPremium: () => ['premium', 'premium_plus'].includes(get().tier),
  isPremiumPlus: () => get().tier === 'premium_plus',

  canAccess: (feature) => {
    const tier = get().tier;
    const access = FEATURE_ACCESS as any;
    return access?.[feature]?.[tier] ?? false;
  }
}));

/**
 * 🔴 R1 — THE CLIENT MAY NOT DECIDE ENTITLEMENT, AND THIS FILE WAS THE ONE PLACE THAT DID.
 *
 * ── THE DEFECT, REPORTED AS "the app is broken" AND CONFIRMED BY A PM'S "this used to work" ─────
 *
 * Internal and influencer accounts are granted a tier SERVER-SIDE by `scripts/grant-comp-tier.ts`,
 * which writes a time-boxed grant that `server/src/utils/subscriptionTier.ts` honours lazily at
 * read time — while `active && expiresAt > now`, taking the HIGHER RANK of the grant and the
 * billing tier, so it can only ever upgrade and needs no scheduler. `userToResponse` hydrates the
 * user with that effective tier, so authStore is correct the moment a login or a restore lands.
 * 🟢 ALL OF THAT IS STILL IMPLEMENTED, EXACTLY AS DOCUMENTED, AND THE SERVER SIDE WAS NEVER BROKEN:
 *    every gated endpoint calls `getEffectiveTier`, and the RevenueCat sync writes billing fields
 *    only — it does not touch the grant.
 *
 * 🔴 A COMPED ACCOUNT HAS NO STORE ENTITLEMENT — BY DESIGN, that is what a comp IS — so
 *    `mapCustomerInfoToTier` returns 'free' for it, correctly. This function then wrote that 'free'
 *    over the server's tier, and 15 files read the field it overwrote. The account kept its
 *    server-side access — every API call still honoured the grant — while the app rendered it as
 *    free: locks on rows the server would have served, and a paywall bounce on the destination.
 *
 * 🔴 AND IT DID NOT NEED THE LISTENER TO FIRE. `owner-actions.md`'s P16 left the finding
 *    unconfirmed because whether RevenueCat emits a CustomerInfo update on its initial fetch is
 *    native-SDK behaviour and genuinely not determinable from this repo — the JS layer is a bare
 *    NativeEventEmitter bridge (`react-native-purchases/dist/purchases.js:79`). 🟢 THAT QUESTION IS
 *    NO LONGER LOAD-BEARING: three independent paths reached this function with a store-derived
 *    tier — the launch listener, `restorePurchases()` behind the paywall's Restore button, and
 *    `purchasePackage()` — so the downgrade was reachable on any of them, and `logIn` alone makes
 *    the listener path near-certain. The fix closes the CLASS rather than one path, which is why it
 *    does not depend on an answer nobody in this repo has.
 *
 * ── THE RULE THIS FUNCTION NOW OBEYS ───────────────────────────────────────────────────────────
 *
 * 🟢 A STORE-DERIVED TIER MAY ONLY EVER UPGRADE. It exists for responsiveness — a purchase should
 *    unlock the app before the server round-trip completes, and an offline launch should still
 *    honour a cached entitlement. Neither of those needs the power to demote anyone.
 * ⚠️ SO A REAL DOWNGRADE — a cancellation, a lapsed comp — ARRIVES FROM THE SERVER, through
 *    `applyServerTierToAuthUser`, which `checkSubscriptionStatus()` calls. Every path that used to
 *    write a demotion here triggers that fetch instead, so nothing is lost by the guard.
 * ⚠️ Spread the existing subscription object and override only tier + expiresAt, so required fields
 *    (e.g. revenueCatId) stay intact. `latestExpirationDate` is `string | null`; null falls back to
 *    the existing expiresAt (`string | undefined`).
 */
const RANK: Record<'free' | 'premium' | 'premium_plus', number> = {
  free: 0,
  premium: 1,
  premium_plus: 2,
};
// ⚠️ THE CANONICAL RANKING LIVES ON THE SERVER (`utils/subscriptionTier.ts`'s TIER_RANK). This is a
//    second copy because the two halves share types, not code. Three values that have never moved;
//    if a fourth tier ever arrives, both move together.
const rank = (t: 'free' | 'premium' | 'premium_plus'): number => RANK[t] ?? 0;

function applyTierToAuthUser(
  tier: 'free' | 'premium' | 'premium_plus',
  latestExpirationDate: string | null
): void {
  const authUser = useAuthStore.getState().user;
  if (!authUser) return;
  const current = authUser.subscription?.tier ?? 'free';
  if (rank(tier) <= rank(current)) {
    // A comped account lands here on EVERY launch, so this is an expected branch rather than an
    // error — but it is logged, because a silent guard is indistinguishable from no guard when
    // someone is trying to work out why an account looks free.
    if (rank(tier) < rank(current)) {
      console.log(
        `[Subscription] ignoring store-derived '${tier}' against the server's '${current}' — ` +
        'a client-derived tier may only upgrade (R1).'
      );
    }
    return;
  }
  writeTier(tier, latestExpirationDate);
}

/**
 * The SERVER's effective tier, applied unconditionally — the only path allowed to lower a tier.
 * It is a separate function rather than a boolean parameter on the one above, because the whole
 * point is that the two directions have different authority and a call site should say which it is.
 */
function applyServerTierToAuthUser(
  tier: 'free' | 'premium' | 'premium_plus',
  expiresAt: string | null
): void {
  writeTier(tier, expiresAt);
}

function writeTier(
  tier: 'free' | 'premium' | 'premium_plus',
  expiresAt: string | null
): void {
  const authUser = useAuthStore.getState().user;
  if (!authUser) return;
  useAuthStore.getState().setUser({
    ...authUser,
    subscription: {
      ...authUser.subscription,
      tier,
      expiresAt: expiresAt ?? authUser.subscription?.expiresAt,
    },
  });
}

// Register a single CustomerInfo update listener so async/deferred entitlement
// changes (renewals, deferred purchases, restores triggered elsewhere) propagate
// live into both stores. Call once at app init, after initializeRevenueCat().
let customerInfoListenerRegistered = false;

export function initSubscriptionSync(): void {
  if (customerInfoListenerRegistered) return;
  customerInfoListenerRegistered = true;
  addCustomerInfoListener((customerInfo) => {
    const tier = mapCustomerInfoToTier(customerInfo);
    // 🔴 UPGRADE-ONLY IN BOTH STORES. This listener was the launch-time clobber: it fires with a
    //    correctly-'free' CustomerInfo for a comped account and used to overwrite both.
    if (rank(tier) > rank(useSubscriptionStore.getState().tier)) {
      useSubscriptionStore.setState({ tier, isActive: tier !== 'free' });
    }
    applyTierToAuthUser(tier, customerInfo.latestExpirationDate);
    // 🟢 AND THEN ASK THE SERVER, which is what makes the guard above lossless: a genuine
    //    entitlement change still lands, in whichever direction the server says.
    void useSubscriptionStore.getState().checkSubscriptionStatus();
  });
}
