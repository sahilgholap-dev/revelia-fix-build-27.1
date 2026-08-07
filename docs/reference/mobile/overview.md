# Mobile app (`mobile/`)

React Native 0.79.6 + Expo SDK 53, React 19, Hermes, **new architecture enabled** (required by OneSignal v5 — never revert). Expo Router 5 (typed routes), NativeWind 4, Zustand 5, TypeScript 5.8. Identity: `com.revelia.app`, version **2.0.0** (bumped from 1.2.0 for the build-27 release, 2026-07-25 — `app.json` versionName + both `package.json` files; Android versionCode/iOS buildNumber stay on EAS `autoIncrement`, never hand-edited).

## Screens (`app/`, Expo Router groups)

- `_layout.tsx` — root: OneSignal init, RevenueCat init, auth rehydration (`checkAuth`), `initReviewStore()`, `initSubscriptionSync()`, deep links.
- `(auth)/` — welcome, login, signup, verify-email, verify-code, forgot/reset-password.
- `(capture)/` — birth-data, face-capture, palm-capture. Capture UI is unchanged by Build 27 — R2/R3 feature extraction is entirely server-side.
- `(main)/` — home (Explore section has "Personalized Cosmic Report" and "Ask the Stars" cards, both gold `NewBadge`, gating handled inside each screen not by a tier pill), profile; `readings/` (hub, face, palm, combined = Cosmic Blueprint, career-destiny, **`qa.tsx`** = R7 Q&A chat, **`cosmic-report.tsx`** = R9 report hub, `cosmic-report-history.tsx`); `astrology/` (index, daily — now renders `ContinuityCard`, weekly, monthly); `numerology/` (index, name-destiny); `compatibility/` (index, `[id]`, history).
- `(paywall)/index.tsx` — subscription paywall (reads `offerings.current?.availablePackages`).

## State (`store/`)

`authStore` (all 3 login paths + checkAuth — every path calls `loginOneSignalUser` + `identifyUser`), `subscriptionStore` (RevenueCat offerings/purchase/restore), `readingsStore`, `insightsStore`, `compatibilityStore`, `profileStore`, `engagementStore`, `notificationStore`, `reviewStore` (single source of truth for the in-app-review counter + prompt ladder — see CLAUDE.md), `userStore`.

## Lib & utils (`lib/`, `utils/`)

- `api.ts` — axios client (~180s timeout for long vision readings).
- `onesignal.ts` (`loginOneSignalUser`/`logoutOneSignalUser`), `revenuecat.ts` (`identifyUser`/`logoutRevenueCat`), `googleSignIn.ts`, `inAppReview.ts` (`attemptReview()` primitive).
- `astrology/chartGenerator.ts` — R1: maps the **server** `NatalChart` → client chart shape for `components/astrology/BirthChartWheel.tsx` (replaced the retired client-side Keplerian engine); `astrology/interpretations.ts` static text tables.
- `constants.ts` (holds `SubscriptionTier`), `storage.ts` (SecureStore wrapper), `profileService.ts`, `colors.ts`, `zodiacEmojis.ts`, `shareUtils.ts`.
- `utils/shareReading.ts` — `shareReadingCard` captures a card to image and shares; **returns boolean** (true = real share) with `failOnCancel:false` + `isShareDismissal` — see CLAUDE.md before touching. The Cosmic Report's own share flow (`cosmic-report.tsx`) reuses this same dismissal-safe pattern but downloads the actual PDF via `expo-file-system` first, then shares the local file via `react-native-share` (with an `expo-sharing` fallback) — fixed from an earlier version that shared only marketing text.
- `qa.ts` (R7) — Q&A API wrapper: `askQuestion()`, `getQaCredit()`; types (`QaMode`, `QaCapPayload`, `QaCredit`, ...) are **dual-homed here, deliberately not in `packages/shared`**. `qaLocation.ts` — location-consent helpers for Q&A. `deviceId.ts` — `getDeviceId()`, used only for the Deep-Insight anti-farming header.
- `reports.ts` (R9) — Cosmic Report API wrapper: `getReportSample()`, `getReportCredit()`, `getReportHistory()`, `getReport(id)`, `createReport()`, `rebuildReport(id)`.

## Components

~48+ components grouped by domain (account, astrology, capture, common, compatibility, engagement, insights, profile, readings, subscription, ui). Notables: `ShareCard`, `BirthChartWheel`, `PalmLineCard` (heart/head/life/fate — LLM-flavor lines, not measured), `GeneratingReading` (rotating loading copy), **`insights/ContinuityCard.tsx`** (R6 Option C — "what's shifted" daily card; self-hides when empty, optional non-Premium-Plus unlock CTA).

## Env (`.env.example`)

`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_ONESIGNAL_APP_ID`. `apiUrl` (in `app.json extra`, not `.env`) points at the production Railway backend as of 2026-07-25, after being toggled through staging and a briefly-tried `api.revelia.me` custom domain during the release cut — settled back on the Railway URL.

`expo-file-system` (~18.1.11) added 2026-07-25 for the Cosmic Report PDF share fix, alongside the existing `expo-sharing` and `react-native-share`.
