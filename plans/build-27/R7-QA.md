# R7 — Conversational Q&A + Timing Engine (multi-modal grounding + proprietary sidereal timing)

> Part of **Build 27** (see `../build-27.md`). Status: **📋 DEEP-PLANNED (2026-07-15)** — PLANNING ONLY, no code, no deps, no schema changes, no commits. This doc + the `plans/build-27.md` update (below) are the whole deliverable. HEAD unchanged.
> **Closeout pending ONE input (2026-07-16):** the **in-progress PM/Amey crisis resource set** (§7 / §11-D6). ✅ Sid's **Y-as-vowel** rule is RESOLVED (always-vowel, project-wide — §6: `NUMEROLOGY_VERSION` bump + backfill). **Sequencing: R7 implementation is DEFERRED until after R9 (Personalized Cosmic Report) — do NOT begin R7 implementation next.** (D3/D6/D7 are PM-approved as of 2026-07-16 — see §11.)
> **Area: Both** (server pipeline + mobile chat UI). R7 opens the build-27 mobile cycle that R6's deferred Option C (continuity card + CTA) folds into.
> **Depends on R1–R5** (all ✅) **and R9** (Personalized Cosmic Report — implemented BEFORE R7 per owner sequencing; builds the **isolated sidereal engine module** R7 reuses — see §0/§5). Inherits SDK `@anthropic-ai/sdk ^0.110.0` (verified `server/package.json:38`), R5's `createSynthesisMessage`/`synthesis-routing.ts`, the server-side `fallbacks` beta, and R6's compute→render→pass discipline.
>
> **Source hierarchy (spec §0, binding):** (0) **`Revelia_Build27_Timing_Engine_Handover_v1.md` (Sid, 2026-07-14) — AUTHORITATIVE** for the Timing Engine rule set + six fixtures + reflective mapping + grounding scope + device-ID anti-farming. INTERNAL/CONFIDENTIAL; the rule set (handover §2) lives in access-controlled server config only and is **never reproduced** here or in the app repo. (1) **v2 Q&A docs supersede** the PRD/`build-27.md` R7 block where they speak. (2) **PRD §2.8–2.15 governs where v2 is silent** — the multi-modal moat (chart + face + palm + numerology) survives and is an acceptance criterion. (3) `plans/build-27.md` R7 block + §3 were STALE and are updated per spec §17.16 (see the "build-27.md update" section at the end).
>
> ⚠️ **All Anthropic facts below were verified against the `claude-api` skill at plan time (2026-07-15)** — model IDs, thinking/effort rules, caching floors, `max_tokens`/thinking-token sharing, the `fallbacks` beta header. Re-verify before implementing (models/pricing drift).
>
> ✅ **In-repo §17 facts independently re-verified 2026-07-16** via a four-way read-only exploration (astrology engine · Q&A infra · R5 context seam · mobile). Every file:line claim below was confirmed; three refinements the pass surfaced are folded in — the **`swe.set_sid_mode` process-global hazard** (§0), the **doc-count-vs-stored-counter** convention note (§6), and **`buildUserInsightProfile` being private / needing export** (§2, §12).

---

## 0. The §17.1 astrology-feasibility SPIKE — RESULT: ✅ GO (read before sizing Phase A)

Spec §17.1 made this a first-class spike, not an assumption. A read-only investigation of the R1 engine (`server/src/services/astrology.service.ts`, 492 lines) settles it: **the existing `sweph` Moshier setup can produce the handover's fixed settings — Lahiri sidereal, whole-sign houses, mean node, speed flags — with NO new libraries, NO `.se1` files, and NO service.** Dasha is net-new but has zero ephemeris dependency.

**⛔ SEQUENCING INVERSION (2026-07-16) — R9 builds this foundation; R7 REUSES it.** Per owner sequencing, **R9 (Personalized Cosmic Report) is implemented BEFORE R7** (`session_handoff.md`; `plans/build-27/R9-report.md`). R9 builds the **isolated sidereal engine module** (`server/src/services/astrology-sidereal.service.ts`) that this section describes as R7's to build: the **sidereal natal** (Lahiri / whole-sign / mean node / speed), the **Vimshottari dasha ladder**, the **process-global `set_sid_mode` set-then-reset lifecycle**, and the **byte-identical-tropical regression guard** (R1–R6 charts unaffected). **R7 therefore REUSES and EXTENDS that module rather than building the sidereal natal + dasha compute from scratch** — R7 adds only (a) the **per-question located moment chart** and (b) the **trade-secret rule set** on top. **Dependency: R7 inherits R9's sidereal module; R9 must keep its public surface stable for R7** (`R9-report.md §5` / "Coordinate with R7"). The spike verdict below still holds — it is the feasibility proof R9 relied on; only the *builder* changed.

**Verified facts (file:line):**
- **Engine:** `sweph ^2.10.3-5` (`server/package.json:64`), Moshier mode `SEFLG_MOSEPH | SEFLG_SPEED` (`astrology.service.ts:32-36`); **no `set_ephe_path` anywhere** — no `.se1` files; prebuilt native binaries ship for linux/darwin/win (no Railway/Alpine compile).
- **Currently tropical, Placidus (`'P'`), True Node** (`astrology.service.ts:65,283-289`). Sidereal is used nowhere today.
- **Sidereal is CONFIGURABLE, not blocked:** the binding fully exposes `swe.set_sid_mode(SE_SIDM_LAHIRI, 0, 0)` + `SEFLG_SIDEREAL` (constants present: `SE_SIDM_LAHIRI=1`, `SEFLG_SIDEREAL=65536`). Sidereal ayanamsa is a post-computation transform layered on the Moshier backend — it composes cleanly. **Net-new: one setup call + one flag bit.**
- **Whole-sign houses:** pass `'W'` to `houses_ex` instead of `'P'`; the `HouseSystem` type already lists `'whole-sign'`. **Net-new: one char.** (Whole-sign lagna still needs birth time + coords, same precondition as today.)
- **Mean node:** `SE_MEAN_NODE=10` exposed; change `SE_TRUE_NODE → SE_MEAN_NODE`. **Net-new: one line** (parameterize — do NOT mutate the natal path; see below).
- **Speed flags already ON;** retrograde derived (`speed < 0`, `astrology.service.ts:222`). **Stationary detection is net-new (small):** the raw speed `r.data[3]` is discarded today — preserve it on the position + threshold (|speed| < ~0.02°/day per handover). Data already flows.
- **Moment chart seam:** the reusable primitive is `computePositions(jd)` (`:206`) + `toJulianDayUT` (`:172`, full IANA-tz wall-clock→UTC→JD via `date-fns-tz`) + `houses_ex`. **`computeTransits` itself is NOT directly reusable** — it hardcodes **UTC noon** and ignores lat/long (transits carry no houses/angles, `:388-407`). A located moment chart must compose the three primitives with the real time-of-day + per-question lat/lng.
- **Dasha: entirely net-new, zero ephemeris dependency.** Confirmed absent in `server/src` (only doc/UI-string hits). Vimshottari is pure arithmetic off the sidereal Moon's nakshatra (longitude ÷ 13°20′) → starting mahādasha lord + elapsed fraction → the fixed 120-year sequence scaled on 365.25-day years. Its only engine input is the sidereal Moon longitude, which the sidereal-configured `computePositions` already returns.
- **No server config repo exists** (spec §17.14 assumed one). Config today is env-vars + code constants only. → see §5 "Trade-secret repo split" for the recommendation.

**Recommendation (architecture-shaping) — now realized by R9's module.** The sidereal path is built **without mutating the existing natal path**: the stored `UserProfile.natalChart` **stays tropical / Placidus / True Node** (persisted, consumed by R1–R6 and mobile), and the **separate sidereal natal + dasha** are computed from the same `birthData` and cached alongside (new fields — see §6). **As of the R9-before-R7 inversion, R9 owns that sidereal natal + dasha build (its isolated `astrology-sidereal.service.ts` module); R7 REUSES R9's cached sidereal natal + dasha and adds only the per-question moment chart (never cached) on top.** Whether R9 exposes this as a dedicated module or an options-object on the shared engine is R9's call — R7 depends only on the surface staying stable.

**⚠️ Process-global hazard (implementation-critical, verified 2026-07-16):** `swe.set_sid_mode(...)` sets **process-global** sidereal state on the shared `sweph` instance, and the *same* `astrology.service` process also serves R1's **tropical** natal + transit charts (consumers: `reading.controller`, `insight.service`, `continuity.service`, `compatibility.service`, `profile.service`, `astrology.routes`, `backfill-natal-chart`). A naive global flip would silently make those sidereal too — a subtler failure than "mutating the natal path." The sidereal computation must therefore **own the `set_sid_mode` lifecycle in an isolated code path** (a dedicated timing/sidereal module or a set-then-reset around each located computation) so global sidereal state is never left on for the tropical consumers. This ordering concern is the reason for a separate module, not just a separate options object. **Post-inversion, R9's `astrology-sidereal.service.ts` OWNS this `set_sid_mode` set-then-reset lifecycle and the byte-identical-tropical regression guard (R1–R6 charts unaffected). R7 must compute its per-question moment chart THROUGH R9's module (so the same discipline covers it) and must NOT re-issue `set_sid_mode` itself — doing so would reintroduce the very hazard R9 already guards.**

**Acceptance = the six regression fixtures (FX1–FX6) reproduce** — `indication` exact, `confidence` ±0.05, `window.basis` matches, FX6 → two verdict objects never averaged. Per Sid: **if a fixture misclassifies, the implementation is wrong — escalate, do not retune weights.** The fixtures share one natal (**the shared fixture natal — birth data held in access-controlled server config alongside the rule set; not reproduced here**).

**D8 (Swiss Ephemeris license) implication:** Moshier needs **no** license and reproduces sidereal + dasha per this spike. Sid's plan to buy the Astrodienst commercial license at internal-testing may be **unnecessary for R7** — confirm with Sid; the only reason to buy would be arc-second `.se1` precision, which the fixtures do not require (they pass at Moshier precision by construction if the spike holds). Recorded, not re-litigated (§11 D8).

---

## 1. Goal & thesis

**Goal.** A Q&A surface where an authenticated user asks a personal question and gets ONE personalized, non-streaming answer grounded in *their own* reading data. Two answer modes: **reflective** (self/patterns/relationships/growth) and **timing** (binary/dated/decision), the latter powered by a proprietary **Timing Engine**. Endpoint-first, Android-first, entertainment-framed.

