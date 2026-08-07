# Pre-flight findings — Revelia mobile, 2.0.x / pre-revamp

> **Status: INVESTIGATION ONLY. No product code, dependency, config or asset was changed.**
> Every finding below is left in place deliberately, including the ones that are literally a
> one-line edit. Scope decisions are the owner's.
>
> Companion to `plans/build-27.1/UI-audit.md` (route table §1, invariant register §5, technical
> ceiling §7). Where this document contradicts or extends the audit, it says so explicitly.
>
> Written by session `build27.1-preflight-audit`, 2026-07-29, branch `fix/build-27.1` @ `261e33c`.
> `npx tsc --noEmit` re-run at the end of the investigation: **clean on both `mobile/` and
> `server/`** (exit 0 / exit 0) — confirming nothing that compiles was touched.

---

## SUMMARY TABLE

| # | Finding | Verdict | Severity | Affects | Fix size | Server work? |
|---|---|---|---|---|---|---|
| **A1** | Paywall prices are hardcoded USD string literals, not read from RevenueCat | ✅ **CONFIRMED** | 🔴 Critical | **Money** + policy | S (≈30 lines, 1 file) | No |
| **A1b** | The hardcoded Premium-Plus prices also **disagree with the documented store products** ($12.99/$89.99 in code vs $14.99/$99.99 in `docs/REVENUECAT_SETUP.md`) | ✅ **CONFIRMED (new)** | 🔴 Critical | **Money** | subsumed by A1 | No |
| **A2** | `offerings` used only to match a constructed identifier `${plan}_${period}` | ✅ **CONFIRMED** | 🟠 High (latent) | Money | XS (part of A1) | No |
| **A3** | User cancellation surfaced as `Alert('Purchase Failed')` | ❌ **REFUTED** — but the real behaviour is worse in a different way: **every** purchase outcome except success is **completely silent** | 🟠 High | Money (conversion) | S (≈15 lines, 2 files) | No |
| **A4** | No UI for the offerings-failed state; screen falls through to hardcoded prices | ✅ **CONFIRMED** | 🔴 Critical (compounds A1) | Money | S (≈20 lines) | No |
| **A5** | CTA contrast `text-white` on `bg-gold` ≈ 2.6:1 | ⚠️ **CONFIRMED in kind, number corrected → 2.15:1** | 🟡 Medium | Polish + a11y | XS (1 word) | No |
| **A6** | "Start 7-Day Free Trial" is unconditional; Android exposes no pre-purchase eligibility check | ✅ **CONFIRMED** (your working assumption is correct, with one nuance — the method exists on Android but is hard-wired to return `UNKNOWN`) | 🟠 High | **Policy** | S–M (copy change S; real eligibility M+) | Optional |
| **B** | R1 tier-check sweep — **31 ACCESS GATE sites across 12 files** (register listed "12 screens", never the sites) | ✅ **CONFIRMED + extended** | 🟠 High | Correctness / revamp risk | — (register update only) | Partly |
| **B1** | `astrology/monthly.tsx` hides Money / Health / Challenges / Cosmic Advice from **Premium** users — but the server **sends that content** to them | ✅ **CONFIRMED (new)** | 🟠 High | Money (leak-shaped) | M | Yes (to fix properly) |
| **B2** | `readings/combined.tsx` gate has **no server counterpart at all** (no `/readings/combined` route exists) | ✅ **CONFIRMED (new)** | 🟡 Medium | Money | M | Yes |
| **B3** | `isPremiumPlus` is **dead** in `face.tsx:83` and `palm.tsx:111` | ✅ **CONFIRMED (new)** | 🟢 Low | Polish | XS | No |
| **B4** | Compatibility's client quota duplicates a server calculation whose result (`remainingFree`) is computed and then **thrown away** | ✅ **CONFIRMED (new)** | 🟢 Low | Polish | S | Yes (1 field) |
| **C** | Unregistered HARD invariants — **8 new candidates**, incl. two more instances of the iOS-prod flex-collapse fix | ✅ **CONFIRMED** | 🟠 High | Revamp risk | — (register update) | No |
| **C1** | §7 claim "one `elevation:` and one `textShadow` app-wide" | ✅ **VERIFIED EXACTLY** | — | — | — | — |
| **D** | Uncounted Tailwind spacing-derived utilities block the codemod plan | ⚠️ **PARTIALLY REFUTED** — they exist (**151 usages**) but the volume is small; **no sixth pass needed, but the 13-key scale is too small** | 🟠 High | Revamp planning | — (planning) | No |
| **E** | Font family-name resolution can silently diverge per platform | ✅ **CONFIRMED — but only on the config-plugin path.** The `useFonts` path is symmetric by construction | 🟠 High | Revamp blocker | — (planning) | No |
| **E1** | Is `expo-font` a dependency? | ❌ **Not a direct dep** — present transitively at `13.3.2` | — | — | XS | No |

Fix-size key: **XS** ≤ 5 lines · **S** ≤ ~40 lines, 1–2 files · **M** multi-file or needs a server field · **L** cross-cutting.

---

# A · PAYWALL DEFECTS

Files read in full: `mobile/app/(paywall)/index.tsx` (244 L), `mobile/store/subscriptionStore.ts`
(157 L), `mobile/lib/revenuecat.ts` (93 L), `mobile/services/subscription.service.ts`,
`mobile/lib/constants.ts`.
Type surface read from the **installed** package, not from memory:
`mobile/node_modules/@revenuecat/purchases-typescript-internal/dist/offerings.d.ts`,
`.../customerInfo.d.ts`, `mobile/node_modules/react-native-purchases/dist/purchases.d.ts`.

> **Installed version note**: `mobile/package.json:47` declares `react-native-purchases: ^9.7.5`;
> the resolved install is **9.15.2** (`node_modules/react-native-purchases/package.json`). All
> field-availability claims below are against **9.15.2**, the version that actually ships.

---

## A1 — Hardcoded prices · ✅ CONFIRMED · 🔴 CRITICAL · affects MONEY and POLICY

**Verdict: confirmed exactly as hypothesised.** All six strings are literals in JSX. Not one
character of displayed price comes from RevenueCat.

Exact lines (`mobile/app/(paywall)/index.tsx`):

```tsx
:132        Annual (Save 37-42%)

:154-156    <Text className="text-gold text-2xl font-bold mb-1">
:155          {billingPeriod === 'monthly' ? '$7.99' : '$59.99'}
            </Text>

:158-162    {billingPeriod === 'annual' && (
              <Text className="text-gray-400 text-sm mb-3">
:160            $5.00/month • Save 37%
              </Text>
            )}

:181-183    <Text className="text-gold text-2xl font-bold mb-1">
:182          {billingPeriod === 'monthly' ? '$12.99' : '$89.99'}
            </Text>

:185-189    {billingPeriod === 'annual' && (
              <Text className="text-gray-400 text-sm mb-3">
:187            $7.50/month • Save 42%
              </Text>
            )}
```

The `offerings` object is in scope on this screen the whole time (`:13`) and is **never read for
display** — its only consumer is `handlePurchase` (§A2).

### A1b — a second, independent price defect found while confirming A1

The hardcoded Premium-Plus figures **do not match the products documented for the store**:

| Package | Code says | `docs/REVENUECAT_SETUP.md:66-69`, `:1558-1561` says | Match? |
|---|---|---|---|
| `premium_monthly` | `$7.99` (`:155`) | $7.99 | ✅ |
| `premium_annual` | `$59.99` (`:155`) | $59.99 | ✅ |
| `premium_plus_monthly` | **`$12.99`** (`:182`) | **$14.99** | ❌ **−$2.00** |
| `premium_plus_annual` | **`$89.99`** (`:182`) | **$99.99** | ❌ **−$10.00** |

`mobile/SUBSCRIPTION_IMPLEMENTATION.md:200-203` and `mobile/SUBSCRIPTION_QUICKSTART.md:44-47`
independently agree with the `$14.99 / $99.99` figures.

The derived lines are internally consistent with the *code's* numbers, not the *store's*:
`$89.99 ÷ 12 = $7.4992` → the "`$7.50/month • Save 42%`" at `:187` is arithmetically correct
**for $12.99/$89.99** and wrong for $14.99/$99.99 (which would be $8.33/month, ≈44%).

I could not verify what the RevenueCat dashboard / Play Console actually charge today — that is
outside the repo. **Whichever way that resolves, one of the two is wrong**: either the app
under-quotes by $2/$10 (a US user is quoted $89.99 and charged $99.99), or the docs are stale.
This is exactly the class of bug A1's fix eliminates permanently, which is the argument for fixing
the cause rather than the number.

### Which field SHOULD be read, and is it present?

Yes — all of the needed fields exist on the payload this version returns.

| Need | Field | Declared at | Type | Notes |
|---|---|---|---|---|
| Headline price | `pkg.product.priceString` | `offerings.d.ts:91` | `string` | **The correct field.** Already formatted with the local currency sign by the store. For Google Play it is the formatted price of `defaultOption`. |
| "$5.00/month" derived line | `pkg.product.pricePerMonthString` | `offerings.d.ts:128` | `string \| null` | Present, and locale-formatted. **Nullable** (null for INAPP products) and documented as *"may be an approximation"*; for Google it is computed from the basePlan. Needs a null guard. |
| Savings % | `pkg.product.price` + `pkg.product.currencyCode` | `:86`, `:141` | `number`, `string` | Compute `1 − (annual.price / (monthly.price × 12))`. Safe to compare because both packages come from the same `offerings.current`, hence the same storefront and the same `currencyCode`. |
| Raw micros, if ever needed | `pkg.product.defaultOption.pricingPhases[n].price.amountMicros` | `:703` | `number` | Present via `SubscriptionOption` → `PricingPhase` → `Price`. **Google Play only** (`defaultOption` is `null` on iOS). There is **no** top-level `priceAmountMicros` on `PurchasesStoreProduct` in 9.15.2 — that name is the Android Billing Library's, not RevenueCat's. |

**Recommendation for the fix (not applied):** read `priceString` for the headline,
`pricePerMonthString` for the sub-line with a null fallback, and derive the % from `price`.
Do **not** reconstruct a currency string from `price + currencyCode` by hand — that reintroduces
locale formatting bugs (₹ placement, digit grouping, decimal count) that `priceString` already
solves.

### Why this is 🔴, stated plainly

