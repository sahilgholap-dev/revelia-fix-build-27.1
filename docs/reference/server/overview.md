# Server (`server/`)

Node 20 + Express 4 + TypeScript. Layering: `routes → controllers → services → models`. Deployed on Railway (auto-deploy from `main`). Entry: `src/index.ts` / `src/app.ts` (helmet, compression, mongo-sanitize, hpp, `trust proxy`).

## Route groups (`src/routes/index.ts`, all under `/api`)

`/health`, `/auth`, `/profile`, `/upload`, `/readings`, `/insights` (daily/weekly/monthly), `/compatibility`, `/notifications`, `/engagement` (streaks/check-ins), `/internal` (cron triggers, `INTERNAL_API_KEY`), `/test`, `/subscription`, `/webhooks` (RevenueCat webhook + RTDN), `/account` (export/delete), `/astrology` (birth chart), `/admin` (`ADMIN_API_KEY` header), `/diagnostic` (rate-limited, no auth), **`/qa`** (R7 — `GET /credit`, `POST /ask`, auth required, prod-dark), **`/reports`** (R9 — `GET /credit`, `GET /sample`, `POST /`, history/detail, auth required, prod-dark).

## Services (`src/services/`)

| Service | Responsibility |
|---|---|
| `claude.service.ts` | Core Anthropic orchestration: prompt building, `withRetry()` (429/5xx/529), `safeJsonParse`, truncation checks, vision calls (fetch image from R2 → base64) |
| `synthesis-routing.ts` | **Single-source model router (R5).** `SYNTHESIS_MODELS` per-surface map; `createSynthesisMessage({surface,prompt,maxTokens,image?})`. Fable tier: `claude-fable-5` streamed beta + `fallbacks:[claude-opus-4-8]` + `output_config.effort`; flag OFF → guaranteed Opus 4.8 streamed; cheap tier: `claude-sonnet-4-6` non-beta. Checks `stop_reason==='refusal'` before content; stamps `{promptVersion, model, fellBack}`; logs every call **it makes** via `logAiGeneration` — as does the sibling export `createQaAnswerMessage`. ⚠️ **Face/palm reach neither helper and log themselves directly** (surfaces `face` / `palm`, P99, 2026-08-06) |
| `astrology.service.ts` | R1 Swiss Ephemeris (`sweph`, Moshier): natal chart at birth-data save + lazy fallback; transits cached by UTC-noon date |
| `faceFeatures.service.ts` | R2: 68-landmark detection (`@vladmandic/face-api`, tfjs WASM) → `FaceFeatureVector`; feeds `data/physiognomy-rules.ts` |
| `palmFeatures.service.ts` | R3: MediaPipe-Hands 21-landmark (`hand-pose-detection`, tfjs WASM, vendored 7.6MB weights) → `HandFeatureVector` per hand; feeds `data/chiromancy-rules.ts` |
| `numerology.service.ts` | R4: consolidation logic — `planNumerologyUpdate`/`ensureProfileNumerology`, provenance-ordered name-source, lazy backfill |
| `insight.service.ts` / `insightCache.service.ts` | Daily/weekly/monthly orchestration (`buildUserInsightProfile` lazy-computes natalChart + numerology); tier-upgrade cache invalidation |
| `continuity.service.ts` | R6: `computeContinuityDelta` — pure diff of two `computeTransits` results (orb-free aspect identity) + guarded moon-sign + personal-month/-year rollovers, with a code-level meaningfulness gate; `resolveDailyContinuity` seeds/advances/persists the baseline (fail-open) |
| `reading.service.ts` / `compatibility.service.ts` | Face/palm/combined reading + compatibility generation orchestrators |
| `upload.service.ts` | Image upload → sharp → R2 → validation → feature extraction pipeline |
| `imageValidation.service.ts` | Claude vision valid/invalid/uncertain gate on uploads |
| `geocoder.service.ts` | Birthplace → lat/lng/tz: Haiku → Haiku-retry → Sonnet ladder, cached in `GeocodeCache` |
| `auth.service.ts` | JWT issue/verify; Apple (jwks) + Google token verification |
| `aiFailure.service.ts` / `aiGeneration.service.ts` | Fire-and-forget metadata loggers (failures / R5 A/B generation log); swallow-on-error, never content |
| `email.service.ts` | SendGrid wrapper (OTP etc.) |
| `onesignal.service.ts` + `notification-templates` | Push composition + OneSignal REST send (`Authorization: Key`) |
| `revenuecat.service.ts` / `webhook.service.ts` | RC subscriber API; webhook event → tier mapping |
| `r2.service.ts` / `profile.service.ts` / `user.service.ts` | R2 client; profile CRUD + zodiac/numerology derivation; name update with history cap |
| `astrology-sidereal.service.ts` | R9: isolated sidereal engine (Lahiri, whole-sign, mean node) composed on R1's tropical engine — dasha ladder, panchanga, dignities/yogas, transit ingress, sade sati, returns, D9. Owns the `set_sid_mode` set-then-reset lifecycle; reused (never modified or re-triggered) by R7 |
| `qa.service.ts` / `qa-router.service.ts` / `qa-caps.service.ts` | R7: `qa.service` orchestrates junk-check → router → safety-or-context-assembly → tiered answer → persist; `qa-router.service` is the standalone Haiku-4.5 5-label safety/topic classifier; `qa-caps.service` enforces monthly question + Deep-Insight sub-caps (doc-counted off `QaTurn`, UTC calendar month) |
| `timing-engine.service.ts` | R7: the proprietary Timing Engine — sidereal moment chart + dasha vs. a confidential rule set (loaded at runtime from a private R2 bucket, fail-closed if absent) → an internal verdict the answer model only phrases |
| `report.service.ts` / `report-inject.service.ts` / `report-render.service.ts` / `report-delivery.service.ts` | R9 Cosmic Report pipeline (Mode B): `report-inject` builds astronomy/numerology/palm payloads (face structurally excluded) → `report.service` calls Fable 5 for interpretation only → `report-render` builds charts (`report-charts.py`) + a docx → LibreOffice PDF, gated by a QA script (`report-qa.py`) → `report-delivery` uploads via a separate least-privilege R2 client and mints per-request presigned links |

