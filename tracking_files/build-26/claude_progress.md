# Revelia — Claude Progress Log

> **HOW TO USE**: Every session reads this file first. Every session appends an entry at the bottom when it ends (or after each significant change). Use `[DONE]`, `[IN-PROGRESS]`, `[BLOCKED]`, `[SKIPPED]` tags on tasks. Never delete old entries — archive them under a collapsible section if they get long.

---

## Project Snapshot (standing context — update when it changes)

| Field | Value |
|-------|-------|
| App | Revelia — AI mystical reading app (face/palm/astrology/numerology) |
| Mobile | React Native + Expo SDK 53, Expo Router, NativeWind, Zustand |
| Backend | Node.js 20 + Express + TypeScript, MongoDB Atlas, Railway |
| AI | Anthropic Claude API (Sonnet for vision/readings, Haiku for geocoder) |
| Subscriptions | RevenueCat (Free / Premium / Premium Plus / Lifetime) — purchase/restore now update Profile UI live (no relaunch) |
| Auth | Email+OTP, Apple Sign-In (iOS done), Google Sign-In (Android — DONE, SHA-1 registered, working; logout account-picker bug fixed — verify on vc25) |
| Push | OneSignal (live — scheduler active, external_id wired on all 5 auth paths) |
| Storage | Cloudflare R2 |
| Current branch | `feature/build-26` |
| Current build target | Build 26 / v1.2.0 / versionCode 26 (vc26 — next production build; autoIncrement bumps 25 → 26) |
| Last shipped | versionCode 11 → Play Store production (main); vc24 + vc25 internal testing (feature/build-26); **vc25 already built — internal-test2 fixes (incl. share-cancel cascade) ride vc26** |

---

## Build 26 Master Task List

### Must-have for submission
- [DONE] **Google Sign-In for Android** — Code complete, SHA-1 (Google Play signing key) registered in Google Cloud Console, DEVELOPER_ERROR resolved, sign-in working end-to-end in vc23/24 builds. Name threaded from SDK through to User.create (BUG-004 fixed).
- [DONE] **OneSignal push notifications** — Un-stubbed (newArch enabled), scheduler fixed (API URL + auth header), external_id registered on all 5 paths (login/Apple/Google/signup/checkAuth), device registration polling loop hardened.
- [DONE] **RevenueCat** — Mobile SDK fully un-stubbed (offerings, purchase, restore, identify). Paywall `offerings.current.availablePackages` fix applied. Production EAS env key added. Billing sheet opens correctly.
- [DONE] **Rate Revelia button URLs** — Android fixed to `com.revelia.app`; iOS placeholder `id000000000` (replace with actual numeric App Store ID after submission).
- [DONE] **ScrollView bottom-inset sweep** — `useBottomInsetPadding` added to `palm.tsx`, `readings/index.tsx`, `combined.tsx`.
- [DONE] **Shareable visual cards** (Phase 6) — `ShareCard.tsx` on Face, Cosmic Blueprint, Career Destiny, Name Destiny.
- [DONE] **Play Store link in shares** (Phase 7) — `react-native-share` single intent (image + footer text combined on Android).
- [DONE] **In-app review prompts** (Phase 5) — `expo-store-review`, session-deduped, persistent SecureStore per-reading-type flag (BUG-003 fixed), ref guard on career + compatibility (BUG-005 fixed).
- [DONE] **RTDN (Real-Time Developer Notifications)** — Endpoint `POST /api/webhooks/revenuecat-rtdn` live (logs raw body, returns 200). Google Cloud Pub/Sub → RevenueCat wiring completed manually by user. Railway receiving purchase events. Optional HMAC signature verification not yet added (low priority — endpoint is behind Railway HTTPS).

### Server fixes
- [DONE] **Express trust proxy** — `app.set('trust proxy', 1)` in `server/src/app.ts`; resolves `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` on Railway and makes per-IP rate limiting work correctly.
- [DONE] **Anthropic 529 retry** — `error.status === 529` added to `isRetryableError()` in `server/src/services/claude.service.ts`. Anthropic client `maxRetries` bumped to 4 (SDK-level). Readings now retry on Anthropic overload spikes instead of failing silently.

### Merged from main (2026-06-24) — clean, zero conflicts
- [DONE] **Complimentary tier grants** (commit `501e1a4`) — `getEffectiveTier()` utility, optional `User.subscription.comp` field, `grant-comp-tier.ts` admin script, lazy auto-expiry (no cron). Zero impact on regular users — comp only layers on top of billing tier. All tier checks unchanged for non-comp users.

### Already done (pre-Build 26 stabilization — on `main`)
- [DONE] RevenueCat webhook handler for subscription tier persistence
- [DONE] Insight cache invalidation on tier upgrade → Monthly Reading regenerates
- [DONE] Expo SDK 52→53 upgrade (RN 0.79, React 19) for 16KB page size compliance
- [DONE] Android edge-to-edge bottom inset handling (Build 24)
- [DONE] Safe-area / auth-rehydration / share / UI polish (Build 24)
- [DONE] Geocoder service (Haiku + MongoDB cache + Sonnet fallback)
- [DONE] Astrology chart honors birthplace IANA timezone
- [DONE] Profile: editable Daily Insight timezone, auto-geocode birth place, noon-default unknown time
- [DONE] OTP delivery audit + structured logging
- [DONE] Image validation (three-state soft-fail)

---

## Session Log

### Session: build26-phase1 | 2026-06-15
**Goal**: Orientation + tracking infrastructure setup
**Model**: claude-sonnet-4-6
**Branch at start**: `feature/build-26` (1 uncommitted change: `package-lock.json`)

**Work done**:
- [DONE] Explored full codebase, documentation, and `contextForOthers.md`
- [DONE] Created `tracking_files/` directory with `claude_progress.md` and `session_handoff.md`

**Work NOT done this session** (Build 26 tasks untouched):
- Google Sign-In for Android
- OneSignal push scheduler
- Rate Revelia URLs
- ScrollView inset sweep
- RTDN config

**Notes**:
- `package-lock.json` has a local modification — appears to be a minor npm install artifact, not blocking
- The `contextForOthers.md` in root is the previous human-written context doc; this tracking system supersedes it for session-to-session handoff
- Apple Sign-In pattern to mirror for Google: `server/src/services/auth.service.ts` + `server/src/controllers/auth.controller.ts` + `mobile/store/authStore.ts`

### Session: build26-phase1-google | 2026-06-15
**Goal**: Phase 1 — Google Sign-In for Android
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Discoveries (nothing to code on backend — already done):**
- `server/src/services/auth.service.ts`: `verifyGoogleToken` (via `oauth2.googleapis.com/tokeninfo`) + `loginWithGoogle` — ALREADY COMPLETE
- `server/src/controllers/auth.controller.ts`: `googleAuth` controller — ALREADY COMPLETE
- `server/src/routes/auth.routes.ts`: `POST /api/auth/google` — ALREADY COMPLETE
- `mobile/lib/api.ts`: `authAPI.loginWithGoogle(idToken)` — ALREADY COMPLETE
- `@react-native-google-signin/google-signin@^13.0.0` in `package.json` — ALREADY INSTALLED

**Files created:**
- [DONE] `mobile/lib/googleSignIn.ts` — new helper: `configureGoogleSignIn()` + `signInWithGoogle()` returns ID token; handles cancellation via `GOOGLE_SIGN_IN_CANCELLED` sentinel

**Files modified:**
- [DONE] `mobile/store/authStore.ts` — replaced `loginWithGoogle` stub with real flow: configure → SDK sign-in → backend POST → save token/user → RevenueCat identify → router.replace('/')
- [DONE] `mobile/app/(auth)/welcome.tsx` — wired `loginWithGoogle`, removed `disabled`/`opacity` from Android button, removed "Coming Soon" label, error handling mirrors Apple pattern
- [DONE] `mobile/app.json` — added `"@react-native-google-signin/google-signin"` to plugins
- [DONE] `mobile/.env.example` — added `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` with instructions

