# Build 26 — Baseline (SHIPPED)

**versionCode 26, version 1.2.0 — live on Play Store production.** Branch `feature/build-26` (⚠️ not yet merged to `main` — standing housekeeping TODO). Frozen session archive: `tracking_files/build-26/` (progress log, BUG-001…005, refactor notes).

Build 26 was an **integration + polish release**: it un-stubbed the monetization/engagement stack and hardened sharing/reviews after two internal-testing rounds.

## Shipped

**Integrations**
- Google Sign-In for Android (Play app-signing SHA-1, `DEVELOPER_ERROR` resolved; display-name threading — BUG-004).
- OneSignal push end-to-end: mobile SDK un-stubbed, `external_id` login on all 5 auth paths, backend cron scheduler, **FCM root-cause fix** (service-account JSON + committed `google-services.json`) — push confirmed on-device.
- RevenueCat un-stubbed: offerings/purchase/restore/identify, paywall `offerings.current` fix, live Profile-UI tier update on purchase/restore.
- RTDN webhook endpoint + Google Cloud Pub/Sub wiring.
- Complimentary tier grants (`getEffectiveTier` + `grant:comp` script).

**Engagement/UX**
- In-app review prompts — counter-based rewrite: `reviewStore` single source of truth, `recordMeaningfulAction(key)` entry point, prompt ladder 6→16→31→51→71→91.
- Shareable visual cards (ShareCard on Face / Cosmic Blueprint / Career / Name Destiny) + Play Store link in shares (single-intent `react-native-share`).
- Android share-cancel cascade fix (`shareReadingCard` boolean gate + `failOnCancel:false` + `isShareDismissal`) — BUG-002 superseded.
- ScrollView bottom-inset sweep; Cosmic Blueprint back-icon fix; Google-logout account-picker fix; daily-insight push deep-link; Rate Revelia URLs (iOS App Store ID still placeholder).

**Backend hardening**
- Express `trust proxy` for Railway (BUG-001, critical: rate-limiter IP collapse); Anthropic 529 retry handling.

## Bugs fixed during internal testing

BUG-001 rate-limiter IP collapse (critical) · BUG-002 Android share dropped image (high) · BUG-003 review-count inflation (high) · BUG-004 Google Sign-In missing name (high) · BUG-005 review trigger unguarded (medium).

## Known carry-overs into Build 27

"Export My Data" GDPR stub (→ R8) · iOS App Store ID placeholder · `feature/build-26` → `main` merge pending.