**Thesis (why we win) — the moat is BOTH axes, and both are acceptance criteria:**
1. **Multi-modal grounding (PRD §2.9, survives v2's silence):** every answer grounds in this user's full Cosmic Blueprint — astrology natal + transits **+ face traits + palm traits + numerology numbers**, assembled by R5's context builder. Generic horoscope filler that could apply to anyone = a failure (the 20-question acceptance test).
2. **Timing precision (v2 §4):** timing questions additionally get a sidereal moment chart cast to the exact server-timestamp + city-level location, judged against a fixed internal rule set + the user's sidereal natal + running dasha → an internal directional read the answer model phrases. The engine decides; the model phrases (R6 non-fabrication discipline).

A generic astrology chatbot loses to ChatGPT. Both axes require the empirical R1–R5 foundation, which is why R7 ships *with* Build 27.

```
TODAY                                          AFTER R7
No Q&A surface anywhere.                        POST /api/qa/ask — one grounded answer per question.
UserInsightProfile assembled (R1–R5) but        Reused verbatim as the grounding context, +
only read by reading surfaces.                    a Timing Engine (sidereal moment chart + dasha
Astrology engine = tropical/Placidus/TrueNode.    + rule set) for timing questions.
No router, caps, device-id, idempotency,        Haiku router (5 labels) → tier gate (402) →
timing_log, name-at-birth, device location.       tier-split answer model → persist (+timing_log).
```

---

## 2. Current state (verified in codebase) + what R7 inherits from R1–R5

Every fact below was verified read-only (file:line). Where a fact is NOT in the repo, it is written as **"verify X"** — not invented.

### What R7 INHERITS (reuse, don't re-derive)

| Seam | Where | R7 reuse |
|---|---|---|
| **SDK + Fable/Opus routing** | `synthesis-routing.ts` — `createSynthesisMessage({surface, prompt, maxTokens, image?, promptVersion?})` → `{text, model, promptVersion, stopReason, fellBack}`; `FABLE_MODEL`/`FABLE_FALLBACK`/`CHEAP_MODEL='claude-sonnet-4-6'` (`:24-28`); `SYNTHESIS_MODELS` table with only `fable`/`cheap` tiers, **effort fixed per-surface internally** (`:59-71`); `SYNTHESIS_FABLE_ENABLED` gate (`:78-79`); refusal checked before content (`:186-189,236-244`); Fable path streams `.finalMessage()` with `betas:['server-side-fallback-2026-06-01']` + `fallbacks:[{model:FABLE_FALLBACK}]` + `output_config.effort` (`:214-231`); cheap path non-streamed `messages.create`, no thinking/effort. | **Deep Insight (Fable→Opus)** reuses the `fable` tier + existing `fallbacks` wiring **unchanged** — just add a DI `SynthesisSurface` row. **But the regular tiers need a HELPER EXTENSION, not just table rows:** the helper exposes **no `effort` and no `thinking` param**, and `cheap` is hardcoded to `claude-sonnet-4-6` — so free→`claude-sonnet-5` and paid-regular→`claude-opus-4-8` with **explicit** `thinking:{type:'adaptive'}` both require adding a model/thinking config path to `resolveRoute`/`createSynthesisMessage` (see §3/§4). |
| **Multi-modal context** | `buildUserInsightProfile()` `insight.service.ts:73-290` (lazy-backfills natal + numerology; degrades gracefully); `UserInsightProfile` DTO `types/shared.ts:958-996`; `buildFeatureContext()` `prompts/shared/feature-context.ts:62-112` renders `## DEEPER PROFILE SIGNALS`, returns `''` when nothing present. | The Q&A grounding block = `HONESTY_PREAMBLE` + `buildFeatureContext(profile)`. Pre-backfill users degrade by construction. |
| **Raw natal chart** | `UserProfile.natalChart` (`UserProfile.ts:97,569`) — **tropical/Placidus/TrueNode**, one per profile, lazily backfilled. NOT on the DTO. | The Timing Engine does **not** reuse this — it needs a **sidereal** natal, now produced + cached by **R9's isolated sidereal module** (§0/§5; `astrology-sidereal.service.ts`). R7 **reads** that artifact (adds only the per-question moment chart), rather than computing sidereal natal/dasha itself. |
| **Numerology computation** | `utils/numerology.ts` (`reduceToSingleDigit` master 11/22/33 `:72-92`; `getLifePathNumber` `:99-116`; `getPersonalYear/Month`), `utils/nameNumerology.ts` (`computeNameNumbers` trio `:66-76`), `services/numerology.service.ts` `ensureProfileNumerology` (lazy cache) + `planNumerologyUpdate`. Cached sub-doc `UserProfile.numerology` (`NumerologyNumbers`, `:452-468`). | Reuse for the cached numerology block — **Y-as-vowel RESOLVED (Sid 2026-07-16: always-vowel); see the §6 migration (`NUMEROLOGY_VERSION` bump + project-wide backfill).** |
| **Palm/face observation schema** | `FaceFeatureVector` (`types/shared.ts:458-515`), `HandFeatureVector` (`:567-612`) — **geometry-only, NO `lines` block** (palm lines are LLM flavor, R3 verdict). Stored on `UserProfile` as `faceFeatures`/`faceTraits`/`palmDominantFeatures`/etc. | The "wire-now-empty" Q&A observation blocks mirror these shapes and must **not** expect a `lines` block. |
| **Honesty / disclaimer** | `HONESTY_PREAMBLE` `prompts/shared/honesty-preamble.ts:9-41` (single source of data-integrity rules). Entertainment disclaimer is **per-prompt copy**, not centralized (e.g. `daily-insight.prompt.ts:195`). | Reuse `HONESTY_PREAMBLE`; add a Q&A per-surface entertainment line (final entertainment string = a D6 build task — decision PM-approved 2026-07-16, copy still to be produced). |
| **Continuity discipline (R6)** | `computeContinuityDelta` (pure) → `buildContinuityContext` (render) → spliced as INPUT context (`insight.service.ts:368-421`). Model never handed a shift the engine didn't produce. | The Timing Engine mirrors this exactly (engine produces the read; model phrases). The follow-up "last-N-turns" block mirrors the compute→render→splice pattern. |
| **AI logging** | R5's `logAiGeneration` → `ai_generations` (fire-and-forget, `aiGeneration.service.ts` + model `AiGeneration.ts`); `logAiFailure`. | `timing_log` is a new sibling collection following this exact fire-and-forget, never-throws pattern (§6). |
| **Shared types dual-home** | `packages/shared/types.ts` (`@shared/types`, mobile) hand-copied into `server/src/types/shared.ts` (Railway self-contained). | Every mobile-read Q&A DTO added to **both** files. Server-only computed types (the engine output) stay server-side (never a DTO). |

### What is NET-NEW (nothing to reuse — verified absent)

- **No `/api/qa` route group** (`routes/index.ts` — mount pattern: add `qa.routes.ts` → `app.use('/api/qa', qaRoutes)`; `router.use(authenticateToken)` then `router.post('/ask', …)`).
- **No `user.qa` counters, no monthly-reset cron** (`User.ts` — comp does *lazy reset-at-read*, no cron precedent; `node-cron ^4.2.1` in `jobs/pushScheduler.ts`, `schedule('0 0 1 * *', …)` = midnight-UTC-1st).
- **No 402 anywhere** — existing "limit/upgrade" gates return **403** (`subscription.middleware.ts:40-46`) or **429** (`name-update-rate-limit.middleware.ts:58`). 402 is net-new.
- **No device-identity storage** (only a diagnostic-log `deviceId` telemetry field, unrelated) and **no idempotency-key** handling. Both net-new.
- **No Timing Engine / dasha / sidereal** anything today (§0) — but per the R9-before-R7 inversion the **sidereal natal + dasha ladder are built by R9** (its `astrology-sidereal.service.ts`); **R7's net-new astronomy is only the per-question moment chart** (on R9's module) + the rule set.
- **No chat UI** on mobile (build fresh — NativeWind + Expo Router + Zustand); **no `expo-location`** (add + consent flow; no on-device geocoder — birth city is geocoded server-side, client sends `lat:0,lng:0`); **no `expo-application`** (add for `getAndroidId()`, permission-free).
- **No name-at-birth field** on profile (the full birth name lives on the `NameAnalysis` model; `numerology.nameUsed` stores the string a trio was computed from).

### Verdict — R7 is a DIFFERENT SHAPE from R1–R6

R1–R4 were extraction/data problems; R5 was prompt+routing+reliability; R6 was a temporal-delta woven into an existing surface. **R7 is a new endpoint + a new compute engine + a new mobile surface.** It is the first Build-27 requirement that (a) adds a brand-new astrology sub-engine (sidereal + dasha + moment chart), (b) adds user-facing mobile UI, and (c) introduces monetization machinery (caps, 402, device anti-farming). The empirical grounding is *reused*; everything around it is *built*.

---

## 3. Target architecture

```
POST /api/qa/ask   { question, conversationId?, deepInsight? }     (auth: bearer, auto-injected)
  │  server captures timestamp (server clock, to the minute — never client) + resolves location (§ location)
  ▼
[1] JUNK CHECK (client/gateway, pre-model)  → validation error, NO model call, NO credit
  ▼
[2] ROUTER — claude-haiku-4-5, structured-output classify → one of:
        reflective | timing | off-topic | unsafe | crisis     (router call NEVER affects credits)
  ├── off-topic / unsafe → generic decline (small cost, NO credit, no explanation)
  ├── crisis            → supportive + resources (NO credit, never the generic decline)
  └── reflective / timing ↓
  ▼
[3] TIER / CREDIT GATE (before the answer call)
        getEffectiveTier(user) → monthly question counter (+ Deep Insight sub-counter if deepInsight)
        over cap → 402 { error:'limit_reached', scope, tier, used, limit, resetsAt, upgrade{…} }
        idempotency-key dedup; per-user requests-per-minute cap (grief guard)
  ▼
[4] CONTEXT ASSEMBLY
        HONESTY_PREAMBLE + buildFeatureContext(buildUserInsightProfile(user))   ← the moat, both modes
        if timing: Timing Engine (§5) →
            Stage 2: sidereal moment chart (per-question, at timestamp+location)
                   + sidereal natal + running dasha stack (cached)
            rule set → internal read { indication, confidence, score, factors_plain[], window{…}, textures[], … }
            Stage 4: model receives the READ + factors_plain (never technique names / rule numbers)
        if carve-out: reflective answer + one professional-pointer sentence (still deducts — answer delivered)
  ▼
[5] ANSWER MODEL (tier-split, non-streaming to client; Fable streams server-side internally)
        via createSynthesisMessage (new 'qa' surface rows) — length var = deepInsight, mode var = router label
  ▼
[6] PERSIST: QaTurn (question, answer, mode, deepInsight, model+usage, feedback:null, conversationId?,
        timestamp, city-level location + fallback flag)  +  if timing: timing_log (full engine output, no sampling)
        deduct credit (server-side completion); refund ONLY on system failure; grace-window abort charges nothing
  ▼
[7] RETURN 200 { success:true, data:{ answer, answerId, conversationId?, mode, deepInsight, usage,
        remaining:{questions, deepInsight}, disclosure } }
```

