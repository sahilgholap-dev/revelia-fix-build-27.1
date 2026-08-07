# Infrastructure

> Supersedes the operational parts of root `INFRASTRUCTURE.md` (self-dated 2025-01-30, kept as historical baseline — it still lists Render as an option and omits Firebase/FCM entirely). This page reflects what production actually runs on as of Build 26/27.

## Hosting & services

| Concern | Service | Notes |
|---|---|---|
| Backend | **Railway** | `https://revelia-backend-production.up.railway.app/api`. Auto-deploys on push to `main`. Requires `app.set('trust proxy', 1)`. Do **not** switch the image to Alpine/musl — the `sweph` prebuild needs glibc. |
| Database | **MongoDB Atlas** | via Mongoose 8 |
| Image storage | **Cloudflare R2** | S3-compatible via `@aws-sdk/client-s3`; bucket `revelia-images` |
| AI | **Anthropic API** | SDK `^0.110.0`. Models: `claude-fable-5` / `claude-opus-4-8` (marquee synthesis), `claude-sonnet-4-6` (cheap surfaces, vision validation), Haiku (geocoder ladder). Org has 30-day retention (Fable 5 requirement — verified by probe 2026-07-09). |
| Subscriptions | **RevenueCat** | + Google Cloud Pub/Sub → RTDN webhook at `/api/webhooks/revenuecat-rtdn` (logs + 200; HMAC verification not yet added) |
| Push | **OneSignal** (orchestration) + **Firebase FCM** (delivery) | Firebase in GCP project `revelia-497203`. Needs BOTH the service-account JSON uploaded to OneSignal (FCM v1) AND the git-committed `google-services.json` baked into the build. See CLAUDE.md gotchas. |
| Email | **SendGrid** | OTP verification etc. via `email.service.ts` |
| Mobile builds | **EAS Build** | Expo owner `spronline`, projectId `6e0a3685-c2a4-4276-94d3-7ad9f46637cf`. `preview` = APK (internal), `production` = AAB (Play Store, `autoIncrement: true`). |
| Errors | Sentry | `SENTRY_DSN` optional in `.env.example`. TODO: verify actually wired/active in production. |

Legacy `INFRASTRUCTURE.md` also mentions Mixpanel analytics — not corroborated anywhere in current code/tracking docs. TODO: verify (likely aspirational/unused).

## Distribution state

- Android: **versionCode 26 live on Play Store production** (app `com.revelia.app`, version 1.2.0). Build 27 will ship as versionName **2.0.0**, versionCode 27+.
- iOS: **deferred** — last submission rejected under App Store 4.3(b); Android-first strategy. iOS App Store ID placeholder `id000000000` still in `profile.tsx`.
- Website: separate repo (`srcoderz99/revelia-website`), not managed from this monorepo.

## Release flow

tsc clean (mobile + server) → commit/push → EAS production build → Play **Internal Testing** track → fix cycle if needed → **promote the same AAB** to Production (never rebuild between tracks) → merge feature branch to `main`. Backend deploys independently: merge to `main` → Railway auto-deploy → verify `/api/health`.

## Environment variables

See `../setup/environment.md` for the full name table. Golden rule: several names are commonly gotten wrong (`ONESIGNAL_REST_API_KEY` not `ONESIGNAL_API_KEY`; `GOOGLE_OAUTH_WEB_CLIENT_ID` server-side vs `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` mobile) — the authoritative table lives in `CLAUDE.md`.