Your framing is correct and I can add a mechanism to it. Google Play localises subscription prices
per billing country. A user in India is charged in **INR** at whatever the Play Console price for
that country is; the paywall shows them **`$7.99`**. There is no relationship between the two
numbers beyond whatever the price template happens to produce. The user sees a dollar figure,
authorises a rupee charge in the Play sheet, and the two disagree by a factor of ~85 in magnitude
plus whatever regional pricing multiplier applies. This is live in production now.

Beyond conversion damage, this is a **Play policy surface**: Play's Subscriptions and
Monetisation policy requires that pricing be presented accurately and not be misleading before
purchase. Showing a USD figure to an INR-billed user is the textbook case the requirement exists
for. I'm flagging the exposure, not rendering a legal opinion.

**Blast radius**: one screen, one file, but it is the *only* commerce surface in the app —
`(paywall)/index.tsx` is reached from ≥8 `router.push('/(paywall)/')` origins (UI-audit §8). Every
paying user passes through it. Nothing else in the app renders a price.

**Fix size: S.** ~30 lines in one file. No new dependency, no server change, no native change. The
package objects are already fetched and already in scope.

---

## A2 — Constructed package identifier · ✅ CONFIRMED · 🟠 HIGH (latent) · affects MONEY

Confirmed at `:34-37`, one line later than hypothesised:

```tsx
:34    const packageId = `${selectedPlan}_${billingPeriod}`;
:35    const selectedPackage = offerings.current?.availablePackages.find(
:36      (pkg: any) => pkg.identifier === packageId
:37    );
```

`selectedPlan` ∈ `{'premium','premium_plus'}` (`:11`), `billingPeriod` ∈ `{'monthly','annual'}`
(`:10`), so the template can only ever produce four strings:
`premium_monthly`, `premium_annual`, `premium_plus_monthly`, `premium_plus_annual`.

**The `offerings.current?.` form is correct** and preserves invariant **P1** (UI-audit §5.5) — do
not let an A1 refactor regress it to `offerings.availablePackages`.

### Actual identifiers configured anywhere in the repo

The **only** authoritative-looking record is `docs/REVENUECAT_SETUP.md:590-613`, which specifies
the *offering package* identifiers as:

```
premium_monthly       → product revelia_premium_monthly
premium_annual        → product revelia_premium_annual
premium_plus_monthly  → product revelia_premium_plus_monthly
premium_plus_annual   → product revelia_premium_plus_annual
```

**These match the template exactly.** So A2 is not currently broken — it is a **latent** defect.

### Can it drift? Yes, in three specific ways

1. **The RevenueCat "package type" presets.** RevenueCat's built-in package identifiers are
   `$rc_monthly`, `$rc_annual`, `$rc_lifetime`, etc. If anyone ever recreates the offering using
   the dashboard's Monthly/Annual presets instead of typing custom identifiers, every package
   identifier becomes `$rc_*`, the `.find()` returns `undefined`, and **100% of purchases fail**
   with `Alert('Error', 'Selected plan not available')` (`:40`). Nothing in the app would warn
   before that point — the prices would still render, because they're hardcoded (A1). The two
   defects hide each other.
2. **The identifiers live only in a doc**, not in code and not in a typed constant. There is no
   compile-time or runtime assertion that the four expected packages exist. Grep confirms the
   strings appear in `docs/` and `mobile/SUBSCRIPTION_*.md` only — never in `mobile/`'s TypeScript.
3. **Lifetime.** CLAUDE.md describes a **Lifetime** tier. The template cannot express it
   (`billingPeriod` has no `lifetime` member), so if a Lifetime package is ever added to the
   current offering it is unreachable from this screen.

**A more robust matcher exists in the payload** and is worth knowing about for the A1 work:
`pkg.packageType` (`offerings.d.ts:312`, enum `PACKAGE_TYPE` at `:5-42`) gives
`MONTHLY`/`ANNUAL`/`CUSTOM`, and `PurchasesOffering` exposes `.monthly` / `.annual` convenience
accessors (`:398`, `:414`). Those are stable across identifier renames — but they cannot
distinguish `premium` from `premium_plus`, because both tiers have a monthly and an annual
package in one offering. So a two-tier paywall genuinely needs identifier-or-product-id matching;
the right hardening is to **derive the list from `availablePackages` and render what is actually
there**, rather than to assume four and construct a key. That is the same refactor A1 wants.

**Fix size: XS**, and it falls out of A1 for free if A1 is implemented as "render the packages you
received" rather than "look up the package you assumed".

---

## A3 — Cancellation handling · ❌ **REFUTED** · 🟠 HIGH · affects MONEY (conversion)

**Your hypothesis is wrong, and the truth is a different problem — I'd rather say so than agree.**

There is an `Alert('Purchase Failed')` at `:56`, exactly where you expected it:

```tsx
:46    try {
:47      const success = await purchasePackage(selectedPackage);
:48
:49      if (success) {
:51        Alert.alert('Success!', 'Your subscription is now active', [
:52          { text: 'Continue', onPress: () => router.back() }
:53        ]);
:54      }
:55    } catch (error: any) {
:56      Alert.alert('Purchase Failed', error.message || 'Please try again');
:57    }
```

**But it is unreachable.** Trace the call chain:

- `mobile/lib/revenuecat.ts:51-61` — `purchasePackage` wraps `Purchases.purchasePackage(pkg)` in
  try/catch and **returns `null`** on any throw. It never rethrows.
- `mobile/store/subscriptionStore.ts:57-80` — the store's `purchasePackage` calls that wrapper.
  `if (!customerInfo) { set({ isLoading: false }); return false; }` (`:61-64`). Its own
  `catch` at `:76-79` can therefore only fire on a throw from `mapCustomerInfoToTier` /
  `applyTierToAuthUser` — the backend sync is separately try/caught at `:70-74`. In practice it
  **never** fires either. It returns `false`.
- Back in the screen, `success === false`, the `if (success)` at `:49` is skipped, **and there is
  no `else`**.

**Net user-visible behaviour today: tapping "Start 7-Day Free Trial" and then cancelling, or
hitting a genuine billing error, produces absolutely nothing.** No alert, no message, no state
change. The button's brief spinner (`disabled={isLoading}`, `:201`) stops and the screen sits
there unchanged.

### Does the code distinguish `userCancelled`? Partially — and only to suppress a log line

`mobile/lib/revenuecat.ts:55-60`:

```ts
:55    } catch (e: any) {
:56      if (!e.userCancelled) {
:57        console.warn('[RevenueCat] purchase failed:', e);
:58      }
:59      return null;
:60    }
```

So the codebase **knows** `userCancelled` exists and reads it — but uses it only to decide whether
to `console.warn`. **The distinction is discarded before it reaches any caller.** Both branches
`return null`, and `null` is collapsed to `false` one layer up. By the time the UI sees the result,
"the user changed their mind" and "the card was declined / Play Billing is unavailable / the
product is misconfigured" are the same value.

Which of the two outcomes is worse is a judgement call, and it isn't mine to make:
- Silence on **cancel** is *better* than the false alarm you expected. That part is fine.
- Silence on **genuine failure** is the actual defect. A user whose payment fails gets no
  explanation and no retry prompt. They will assume the app is broken. There is also no
  observability — `store.error` is set on the (unreachable) store catch path but is **never read
  by any component**; grep for `error` consumers of `useSubscriptionStore` returns none in
  `app/(paywall)/index.tsx`.

### Comparison with the established share-dismissal pattern

You pointed at `lib/share.ts`; the file is actually **`mobile/utils/shareReading.ts`** (there is no
`lib/share.ts`). The pattern there is exactly the one this code is missing, and the contrast is
instructive:

| | `shareReading.ts` (the good pattern) | `revenuecat.ts` + paywall (today) |
|---|---|---|
| Cancel must not throw | `failOnCancel: false` on `RNShare.open` (`:44-53`) | n/a — RC always throws on cancel |
| Cancel is **detected** | exported `isShareDismissal(error)` (`:14-19`), imported by callers, never redefined per file | `e.userCancelled` read once, **not exported, not propagated** |
| Cancel is **distinguishable by the caller** | function returns `boolean`; `true` = real share | function returns `CustomerInfo \| null`; `null` = *anything but success* |
| Caller acts on the distinction | callers gate `recordMeaningfulAction('share:…')` on it (`ShareCard.tsx:38-39`, `ShareableQuote.tsx:20-21`) | caller can't — the information is gone |

CLAUDE.md and UI-audit **X6** both make the share behaviour a HARD invariant precisely because
someone tried to "simplify" it away. The purchase path is the same problem with the fix only
half-applied: detection exists, propagation doesn't.

The RC error shape is `PurchasesError` with a `userCancelled: boolean` and a
`PURCHASES_ERROR_CODE` (`node_modules/react-native-purchases/dist/errors.d.ts`), so the tri-state
`{ success | cancelled | failed(code) }` is fully available at the `lib/revenuecat.ts` boundary
and simply isn't returned.

**Fix size: S.** ~15 lines across two files (`lib/revenuecat.ts` returns a discriminated result;
`(paywall)/index.tsx` shows an alert only on the `failed` branch). **This touches the purchase
path, so it wants a Play-signed Internal Testing pass, not a sideloaded APK** (`dev-notes/workflow.md`
Part B step 6).

---

## A4 — No offerings-failed state · ✅ CONFIRMED · 🔴 CRITICAL (compounds A1)

Confirmed. There is no loading state, no empty state and no error state for offerings on this
screen.

- `:15-17` — `useEffect(() => { fetchOfferings(); }, [])`. Fire and forget; the promise result is
  not awaited or inspected by the component.
- `store/subscriptionStore.ts:42-55` — `fetchOfferings` catches, sets `error`, and clears
  `isLoading`. On a *successful* call that returns nothing it sets `offerings: null` and only
  `console.warn`s (`:47-49`).
- The component **never reads `error`** and never reads `offerings` outside `handlePurchase`.
  Destructuring at `:13` pulls `offerings, isLoading, fetchOfferings, purchasePackage,
  restorePurchases` — **`error` is not even destructured.**
- The render body (`:77-243`) is unconditional apart from `isLoading` swapping the CTA label for an
  `ActivityIndicator` (`:204-215`).

**So: yes, on a rejected or empty fetch the screen renders the full paywall with the hardcoded
prices, the plan cards, the toggle and the trial CTA, indistinguishable from the healthy state.**
The first and only feedback is when the user taps Purchase and gets
`Alert('Error', 'Subscription plans not loaded')` (`:29`).

This is what makes A1 worse rather than merely wrong: the hardcoded prices are also the **failure
fallback**. Fixing A1 without adding A4's state would turn a silent wrong-price screen into a
silent blank-price screen. **They should be scoped together.**