**Response envelope decision (verify §17.3, recommendation given).** The dominant convention is `{ success:true, data:{…} }` (`reading.controller.ts:47-50`; mobile `api.ts` unwraps `response.data`). **Recommend: the 200 answer nests under `data`** (spec §7's flat shape lives inside `data`). For **402**, mirror the existing gate style (`subscription.middleware.ts` puts `requiredTier`/`currentTier`/`upgradeUrl` **top-level** alongside `success`/`error`) — so the 402 metadata sits top-level. (This is consistent with the repo's known top-level exceptions, e.g. the `verify-email` `verificationToken`.) Confirm the exact shape at build time.

**Model routing (every ID + param verified via `claude-api` skill):**

| Answer type | Model (exact ID) | Effort | Thinking | Build note |
|---|---|---|---|---|
| **Router / safety** | `claude-haiku-4-5` | — (Haiku 4.5 **rejects `effort`** — do NOT send) | none (fast 5-label classify; no thinking needed) | 200K ctx, $1/$5 MTok. Own lightweight call (structured output), NOT through `createSynthesisMessage`. Never affects credits. |
| **Free question** | `claude-sonnet-5` (newer than `claude-sonnet-4-6`) | medium (set explicitly) | adaptive **on by default** when `thinking` omitted | New routing row — this is NOT the current `CHEAP_MODEL` (`claude-sonnet-4-6`). ⚠️ Sonnet 5 uses a **new tokenizer (~30% more tokens)** and **rejects non-default `temperature`/`top_p`/`top_k`**. |
| **Premium / PP, regular** | `claude-opus-4-8` | medium | **Must set `thinking:{type:'adaptive'}` explicitly** — omitting it runs Opus 4.8 with NO reasoning step | The one routing item needing a deliberate build step. |
| **Deep Insight (any tier)** | `claude-fable-5` → fallback `claude-opus-4-8` | high (default) | always on (**omit `thinking`**; `{type:'disabled'}` and `budget_tokens` both 400) | Reuse R5's `fallbacks` beta verbatim. Handle `stop_reason:'refusal'` before reading content (already in `createSynthesisMessage`). |

