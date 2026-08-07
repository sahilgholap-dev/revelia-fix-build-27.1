# R1 — Swiss Ephemeris astrology (server-side, arc-second accuracy)

> Part of **Build 27** (see `../build-27.md`). Status: ✅ **IMPLEMENTED (2026-06-27)** — all phases landed, tsc clean (mobile + server), accuracy validated to arc-second. See **§13 Implementation outcome** at the bottom for what shipped, durable watch-outs, the R5 hand-off, and deploy/backfill steps. Area: Server (primary) + minor mobile. Priority: High. First in sequence (most self-contained; R6 continuity depends on its transits).

---

## 1. Goal

Replace the approximate, client-side astrology with **arc-second-accurate Swiss Ephemeris positions computed server-side**, stored once per user, and — critically — **actually fed into the reading prompts**, which today receive only `sunSign`.

Acceptance (from build-27 §3): natal charts match a reference tool (astro.com) to arc-second tolerance on a curated sample of test birth data.

---

## 2. Current state (verified in codebase — important context)

There are **two parallel chart systems, both disconnected from readings**:

- **Path A — client Keplerian engine** (`mobile/lib/astrology/ephemeris.ts` + `chartGenerator.ts`): hand-rolled orbital math, ~1° accuracy, Equal-House cusps, simplified 2D geocentric projection (no ecliptic latitude → worst for outer planets). Produces `ClientBirthChart` (sun/moon/rising, 10 planets, houses, aspects, angles + static interpretation text from `interpretations.ts`). **Lives only in Zustand memory** (`profileStore.ts` `fetchBirthChart`/`generateBirthChart`), recomputed every cold start. Consumed by the astrology hub (`astrology/index.tsx`) and the combined screen's Moon/Rising display. Never sent to the server.
- **Path B — server "chart"** (`POST /api/astrology/birth-chart` → `server/src/services/birthChart.service.ts`): a **Claude LLM call** asked to "use actual astronomical positions" — i.e. the model approximates from training data, not an ephemeris. Cached on `UserProfile.birthChart` (`Schema.Types.Mixed`). **Never read by `insight.service.ts` or any reading prompt.**

**What readings actually get today:** `buildUserInsightProfile()` (`server/src/services/insight.service.ts`) assembles `UserInsightProfile` (`server/src/types/shared.ts`) containing **`sunSign` only** (plus numerology + face/palm). No moon, no rising, no planets, no transits. Every daily/weekly/monthly/compatibility/career prompt invents planetary context from the sun sign.

**Server astrology compute today** = `getSunSign(birthDate)` (date-boundary lookup in `server/src/utils/zodiac.ts`), run in the `UserProfile` `pre('save')` hook. No ephemeris anywhere. No astrology npm deps in either package.

**Pre-wired seams (already waiting for this):**
- `reading.controller.ts:~531` career-destiny passes `moonSign: undefined // approximated from birth chart if available`.
- `profile.service.ts` `setBirthData()` / `applyGeocodeAndNoonDefault()` already geocodes lat/lng/timezone on save — the exact place to also compute the chart.
- No structured chart types exist in `packages/shared/types.ts` — clean slate to define them.

---

## 3. Target architecture

```
Birth-data save (server)
  profile.service.ts setBirthData → geocode (existing) → computeNatalChart(swisseph)
    → store structured UserProfile.natalChart  (replaces the LLM Mixed blob)

Reading time (server)
  insight.service.ts buildUserInsightProfile
    → read natalChart (sun/moon/rising/planets/houses/aspects)
    → computeTransits(natalChart, today)  [cached by date]
    → enrich UserInsightProfile → flows to ALL prompts at once

Mobile
  profileStore.fetchBirthChart → GET /api/astrology/birth-chart (now returns the REAL structured chart)
    → astrology hub + combined screen render from server data
  (retire the client Keplerian compute path; keep interpretations.ts text tables if still used for display)
```

---

