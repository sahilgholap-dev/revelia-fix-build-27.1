# Synthesis Engine — Fable 5 (Build 27 · R5) ✅ IMPLEMENTATION COMPLETE (2026-07-11)

Full plan: `plans/build-27/R5-synthesis-engine.md`. Remaining work is owner/post-deploy only (flag flip at rollout + live A/B) and Testing Pass 2.

## Goal

R1–R4 made `UserInsightProfile` data-complete (real moon/rising/aspects/transits, face-trait bands, palm-trait bands, name trio + fresh personal year/month) — but the prompt copy still mostly read `sunSign`. R5 rewrote all six synthesis surfaces to consume the full structured Blueprint, and routed marquee paid surfaces to a frontier model.

## Model routing (`server/src/services/synthesis-routing.ts` — single source)

| Tier | Surfaces | Model |
|---|---|---|
| fable (marquee paid) | monthly-premium, compat-premium, career, weekly | `claude-fable-5` streamed beta, `betas:['server-side-fallback-2026-06-01']`, `fallbacks:[{model:'claude-opus-4-8'}]`, `output_config.effort`; **flag OFF → guaranteed `claude-opus-4-8`** streamed (no Fable) |
| cheap | daily, free tier, name-destiny | `claude-sonnet-4-6`, existing non-beta `messages.create` |

- **`SYNTHESIS_FABLE_ENABLED`** (Railway env, default OFF): the **availability/retention** resilience layer. The server-side `fallbacks` beta covers **policy declines only**. Two separate layers — never conflate.
- Fable 5 call shape: omit `thinking`/temperature (they 400), always stream, check `stop_reason === 'refusal'` before reading content. Result stamped `{promptVersion, model, fellBack}`.
- Prereq shipped: `@anthropic-ai/sdk ^0.32 → ^0.110.0` with zero type drift.
- Org gates (Fable 5 API access + 30-day retention — Fable 400s under ZDR) **both PASSED** by a live probe with the server key, 2026-07-09.

## Implementation steps (all committed on `feature/build-27`)

1. SDK bump + probe + routing scaffold (`2c7a463`). 2. Prompt version tags on all six surfaces. 3. All six surfaces routed through `createSynthesisMessage` (weekly `fd454ac`, monthly/compat/career `6ab3015`, daily/name-destiny `bf43c71`). 4. A/B generation logging (`AiGeneration` model + `aiGeneration.service.ts`, fire-and-forget from both return paths) + fallback verification (flag-OFF smoke: Opus 4.8, full quality, ~7.8s) + migration doc (natural cache expiry + on-demand regen; no data script; nobody loses access) (`1227d6a`).

## Caveats

- Deeper-signal weave only populates when R1–R4 data is present; pre-backfill users degrade gracefully (`buildFeatureContext` omits absent sections). Daily/weekly/monthly self-heal (lazy compute); **compat + career do not lazy-backfill** — they need the owner's backfills. Verify full weave in Pass 2.
- Monthly readings are grounded in *current-moment* transits (R1 snapshot), not ephemeris-computed forward month windows — forward windows remain model projection (deferred, R1/insight data-layer territory).
- Live A/B (D7/D30 retention, regeneration rate, free→paid) runs off `ai_generations` after rollout; Premium Fable rollout only on clear lift.
