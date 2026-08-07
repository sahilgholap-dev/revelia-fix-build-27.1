# Astrology — Swiss Ephemeris (Build 27 · R1) ✅ IMPLEMENTED

Full plan/record: `plans/build-27/R1-swiss-ephemeris.md` (§13 = implementation record).

## What it replaced

Pre-R1, the birth chart came from a client-side Keplerian approximation (mobile `ephemeris.ts`) and an LLM-generated chart service (`birthChart.service.ts`) — both retired. Prompts only ever read `sunSign`; the monthly reading even *invented* transits.

## Design

- **`sweph@2.10.3-5`** (N-API prebuilt, glibc) in **Moshier mode** — arc-second accuracy with **no `.se1` data files and no Swiss Ephemeris license** (the "$720 Sid gate" deferred indefinitely). Never move Railway to Alpine/musl; never bundle `.se1`.
- `server/src/services/astrology.service.ts` computes a typed `natalChart` (planets, Placidus house cusps, angles, aspects) on birth-data save, with lazy fallback at read; stored on `UserProfile.natalChart` (legacy `birthChart` Mixed field deprecated-but-retained).
- **Transits**: `computeTransits(natal, now)` cached by UTC-noon date — a current-moment snapshot, *not* forward month-long windows (recorded R5 caveat).
- Birthplace → coordinates via the Haiku geocoder ladder (`GeocodeCache`).
- Mobile: `lib/astrology/chartGenerator.ts` maps the server chart for `BirthChartWheel`; client calculation fully removed.
- Backfill: `npm run backfill:natal-chart[:dry]` (owner runs post-deploy).

## Validation

Worst-case **0.88″** deviation vs astro.com/DE431 on curated test births; ASC/MC exact when birth time known.

## Known limitation — geocode precision (watch)

Planet longitudes are location-independent, but **Ascendant/MC/houses depend on exact birth lat/lng**. The Haiku geocoder resolves to a city centroid; near a sign cusp this can flip the displayed rising sign (Pass-1 saw ~3′ Asc/MC drift for Mumbai centroid vs exact coords). Enhancement proposal (tiered place autocomplete + optional exact-coordinate override + cusp-proximity guard) is recorded in `plans/build-27.md` §4; verify production geocode quality in Testing Pass 2.