**BLOCKED — waiting on user for:**
1. Run `eas credentials --platform android` → copy SHA-1
2. Google Cloud Console: register SHA-1 under Android OAuth client (or create one); also ensure a Web client exists
3. Copy Web Client ID → `mobile/.env`: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<web_client_id>`
4. Copy same Web Client ID → Railway env: `GOOGLE_CLIENT_ID=<web_client_id>`
5. Rebuild the Android EAS binary (prebuild bakes the plugin)

**Gaps discovered post-session — fixed in session build26-phase1-fixes:**
- `mobile/app/(auth)/login.tsx` — ✅ Fixed: button wired, `loginWithGoogle` imported
- `server/.env.example` — ✅ Fixed: `GOOGLE_OAUTH_WEB_CLIENT_ID` (+ `APPLE_CLIENT_ID`) added
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` → ✅ renamed to `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `GOOGLE_CLIENT_ID` → ✅ renamed to `GOOGLE_OAUTH_WEB_CLIENT_ID` across server/

**Pre-existing TS errors (not from our changes):** `astrology/daily.tsx`, `astrology/monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx`

---

### Session: build26-phase6 | 2026-06-15
**Goal**: Phase 6 — Shareable visual cards for Face Reading, Cosmic Blueprint, Career Destiny, Name Destiny
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] Created `mobile/components/ShareCard.tsx` — reusable visual card with `title`, `subtitle`, `insightLine`, `brandingTag`, optional `numbers[]`. Matches `ShareableQuote` gradient/badge/branding style exactly.
- [DONE] `mobile/app/(main)/readings/face.tsx` — replaced legacy `ShareableQuote` (V1-only) with `ShareCard`. Now shows for both V1 and V2 archetype data. Title: "Face Reading", subtitle: archetype name, insightLine: shareableQuote → coreEssence → tagline (in priority order).
- [DONE] `mobile/app/(main)/readings/combined.tsx` — added `ShareCard` before EntertainmentDisclaimer. Title: "Cosmic Blueprint", subtitle: sign names joined with "·" (or archetype fallback), insightLine: faceArchetypeTagline → palmLifeTheme → narrative.
- [DONE] `mobile/app/(main)/readings/career-destiny.tsx` — added `ShareCard` at bottom of `CareerResults`. Title: "Career Destiny", subtitle: top career + confidence %, insightLine: first sentence of cp.summary or top career description.
- [DONE] `mobile/app/(main)/numerology/name-destiny.tsx` — replaced `Share.share()` plain-text with `ShareCard`. Title: "Name Destiny", subtitle: fullName, insightLine: overallAssessment first sentence, numbers: Expression/SoulUrge/Personality.

**Files created**: `mobile/components/ShareCard.tsx`
**Files modified**: `face.tsx`, `combined.tsx`, `career-destiny.tsx`, `name-destiny.tsx`

**NOT touched**: Palm Reading, Compatibility Reading (as specified)

**Pre-existing TS errors remain**: `astrology/daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx` — unrelated to this work.

---

### Session: build26-phase7 | 2026-06-16
**Goal**: Phase 7 — Append Play Store download link to every reading share
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] Created `mobile/lib/shareUtils.ts` — exports `SHARE_FOOTER` (Play Store link text)
- [DONE] `mobile/utils/shareReading.ts` — replaced `Sharing.shareAsync(uri, {mimeType, dialogTitle, UTI})` with `Share.share({ message: SHARE_FOOTER, url: uri })`. Removed `expo-sharing` import. Covers Palm, Face, Cosmic Blueprint, Career Destiny, Name Destiny (all use this utility via `ShareCard` / `ShareableQuote`).
- [DONE] `mobile/app/(main)/compatibility/[id].tsx` — replaced inline `Sharing.shareAsync(uri)` + `isAvailableAsync` check with `Share.share({ message: SHARE_FOOTER, url: uri })`. Removed `expo-sharing` import. Added `SHARE_FOOTER` import.

**Files created**: `mobile/lib/shareUtils.ts`
**Files modified**: `mobile/utils/shareReading.ts`, `mobile/app/(main)/compatibility/[id].tsx`

**Behavior**: iOS — image + footer text in one share sheet. Android — footer text only (`url` is ignored by `Share.share` on Android; acceptable per spec).

**NOT touched**: `profile.tsx` Share App button (not a reading card; out of scope). Card image design unchanged.

**Pre-existing TS errors remain unchanged**: `astrology/daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx`.

---
### Session: build26-phase8 | 2026-06-16
**Goal**: Phase 8 — Polish fixes: Rate Revelia URLs + ScrollView bottom-inset sweep
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] `mobile/app/(main)/profile.tsx` — `handleRateApp`: Android URL fixed to `https://play.google.com/store/apps/details?id=com.revelia.app`; iOS URL updated to `https://apps.apple.com/app/revelia/id000000000` (placeholder — replace with actual App Store numeric ID post-submission)
- [DONE] `mobile/app/(main)/readings/palm.tsx` — added `useBottomInsetPadding` import + `const bottomPad`, applied to `ScrollView contentContainerStyle`
- [DONE] `mobile/app/(main)/readings/index.tsx` — same hook pattern applied to the readings hub `ScrollView`
- [DONE] `mobile/app/(main)/readings/combined.tsx` — replaced hardcoded `paddingBottom: 32` with `bottomPad` from hook (previous handoff incorrectly listed combined.tsx as already done)

**Notes**:
- The previous handoff claimed `combined.tsx` "already has" `useBottomInsetPadding` — it did NOT; it had `paddingBottom: 32` hardcoded. Fixed in this session.
- iOS App Store ID is unknown (app not yet on App Store). Placeholder `id000000000` must be replaced by the developer after App Store Connect assigns the ID.

---
### Session: build26-server-ratelimit-fix | 2026-06-16
**Goal**: Fix `ERR_ERL_KEY_GEN_IPV6` crash in server rate-limit middleware
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] `server/src/middleware/auth-rate-limit.middleware.ts` — imported `ipKeyGenerator` from `express-rate-limit`; replaced `req.ip` with `ipKeyGenerator(req)` in the fallback branch of `keyGenerator`
- [DONE] `server/src/middleware/verification-rate-limit.middleware.ts` — same two-line fix

**Root cause**: express-rate-limit v7+ throws `ERR_ERL_KEY_GEN_IPV6` when a custom `keyGenerator` uses `req.ip` directly without going through the `ipKeyGenerator` helper, which normalizes IPv6 addresses (e.g. collapses `::ffff:1.2.3.4` → `1.2.3.4`). The email-keyed path was unaffected; only the IP fallback needed the fix.

**No rate limit values or other logic changed.**

**Also observed (not fixed — user action required)**:
- MongoDB `ECONNREFUSED` on `revelia-cluster.itkcpyb.mongodb.net` — Atlas IP whitelist does not include the current dev machine's IP. User must add it in Atlas → Network Access.

### Session: build26-phase1-fixes | 2026-06-16
**Goal**: Fix 4 issues found in Phase 1 Google Sign-In wiring
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Files modified:**
- [DONE] `mobile/lib/googleSignIn.ts` — `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- [DONE] `mobile/.env.example` — renamed env var + updated comment to reference `GOOGLE_OAUTH_WEB_CLIENT_ID`
- [DONE] `server/src/services/auth.service.ts` — `GOOGLE_CLIENT_ID` → `GOOGLE_OAUTH_WEB_CLIENT_ID`
- [DONE] `server/src/index.ts` — startup warning updated to `GOOGLE_OAUTH_WEB_CLIENT_ID`
- [DONE] `server/AUTH_IMPLEMENTATION.md` — both references to `GOOGLE_CLIENT_ID` updated
- [DONE] `server/.env.example` — new "Apple & Google OAuth" section added with `APPLE_CLIENT_ID` + `GOOGLE_OAUTH_WEB_CLIENT_ID`
- [DONE] `mobile/app/(auth)/login.tsx` — `loginWithGoogle` imported from store; handler replaced (no more Alert stub); button: `disabled` removed, `opacity:0.7` removed, "Coming Soon" text removed, `onPress={handleGoogleSignIn}` added
- [DONE] `mobile/app/(auth)/welcome.tsx` — verified already correct, left untouched

**TypeScript**: zero new errors in mobile or server (pre-existing errors in `astrology/daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx` unchanged)

**Still blocked on (config — no code remaining):**
1. Run `! eas credentials --platform android` → copy SHA-1
2. Google Cloud Console: Android OAuth client (SHA-1 + `com.revelia.app`) + Web OAuth client
3. `mobile/.env`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web_client_id>`
4. Railway env: `GOOGLE_OAUTH_WEB_CLIENT_ID=<web_client_id>`
5. New EAS Android build

---
### Session: build26-phase2 | 2026-06-16
**Goal**: Phase 2 — Un-stub OneSignal, wire auth flow, wire notification settings UI
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Discoveries (backend already complete — no server changes needed):**
- `server/src/models/User.ts`: `preferences.notifications`, `preferences.dailyInsightTime`, `preferences.timezone` — ALREADY EXISTS
- `server/src/routes/notifications.routes.ts`: `PATCH /api/notifications/preferences` — ALREADY EXISTS
- `server/src/controllers/notification.controller.ts`: `updatePreferences` — ALREADY COMPLETE
- `react-native-onesignal@5.4.5` installed; `onesignal-expo-plugin` NOT needed — v5 ships its own `app.plugin.js`

**Files modified:**
- [DONE] `mobile/app.json` — added `"react-native-onesignal"` to plugins array
- [DONE] `mobile/lib/onesignal.ts` — replaced stub with real SDK calls:
  - `initializeOneSignal()` → `OneSignal.initialize(ONESIGNAL_APP_ID)`
  - `loginOneSignal(userId)` → `OneSignal.login(userId)` (fire-and-forget)
  - `logoutOneSignal()` → `OneSignal.logout()` (fire-and-forget)
  - `optInNotifications()` → `OneSignal.Notifications.requestPermission(true)`
  - `optOutNotifications()` → `OneSignal.User.pushSubscription.optOut()`
  - `setUserTags(tier?, dailyInsightTime?, timezone?)` → `OneSignal.User.addTags({...})` (skips null/undefined fields)
  - `getOneSignalPlayerId()` → `OneSignal.User.pushSubscription.getIdAsync()` (async)
  - `setupNotificationHandlers()` → `OneSignal.Notifications.addEventListener('click', ...)`
  - `areNotificationsEnabled()` → `OneSignal.Notifications.getPermissionAsync()`
  - `requestNotificationPermission()` → request + getPermissionAsync
- [DONE] `mobile/store/authStore.ts` — added `loginOneSignal` + `setUserTags` after all three login methods (email, Apple, Google); added `logoutOneSignal` in logout action
- [DONE] `mobile/app/(main)/profile.tsx` — removed "launching soon" note; wired toggle to `optInNotifications`/`optOutNotifications`; wired time change + timezone change to `setUserTags`

