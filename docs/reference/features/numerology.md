# Numerology — Consolidation (Build 27 · R4) ✅ IMPLEMENTED

Full plan: `plans/build-27/R4-numerology-consolidation.md`. Steps 1–6 done 2026-07-08. No spike, no Sid gate — pure data plumbing.

## Problem

The math was already correct but scattered: date-based numbers (lifePath, personalYear/Month) computed in `utils/numerology.ts` and stored flat on `UserProfile` via a pre-save hook; name-based numbers (Expression/SoulUrge/Personality) in `utils/nameNumerology.ts`, recomputed ad hoc per request from **different names** (career used the display name; Name Destiny used the request-body full birth name). Two real bugs: (1) personalYear/Month went **stale** (hook only fired on birth-date change); (2) users could see **two contradictory Expression numbers**.

## Design

- One **`NumerologyNumbers` sub-doc** at `user.profile.numerology`: lifePath + name trio + `nameSource` provenance + `NUMEROLOGY_VERSION`. Compute hooks at birth-data save, name-destiny persist, and guarded profile-name save (`numerology.service.ts`: `planNumerologyUpdate` / `ensureProfileNumerology`).
- **personalYear/personalMonth are computed fresh at read, never stored** — storing them was the staleness bug.
- `nameSource` hierarchy is **one-way**: `name_destiny` (full birth name) beats and is never overwritten by `profile_name`.
- Merge-never-replace: the date-based pre-save hook preserves any existing name trio.
- `NameAnalysis` model **kept** — its `countDocuments({generatedAt})` is the 1/month Name Destiny credit gate.
- `UserInsightProfile` gained the name trio (data only; copy consumption came with R5). Backfill: `npm run backfill:numerology[:dry]`. Zero mobile changes; `GET /profile/numerology` response shape byte-identical.

## Watch items

- Two deliberate value changes for some existing users (career Expression now canonical-sourced; personal year/month now fresh) — observe in testing, not gated.
- Known dead code (recorded, no action): mobile `api.ts` `POST /numerology` (no server route); compiled `packages/shared/types.d.ts` artifacts.
