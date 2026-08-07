# Face Reading — Structured Extraction (Build 27 · R2) ✅ IMPLEMENTED

Full plan: `plans/build-27/R2-face-extraction.md`. Steps 1–9 done 2026-07-08; stability probe PASSED.

## Problem

Face readings were freeform Claude Vision — the same selfie produced different archetypes/traits per run. R2 inserts a deterministic layer so substance is stable and only prose comes from the model.

## Pipeline

1. **Extraction** (server-side, `faceFeatures.service.ts`): `@vladmandic/face-api@1.7.15` on pure-JS `@tensorflow/tfjs` + WASM backend (zero native compile beyond `sharp`) → 68 landmarks → `FaceFeatureVector` (geometry ratios: eye/brow/nose/jaw, faceShape bands). Extract **once on stored bytes**; same bytes → bit-identical vector. `engine{}` + version stamped.
2. **Rules mapping** (`server/src/data/physiognomy-rules.ts`, `mapFeaturesToTraits`): vector → traits + one of 8 archetypes + faceShape. Curated table, **never the LLM**. Revisions = `RULES_VERSION` bump + re-map (no re-detect).
3. **Reading generation**: the LLM receives the **trait list, not the image** (traits-only is the primary path; the image path is a fail-open fallback for extraction failure only). `reconcileFaceSubstance` pins archetype/scores/faceShape over any model drift — the model authors only per-trait descriptions and prose.

## Durable invariants (do not "simplify")

- Do not re-add the image "for flavor" — pixel-free substance is the whole point.
- Do not remove `reconcileFaceSubstance`.
- Archetype/traits come from the rules table only; taxonomy is first-pass (S1 proceeded-on-default, re-mappable).
- The forehead card was dropped for good (unmeasurable from 68 points); `cheekboneWidth`/`cheekToJawTaper` stay internal.

## Open items

- 🎚️ faceShape thresholds skew round/square on both GAN *and* real photos (Pass 1: 2/2 real selfies → square) — owner recentres thresholds **before** the wide `backfill:face-features`.
- ⚠️ Real-selfie detector confidence runs lower than GAN best-case — watch camera-capture success rate in Pass 2 (fail-open to blob path below `DETECTION_MIN_CONFIDENCE`).
- 🧹 Leftover "Reading what your forehead reveals…" loading string in `GeneratingReading.tsx`.
