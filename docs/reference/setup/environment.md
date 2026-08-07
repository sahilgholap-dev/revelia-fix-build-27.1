# Environment variables

Names only — never values. The authoritative "commonly confused names" table lives in `CLAUDE.md`; this page is the full inventory from the `.env.example` files.

## Server (`server/.env`, production on Railway)

| Group | Variables |
|---|---|
| Core | `NODE_ENV`, `PORT`, `JWT_SECRET`, `CORS_ORIGIN` |
| Database | `MONGODB_URI` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` |
| RevenueCat | `REVENUECAT_API_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_RTDN_SECRET` (+ legacy `REVENUECAT_WEBHOOK_SECRET`) |
| OneSignal | `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` (⚠️ not `ONESIGNAL_API_KEY`) |
| OAuth | `APPLE_CLIENT_ID`, `GOOGLE_OAUTH_WEB_CLIENT_ID` (⚠️ not `GOOGLE_CLIENT_ID`) |
| Internal/admin | `INTERNAL_API_KEY`, `ADMIN_API_KEY` |
| Errors | `SENTRY_DSN` (optional) |
| SendGrid | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` — used in code but **missing from `.env.example`** (TODO: add them there) |
| R5 synthesis | `SYNTHESIS_FABLE_ENABLED` — default OFF; `true` routes marquee surfaces to `claude-fable-5` (Opus 4.8 fallbacks). Also missing from `.env.example` (TODO: add). Availability layer — see `../features/synthesis-engine.md` |
| R7 Timing Engine bucket | `R2_TIMING_ENDPOINT`, `R2_TIMING_ACCOUNT_ID`, `R2_TIMING_ACCESS_KEY_ID`, `R2_TIMING_SECRET_ACCESS_KEY`, `R2_TIMING_BUCKET_NAME`, `R2_TIMING_RULESET_KEY` — **documented in `.env.example`**. Loads the confidential rule set at runtime, fail-closed if absent |
| R7 Q&A | `QA_DEVICE_SALT` (per-device Deep-Insight anti-farming hash), `CRISIS_WORDING_FINALIZED`, `TIMING_CONFIG_DIR` — used in code but **missing from `.env.example`** (TODO: add) |
| R9 Cosmic Report | `REPORT_WORKER_ENABLED` — default OFF, gates the async report-generation cron; `R2_REPORTS_ENDPOINT`/`R2_REPORTS_ACCOUNT_ID`/`R2_REPORTS_ACCESS_KEY_ID`/`R2_REPORTS_SECRET_ACCESS_KEY`/`R2_REPORTS_BUCKET_NAME` (separate least-privilege R2 client for the private report bucket) — **all missing from `.env.example`** (TODO: add; only mentioned in prose inside the R2_TIMING doc block today) |

## Mobile (`mobile/.env`, EAS secrets for cloud builds)

`EXPO_PUBLIC_API_URL` · `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` · `EXPO_PUBLIC_REVENUECAT_IOS_KEY` · `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` · `EXPO_PUBLIC_ONESIGNAL_APP_ID`

## Not env vars (but easy to assume so)

- **FCM** uses no env var — it needs the git-committed `google-services.json` (build time) + the Firebase service-account JSON uploaded in the OneSignal dashboard.
- Google Sign-In needs the **Play app-signing SHA-1** registered in Google Cloud Console.
