# Continuity Readings — "What's Shifted" (Build 27 · R6) ✅ IMPLEMENTED (2026-07-13)

Full plan: `plans/build-27/R6-continuity.md`. Steps 1–6 committed `49344eb`→`98e0485`; validation 41/41; home-chat closeout done.

## What it is

A temporal-delta retention mechanic woven into the **daily** insight: "what's shifted since your last reading." Not a new surface or endpoint — it splices into the existing daily prompt via R5's synthesis routing.

## Design

- **Baseline = recompute, not snapshot.** `computeTransits(natal, date)` (R1) is a pure, exact, deterministic function of `(natalChart, date)` — so R6 recomputes transits for the user's last-engagement timestamp from the stable stored natal chart, rather than persisting a per-reading transit snapshot (which would be exact-but-forward-only and redundant). Baseline stored at `UserProfile.continuity.baselineAt`, seeded from the existing `engagement.lastCheckIn`/`lastSeenAt`, advanced only when a meaningful shift was actually surfaced.
- **`computeContinuityDelta`** (`continuity.service.ts`) — pure diff of two `computeTransits` results (orb-free aspect identity) + guarded moon-sign change + personal-month/-year rollovers.
- **Code-level meaningfulness gate** — the "nothing changed" honesty rule: below `MIN_GAP_DAYS`, or no real shift, the model is never handed a delta to describe (mirrors R2/R3's prose-never-contradicts discipline, applied to time).
- **Render**: NEW `buildContinuityContext` (full daily/PP prose block, spliced before `## DEEPER PROFILE SIGNALS`) + `buildContinuityHook` (one-sentence free/premium teaser prepend — **Option A**, zero mobile changes). Routed through R5's `createSynthesisMessage`; daily stays on the cheap tier (`daily.v3`).
- **Fail-open**: no natal chart / no birth date → continuity renders `''` → daily prompt and teaser are byte-identical to pre-R6.

## Why R5 didn't already have this

R5's "continuity seam" was documented in code comments (`shared.ts:379`, `chiromancy-rules.ts:234`) but never materialized — `buildFeatureContext` and the prompt builders took no continuity param. R6 built the seam that R5 only planned for.

## Option C — shipped (2026-07-25)

The dedicated card, originally deferred, was built once the build-27 mobile cycle opened for R7/R9: a `DailyContinuity` type (`gapDays`, `highlights`) added to `packages/shared/types.ts`, attached to both `DailyInsightOutput.continuity`/`continuityHook` and `DailyTeaserOutput.continuity`/`continuityHook`, computed from the already-computed `delta` in `getDailyInsight`/`getDailyTeaser` **before** caching (so it stays stable all day). Owner chose **Option 1** (a distinct additive summary card, not a rewrite of the woven prose — the daily narrative keeps the continuity text it already had). Mobile: `ContinuityCard` (`mobile/components/insights/ContinuityCard.tsx`) renders on the daily astrology screen, showing the hook sentence (or a generic "since you were last here" fallback) plus bullet highlights; self-hides when there's nothing to show; an optional unlock CTA targets non-Premium-Plus viewers. `CONTINUITY_VERSION` unchanged — purely additive, no generation-logic change, no new Sid gate.

## Verification

Live reads (on-device baseline persistence/cache, real Anthropic woven-prose quality, a genuine returning-user note) ride Testing Pass 2 / the release cycle — the 41/41 validation pass proved the logic offline against a real R1 natal chart, not live generation.