**TypeScript**: zero new errors (mobile clean, server clean). Pre-existing errors in `daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx` unchanged.

**Key API notes for OneSignal v5.4.5:**
- `pushSubscription` is a namespace, no `.id` property; use `getIdAsync()` async method
- `addEventListener` requires explicit `NotificationClickEvent` type annotation in callback
- `getPermissionAsync()` is the non-deprecated replacement for `hasPermission()`
- `login()` and `logout()` are sync (void), not Promise

### Session: build26-phase3 | 2026-06-16 [UNTRACKED — reconstructed from git log]
**Goal**: Phase 3 — Backend push scheduler (daily insight + re-engagement crons)
**Commit**: `8b96921 feat(phase-3): backend push scheduler with daily insight and re-engagement crons`
**Note**: This session was not tracked live. Entry added retroactively. See git log / commit diff for full details.

- [DONE] Backend cron scheduler for daily insight push notifications
- [DONE] Re-engagement cron for lapsed users

---

### Session: build26-phase4 | 2026-06-16
**Goal**: Phase 4 — RTDN placeholder webhook endpoint
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] `server/src/controllers/rtdn.controller.ts` — created; `handleRtdn` logs raw body via `logger.info`, returns `{ received: true }` with 200
- [DONE] `server/src/routes/rtdn.routes.ts` — created; `POST /revenuecat-rtdn` → `handleRtdn`
- [DONE] `server/src/routes/index.ts` — registered rtdn routes under `/api/webhooks` (separate `app.use` after existing webhookRoutes)
- [DONE] `server/.env.example` — added `REVENUECAT_RTDN_SECRET` with comment in RevenueCat section
- [DONE] `npx tsc --noEmit` → zero new errors confirmed

**User committed manually** (some remaining work in this session still to be done).

**What remains in this session** (user will continue — not yet committed):
- Unknown at time of writing — user interrupted to commit what's done so far; scope TBD

**Endpoint**: `POST /api/webhooks/revenuecat-rtdn` — placeholder, no auth/HMAC yet

### Session: build26-phase5 | 2026-06-17
**Goal**: Phase 5 — Native Google Play In-App Review prompt at key engagement moments
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] `expo-store-review@~8.1.5` — already installed, no npm install needed
- [DONE] `mobile/lib/inAppReview.ts` — created; `requestReviewIfEligible()`: Android-only, session-deduped, `isAvailableAsync()` guard before calling `StoreReview.requestReview()`
- [DONE] `mobile/store/readingsStore.ts` — added `completedReadingsCount: number` field + `incrementCompletedReadings(): Promise<number>` action; persists lifetime count to `expo-secure-store` under key `revelia_completed_readings_count`
- [DONE] `mobile/app/(main)/readings/face.tsx` — Trigger 1a: `useEffect([faceReading])` with `hasTriggeredReviewRef` guard; increments count + fires review if `newCount === 2`
- [DONE] `mobile/app/(main)/readings/palm.tsx` — Trigger 1b: same pattern watching `palmReadingDominant`
- [DONE] `mobile/app/(main)/readings/career-destiny.tsx` — Trigger 2: `useEffect([career])` calls `requestReviewIfEligible()` when career data is non-null
- [DONE] `mobile/app/(main)/compatibility/[id].tsx` — Trigger 3: `useEffect([reading])` calls `requestReviewIfEligible()` when reading data is non-null

**TypeScript**: zero new errors. Only output was pre-existing `app/(paywall)/index.tsx` error (grep pattern didn't filter due to `()` in path — confirmed pre-existing).

**Notes**:
- Uses `expo-secure-store` for persistence (consistent with rest of project — no `@react-native-async-storage` needed)
- `hasPromptedThisSession` in `inAppReview.ts` ensures at most one prompt per app session regardless of how many triggers fire
- Google Play controls actual display frequency — the native API may silently no-op if it judges the timing inappropriate
- Cannot be tested in Expo Go or emulator — requires a real device with Play Store. Will be verified in final EAS build.

### Session: build26-mobile-minorFixes | 2026-06-17
**Goal**: Fix `PluginError: react-native-onesignal does not contain a valid config plugin` at `expo start`
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Root cause**: `react-native-onesignal` v5.4.5 ships a pure-ESM `dist/index.js` (built with vite-plus). Expo's config plugin resolver calls `require()` (CJS), which throws `Cannot use import statement outside a module`. The Phase 2 discovery note "onesignal-expo-plugin NOT needed — v5 ships its own app.plugin.js" was incorrect for v5.4.5; that version has no CJS-compatible plugin entry.

**Fix**:
- [DONE] `mobile/package.json` — added `onesignal-expo-plugin@^2.7.0` (CJS-compatible Expo plugin wrapper for OneSignal v5)
- [DONE] `mobile/app.json` — replaced `"react-native-onesignal"` plugin entry with `["onesignal-expo-plugin", { "mode": "production" }]`

**Verified**: `expo start --clear` → Metro starts cleanly, no PluginError.
**TS errors**: unchanged — pre-existing errors in `astrology/daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx` only.

### Session: revelia-repo-overview | 2026-06-17
**Goal**: Full codebase audit — analyze Google Sign-In readiness, explain dirty `package-lock.json`, find all build-26 bugs
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**No code changed this session — analysis and documentation only.**

**Work done**:
- [DONE] Diagnosed dirty root `package-lock.json` — caused by `npm install` at repo root during prior session; root has no workspaces; fix is `git checkout -- package-lock.json`
- [DONE] Google Sign-In readiness analysis — user stated blockers are fixed (env vars, UI wiring); `google-services.json` still needed at `mobile/google-services.json` for native build
- [DONE] Full bug audit across all build-26 phases (spawned `feature-dev:code-reviewer` agent)
- [DONE] Created `tracking_files/bugs/` directory with 5 individual bug files + `index.md` + `fix-sequence.md`

**Bugs found**:
- [OPEN] BUG-001 CRITICAL — `ipKeyGenerator(req)` → `ipKeyGenerator(req.ip ?? '')` in 2 server middleware files
- [OPEN] BUG-002 HIGH — Android share drops image; `Share.share url` ignored on Android; needs `expo-sharing` platform branch
- [OPEN] BUG-003 HIGH — `completedReadingsCount` inflates on every face/palm screen visit; needs persistent SecureStore flag per reading type
- [OPEN] BUG-004 HIGH — Google Sign-In creates users with no name; tokeninfo endpoint returns no profile fields; Option A (pass name from mobile SDK) confirmed
- [OPEN] BUG-005 MEDIUM — career + compatibility review triggers missing `hasTriggeredReviewRef` guard; fires every app session

**Next session**: `build26-bugfixes` — read `tracking_files/bugs/fix-sequence.md` first; fix order: BUG-001 → BUG-005 → BUG-003 → BUG-002 → BUG-004

### Session: build26-bugfixes | 2026-06-17
**Goal**: Fix all 5 Build-26 bugs in sequence
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] **BUG-001** `server/src/middleware/auth-rate-limit.middleware.ts` + `verification-rate-limit.middleware.ts` — `ipKeyGenerator(req)` → `ipKeyGenerator(req.ip ?? '')`. Per-IP rate limiting now functional in production.
- [DONE] **BUG-005** `mobile/app/(main)/readings/career-destiny.tsx` + `compatibility/[id].tsx` — added `hasTriggeredReviewRef` + guard to both review trigger `useEffect`s. Mirrors pattern from `face.tsx`/`palm.tsx`.
- [DONE] **BUG-003** Created `mobile/lib/reviewKeys.ts` with `REVIEW_COUNTED_KEYS`; replaced `hasTriggeredReviewRef` in `face.tsx` + `palm.tsx` with persistent `SecureStore` check per reading type — count no longer inflates on revisit.
- [DONE] **BUG-002** `mobile/utils/shareReading.ts` + `compatibility/[id].tsx` — platform branch: Android uses `expo-sharing.shareAsync(uri)`, iOS keeps `Share.share({ message, url })`. Image now preserved in Android share sheet.
- [DONE] **BUG-004** (Option A) Threaded Google user name through full stack: `googleSignIn.ts` returns `{ idToken, name }`; `api.ts` + `authStore.ts` pass it; `googleAuthSchema` accepts `name?`; `auth.service.ts` sets `name` on `User.create` (≥2 chars guard, consistent with Apple pattern).
- [DONE] `git checkout -- package-lock.json` — root lock restored to HEAD

**TypeScript**: zero new errors in mobile or server after each fix (pre-existing errors in `daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx` unchanged throughout).

**Remaining**: EAS Android dev build + manual device test against checklist in `fix-sequence.md`. Then merge to `main`.

### Session: build26-preview3-revenueCat-ShareImageCapturedLinkSharing-Fix | 2026-06-18
**Goal**: Fix BUG-002 follow-up — Android share missing footer link + captureRef crash fallback
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Root cause of this session**: The `build26-bugfixes` fix for BUG-002 sent the image via `expo-sharing` on Android but never appended the Play Store footer link — `Sharing.shareAsync` only shares a file, not text. Additionally, `captureRef()` could throw `Failed to capture view snapshot` on certain readings with no recovery path.