## 4. Key decisions

> ✅ **Spike verdict (2026-06-27): GO.** `sweph` + Moshier mode, no `.se1` files, no Railway compile step, accuracy ≤ 0.97″ vs astro.com. Library + ephemeris rows below are now **DECIDED**; the rest stand as recommendations. NOTE: `sweph` is **not yet in `server/package.json`** — the impl session adds it.

| Decision | Choice | Why / caveat |
|---|---|---|
| **Library** | ✅ **DECIDED: `sweph`** (N-API prebuilt binary) | Spike confirmed it installs + runs on Node 20 with a prebuilt N-API binary — **no node-gyp / build tools / Railway compile step**. ⚠️ **glibc/Alpine caveat**: the prebuild targets glibc; if Railway's image is Alpine/musl, force a source build or use a glibc-based image. Verify Railway's base image during impl. |
| **Ephemeris data** | ✅ **DECIDED: Moshier mode** (`SEFLG_MOSEPH`) — no external `.se1` files | Spike measured ≤ 0.97″ vs astro.com — within arc-second tolerance, ships nothing extra. Do NOT bundle `.se1` files unless a later edge case fails tolerance. (Spike's scratchpad `.se1` downloads are not used and stay out of the repo.) |
| **House system** | **Placidus** default (`swe_houses` 'P') | Per doc + Sid. Expose Whole Sign / Equal later. Confirm with Sid (open question). |
| **Where compute runs** | On birth-data **save** (once), cached; transits computed **on demand, cached by date** | Matches doc. Natal chart only recomputes on birth-data change. |
| **Fate of the LLM chart** (`birthChart.service.ts`) | **Retire** the LLM ephemeris; repurpose `POST /api/astrology/birth-chart` to compute-or-return the real chart | It's inaccurate and unused by readings. Keep the route contract so mobile needs minimal change. |
| **Fate of client Keplerian** (`ephemeris.ts`) | **Retire the compute**, switch `profileStore` to the server chart | Removes the second source of truth. Keep `interpretations.ts` only if the hub still renders its static text; otherwise retire too. |
| **Time-unknown births** | Honor existing `timeIsAssumed`/noon-default; compute planets (sign-accurate) but **suppress houses/ascendant** when time is assumed | Houses/ASC require accurate birth time; current code already nulls them without time. |

---

## 5. Data model + shared types

**New structured types** in `packages/shared/types.ts` (and mirror in `server/src/types/shared.ts`) — fill the gap (no `NatalChart` exists today):
- `PlanetPosition { body, sign, degree, longitude, retrograde, house? }`
- `HouseCusp { house, sign, degree, longitude }`
- `Aspect { body1, body2, type, orb }`
- `NatalChart { sun/moon/rising, planets[], houses[], aspects[], angles{asc,mc,desc,ic}, computedAt, houseSystem, ephemeris, timeKnown }`
- `Transit` / `TransitSet { date, aspectsToNatal[] }` (for R6 + daily/weekly/monthly)

**`UserProfile` model** (`server/src/models/UserProfile.ts`): replace the opaque `birthChart: Mixed` with a typed `natalChart` sub-document (keep a migration path for the old blob — it's disposable since nothing reads it). Add `natalChart.computedAt` so we can detect staleness vs birth-data edits.

**`UserInsightProfile`** (`server/src/types/shared.ts`) — the bottleneck: add `moonSign`, `risingSign`, and a compact `keyTransits`/`activeAspects` summary. Adding here flows to **all** prompts via `buildUserInsightProfile()`.

---

## 6. Wiring into readings (the high-value part)

Today prompts invent planetary context. After R1, feed real data:
- `daily-insight.prompt.ts` / `weekly-forecast.prompt.ts` / `monthly-reading.prompt.ts` — pass real current **transits** (computed vs natal) instead of letting Claude invent "today's energies". Monthly's `keyTransits`/`retrogradeWarnings` become real.
- `compatibility.prompt.ts` — real synastry inputs (both charts' moon/rising/Venus/Mars), not just sun-sign elements.
- career-destiny (`reading.controller.ts:531`) — fill the `moonSign`/`risingSign` stubs from `natalChart`.
- Note: this is also a **Fable 5 (R5) input** — the structured chart is one of the four feature sets the synthesis engine consumes. Coordinate the prompt rewrites with R5 so we don't rewrite twice.

---

## 7. Mobile changes (minimal)

- `mobile/store/profileStore.ts`: `fetchBirthChart`/`generateBirthChart` → call `GET/POST /api/astrology/birth-chart` (now real) instead of `generateClientBirthChart`. Cache server result in Zustand.
- `astrology/index.tsx` + `combined.tsx`: render from the server chart shape (map new structured type). Big-three, planet placements, wheel, life themes.
- Retire `mobile/lib/astrology/ephemeris.ts` + `chartGenerator.ts` compute. Decide on `interpretations.ts` (keep if hub still shows static text; the synthesis engine may later replace it).

---

## 8. Migration / backfill (acceptance criterion: no user loses access)

- Existing users have `birthData` (with lat/lng/timezone from build-22 geocode) but **no structured `natalChart`**. Write a backfill script (mirror the existing `server/src/scripts/backfill-*.ts` pattern, e.g. `backfill-natal-chart.ts` + `:dry` variant in `package.json`) that computes `natalChart` for all profiles with birth data.
- Lazy fallback: if `natalChart` is missing at reading time, compute on the fly and persist (so the app works before backfill completes).
- The old LLM `birthChart` blob is simply ignored/overwritten — nothing reads it.

---

## 9. Sequencing (within R1)

1. **Spike**: confirm `swisseph`/`sweph` builds + runs on Railway Node 20; validate one known chart vs astro.com (Moshier mode). ← go/no-go on library + ephemeris mode.
2. Define shared types (`NatalChart` etc.); add `natalChart` to `UserProfile`.
3. `astrology.service.ts` (new): `computeNatalChart(birthData)` + `computeTransits(natalChart, date)` with date cache.
4. Hook compute into `profile.service.ts` save pipeline; lazy-compute fallback.
5. Repurpose `POST/GET /api/astrology/birth-chart` to the real chart; retire `birthChart.service.ts` LLM path.
6. Enrich `UserInsightProfile` + `buildUserInsightProfile()`; thread moon/rising/transits into prompts (coordinate w/ R5).
7. Mobile: switch `profileStore` to server chart; render; retire client Keplerian.
8. Backfill script + run on staging → prod.
9. Accuracy validation vs astro.com on curated birth-data sample.

---

## 10. Passing criteria (R1-specific)
- [ ] Natal positions match astro.com to arc-second tolerance on a curated sample (varied dates, hemispheres, time-known + time-unknown).
- [ ] Houses/ascendant computed with Placidus when birth time is known; suppressed when `timeIsAssumed`.
- [ ] Readings (daily/weekly/monthly/compat/career) receive real moon/rising/transits — verify the prompt inputs, not just that they render.
- [ ] Existing users: backfill populates `natalChart`; lazy fallback covers the gap; no logged-in user loses astrology.
- [ ] `tsc --noEmit` clean (mobile + server). No regression in the astrology hub UI.

---

## 11. Risks / open questions
- ✅ **Native build on Railway** — RESOLVED by spike: `sweph` uses a prebuilt N-API binary, no compile step. Residual: **glibc vs Alpine/musl** — confirm Railway's base image during impl; if Alpine, force source build or switch to a glibc image.
- ✅ **Ephemeris mode** — RESOLVED: Moshier, ≤ 0.97″ vs astro.com. No `.se1` files.
- **House system** — confirm Placidus default with Sid.
- **License** — Swiss Ephemeris commercial (~$720) is a Sid gate; dev on AGPL/free, purchase at internal-testing.
- **Transit cache key** — by date + natal chart id; consider timezone (transits are usually computed for a moment; decide UTC-noon vs user-tz-noon for "today").
- **Coordinate with R5** — don't rewrite reading prompts for transits in R1 and again for Fable 5; sequence so the prompt changes land once.
- **iOS parity** — chart now server-computed, so iOS (when it ships) gets it free; the retired client engine won't be missed.

---

## 12. Files in scope (checklist)
**Server**
- `server/src/services/astrology.service.ts` (NEW — compute natal + transits)
- `server/src/models/UserProfile.ts` (structured `natalChart`)
- `server/src/services/profile.service.ts` (hook compute on save)
- `server/src/services/insight.service.ts` (`buildUserInsightProfile` enrich)
- `server/src/types/shared.ts` + `packages/shared/types.ts` (new chart types, `UserInsightProfile`)
- `server/src/routes/astrology.routes.ts` + its controller (repurpose to real chart)
- `server/src/services/birthChart.service.ts` (retire LLM path)
- `server/src/prompts/{daily-insight,weekly-forecast,monthly-reading,compatibility}.prompt.ts` (real transits — coordinate w/ R5)
- `server/src/controllers/reading.controller.ts` (career moon/rising stub fill)
- `server/src/scripts/backfill-natal-chart.ts` (NEW) + `package.json` script entry
**Mobile**
- `mobile/store/profileStore.ts` (server chart)
- `mobile/app/(main)/astrology/index.tsx`, `mobile/app/(main)/readings/combined.tsx` (render server shape)
- `mobile/lib/astrology/ephemeris.ts`, `chartGenerator.ts` (retire compute), `interpretations.ts` (keep/retire TBD)

---

## 13. Implementation outcome (2026-06-27) — durable record

> This section is the authoritative post-implementation record. `session_handoff.md` is volatile (overwritten each session); the durable facts live here.

### What shipped (per phase, all tsc-clean, committed by owner)
- **A — deps + types + model.** `sweph@2.10.3-5` added to `server/package.json` (installs with **zero compilation**). Shared types `NatalChart`/`PlanetPosition`/`HouseCusp`/`ChartAngle`/`Aspect`/`TransitSet`/`TransitAspect` + `CelestialBody`/`AspectType`/`HouseSystem`/`EphemerisMode` in `packages/shared/types.ts` **and** mirrored in `server/src/types/shared.ts`. `UserInsightProfile` gained optional `moonSign`/`risingSign`/`activeAspects`/`keyTransits`. `UserProfile` model gained a typed `natalChart` sub-document (sub-schemas with `_id:false`); the legacy `birthChart: Mixed` field is **deprecated but retained** for old-doc load compat.
- **B — compute service.** `server/src/services/astrology.service.ts` (NEW) exports `computeNatalChart`, `computeNatalChartFromBirthData`, `computeTransits`, `describeNatalAspects`, `describeTransits`. Moshier mode (`SEFLG_MOSEPH`), Placidus houses, local-time→UT via `date-fns-tz` `fromZonedTime`. Compute is hooked into `profile.service.ts` (`createProfile` + `setBirthData`, **fail-open** — never blocks the save) and lazily backfilled at reading time in `insight.service.ts`.
- **C — route.** GET/POST `/api/astrology/birth-chart` now serve the structured `natalChart` (compute-or-return, lazy persist on GET, `forceRegenerate` on POST). `birthChart.service.ts` (the LLM-approximated chart) was **deleted**.
- **D — readings.** `buildUserInsightProfile()` carries real moon/rising/aspects/transits; career-destiny `moonSign`/`risingSign` stubs filled (in `reading.controller.ts`, computed in-memory because that path uses `.lean()`).
- **E — mobile.** `mobile/lib/astrology/chartGenerator.ts` rewritten to `mapServerChart(natal, knownSunSign?)` mapping the server `NatalChart` → the existing `ClientBirthChart` UI shape; `interpretations.ts` **kept** (copy tables, now keyed off accurate positions); client `mobile/lib/astrology/ephemeris.ts` **deleted**. `profileService`/`profileStore` call the real route; the hub auto-loads via **GET** (lazy server compute) and the manual regen button uses **POST**.
- **F — backfill + validation.** `server/src/scripts/backfill-natal-chart.ts` (NEW) + `backfill:natal-chart`/`backfill:natal-chart:dry` npm scripts (idempotent; `--force` recomputes all; pure compute, no API/rate-limit).

### Decisions confirmed at implementation time
- **Library/mode**: `sweph` + **Moshier**, **no `.se1` files** (none committed). Do not bundle ephemeris data unless a future edge case fails arc-second tolerance.
- **House system**: Placidus (`'P'`). Bodies computed: Sun–Pluto + **True Node** (labelled `northNode`). Natal aspects use the 10 classical planets only (node excluded); orbs conj/opp/tri 8°, sq 7°, sex 6°. Transit orbs are tighter (conj/opp/sq/tri 3°, sex 2°).
- **Time-unknown handling**: when `timeIsAssumed` is true OR no coords/timezone, planets are still sign-accurate but **houses, angles, and rising are suppressed** (`houses:[]`, `angles:null`, `rising:null`, `timeKnown:false`, planet `house:null`).
- **Transit anchor**: **UTC noon** of the calendar date (keeps the position cache global). Revisit only if per-user-tz "today" framing is needed.

### Accuracy validation (R1 §10 criterion — MET)
Production wrapper (Moshier, **including** the tz→UT conversion) validated against full **Swiss/DE431** (exactly what astro.com computes from, via the spike's `.se1` files) across London 1990 / Sydney 2005 (S-hemi) / NY 2001 / Mumbai 1995 (IST) / leap-day Paris 1988 (time-unknown) + Einstein 1879:
- **Worst-case planet Δ = 0.88″** (all bodies, all charts).
- **ASC/MC Δ = 0.000″** when time known.
- Time-unknown chart correctly suppressed houses/rising/angles.
- (The validation scripts were throwaway/`tmp`, not committed. Lesson from the spike holds: hand-typed astro.com reference tables are unreliable — the in-library Moshier-vs-Swiss/DE431 diff is the rigorous check.)

### ⚠️ Carry-forward / coordination items
- **R5 (Fable 5) MUST wire the new data into prompt COPY.** R1 deliberately did **not** rewrite the reading prompt text. The fields `moonSign`/`risingSign`/`activeAspects`/`keyTransits` are now populated on `UserInsightProfile` and flow to `daily-insight`/`weekly-forecast`/`monthly-reading`/`compatibility` prompts + career-destiny — but those prompts still only *read* `sunSign`. R5 makes the copy consume the real chart/transits. (This avoids rewriting prompts twice.)
- **Deploy + backfill**: backend deploys via `main`→Railway. After deploy, run `npm run backfill:natal-chart:dry` then `npm run backfill:natal-chart` to populate existing users. The lazy fallback (insight + GET route) covers the gap before/around backfill, so no user loses astrology. Mobile chart change ships in the next EAS build.

### Durable watch-outs (do not regress)
- **Do NOT switch Railway to an Alpine/musl image.** The `sweph` linux-x64 prebuild is a **glibc ELF**; on musl it wouldn't load and would fall back to compiling from source (needs node-gyp/Python/build tools). Default Nixpacks/Debian = glibc = fine. (R1 risk #1, retired.)
- **Keep Moshier; ship no `.se1` files.** Adding them reintroduces the Swiss license (~$720 Sid gate) for nothing — Moshier meets the bar.
- The legacy `birthChart` Mixed field is **disposable** but retained; drop it only in a later migration once every profile has `natalChart`.
- `interpretations.ts` (mobile) is intentionally kept — it's the static copy layer the hub renders; the synthesis engine (R5) may later supersede it.
