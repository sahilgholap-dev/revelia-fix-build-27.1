# Data Model (MongoDB / Mongoose)

Models live in `server/src/models/`. Shared TS shapes in `packages/shared/types.ts`.

## Core

- **User** — email, auth provider(s), password hash, `subscription` (tier `free|premium|premium_plus`, optional `comp` field for complimentary grants — resolved via `getEffectiveTier()` in `server/src/utils/subscriptionTier.ts`), notification prefs.
- **UserProfile** — birth data (date/time/place + geocoded lat/lng/tz), profile images (R2 keys), and the Build-27 structured layers:
  - `natalChart` (R1) — typed Swiss Ephemeris chart: planet positions, house cusps (Placidus), angles, aspects. Legacy `birthChart` Mixed field is deprecated-but-retained (drop in a later migration).
  - Face layer (R2) — `FaceFeatureVector` (68-landmark geometry ratios) + stable `faceTraits`/archetype from the physiognomy rules table, with `engine{}`/version stamps.
  - Palm layer (R3) — `HandFeatureVector` + traits per hand; dominant hand stores a `palmProfileResult`, non-dominant is re-mapped from its stored vector at read time.
  - `numerology` sub-doc (R4) — lifePath + name trio (Expression/SoulUrge/Personality) + `nameSource` provenance (`name_destiny` > `profile_name`, one-way) + version. **personalYear/personalMonth are never stored** — computed fresh at read (storing them caused the staleness bug R4 fixed).
- **Reading** — generated face/palm/combined/career reading content per user.
- **Compatibility** — two-person compatibility readings + scores.
- **CareerDestiny** — career-path readings, ranked paths.
- **NameAnalysis** — Name Destiny analyses. **Kept deliberately**: its `countDocuments({generatedAt})` is the 1/month credit gate — do not retire.
- **InsightCache** — cached daily/weekly/monthly insights per user, tier-aware (invalidated on tier upgrade via `insightCache.service.ts`).
- `UserProfile.continuity` sub-schema (R6) — `{baselineAt}`: the persisted last-engagement timestamp used to recompute a comparison transit set. No transit snapshot is stored — only the timestamp (see `features/continuity-readings.md`).

## Supporting

- **EmailVerification** — email + OTP for signup verification.
- **GeocodeCache** — birthplace string → lat/lng/timezone (Haiku→Sonnet geocoder ladder results).
- **AiFailure** — metadata-only log of AI generation failures (userId, readingType, errorType — never content).
- **AiGeneration** (R5, collection `ai_generations`) — fire-and-forget A/B log per synthesis call: `{surface, promptVersion, modelUsed, fellBack, stopReason, generatedAt, userId?}`. Field is `modelUsed`, not `model` (Mongoose reserves `Document.model`). Written non-blocking from `createSynthesisMessage` on both return paths, from `createQaAnswerMessage` (surface `qa`), and from `generateFaceReading` / `generatePalmReading` (surfaces `face` / `palm`, P99 — direct Vision calls that reach neither helper). ⚠️ **Rows predating 2026-08-06 have no face/palm entries at all**, so a window spanning that date under-reports those two surfaces rather than lying about them.
- **DiagnosticLog** — client-submitted diagnostics keyed by deviceId.
- **`QaTurn`** (R7, ✅ built) — one doc per Q&A exchange: question, answer, mode (reflective/timing/off_topic/unsafe/crisis), deepInsight flag, model+usage, feedback, timestamp, city-level location. Safety-mode rows (crisis/unsafe/off_topic) store **only** `{label, timestamp}` — never the question/answer/location. Partial-unique `{userId, idempotencyKey}` index (null-key safety rows exempt) prevents double-charge races. Caps are counted directly off this collection (doc-count, UTC calendar month) — there is no separate stored counter.
- **`QaDeviceDiClaim`** (R7, ✅ built) — per-device anti-farming cap on the free-tier Deep-Insight allowance: stores only a salted device-ID hash (`QA_DEVICE_SALT`) + month key, 60-day TTL purge, fail-open.
- **`timing_log`** (R7, ✅ built) — admin-only, never user-exposed: full Timing Engine output object per timing-mode question, no sampling — the calibration dataset for the proprietary rule set.
- **`Report`** (R9, ✅ built) — async job record for the Personalized Cosmic Report: `status` lifecycle `queued → generating → ready | failed`; credit reserved atomically at enqueue via a partial-unique `{userId, monthKey}` index (not counted after the fact); carries an unused `otherSubject` block reserved for the deferred "generate for someone else" phase; stores the private R2 key once QA-gated and `ready` (presigned links are minted fresh per request, never stored).

## Conventions

- API responses conceptually `{ success, data?, error?, message? }`, but some fields sit at the **top level** (e.g. `verificationToken` from `/auth/verify-email`) — never assume everything is under `.data`.
- Time-varying derived values (personal year/month, transits) are computed at read, not stored; transits are cached by UTC-noon date.
