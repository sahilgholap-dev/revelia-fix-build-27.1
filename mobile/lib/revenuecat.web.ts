// Web fork of lib/revenuecat.ts.
//
// react-native-purchases is a native SDK with no web build. It does not crash
// at import the way the TurboModule-spec packages do, so this fork exists for
// CORRECTNESS rather than to stop a boot crash: without it, Purchases.configure
// would run on web and every store read would fail in a different way per call.
//
// The web store is RevenueCat Web Billing (Stripe), which is a separate SDK
// (@revenuecat/purchases-js) and a separate owner setup step. Until that lands,
// reads return neutral values and purchases throw a single named error the
// paywall branches on — never a silent failure.
//
// WHY NEUTRAL READS ARE SAFE: the server is the tier authority. Tier reaches
// the client from GET /subscription/status via applyServerTierToAuthUser, and
// subscriptionStore's RANK guard lets a store-derived tier only ever UPGRADE.
// So mapCustomerInfoToTier returning 'free' here cannot downgrade a paying or
// comped user — the same property that fixed the comp-tier clobber (X21).
//
// Export list mirrors lib/revenuecat.ts exactly; parity is asserted by
// scripts/web-fork-check.js. Type-only imports are erased at compile time and
// do not pull the native package into the web bundle.
import type {
  PurchasesOfferings,
  CustomerInfo,
  PurchasesPackage,
} from 'react-native-purchases';
import { SubscriptionTier } from './constants';

/** Thrown by every purchase path on web until Web Billing is configured. */
export const WEB_PURCHASES_UNAVAILABLE = 'WEB_PURCHASES_UNAVAILABLE';

export function initializeRevenueCat(): void {
  // No-op: nothing to configure until Web Billing is wired.
}

export async function identifyUser(_userId: string): Promise<void> {}

export async function logoutRevenueCat(): Promise<void> {}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  // null is the same value the native fork returns when offerings fail to load,
  // so the paywall's existing empty-offerings branch handles it.
  return null;
}

export async function purchasePackage(
  _pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  throw new Error(WEB_PURCHASES_UNAVAILABLE);
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  throw new Error(WEB_PURCHASES_UNAVAILABLE);
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  return null;
}

export function addCustomerInfoListener(_cb: (ci: CustomerInfo) => void): void {
  // purchases-js has no equivalent push listener; the purchase flow calls
  // syncSubscription() + checkSubscriptionStatus() explicitly instead.
}

export function mapCustomerInfoToTier(_customerInfo: CustomerInfo): SubscriptionTier {
  return 'free';
}