**Work done**:
- [DONE] `mobile/utils/shareReading.ts` — Two changes: (1) wrap `captureRef()` in try/catch; on failure `uri` stays null. (2) On Android with a captured image: call `Sharing.shareAsync(uri)` for the image then `Share.share({ message: SHARE_FOOTER })` for the footer as two sequential operations. On iOS: unchanged `Share.share({ message, url })`. On capture failure: text-only `Share.share({ message: SHARE_FOOTER })`.
- [DONE] `mobile/app/(main)/compatibility/[id].tsx` — Same pattern for the inline `shareReadingCard` function. `captureRef` isolated in its own try/catch. Platform branch + text-only fallback identical to the utility. No layout or card design changed.

**Files modified**: `mobile/utils/shareReading.ts`, `mobile/app/(main)/compatibility/[id].tsx`
**Tracking files updated**: `BUG-002-android-share-image.md` (FIXED), `bugs/index.md` (date + note updated)

**Pre-existing TS errors remain unchanged**: `astrology/daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx`.

### Session: build26-preview3-revenueCat-ShareImageCapturedLinkSharing-Fix (continued) | 2026-06-18
**Goal**: Replace two-step share with single native intent via `react-native-share` (image + caption together)
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Why**: Two separate `shareAsync` + `Share.share` calls cannot be received as a single message in WhatsApp/other apps. `react-native-share` sends a combined native intent (image + text in one operation), matching how Google Pay and similar apps share.

**Work done**:
- [DONE] `mobile/package.json` — added `react-native-share@^12.3.1`
- [DONE] `mobile/utils/shareReading.ts` — replaced platform-branched two-step share with `RNShare.open({ title, message: SHARE_FOOTER, url: \`file://\${uri}\`, type: 'image/png' })`. Fallback on RNShare failure: `Sharing.shareAsync(uri)` image-only. Fallback on captureRef failure: `Share.share({ message: SHARE_FOOTER })` text-only. Removed unused `Platform` import.
- [DONE] `mobile/app/(main)/compatibility/[id].tsx` — same `RNShare.open` pattern for inline `shareReadingCard`. Added `RNShare` import. Removed `Platform` from RN imports.

**TypeScript**: zero new errors. Pre-existing errors in `daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx` unchanged.
**Committed**: fix(phase-7): use react-native-share for combined image+text share

### Session: build26-preview4-OneSignal-Fix-RTDNmanualSteps | 2026-06-18
**Goal**: Un-stub OneSignal — deep research into crash root cause, then fix
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Research findings (read-only phase)**:
- Root cause of startup crash confirmed: `react-native-onesignal@5.4.5` is a TurboModule (`isTurboModule: true`) that exposes events via Codegen `EventEmitter<Object>` typed fields. With `newArchEnabled: false`, the old-arch bridge wrapper returned by `TurboModuleRegistry.getEnforcing("OneSignal")` does NOT expose `onPermissionChanged`, `onSubscriptionChanged`, etc. as callable JS functions — they are `undefined`. `EventManager.setupListeners()` is called at module-scope (line 207 of dist/index.js), so the crash fires on first `import { OneSignal } from 'react-native-onesignal'`, before `initialize()` is ever called. The null-guard `if (this.RNOneSignal == null) return` doesn't help because the module IS registered — only the EventEmitter methods are missing.
- All dependencies audited for new-arch safety: reanimated, gesture-handler, react-native-share, react-native-view-shot, google-signin, datetimepicker — all have `codegenConfig` and TurboReactPackage. expo-store-review and all Expo SDK modules use Expo Modules API (new-arch native). react-native-purchases is old-arch but works via RN 0.79 interop layer.

**Changes made**:
- [DONE] `mobile/app.json` — `"newArchEnabled": false` → `"newArchEnabled": true`
- [DONE] `mobile/lib/onesignal.ts` — full un-stub with real SDK implementation; exports: `initializeOneSignal`, `loginOneSignalUser`, `logoutOneSignalUser`, `requestNotificationPermission`, `optOutOfNotifications`, `optInToNotifications`, `setUserTags(Record<string,string>)`, `setNotificationClickHandler`, `getOneSignalPlayerId`, `areNotificationsEnabled`
- [DONE] `mobile/store/authStore.ts` — updated imports + all 3 call sites: `loginOneSignal` → `loginOneSignalUser`, `logoutOneSignal` → `logoutOneSignalUser`, `setUserTags(tier, time, tz)` → `setUserTags({ tier, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })`
- [DONE] `mobile/app/(main)/profile.tsx` — imports updated; toggle ON wired to `requestNotificationPermission()` + `optInToNotifications()`; toggle OFF to `optOutOfNotifications()`; both `setUserTags` calls updated to object signature
- [DONE] `mobile/app/_layout.tsx` — `setupNotificationHandlers` → `setNotificationClickHandler`; deep-link handler updated to `NotificationClickEvent` type (`event.notification.additionalData`)
- [DONE] `mobile/hooks/useNotificationPermission.ts` — `areNotificationsEnabled` now properly exported from onesignal.ts (was in old stub, was missing from initial new impl, re-added)

**TypeScript**: zero new errors. Pre-existing errors in `daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx` unchanged.

**Remaining**: EAS dev build + device test. OneSignal will now initialize properly because new arch exposes `EventEmitter<Object>` subscription methods as callable JS functions.

### Session: build26-preview6-revenueCat-UnstubbingRC-b4OneSignalRESTKeyAddition-fix | 2026-06-19
**Goal**: Un-stub RevenueCat mobile integration (paywall was showing "Subscription plans not loaded" on every tap)
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Root cause confirmed**: `mobile/lib/revenuecat.ts` and `mobile/store/subscriptionStore.ts` were fully stubbed — `Purchases.configure()` never called, `fetchOfferings()` always set `offerings: null`. `paywall/index.tsx:28` guards on `!offerings` and throws the Alert directly.

**Research phase (read-only)**:
- `react-native-purchases@9.15.2` installed (semver resolved from `^9.7.5`); NO `codegenConfig` in its package.json — uses RN 0.79 interop layer (old-arch bridge), same as confirmed in OneSignal session
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` present in `eas.json` preview profile; MISSING from production — risk for store submission
- `authStore.ts` already imports + calls `identifyUser` in all 4 auth paths and `logoutRevenueCat` in logout — no authStore changes needed
- `SubscriptionTier` type lives in `mobile/lib/constants.ts`, not `../types/shared` — import path corrected in implementation

**Files modified**:
- [DONE] `mobile/lib/revenuecat.ts` — full replacement with real SDK calls: `Purchases.configure()`, `Purchases.logIn()`, `Purchases.logOut()`, `Purchases.getOfferings()`, `Purchases.purchasePackage()`, `Purchases.restorePurchases()`, `Purchases.getCustomerInfo()`. Added new `getCustomerInfo()` export. `mapCustomerInfoToTier()` now reads `customerInfo.entitlements.active`. Import fixed to `SubscriptionTier` from `'./constants'`.
- [DONE] `mobile/store/subscriptionStore.ts` — replaced all 4 stubbed actions with real implementations. Imports aliased (`purchasePackage as rcPurchasePackage`, `restorePurchases as rcRestorePurchases`) to avoid name collision. `purchasePackage` calls `subscriptionService.syncSubscription()` after successful purchase for backend sync.
- [DONE] `mobile/eas.json` — added `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_UrIHoNOvoawPfJvzgIjGijgUfYa"` to `production` profile env (was missing — would have broken store build)

**Files NOT modified** (already correct):
- `mobile/store/authStore.ts` — already had `identifyUser` + `logoutRevenueCat` fully wired at all call sites
- `mobile/app/(paywall)/index.tsx` — will work once store returns real offerings
- `mobile/app/_layout.tsx` — `initializeRevenueCat()` already called correctly

**TypeScript**: zero new errors. Pre-existing 9 errors in `astrology/daily.tsx`, `monthly.tsx`, `paywall/index.tsx`, `verify-email.tsx` unchanged (verified by stash/unstash).

**Known structural issue (not fixed — out of scope)**: `paywall/index.tsx:35` calls `offerings.availablePackages` — this is a property of `PurchasesOffering` (singular), not `PurchasesOfferings` (top-level). Correct pattern would be `offerings.current?.availablePackages`. Paywall UI/logic fix is a separate task; store typing for `offerings` intentionally kept as `any | null` to defer this.

### Session: build26-preview7-fixingRevenueCat-Playstore-So-Prod-Building | 2026-06-19
**Goal**: Prepare production EAS build config for Play Store Internal Testing track (RevenueCat billing requires Play-signed AAB)
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Findings**:
- `app.json` actual values were `version: "1.0.0"` / `android.versionCode: 1` (not 1.1.0/15 as expected from prior memory — diverged from memory)
- `eas.json` production profile had `EXPO_PUBLIC_API_URL: "https://api.revelia.me/api"` (not railway URL) + was missing `EXPO_PUBLIC_ONESIGNAL_APP_ID` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` copied from preview profile: `530984023588-uq36tvq7gbbmrjobh4dc5m995rmpl75o.apps.googleusercontent.com`

**Files modified**:
- [DONE] `mobile/app.json` — `version: "1.0.0"` → `"1.2.0"`, `android.versionCode: 1` → `16`
- [DONE] `mobile/eas.json` — production `env` block: updated `EXPO_PUBLIC_API_URL` to railway URL, added `EXPO_PUBLIC_ONESIGNAL_APP_ID`, added `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. `ONESIGNAL_REST_API_KEY` intentionally NOT added (server secret, not client env var).

