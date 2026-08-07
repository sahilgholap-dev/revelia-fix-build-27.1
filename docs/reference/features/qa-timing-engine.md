# Q&A + Timing Engine (Build 27 · R7) 🟢 CODE-COMPLETE (2026-07-24) — prod-dark, remaining ship path is non-code launch gates

Full plan: `plans/build-27/R7-QA.md` (+ `R7-QA-spec.md`). Mobile entry points: "Ask the Stars" home card + the Readings-tab Q&A card, both routing to `mobile/app/(main)/readings/qa.tsx`.

## What it is

A conversational Q&A feature grounded in the user's full Cosmic Blueprint, plus a proprietary sidereal **Timing Engine** for timing-type questions. Reuses R9's sidereal astrology module (built first, on purpose — see `cosmic-report.md`) rather than duplicating it.

## Model routing (confirmed as shipped)

- **`claude-haiku-4-5` = router/safety classifier ONLY** — 5 labels (reflective / timing / off_topic / unsafe / crisis) + topic category; never deducts credit. Implemented in `qa-router.service.ts`.
- **Answers are tier-split**: free → `claude-sonnet-5`; paid regular → `claude-opus-4-8` (explicit adaptive thinking); Deep Insight (any tier, sub-capped) → `claude-fable-5` → Opus 4.8 fallback (reuses `SYNTHESIS_FABLE_ENABLED`/`createSynthesisMessage` infra).
- Never sends `budget_tokens`/`temperature`/`top_p`/`top_k` to the tier models.

## Timing Engine (internal/trade-secret name — never exposed to users)

`timing-engine.service.ts`: sidereal moment chart + sidereal natal + Vimshottari dasha → the confidential fixed rule set (loaded at runtime from a private R2 bucket, never on disk in production — `loadConfidentialConfig`, fail-closed) → an internal structured verdict the answer model only phrases. **Currently at rule-set v1.1.1** (`server/config/timing/rule-set.json`, gitignored): added two-path domain alignment (a period lord aligns with a life-domain by table significations OR by natal function — occupancy or sign-rulership), Ketu displacement/relocation semantics, and a 30-year no-alignment fallback that reports its basis honestly (`transit_fallback`) rather than fabricating a boundary. `npm run test:timing` = 22/22 assertions green against 8 fixtures (including full window *dates*, not just the basis — an earlier harness gap once let a wrong date hide behind a passing assertion).

**Isolation invariant**: `astrology-sidereal.service.ts` (built by R9, reused here) owns the `swe.set_sid_mode` process-global set-then-reset lifecycle internally. R7 never re-issues it — a repeat of that call would silently make R1's tropical charts sidereal too.

## Tiers, caps, and gating (`qa-caps.service.ts`)

Calendar-month reset (UTC), counted directly off `QaTurn` documents (no separate stored counter): Free **3 questions (1 Deep Insight)**, Premium **10 (3 DI)**, Premium Plus **15 (8 DI)**. Over cap → **402** with an upgrade payload (mobile shows a `QuestionCapCta` in place of the composer). Caps are enforced *after* the safety check and *before* any model call — router/off-topic/unsafe/crisis turns never cost a credit. Per-device anti-farming on the free Deep-Insight allowance: `QaDeviceDiClaim` model stores only a salted device-ID hash (`QA_DEVICE_SALT`), 60-day TTL purge, fail-open.

## Safety, grounding, and persistence

- Crisis/unsafe/off-topic turns short-circuit before any model or credit call; `QaTurn` stores only `{label, timestamp}` for those rows — never the question, answer, or location.
- Reflective/timing answers must ground in ≥1 real chart placement / face / palm / numerology fact (`buildUserInsightProfile`, exported read-only for this purpose) — a fail-closed `faceGate` (`faceOptIn && adultVerified && age≥18`) keeps face substance out of the context for minors or non-opted-in users.
- Crisis copy is a single PM-approved, region-agnostic, number-free "Off-Topic/Unsafe/Crisis Guide," wired verbatim — never model-generated.
- `QaTurn` persists question/answer/mode/model+usage/feedback/timestamp/location, with a partial-unique `{userId, idempotencyKey}` index guarding double-charge races. Follow-up context = last ~6 turns, spliced after the blueprint (self-omits cleanly when empty).
- `timing_log` (admin-only) records the full Timing Engine output per timing question, unsampled — the calibration dataset for future rule-set tuning.

## Mobile UI (`mobile/app/(main)/readings/qa.tsx`)

Single-thread chat: counters chip row (from `GET /qa/credit`), message list, composer with a Deep Insight toggle. Server-driven gating throughout — the client never guesses tier. Crisis/unsafe/off-topic responses suppress counters/CTAs/rating prompts and render plainly. A location-consent banner (D7) shows once; the device-ID header is sent only on Deep-Insight asks. New wrapper files: `mobile/lib/qa.ts`, `mobile/lib/qaLocation.ts`, `mobile/lib/deviceId.ts` — deliberately **not** in `packages/shared/types.ts` (Q&A DTOs are dual-homed client+server only, unlike the Report types which are shared).

## Net-new surface (all shipped)

`/api/qa` routes (`GET /credit`, `POST /ask`) · `QaTurn` + `QaDeviceDiClaim` models · monthly-reset caps (doc-counted, no cron needed) · 402 response shape · three committed regression harnesses: `test:timing` (22/22), `test:qa-router` (fixture + adversarial cases), `test:qa-prompt` (safety-invariant gate: FACE-gate leak + methodology-leak regression).

## Remaining ship path (non-code)

R7 is **code-complete but prod-dark** — nothing deployed. Launch gates are all owner/config actions, not engineering: re-upload the v1.1.1 rule set to the private R2 timing bucket in **both** staging and prod (the engine loads rules from R2 at runtime — a code deploy alone ships new code against old rules); Sid's one-line final-wording confirm on the crisis copy; two non-blocking config-tuning questions open with Sid (S-R7f/S-R7g, ablation-verified to not affect any other fixture). `R2_TIMING_*` env vars are documented in `.env.example`; see `setup/environment.md` for vars still missing from it.

## Reused / shared infrastructure

Extends `createSynthesisMessage` with two new regular tiers (free→Sonnet 5, paid→Opus-4.8-adaptive) alongside the existing Deep-Insight Fable→Opus path. Reuses R9's `astrology-sidereal.service.ts` and R5's `buildUserInsightProfile` (now exported).