- **Helper extension (not just table rows).** `createSynthesisMessage` today has only `fable`/`cheap` tiers, hides `effort`/`thinking` internally, and `cheap`=`claude-sonnet-4-6`. The **DI path reuses the `fable` tier unchanged** (Fable 5→Opus 4.8 via `fallbacks`). The **regular tiers must extend the helper**: free→`claude-sonnet-5` (a model the routing table doesn't yet reach) and paid-regular→`claude-opus-4-8` needing an **explicit** `thinking:{type:'adaptive'}` (omitting it runs Opus with no reasoning). Add these as new tiers/config in `resolveRoute` + the call path. Recommend **streaming any adaptive-thinking path** (Sonnet 5 adaptive-by-default; Opus 4.8 adaptive) to avoid idle-drop, even though the *client* response stays non-streaming.
- **Timing vs reflective does NOT change the model** — same tier model; the Timing Engine changes the *prompt contents* (the read + factors). Deep Insight on a timing question = fuller treatment (more factors, longer window), same style rules.
- **Non-streaming means client-facing.** The endpoint returns one JSON response. Server-side, the Fable/Opus Deep Insight path **still streams internally** via `createSynthesisMessage`'s `.finalMessage()` (R5 observed minutes-long Fable turns → non-streaming HTTP would hit the 10-min idle-drop). Streaming *to the client* is v1.1.
- **`max_tokens` (supersedes the dead PRD 3000/600):** set **comfortably above** the word target because **thinking tokens share the ceiling** — too tight truncates mid-sentence. Answer lengths: 150–250 words regular, 400–600 Deep Insight. Timing input grows +1.5–3K tokens (natal + sidereal + dasha + moment chart). **Claude Code sizes exact caps per model at build time** (do not assume PRD numbers). Directional: regular Opus/Sonnet answers ~4–8K `max_tokens`; Deep Insight Fable ≥16K, streamed.

---

## 4. Key decisions

| Decision | Recommendation | Why / caveat |
|---|---|---|
| **Tier-split answer routing** | **Extend** `createSynthesisMessage`/`resolveRoute` (not just add table rows): free→`claude-sonnet-5`, paid-regular→`claude-opus-4-8` with **explicit** `thinking:{type:'adaptive'}`, Deep-Insight→`claude-fable-5`→Opus (**DI reuses the existing `fable`/`fallbacks` wiring unchanged**). Router is a separate Haiku call outside the helper. | The helper hides `effort`/`thinking` and hardcodes `cheap`=`claude-sonnet-4-6`, so the two regular tiers need a new model/thinking config path; the DI path is a drop-in. Free is NOT the current `CHEAP_MODEL`. Keeps R5's single-source refusal/fallback/logging discipline. |
| **Caps + Deep Insight sub-caps** | Free 3 (1 DI teaser) / Premium 10 (3 DI) / PP 15 (8 DI); calendar-month reset, no rollover. Surface remaining DI count in the question-box UI on every tier. Free's teaser, once used, leaves the toggle **visible but locked** behind an upgrade prompt (the conversion surface — do not hide it). | **D3 APPROVED (PM, 2026-07-16) — final, not a gate.** Tight-then-loosen; the DI sub-cap (3 vs 8) is the real paid-tier differentiator → paywall copy leads with DI allowance. *Residual (config check): confirm annual $59.99/$89.99 map to the same monthly caps in RevenueCat.* |
| **Monthly reset: lazy-at-read + cron** | Primary authority = **lazy reset at the gate check** — store `{ monthKey:'YYYY-MM', questionCount, deepInsightCount }`; on each check, if `monthKey !== currentUtcMonth` reset to 0 first (mirrors the comp lazy-expiry precedent, immune to cron downtime). Add the `schedule('0 0 1 * *', …)` cron as belt-and-suspenders. | Spec §8 says cron; the repo has NO monthly-reset cron and DOES have a lazy-reset precedent. Lazy-first is more robust on a single Railway backend. |
| **402, not 429/403** | Net-new. Inline check in the qa controller/middleware returning `res.status(402).json({…})` with the §7 upgrade payload. Distinguish `scope:'questions'` vs `'deep_insight'`. | No 402 precedent exists; existing gates use 403/429. `express-rate-limit`'s per-user cap stays for the grief-guard RPM, separate from the monthly-cap 402. |
| **Rule-set-produces-the-read discipline** | The engine emits the directional read (§5 output contract); the model **only phrases** it. The model is never handed a verdict/shift the engine didn't produce (R6 non-fabrication, à la R2/R3 reconcile-pins-substance). | The single most important correctness invariant. Fixtures FX1–FX6 are the gate; a misclassification means the impl is wrong — escalate, don't retune. |
| **Follow-up context depth** | Last-N prior turns (recommend **N configurable, default ~6 turns / 3 Q&A pairs**), rendered via a continuity-style block spliced before the feature-context block. A follow-up costs a credit like any question. | **Pending D1 (v2 recommended default; non-blocking).** Bounds input cost; mirrors R6's compute→render→splice. |
| **Degradation** | Model 5xx/timeout → retry once w/ backoff (SDK `maxRetries` + R5 `withRetry` already present) → friendly "the stars are misaligned, try again"; **no credit, no raw error.** Pre-backfill users degrade by `buildFeatureContext` returning `''` for absent layers — never fabricate. | Fail-open + response-shape-preserving (no pre-release device path — rides the Internal Testing→promote cycle). |
| **Caching** | Cache the per-user **tropical natal + sidereal natal + dasha table + trait bands + numerology** (the stable Blueprint prefix) with `cache_control:{type:'ephemeral'}`; the **moment chart is per-question → NOT cacheable** (compute inline, after the breakpoint). Question text after the breakpoint too. | Model-specific floors: **Opus 4.8 = 4096 tokens, Fable 5 = 2048** (a prefix below the floor silently won't cache). **verify Sonnet 5's floor** — it is NOT in the skill's cached min-prefix table; measure with `count_tokens`. Repeated Q&A over one Blueprint is exactly the payoff R5 deferred to R7. |
| **Per-device anti-farming** | Registered account only (never guest) **and** per-device, at launch. Android: `Application.getAndroidId()` via **`expo-application`** (permission-free); **store only a salted hash** (raw never persisted; salt server-side, rotate on suspected compromise). Block DI if account **or** device-hash already claimed this month. **Fail-open** if ID unavailable. Purge on account deletion; purge block-list entries after 60 days inactivity. | **RESOLVED by handover §6** (approved, with the exact privacy-policy line + Play Data-safety declarations — folded into §6). iOS equivalent (IDFV + `revelia_*` SecureStore UUID via the `reviewStore` blob pattern) at iOS launch. |
| **Credit deduction + grace window** | Deduct **when the answer is generated** (server-side completion in v1). Refund **only on system failure** (Anthropic 5xx/timeout, unrecovered refusal, our exception before any content). **Grace window ~2s from request start:** a cancel within it **aborts the upstream model call** (`AbortController`), charges nothing, persists nothing. After the grace window: client cancel/disconnect does **not** refund and the answer **persists to history regardless**. **Idempotency key** prevents client-retry double-charge (net-new). Carve-outs deduct; junk/off-topic/unsafe/crisis/router never deduct. | Kept short + fixed so a v1.1 streamed partial can't be harvested. Idempotency-key store is net-new. |
| **Trade-secret repo split** | **DECIDED — S-R9f/D8 (PM, 2026-07-17):** the R7 Timing-Engine rule set **stays OUT of git** (tighter access) and loads at runtime via a **private-R2 `loadConfidentialConfig` loader R7 inherits** (distinct from R9's own prompt, which R9 committed to the private org repo + reads bundled via `loadConfidentialPrompt`). `server/config/timing/` holds only the LOCAL rule set + FX1–FX6 for dev/fixtures, **gitignored (fail-closed)**; the rule-set DATA is never committed. | ⚠️ **Code-fact to verify (NOT a posture decision — that's settled):** `loadConfidentialConfig` does **not** exist yet — only `loadConfidentialPrompt`, a bundled-file reader (`report.service.ts:199`) — so R7 likely **builds** the private-R2 loader. That wiring is a **Phase-B / pre-deploy** task; Step 0 runs LOCALLY and needs neither. |

---

## 5. The Timing Engine (R7's analog of R5's synthesis-call module / R2–R3's rules table)

> **Internal name only — never surfaced to users. Trade secret.** The rule set (handover §2) is **not reproduced** here or in the app repo; it lives in access-controlled server config (see §4). This section captures only the **build-facing seam + contracts** Claude Code plans around.

**Where it sits.** Router labels `timing` → **Stage 2** computes the sidereal moment chart (per-question, at server-timestamp + city-level location) + the user's **sidereal natal** + **running dasha stack** (**sidereal natal + dasha ladder are R9's — reused + cached; the moment chart is R7's, per-question** — see the dependency note below) → the rule set consumes those + the natal + dasha and emits an **internal directional read** → **Stage 4** hands the read to the answer model → the model writes user text. **Engine decides, model phrases** (R6 discipline).

**Dependency — R9 builds the astronomy; R7 extends it (2026-07-16 inversion).** The **sidereal natal + Vimshottari dasha ladder** are produced by **R9's isolated sidereal engine module** (`server/src/services/astrology-sidereal.service.ts`; `plans/build-27/R9-report.md §5`), implemented before R7. R7 **reuses** R9's cached sidereal natal + dasha ladder — selecting the **running MD/AD** from R9's full ladder — and **adds** only (a) the **per-question located moment chart** (computed through R9's module so its `set_sid_mode` set-then-reset lifecycle + byte-identical-tropical guard cover it) and (b) the **trade-secret rule set** (this section). **R7 inherits R9's sidereal module; R9 must keep the module's public surface stable for R7.**

**Fixed computation settings (must match the ephemeris service — all CONFIGURABLE on the existing engine per §0):** Lahiri sidereal, whole-sign houses, mean node, speed flags on (retrograde + stationary), Vimshottari on 365.25-day years.

**Output contract (engine → Stage 4) — build the pipeline to this shape (handover §2.5):**
```json
{ "category": "own_venture", "carve_out": false, "elective_timing_ok": false,
  "indication": "favorable | unfavorable | mixed", "confidence": 0.65, "score": 4,
  "factors_plain": ["2–3 short plain-language reasons, pre-translated (no technique names)"],
  "window": { "from": "2026-10", "to": "2027-01", "basis": "ad_boundary | station | transit | deadline" },
  "textures": ["revisit_after_station", "slow_durable", "avoid_dates_near_eclipse:2027-02-06,2027-02-20"],
  "tip_condition": "present only when mixed", "revisit_date": "present only when mixed" }
```

**Classification (handover §2.3):** net score S over the rules → **S ≥ +3 favorable, S ≤ −2 unfavorable, else mixed.** Confidence is internal only (never shown as a probability; drives answer hedging + logging). **Mixed = NO randomization in Build 27:** present both sides, name the single tipping condition, give a revisit date (= earliest window event). The randomized forced-binary tiebreak is **Build 28** (deferred, gated on the outcome-graded validation study; nothing randomized ships to users first).

**Carve-out gate runs FIRST** (handover §2.0): health outcomes, pregnancy/conception outcomes, medical choices, legal/financial decisions, another named person's job/livelihood, or a minor's future beyond temperament/learning → `carve_out=true`, skip the engine, route to reflective mode + a one-sentence professional pointer, and **deduct a credit** (a complete answer was delivered — not a decline). Sub-flag `elective_timing_ok`: pure scheduling of an already-decided procedure/trip/filing may run the engine with outcome claims suppressed (timing quality only).

**Never-expose list (hard-blocked from user output AND client-side strings):** prashna, horary, muhurta, lagna, bhava, karya, dasha, antardasha, nakshatra, tithi, amavasya, ayanamsa, upachaya, dusthana, kaudi — plus any rule number. The model translates everything to plain language ("your chart right now / the period you are in / the window ahead").

**Regression fixtures = the acceptance test (handover §3).** Six sealed sittings FX1–FX6 on the shared Monty Adams natal, with exact expected `indication` / `confidence (±0.05)` / `window.basis`, including the compound FX6 → **two verdict objects, never averaged.** **If a fixture misclassifies, the implementation is wrong — escalate before touching weights** (Sid's rule). **Priority order (Sid): implement the rule set against the fixtures FIRST** — everything else in the build is comparatively unblocked paperwork.

**Calibration logging (build now):** every timing question writes a `timing_log` row (§6) — full engine output object, **no sampling.** This is the future accuracy dataset (the most defensible long-term asset), admin-only, never user-exposed.

**Trade-secret handling (build implications):** rule set, routing logic, prompt corpus, calibration data are server-side only; excluded from client bundles + analytics payloads + off-server logs. Marketing max claim: "answers are timed to the moment of asking." Support never explains derivation.

---

## 6. Data model / shared types

- **`QaTurn` (new collection, MongoDB, indexed by user):** `{ userId, conversationId?, question, answer, answerId, mode:'reflective'|'timing', deepInsight:boolean, model, usage, feedback:('up'|'down'|null), timestamp (server, to the minute), location:{ city, source:'device'|'last_known'|'birth', fallbackFlagged:boolean }, createdAt }`. Captured on **every** question (all types) so the calibration set is complete from day one.
- **`user.qa` sub-doc (new on `User`/`UserProfile`):** `{ monthKey:'YYYY-MM', questionCount, deepInsightCount }` — lazy-reset when `monthKey` rolls over (§4). Designed so a **future credit pack** just increments the counter (no schema change) — stub only, no purchase flow.
  - ⚠️ **Convention note (verified 2026-07-16).** The repo's *existing* monthly caps are enforced by **document-counting within a calendar-month range** (`getCurrentMonthRange` + `NameAnalysis.countDocuments`, `reading.controller.ts:228-248`), which needs **no reset job at all**. R7 deliberately chooses a **stored counter** instead, because a future **credit-pack top-up cannot be represented as a document count** — the stored counter is exactly what makes a pack a no-schema-change increment (spec §8/§10). Trade-off accepted. **Boundary caveat:** `getCurrentMonthRange` uses **server-local** month boundaries; R7's `monthKey` + the `0 0 1 * *` cron are **UTC** — keep the reset boundary consistently **UTC** and do not mix the two conventions.
- **`timing_log` (new collection, admin-only, never user-exposed):** `{ questionText, timestamp, location, engineOutput (the FULL §5 object: indication, confidence, score, factors, window, textures, …), answerId, outcome:null (until graded), createdAt }`. **No sampling — log every timing run.** Mirror R5's `AiGeneration` model + `aiGeneration.service.ts` fire-and-forget, never-throws pattern (never blocks/alters an answer). Admin-only raw-read flag for the owner's test interface.
- **Sidereal timing artifact (cached on `UserProfile`) — built by R9, read by R7:** `siderealNatal` (Lahiri/whole-sign/mean-node chart) + `dasha` (Vimshottari **ladder**: all MD + AD sub-periods; R7 selects the running MD/AD) + version. **Computed + cached by R9's isolated sidereal module** (§0/§5; `astrology-sidereal.service.ts`), alongside the existing tropical `natalChart` (UNCHANGED), recomputed on birth-data change / lazily backfilled. **R7 does NOT compute or cache this — it reads R9's artifact** and adds only the per-question moment chart (never cached). (R9 owns the field shapes; R7 depends on them staying stable.)
- **Numerology cache (extend existing, from handover §5):** the spec's block = `life_path, birthday_number, expression, soul_urge, personality, mulank, bhagyank, personal_year_current`, computed **once at profile save**, cached alongside the natal chart, injected only when name-at-birth is on file.
  - ✅ **Y-as-vowel — RESOLVED (Sid, 2026-07-16): Y is ALWAYS a vowel, standardized project-wide.** The existing `utils/nameNumerology.ts` treated **Y as a CONSONANT** ("for simplicity", `:33-34`; `VOWELS={a,e,i,o,u}`); Sid's decision makes **Y always a vowel** the single project-wide rule (master 11/22/33 preserved). Implement by **changing the one canonical `computeNameNumbers` util** — add `y` to `VOWELS` — **not** a per-call mode and **not** a forked implementation: ONE numerology source, ONE rule. The derived Vedic fields remain net-new (no literal fields today): `mulank = birthday_number = reduceToSingleDigit(day)`, `bhagyank = getLifePathNumber(...)`, `personal_year_current = getPersonalYear(...)`.
  - 🔧 **Migration task (project-wide, NOT R7-only).** Y-as-vowel shifts **soul_urge + personality** (and expression edge cases) for existing users → **bump `NUMEROLOGY_VERSION` (`numerology.ts:5-11`) + deliberate backfill** (the R4 `numerologyVersion` policy). Touches the **single shared util** (`computeNameNumbers`/`nameNumerology.ts`) + **every numerology surface/consumer**: the cached `UserProfile.numerology` sub-doc, `NameAnalysis` (name-destiny), career, daily/weekly/monthly insights via `buildUserInsightProfile`, compatibility, and R7's cached Q&A numerology block. Reuse R4's `backfill-numerology.ts` (`:dry` → real) + read-time lazy re-derive (`numerology.service.ts` `ensureProfileNumerology`). ⚠️ **User-visible value change** — some users' soul-urge/personality numbers change on next generation; acceptable (correctness), note it like R4's deliberate value changes.
- **New onboarding field: `nameAtBirth`** (optional string on `UserProfile`, dual-homed) with a one-line explanation that it unlocks number-based insight. Numerology injects only when it's on file. Mobile: one new optional `<Input>` card in `mobile/app/(capture)/birth-data.tsx` (alongside Full Name), added to the profile payload + `userStore` type. No new screen.
- **Palm/face observation blocks (schema now, data later):** wire the storage schema + Stage-4 injection now, populated only after capture ships (FACE = adult + explicit opt-in). Mirror `FaceFeatureVector`/`HandFeatureVector` — **no `lines` block** (geometry-only; palm lines stay LLM flavor).
- **Device anti-farming claim record (new):** `{ deviceHashSalted, monthKey, claimedDeepInsight:true }` (raw ID never persisted; salt server-side). Also gate per-account. Fail-open if ID unavailable. Retention: life of account, purge on deletion; purge block-list entries after 60 days inactivity.
- **Idempotency store (new):** key → `{ answerId, createdAt }` so a client auto-retry returns the same answer without double-charging.
- **Shared types:** any mobile-read Q&A DTO (`QaTurn` response shape, `remaining` object, 402 payload, `nameAtBirth`) added to **both** `packages/shared/types.ts` and `server/src/types/shared.ts`. The engine output object is server-only (never a DTO).

---

## 7. Prompt & grounding strategy

**One fixed system prompt, two variables** — answer **length** (Deep Insight toggle) and answer **mode** (reflective/timing from the router). Do not maintain near-duplicate prompts. Reuse `HONESTY_PREAMBLE`; splice `buildFeatureContext(profile)` for the moat; splice the Timing Engine read (timing mode); splice the last-N-turns block (follow-ups).

**✅ Grounding scope = CONDITIONAL FULL-BLUEPRINT GROUNDING (handover §5, RESOLVED).** Stage 4 assembles whatever layers exist: **CHART_BLOCK + TIMING_BLOCK always**; **NUMEROLOGY_BLOCK** when name-at-birth is on file (cached); **PALM_BLOCK + FACE_BLOCK** wired now, populated after capture (face = adult + opt-in). Pre-backfill users degrade gracefully (`buildFeatureContext` omits absent sections, returns `''` if none — never fabricate).

**Stage-4 citation rule to ADD (handover §5):** the chart stays **primary**; cite **at most one numerology reference and one palm/face reference per regular answer (two each for Deep Insight)**, only when genuinely relevant, and a numerology/palm citation **must sit beside a chart placement, never replace it.**

**Reflective interpretation guidance — PASTE VERBATIM into the Stage-4 placeholder (handover §4):**
> Astrological interpretation guidance: Ground every answer in one to three specific placements, never more; a laundry list reads as generic. Choose them by question category, in this priority order. Love and relationships: natal Venus (sign and house), the 7th house and its ruler, the Moon; then any current transit touching them. Career and work: the 10th house and its ruler, Saturn, the Sun; then current transits to the 10th or its ruler. Self, identity, direction: the Sun, Moon, and Ascendant triad, weighted toward whichever the question echoes. Money: the 2nd house and its ruler, Venus, Jupiter; transits second. Family and home: the Moon, the 4th house and its ruler. Purpose and growth: Jupiter, the 9th house, the North Node. Energy, conflict, drive: Mars by sign and house. Always natal placements first, current transits second and framed as "this period" or "the months ahead," never as fixed fate. When timing-period context is present in the data, weave at most one sentence of it in plain language. If the chart genuinely says little about the question, say exactly that in one warm sentence and answer what it does say. Banned genericisms: statements true of anyone ("you are intuitive," "big changes are coming," "trust the process"), sign-only cliches without a house or aspect attached, and any claim not traceable to a supplied data point. Degree numbers only when a transit is exact; otherwise sign and house language. One question, one arc: direct answer, the one or two placements behind it, one forward-looking line.

**Canonical v2 system-prompt draft — use this string, do not re-derive (spec §11).** `{chart/Blueprint data}` is injected below; the block-conditional wording (above) replaces the astrology-only framing:
```
You are the astrologer voice for Revelia. You answer a user's personal questions using their
real chart data provided below. Voice: warm, direct, plain-spoken; a thoughtful person, not a
textbook or a fortune cookie; no jargon the user has no reason to know. Rules: use only the data
provided, never invent placements; ground every claim in this user's specific placements or
timing periods, never in statements that could apply to anyone; stay within astrology and
personal reflection; no medical, legal, or financial advice, and if the question truly needs one of
those, say so briefly and answer only the reflective side; if the data says little about what was
asked, say so honestly.
REFLECTIVE MODE: answer the question directly first, then the reasoning from their placements
and transits.
TIMING MODE: open with the directional read in plain words (the timing supports this, the timing
argues for waiting, or the picture is genuinely mixed), then the one or two strongest reasons
phrased in plain language, then a concrete window (a month or date range) for action or for
revisiting. If the picture is mixed, name what would tip it and when to look again; never force a
yes or no.
NEVER expose methodology: do not use or explain the words horary, prashna, muhurta, lagna,
dasha, nakshatra, or any technique name; translate everything into plain language (your chart
right now, the current period you are in, the window ahead).
CARVE-OUTS: for questions about health outcomes, pregnancy or conception outcomes, medical
choices, legal or financial decisions, another named person's job or livelihood, or anything
involving a minor's future beyond temperament and learning style, give no directional call:
answer the reflective side warmly, and point to the right professional in one sentence.
Length: 150 to 250 words regular, 400 to 600 words Deep Insight.
```
> **D6 (PM-APPROVED 2026-07-16 — decision made; copy is a build task, not a gate):** use the draft system prompt string above. Final strings still to be produced before wiring — entertainment disclosure, 402 upgrade-CTA, trade-secret marketing line. **The Off-Topic/Unsafe/Crisis Guide (`plans/build-27/R7-OffTopic_Unsafe_Crisis_Guide.pdf`) is PM-APPROVED + DELIVERED as-is: a single general-wording, number-free, hardcoded string that supplies the crisis text + the off-topic/unsafe decline strings + the Haiku classifier prompt + 10 classifier fixtures + the routing logic. The guide IS the content — wire it verbatim; never model-generate, invent, or stub crisis content. Residual = ONLY Sid's one-line confirm that the number-free wording is FINAL (not a stopgap), which gates the Phase-B crisis-block wiring, NOT Phase A.**

**Disclosures & crisis (spec §13):** entertainment disclosure on every answer (draft: *"AI-generated guidance based on astrological tradition. For entertainment purposes only."*); never claim a real psychic (Apple 5.1.1 + Google liability); crisis (self-harm/suicide) → supportive + resources, never the generic decline. **The crisis text is DELIVERED in the PM-approved Off-Topic/Unsafe/Crisis Guide (`plans/build-27/R7-OffTopic_Unsafe_Crisis_Guide.pdf`) as a single general-wording, number-free, hardcoded string (deliberately NOT a region-by-region resource list) — the guide also supplies the off-topic/unsafe decline strings, the Haiku classifier prompt, 10 classifier fixtures, and the routing logic. The guide IS the content: wire it verbatim, never model-generate/invent/stub. Residual = ONLY Sid's one-line "wording is FINAL" confirm, gating the Phase-B crisis-block wiring, not Phase A.** Never name or hint at the timing methodology in UI/marketing/App-Store/support.

---

## 8. Sequencing (Phase A engine-first → B Premium → C free → D deferred)

> **⛔ Cross-build sequencing (2026-07-16): R9 (Personalized Cosmic Report) is implemented BEFORE R7** and builds the **isolated sidereal engine module** R7 reuses — sidereal natal + Vimshottari dasha ladder + the process-global `set_sid_mode` set-then-reset lifecycle + the byte-identical-tropical regression guard (`server/src/services/astrology-sidereal.service.ts`; `plans/build-27/R9-report.md §5`). **R7 REUSES + EXTENDS it** (adds only the per-question moment chart + the rule set); it does **not** build the sidereal compute from scratch. **R9 must keep the module's public surface stable for R7.**

**Phase A — build (server + mobile), no deploy; verify in local harnesses (no pre-release device path).**
0. **Engine against fixtures FIRST (Sid's priority) — on TOP of R9's sidereal module.** R9 (shipped before R7) already provides the sidereal natal + dasha ladder + `set_sid_mode` lifecycle + byte-identical-tropical guard (`astrology-sidereal.service.ts`, `R9-report.md §5`). **R7 REUSES it**: select the running MD/AD from R9's ladder and add only the **per-question located moment chart** (through R9's module) + the **rule set** (access-controlled server config) + carve-out gate to the §5 output contract — do **not** rebuild the sidereal natal/dasha. **Gate: FX1–FX6 reproduce** (indication exact, confidence ±0.05, window basis; FX6 → two objects). *If a fixture misclassifies, escalate — do not retune.* Nothing downstream is sized until this passes. **Dependency: R9 must keep the sidereal module's public surface stable for R7.**
1. Router (Haiku, 5 labels + structured output) + safety branches (off-topic/unsafe/crisis).
2. Context assembly reusing `buildUserInsightProfile`/`buildFeatureContext` + the conditional-blueprint blocks + Stage-4 citation rule + reflective guidance paste.
3. Answer routing: new `SynthesisSurface` rows (Sonnet 5 / Opus 4.8-adaptive / Fable 5-DI) through `createSynthesisMessage`.
4. Caps + DI sub-caps + 402 + upgrade payload + lazy monthly reset (+ cron) + idempotency + grace window + per-device anti-farming.
5. Persistence: `QaTurn` + `timing_log` (full object, no sampling) + `user.qa` counters + 👍/👎.
6. Numerology cache extension (**Y-always-vowel**, Sid 2026-07-16 → `NUMEROLOGY_VERSION` bump + project-wide backfill, §6) + `nameAtBirth` onboarding field + palm/face empty schema.
7. Mobile: chat UI (fresh), question-box with remaining-question + remaining-DI counts, Deep Insight toggle (locked-behind-upgrade state for free after teaser), device-location consent flow (`expo-location`), `expo-application` device-id, 402→paywall CTA. Reuse R6's deferred Option C (continuity card + CTA) here.
8. Prompt engineering against the structured Blueprint; tsc clean both sides each step.

**Phase B — soft-launch to Premium only (Internal Testing).** Collect 👍/👎 + **week-one token logging** (the cost gate); refine prompts. (D3b: phased B-before-C so the free→paid lift is measured cleanly.)

**Phase C — open the free tier** (per D3 caps 3/1). Watch free→paid conversion (the headline metric); the free DI teaser → locked toggle is the conversion surface.

**Phase D — DECISION, do not build now (D4).** Beyond-cap monetization: v2 **credit packs** *or* PRD **$19.99 unlimited PP Pro** — build when ~3–5% of PP users consistently hit cap. **Build now: only the counter, stubbed so a pack later just increments it (no schema change).**

**Release mechanics (`dev-notes/workflow.md`):** backend → `main` (Railway auto-deploys); mobile → `feature/build-27`, merged at release; single AAB promotes Internal Testing → Production. **No pre-release device-test path** (single live-prod Railway backend + hardwired APK) → keep R7 **fail-open + response-shape-preserving**; verify as much as possible in local harnesses (mirrors R1–R6). Device pass rides the release cycle.

---

## 9. Passing criteria (R7-specific)

- [ ] **§17.1 spike GO recorded** (this doc §0) — Moshier reproduces Lahiri sidereal + whole-sign + mean node + speed + dasha with no new libs/`.se1`. **Engine gate: FX1–FX6 reproduce** (indication exact, confidence ±0.05, window basis; FX6 → two objects, never averaged).
- [ ] **Timing reads are non-fabricated** — engine-produced, model-phrased (à la R6): the answer model is never handed a verdict/shift the rule set didn't emit; never surfaces a technique name or rule number (never-expose list enforced).
- [ ] **Multi-modal grounding** — reflective answers cite ≥1 specific placement / face trait / palm trait / numerology number; timing answers add a plain-language directional read + a concrete window grounded in the user's real periods. **Generic filler = failure (20-question acceptance test).**
- [ ] **Caps + 402** — Free 3 (1 DI) / Premium 10 (3 DI) / PP 15 (8 DI); lazy monthly reset (+ cron); over-cap → **402** (not 429/403) with upgrade payload + `scope`; `getEffectiveTier` honored (comp grants). Credit deducts on completion; refund only on system failure; grace-window abort charges nothing; idempotency prevents double-charge.
- [ ] **Per-tier cost ceilings + week-one token logging** (replaces the DEAD PRD *avg-cost < $0.008* + 3000/600 criteria). Directional ceilings: Free ~$0.20/mo, Premium ~$1.25/mo, PP ~$2.35/mo (vs $7.99/$12.99) — **confirm with week-one token logging before any pricing decision.**
- [ ] **Per-model latency targets** (replaces the flat PRD *<4s*): realistic for Sonnet 5 / Opus 4.8 regular; **NOT** for Fable 5 Deep Insight (minutes-long turns → strong loading UX; argues for v1.1 streaming). Re-set per model, not one number.
- [ ] **App-Review disclosures** — entertainment disclosure on every answer; never a real psychic; crisis path (D6 PM-approved; the crisis / off-topic / unsafe strings are DELIVERED in the PM-approved Off-Topic/Unsafe/Crisis Guide — hardcoded, number-free, wired **verbatim**, never model-generated; residual = only Sid's one-line "wording FINAL" confirm, gating the Phase-B crisis-block wiring, not Phase A); no methodology exposure anywhere. (iOS later; Android first.)
- [ ] **Graceful degradation** — pre-backfill users personalize from present layers only (no fabrication); model 5xx/timeout → retry once → friendly message, no credit, no raw error.
- [ ] **Zero regression** in shipped features; `tsc --noEmit` clean on mobile AND server each step.

---

## 10. Risks / open questions

- **#1 Grounding vs generic filler.** The whole moat. Mitigate with the Stage-4 citation rule + reflective guidance + the 20-question acceptance test; watch 👍/👎.
- **#2 Pre-backfill degradation.** Face/palm blocks are wired-now-empty; numerology needs name-at-birth. Many early users have only chart + partial data → answers lean on chart until backfills land. `buildFeatureContext` degrades honestly; don't over-promise the four-layer moat in copy before backfills.
- **#3 Fable Deep Insight latency/UX.** R5 saw minutes-long Fable turns; non-streaming client + slow generation = a hard loading-UX problem and the strongest argument for prioritizing v1.1 streaming for DI. Free's 1/mo DI teaser makes a bad first impression costly.
- **#4 Astrology-compute feasibility.** ✅ De-risked by the §0 spike (GO). Residual risk: **fixture reproduction at Moshier precision** — if FX1–FX6 miss, escalate (impl bug), don't retune; and confirm the sidereal Asc/dasha don't secretly need `.se1` arc-second precision (the spike says no, but the fixtures are the proof).
- **#5 Abuse / rate-limit edge cases (D9 / Claude Code to specify):** concurrent in-flight double-spend (idempotency + atomic counter increment); mid-month tier change; comp tier; reset timezone (UTC); **answer succeeded but persist failed** (recommend: still return the answer, log the persist failure, don't refund — the user got value); grace-cancel griefing (per-user RPM cap).
- **#6 Trade-secret leakage.** Mitigated per **S-R9f/D8**: the rule set stays **out of git** (private-R2 `loadConfidentialConfig` loader at runtime) and the handover + `server/config/timing/` are **gitignored (fail-closed)** so a stray `git add -A` can't commit them; excluded from client bundles / analytics / off-server logs; never imported into mobile; the never-expose list enforced in the answer prompt AND scrubbed from any client-visible string.
- **#7 Numerology Y-as-vowel — RESOLVED (Sid 2026-07-16: always-vowel, project-wide, §6).** Residual risk is a **project-wide value change** (soul_urge/personality shift for some users) via a `NUMEROLOGY_VERSION` bump + backfill — run the backfill `:dry` first and note the change like R4's deliberate value changes; not an R7-only migration.
- **#8 Caching floor for Sonnet 5 unknown.** Not in the skill's cached table — measure with `count_tokens`; if the Blueprint prefix is below the floor it silently won't cache (cost, not correctness).
- **#9 Location consent + privacy (D7 — PM-approved; consent copy + privacy-policy are build/legal artifacts to produce, not a gate).** Device-location capture per question needs a consent flow + privacy-policy change (legal). Interim: a fallback-to-birth-city path can ship without device consent.

---

## 11. Decisions & approvals (spec §16, restated; PM-approved items are build tasks, not gates)

**Status after Sid's 2026-07-14 handover + PM approval (2026-07-16).** ✅ **RESOLVED — do not re-raise:** **D2** (Timing rule set + six fixtures + reflective mapping delivered — Sid's priority: implement against the fixtures first); **D5** (per-device anti-farming approved as proposed, with the exact privacy-policy line + Play Data-safety declarations — folded into §4/§6); and the **grounding scope** (conditional full-blueprint, §7).

**✅ PM-APPROVED (2026-07-16) — no longer open Sid gates; the residual artifacts are ordinary build tasks, NOT decision gates:**
- **D3 — Question caps + Deep Insight sub-caps — APPROVED (PM).** Free 3 (1 DI) / Premium $7.99 → 10 (3 DI) / PP $12.99 → 15 (8 DI), calendar-month, no rollover are **final**. *Residual build task (config check, not a gate):* confirm the annual plans ($59.99 / $89.99) map to the **same monthly caps** in the RevenueCat config.
- **D6 — Copy sign-off — APPROVED (PM).** *Residual build/content tasks (produce before wiring, not gates):* (a) final **entertainment disclosure** string; (b) final **402 upgrade-CTA** string; (c) final **trade-secret marketing line** ("timed to the moment of asking" as the max claim). **(d) ✅ Off-Topic/Unsafe/Crisis Guide — PM-APPROVED + DELIVERED** (`plans/build-27/R7-OffTopic_Unsafe_Crisis_Guide.pdf`): a single general-wording, number-free, hardcoded string supplying the crisis text + off-topic/unsafe decline strings + the Haiku classifier prompt + 10 classifier fixtures + the routing logic. **The guide IS the content — wire it verbatim; never model-generate, invent, or stub.** Residual = ONLY **Sid's one-line confirm that the number-free wording is FINAL** (not a stopgap), which gates **the Phase-B crisis-block wiring, NOT Phase A.**
- **D7 — Location consent UX + privacy-policy update — APPROVED (PM).** *Residual build/legal artifacts (produce before the location feature ships, not gates):* the consent copy + the privacy-policy change. The birth-city fallback interim stands (ships without device consent).

**Non-blocking (decide during the build):**
- **D1** — follow-up context depth (last-N turns; v2-recommended default ~6 turns).
- **D3b** — free tier from day one vs phased (recommend phased B-before-C).
- **D4** — beyond-cap monetization direction (credit packs vs $19.99 PP Pro) — sets how the counter is stubbed; recommend credit packs.
- **D8** — Swiss Ephemeris commercial license [likely moot per §0 — Moshier needs none]. Confirm with Sid that it's not required for R7's sidereal/dasha use.
- **D-routing** — confirm both paid tiers use the same models (Opus regular, Fable DI); the differentiator is the DI sub-cap, not the model.

---

## 12. Files in scope (checklist)

**Server**
- `server/src/routes/qa.routes.ts` (NEW — `router.use(authenticateToken)`, `router.post('/ask', …)`) + mount in `routes/index.ts` (`app.use('/api/qa', qaRoutes)`).
- `server/src/controllers/qa.controller.ts` (NEW — pipeline orchestration; 402 gate; grace window/`AbortController`; idempotency; deduction).
- `server/src/services/qa.service.ts` (NEW — junk check, router call, context assembly, answer call, persistence).
- `server/src/services/astrology-sidereal.service.ts` (**REUSE — built by R9**, `R9-report.md §12`): R7 consumes R9's isolated sidereal engine module (sidereal natal + Vimshottari dasha ladder + the `set_sid_mode` set-then-reset lifecycle + byte-identical-tropical guard). **R7 does NOT rebuild these.** R7's only astronomy addition is the **per-question located moment chart**, computed **through** this module (composing `computePositions`+`toJulianDayUT`+`houses_ex('W')` at the question time + lat/lng, with the numeric speed / stationary threshold) — added as a new method on R9's module or a thin R7 caller of it, **never** by re-issuing `set_sid_mode` from R7. **R9 must keep this module's public surface stable for R7.**
- `server/src/services/astrology.service.ts` (**untouched by R7** — R1's tropical natal/transit path; R9 already exposed the primitives its sidereal module needs).
- `server/src/services/insight.service.ts` (EXTEND — **export `buildUserInsightProfile`** (currently a private `async function` at `:73`) so the Q&A context assembly reuses the four-set assembly + lazy backfill instead of replicating it).
- `server/src/services/timing-engine.service.ts` (NEW — R7's own: takes R9's sidereal natal + dasha ladder (**selects the running MD/AD**) + the per-question moment chart, applies the rule set, emits the §5 output contract, runs the carve-out gate. Does **not** compute the sidereal natal/dasha — that's R9's module).
- `server/config/timing/` (rule set + FX1–FX6 + fixture natal = **gitignored DATA, never committed**; **not reproduced in this plan**). Runtime = the private-R2 `loadConfidentialConfig` loader per **S-R9f/D8** (Phase-B; verify-or-build — R9 only has `loadConfidentialPrompt`). Step 0 commits the ENGINE CODE + harness, not the data.
- `server/src/services/synthesis-routing.ts` (EXTEND — DI-Fable-5 is a drop-in `SynthesisSurface` row on the existing `fable` tier; free-Sonnet-5 and paid-Opus-4.8 need a NEW model/thinking config path in `resolveRoute`/`createSynthesisMessage` — the helper currently exposes no `effort`/`thinking` param and hardcodes `cheap`=`claude-sonnet-4-6`).
- `server/src/services/qa-router.service.ts` (NEW — Haiku 5-label structured-output classify; never affects credits).
- `server/src/services/timingLog.service.ts` + `server/src/models/TimingLog.ts` (NEW — mirror R5's `aiGeneration.service.ts` / `AiGeneration.ts` fire-and-forget).
- `server/src/models/QaTurn.ts` (NEW) + `server/src/models/User.ts` / `UserProfile.ts` (EXTEND — `qa` counter sub-doc, `siderealNatal`+`dasha` cache, `nameAtBirth`, device-hash claim record, idempotency store — or separate collections).
- `server/src/services/numerology.service.ts` / `utils/nameNumerology.ts` (EXTEND — **add `y` to `VOWELS` (Y-always-vowel, Sid 2026-07-16)** + `mulank`/`bhagyank`/`birthday_number`/`personal_year_current` derived fields; keep ONE source; **bump `NUMEROLOGY_VERSION` + project-wide backfill** — see §6 migration).
- `server/src/scripts/backfill-numerology.ts` (RE-RUN — `:dry` → real for the `NUMEROLOGY_VERSION` bump; recomputes the name trio across all users/surfaces, not R7-only).
- `server/src/jobs/pushScheduler.ts` (EXTEND — `schedule('0 0 1 * *', …)` monthly reset, belt-and-suspenders to lazy reset).
- `server/src/prompts/qa.prompt.ts` + `prompts/shared/` (NEW — system prompt (§7), reflective-guidance paste, Stage-4 citation rule; reuse `HONESTY_PREAMBLE`; add per-surface entertainment line).
- `server/src/config/production.ts` (EXTEND — per-user Q&A RPM grief-guard limiter).
- Env docs (CLAUDE.md table): note the salt for the device hash (server-side, rotatable).

**Mobile**
- `mobile/app/(main)/` chat route (NEW — chat UI, question box with remaining-question + remaining-DI counts, Deep Insight toggle + locked-behind-upgrade state, 402→paywall CTA). Folds in R6's deferred Option C (continuity card + CTA).
- `mobile/app/(capture)/birth-data.tsx` (EXTEND — one optional `nameAtBirth` Input card).
- `mobile/lib/api.ts` (EXTEND — `askQuestion(...)`; bearer auto-injected; **base URL already ends in `/api`** so the client path is `/qa/ask`, not `/api/qa/ask`; the axios client has no SSE → client stays non-streaming v1).
- `mobile/store/reviewStore.ts` (WIRE — fire the already-reserved `recordMeaningfulAction('astrologer:<YYYY-MM-DD>')` seam (`reviewStore.ts:159-167`) from the chat surface for the in-app-review ladder; do NOT add per-screen review logic — CLAUDE.md rule).
- `mobile/lib/constants.ts` (EXTEND — `qaChat` in `FEATURE_ACCESS` + Q&A limits in `FREE_TIER_LIMITS`).
- `mobile/store/` (NEW qa/conversation store; device-id via `expo-application`; SecureStore UUID for the iOS IDFV fallback via the `reviewStore` blob pattern).
- Location: **add `expo-location`** (config-plugin, EAS-compatible) + consent flow + copy; `app.json` Android location permission (iOS already has a leftover `NSLocationWhenInUseUsageDescription`).
- Device-id: **add `expo-application`** (`getAndroidId()`, permission-free).
- `packages/shared/types.ts` (EXTEND — dual-home every mobile-read Q&A DTO with `server/src/types/shared.ts`).

---

## 13. Phase-A implementation CHARTER — ordered, individually-runnable steps

> **Status (2026-07-22): R7 UNBLOCKED — R9 complete (owner-confirmed + code-verified).** R9 shipped the isolated sidereal module R7 was always going to reuse and already ran the D1 numerology migration. This section converts §8 Phase A into discrete steps, each = **{ goal · files (from §12) · acceptance · dependencies }**, mirroring `R9-report.md §14`. **Engine-first per Sid.**
>
> **Standing rules (every step):** (1) `tsc --noEmit` clean on **mobile AND server** each step (the old §8-step-8, now a gate not a step); (2) **prod-dark** — no deploy in Phase A; verify in **local harnesses** (single live-prod Railway + hardwired APK ⇒ no pre-release device path); keep R7 **fail-open + response-shape-preserving**; (3) **R7 REUSES R9's `astrology-sidereal.service.ts`** — never rebuild sidereal natal/dasha, never re-issue `set_sid_mode`; (4) inherited seams re-verified at build (SDK `^0.110.0`; `createSynthesisMessage`/`synthesis-routing.ts` + `fallbacks` beta; `buildUserInsightProfile`/`buildFeatureContext`); model IDs re-checked via the `claude-api` skill.
>
> **✅ Pre-charter confirmations (2026-07-22, code-verified):** R9's module surface = `computeSiderealChart(NatalChartInput)→SiderealChart` (owns `set_sid_mode` set-then-reset in a synchronous critical section w/ `finally` reset; accepts arbitrary date/time/lat/lng ⇒ **this is R7's moment-chart primitive**), `computeVimshottariDasha(...)→VimshottariDasha` (MD+AD **ladder** ⇒ R7 selects the running MD/AD), `computePanchanga`/`computeDignities`/`computeYogas`/`computeSiderealTransits`. **Numerology migration DONE by R9** — `nameNumerology.ts:19` `VOWELS={a,e,i,o,u,y}`, `numerology.ts:11` `NUMEROLOGY_VERSION='2.0.0'` (R7 inherits, does NOT re-migrate). `server/config/timing/` does **not** exist yet (R7 Step 0 creates it).

### ENGINE GROUP (build FIRST — Sid's priority; gates all downstream sizing)

**Step 0 — Timing Engine on the six fixtures (reuse R9; add moment chart + rule set).**
- **Goal:** an internal directional-read engine that, for a router-labeled `timing` question, emits the §5 output contract and **reproduces FX1–FX6**.
- **Files:** `server/src/services/timing-engine.service.ts` (**NEW — the ENGINE CODE + a POSTURE-AGNOSTIC loader** that reads the rule set from config/env, **fail-closed if absent**: carve-out gate FIRST → consumes R9's sidereal natal + dasha ladder (**selects running MD/AD**) + the per-question moment chart → applies the rule set → emits the §5 contract) + a LOCAL fixture harness; `server/config/timing/` (rule set + FX1–FX6 + fixture natal — **gitignored DATA, NOT committed**); `server/src/services/astrology-sidereal.service.ts` (**REUSE ONLY** — `computeSiderealChart(...)` moment chart + sidereal natal, `computeVimshottariDasha(...)` ladder; **do NOT modify; do NOT re-issue `set_sid_mode`**). Step 0 **commits the engine code + harness, NEVER the rule-set data.** *(The private-R2 `loadConfidentialConfig` runtime loader per S-R9f/D8 is a Phase-B/pre-deploy task — see Dependencies.)*
- **Acceptance:** **FX1–FX6 reproduce — `indication` exact, `confidence` ±0.05, `window.basis` matches; FX6 → two verdict objects (never averaged)**; carve-out gate runs first (`elective_timing_ok` sub-flag); never-expose list enforced. **A fixture miss = an implementation bug → ESCALATE, do NOT retune weights (Sid's rule).** Local harness only (no deploy).
- **Dependencies:** R9 ✅ (surface confirmed); the confidential rule set + FX1–FX6 are on the on-disk handover (gitignored). **Runtime posture already DECIDED — S-R9f/D8: out-of-git + private-R2 `loadConfidentialConfig` loader (NOT commit-to-repo).** Step 0 is **posture-agnostic + LOCAL** (reproduces FX1–FX6 against the on-disk handover; touches no prod runtime) → **NOT blocked on posture.** **Phase-B/pre-deploy owner action:** verify whether `loadConfidentialConfig` exists or R7 builds it (R9 only built `loadConfidentialPrompt`, a bundled-file reader), then wire the rule set via private R2. R9 keeps its module surface stable.

### PIPELINE GROUP

**Step 1 — Haiku router + safety branches.** *(✅ DONE-PARTIAL — committed `5ddfa27` 2026-07-23; `qa-router.service.ts` + `qa-router-fixtures.check.ts`. Home-verified: live 15/15 (10 guide + 5 adversarial route-wins), enum zero-drift 35 key-for-key vs on-disk rule-set.json, strings verbatim, own Haiku call, fail-safe→reflective, tsc clean. Crisis BUILT-not-shipped: `CRISIS_WORDING_FINALIZED=false` — NOT fully DONE until Sid's wording nod (S-R7b/D6); **Step 3 serving path must gate crisis on that flag**.)*
- **Goal:** 5-label classify (reflective / timing / off-topic / unsafe / crisis) + the decline branches; router **never** affects credits.
- **Category-derivation seam — RESOLVED (home, 2026-07-23):** the 5-label route does NOT name a topic category, but the engine needs one to pick the karya house (what drove FX3/FX6b). **Decision: emit `category` as a SECOND structured-output field on the SAME Haiku call** (`{ route, category }`) — not a second model call, not a keyword map (the Haiku call already happens → ~zero added latency/cost; a keyword map can't honor "unmapped → reflective + log"). `category` enum = the §2.1 karya-map keys (24) + the compound leaf keys (`traction_signs`, `scale_metric_within_6mo`) + the §2.0 carve-out categories + `elective_timing_ok` + `other`; consumed only when `route === 'timing'` (+ the engine's carve-out gate); kept single-source for Step 3's engine call. Fail-safe: unrecognized → `reflective`/`other`, never fail-open to timing. **Dual-field guardrails (folded into `§13b` 2026-07-23):** (1) `route` resolves FIRST and independently — a topically-shaped crisis/unsafe must route crisis/unsafe, category never dilutes the route; (2) `category` nullable unless `route === 'timing'` (never force-categorize crisis/unsafe); (3) committed adversarial route-wins fixtures beyond the guide's 10; (4) enum reconciled key-for-key against the on-disk `server/config/timing/rule-set.json` (`venture_scale` is both a map key and the compound parent; a near-miss silently drops to `other`).
- **Files:** `server/src/services/qa-router.service.ts` (**NEW** — `claude-haiku-4-5` structured-output classify; rejects `effort`, no thinking). Decline/crisis strings come from the **DELIVERED Off-Topic/Unsafe/Crisis Guide** (single general-wording, number-free, hardcoded string — the guide IS the content; do NOT invent/stub, do NOT build a region list). Router prompt/fixtures/strings are user-facing safety content → **committed normally** (NOT gitignored like the timing rule set).
- **Acceptance:** routes the guide's **10 classifier fixtures** correctly; router is a separate call that never deducts; crisis → supportive + the guide's resources string, never the generic decline.
- **Dependencies:** none (own Haiku call). ⚠️ **Crisis-block WIRING is Phase B and gated ONLY on Sid's one-line "wording is FINAL" confirm** — build the router + validate fixtures AHEAD on the assumed-approved crisis, but do NOT mark Step 1 DONE or let the crisis path reach prod until that nod is logged in `sid-signoff.md` (build-ahead, not ship-ahead). The Phase-A router skeleton + fixtures do **not** wait.

**Step 2 — Multi-modal context assembly (the moat).** *(✅ DONE — committed `380997d` 2026-07-24; `qa.prompt.ts` NEW + `insight.service.ts` export-only. Home-verified: one fixed prompt/two variables, FACE gate structural + fail-closed [gates FACE_BLOCK + moat face-bands], never-expose scrub throws, two-part frame splice, tsc both. ⚠️ 36/36 invariant harness UNCOMMITTED → add a committed test in/before Step 3.)*
- **Goal:** grounding = `HONESTY_PREAMBLE` + `buildFeatureContext(buildUserInsightProfile(user))` + conditional-blueprint blocks + the Stage-4 citation rule + the reflective-guidance paste (handover §4, in §7).
- **⛔ FACE_BLOCK adult+opt-in gate = STRUCTURAL SCHEMA FIELD wired now (not a comment).** A fail-closed `faceGate: { adultVerified: boolean; faceOptIn: boolean }` (both default false) on the context-assembly input; FACE_BLOCK emits ONLY when `faceOptIn && adultVerified && ageFromDob(birthData.date) >= 18` (independent DOB age-guard, R9 age-from-DOB precedent). Wired populate-empty NOW so the later capture step FLIPS the flags, never ADDS the gate → face can never be wired for a minor by omission. (Palm carries no minor gate.)
- **Files:** `server/src/services/insight.service.ts` (**EXTEND — export `buildUserInsightProfile`**, private `:73`); `server/src/prompts/qa.prompt.ts` (**NEW** — system prompt §7, reflective guidance, citation rule; reuse `HONESTY_PREAMBLE` + `buildFeatureContext`).
- **Acceptance:** reflective answers cite ≥1 specific placement/trait/number; pre-backfill users degrade (absent layers omitted, no fabrication); conditional full-blueprint (chart+timing always; numerology when name-at-birth on file; palm/face wired-now-empty).
- **Dependencies:** R5 seams ✅.

**Step 3 — Serving wire (router→context→engine→answer; caps/402; idempotency; QaTurn; safety serving).** *(✅ ISSUED as a SEQUENCED 5-way split 2026-07-24 — `prompts.txt §13d` overview + §13d-1..5; engine/safety-first, billing-last; each a fresh `build27-R7-QA-Impl-Step3-<n>` chat, own commit, home-verified before the next. 3 owner decisions baked (402 = nested-200 / top-level-402; context = ~6 turns; beyond-cap = credit packs). Model routing VERIFIED via claude-api 2026-07-24: free→sonnet-5, paid→opus-4-8 (explicit adaptive thinking), DI→fable-5 (existing SYNTHESIS_FABLE_ENABLED server-side fallback); never send budget_tokens/temperature/top_p/top_k. Split: 1 endpoint+orchestration · 2 engine wire · 3 safety serving · 4 persistence · 5 caps+402+DI-subcaps · **6 follow-up context (D1, last ~6 turns — added 2026-07-24; was unassigned in the original split, so D1 isn't dropped)**. Deploy prereq (not a sub-step): private-R2 `loadConfidentialConfig` loader. **✅ COMPLETE 2026-07-24 — all 6 sub-steps DONE + home-verified: 13d-1 `43a4623` · 13d-2 `f6be4f4` · 13d-3 `1abe64d` · 13d-4 `f93ccd1` · 13d-5 `cdc8070` · 13d-6 `c781b1e`. Full serving pipeline wired prod-dark; 3 harnesses green throughout.**)*
- **Goal:** add the `qa` surface(s): free→`claude-sonnet-5`, paid-regular→`claude-opus-4-8` w/ **explicit `thinking:{type:'adaptive'}`**, Deep Insight→`claude-fable-5`→`claude-opus-4-8` (reuse the existing fable/`fallbacks` wiring).
- **Files:** `server/src/services/synthesis-routing.ts` (**EXTEND** — new model/thinking config path for the regular tiers; DI is a drop-in fable row).
- **Acceptance:** each tier → correct model + thinking/effort; refusal handled before content; non-streaming to client (Fable streams server-side); `max_tokens` sized per model (thinking shares the ceiling); every ID/param re-verified via `claude-api` at build.
- **Dependencies:** Step 2. SDK `^0.110.0` ✅.

**Step 4 — Caps + DI sub-caps + 402 + credit rules + per-device anti-farming.**
- **Goal:** the monetization machinery.
- **Files:** `server/src/routes/qa.routes.ts` + `controllers/qa.controller.ts` + `services/qa.service.ts` (**NEW** — 402 gate; grace window/`AbortController`; idempotency; deduction); `models/User.ts`/`UserProfile` (`user.qa {monthKey, questionCount, deepInsightCount}` + device-hash claim record); `jobs/pushScheduler.ts` (`0 0 1 * *` monthly cron, belt-and-suspenders to lazy-at-read); `config/production.ts` (per-user RPM grief-guard).
- **Acceptance:** Free 3(1 DI)/Prem 10(3 DI)/PP 15(8 DI); over-cap → **402** (not 403/429) + upgrade payload + `scope`; `getEffectiveTier` honored; lazy monthly reset (**UTC**); credit deducts on completion, refund only on system failure, ~2s grace aborts + charges nothing; idempotency prevents double-charge; per-device anti-farming (salted hash, fail-open). *Residual (D3, config check): confirm annual $59.99/$89.99 → same monthly caps in RevenueCat.*
- **Dependencies:** Step 3.

**Step 5 — Persistence + `timing_log` + 👍/👎.**
- **Goal:** durable turn records + the calibration dataset.
- **Files:** `models/QaTurn.ts` (**NEW**); `models/TimingLog.ts` + `services/timingLog.service.ts` (**NEW** — mirror R5's `AiGeneration` fire-and-forget, never-throws); 👍/👎 endpoint.
- **Acceptance:** `QaTurn` per question (all types) w/ timestamp + city-level location + fallback flag; `timing_log` = full engine output per timing question, **no sampling**, admin-only; feedback nullable.
- **Dependencies:** Step 0 (engine output) + Step 4 (controller).

### DATA / PROFILE GROUP

**Step 6 — Numerology report fields + `nameAtBirth` + palm/face empty schema (INHERITS R9's Y-vowel migration — verify only).**
- **Goal:** R7's numerology block + the new onboarding field + wired-now-empty observation blocks.
- **Files:** `utils/nameNumerology.ts`/`numerology.ts` (**ADD the derived Vedic fields** `mulank`/`bhagyank`/`birthday_number`/`personal_year_current` — the Y-vowel base + `NUMEROLOGY_VERSION 2.0.0` are **ALREADY DONE by R9**); `services/numerology.service.ts` (cache + inject only when name-at-birth on file); `UserProfile` + dual-homed shared types (`nameAtBirth`); palm/face Q&A observation blocks (mirror `FaceFeatureVector`/`HandFeatureVector`, **no `lines` block**).
- **Acceptance:** **VERIFY** R9's migration (`VOWELS` incl. `y`; `NUMEROLOGY_VERSION 2.0.0` — ✅ confirmed) — **inherit, do NOT bump/re-backfill**; add the derived fields + `nameAtBirth`; numerology injects only when name-at-birth on file; palm/face blocks omit cleanly when empty.
- **Dependencies:** R9's numerology migration ✅ (verified).

### MOBILE GROUP

**Step 7 — Mobile chat UI (Android-first).**
- **Goal:** the fresh chat surface + question box + DI toggle + location consent + device-id + 402→paywall.
- **Files:** `mobile/app/(main)/` chat route (**NEW** — fires the reserved `recordMeaningfulAction('astrologer:<YYYY-MM-DD>')` seam); `lib/api.ts` (`askQuestion` → `/qa/ask`, base URL already includes `/api`); `lib/constants.ts` (`qaChat` gate + limits); qa/conversation store; **add `expo-location`** (consent flow) + **`expo-application`** (`getAndroidId`, permission-free); `(capture)/birth-data.tsx` (`nameAtBirth` input); folds in **R6's deferred Option C**.
- **Acceptance:** chat works; remaining question + DI counts shown; DI toggle locked-behind-upgrade for free after teaser; 402→paywall; location consent + fallback-to-birth-city interim; device-id permission-free. *Residual: D6 copy strings + D7 consent copy/privacy-policy are content/legal build tasks (post-Phase-A-code).*
- **Dependencies:** Steps 1–5 (backend).

### After Phase A
Phase B (soft-launch Premium; **crisis-block wiring lands here** once Sid confirms the guide wording is final; 👍/👎 + week-one token logging) → Phase C (open free tier) → Phase D (beyond-cap monetization DECISION — stub the counter only). Per §8.

**Gate status (§11):** D2 RESOLVED · D5 approved · D3/D6/D7 PM-APPROVED (residuals are ordinary build/content tasks, not gates) · Y-as-vowel RESOLVED + migrated by R9. **Nothing blocks Phase A.**

**PLANNING ONLY — no code, no deps, no schema changes, no commits.**