**Preserved in production profile**: `autoIncrement: true`, `channel: "production"`, `ios.image: "latest"`, `ios.simulator: false`

**Next step**: `eas build --platform android --profile production` → upload AAB to Play Console Internal Testing track → test RevenueCat billing on Play-signed build

### Session: build26-preview6-OneSignal-BackendCron-Scheduler-Fix | 2026-06-19
**Goal**: Fix backend push scheduler — OneSignal REST API call was missing `name` field, had no per-user logging, and tick summary was suppressed when no sends occurred
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Findings**:
- Scheduler was NOT a placeholder — fully implemented in prior session. Missing: `name` field in API payload, per-user success/failure logs with `[Scheduler]` prefix, always-on tick summary with `matched=` count, startup warning for missing OneSignal env vars
- Both `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` already present in `server/.env` and in `env.ts` production warning block

**Files modified**:
- [DONE] `server/src/jobs/pushScheduler.ts`:
  - `sendOneSignalPush()` — added `name: string` param; included in API payload
  - Heading updated: `'Your daily insight is ready ✨'` → `'Your Daily Cosmic Insight ✨'`
  - Daily tick: added `matchedCount`; added per-user `logger.info('[Scheduler] Sent daily push to user ${userId}')` on success; changed failure log to `[Scheduler] Failed to send to user ${userId}: ${errorMessage}`; tick summary now always logs with `matched=` count
  - Re-engagement tick: same per-user log pattern applied; `name` field added (`reengagement-${userId}-${dateStr}`)
  - `startPushScheduler()`: startup warning added if either OneSignal env var is missing

**TypeScript**: `npx tsc --noEmit` → zero errors

**Railway env vars to add** (both already in `server/.env`):
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`

### Session: build26-prod1-internalTest-PlansNotOpeningBilling | 2026-06-22
**Goal**: Diagnose and fix paywall "plans not loading" / billing not opening; harden OneSignal external_id registration; wire Google Sign-In on signup screen
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Root cause diagnosed and fixed**:

**BUG — `paywall/index.tsx` called `offerings.availablePackages` instead of `offerings.current.availablePackages`**
- `getOfferings()` returns `PurchasesOfferings` (collection object with `.current` + `.all`)
- Store saved the full collection as `offerings`
- Paywall read `offerings.availablePackages` which is `undefined` on the collection — `.find()` on undefined → crash
- Null guard only checked `!offerings` (collection object is always truthy) → guard passed, crash happened at line 35

**Files modified**:
- [DONE] `mobile/app/(paywall)/index.tsx` — null guard: `!offerings` → `!offerings || !offerings.current`; package lookup: `offerings.availablePackages.find(pkg => ...)` → `offerings.current?.availablePackages.find((pkg: any) => ...)`
- [DONE] `mobile/store/subscriptionStore.ts` — added logging in `fetchOfferings()`: `console.log('[RC] getOfferings result:', JSON.stringify(offerings))`, `console.warn('[RC] getOfferings returned null - ...')`, `console.warn('[RC] fetchOfferings error:', e)`
- [DONE] `mobile/lib/revenuecat.ts` — added logging in `initializeRevenueCat()`: logs key prefix (`ANDROID_KEY.substring(0, 10) + '...'`) or `'MISSING'` so Railway/Logcat confirms key is loaded
- [DONE] `mobile/app.json` — `android.versionCode: 16` → `17` (Play Console rejects duplicate versionCode; user then bumped externally to 20)
- [DONE] `server/src/jobs/pushScheduler.ts` — added `console.log('[Scheduler] startPushScheduler called')` as first line of `startPushScheduler()` to confirm Railway is reaching the function
- [DONE] `mobile/store/authStore.ts` — two gaps filled:
  - `checkAuth()`: after restoring session, now calls `loginOneSignalUser(user._id).catch(...)` — re-registers external_id on every app launch (was missing; returning users who never explicitly re-logged-in were invisible to scheduler)
  - `signup()`: after RC identification, now calls `loginOneSignalUser(user._id).catch(...)` — new users now registered immediately (was missing entirely)
- [DONE] `mobile/app/(auth)/signup.tsx` — Google Sign-In button was disabled/stubbed with "Coming Soon": added `loginWithGoogle` to store destructure; replaced `handleGoogleSignIn` Alert stub with real `loginWithGoogle()` call; button: `disabled` removed, `onPress={handleGoogleSignIn}` added, opacity tied to `isLoading`, "Coming Soon" subtitle removed

**OneSignal targeting analysis (report only, no code change)**:
- `pushScheduler.ts` targets via `include_aliases: { external_id: [userId] }` (MongoDB `_id`)
- `onesignal.service.ts` targets via `playerIds: [oneSignalPlayerId]` (device subscription ID stored in DB)
- Two separate systems — scheduler requires `OneSignal.login(userId)` to have been called on device
- Gap: `signup` and `checkAuth` were never calling `loginOneSignalUser` → fixed above

**TypeScript**: zero new errors in mobile after all changes. Same 8 pre-existing errors in `verify-email.tsx`, `astrology/daily.tsx`, `astrology/monthly.tsx` unchanged.

**Project Snapshot update**:
- Auth row: Google Sign-In signup screen now wired (was "Coming Soon" / disabled)
- Push: OneSignal external_id registration now complete across all 4 auth paths (login ✅, Apple ✅, Google ✅, signup ✅, checkAuth ✅)

### Session: build26-prod3-OneSignal-BugFix-APIKeyVersion | 2026-06-23
**Goal**: Fix OneSignal REST API call (wrong URL + wrong auth header format); harden device registration polling; commit google-services.json for EAS build
**Model**: claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] `server/src/jobs/pushScheduler.ts` — OneSignal API call corrected:
  - URL: `https://onesignal.com/api/v1/notifications` → `https://api.onesignal.com/notifications`
  - Authorization header: `Basic <key>` → `Key <key>` (new OneSignal REST API v1 format)
- [DONE] `mobile/app/_layout.tsx` — `registerDeviceForNotifications` replaced single `getOneSignalPlayerId()` call with a polling loop (up to 10 retries × 1s) that waits until both `playerId` AND push `token` (via `getTokenAsync()`) are non-null before calling `notificationService.registerDevice`. Added `import { OneSignal } from 'react-native-onesignal'` to support `getTokenAsync()`.
- [DONE] `mobile/app.json` — added `"googleServicesFile": "./google-services.json"` to the `android` block so EAS bakes it into the native build
- [DONE] `mobile/.gitignore` + root `.gitignore` — removed `google-services.json` ignore rule from both; file committed to `feature/build-26` so EAS build can access it. Both gitignores confirmed it was already listed before removal.
- [DONE] Temporary debug logging added to `runDailyInsightTick` during investigation (tick ISO log, found-N-users log, per-user fields log, TIME MATCH log) — **all 4 removed** at end of session. `server/` build clean after removal.

**MongoDB debugging (no permanent code changes)**:
- Ran Node scripts to inspect + reset `lastDailyPushSentAt` and `preferences.dailyInsightTime` for test users during push notification debugging
- Root cause found: `lastDailyPushSentAt` was persisting even after `$unset` attempts (a prior write was re-setting it); confirmed via `$exists: false` check

**TypeScript**: zero new errors in server or mobile after all changes. Pre-existing errors in `astrology/daily.tsx`, `monthly.tsx`, `verify-email.tsx` unchanged.

### Session: revelia-repo-overview (continued) | 2026-06-24
**Goal**: Finalize merge from main, fix Anthropic 529 retry, add CLAUDE.md, clear pre-existing TS errors
**Model**: claude-opus-4-8 / claude-sonnet-4-6
**Branch**: `feature/build-26`

**Work done**:
- [DONE] **Anthropic 529 retry** — `server/src/services/claude.service.ts`: added `error.status === 529` to `isRetryableError()`; set `maxRetries: 4` on the Anthropic client. Readings now retry on Anthropic overload spikes.
- [DONE] **Merge from main** — complimentary tier grants (`501e1a4`) merged into `feature/build-26`, zero conflicts.
- [DONE] **Created root `CLAUDE.md`** — permanent project conventions, commands, gotchas, auth patterns. Auto-loaded each session; complements (does not replace) `tracking_files/`.
- [DONE] **Cleared all pre-existing mobile TS errors** (type-level only, zero runtime change — verified `npx tsc --noEmit` clean):
  - `verify-email.tsx` — `(verifyResponse as any).verificationToken`. **Key finding**: backend returns `verificationToken` at the TOP LEVEL of the body (auth.controller.ts:608), NOT in `.data`. The original `|| verifyResponse.verificationToken` fallback was the line actually working in production. Casting preserves that exact behavior. (A naive "delete the dead fallback" would have broken every email signup in vc25.)
  - `daily.tsx` — added `(dailyInsight as any)` casts to `focusArea`/`affirmation`/`shareableQuote` in the legacy fallback branch, matching the `as any` already used on sibling fields. Runtime-identical.
  - `monthly.tsx` — wrapped `challenges`/`opportunities` render in an IIFE with `string | string[] | undefined` casts, preserving the legacy array-handling branch. Runtime-identical for both string and array data.

**Production impact analysis (user asked)**: zero impact on DB, server, or live users. DB/server code untouched. Mobile edits are type-level only and runtime-identical. Already-installed apps (vc11 Play Store, vc24 internal) run bundled JS and are unaffected; changes only land in the next build (vc25).