**Fix size: S**, ~20 lines — but only meaningful alongside A1.

---

## A5 — CTA contrast · ⚠️ CONFIRMED IN KIND, NUMBER CORRECTED · 🟡 MEDIUM

**Actual colours** (`(paywall)/index.tsx:199-216`):

```tsx
:202    className="bg-gold rounded-2xl py-4 items-center"
:208      <Text className="text-white text-lg font-bold mb-1">Start 7-Day Free Trial</Text>
:211      <Text className="text-white text-xs opacity-80">Cancel anytime</Text>
:205      <ActivityIndicator color="#FFFFFF" />   // the loading state, also white-on-gold
```

- `bg-gold` → `#F59E0B` (`mobile/tailwind.config.js:17`)
- `text-white` → `#FFFFFF`

**Computed contrast (WCAG 2.1 relative luminance):**

| Pair | Ratio | WCAG AA normal (4.5:1) | WCAG AA large (3:1) |
|---|---|---|---|
| `#FFFFFF` on `#F59E0B` — the CTA label | **2.15 : 1** | ❌ fail | ❌ fail |
| `#FFFFFF @ 80%` on `#F59E0B` — "Cancel anytime" (`:211`) | **1.84 : 1** | ❌ fail | ❌ fail |
| `#000000` on `#F59E0B` — for comparison | 9.78 : 1 | ✅ | ✅ |

Working: L(#F59E0B) = 0.4389, L(white) = 1.0 → (1.0 + 0.05) / (0.4389 + 0.05) = **2.147**.

**Your hypothesis was 2.6:1; the real figure is 2.15:1 — worse, not better.** The conclusion is
unchanged and if anything strengthened.

Note also that `text-lg` = 18px and `font-bold` = 700. WCAG's "large text" threshold is 18.66px
bold / 24px regular, so **18px bold does not qualify** — the CTA is held to the full 4.5:1, which
it misses by more than 2×.

**The codebase already contains the correct pairing, eight lines above:**
`(paywall)/index.tsx:176-178` renders the "BEST VALUE" pill as `bg-gold` + **`text-black`**, and
`components/subscription/PremiumBadge.tsx:9-10` does the same
(`tier === 'premium_plus' ? 'bg-gold' : 'bg-pink'` paired with `'text-black'` / `'text-white'`).
So this is an inconsistency within one file, not a missing convention.

Adjacent, for the revamp's benefit: `#FFFFFF` on `bg-pink` `#EC4899` (the "MOST POPULAR" pill,
`:148-150`) is **3.53 : 1** — passes AA-large, fails AA-normal at the `text-xs` size it's used at.

**Fix size: XS** — one word, `text-white` → `text-black` on `:208`, plus `:211` and the
`ActivityIndicator color` at `:205`. Three edits, no logic. **Left alone as instructed.** I'd note
it is also the single change here most likely to be superseded by the revamp's own token decisions,
so there's a real argument for *not* hotfixing it (see HOTFIX CANDIDATES).

---

## A6 — Trial eligibility · ✅ CONFIRMED (your assumption is correct) · 🟠 HIGH · affects POLICY

`(paywall)/index.tsx:208-210` renders **"Start 7-Day Free Trial"** unconditionally. There is no
eligibility check anywhere in `mobile/` — grep for `checkTrialOrIntroductoryPriceEligibility`,
`introPrice`, `INTRO_ELIGIBILITY`, `periodType` across `app/`, `components/`, `lib/`, `store/`,
`services/`, `hooks/` returns **zero hits outside `node_modules`**.

### (a) What intro-offer fields does the installed SDK expose?

From `node_modules/@revenuecat/purchases-typescript-internal/dist/offerings.d.ts` (v9.15.2):

| Field | Line | Type | What it tells you |
|---|---|---|---|
| `product.introPrice` | `:145` | `PurchasesIntroPrice \| null` | **That the PRODUCT has an intro offer** — its `price`, `priceString`, `cycles`, `period`, `periodUnit`, `periodNumberOfUnits` (`:273-298`). Says nothing about *this user*. |
| `product.discounts` | `:149` | `PurchasesStoreProductDiscount[] \| null` | Explicitly **"Null for Android."** |
| `product.defaultOption` / `subscriptionOptions` | `:170`, `:174` | `SubscriptionOption \| null` / `[]` | **Google Play only.** |
| `SubscriptionOption.freePhase` | `:587` | `PricingPhase \| null` | The free-trial pricing phase — *"the first pricing phase where amountMicros is 0"*. Again a **product** property. |
| `SubscriptionOption.introPhase` | `:593` | `PricingPhase \| null` | Same, for a discounted (non-free) intro phase. |
| `PricingPhase.offerPaymentMode` | `:650` | `OFFER_PAYMENT_MODE \| null` | `FREE_TRIAL` / `SINGLE_PAYMENT` / `DISCOUNTED_RECURRING_PAYMENT` (`:674-687`). |
| `INTRO_ELIGIBILITY_STATUS` | `:47-64` | enum | `UNKNOWN(0)` / `INELIGIBLE(1)` / `ELIGIBLE(2)` / `NO_INTRO_OFFER_EXISTS(3)` |

### (b) Does ANY of them indicate per-USER eligibility on Android? **No.**

Every field above is a property of the *product/offer*, not of the *user*. The one API that is
about the user is `Purchases.checkTrialOrIntroductoryPriceEligibility(productIdentifiers)` — and
here is the nuance that slightly refines your assumption:

**The method is not iOS-only in the sense of being absent on Android — it exists and is callable.**
The Android native module implements it
(`node_modules/react-native-purchases/android/src/main/java/com/revenuecat/purchases/react/RNPurchasesModule.java:347-353`).

But the JS-layer doc comment in the installed package states the behaviour outright
(`node_modules/react-native-purchases/dist/purchases.d.ts:438-455`):

> ```
> :439  iOS only. Computes whether or not a user is eligible for the introductory pricing period…
> :447  … Android always returns INTRO_ELIGIBILITY_STATUS_UNKNOWN.
> ```

**So: your working assumption is correct.** Android exposes no pre-purchase eligibility check.
Calling the method on Android compiles, runs, resolves, and returns `UNKNOWN` for every product,
every time. The same doc block also states the intended handling of `UNKNOWN`:

> `:445-446` *"The best course of action on unknown status is to display the non-intro pricing, to not create a misleading situation."*

That is RevenueCat's own guidance, and by it the current unconditional trial copy is the wrong
default for the app's only shipping platform.

For completeness on the correction you invited: there is no Android equivalent of the iOS
subscription-group eligibility computation, because Google Play does not expose one pre-purchase.
Play decides trial eligibility server-side at purchase time, per **Google account × subscription**,
and simply does not offer the trial in the purchase sheet if the account has used it. The user
therefore sees a sheet that charges immediately, having just tapped a button promising 7 days free.

### (c) Does the app hold its own subscription-history signal?

Three candidates, none of them a true eligibility proxy. In descending order of usefulness:

1. **Client-side, already available, unused — `CustomerInfo`.** The installed
   `customerInfo.d.ts` exposes `allPurchasedProductIdentifiers: string[]` (`:156`),
   `allPurchaseDates` (`:182`), `allExpirationDates` (`:176`),
   `originalPurchaseDate: string | null` (`:199`), `nonSubscriptionTransactions` (`:211`) and
   per-entitlement `periodType: string` (`:37`, i.e. `TRIAL`/`INTRO`/`NORMAL`) and
   `originalPurchaseDate` (`:49`). `mobile/lib/revenuecat.ts:73-81` already calls
   `getCustomerInfo()`, and `mapCustomerInfoToTier` (`:87-92`) reads only
   `customerInfo.entitlements.active` — **everything else on the object is discarded.**
   → A non-empty `allPurchasedProductIdentifiers` is a sound *"this RevenueCat app-user-id has
   purchased before"* signal, obtainable with zero server work.
   ⚠️ **Caveat that matters**: it keys on the **RevenueCat app user ID** — which this app sets to
   the Revelia `user._id` via `identifyUser(user._id)` (`revenuecat.ts:24-31`, called from all
   three login paths per CLAUDE.md). Google Play keys eligibility on the **Google account**. A user
   who signs up with a fresh Revelia account on a phone whose Google account already consumed the
   trial has an empty RC history and a Play-ineligible account. **So this is a one-way signal:
   it can tell you someone is definitely *not* a first-timer; it cannot tell you they are.**

2. **Server-side, partial — `User.subscription`.** `server/src/models/User.ts:20-40` and the
   schema at `:170-190` store `tier`, `revenueCatId`, `expiresAt`, `productId`, `willRenew`,
   `lastSyncedAt`, `lastEventType`, `lastEventAt`, plus the `comp` sub-doc. There is **no purchase
   history array**. A past subscriber who lapsed does retain `expiresAt` (in the past) and
   `lastEventType`, so `expiresAt != null` is a usable *"has ever subscribed"* proxy — but the
   client does not currently receive it in a form the paywall reads: `GET /api/subscription/status`
   returns `{tier, isActive, expiresAt, productId, willRenew, managementUrl}`
   (`server/src/controllers/subscription.controller.ts:46-56`), and `subscriptionStore` never
   calls it (`mobile/services/subscription.service.ts:11-14` defines `getStatus`; grep finds no
   caller).

3. **`subscriptionStore`** itself holds `tier`, `isActive`, `expiresAt` (`:14-20`) — all
   *current*-state, no history. `expiresAt` is only ever set from
   `customerInfo.latestExpirationDate` on a purchase/restore (`:69`, `:92`, `:154`), so a
   never-restored lapsed user has `null`.

### Severity and honest framing

The policy exposure is real but narrower than A1's: it is a **misleading-offer** risk on the CTA
label, affecting only the subset of users who have already consumed the trial for that
subscription on that Google account. It cannot be fully solved client-side on Android by anyone —
not just by this codebase — because the platform does not expose the answer.

**Fix sizes, three options, none applied:**
- **S (~5 lines)** — make the copy conditional on the *product* rather than the *user*: show the
  trial label only when `pkg.product.introPrice != null` (or
  `defaultOption.freePhase != null`), and soften it to something that does not promise
  eligibility. Falls out of A1's refactor almost for free and is the RevenueCat-recommended
  posture for `UNKNOWN`.
- **M** — add the `CustomerInfo.allPurchasedProductIdentifiers` check as a one-way suppressor
  (hide "free trial" for known past purchasers). Client-only, no server work, catches the common
  case (same Revelia account re-subscribing).
