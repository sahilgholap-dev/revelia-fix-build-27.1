# Subscriptions (RevenueCat)

Tiers: `free` / `premium` / `premium_plus` (Lifetime exists conceptually). Mobile `SubscriptionTier` type lives in `mobile/lib/constants.ts`.

## Mobile

- `react-native-purchases ^9.7` wrapped by `mobile/lib/revenuecat.ts` (`identifyUser`/`logoutRevenueCat`) + `subscriptionStore` (offerings, purchase, restore; `initSubscriptionSync()` at launch keeps Profile UI live on purchase/restore).
- Paywall (`(paywall)/index.tsx`) reads `offerings.current?.availablePackages` — never `offerings.availablePackages` (past bug).
- No `codegenConfig` in the package — RN 0.79 old-arch interop layer; expected, not a bug. Billing only works on a **Play-signed build** (internal testing or production), never a sideloaded APK.

## Server

- Tier persisted via RevenueCat webhook (`webhook.service.ts` event → tier mapping) plus **RTDN** (Google Cloud Pub/Sub → `/api/webhooks/revenuecat-rtdn`; currently logs + returns 200, HMAC verification not yet added).
- `getEffectiveTier(user)` (`server/src/utils/subscriptionTier.ts`) resolves the effective tier, honoring the optional `subscription.comp` field — **complimentary grants** for influencers via the `grant:comp[:dry]` script. Regular users: returns the billing tier unchanged.
- Tier gating middleware (`subscription.middleware`) guards premium endpoints; `insightCache.service.ts` invalidates cached insights on tier upgrade.
- R5 note: marquee *paid* surfaces are the ones routed to Fable 5/Opus 4.8; free tier stays on the cheap model (margin discipline).