**Tracking files**: `claude_progress.md` + `session_handoff.md` updated; `CLAUDE.md` created and TS-status section updated.

**Next (sequence agreed with user — do NOT build vc25 early)**:
1. Team continues internal testing of vc24.
2. Fix any bugs / bad behavior the team reports.
3. Only once everything works perfectly: commit all changes together, push, then trigger the single vc25 EAS production build.

### Session: fcm-push-debug-session | 2026-06-24
**Goal**: Root-cause why push notifications were never delivered on-device despite scheduler firing and OneSignal sends "succeeding"
**Branch**: `feature/build-26`

**Root cause**: **FCM was never configured.** Revelia had the Google Cloud OAuth Web Client ID (for Google Sign-In) but Firebase/FCM was never set up and there was no `google-services.json`. Google Sign-In works off the client-ID string alone, which masked the missing FCM setup. Without FCM, OneSignal has no transport — sends report success but no device ever receives a push. Symptoms seen: subscriptions "Unsubscribed / Push token: -", then "Invalid Google Project Number" after partial config.

**Fix (config + code)**:
- [DONE] Added Firebase to existing GCP project `revelia-497203`. Generated Firebase **service-account JSON** and uploaded it to OneSignal → Settings → Platforms → Google Android (FCM v1).
- [DONE] Registered Android app (`com.revelia.app`) in Firebase; downloaded `google-services.json` into `mobile/`; wired via `app.json` `android.googleServicesFile`.
- [DONE] **`google-services.json` git tracking** — EAS build failed because the file was gitignored (EAS only uploads git-tracked files). Removed the ignore rule from both `.gitignore`s, force-added, committed. ⚠️ Must stay tracked or push breaks in the next build.
- [DONE] Removed scheduler debug-log flood from `server/src/jobs/pushScheduler.ts` (per-user 140+ lines/min + tick/found/time-match logs). Send logic + error logging untouched. Committed + pushed; Railway quiet.

**Verified on-device (2026-06-24)**: build with `google-services.json` registers a real push token, subscription shows **Subscribed**, "Invalid Google Project Number" gone, and a scheduled daily-insight push was **delivered**. Testers' build also has the file → their push works. Full chain confirmed: scheduler fires → server sends → FCM delivers → device shows notification.

**Permanent knowledge propagated** to `CLAUDE.md` (OneSignal + Build/native gotchas) and `PROJECT_CONTEXT.md` (§7 push, §11 gotchas) so the FCM lesson survives beyond this handoff.

### Session: build26-internal-test1-bugFix-GoogleSignIN_Acc_Selection | 2026-06-24
**Goal**: Fix Google Sign-In account picker not appearing after logout → re-login with a different account
**Model**: claude-opus-4-8
**Branch**: `feature/build-26`

**Bug**: Google login → logout → fully close + relaunch app → Google Sign-In with a *different* account showed NO account picker; SDK silently re-signed-in the previous account. Fresh install fine; email/Apple unaffected; only the login→logout→re-login-different-account path reproduced it.

**Root cause**: `logout()` in `mobile/store/authStore.ts` never signed out of the Google SDK. Google Play Services caches the signed-in account at the OS level (not in app SecureStore), so app close/reopen didn't clear it; next `GoogleSignin.signIn()` returned the cached account silently.

**Verification before editing**:
- `mobile/lib/googleSignIn.ts` exported only `configureGoogleSignIn`, `signInWithGoogle`, `GOOGLE_SIGN_IN_CANCELLED` — no sign-out helper existed.
- `@react-native-google-signin/google-signin` is 13.3.1 (^13); `GoogleSignin.signOut()` exists (declared return `Promise<null>`, harmless under `await`).
- `authStore.ts` already imports `Platform` and has the `await logoutRevenueCat()` / `await storage.clearAll()` teardown anchor in `logout()`.

**Files modified**:
- [DONE] `mobile/lib/googleSignIn.ts` — added exported `signOutGoogle()`: `configureGoogleSignIn()` first (SDK may be unconfigured at logout, e.g. post-restart; unconfigured call can throw), then `await GoogleSignin.signOut()`. `signOut()` only, NOT `revokeAccess()` (picker reappears without forcing re-consent). Matches file style.
- [DONE] `mobile/store/authStore.ts` — extended the existing `googleSignIn` import with `signOutGoogle`; in `logout()` added `if (Platform.OS === 'android') { try { await signOutGoogle(); } catch (error) { console.error('Google sign-out error:', error); } }` before `await storage.clearAll()`. Platform gate + try/catch keep email/Apple logout unaffected and never block logout.

**TypeScript**: `cd mobile && npx tsc --noEmit` clean. No server or shared-types impact.

**NOT yet verified — needs Play-signed build**: invisible on sideloaded APK (needs Play app-signing SHA-1). Verify on vc25 internal testing: Google login (A) → logout → fully close + relaunch → Google Sign-In → confirm picker appears → pick B → land as B not A. Also sanity-check email logout still works.

**Release note**: fix lives on `feature/build-26` only; ships via normal vc25 → internal testing → Play Store flow.

### Session: build26-internal-test1-bugFix-GoogleSignIN_Acc_Selection (continued) — RevenueCat live Profile UI update | 2026-06-24
**Goal**: Fix bug where a successful RevenueCat purchase (and restore) does not update the Profile subscription UI until app relaunch
**Model**: claude-opus-4-8
**Branch**: `feature/build-26`

**Bug**: After Subscribe completed in-session, the Profile badge / Subscription section / "Next billing" stayed stale until the app was relaunched (relaunch ran `checkAuth()` → `getMe()` which refreshed `authStore.user`).

**Root cause**: `mobile/app/(main)/profile.tsx` reads tier ONLY from `authStore` (`user?.subscription?.tier` for badge, Subscription section, and `expiresAt` for "Next billing") — it never reads `useSubscriptionStore`. `subscriptionStore.purchasePackage()`/`restorePurchases()` updated `subscriptionStore.tier` via `mapCustomerInfoToTier()` but never wrote back to `authStore.user`, so Profile stayed stale. `subscriptionStore` already imported `useAuthStore` but didn't use it.

**Verification before editing**:
- `User['subscription']` (mobile/lib/api.ts:21) = `{ tier; revenueCatId?: string; expiresAt?: string }` — only `tier` required, NO `status` field. Spread existing object + override only `tier`/`expiresAt` to satisfy the type.
- `CustomerInfo.latestExpirationDate` exists, type `string | null` — used as the expiry source.
- `setUser` action exists in authStore (authStore.ts:335). `initializeRevenueCat()` runs in ROOT `mobile/app/_layout.tsx` (line 65), not the (main) tab layout.
- `Purchases.addCustomerInfoUpdateListener(cb)` returns `void` (no remover) — wrapper returns void.

**Files modified**:
- [DONE] `mobile/lib/revenuecat.ts` — added exported `addCustomerInfoListener(cb: (ci: CustomerInfo) => void): void` wrapping `Purchases.addCustomerInfoUpdateListener`. No handler logic here (keeps the cross-store handler out of revenuecat.ts to avoid a circular import, since subscriptionStore imports revenuecat).
- [DONE] `mobile/store/subscriptionStore.ts`:
  - `purchasePackage` + `restorePurchases` — after deriving `tier`, kept existing `set({ tier, isActive })` and fire-and-forget `syncSubscription()`; added `applyTierToAuthUser(tier, customerInfo.latestExpirationDate)` to write tier + expiry back to `authStore.user`.
  - Added local `applyTierToAuthUser(tier, latestExpirationDate)` helper — spreads existing `authUser.subscription`, overrides only `tier`/`expiresAt`; `latestExpirationDate ?? existing` so a `null` (lifetime) keeps the prior value and never leaks `null` into the `string | undefined` field.
  - Added exported `initSubscriptionSync()` — module-level guard against double-registration; registers a CustomerInfo update listener whose callback maps `ci → tier` via `mapCustomerInfoToTier` and updates BOTH `useSubscriptionStore.setState({ tier, isActive })` and `authStore.user`. Propagates async/deferred entitlement changes (renewals, deferred purchases) live.
- [DONE] `mobile/app/_layout.tsx` — imported `initSubscriptionSync` from subscriptionStore; called it once, immediately after `initializeRevenueCat()` in the root init `useEffect`.

**Single-sourced**: all tier derivation reuses `mapCustomerInfoToTier`. `profile.tsx` read path unchanged. Paywall offerings (`offerings.current?.availablePackages`) untouched. Google-logout / `google-services.json` items not regressed.

**TypeScript**: `cd mobile && npx tsc --noEmit` clean. No backend, navigation, or shared-types changes.

**NOT yet verified — needs Play-signed build**: RevenueCat billing only works on a Play-signed AAB (same constraint as prior RC work). Verify on vc25 internal testing: Subscribe → Profile shows new tier + "Next billing" with NO restart; Restore updates Profile live; tier badge + `setUserTags(tier)` reflect the new tier in-session.

### Session: build26-internal-test1-bugFix3-Disclaimer-text-clipping-on-Android-screens | 2026-06-25
**Goal**: Fix entertainment disclaimer being clipped / hidden behind the bottom tab bar (worse on larger Android devices)
**Model**: claude-opus-4-8
**Branch**: `feature/build-26`

