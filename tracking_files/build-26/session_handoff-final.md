# Session Handoff — Revelia

> **HOW TO USE**: When a session ends, the outgoing session overwrites the "CURRENT HANDOFF" block below. The incoming session reads it, then checks `claude_progress.md` for full history. Keep this file compact — just enough for a cold-start pickup.

---

## CURRENT HANDOFF

**Written by**: build26-internal-test2-BugFix2-CombinedProfile-Back-Icon-Inconsistency | 2026-06-26
**Branch**: `feature/build-26`
**Committed**: user commits manually (this session left UNSTAGED)

---

### What just happened (this session) — Cosmic Blueprint back-button icon fixed (BugFix2, internal-test2)

**Bug**: The Cosmic Blueprint (Combined Profile) screen rendered its back button as a literal text arrow (`<-`) instead of a proper icon, inconsistent with the rest of the app (e.g. Name Destiny).

**Read-first correction**: the task prompt guessed the canonical back button was "a circular bordered button" — it is NOT. The real canonical pattern in `numerology/name-destiny.tsx` is plain `<Ionicons name="arrow-back" size={24} color="white" />` inside a `TouchableOpacity` (no border/circle).

**Fix (mobile-only, 1 file — `mobile/app/(main)/readings/combined.tsx`)**:
- Added `import { Ionicons } from '@expo/vector-icons';`.
- Replaced `<Text>{'<-'}</Text>` with `<Ionicons name="arrow-back" size={24} color="white" />` in **both** back buttons on the screen (main header ~line 211 AND empty-state header ~line 128 — both had the same text arrow).
- Kept the existing inline-style wrapper `style={{ marginRight: 16 }}` (combined.tsx is inline-styled, not NativeWind; `marginRight:16` == name-destiny's `mr-4`). Both `onPress={() => router.back()}` handlers untouched.

**No new dependency**: `@expo/vector-icons` is bundled with Expo and already used across the app.

**Verified**: `cd mobile && npx tsc --noEmit` clean (exit 0); import resolves. Visual-only change, low risk — no separate on-device verification gate needed beyond a glance during vc26 testing.

**Build target**: rides **vc26** with the rest of the internal-test2 batch. No versionCode bump.

---

### Predecessor (earlier this session) — Android share-cancel cascade fixed (BugFix1, internal-test2)

**Bug**: Sharing a reading opened the combined image+text sheet (correct). DISMISSING it (X / back) wrongly opened a second "share image" sheet, then a third "sharing text" sheet, instead of returning to the reading screen.

**⚠️ This SUPERSEDES the old BUG-002 fix — do not treat the BUG-002 archive entry as current share behavior.** BUG-002 ("Android share image dropped") was correctly fixed by moving to `react-native-share` (`RNShare.open`) for a combined image+text intent — that part is intact. But its `RNShare → Sharing.shareAsync → Share.share` fallback chain was the regression that caused this cascade: `RNShare.open()` defaults to `failOnCancel:true`, so a user **dismissal rejects** the promise (`dismissedAction:true` / "User did not share"); the catch blocks treated the cancel as a failure and ran the next fallback → extra sheets.

**Fix (mobile-only, 5 files)**:
- `mobile/utils/shareReading.ts` — new exported `isShareDismissal(error)` helper (single source of truth); `RNShare.open` now passes `failOnCancel: false` and checks `dismissedAction`; each fallback in its own try/catch (dismissal `return`s silently); a genuine RNShare failure does **exactly one** fallback (`Sharing.shareAsync`), never `Share.share`. Signature is now **`Promise<boolean>`** (true = real share).
- `ShareableQuote.tsx` + `ShareCard.tsx` — gate the recorder: `const shared = await shareReadingCard(...); if (shared) onShare()/onShared?.()`.
- `compatibility/[id].tsx` — imports `isShareDismissal`; inline share tracks a `shared` boolean that gates the success haptic + `recordMeaningfulAction('share:compatibility')`; `failOnCancel:false`; dismissal-returns in both inner and outer catch.
- `astrology/daily.tsx` — **second, independent bug**: `onShare` was calling `shareReadingCard` a 2nd time (ShareableQuote already shares via its own ref) — a redundant sheet even on success. Both `onShare` handlers now only `recordMeaningfulAction('share:daily')`; dropped the unused import.

**Left unchanged**: `profile.tsx` `handleShareApp` (standalone "Share Revelia" `Share.share`, no cascade) — reported to user, not the bug.

**Verified**: `cd mobile && npx tsc --noEmit` clean (exit 0). No server / navigation / shared-types impact.

**Build target — rides vc26, NOT vc25.** vc25 was already built (production AAB) before this fix, so this fix is not included in vc25. It lands in the next production build, **vc26** (autoIncrement bumps versionCode 25 → 26), bundled with the rest of the internal-test2 fixes and improvements. No manual versionCode bump is needed.

**⚠️ NOT yet verified — needs a real Android device.** RNShare cancel behavior does NOT manifest in Expo Go / emulator; tsc passing proves nothing here. On the **vc26** build: share a reading → tap X / back → land back on the reading screen with NO further dialog; then re-share and confirm a real share still completes and records `share:<type>`. Also sanity-check the warm-start path (app backgrounded, not killed) and that the re-engagement push still opens Home.

---

### Predecessor (earlier this session) — app-rating trigger system REWRITTEN (mobile-only)

**The whole in-app-review / rating-trigger system was replaced.** The old system is gone; do not reintroduce its patterns. A read-only baseline of the old system is preserved at `tracking_files/refactors/review-trigger-inventory.md`.

**New shape**:
- **`mobile/store/reviewStore.ts`** (NEW) — single source of truth. One SecureStore key `revelia_review_state` holds one JSON blob `{ count, nextThreshold, oneTime, lastDailyDate, lastMonthlyMonth }`.
  - `initReviewStore()` — rehydrates the blob at launch (called once in root `_layout.tsx`, beside `initSubscriptionSync()`). The old system never rehydrated → count reset every cold start; this fixes that.
  - `recordMeaningfulAction(key)` — the ONE entry point screens call. Idempotent per dedup key (daily/monthly compare period; everything else is one-time). Increments in-memory count (authoritative — never re-reads SecureStore), persists fire-and-forget, then prompt-checks.
  - Ladder `nextThresholdAfter()`: `6→16→31→51→71→91…` (+10, +15, +20 forever). Advances ONLY when a real prompt attempt was made.
- **`mobile/lib/inAppReview.ts`** — `requestReviewIfEligible` → `attemptReview(): Promise<boolean>` (true only if `StoreReview.requestReview()` actually fired). Android gate + `hasPromptedThisSession` unchanged. Called only by the store.
- **12 recorder call sites**, each with its dedup key: `reading:face`/`palm`/`career`/`astrology`/`nameDestiny`, `compat:<id>`, `daily:<YYYY-MM-DD>`, `monthly:<YYYY-MM>`, `share:compatibility`/`daily`/`nameDestiny`. `astrology/daily.tsx`, `astrology/monthly.tsx`, `astrology/index.tsx` (birth chart), `numerology/name-destiny.tsx` are net-new recorders.
- **`ShareCard.tsx`** gained an optional `onShared?: () => void` (caller-side share recording; keeps `shareReading.ts` pure). Only name-destiny opts in.
- **Deleted**: `mobile/lib/reviewKeys.ts`, `mobile/hooks/useAppReview.ts` (dormant). **Removed** `completedReadingsCount`/`incrementCompletedReadings`/`COMPLETED_READINGS_KEY` from `readingsStore.ts`.
- **Inferred** (plan flagged for verification): `reading:astrology` keyed on `birthChart` truthy in `astrology/index.tsx`; name-destiny share recorded via the new `ShareCard onShared` callback (it uses `<ShareCard>`, not the util directly).
- **Abandoned keys** (no migration; SecureStore clears on uninstall): `revelia_completed_readings_count`, `revelia_face_reading_counted`, `revelia_palm_reading_counted`, `last_review_request`, `review_declined_count`.

**Verified**: `cd mobile && npx tsc --noEmit` clean (exit 0); greps confirm zero refs to retired symbols/keys and `recordMeaningfulAction` at exactly the 12 intended sites; `initReviewStore()` wired once in `_layout.tsx`. No build / versionCode bump.

**NOT yet verified — on-device (Android + Play Store) pending**: native sheet only shows on a real Play-context device and Google throttles display. On vc25 internal testing confirm: count survives cold starts (no reset); action at/after threshold 6 surfaces the prompt at most once/session; ladder advances only after a real prompt; daily/monthly dedup per calendar period; reading/share/compat dedup once.

---

### Earlier this session's predecessors — three mobile-only fixes

#### Fix C (prior session) — entertainment disclaimer clipped behind tab bar

**Bug**: The entertainment disclaimer at the bottom of several screens was clipped or fully hidden behind the 85px bottom tab bar — worse on larger Android devices (system nav-bar inset also intrudes).

**Audit**: Checked all 10 screens that render the disclaimer. Six already used the existing build-22 hook `mobile/hooks/useBottomInsetPadding.ts` (`insets.bottom + tabBarHeight + extraBottom`, with a try/catch so it's safe outside a tab navigator) and were fine: `astrology/monthly`, `readings/palm`, `readings/face`, `readings/combined`, `numerology/name-destiny`, `profile`. Four were broken.

**Fix (mobile-only, 4 files)** — added `const bottomPad = useBottomInsetPadding();` and `contentContainerStyle={{ paddingBottom: bottomPad }}` to each screen's inner `<ScrollView>`, matching the existing six exactly:
- `mobile/app/(main)/astrology/weekly.tsx` — padding on the MAIN vertical ScrollView (NOT the horizontal day-card one).
- `mobile/app/(main)/astrology/daily.tsx` — **this one had NO bottom padding at all and was not in the original task scope** (caught during the audit).
- `mobile/app/(main)/readings/career-destiny.tsx` — inline disclaimer text left unchanged.
- `mobile/app/(main)/compatibility/[id].tsx`.

**Note**: original task prompt suggested `useBottomTabBarHeight() + 24` directly; switched to the existing `useBottomInsetPadding()` hook instead — it's the established codebase pattern AND adds `insets.bottom` (the Android system nav-bar inset), which is exactly the "worse on larger devices" symptom.

**Verified**: `cd mobile && npx tsc --noEmit` clean. Not yet visually verified on-device (small + large Android) — confirm disclaimer sits fully clear of the tab bar on all four screens during vc24/vc25 testing. No build / versionCode bump — rides the normal vc24 → vc25 flow.

#### Fix B (prior session) — RevenueCat purchase/restore now updates Profile UI live

**Bug**: After Subscribe completed in-session, the Profile badge / Subscription section / "Next billing" stayed stale until app relaunch (relaunch ran `checkAuth()` → `getMe()` which refreshed `authStore.user`).

**Root cause**: `profile.tsx` reads tier ONLY from `authStore` (`user?.subscription?.tier` + `expiresAt`), never from `useSubscriptionStore`. `subscriptionStore.purchasePackage()`/`restorePurchases()` updated `subscriptionStore.tier` but never wrote back to `authStore.user`.

**Fix (mobile-only, 3 files)**:
- `mobile/lib/revenuecat.ts` — added exported `addCustomerInfoListener(cb)` wrapping `Purchases.addCustomerInfoUpdateListener` (no handler logic here, to avoid a circular import with subscriptionStore).
- `mobile/store/subscriptionStore.ts` — `purchasePackage`/`restorePurchases` now call new local `applyTierToAuthUser(tier, customerInfo.latestExpirationDate)` to write tier + expiry back to `authStore.user` (spread existing `subscription`, override only `tier`/`expiresAt`; `null` expiry falls back to existing). Kept `set({ tier, isActive })` + fire-and-forget `syncSubscription()`. Added exported `initSubscriptionSync()` (double-registration guard) that registers a CustomerInfo listener updating BOTH stores live.
- `mobile/app/_layout.tsx` — calls `initSubscriptionSync()` once, right after `initializeRevenueCat()` in the root init effect.

**Verified**: `npx tsc --noEmit` clean. `User['subscription']` = `{ tier; revenueCatId?; expiresAt? }` (only `tier` required — no `status`); `CustomerInfo.latestExpirationDate` is `string | null`. Single-sourced via `mapCustomerInfoToTier`; `profile.tsx` read path + paywall offerings untouched.

**NOT yet verified — needs Play-signed build** (RevenueCat billing only works on a Play-signed AAB): on vc25 → Subscribe → Profile shows new tier + "Next billing" with NO restart; Restore updates Profile live; badge + `setUserTags(tier)` reflect new tier in-session.

#### Fix A (earlier this session) — Google Sign-In account-picker-after-logout fix

**Bug**: After a user signed in with Google, logged out, fully closed the app, relaunched, and tried Google Sign-In again with a *different* account, no account picker appeared — the SDK silently re-signed-in the *previous* account. Only reproduced on the login → logout → re-login-with-different-account path. Fresh installs were fine (picker showed); email/Apple unaffected.

**Root cause**: `logout()` in `mobile/store/authStore.ts` tore down the JWT, OneSignal, and RevenueCat, but never signed out of the Google SDK. Google Play Services caches the signed-in account at the OS level (not in the app's SecureStore), so closing/reopening the app didn't clear it. Next `GoogleSignin.signIn()` returned the cached account silently instead of showing the picker.

**Fix (mobile-only, 2 files)**:
- `mobile/lib/googleSignIn.ts` — added exported `signOutGoogle()`: calls `configureGoogleSignIn()` first (SDK isn't guaranteed configured at logout, e.g. after a cold start, and an unconfigured call can throw) then `await GoogleSignin.signOut()`. Used `signOut()` only, NOT `revokeAccess()` — picker reappears without forcing scope re-consent.
- `mobile/store/authStore.ts` — extended the existing `googleSignIn` import with `signOutGoogle`; in `logout()`, added an `if (Platform.OS === 'android')` + try/catch block calling `await signOutGoogle()`, placed before `await storage.clearAll()`. Platform gate + try/catch keep email/Apple logout unaffected and never let a Google SDK hiccup block logout.

**Verification done**: `cd mobile && npx tsc --noEmit` clean. `@react-native-google-signin/google-signin` is 13.3.1; `GoogleSignin.signOut()` exists (declared return `Promise<null>`, harmless under `await`).

**NOT yet verified — needs a Play-signed build**: This bug is invisible on a sideloaded APK (Google Sign-In only behaves correctly with the Play app-signing SHA-1). Real confirmation must happen on vc25 (internal testing track). Repro to run there: Google login (account A) → logout → fully close + relaunch app → Google Sign-In → **confirm account picker appears** → pick account B → confirm you land as B, not A. Also sanity-check an email-account logout still works normally.

⚠️ This fix currently lives only on `feature/build-26` (vc24 line). It ships to production via the normal vc25 → internal testing → Play Store flow. Don't let it strand on the branch.

---

### Cumulative Build 26 status

| Task | Status | Note |
|---|---|---|
| Google Sign-In (Android) | DONE | SHA-1 registered; DEVELOPER_ERROR resolved; **logout account-picker bug fixed this session** (verify on vc25) |
| OneSignal push (mobile + scheduler + FCM) | DONE & CONFIRMED on-device | FCM configured (Firebase + service acct + google-services.json), real token issued, scheduled push delivered |
| RevenueCat | DONE | un-stubbed, paywall fix, prod key added; **purchase/restore now update Profile UI live this session** (verify on vc25) |
| BUG-001 through BUG-005 | DONE | session build26-bugfixes |
| RTDN endpoint | DONE | live, receiving events; HMAC deferred; cloud wiring done by user |
| Express trust proxy | DONE | committed (server/src/app.ts) |
| Phases 5–8 (review, cards, share, URLs) | DONE | all prior sessions |
| Merge from main + Anthropic 529 fix | DONE | committed & pushed in `628df10` |
| Pre-existing mobile TS errors | DONE | daily/monthly/verify-email cleared, runtime-identical |
| CLAUDE.md | DONE | new file at repo root |
| Scheduler debug-log cleanup | DONE | committed & pushed; Railway quiet |
| Google logout account-picker fix | DONE (code) | mobile-only; tsc clean; verify on vc25 Play-signed build |
| RevenueCat live Profile UI update | DONE (code) | mobile-only; tsc clean; verify on vc25 Play-signed build |
| Disclaimer clipped behind tab bar | DONE (code) | mobile-only; tsc clean; weekly/daily/career-destiny/compatibility now use `useBottomInsetPadding()`; verify visually on small+large Android |
| App-rating trigger system rewrite | DONE (code) | mobile-only; tsc clean; counter-based `reviewStore.ts` + `recordMeaningfulAction()` + ladder; old per-screen system deleted; verify on-device (Android/Play) on vc25 |
| Daily-insight push → Daily Insights screen (BugFix5) | DONE (code) | server + mobile; tsc clean; real bug was missing server `data:{screen:'daily-insight'}`; client cold-start guard gates on `segments[0]==='(main)'`; **UNVERIFIED until tested from a killed app on a Play-signed build** |
| Android share-cancel cascade (BugFix1, internal-test2) | DONE (code) | mobile-only; tsc clean; **supersedes BUG-002's cancel handling** — `failOnCancel:false` + `isShareDismissal()` guard; `shareReadingCard` now returns boolean; daily.tsx double-share also fixed; **rides vc26 (NOT in vc25); UNVERIFIED until tested on a real Android device** (cancel behavior doesn't show in emulator) |
| Cosmic Blueprint back-icon inconsistency (BugFix2, internal-test2) | DONE (code) | mobile-only; tsc clean; `combined.tsx` both back buttons (header + empty-state) swapped from literal `<-` text arrow to `Ionicons arrow-back` (matches name-destiny); nav unchanged; no new dep; rides vc26 |
| vc25 EAS production build | DONE | built and in internal testing. Includes everything committed up to `chore(vc25): bump versionCode to 25` (daily-push BugFix5, app-rating rewrite, disclaimer, RevenueCat live-profile, Google logout). Does NOT include the share-cancel cascade fix. |
| vc26 EAS production build | PENDING | next production build (autoIncrement 25 → 26). Bundles the share-cancel cascade fix + any further internal-test2 fixes/improvements. |

---

### Next step (release sequence agreed with user)

**vc25 is built and in internal testing. Now collecting internal-test2 fixes/improvements on `feature/build-26` for the next build, vc26.**

1. ⏳ **Keep folding in** internal-test2 feedback (bugs / glitches / unnatural behavior / improvements). The share-cancel cascade fix (this session) is the first of these.
2. **Fix** reported issues on `feature/build-26`, commit per logical change (user commits manually).
3. **Push** everything: `git push origin feature/build-26`.
4. When the internal-test2 batch is ready, trigger the build: `cd mobile && eas build --platform android --profile production` — `autoIncrement` bumps versionCode 25 → **26**. No manual bump.
5. **Internal team tests vc26.** Include the share-cancel repro (share → tap X → no extra dialog → re-share works) plus the still-pending vc25 repros (Google logout → re-login-different-account, daily-push from a killed app, RevenueCat live-profile, app-rating). If clean → promote to **Play Store production**.
6. Ensure the production commit still includes the `google-services.json` commit (don't regress it).

---

### EAS env vars — all present in production profile
- `EXPO_PUBLIC_API_URL` ✅ (Railway URL)
- `EXPO_PUBLIC_ENV` ✅
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` ✅
- `EXPO_PUBLIC_ONESIGNAL_APP_ID` ✅
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ✅

(Note: FCM does NOT use an env var — relies on the committed `google-services.json` baked in at build time.)

---

### Remaining Build 26 tasks
- **[Post App Store]** Replace `id000000000` in `profile.tsx` `handleRateApp` with the actual App Store numeric ID after iOS submission.

---

### Gotchas
- **Reading share (`mobile/utils/shareReading.ts`): `shareReadingCard` returns a `boolean` (true = real share) — callers MUST gate `recordMeaningfulAction('share:...')` / `onShare`/`onShared` on it; do NOT "simplify" to unconditional recording, and do NOT remove `failOnCancel: false` from `RNShare.open`.** Both look like dead complexity but are the fix for the cancel-cascade regression (build26-internal-test2): without `failOnCancel:false` a dismissal rejects and the fallback chain opens extra sheets; without the boolean gate a dismissal records a phantom share. Dismissal detection is centralized in the exported `isShareDismissal(error)` — never redefine it per file. (Supersedes the old BUG-002 fix's cancel handling.)
- **App rating: the counter lives in `mobile/store/reviewStore.ts`, rehydrated at launch via `initReviewStore()` (root `_layout.tsx`); ALL meaningful-action recording goes through `recordMeaningfulAction(key)`.** Do NOT reintroduce per-screen review logic (no per-screen counters, `useRef` fire-once guards, SecureStore "counted" flags, or direct `StoreReview` calls). Native prompt = `attemptReview()` in `mobile/lib/inAppReview.ts` (boolean; Android-only + once-per-session), called only by the store. In-memory count is authoritative after init — never re-read SecureStore to increment. Keys: `reading:<type>`/`share:<type>`/`compat:<id>`/`daily:<YYYY-MM-DD>`/`monthly:<YYYY-MM>`/`astrologer:<…>` (Build 27 seam).
- **Push deep-linking: the routing hint is OneSignal `data`, set server-side.** For a notification to open a specific screen, `sendOneSignalPush` (in `server/src/jobs/pushScheduler.ts`) must include `data: { screen: '<key>' }`; no data → client falls through to `home`. Client side, `setNotificationClickHandler` → `handleDeepLink(screen)` in `_layout.tsx` maps the key. **Cold-start (killed app) gotcha**: the click handler fires before auth resolves, so it must read fresh auth via `useAuthStore.getState()` (closed-over vars are stale) and, if not ready, stash the target in `pendingDeepLinkRef`; a deferred effect replays it only once `segments[0] === '(main)'` (entry redirect from `index.tsx`'s `<Redirect>` has landed on home) — gate on segments, NOT a timer. Use `router.push` so Back returns to home.
- **Bottom-of-screen content behind the tab bar: use `useBottomInsetPadding()` from `mobile/hooks/`** — NOT `useBottomTabBarHeight()` directly. The hook adds `insets.bottom` (Android system nav bar) + tab bar height + extra, and has a try/catch so it's safe in nested screens/modals. All 10 disclaimer screens now use it; match this pattern for any new screen whose last child must clear the tab bar.
- **`profile.tsx` reads subscription tier from `authStore.user`, NOT `subscriptionStore`.** So RevenueCat purchases/restores must write tier+expiry back to `authStore.user` (via `subscriptionStore` → `setUser`) or the Profile UI stays stale until relaunch. `initSubscriptionSync()` (registered once after `initializeRevenueCat()` in root `_layout.tsx`) keeps both stores in sync live. All tier derivation single-sourced through `mapCustomerInfoToTier`.
- **Google Sign-In logout must call `signOutGoogle()`** — Play Services caches the account at OS level; without it the picker won't reappear on next login. Use `signOut()`, not `revokeAccess()`. Android-gated + try/catch so email/Apple logout is unaffected.
- **`google-services.json` is tracked in git on purpose (removed from both gitignores) — do NOT re-add to gitignore.** Required for FCM; EAS only uploads git-tracked files.
- FCM requires the Firebase **service account JSON** in OneSignal (FCM v1) AND `google-services.json` in the app build — both needed; the OAuth Web Client ID (Google Sign-In) is unrelated to push.
- OneSignal plugin: `app.json` uses `onesignal-expo-plugin` (NOT `react-native-onesignal` directly) — must remain.
- OneSignal REST API: URL is `https://api.onesignal.com/notifications`, auth is `Key <token>` (NOT `Basic`).
- `react-native-purchases` has NO `codegenConfig` — uses RN 0.79 old-arch interop layer.
- `loginOneSignalUser` / `logoutOneSignalUser` are the correct export names from `mobile/lib/onesignal.ts`.
- `GOOGLE_CLIENT_ID` is the OLD name — now `GOOGLE_OAUTH_WEB_CLIENT_ID` everywhere.
- `ONESIGNAL_REST_API_KEY` is the correct server env var name (NOT `ONESIGNAL_API_KEY`).
- `verify-email.tsx`: backend returns `verificationToken` at body TOP LEVEL (not in `.data`) — read via `(verifyResponse as any).verificationToken`; do NOT "simplify" to `.data?.verificationToken`.
- `tsc --noEmit` is clean on mobile AND server.