## Prompts (`src/prompts/`)

One builder per surface: `daily-insight`, `weekly-forecast`, `monthly-reading`, `compatibility`, `face-reading`, `palm-reading` (+ shared honesty-preamble, examples files). All six synthesis surfaces are version-tagged (R5) and consume the structured feature sets via `buildFeatureContext` — sections are emitted only when the underlying data is present (fail-open for pre-backfill users).

## Jobs, middleware, scripts

- `jobs/pushScheduler.ts` — node-cron daily-insight + re-engagement pushes, timezone-aware, targets OneSignal `external_id`. Env-gated by `PUSH_SCHEDULER_ENABLED` (used to disable it on the staging environment).
- `jobs/reportWorker.ts` (R9) — cron-based (not event-triggered): per-minute claim/generate jobs + a 5-minute stale-timeout sweep. Gated by `REPORT_WORKER_ENABLED` (default OFF, same pattern as `SYNTHESIS_FABLE_ENABLED`). State machine `queued → generating → ready | failed`, retries up to 3 attempts, refunds the credit on terminal failure.
- Three committed test harnesses (R7): `test:timing` (22/22 Timing Engine fixture assertions, auto-skips if the gitignored rule-set config is absent), `test:qa-router` (Haiku classifier fixtures + adversarial cases), `test:qa-prompt` (safety-invariant regression: FACE-gate leak + methodology-leak guards) — all offline, no API key or DB needed.
- Middleware: JWT auth, tier gating, multer upload filter, error handler (AppError + Zod), and rate limits (auth, verification, name-update 30-day tier window, reading 10/hr). Uses `ipKeyGenerator(req.ip ?? '')`.
- `src/scripts/` — operational scripts run via npm: backfills `backfill:natal-chart | face-features | palm-features | numerology | geocode | daily-insight-tz` (each with `:dry`), `migrate:date-format`, `grant:comp`, `test:email`. (Root-level `scripts/` contains only a stale README referencing a non-existent seed script.)

## Known stubs

`POST /account/export` ("Export My Data") counts records and claims an email will arrive but sends nothing — GDPR stub tracked as R8 in `plans/build-27.md`. `deleteAccount` IS fully implemented.