**Bug**: The trailing entertainment disclaimer on several screens sat under the 85px bottom tab bar — clipped or fully hidden, worse on larger Android devices where the system nav-bar inset also intrudes.

**Audit (all 10 disclaimer screens)**:
- Already correct (using existing `mobile/hooks/useBottomInsetPadding.ts`): `astrology/monthly`, `readings/palm`, `readings/face`, `readings/combined`, `numerology/name-destiny`, `profile`.
- Broken (fixed this session): `astrology/weekly`, `astrology/daily`, `readings/career-destiny`, `compatibility/[id]`.
- **`astrology/daily.tsx` had NO bottom padding at all and was outside the original task scope — caught during the audit and fixed.**

**Approach note**: Original task prompt suggested `useBottomTabBarHeight() + 24` directly. Switched to the established `useBottomInsetPadding()` hook instead — it's the existing codebase pattern (build-22 ScrollView bottom-inset sweep, see master task list) AND adds `insets.bottom` (Android system nav bar), which is exactly the "worse on larger devices" symptom. Hook has a try/catch so it's safe outside a tab navigator.

**Files modified (mobile-only, 4 files)** — each got `import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';`, `const bottomPad = useBottomInsetPadding();`, and `contentContainerStyle={{ paddingBottom: bottomPad }}` on the inner `<ScrollView>`, identical to the existing six:
- [DONE] `mobile/app/(main)/astrology/weekly.tsx` — padding on the MAIN vertical ScrollView, NOT the horizontal day-card ScrollView.
- [DONE] `mobile/app/(main)/astrology/daily.tsx` — was missing padding entirely.
- [DONE] `mobile/app/(main)/readings/career-destiny.tsx` — inline disclaimer text left unchanged.
- [DONE] `mobile/app/(main)/compatibility/[id].tsx`.

**TypeScript**: `cd mobile && npx tsc --noEmit` clean. No backend / navigation / shared-types changes. No build or versionCode bump — rides the normal vc24 → vc25 flow.

**NOT yet verified — visual on-device**: confirm the full disclaimer sits clear of the tab bar on all four screens, small + large Android, during vc24/vc25 testing.

### Session: build26-internal-test1-Improvements1-AppRating-TriggerLogic-and-Frequency | 2026-06-25
**Goal**: Rewrite the in-app-review / rating-trigger system from the old per-screen counter into a single counter-based store with a frequency ladder
**Model**: claude-opus-4-8
**Branch**: `feature/build-26`

**Why**: The old system had two divergent trigger patterns (face/palm used a SecureStore "counted" flag + `completedReadingsCount` + `=== 2`; career/compatibility used a `useRef` fire-once guard with no count), the count never rehydrated at launch (reset every cold start), used strict `=== 2` equality (a desync permanently missed the prompt), and a dormant duplicate (`useAppReview.ts`) existed unused. Replaced all of it with one store + one entry point + a proper ladder.

**Pre-work**: Read-only inventory written last session to `tracking_files/refactors/review-trigger-inventory.md` — used as the baseline; verified each file's current shape before editing.

**Files created**:
- [DONE] `mobile/store/reviewStore.ts` — Zustand store, single source of truth. One SecureStore key `revelia_review_state` holds one JSON blob: `{ count, nextThreshold, oneTime, lastDailyDate, lastMonthlyMonth }`. Exports:
  - `initReviewStore()` — reads the blob once at launch, sets it into memory (defaults + persist if absent/parse-fails); idempotent via module `initialized` guard (mirrors `initSubscriptionSync`). This is the rehydration the old system never had.
  - `recordMeaningfulAction(key)` — the single entry point. Dedup: `daily:`/`monthly:` compare against `lastDailyDate`/`lastMonthlyMonth`; everything else checks `oneTime[key]`. On a new action: mark counted, increment **in-memory** count (authoritative — never re-reads SecureStore, avoids the lost-update race), persist whole blob fire-and-forget, then prompt-check.
  - `nextThresholdAfter(current)` — pure ladder helper: `6→16→31→51→71→91…` (+10, +15, then +20 forever). Testable by inspection.
  - Prompt check advances `nextThreshold` **only** when `attemptReview()` reports a real attempt; otherwise leaves it unchanged so the next eligible action retries.
  - Build 27 seam: clearly-commented no-op example for `astrologer:<YYYY-MM-DD>` — nothing wired live, no imports added.

**Files modified**:
- [DONE] `mobile/lib/inAppReview.ts` — `requestReviewIfEligible` → `attemptReview(): Promise<boolean>`; returns `true` only if `StoreReview.requestReview()` actually fired (Android + `isAvailableAsync()` + not `hasPromptedThisSession`), else `false`. Android gate + once-per-session guard unchanged.
- [DONE] `mobile/app/_layout.tsx` — call `initReviewStore()` once in the root init `useEffect`, own try/catch, beside `initSubscriptionSync()`.
- [DONE] `mobile/components/ShareCard.tsx` — added optional `onShared?: () => void` prop, invoked after the share resolves without throwing. Lets caller record `share:<type>` without the share util needing the type (keeps `shareReading.ts` pure). Only name-destiny opts in; face/career ShareCards don't pass it (no `share:face`/`share:career` per plan).
- [DONE] `mobile/store/readingsStore.ts` — removed `completedReadingsCount`, `incrementCompletedReadings`, `COMPLETED_READINGS_KEY`, and the now-unused `SecureStore` import; `(set, get)` → `(set)`.
- [DONE] `face.tsx` / `palm.tsx` — old SecureStore-flag + `incrementCompletedReadings` + `=== 2` effect replaced with `recordMeaningfulAction('reading:face')` / `('reading:palm')` (palm keyed on `palmReadingDominant`, dominant-only as before). Dropped dead imports.
- [DONE] `readings/career-destiny.tsx` — `useRef` guard removed → `recordMeaningfulAction('reading:career')` when `career` first truthy (cached/revisit path now safe because dedup makes it a no-op).
- [DONE] `compatibility/[id].tsx` — `useRef` guard removed → `recordMeaningfulAction('compat:' + id)` when `reading` first truthy; also `recordMeaningfulAction('share:compatibility')` at the inline share success point (right after the success haptic).
- [DONE] `astrology/daily.tsx` — net-new `recordMeaningfulAction('daily:' + localYMD)` when `dailyInsight` truthy & not loading (count-on-render, no timer); `share:daily` wired into both share paths (caller-side, success-only, try/catch).
- [DONE] `astrology/monthly.tsx` — net-new `recordMeaningfulAction('monthly:' + localYM)` when `monthlyReading` truthy & not loading & no `renderError`. No share hook (its `onShare` is a no-op — left as-is).
- [DONE] `numerology/name-destiny.tsx` — `recordMeaningfulAction('reading:nameDestiny')` when `analysis` first present; `share:nameDestiny` via `ShareCard onShared`.
- [DONE] `astrology/index.tsx` — `recordMeaningfulAction('reading:astrology')` when `birthChart` (from `useProfileStore`) first truthy. (Inferred completion signal — no dedicated natal-chart screen exists; the hub auto-generates the chart on mount when birth data exists.)

**Files deleted** (confirmed zero live importers via grep first):
- [DONE] `mobile/lib/reviewKeys.ts` (retired `REVIEW_COUNTED_KEYS`).
- [DONE] `mobile/hooks/useAppReview.ts` (dormant duplicate review hook, imported by nothing).

**Inferred-where-not-specified** (flagged in the plan for verification):
- `reading:astrology` → `astrology/index.tsx`, signal = `birthChart` truthy.
- `name-destiny` share → uses shared `<ShareCard>` (not the util directly); recorded caller-side via the new `onShared` callback rather than threading a type param through the util.

**Abandoned SecureStore keys** (no migration — fresh start intended; SecureStore clears on uninstall): `revelia_completed_readings_count`, `revelia_face_reading_counted`, `revelia_palm_reading_counted`, `last_review_request`, `review_declined_count`. Nothing new is written to them.

**Verified**: `cd mobile && npx tsc --noEmit` clean (exit 0). Grep confirms zero remaining refs to `reviewKeys`/`REVIEW_COUNTED_KEYS`/`requestReviewIfEligible`/`useAppReview`/`completedReadingsCount`/`incrementCompletedReadings` and all retired keys; `recordMeaningfulAction` present at exactly the 12 intended call sites with correct dedup keys; `initReviewStore()` imported + called once in root `_layout.tsx`.

