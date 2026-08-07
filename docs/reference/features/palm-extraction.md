# Palm Reading — Structured Extraction (Build 27 · R3) ✅ IMPLEMENTED — step 5 committed `f35eca8` on the S2/S3 proceed-on-default; only step 10 (owner on-device test + threshold recentre) remains, folded into the release cycle

Full plan: `plans/build-27/R3-palm-extraction.md`. Feasibility spike 2026-07-01: **GO** (geometry), lines ruled out.

## Pipeline (direct analog of R2)

1. **Extraction** (`palmFeatures.service.ts`): `@tensorflow-models/hand-pose-detection@2.0.1` (MediaPipe-Hands full, tfjs runtime + WASM) → 21 landmarks per hand → `HandFeatureVector` (palm-shape ratio, finger-length ratios). Model weights (~7.6MB) are **vendored/committed** with a custom fs load-router (the default tfhub host is deprecated). Two images: dominant + non-dominant hand.
2. **Rules mapping** (`server/src/data/chiromancy-rules.ts`, `mapFeaturesToPalmTraits`): vector → `palmType` (earth/air/water/fire), `energyType` (6 archetypes), talents, lifeTheme. Curated table, never the LLM. Revisions = `RULES_VERSION` bump + re-map.
3. **Reading**: LLM gets traits **plus the image** — palm deliberately KEEPS the photo (face drops it; do NOT "align" them). The image is used only so the model can *describe* the major lines (heart/head/life/fate → `PalmLineCard`). `reconcilePalmSubstance` pins palmType/energyType/talents/lifeTheme.

## Why lines are not measured (geometry-only v1)

The spike showed classical CV palm-line measurement fails reproducibility (≤13.5% re-encode drift) and discriminates skin texture/contrast, not the actual lines. Lines therefore ship as flagged **LLM flavor** (S2 product decision, approved-on-default). True measured line segmentation = future **R3.x** (trained segmentation model, own spike — plan §13). No user-facing regression: the line UI stays exactly as before.

## Durable invariants

- Non-dominant hand stores no `palmProfileResult` — its substance is re-mapped from the stored vector at read time (pure/deterministic).
- `financialGrowthScore` is NOT rules-pinned (no rules-derived wealth score exists yet) — the model writes it; a stable one would be an additive `RULES_VERSION` bump.
- `thumbAngle`/`fingerSpread` demoted (pose-dependent, advisory); index/middle/pinky ratios reserved for a future geometry pass. Mounts unmeasurable from 2-D — deferred.

## Open items

- 🎚️ Real palms skew fire/Leader (Pass 1, N=1 person) — **step 10**: owner on-device EAS test + threshold recentre BEFORE the wide `backfill:palm-features`. This is the only remaining R3 item; it rides the build-27 release-cycle device checklist rather than blocking further build-27 work.