- **M+ / server** — surface `hasEverSubscribed` from `User.subscription.expiresAt != null ||
  lastEventType != null` on `/subscription/status` and have the paywall read it. Most robust of
  the three, still not authoritative against Play.

---

# B · TIER-CHECK SWEEP — every R1 violation, enumerated

**Method.** `grep -rn` over `mobile/app/` + `mobile/components/` (`--include=*.tsx`, 93 files) for
`tier ===`, `tier !==`, `isPremium`, `isPremiumPlus`, `subscriptionTier`, and the literals
`'free'` / `'premium'` / `'premium_plus'`. Every hit was then read in context and cross-checked
against the corresponding server route/service to determine whether a server-side signal exists.
Raw hits: **158**. After removing derivations, prop plumbing and paywall-local plan-selection
state, the classified sites are below.

**Your premise is confirmed and then some.** The audit's §1 said "Mechanism A gating on 12 screens"
and never listed the sites. `home.tsx:336` and `:363` are indeed live ACCESS GATEs the register
missed, along with the two PLUS pills at `:350` and `:377` — and there are **29 more ACCESS GATE
sites** beyond them.

## B.1 — Classification table

Legend: **SD** = status display · **FG** = fetch guard · 🔴 **AG** = access gate (R1 violation) ·
**?** = unclear. "Server signal reaches client?" answers: *is there already something on the wire
the client could key off instead of the tier name?*

### Derivations (not gates themselves — listed so the table is complete)

| Site | What it is |
|---|---|
| `(capture)/palm-capture.tsx:53`, `astrology/index.tsx:135-136`, `astrology/monthly.tsx:43,98,99`, `compatibility/index.tsx:23,126`, `compatibility/[id].tsx:64,142`, `home.tsx:29`, `numerology/index.tsx:323-324`, `readings/combined.tsx:81`, `readings/face.tsx:81-83`, `readings/index.tsx:21,287,329`, `readings/palm.tsx:109-111`, `components/account/UpdateNameModal.tsx:42` | `const tier = user?.subscription?.tier \|\| 'free'` and friends |

### FETCH GUARDS — fine

| Site | Gates | Verdict |
|---|---|---|
| `home.tsx:47` | Skips two `api.get` calls (`/readings/name-destiny`, `/readings/career-destiny`) for non-Plus. Server would 403 anyway (`readings.routes.ts:32,38` → `requirePremiumPlus`). | **FG** — the reference example, as you said. Purely an optimisation; removing it changes nothing but network noise. |
| `astrology/weekly.tsx:25` | `if (tier === 'premium_plus') fetchWeeklyForecast(); else setShowPaywall(true)` | **FG + 🔴 AG** — see below. The fetch half is fine. |

### 🔴 ACCESS GATES — R1 violations