**NOT yet verified — needs on-device (Android, Play-context) testing**: the native review sheet only appears on a real Android device with Play Store, and Google Play throttles actual display. Confirm on vc25 internal testing: count rehydrates across cold starts (doesn't reset); a meaningful action at/after threshold 6 surfaces the prompt at most once per session; ladder advances (`6→16→…`) only after a real prompt; daily/monthly dedup per calendar period; reading/share/compat actions dedup once. No build / versionCode bump — rides the normal vc24 → vc25 flow.

**CLAUDE.md**: added an "App rating / in-app review" gotcha subsection (counter in `reviewStore.ts`, rehydrate via `initReviewStore()`, record via `recordMeaningfulAction(key)`, don't reintroduce per-screen review logic).

**Left unstaged** per the team's manual-commit preference.

### Session: build26-internal-test1-BugFix5-Daily-notification-redirect-to-DailyInsights-screen (2026-06-25)

**Goal**: Tapping the daily cosmic-insight push must open `mobile/app/(main)/astrology/daily.tsx`, not Home.

**Root cause — server, missing routing hint.** The client click handler + `handleDeepLink` were ALREADY correct (`'daily-insight'` → `router.push('/(main)/astrology/daily')`). The scheduler's `sendOneSignalPush` sent no custom `data`, so the client got no `screen` hint and fell through to the `'home'` default. The fix is primarily server-side; the client change is only a cold-start hardening.

- [DONE] `server/src/jobs/pushScheduler.ts` — `sendOneSignalPush` gained optional last param `data?: Record<string, string>`, spread into the OneSignal REST body as `...(data ? { data } : {})` next to `headings`/`contents`/`name`. `runDailyInsightTick` now passes `{ screen: 'daily-insight' }`. Re-engagement push unchanged (no data → defaults to `home`). REST URL / `Key <token>` auth / `include_aliases` / `target_channel` untouched.
- [DONE] `mobile/app/_layout.tsx` — cold-start (killed-app) guard. Added `pendingDeepLinkRef = useRef<string|null>(null)`. The once-registered click handler now reads fresh auth via `useAuthStore.getState()` (closed-over hook vars are stale): warm (`authed && !loading`) → navigate immediately; cold → stash `screen` in the ref. New deferred `useEffect` (keys `[isAuthenticated, isLoading, profile, segments]`) replays the pending link, **gated on `segments[0] === '(main)'`** so it fires only after `index.tsx`'s declarative `<Redirect href={target}>` entry redirect has landed on home — then `router.push`es the target on top (Back → home). Gate is on segments, deliberately NOT a `setTimeout`.

**Why the segments gate (not a timer)**: `index.tsx` redirects declaratively to `/(main)/home` only once auth + `hasHydrated` + `lastFetchOk` + complete `profile` resolve — the same instant a deferred push would fire, so a bare push races and loses. Waiting for `segments[0] === '(main)'` proves the entry redirect already settled; pushing then is deterministic and keeps home beneath in the stack.

**Verified**: `cd server && npx tsc --noEmit` clean; `cd mobile && npx tsc --noEmit` clean. No build / versionCode bump — rides the normal vc24 → vc25 flow.

**⚠️ UNVERIFIED — and this is the caveat a future session is most likely to skip**: tsc passing proves NOTHING about runtime here. The cold-start race + actual OneSignal/FCM push delivery only behave on a real device receiving a real push on a **Play-signed build, launched from a KILLED app**. Must be tested on vc25 internal track: set a daily-insight time → fully kill the app → wait for push → tap → confirm Daily Insights opens (not Home), Back → Home. Also check warm-start (backgrounded, not killed) and that the re-engagement push still opens Home.

**Left unstaged** per the team's manual-commit preference.

### Session: build26-internal-test2-BugFix1-Android-Share-Dialog-Cascade | 2026-06-26
**Goal**: Fix the Android share-cancel cascade — dismissing the combined image+text share sheet wrongly opened a second ("share image") then a third ("sharing text") sheet instead of returning to the reading screen.
**Model**: claude-opus-4-8
**Branch**: `feature/build-26`

**⚠️ SUPERSEDES the old BUG-002 fix.** BUG-002 ("Android share image dropped") was fixed across build26-bugfixes → build26-preview3 → preview3-continued by moving to `react-native-share` (`RNShare.open`) for a combined image+text intent, with a `RNShare → Sharing.shareAsync → Share.share` fallback chain. That chain was the regression: `RNShare.open()` defaults to `failOnCancel:true`, so a user **dismissal rejects** the promise (`dismissedAction:true` / "User did not share"), the catch blocks treated that as a failure, and ran the next fallback — producing the extra sheets. The BUG-002 image fix itself is still correct (combined intent intact); only its cancel-handling was wrong. A future session must NOT read the BUG-002 entry as the current share behavior — this session is.

**Root cause**: `failOnCancel` defaulting to true + catch blocks that didn't distinguish dismissal from genuine failure. Plus a second, independent bug in `daily.tsx` (below).

**Fix (mobile-only, 5 files)**:
- [DONE] `mobile/utils/shareReading.ts` — (1) New exported `isShareDismissal(error)` helper (single source of truth; checks `dismissedAction === true` or `/did not share|cancel|dismiss/i` on the message). (2) `RNShare.open` now passes `failOnCancel: false` (cancel resolves, no cascade) and inspects `(result as any)?.dismissedAction !== true`. (3) Each fallback in its own try/catch — dismissal at any level `return`s silently; a genuine RNShare failure does **exactly one** fallback (`Sharing.shareAsync`), never reaching `Share.share`. (4) Signature changed `Promise<void>` → **`Promise<boolean>`** (true = real share) so callers gate recording.
- [DONE] `mobile/components/readings/ShareableQuote.tsx` + `mobile/components/ShareCard.tsx` — `const shared = await shareReadingCard(viewRef); if (shared) onShare()/onShared?.()` — the `share:<type>` recorder fires only on a genuine share, not on dismissal.
- [DONE] `mobile/app/(main)/compatibility/[id].tsx` — imports `isShareDismissal`; inline share rewritten to track a `shared` boolean (gates the success haptic + `recordMeaningfulAction('share:compatibility')`), `failOnCancel:false`, dismissal-returns in both the inner RNShare catch and the outer catch. Same "one fallback, never Share.share on dismissal" guarantee.
- [DONE] `mobile/app/(main)/astrology/daily.tsx` — **second bug fixed**: its `onShare` was calling `shareReadingCard(shareRef)` a SECOND time, but `ShareableQuote` already performs the share via its own internal ref before invoking `onShare` — a redundant second sheet even on a successful share. Changed both `onShare` handlers to only `recordMeaningfulAction('share:daily')` (the pattern monthly/name-destiny already use). Removed the now-unused `shareReadingCard` import.

**Left unchanged (reported to user)**: `mobile/app/(main)/profile.tsx` `handleShareApp` — a standalone single `Share.share` for the "Share Revelia" app link. No fallback chain, no cascade; a dismissal just logs. Not the bug.

**No remaining cascade path**: RNShare dismissed → resolves `dismissedAction:true` → `shared=false` → return (no 2nd sheet). RNShare genuine error → not-dismissal → one `Sharing.shareAsync`; if THAT is dismissed → caught → return (no 3rd sheet). `!uri` → single `Share.share`; dismissal caught → return.

**Verified**: `cd mobile && npx tsc --noEmit` clean (exit 0). No server / navigation / shared-types impact.

**Build target**: vc25 was already built (production AAB) before this fix, so this fix is not included in vc25. It lands in the next production build, **vc26** (autoIncrement bumps versionCode 25 → 26), bundled with the rest of the internal-test2 fixes and improvements. No manual versionCode bump is needed.

**NOT yet verified — needs a real Android device** (RNShare cancel behavior does not manifest in Expo Go / emulator). On the **vc26** build: share a reading → tap X / back → land back on the reading screen with NO further dialog; then re-share and confirm a real share still completes and records `share:<type>`.

**CLAUDE.md**: added a one-line gotcha — `shareReadingCard` returns a boolean callers must gate `recordMeaningfulAction('share:...')` on; don't "simplify" to unconditional recording, and don't remove `failOnCancel: false`.

**Left unstaged** per the team's manual-commit preference.

### Session: build26-internal-test2-BugFix2-CombinedProfile-Back-Icon-Inconsistency | 2026-06-26
**Goal**: Make the back button on the Cosmic Blueprint (Combined Profile) screen match the canonical pattern used on Name Destiny — it was rendering a literal text arrow (`<-`) instead of a proper icon.
**Model**: claude-opus-4-8
**Branch**: `feature/build-26`

**Read-first finding (don't assume)**: The task prompt guessed the canonical back button was "a circular bordered button." It is NOT. The actual canonical pattern in `mobile/app/(main)/numerology/name-destiny.tsx` is plain:
```jsx
<TouchableOpacity onPress={() => router.back()} className="mr-4">
  <Ionicons name="arrow-back" size={24} color="white" />
</TouchableOpacity>
```
No border, no circle — just the `Ionicons` `arrow-back` glyph, size 24, white.

**Fix (mobile-only, 1 file — `mobile/app/(main)/readings/combined.tsx`)**:
- [DONE] Added `import { Ionicons } from '@expo/vector-icons';`.
- [DONE] Replaced the literal `<Text style={{ color: 'white', fontSize: 24 }}>{'<-'}</Text>` arrow with `<Ionicons name="arrow-back" size={24} color="white" />` in **both** back buttons on this screen: the main header (~line 211) and the empty-state header (~line 128) — both had the same `<-` text arrow.
- Kept combined.tsx's existing inline-style wrapper `<TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>` (its house style — the file is inline-styled, not NativeWind). `marginRight: 16` is the exact pixel equivalent of name-destiny's `className="mr-4"`, so the two screens are now visually identical without forcing NativeWind into an inline-styled file.

**Navigation unchanged**: both `onPress={() => router.back()}` handlers are untouched — only the visual control changed.

**No new dependency**: `@expo/vector-icons` is bundled with Expo (transitive, not a direct package.json dep) and already imported by `name-destiny.tsx` and many other screens. Nothing added.

**Verified**: `cd mobile && npx tsc --noEmit` clean (exit 0); import path resolves. No server / navigation / shared-types impact.

**Build target**: rides **vc26** with the rest of the internal-test2 batch. No versionCode bump.

**Left unstaged** per the team's manual-commit preference.

<!-- future sessions append below this line -->