| # | Site | What it gates | Server signal reaches client? | Field needed |
|---|---|---|---|---|
| 1–3 | `(capture)/palm-capture.tsx:142`, `:188`, `:246` | Free captures **1** hand, paid captures **2**. Branches the capture flow. | ⚠️ **Partly.** `reading.service.ts:224` rejects `hand === 'non-dominant'` for free users — but only on POST, after the photo is taken. | A `handsAllowed: 1 \| 2` on the profile/capture bootstrap. Already registered as §5.6 HARD (behaviour). |
| 4 | `(capture)/palm-capture.tsx:460` | Step label `'Step 1 of ' + (tier === 'free' ? '1' : '2')` | as above | copy derived from the same field |
| 5–9 | `astrology/index.tsx:505,511,517,523,529` | `locked={!isPremium}` on five `LifeThemeCard`s | ❌ **No.** `astrology.routes.ts` `GET /birth-chart` has no tier filtering; grep for `lifeThemes` in `server/src/services/` returns nothing. **The full life-themes text is sent to free users and blurred client-side.** | A server-side omission of `lifeThemes` for free tier, or a `locked: string[]` list on the response. |
| 10 | `astrology/index.tsx:561` | Weekly Forecast card `onPress`: non-Plus gets `Alert` → paywall | ✅ Yes, as a 403 (`insight.service.ts:667-669`) — but only *after* navigating. | A pre-render entitlement map (see B.5). |
| 11 | `astrology/monthly.tsx:148`, `:202` | Renders `LockedSection` ×4 instead of content for free | ✅ Effectively — content is **generated** free-vs-premium (`insight.service.ts:744`), so free payloads genuinely lack it. | Prefer: presence-of-field instead of tier name. |
| 12–19 | `astrology/monthly.tsx:233,238,242,250,253,257,265,283,315,325,330` | Cosmic Advice, Money, Health, Challenges — hidden from **premium** (non-Plus) | ❌ **No — and the data IS on the wire.** See **B1** below. 🔴 | A `premium_plus` split in `buildMonthlyReadingPrompt`, or field-level omission at the controller. |
| 20 | `astrology/weekly.tsx:25` + `:32-56` | Full-screen paywall instead of the forecast | ✅ 403 exists (`insight.service.ts:667`) | pre-render entitlement map |
| 21 | `compatibility/index.tsx:39` + `:252` | Free quota `Math.max(0, 1 - readings.length)`; disables the Start button | ⚠️ **Server computes the identical number and discards it** — see **B4**. | `remainingFree` on `GET /api/compatibility` |
| 22 | `compatibility/index.tsx:178` | Non-`love` relationship types locked for non-Plus | ✅ Server enforces (`compatibility.controller.ts:27`) | pre-render entitlement map |
| 23–28 | `compatibility/[id].tsx:224,230,236,248,261,268` | `locked={!isPremium}` + `isPremium && …` on six `SectionCard`s | ❌ Not verified as tier-filtered server-side. Treat as client-only until confirmed. | field-level omission |
| **29** | **`home.tsx:336`** | **Name Destiny card: `tier === 'premium_plus'` decides navigate-vs-paywall** | ✅ 403 exists (`readings.routes.ts:32`) but only post-navigation | pre-render entitlement map |
| **30** | **`home.tsx:363`** | **Career Destiny card: same** | ✅ same (`readings.routes.ts:38`) | same |
| 31 | `numerology/index.tsx:663` | Name Destiny card: navigate vs paywall | ✅ same | same |
| 32 | `readings/combined.tsx:84` + `:108` | `router.replace('/(paywall)/')` then `return null` — full-screen bounce | ❌ **No server counterpart exists at all** — see **B2**. | a real endpoint, or accept client-only |
| 33 | `readings/combined.tsx:341` | Birth-chart block hidden from non-Plus | ❌ Client-only; `/astrology/birth-chart` is ungated | field-level omission |
| 34–46 | `readings/face.tsx:222,249,284,289,330,335,346,351,362,367,373,380,386,391,397,402,408,413,419,424,436` | `isPremium` decides content vs `LockedSection` on ~11 sections | ✅ Effectively — reading is **generated** at free-vs-premium depth (`reading.service.ts:110`), so free payloads lack `premiumContent`. ⚠️ **Except** for a user who downgrades: their stored premium reading is still returned and only the client hides it. | presence-of-field (`premiumContent != null`) instead of tier name |
| 47–60 | `readings/palm.tsx:251,278,320,325,334,341,348,353,360,365,377,384,392,397,403,408,414,419,425,430,436,441` | Same shape as face | same as face | same |
| 61 | `readings/index.tsx:60` | Combined-profile entry: bounce to paywall | ❌ (mirrors #32) | — |
| 62 | `readings/index.tsx:288` | Name Destiny entry: navigate vs paywall | ✅ 403 exists | pre-render entitlement map |
| 63 | `readings/index.tsx:330` | Career Destiny entry: navigate vs paywall | ✅ 403 exists | same |

> Counting note: the table groups the repetitive `isPremium && … : !isPremium ? <LockedSection/>`
> ladders in `face.tsx` / `palm.tsx` / `[id].tsx` as ranges. Counting each JSX branch separately
> gives **77** raw sites; counting each *decision* gives **31 distinct gates across 12 files**.
> The "12 screens" in the audit's §1 was the right order of magnitude for *files* and gave no
> sense of the site count.

### STATUS DISPLAY — fine, no action

| Site | What it shows |
|---|---|
| `home.tsx:74` | `{tier?.toUpperCase()} Member` pill |
| `home.tsx:350`, `:377` | **PLUS** pills on the two destiny cards. *Display*, but see note below. |
| `astrology/index.tsx:582`, `:609` | PLUS pill / 🔒 and "Basic vs Complete" subtitle |
| `astrology/daily.tsx:140-142` | `ContinuityCard onUnlock` — Plus gets no CTA, others get a paywall link. Nothing is withheld; the *content* is already server-tiered (`insight.service.ts:394`, `:587`). **Upsell display.** |
| `numerology/index.tsx:676,688,694` | PREMIUM PLUS pill + swapped copy |
| `readings/index.tsx:222,235,242,301,313,319,343,355,361` | Lock chips + swapped CTA labels |
| `profile.tsx:238`, `:314` | `tierDisplay[…]` — the user's own plan |
| `profile.tsx:298-306` | Free-tier upsell card |
| `profile.tsx:138`, `:664` | `setUserTags({ tier, timezone })` — OneSignal targeting, not UI |
| `(paywall)/index.tsx:65` | `tier !== 'free'` on the **restore result** — reports outcome |
| `components/account/UpdateNameModal.tsx:42` | `TIER_LIMIT_COPY[tier]` — describes a limit the server enforces (`name-update-rate-limit.middleware.ts:24`) |
| `components/readings/LockedSection.tsx:15-19` | Styles a **prop**, not the user's tier |
| `components/subscription/LockedOverlay.tsx:21`, `PremiumBadge.tsx:9-11` | Prop-driven copy/colour |
| `readings/qa.tsx:416`, `:419` | `nextTier` for **CTA copy only** — explicitly permitted by invariant **Q4** (UI-audit §5.2) |

> ⚠️ On the PLUS pills at `home.tsx:350,377`: classified **SD** because they render a badge rather
> than withhold anything. But they are *coupled* to gates #29/#30 — same `tier` expression,
> inverted. A revamp that changes one and not the other produces a card that says PLUS and
> navigates anyway, or vice versa. Treat the pill + the gate as one unit.

### UNCLEAR

| Site | Why |
|---|---|
| `compatibility/index.tsx:727` | `msg.toLowerCase().includes('free') \|\| includes('upgrade') \|\| status === 403` — **string-matching a server error message** to decide whether to route to the paywall. Not a tier check on the user; it is a fragile substitute for a machine-readable error code. The server *does* send a structured body (`subscription.middleware.ts:40-46` returns `requiredTier` / `currentTier` / `upgradeUrl`) — but this path is the compatibility service's `AppError`, which does not. Flagging as a distinct latent defect, not an R1 violation. |
| `readings/face.tsx:83`, `readings/palm.tsx:111` | `isPremiumPlus` declared and **never used** — see **B3**. |

---

## B1 🔴 — `astrology/monthly.tsx` hides content the server already sent to Premium users · NEW

The Premium-Plus-gated sections in `monthly.tsx` — **Cosmic Advice** (`:233-235`), **Life Areas:
Money** (`:238-250`), **Life Areas: Health** (`:253-265`), **Challenges & Opportunities**
(`:283-325`) — are gated on the client-only `isPremiumPlus` (`:99`).

But the server does not distinguish Premium from Premium-Plus for monthly readings **at all**:

- `server/src/services/insight.service.ts:744` —
  `const tier = getEffectiveTier(user) === 'free' ? 'free' : 'premium';`
- `server/src/services/claude.service.ts:555` — signature is `tier: 'free' | 'premium'`
- `server/src/prompts/monthly-reading.prompt.ts:54` — same two-value parameter; `:59`
  `const isPremium = tier === 'premium'`
- The premium JSON schema in that prompt explicitly emits `"money"` (`:239`), `"health"` (`:243`)
  and `"challenges"` (`:249`).

**Therefore a `premium` (non-Plus) user is sent `areas.money`, `areas.health`, `challenges` and
`opportunities` over the wire, and `monthly.tsx` renders a `LockedSection` on top of data it
already holds.** The lock is decorative. Anyone inspecting the response, or any future code path
that renders the object generically, sees Premium-Plus content.

This is not a security boundary (it is entertainment prose, not PII), so I would not call it a
breach — but it *is* a paid-tier boundary that exists only in the client, and it is exactly the
class of thing R1 was written to prevent. It also means the Premium/Premium-Plus distinction on
this screen currently costs the same tokens to generate for both tiers.

**Fix size: M**, and it is genuinely server work: either add a third tier value to
`buildMonthlyReadingPrompt` / `generateMonthlyReading`, or omit the four fields at the controller
for non-Plus. Not a mobile-only release item.

## B2 — `readings/combined.tsx` has no server counterpart · NEW

`combined.tsx:84` does `router.replace('/(paywall)/')` for `tier === 'free'` and `:108` returns
`null` as a belt-and-braces second gate (registered §5.6). But there is **no `/readings/combined`
route on the server** — `grep -rn "combined" server/src/routes/` returns nothing. The screen
composes its content from `fetchFaceReading`, `fetchPalmReading`, `fetchProfile`,
`fetchNumerology`, `fetchBirthChart` (`:93-99`) — five endpoints a free user is entitled to call.

So the Combined/"Cosmic Blueprint" paywall is **100% client-side**. Same for the
`premium_plus` birth-chart block at `:341`.

**Fix size: M** (needs a server endpoint or an entitlement field) — or a deliberate decision to
accept it, which is defensible for a screen that is only an aggregation of already-permitted data.
Worth an explicit owner ruling either way, because a revamp will move this code.

## B3 — Dead `isPremiumPlus` · NEW · 🟢 LOW

`readings/face.tsx:83` and `readings/palm.tsx:111` both declare
`const isPremiumPlus = tier === 'premium_plus';` and **never reference it again** (verified: grep
returns only the declaration line in each file). Consistent with the server's two-value
free/premium generation for those readings (`reading.service.ts:110`, `:310`) — the Plus
distinction was presumably planned and never built.

**Fix size: XS** (two line deletions). Harmless today; worth deleting during the revamp so it
doesn't get "reconnected" by someone assuming it was wired up. `tsc` does not flag it
(`noUnusedLocals` is not enabled).

## B4 — Compatibility's `remainingFree` is computed server-side and discarded · NEW · 🟢 LOW

`compatibility/index.tsx:39` computes `tier === 'free' ? Math.max(0, 1 - readings.length) : Infinity`.
`server/src/services/compatibility.service.ts:150-175` computes the identical quantity
(`return { allowed: true, remainingFree: 1 - existingCount }`, `:174`) — and
`grep -rn "remainingFree" server/src/` shows it appears **only** in that function's return type
and that one return statement. **It is never put in a response body.**

So the client re-derives a number the server already has, from `readings.length` — which is the
length of whatever page of compatibility readings the client happens to have fetched, not a
server-authoritative count (`Compatibility.countDocuments`).

**Fix size: S–M** — one field on `GET /api/compatibility`'s response plus the client read. Small,
but it is server work, so not a mobile-only release item. Already flagged in UI-audit §5.6 and
§9 Q11 as a later-build candidate; this adds the detail that **the server-side half already
exists**, which makes it cheaper than the audit implied.

## B5 — The one field that would close most of the gates

Nine of the 31 gates (#10, #20, #22, #29, #30, #31, #62, #63, and the palm 1-vs-2 gate) exist
purely because the client must decide **before navigating** what the server would say. Each has a
server enforcement point that only speaks *after* the request:
`subscription.middleware.ts:40-46` returns a structured 403 with `requiredTier`, `currentTier` and
`upgradeUrl`, and `insight.service.ts:667` / `compatibility.controller.ts:27` return their own.

**A single `entitlements: Record<string, boolean>` (or `features: string[]`) on the existing
`GET /api/subscription/status` response — or, better, on the hydrated user object at
`server/src/controllers/auth.controller.ts:46-60` — would let all nine become mechanism C.**

Two facts make this cheaper than it looks:
- `FEATURE_ACCESS` already exists as a complete feature→tier matrix
  (`mobile/lib/constants.ts:15-86`) and, per UI-audit §1, is an **unused mirror table** —
  `canAccess()` (`subscriptionStore.ts:114-118`) has zero callers. Moving that table to the server
  and serving its evaluated result is a small, well-defined change with an obvious shape.
- `getEffectiveTier()` (`server/src/utils/subscriptionTier.ts:50-60`) is already the single
  server-side resolver and already handles comp grants.

**One thing to correct up front, because it would be easy to assume otherwise:** the client's
`user.subscription.tier` is **not** raw billing truth — `auth.controller.ts:54-60` serialises
`tier: getEffectiveTier(user)`, so comp grants *are* respected by every mechanism-A gate. That is
handled correctly today and a refactor must not lose it.

⚠️ **But there is one path that can silently undo it.** `subscriptionStore.applyTierToAuthUser()`
(`:126-141`) overwrites `authUser.subscription.tier` with the **RevenueCat-derived** tier from
`mapCustomerInfoToTier()`, and it is invoked from `purchasePackage` (`:69`), `restorePurchases`
(`:92`) **and the global `CustomerInfo` listener registered at app launch**
(`initSubscriptionSync()`, `:148-156`, called from `app/_layout.tsx:73`). A comped user has no
RevenueCat entitlement, so `mapCustomerInfoToTier` returns `'free'` — and if that listener fires,
the comp-derived tier the server sent is replaced with `'free'` in the client store, locking every
mechanism-A gate while the server continues to grant access.

I have **not** been able to confirm from the repo whether `addCustomerInfoUpdateListener` fires on
initial fetch (that is RevenueCat SDK runtime behaviour, not something the code determines), so I
am recording this as a **plausible, unverified** interaction rather than a confirmed bug. It is
cheap to check on a Play-signed build with a comped account, and it is a good argument for B5 on
its own: an entitlement field owned by the server cannot be clobbered by the RevenueCat listener.

---

# C · UNREGISTERED HARD INVARIANTS

**Method.** (i) `grep -rnE "(minHeight|maxHeight|minWidth|maxWidth|height|width)\s*:\s*[0-9]"` over
`app/` + `components/` + `hooks/` → **129 hits**; (ii) `grep -rn` for `elevation`, `textShadow`,
`zIndex`, `overflow`; (iii) a case-insensitive comment sweep for
`prod|production|ios bug|android bug|clip|collapse|workaround|do not remove|must stay|hairline|jank|crash`;
(iv) `git log -S` archaeology on each candidate to recover the originating commit message.

**Your premise is confirmed: there are more.** The register has three flex-collapse entries
(X1 `ScreenContainer`, X2 `welcome.tsx`, X3 `Button`). **The same fix was applied to six more
components in one commit that the register does not mention at all.**

## C.1 — The load-bearing commit the register missed

```
6525a75  feat(home + readings): styling parity with Android via explicit dimensions

  Apply the iOS-prod flex-collapse fix to dimension-sensitive cards/badges that
  relied on padding-only sizing inside LinearGradient/View. Same pattern used
  by Button.tsx (build 14): explicit height + inline-style on the gradient
  with width:'100%', height:'100%', justifyContent:'center'.

  Components fixed:
  - home.tsx Face/Palm action cards: explicit height: 140
  - home.tsx This Month preview: minHeight: 200
  - home.tsx Recent Readings tiles: minHeight: 72 per row
  - StreakBadge: explicit height per size (28/36/48), inline style
  - AstroNumeroBadge: explicit height per size (44/56/88) for horizontal layout
  - DailyInsightCard legacy/teaser variant: minHeight: 160 on inner gradient
  - readings/index.tsx: 6 action cards get minHeight: 140
  - numerology/index.tsx: Name Destiny action card gets minHeight: 140

  Android unchanged — flex propagation works there, explicit dimensions are no-ops.
```

That last line is the trap. **On Android these values are invisible no-ops.** A designer or
engineer restyling on an Android emulator can delete every one of them, see no change whatsoever,
and ship an iOS build where eight surfaces collapse to thin ribbons. This is the single
highest-risk category in the whole revamp and it is currently documented only in a commit message.

## C.2 — Candidate HARD invariants (proposed additions to §5.1)

| # | File / line | Value | Why it exists | Would a restyle delete it by accident? |
|---|---|---|---|---|
| **X11** | `components/engagement/StreakBadge.tsx:11-17`, applied `:29-36` | `height: 28 / 36 / 48` + `borderRadius: cfg.height / 2` | In-file comment `:11-12`: *"Explicit dimensions per size — fixes iOS production where padding-only sizing on LinearGradient collapsed the badge to a thin ribbon."* Commit `6525a75`. | 🔴 **Very likely.** A pill badge is the archetypal "just use padding + rounded-full" restyle. The `borderRadius: cfg.height / 2` coupling means removing the height also breaks the pill shape. Rendered on `home.tsx:79`, the app's highest-traffic screen. |
| **X12** | `components/profile/AstroNumeroBadge.tsx:13-19` | `height: 44 / 56 / 88` | In-file comment `:13-14`: *"Explicit dimensions per size — same iOS-prod flex-collapse fix applied to other tile/badge components in build 16."* | 🔴 **Very likely** — same reasoning. Note also the internal `width: 1, height: 32` divider at `:88`, which is a hairline rule that will read as an arbitrary magic number. |
| **X13** | `app/(main)/home.tsx:105`, `:139` (`height: 140`), `:203` (`minHeight: 200`), `:528` (`minHeight: 72`) | as listed | Commit `6525a75`, itemised above. **No in-file comment on any of the four** — the only record is the commit message. | 🔴 **Very likely.** These are bare numbers in `style={{}}` on cards that a redesign will certainly resize. Nothing in the file explains them. |
| **X14** | `app/(main)/readings/index.tsx:132,160,190,220,259,299,341` | `minHeight: 140` ×7 | Commit `6525a75` (six cards) + `eb79db2` (the R7 Q&A card added later, matching). No in-file comment. | 🔴 **Very likely** — seven near-identical inline style objects that look exactly like copy-paste cruft. They are the fix. |
| **X15** | `app/(main)/numerology/index.tsx:674` | `minHeight: 140` | Commit `6525a75`. No in-file comment. | 🔴 **Very likely** — a lone magic number on a `LinearGradient`. |
| **X16** | `components/insights/DailyInsightCard.tsx:126` | `minHeight: 160` on the inner `LinearGradient` | Commit `6525a75`. No in-file comment. | 🟠 **Likely.** |
| **X17** | `app/(main)/readings/index.tsx:135,163,193,229,262,307,349` (`overflow: 'visible'` on 56×56 icon wells) · `components/profile/SunSignReveal.tsx:70`, `:73` · `components/readings/GeneratingReading.tsx:402` (`minWidth: 220`), `:460` (`minHeight: 44`), `:471-472` (`maxWidth: 320, height: 8`) | as listed | Commit `c542b20`: *"Fix emoji/icon cropping: explicit dimensions + overflow visible on GeneratingReading, SunSignReveal, readings index."* Large emoji glyphs (`fontSize: 40`, `lineHeight: 50` at `numerology/index.tsx:683`) overflow their box; the default `overflow: 'hidden'` clipped them. | 🔴 **Very likely.** `overflow: 'visible'` reads as a no-op (it *is* the CSS default — but **not** the React Native default on Android). Also `GeneratingReading:460`'s `minHeight: 44` reserves space for a one-vs-two-line animated message; without it the layout jumps every rotation. |
| **X18** | `app/(main)/_layout.tsx:14-16` | `height: 85, paddingBottom: 24, paddingTop: 8` | Already noted in UI-audit §7.5 as hand-tuned and coupled to `hooks/useBottomInsetPadding.ts` (commit `8312881`, *"fix(android): edge-to-edge bottom inset handling across all clipped screens"*), but **not in the §5 register**. Visible on all 24 `(main)` screens. | 🟠 **Likely** — a tab-bar restyle is near-certain, and changing this height means re-verifying the five Build-22 Android clipping screens. |

## C.3 — Related production-fix comments a restyle could plausibly delete

Not dimensional, but in the same blast radius and worth the designer/engineer knowing:

| File / line | What |
|---|---|
| `app/(auth)/welcome.tsx:12-16` | Guarded `require('expo-apple-authentication')` in try/catch — a top-level `import` *threw on parse* in the iOS production bundle and prevented the screen mounting. Same at `login.tsx:17`, `signup.tsx:19`. |
| `app/index.tsx:44-55` | Declarative `<Redirect>` computed during render, **not** `router.replace()` in `useEffect` — the imperative form is *"silently dropped"* on iOS production. Plus a Build-24 gating-order dependency (`hasHydrated` **and** `lastFetchOk`) that fixed "Tell Us About Yourself reappears on warm resume". |
| `app/(capture)/palm-capture.tsx:46`, `:70`, `:301` | iOS-production camera mount guards, mirrored from `face-capture.tsx`. |
| `app/(main)/astrology/monthly.tsx:284-285` | A deliberate `as string \| string[]` cast preserving a legacy array-handling branch — *"runtime-identical"*. Looks like a type smell; is intentional. |

## C.4 — §7's `elevation` / `textShadow` claim · ✅ VERIFIED EXACTLY

You asked whether the paywall's close button is the only `elevation:` in the codebase. **Yes.**
Complete grep results over `app/` + `components/`:

```
elevation:
  app/(paywall)/index.tsx:88          elevation: 10,          ← the only one

textShadow*:
  app/(capture)/face-capture.tsx:681  textShadowColor: 'rgba(0, 0, 0, 0.6)',
  app/(capture)/face-capture.tsx:682  textShadowOffset: { width: 0, height: 2 },
  app/(capture)/face-capture.tsx:683  textShadowRadius: 8,     ← one block, one site

zIndex:
  app/(capture)/face-capture.tsx:675  zIndex: 10,
  app/(capture)/palm-capture.tsx:583  zIndex: 10,
  app/(paywall)/index.tsx:87          zIndex: 50,              ← three total
```

§7.3 and §2.5 are **accurate**: one `elevation:`, one `textShadowColor:`, one `textShadowRadius:`.
The audit did not count `zIndex` — there are **three**, all paired with the fixed-overlay pattern
(a close/back control floating above a `ScrollView` or `CameraView`).

The paywall's `zIndex: 50` + `elevation: 10` pair at `:87-88` is the correct cross-platform idiom
(`zIndex` alone does not reliably raise a view above siblings on Android), and it is load-bearing:
the close button is `position: 'absolute'` **outside** the `ScrollView` (`:80-98`, comment `:79`
*"Close button - fixed above ScrollView"*). **If a revamp moves it inside the `ScrollView` or drops
the `elevation`, the only exit from the paywall modal can become untappable on Android.** That
belongs in the register.

---

# D · THE UNCOUNTED TAILWIND UTILITIES

**Method.** A script (`scratchpad/count-utils.js`) parsed every `className="…"` /
`className={`…`}` attribute across all **93** `.tsx` files in `mobile/app/` + `mobile/components/`,
tokenised the class strings, and bucketed by utility family. Template interpolations (`${…}`) were
stripped so only literal class text was counted. Full output reproduced below.

## D.1 — The counts

### Families §2 never counted

| Family | Total | Distinct values used |
|---|---|---|
| `w-*` | **56** | `12`(×16) `full`(×12) `20`(×9) `16`(×5) `14`(×4) `8`(×2) `30`(×2) `5` `48` `32` `64` `3/4` `5/6` |
| `h-*` | **55** | `12`(×16) `2`(×6) `20`(×5) `full`(×5) `px`(×4) `14`(×4) `16`(×3) `3`(×2) `8`(×2) `30`(×2) `4`(×2) `5` `48` `32` `6` |
| `top-*` | **10** | `16`(×5) `4`(×4) `12` |
| `gap-*` | **9** | `3`(×7) `2`(×2) |
| `left-*` | **8** | `6`(×7) `0` |
| `right-*` | **6** | `4`(×4) `0` `6` |
| `inset-*` | **5** | `0`(×5) |
| `bottom-*` | **2** | `8`(×2) |
| `size-*`, `space-x-*`, `space-y-*`, `translate-x/y-*`, `min-w/h-*`, `max-w/h-*`, `gap-x/y-*` | **0** | — none in use |
| **TOTAL** | **151** | of which **128** resolve through the numeric spacing scale |

### For comparison, the families §2 *did* cover

| Family | Total |
|---|---|
| `mb-*` | 556 |
| `px-*` | 165 |
| `p-*` | 113 |
| `py-*` | 92 |
| `mr-*` | 70 |
| `mt-*` | 62 |
| `pt-*` 22 · `pb-*` 19 · `ml-*` 11 · `mx-*` 6 · `my-*` 2 · `pr-*` 1 | 61 |
| **TOTAL padding/margin** | **1,119** |

### Highest concentration of uncounted-family usage

```
20  app/(main)/compatibility/index.tsx
14  app/(main)/home.tsx
10  app/(main)/numerology/index.tsx
 8  app/(main)/compatibility/[id].tsx
 8  components/compatibility/CompatibilityShareCard.tsx
 7  app/(auth)/welcome.tsx
 7  app/(main)/readings/index.tsx
 6  app/(main)/astrology/monthly.tsx
 6  components/common/SkeletonCard.tsx
 6  components/subscription/FeatureComparisonTable.tsx
 5  app/(auth)/signup.tsx    5  app/(main)/profile.tsx
 4  astrology/daily.tsx  ·  astrology/weekly.tsx  ·  components/profile/SunSignReveal.tsx
```

## D.2 — The plain answer you asked for

**Your premise is right that these families exist and were never counted. Your conclusion — that
this adds a sixth codemod pass — is only half right, and I'd rather correct it than agree.**

**No, it does not warrant a sixth pass.** 151 usages across 93 files, concentrated in ~14 files, is
roughly **one-eighth** the volume of the padding/margin families the plan already handles. Whatever
mechanism rewrites `p-6` → the new scale can rewrite `w-12` in the same sweep, because they are the
same string-substitution problem over the same `className` attributes. Adding a pass would be
process overhead, not risk reduction. **Fold it into the existing arbitrary-class pass (step 4).**

**But the finding underneath your question is real and more serious than the count suggests: a
13-key spacing scale is too small, and replacing `theme.spacing` wholesale will silently break
things.** Here is the union of every numeric spacing key the codebase currently depends on:

```
0 · 0.5 · 1 · 1.5 · 2 · 3 · 4 · 5 · 6 · 8 · 12 · 14 · 16 · 20 · 30 · 32 · 48 · 64   (+ `px`)
```

That is **18 distinct numeric keys plus `px`** — the uncounted families contribute
`14`, `30`, `32`, `48`, `64` and `px`, none of which appear anywhere in the padding/margin set.
**A 13-key replacement scale cannot hold 18 keys.** Whatever falls outside it stops resolving, and
NativeWind does not error on an unresolvable class — the class is simply dropped and the element
renders at its intrinsic size. On a 56×56 icon well or a `w-12 h-12` avatar, that is a visibly
broken layout with no build-time signal.

**Three specifics worth acting on:**

1. **`w-30` / `h-30` are already dead — today, on `main`.** Tailwind 3's default spacing scale has
   no `30` key (it goes `…24, 28, 32, 36…`). Both usages are at
   `app/(main)/profile.tsx:186` and `:190`, and **both are saved by an adjacent inline style**:
   ```tsx
   :186    className="w-30 h-30 rounded-full mb-4"
   :187    style={{ width: 120, height: 120, borderRadius: 60 }}      ← this is what actually sizes it
   :190    className="w-30 h-30 rounded-full bg-primary-dark/20 …" style={{ width: 120, height: 120 }}
   ```
   This is the failure mode in miniature: a dead class sitting next to the inline style that
   silently compensates for it, in production, unnoticed. Multiply that by however many keys the
   new 13-key scale drops.
2. **`h-px` (×4, `login.tsx:180,182` and `signup.tsx:271,273`) is the hairline divider on both auth
   screens.** `px` is a *named* key in `theme.spacing`, not a numeric one. If the replacement scale
   is expressed as 13 numeric steps, `px` disappears and both "or continue with" dividers vanish.
3. **The fractional and keyword values (`w-3/4`, `w-5/6`, `w-full`, `h-full`) are safe** — width
   and height fractions/keywords come from Tailwind's `width`/`height` scales, which merge spacing
   *plus* their own percentage and `full`/`screen`/`auto` keys. Replacing `theme.spacing` does not
   remove them.

**Recommendation (planning only, nothing changed):** either (a) size the new scale to cover all 18
keys + `px`, or (b) keep it at 13 and **explicitly enumerate the casualties** so the codemod can
rewrite them to the nearest surviving step — and treat that rewrite as a *visual* change requiring
sign-off, not a mechanical one. Option (b) with `w-12`/`h-12` (32 usages, the single most common
value in these families) landing on a different pixel size will visibly change every avatar and
icon well in the app.

**Also worth stating for the plan**: replacing `theme.spacing` does **not** touch the ~664 inline
`style={{}}` objects or the 16 `StyleSheet.create` blocks, which is where most real spacing lives
(`paddingHorizontal: 24`, `padding: 20`, etc. — UI-audit §2.5). The className spacing surface is
1,270 usages; the inline surface is larger and entirely outside Tailwind's reach. That asymmetry
was already the audit's headline conclusion and this investigation reinforces it.

---

# E · FONT FAMILY-NAME RESOLUTION

**Method.** Read from the **installed** packages, not from memory or from docs.
`mobile/node_modules/expo-font@13.3.2` — `src/Font.ts`, `src/FontLoader.ts`,
`ios/FontLoaderModule.swift`, `ios/FontFamilyAliasManager.swift`, `ios/UIFont+FontFamilyAlias.swift`,
`android/src/main/java/expo/modules/font/FontLoaderModule.kt`, `plugin/build/withFontsIos.js`,
`plugin/build/withFontsAndroid.js`. Expo SDK **53.0.27**, React Native **0.79.6**.

## E1 — Is `expo-font` currently a dependency? ❌ Not directly.

- **Not in `mobile/package.json`** — `grep -n "expo-font" package.json` → no match.
- **Present in `node_modules` at `13.3.2`**, transitively (`package-lock.json:6820` pins
  `"expo-font": "~13.3.2"` as a dependency of `expo`; `:2413` shows another package requiring it).
- **Not in `app.json` plugins** — the plugin array is `expo-router`, `onesignal-expo-plugin`,
  `@react-native-google-signin/google-signin`, `expo-camera`, `expo-image-picker`,
  `expo-location`, `expo-build-properties`. No `expo-font`.
- **Zero `fontFamily` usages** in `app/` or `components/` — confirming UI-audit §7.4.

So the font install is: `npx expo install expo-font` (promotes it to a direct dep at the
Expo-53-compatible version), font files into `assets/fonts/`, and then one of the two registration
paths below.

## E2 — The two paths are NOT equivalent. This is the whole answer.

### Path 1 — runtime `useFonts` / `loadAsync` · **symmetric, mismatch impossible**

`src/Font.ts:65-101` (`loadAsync`) takes `Record<string, FontSource>` and calls
`loadFontInNamespaceAsync(name, source)` for each key (`:89-91`). The **JS object key becomes the
`fontFamily` namespace** on both platforms — the JSDoc at `:57-58` says so explicitly
(*"String or map of values that can be used as the `fontFamily` style prop"*), and both native
implementations honour it:

- **iOS** — `ios/FontLoaderModule.swift:25-45`. It receives the key as `fontFamilyAlias`, registers
  the font data, reads the font's real PostScript name (`:41`), and stores the mapping
  `alias → postScriptName` in `FontFamilyAliasManager` (`:42`). `ios/UIFont+FontFamilyAlias.swift`
  then **swizzles `UIFont.fontNames(forFamilyName:)`** (`:10-15`): when iOS looks up a family name
  and finds nothing, expo-font substitutes the aliased PostScript name.
  → **`fontFamily: 'Literata-Bold'` resolves on iOS regardless of the font's internal name.**
- **Android** — `android/…/FontLoaderModule.kt:50` calls
  `ReactFontManager.getInstance().setTypeface(fontFamilyName, Typeface.NORMAL, typeface)` with the
  same key.
  → Identical resolution.

**On this path the key is the contract on both platforms, by construction. The mismatch you are
worried about cannot occur.** Note this alias machinery exists *only* for runtime-loaded fonts.

### Path 2 — the `expo-font` **config plugin** · 🔴 **asymmetric — this is the trap**

Declaring `["expo-font", { fonts: ["./assets/fonts/Literata-Bold.ttf"] }]` in `app.json` embeds the
files natively at build time. The two platform mods do **completely different things**:

- **iOS** — `plugin/build/withFontsIos.js:26-33`. It copies the file into the Xcode `Resources`
  group and appends **`path.basename(font)`** to `UIAppFonts` in `Info.plist` (`:30-31`). That
  registers the *file*. iOS then resolves `fontFamily` against the font's **internal PostScript /
  family name** — **not** the filename. There is **no alias manager on this path**
  (`FontFamilyAliasManager` is populated only by `FontLoaderModule.loadAsync`).
  → **You must pass the PostScript name.**
- **Android** — `plugin/build/withFontsAndroid.js:19-25`. String entries are copied to
  `app/src/main/assets/fonts`, and RN's `ReactFontManager` resolves `fontFamily` against the
  **asset filename without extension**.
  → **You must pass the filename base.**

**The failure mode is exactly the one you described.** Suppose `Literata-Bold.ttf` has the
PostScript name `Literata-Bold` — then both agree and it works. But Google Fonts variable and
static exports very commonly ship files whose PostScript name differs from the filename
(`Literata-Bold.ttf` → PostScript `Literata-Bold`, but a variable export can be
`Literata[opsz,wght].ttf` → `Literata-Regular`; Figtree static exports are usually
`Figtree-SemiBold.ttf` → `Figtree-SemiBold`, but the variable file is `Figtree-VariableFont_wght.ttf`).
When they differ:

| | Android | iOS |
|---|---|---|
| `fontFamily: 'Figtree-SemiBold'` (filename base) | ✅ renders | ❌ **silently falls back to SF Pro** |
| `fontFamily: '<PostScript name>'` | ❌ **silently falls back to Roboto** | ✅ renders |

**Neither platform throws, warns, or logs.** RN's font resolution treats an unknown family as
"use the default". On a dark-themed app, at typical sizes, the difference between Figtree and
Roboto/SF is easy to miss in a screenshot review — which is precisely your concern, and it is
well-founded. The plugin does offer an Android-only escape hatch (the object form
`{ fontFamily, fontDefinitions }`, `withFontsAndroid.js:27-33`, which writes an XML font family
resource and lets you name the family explicitly) — **there is no iOS equivalent**, so it makes the
asymmetry worse, not better.

## E3 — Recommended registration shape

**Use the runtime `useFonts` path, keyed exactly as `theme.js` names them.** It is the only shape
where the string in `theme.js` is guaranteed to be the string both platforms resolve.

```tsx
// app/_layout.tsx — sketch only, NOT applied
import { useFonts } from 'expo-font';

const [fontsLoaded, fontError] = useFonts({
  'Literata-Bold':    require('../assets/fonts/Literata-Bold.ttf'),
  'Literata-Italic':  require('../assets/fonts/Literata-Italic.ttf'),
  'Figtree-Regular':  require('../assets/fonts/Figtree-Regular.ttf'),
  'Figtree-SemiBold': require('../assets/fonts/Figtree-SemiBold.ttf'),
  'Figtree-Bold':     require('../assets/fonts/Figtree-Bold.ttf'),
});
```

Then `fontFamily: 'Literata-Bold'` — the key, verbatim — works on both platforms with no
PostScript-name knowledge required. Five keys, five files, one require each. **Do not mix the two
paths**: a font embedded by the plugin *and* loaded at runtime under a different key produces two
resolvable names for one face, which is how the mismatch sneaks back in.

**Six integration constraints specific to this app:**

1. 🔴 **The splash-hold interaction.** `app/_layout.tsx` already holds the splash and has three
   nested `BRAND_BG` (`#0F0A1A`) layers as *"belt-and-braces against a white flash on cold start"*
   (UI-audit §7.5, comment at `:20-28`). A `useFonts` gate adds a second async condition to that
   sequence. **Gate on `fontsLoaded || fontError`, never on `fontsLoaded` alone** — a font that
   fails to decode must not leave the app permanently on the splash. The existing `stalled` timeout
   pattern at `app/index.tsx:40-41` is the precedent to follow.
2. **Static faces only.** Do not ship variable fonts. RN 0.79 does not expose variation axes, so a
   variable file renders at its default instance and the PostScript-vs-filename divergence is worse.
   Five static files is the correct shape.
3. **Weight mapping.** With named faces you set `fontFamily` per weight and must **stop using
   `fontWeight`** on those elements — RN will otherwise try to synthesise a bold from an
   already-bold face (faux-bolding, differently on each platform). The audit counted **173 inline
   `fontWeight:` declarations** (§2.6) plus every `font-bold` / `font-semibold` className. **This
   makes the font install a codemod too, not an additive change** — and it is a *different* codemod
   from the colour one. Worth surfacing to the owner as a scope input before the design locks five
   faces.
4. **Only two Literata faces are listed** (`Bold`, `Italic`) — there is no `Literata-Regular`. If
   the design uses Literata for body copy anywhere, a third file is needed; if it is display-only,
   confirm that `Literata-Italic` is not being asked to serve as the regular weight.
5. `tailwind.config.js:32-34` currently declares `fontFamily: { sans: ['System'] }`. That will need
   to name the new faces for the className side, while the 664 inline styles and 16 `StyleSheet`
   blocks need the same strings — the **two-token-system problem** from UI-audit §2.1 applies to
   type exactly as it does to colour.
6. **Licensing** (UI-audit §7.4 stands): both Literata and Figtree are **SIL OFL**, so both are
   redistributable in a shipped binary. That clears the constraint that blocked Georgia
   server-side. **But the R9 PDF still renders in DejaVu Serif** unless `server/Dockerfile`'s
   fontconfig is updated — §9 Q5, server work, outside this branch.

---

# HOTFIX CANDIDATES

Recommendations only. Nothing here is a decision, and several of these touch the purchase path.

## Tier 1 — I'd ship these as 2.0.1, ahead of the revamp

**A1 + A1b + A2 + A4 as a single change.** One file, ~50 lines total, no dependency, no server, no
native. The case for not waiting:

- It is the only finding that is **charging users something different from what the screen says**,
  in production, right now, in the app's primary market.
- The revamp will rewrite this screen's markup completely. Doing the *data-source* fix now means
  the revamp inherits a paywall that reads real prices, and the redesign becomes a pure
  presentation change. Doing it *after* means the price fix competes for attention with a visual
  overhaul on the highest-revenue surface in the app.
- A1 and A4 must ship together — fixing A1 alone converts a wrong-price screen into a blank-price
  screen on fetch failure. A2 falls out for free if the fix renders `availablePackages` rather than
  looking up a constructed key.
- **A1b is unresolved and needs an owner check before coding**: confirm what the four products
  actually cost in the RevenueCat dashboard / Play Console. If the docs are right, the app is
  currently under-quoting Premium Plus by $2/month and $10/year. Reading `priceString` makes the
  question moot forever, which is the strongest argument for the fix.

**Cost**: one production AAB → Internal Testing → promote. **RevenueCat requires a Play-signed
build to verify** (`dev-notes/workflow.md` Part B step 6), so this cannot be validated on a
sideloaded APK.

## Tier 2 — defensible either way; I'd lean toward including them in the same cut

**A3 (purchase-failure silence).** ~15 lines across `lib/revenuecat.ts` and the paywall. It rides
the same Play-signed test cycle as Tier 1 at near-zero marginal cost, and the same tester tapping
through the purchase sheet exercises both. The argument *against*: it changes error-path behaviour
on the purchase flow, which is the one place a regression is most expensive. If you'd rather keep
the 2.0.1 diff to "read the real price and nothing else", this is the item to drop — the current
behaviour is silent, not wrong.

**A6 as the S-sized copy variant only** — show the trial label only when
`product.introPrice != null`. This is RevenueCat's own documented guidance for the `UNKNOWN`
eligibility state, it falls out of the A1 refactor for free (you are already holding the product
object), and it reduces a live policy exposure. **Do not scope the M/M+ eligibility-proxy variants
into a point release** — they need a design decision about what the button says to a returning
subscriber, and that is revamp copy work.

## Tier 3 — wait for the revamp

**A5 (contrast).** Real, but it is 🟡 and the revamp will re-decide every colour pairing anyway.
Hotfixing `text-white` → `text-black` now means doing the work twice and briefly shipping a CTA
that matches neither the old nor the new design system. **Hand it to the design phase as a
constraint instead**: *no text on `#F59E0B` may be white; the accessible pairing is already used at
`(paywall)/index.tsx:177` and `PremiumBadge.tsx:10`.* Add the AA contrast floor to the token table
so it cannot recur.

**All of B.** The R1 tier-check sites are correctness debt, not live user harm. Three reasons to
hold:
- **B1** and **B2** need server work, and there is **no pre-release backend device-test path**
  (`dev-notes/workflow.md` "Backend note"; project memory `infra-single-railway-backend.md`). A
  server change means deploying to live prod and verifying through Internal Testing — an
  unnecessary risk for a fix with no user-visible symptom.
- **B5** (the entitlements field) is the change that makes most of the other 30 gates disappear.
  Doing it *before* the revamp means the revamp restyles the right structure. Doing individual
  gate fixes now is work the B5 change would throw away.
- **B3** is two dead lines; delete during the revamp.

**All of C.** Nothing to fix — these are register entries. But 🔴 **do this before design starts,
not after**: fold **X11–X18** into `UI-audit.md` §5.1 and make sure the designer and the
implementing engineer both see the sentence *"on Android these values are invisible no-ops"*. The
cost of C being missed is an iOS build with eight collapsed surfaces, discovered in review or —
worse — not discovered. It is the cheapest risk reduction in this whole document.

**All of D and E.** Planning inputs for the tokens phase and the font install respectively. The two
concrete asks before that phase locks:
- **D**: decide whether the new spacing scale covers all **18 numeric keys + `px`**, or enumerate
  the casualties and accept the pixel changes. `w-12`/`h-12` alone is 32 usages.
- **E**: commit to the **runtime `useFonts` path**, and get an owner ruling on the `fontWeight`
  codemod (173 inline declarations + every `font-bold`/`font-semibold` class) that five named faces
  implies — that is a scope input the design should know about before it locks five faces.

## One thing that is not in scope but should not be lost

The comp-tier clobber risk at `subscriptionStore.ts:126-141` / `:148-156` (§B5, last paragraph) is
**unverified** and cheap to check: grant a comp with `scripts/grant-comp-tier.ts`, launch a
Play-signed build with that account, and see whether the client's tier reverts to `free` while the
server still grants access. If it reproduces, it silently locks comped influencer/marketing
accounts out of everything they were comped for — which is a support problem, not a code problem,
until someone reports it. Worth adding to `owner-actions.md` as a verification item regardless of
what happens with this document.

---

## Appendix — verification performed

| Check | Result |
|---|---|
| `cd mobile && npx tsc --noEmit` | **exit 0** — clean |
| `cd server && npx tsc --noEmit` | **exit 0** — clean |
| Files modified by this session | **1** — `plans/build-27.1/preflight-findings.md` (this file) + the two tracking files |
| Product code / deps / config changed | **none** |
| RevenueCat facts sourced from | installed `react-native-purchases@9.15.2` + `@revenuecat/purchases-typescript-internal` type defs and native module sources — **not** from memory or from web docs |
| expo-font facts sourced from | installed `expo-font@13.3.2` — `src/Font.ts`, `ios/*.swift`, `android/…/FontLoaderModule.kt`, `plugin/build/withFonts{Ios,Android}.js` |
| Tailwind utility counts | script over all 93 `.tsx` files, `className` attributes only; methodology and raw output in §D.1 |
| Contrast ratios | WCAG 2.1 relative-luminance formula, computed from the resolved hex values in `tailwind.config.js` |

## Appendix — suggested commit message

```
docs(build-27.1): pre-flight findings — paywall defects, R1 tier-gate sweep, unregistered invariants

Investigation-only pass over five areas ahead of the UI revamp. One new file,
plans/build-27.1/preflight-findings.md. No product code, dependencies, or config
touched; npx tsc --noEmit clean on both mobile/ and server/.

A · PAYWALL (highest priority)
  - A1 CONFIRMED: all six displayed prices are hardcoded USD literals
    ((paywall)/index.tsx:132,155,160,182,187). offerings is in scope and never
    read for display. Indian users are shown USD and charged INR. Correct field
    is pkg.product.priceString (+ pricePerMonthString), both present on
    react-native-purchases 9.15.2's payload.
  - A1b NEW: the hardcoded Premium-Plus prices ($12.99/$89.99) also disagree with
    the documented store products ($14.99/$99.99, docs/REVENUECAT_SETUP.md:66-69).
  - A2 CONFIRMED: package lookup builds `${plan}_${period}`; matches the documented
    offering identifiers today, but drifts to 100% purchase failure if the offering
    is ever rebuilt with RevenueCat's $rc_* presets.
  - A3 REFUTED: the Alert('Purchase Failed') at :56 is unreachable — lib/revenuecat.ts
    swallows every throw and returns null, the store collapses it to false, and the
    screen has no else branch. Cancel AND genuine failure are both entirely silent.
    userCancelled is read at revenuecat.ts:56 only to suppress a console.warn.
  - A4 CONFIRMED: no offerings-failed UI; `error` is not even destructured.
  - A5 contrast is 2.15:1, not the hypothesised 2.6:1 (worse). text-black on bg-gold
    is already used correctly eight lines away at :177.
  - A6 CONFIRMED: checkTrialOrIntroductoryPriceEligibility exists on Android but
    "Android always returns INTRO_ELIGIBILITY_STATUS_UNKNOWN" (purchases.d.ts:447).
    No per-user eligibility signal exists; CustomerInfo.allPurchasedProductIdentifiers
    is a one-way proxy the app already fetches and discards.

B · 31 ACCESS GATE sites across 12 files enumerated and classified, incl. the two
    home.tsx gates the register missed. New: monthly.tsx hides Money/Health/Challenges
    from Premium users while the server sends that content (prompt tier is free|premium
    only); combined.tsx's gate has no server counterpart; isPremiumPlus is dead in
    face.tsx:83 and palm.tsx:111; compatibility's remainingFree is computed server-side
    and never sent.

C · 8 unregistered HARD invariant candidates (X11-X18), incl. two more instances of
    the iOS-prod flex-collapse fix (StreakBadge, AstroNumeroBadge) and commit 6525a75's
    eight explicit dimensions that are invisible no-ops on Android. §7's "one elevation,
    one textShadow app-wide" verified exactly; zIndex (3 sites) was uncounted.

D · 151 usages of spacing-derived utility families §2 never counted. Does NOT warrant a
    sixth codemod pass (fold into the existing pass) — but the union of spacing keys in
    use is 18 numeric + `px`, so a 13-key replacement scale will silently drop values.
    w-30/h-30 are already dead classes today, saved by adjacent inline styles.

E · expo-font is NOT a direct dep (13.3.2 transitive). The useFonts path is symmetric by
    construction (iOS aliases the JS key to the PostScript name via a UIFont swizzle);
    the config-plugin path is asymmetric (iOS=PostScript name, Android=filename) and
    fails silently on one platform only. Recommend useFonts, keyed as theme.js names them.

Nothing fixed — scope decisions left to the owner. HOTFIX CANDIDATES section recommends
A1+A1b+A2+A4 as a 2.0.1 cut and holds the rest for the revamp.
```
