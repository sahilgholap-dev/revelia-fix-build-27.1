# R5 — Fable 5 synthesis engine (per-surface prompt templates + Fable 5 → Opus 4.8 routing)

> Part of **Build 27** (see `../build-27.md`). Status: **✅ IMPLEMENTED (2026-07-11)** — §9 steps 1–4 all done + committed (`2c7a463` SDK+probe+scaffold → step-2 6 surfaces `a5414e5`/`9ee59ac`/`43fd420`/`ce9f9e9`/`831ffb1`/`f5fce72` → step-3 routing `fd454ac`/`6ab3015`/`bf43c71` → step-4 finale `1227d6a`). SDK `^0.110.0`; both Fable 5 org gates PASS (step-1 probe); all 6 synthesis surfaces weave the 4 feature sets + route through `createSynthesisMessage` (Fable 5 → Opus 4.8); A/B `ai_generations` log + fallback verification + migration note landed. **`SYNTHESIS_FABLE_ENABLED` stays OFF (guaranteed Opus 4.8) until owner rollout; live D7/D30 A/B is post-deploy.** Area: Server only (zero mobile changes — every reading's API/response shape preserved). **The keystone of the empirical sequence** (R1 ✅ → R2 ✅ → R3 ✅ → R4 ✅ → **R5 ✅**). R6 (continuity) and R7 (Q&A) both depend on R5.
>
> ⚠️ **R5 IS A DIFFERENT SHAPE FROM R1–R4 — stated up front.** R1–R4 each landed structured **DATA** into `UserInsightProfile` and **deferred the synthesis COPY to R5**. R5 is where that deferred copy is finally written. It is **not** a measured-substrate / extraction / feasibility-spike problem like R2/R3, and not a data-plumbing refactor like R4. It is a **prompt-engineering + model-routing + reliability** problem: the four feature sets are already DATA-COMPLETE in `UserInsightProfile`; the synthesis prompts still **under-read** them (mostly `sunSign`). R5 = one synthesis prompt template per surface, parameterized by the four structured feature sets + continuity context, on a **Fable 5 → Opus 4.8** routing for the marquee paid surfaces. It has a hard **SDK-upgrade prerequisite** and two **owner/org gates** (Fable 5 access + 30-day retention) that are settled empirically by a step-1 probe — surfaced explicitly below.
>
> ⚠️ **All Claude/Fable-5 facts below were re-verified against the `claude-api` skill at plan time (2026-07-08)** — model IDs, pricing, the server-side `fallbacks` beta header, the refusal `stop_reason`, the ZDR/retention constraint, prompt-cache minimum prefixes. Re-verify again before implementing (models/pricing drift).

---

## 1. Goal

Rewrite every synthesis surface's prompt so it **consumes all four now-stable feature sets** — R1 astrology (moon/rising/active aspects/key transits), R2 face traits, R3 palm traits, R4 numerology (name trio + fresh personal year/month) — instead of leaning almost entirely on `sunSign`, and route the **marquee paid surfaces** through **`claude-fable-5`** with an **automatic fallback to `claude-opus-4-8`** (via the server-side `fallbacks` beta, not hand-rolled try/catch), while keeping validation, free-tier, and Q&A generation on cheaper models for margin discipline. All synthesis prompts are version-tagged so A/B can attribute retention/regeneration/conversion lift.

```
TODAY                                              AFTER R5
UserInsightProfile carries R1+R2+R3+R4 DATA        Same DATA — now WOVEN INTO the copy:
  but the prompts read only:                         moon/rising/activeAspects/keyTransits (R1),
    sunSign, lifePath, personalYear/Month,           faceTraits bands (R2), palmTraits bands (R3),
    faceArchetype, palmType, strengths,              expression/soulUrge/personality (R4)
    naturalTalents                                 Marquee PAID surfaces:
Single model constant for ALL surfaces:              claude-fable-5 → (server-side fallback) → claude-opus-4-8
  MODEL = 'claude-sonnet-4-6'                       Cheap surfaces (daily/free-tier/validation):
No thinking / effort / fallbacks / streaming         stay on a low-cost model (margin discipline)
No prompt version tags                              Every synthesis prompt version-tagged for A/B
```

Acceptance (from build-27 §3): same-image-stable readings (already delivered by R2/R3's substrate pinning) **plus** Fable 5 A/B-tested vs the current engine on D7/D30 retention, regeneration rate, and free→paid; **Opus 4.8 fallback verified by forcing Fable 5 unavailable**; a documented migration so existing readings coexist with new-engine output (no logged-in user loses access).

---

## 2. Current state (verified in codebase) + the "DATA-complete, copy-under-reads-it" verdict

### The Anthropic SDK (the hard prerequisite)

- **`server/package.json` L38: `"@anthropic-ai/sdk": "^0.32.0"`** — far too old for `claude-fable-5`, adaptive thinking, `output_config.effort`, and the server-side `fallbacks` beta. **This upgrade BLOCKS all of R5 and R7.** It is R5 **step 1** (ungated, Sid-independent engineering).
- All calls today are the non-beta `anthropic.messages.create(...)`. The server-side fallback path is `anthropic.beta.messages.create({ betas, fallbacks, ... })` — a newer surface the current SDK does not expose.

### The synthesis engine — `server/src/services/claude.service.ts`

- **`const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 4 })`** (L34–37) — the server's own Console/Railway org key (the API org, **not** a claude.ai subscription).
- **`const MODEL = 'claude-sonnet-4-6'`** (L39) — a **single constant used by every generate function**.
- Hand-rolled **`withRetry`** (L80–95, exp backoff, retryable = ECONNRESET/ETIMEDOUT/429/500/503/529) wraps face/palm/name/career; the client's `maxRetries:4` covers the rest.
- **No streaming anywhere** — all `anthropic.messages.create` non-streaming. **No `thinking`, no `output_config`, no `betas`, no `fallbacks`.**
- JSON parsing via `parseClaudeJSON` → `safeJsonParse` (strips fences, throws `TruncatedAIResponseError`); `max_tokens` truncation logged via `logAiFailure`.
- Generate functions + their `max_tokens` + image usage:
  | Function | max_tokens | image? | consumer |
  |---|---|---|---|
  | `generateFaceReading` | 8192 | traits-driven: NO / fallback: YES | R2 path (out of R5 core scope) |
  | `generatePalmReading` | 8192 | YES (line flavor) | R3 path (out of R5 core scope) |
  | `generateDailyInsight` | 4096 | no | daily-insight.prompt.ts |
  | `generateWeeklyForecast` | 6144 | no | weekly-forecast.prompt.ts |
  | `generateMonthlyReading` | 8192 | no | monthly-reading.prompt.ts |
  | `generateCompatibilityReading` | 8192 | YES (partner face) | compatibility.prompt.ts |
  | `generateNameDestiny` | 6144 | no | inline prompt (in claude.service) |
  | `generateCareerDestiny` | 6144 | no | inline prompt (in claude.service) |
- `reconcileFaceSubstance` / `reconcilePalmSubstance` pin R2/R3 measured substance over model prose (prose-never-contradict). **These are R2/R3 invariants R5 must not disturb.**

### The assembled context — `insight.service.ts buildUserInsightProfile()` (L62–279)

The **single load-bearing finding**: `buildUserInsightProfile` already returns **all four feature sets** on `UserInsightProfile`, but the prompts read only a subset.

Returned and **DATA-complete today** (L251–278):
- R1: `moonSign`, `risingSign`, `activeAspects[]`, `keyTransits[]` (from `natalChart` + `describeNatalAspects` + `computeTransits`/`describeTransits`)
- R2: `faceArchetype`, `faceArchetypeTagline`, `strengths[]`, `growthOpportunity`, `dominantTraits[]`, **`faceTraits[]`** (compact `"<trait>: <band>"`, from the stable trait layer)
- R3: `palmType` ("X Hand"), `palmLifeTheme`, `naturalTalents[]`, **`palmTraits[]`** (compact `"<trait>: <band>"`)
- R4: `lifePathNumber`, **fresh** `personalYear`/`personalMonth`/`personalYearMeaning` (staleness-fixed), **`expressionNumber`/`soulUrgeNumber`/`personalityNumber`**

### What each synthesis prompt reads today (the under-read gap)

- **`daily-insight.prompt.ts`** (L35–46): `name, sunSign, lifePathNumber, personalYear(+meaning), personalMonth, faceArchetype(+tagline), strengths, growthOpportunity, palmType, palmLifeTheme, naturalTalents, dominantTraits`. **Never reads** moon/rising/activeAspects/keyTransits, faceTraits/palmTraits bands, expression/soulUrge/personality.
- **`weekly-forecast.prompt.ts`** (L51–62): same subset. Same omissions.
- **`monthly-reading.prompt.ts`** (L55–66): same subset. **Worse:** the premium `astrology.keyTransits` block (L149–155) instructs the LLM to **invent** transits ("planetary movements affecting `${profile.sunSign}`") — R1's real computed `keyTransits`/`activeAspects` sit **unused** right beside the prompt that fabricates them.
- **`compatibility.prompt.ts`**: consumes `UserCompatibilityProfile` (a **separate** type — `types/shared.ts` L748–758: `sunSign, lifePathNumber, faceArchetype(+tagline), strengths, communicationStyle, emotionalNature, palmType`), built in `compatibility.service.ts` (not `buildUserInsightProfile`). It has **no** moon/rising/transit/name-trio fields — weaving R1/R4 data in requires extending that type + its builder.
- **`generateCareerDestiny`** (inline prompt, claude.service L843–943; controller `reading.controller.ts` L518–631): the **one surface partly ahead** — its controller already passes `moonSign`/`risingSign`/`expressionNumber` (L605–608, 624) into the prompt. BUT it reads face/palm from the **freeform reading blobs** (`fr.archetype?.name`, `fr.categories`, `pr.lines`, L542–572), **not** the R2/R3 stable trait layer, and never uses `activeAspects`/`keyTransits`/`soulUrgeNumber`/`personalityNumber`.
- **`generateNameDestiny`** (inline prompt, claude.service L712–820; controller L299–459): reads `expression/soulUrge/personality` (correct — R4 canonical) + `lifePathNumber`/`sunSign`. Arithmetic-heavy; least synthesis-dependent.

### "Cosmic Blueprint" is not a separate surface

There is **no standalone Blueprint/combined generate function** in claude.service. The "Cosmic Blueprint" is the **assembled `UserInsightProfile` context** — the same object consumed by every surface, and the grounding for R7's Q&A. R5 has no separate Blueprint prompt to route; it is the shared context prefix (relevant to the prompt-caching lever, §4).

### ⚖️ THE R5 VERDICT — distinct from R1/R2/R3/R4

**The four feature sets are DATA-COMPLETE in `UserInsightProfile`; the synthesis COPY under-reads them (mostly `sunSign`) and monthly even fabricates data R1 already computes.** Explicitly:
- **NOT an extraction/spike problem (R2/R3)** — nothing to detect; the data is already deterministic and on-profile.
- **NOT a data-plumbing refactor (R4)** — the plumbing landed the data; R5 writes the prose that reads it.
- The defects are **copy + routing + reliability**: (1) prompts ignore R1 moon/rising/aspects/transits, R2/R3 trait bands, R4 name trio; (2) monthly invents transits instead of consuming R1's; (3) one model constant for every surface (no margin discipline, no frontier-model lift on paid readings); (4) no fallback, no streaming, no version tags for A/B.

**The fix is one synthesis template per surface, parameterized by the four feature sets + continuity, on a Fable 5 → Opus 4.8 routing for paid marquee surfaces.**

---

## 3. Target architecture

```
SDK (step 1, prerequisite)
  @anthropic-ai/sdk ^0.32 → current major; tsc clean; testClaudeConnection passes;
  confirm anthropic.beta.messages.{create,stream} exposes betas + fallbacks

Step-1 PROBE (settles owner/org gates empirically, server's real ANTHROPIC_API_KEY)
  one claude-fable-5 call →
    normal 200  → org HAS Fable 5 access AND is NOT ZDR (gate a + b both pass)
    400         → error names the failed gate (availability vs retention/ZDR)
  → Fable 5 stays flag-gated (SYNTHESIS_FABLE_ENABLED) with Opus 4.8 as the guaranteed
    path until the probe passes; escalate to Sid ONLY on a retention 400 (his privacy call)

Model routing (per surface — margin discipline)
  MARQUEE PAID  → claude-fable-5  (primary)  --server-side fallbacks-->  claude-opus-4-8
  CHEAP/FREE/VALIDATION → low-cost model (claude-sonnet-4-6 today; re-verify at impl)

Synthesis call helper (R5's single-source module — claude.service or a new synthesis-routing.ts)
  createSynthesisMessage({ surface, prompt, maxTokens }):
    - resolves model from the routing table (flag-gated Fable 5 → else Opus 4.8 → else cheap)
    - Fable 5 path: anthropic.beta.messages.stream({
        model: 'claude-fable-5', max_tokens,
        betas: ['server-side-fallback-2026-06-01'],
        fallbacks: [{ model: 'claude-opus-4-8' }],
        output_config: { effort },           // NO thinking param (always on); NO temperature/budget_tokens
        messages,
      }).finalMessage()                       // STREAM: thinking-always-on → minute-long turns
    - handle stop_reason === 'refusal' BEFORE reading content (server-side fallback auto-recovers
      policy declines onto Opus 4.8; a final-chain refusal → graceful error, never raw)
    - cheap path: existing anthropic.messages.create (non-beta), unchanged shape
    - stamp promptVersion + model on the generation log / cached metadata (A/B attribution)

Prompts (one template per surface, all version-tagged)
  daily / weekly / monthly / compatibility / career / name-destiny prompt builders
  parameterized by the FULL UserInsightProfile feature sets + continuity context

Mobile
  ZERO changes — every reading's response shape (DailyInsightOutput, WeeklyForecastOutput,
  MonthlyReadingOutput, CompatibilityOutput, career/name JSON) is preserved.
```

---

## 4. Key decisions

> ⚠️ **NO SPIKE** — R5 has no feasibility question (the SDK upgrade + one-call probe settle the only unknowns; both are step 1, not a Phase-0 spike). ⚠️ **NO COPY-TAXONOMY SID GATE** (unlike R2 S1 / R3 S2/S3) — R5 authors *synthesis prose*, not archetype names/trait vocab; it **reads** the S1/S3 archetype names from `UserInsightProfile` fields (re-mappable via `RULES_VERSION`), never hardcodes them. R5 **does** have two **owner/org gates** (Fable 5 access + 30-day retention), settled by the step-1 probe (§ gates below).

| Decision | Recommendation | Why / caveat |
|---|---|---|
| **SDK upgrade (prereq / step 1)** | Bump `@anthropic-ai/sdk` `^0.32` → current major (`npm install @anthropic-ai/sdk@latest`; pin the exact latest at install — do NOT assert a version number from memory). Re-verify `claude.service.ts` compiles (message-param types, `response.content.find`, `stop_reason`, `usage`), run `testClaudeConnection`, confirm `anthropic.beta.messages.{create,stream}` exposes `betas` + `fallbacks`. | Nothing in R5/R7 works until this lands. Ungated, Sid-independent engineering. 0.32→latest is a large jump — treat type drift as a real (small) task. |
| **Step-1 Fable 5 PROBE** | One `claude-fable-5` call with the **server's real `ANTHROPIC_API_KEY`** (Railway/Console org — a subscription ≠ the API org). Normal 200 → org has Fable 5 access AND is not ZDR (both gates pass). 400 → the error names the gate (availability vs retention/ZDR). | Settles both owner/org gates **empirically**, not via a Sid question. Escalate to Sid ONLY if the probe 400s on **retention** (changing retention is his privacy call). Reuse the `testClaudeConnection` shape. |
| **Per-surface model routing (margin discipline)** | Fable 5 → Opus 4.8 for **marquee PAID** surfaces only; keep cheap surfaces on a low-cost model. See the routing table below. | Fable 5 is **$10/$50 per MTok** vs Sonnet's **$3/$15** — reserve it for paid marquee readings; daily (free, highest volume) and free-tier / validation stay cheap. |
| **Automatic fallback mechanism** | Server-side `fallbacks` param: `betas: ['server-side-fallback-2026-06-01']` + `fallbacks: [{ model: 'claude-opus-4-8' }]` on `anthropic.beta.messages.*`. **Not** hand-rolled try/catch for the policy path. | Maps directly to build-27 §7's "mandatory automatic fallback." **CAVEAT (critical, verified):** the server-side `fallbacks` param triggers on **policy declines only** — rate limits, overloads, server errors, and **retention/availability 400s are NOT rescued** by it. So availability resilience needs the **flag** (below), not the param. First-party Claude API only (our server is first-party — OK); rejected on the Batches API (we don't batch these). |
| **Fable 5 availability flag** | `SYNTHESIS_FABLE_ENABLED` env flag. OFF → all surfaces run on the guaranteed **Opus 4.8** path (no Fable 5). ON (after the probe passes) → marquee surfaces run Fable 5 with server-side fallback for policy declines. | The flag is the resilience layer the `fallbacks` param does NOT provide (availability/retention). It also makes the "force Fable 5 unavailable → Opus 4.8 at full quality" passing criterion a one-line flip. |
| **Fable 5 request shape** | **Omit `thinking` entirely** (always on; `{type:"disabled"}` and `budget_tokens` both 400). **No `temperature`/`top_p`/`top_k`** (400). `output_config.effort`: `medium` default, `high` for the monthly-premium flagship; tune in A/B. **STREAM** all Fable 5 surfaces (`.stream(...).finalMessage()`) — thinking-always-on makes turns minutes long → non-streaming risks the 10-min client-timeout / idle drop. | All verified against the `claude-api` skill. Output JSON is small (<8K) but the turn is long → stream for the connection, not for output size. |
| **Refusal handling** | Check `stop_reason === 'refusal'` **before** reading `content`. Server-side fallback auto-recovers policy declines onto Opus 4.8; a final-chain refusal (rare for benign mystical copy) → log + graceful error (the R7 "stars misaligned" pattern), never raw. | Fable 5 classifiers target bio/cyber — extremely unlikely on astrology, but the check is mandatory (empty/partial content otherwise). |
| **Prompt-caching lever** | **Measure with `count_tokens`, likely DEFER to R7.** The per-user Blueprint context prefix is consumed **once per period** by daily/weekly/monthly (not repeated within a cache TTL), so caching has little payoff **within R5**. Min cacheable prefix: **Fable 5 = 2048 tokens, Opus 4.8 = 4096** — a per-user context block below the floor silently won't cache. Caches are per-model (server-side fallback reprices cache automatically). | The real caching payoff is R7 (repeated Q&A over the same Blueprint). R5: measure now, note the min-prefix caveat, defer unless the shared prefix is large + reused across surfaces in one window. |
| **Prompt version tags** | Add a `PROMPT_VERSION` constant per surface (e.g. `daily.v2`, `monthly.v2`) + stamp `{ promptVersion, model }` on the generation log / cached-content metadata. | build-27 §2 R5 requires "version-controlled + tagged for A/B." This is what lets A/B attribute D7/D30 retention / regeneration / free→paid to the new engine. |
| **Face/palm READING generation** | **Out of R5 core scope** — they are R2/R3's traits-driven path (substance pinned by `reconcile*`). Optional future model bump to Fable 5 for prose quality is a **deferred caveat**, not R5. | Keeps R5 focused on the seven synthesis surfaces; avoids disturbing the R2/R3 substrate-pinning invariants. |

### Per-surface model routing table (the central margin-discipline decision)

| Surface | Tier gate | R5 routing | Rationale |
|---|---|---|---|
| **Monthly reading — premium** | Premium / Premium Plus | **Fable 5 → Opus 4.8**, effort `high` | Flagship comprehensive paid reading; the biggest quality-lift target |
| **Compatibility — premium** | Premium | **Fable 5 → Opus 4.8**, effort `medium` | Paid + viral marquee (shareable quote) |
| **Career Destiny** | Paid marquee (one-time) | **Fable 5 → Opus 4.8**, effort `medium` | Deep multi-modal synthesis; strong Fable 5 fit |
| **Weekly forecast** | Premium Plus only | **Fable 5 → Opus 4.8**, effort `medium` | Paid, deep, low volume |
| **Daily insight** | Free (all users) | **KEEP cheap** (low-cost model) | Highest volume + free-tier strategy → Fable 5 uneconomical per-user-per-day |
| **Monthly reading — free** | Free | **KEEP cheap** | Free tier → margin |
| **Compatibility — free** | Free | **KEEP cheap** | Free tier → margin |
| **Name Destiny** | Paid (1/mo credit) | **KEEP cheap for v1** (revisit) | Arithmetic-heavy (Pythagorean tables + variation math); synthesis lift is smaller than the multi-modal surfaces. Flag as a tuning knob for A/B. |
| **Image validation** (face/palm) | — | **KEEP cheapest** | Not synthesis |

*(All four feature sets get woven into the copy on **every** surface regardless of model — the routing choice is about which model writes the prose, not which data it reads. A cheap-model daily insight still reads moon/rising/transits/trait-bands/name-trio; it just does so on the low-cost model.)*

---

## 5. Data model / shared types

R5 needs **no user-facing schema change** — `UserInsightProfile` already carries all four feature sets (types/shared.ts L914–952). The additions are internal:

- **`SYNTHESIS_MODELS` routing map** + `FABLE_MODEL='claude-fable-5'` / `FABLE_FALLBACK='claude-opus-4-8'` / `CHEAP_MODEL` constants (recommend a small `server/src/services/synthesis-routing.ts`, or a section in claude.service).
- **`SYNTHESIS_FABLE_ENABLED`** env flag (documented in the env-var table; default OFF until the probe passes).
- **`PROMPT_VERSION`** per surface (co-located with each prompt builder).
- **Compatibility only**: extend `UserCompatibilityProfile` (types/shared.ts, dual-homed with `packages/shared/types.ts`) with optional R1/R4 fields (`moonSign?`, `risingSign?`, `activeAspects?`, `keyTransits?`, `expressionNumber?`, `soulUrgeNumber?`, `personalityNumber?`, `faceTraits?`, `palmTraits?`) + populate them in `compatibility.service.ts`'s builder. DATA already exists on the profile — this is the one type/builder change to let compat weave R1/R4 in.
- **Optional generation-metadata field** on the cached content / a lightweight generation-log entry to record `{ promptVersion, model, fellBack }` for A/B (mirror the `logAiFailure` pattern — a `logAiGeneration` sibling, or reuse InsightCache metadata).

---

## 6. The synthesis-call module (R5's analog of R2/R3's rules-table section)

R5 authors no rules table; its single-source module is the **synthesis-call helper** + the **routing table**, so every surface routes/streams/handles-refusal identically:

- `createSynthesisMessage({ surface, prompt, maxTokens, image? })` in claude.service (or synthesis-routing.ts):
  1. resolve model from `SYNTHESIS_MODELS[surface]` gated by `SYNTHESIS_FABLE_ENABLED` (OFF → Opus 4.8; cheap surfaces → cheap model regardless);
  2. **Fable/Opus path**: `anthropic.beta.messages.stream({ model, max_tokens, betas:['server-side-fallback-2026-06-01'], fallbacks:[{model:'claude-opus-4-8'}], output_config:{effort}, messages }).finalMessage()`;
  3. **cheap path**: existing `anthropic.messages.create(...)` (non-beta, unchanged);
  4. `if (msg.stop_reason === 'refusal')` → log + graceful error before reading content;
  5. extract text, `parseClaudeJSON`, stamp `{promptVersion, model}` on the generation log.
- Each generate function (`generateDailyInsight`, `…Weekly`, `…Monthly`, `…Compatibility`, `…NameDestiny`, `…CareerDestiny`) calls this helper instead of `anthropic.messages.create` directly — replacing the shared `MODEL` constant with per-surface routing.
- `withRetry` + client `maxRetries` stay for the cheap surfaces; the Fable path leans on SDK auto-retry (429/5xx) + server-side fallbacks (policy) + the flag (availability). No behavior removed.
- **Do not disturb** `reconcileFaceSubstance`/`reconcilePalmSubstance` (R2/R3 invariants) — those are on the face/palm reading path, out of R5's synthesis scope.

---

## 7. Wiring into readings (per surface)

- **Daily** (`daily-insight.prompt.ts`): weave R1 moon/rising/activeAspects/keyTransits + R2/R3 trait bands + R4 name trio into the copy; keep cheap model. Response `DailyInsightOutput` unchanged.
- **Weekly** (`weekly-forecast.prompt.ts`): same data weave; route Fable 5 → Opus 4.8. `WeeklyForecastOutput` unchanged.
- **Monthly** (`monthly-reading.prompt.ts`): **feed R1's computed `keyTransits`/`activeAspects` into the premium `astrology` block instead of instructing the LLM to invent transits** — the single highest-value copy fix. Weave name trio + trait bands. Premium → Fable 5 (effort `high`); free → cheap. `MonthlyReadingOutput` unchanged (incl. the date-format normalization safety net).
- **Compatibility** (`compatibility.prompt.ts` + `compatibility.service.ts` + `UserCompatibilityProfile` type): extend the type + builder to carry R1/R4 data; weave the user side's moon/rising/name-trio. Premium → Fable 5; free → cheap. Partner-face image still passed (Fable 5 supports vision). `CompatibilityOutput` unchanged.
- **Career** (`generateCareerDestiny` prompt + `reading.controller.ts`): switch face/palm inputs from the freeform blobs to the **R2/R3 stable trait layer** (mirror `buildUserInsightProfile`'s sourcing — `faceArchetypeResult`/`faceTraits`, `palmProfileResult`/`palmTraits`); add `activeAspects`/`keyTransits`/`soulUrge`/`personality`. Route Fable 5 → Opus 4.8. Career JSON shape unchanged.
- **Name Destiny** (`generateNameDestiny` prompt): keep on cheap model for v1; already reads the R4 canonical trio. Optionally deepen the astrology/personality weave; low priority. Name JSON shape unchanged.
- **Continuity context (forward-looking)**: R6 will add "what shifted since last reading" using transits + InsightCache; R5's templates should accept an optional continuity block so R6 slots in without a second prompt rewrite. **DATA/param placeholder only — R6 authors the continuity copy.**

---

## 8. Migration / A-B / fallback verification (acceptance: no user loses access)

- **No reading-data backfill needed.** Existing outputs coexist by construction: `InsightCache` daily/weekly/monthly expire naturally (midnight / next Monday / 1st) → regenerate on the new engine on next request; career/name/compatibility are on-demand + stored historically → old docs keep their snapshot, new generations use the new engine. **No logged-in user loses access** — old copy stays readable, new copy is strictly additive on next generation.
- **A/B**: tag every generation with `{promptVersion, model}`; measure **D7/D30 retention, reading-regeneration rate, free→paid conversion** old-engine vs new-engine. Premium rollout only if the A/B shows clear lift (build-27 §3). Roll out behind `SYNTHESIS_FABLE_ENABLED` (and optionally a percentage flag) so the comparison is clean.
- **Fallback verification (passing criterion)**: (a) flip `SYNTHESIS_FABLE_ENABLED=OFF` → confirm every marquee surface generates at full quality on **Opus 4.8** (the availability-failure path the `fallbacks` param does NOT cover); (b) confirm the server-side `fallbacks` param is wired (betas + fallbacks present on the Fable request) so a **policy decline** auto-recovers onto Opus 4.8 — inspect the response for the `fallback` content block / served-by signal per the `claude-api` skill. Document both, since they cover different failure classes.
- **Migration doc**: record the above as the R5 migration note (natural cache expiry + on-demand regeneration; no data script; old readings immutable).

### R5 §9 STEP 4 — verification record (2026-07-11, FINALIZED)

**(a) A/B generation logging — DONE (the code deliverable).** A fire-and-forget `logAiGeneration` (new `server/src/services/aiGeneration.service.ts` + new Mongo model `server/src/models/AiGeneration.ts`, collection `ai_generations`) MIRRORS `logAiFailure` (metadata-only; swallow-on-error; never throws into a reading). It is centralized in `createSynthesisMessage` (uniform across the routed surfaces + both the cheap and marquee paths). 🔴 **CORRECTED 2026-08-06 — THIS SENTENCE SAID "single call site" AND THAT WAS WRONG IN TWO DIRECTIONS, BOTH MEASURED.** (1) R7 added a SECOND export, `createQaAnswerMessage`, which routes the `qa` surface per tier and calls the same `logGeneration` — so logging has TWO funnels, not one (the same shape the prose clean-up has, and for the same reason). (2) 🔴 **`generateFaceReading` and `generatePalmReading` are DIRECT `anthropic.messages.create` Vision calls that reach NEITHER funnel, so FACE AND PALM GENERATIONS HAD NEVER BEEN LOGGED AT ALL** — `ai_generations` was missing the app's ENTRY funnel and two of its four permanent readings, i.e. the two calls carrying a base64 image in the input. 🟢 **FIXED 2026-08-06 (P99): both now call `logAiGeneration` directly** with surfaces `face` / `palm` and new `FACE_PROMPT_VERSION` / `PALM_PROMPT_VERSION` tags. ⚠️ Any analysis window spanning that date under-reports those two surfaces rather than lying about them.

It is invoked **non-blocking** (`void logGeneration(...)`) after the result object is built, so it adds zero latency to and cannot alter the returned reading. Persists `{ surface, promptVersion, modelUsed, fellBack, stopReason, generatedAt }` (+ optional `userId`, intentionally NOT force-threaded through the helper). Field is `modelUsed` (not `model`) to avoid Mongoose's reserved `Document.model`, mirroring `AiFailure`. This is the seam the post-deploy D7/D30-retention / regeneration-rate / free→paid A/B is measured off. **NO reading/InsightCache CONTENT shape changed; mobile untouched; server + mobile `tsc --noEmit` clean.**

**(b) Fallback verification — RECORDED (two distinct failure classes).**
- **Availability layer (flag OFF → Opus 4.8 at full quality) — EXECUTABLE PROOF.** Scratchpad smoke issued the EXACT flag-OFF marquee request the helper's `opus` branch issues (`anthropic.beta.messages.stream({ model:'claude-opus-4-8', max_tokens:8192, output_config:{ effort:'high' }, messages }).finalMessage()`; no betas/fallbacks, no thinking, no sampling) with the server's real `ANTHROPIC_API_KEY`. Result: **served `claude-opus-4-8`, `stop_reason:'end_turn'`, `stop_details:null`, full-quality parseable JSON body (headline/theme/guidance), ~7.8 s.** This IS the "force Fable 5 unavailable → full quality on Opus 4.8" passing criterion (the availability path the `fallbacks` param does NOT cover). Consistent with the step-1 probe + the 3a/3b routing smokes.
- **Policy-decline layer (server-side `fallbacks`) — WIRING INSPECTED.** `synthesis-routing.ts` fable branch carries `betas:['server-side-fallback-2026-06-01']` + `fallbacks:[{ model:'claude-opus-4-8' }]` (exact header string per the `claude-api` skill — the current/earliest of the series; do NOT "correct" it to a newer-looking date). `createSynthesisMessage` checks `stop_reason==='refusal'` BEFORE reading content; a final-chain refusal → logged + graceful `Error` (never raw). The helper stamps `fellBack = (path==='fable' && msg.model !== FABLE_MODEL)` for A/B attribution.
- **Honest refusal note (do NOT fake a refusal).** Fable 5 safety classifiers target bio/cyber; a real policy refusal on benign mystical astrology copy ~never fires — forcing one is impractical. So the auto-recovery is verified by **wiring inspection + the refusal-handling code path + the step-1 probe**, while the **flag-OFF Opus path is the executable "Fable unavailable → full quality" proof** the criterion asks for. The two layers cover different failure classes and are not conflated (§4 caveat).

**(c) Migration note — FINALIZED (no data script; no logged-in user loses access).** Existing readings COEXIST by construction: `InsightCache` daily/weekly/monthly expire naturally (midnight / next Monday / 1st) → regenerate on the new engine on next request; **career / name-destiny / compatibility** are on-demand + stored historically → old docs keep their **immutable** snapshot, new generations use the new engine. **No data-migration script; old copy stays readable; new copy is strictly additive on next generation.** (Pre-backfill users degrade gracefully — see the R5 caveat in `build-27-caveats.md`: daily/weekly/monthly self-heal; compat + career lean on the owner's pending backfills.)

**(d) NOT this step (owner / post-deploy).** Owner flips `SYNTHESIS_FABLE_ENABLED` ON at rollout AFTER probe + A/B are satisfied (flag stays OFF in the repo — no committed flip); the live D7/D30-retention / regeneration-rate / free→paid measurement is post-deploy analytics off the (a) log. → **R5 implementation is COMPLETE (steps 1–4).**

---

## 9. Sequencing (within R5) — SDK first, then per-surface, then A/B + fallback + migration

0. ~~Phase-0 spike~~ — **N/A** (§4): no feasibility question; the SDK upgrade + probe are step 1.
1. **SDK upgrade + probe (prerequisite)**: bump `@anthropic-ai/sdk` to current major; tsc clean; `testClaudeConnection` passes; confirm `beta.messages.{create,stream}` exposes `betas`+`fallbacks`. Run the **Fable 5 probe** with the server key → settle gates (a)+(b). Add `SYNTHESIS_FABLE_ENABLED` (default OFF) + the routing table + `createSynthesisMessage` helper (Opus 4.8 guaranteed path first; Fable behind the flag). tsc clean both.
2. **Per-surface prompt rewrites** (one commit each, R2/R3/R4 convention): daily → weekly → monthly (incl. the R1-transit fix) → compatibility (+ type/builder change) → career (+ stable-trait sourcing) → name-destiny (light). Each weaves the four feature sets; each gets a `PROMPT_VERSION` tag. tsc clean per step.
3. **Routing + streaming + refusal**: route the marquee surfaces through `createSynthesisMessage` (Fable 5 → Opus 4.8, streaming, effort per table); handle `stop_reason:'refusal'`; stamp `{promptVersion, model}` for A/B.
4. **A/B + fallback verification + migration**: wire generation logging; verify the Opus 4.8 path (flag OFF) at full quality; verify the server-side fallback wiring; document the migration; enable `SYNTHESIS_FABLE_ENABLED` for the rollout once the probe + A/B are satisfied.

*(Step 1 is the gate; steps 2–4 are Sid-independent. The only escalation is a retention-400 probe result → Sid.)*

---

## 10. Passing criteria (R5-specific)

- [x] **SDK upgraded** — `@anthropic-ai/sdk` ^0.110.0 (step 1, `2c7a463`); `claude.service.ts` compiles; `testClaudeConnection` passes; `beta.messages.{create,stream}` exposes `betas`+`fallbacks` (verified in installed types).
- [x] **Fable 5 probe recorded** — step-1 probe with the server API-org key → 200/end_turn; BOTH gates PASS (access + 30-day retention); no retention-400, no Sid escalation.
- [x] **All four feature sets woven into the copy** on every synthesis surface (step 2, 6 commits) — R1 moon/rising/aspects/transits + R2 face bands + R3 palm bands + R4 name trio via `buildFeatureContext` (name-destiny = chart-identity-only by design); monthly's premium astrology block now grounds in R1's real placements + forbids fabrication (see §8 snapshot-vs-window caveat).
- [x] **Per-surface routing** — step 3 (all 6 routed through `createSynthesisMessage`): marquee (monthly-premium/compat-premium/career/weekly) → Fable 5 → Opus 4.8; daily/free-tier/name-destiny → cheap model. `MODEL` retained only for out-of-scope face/palm reading + validation.
- [x] **Same-image-stable readings** — covered by R2/R3 substrate pinning; R5 did not touch it (synthesis reads the stable fields; `reconcile*` untouched).
- [x] **Opus 4.8 fallback verified by forcing Fable 5 unavailable** — step-4 executable flag-OFF marquee smoke → served `claude-opus-4-8`, end_turn, full-quality JSON; server-side `fallbacks` wiring inspected (betas + fallbacks on the Fable request); refusal-path present (real refusal on benign copy impractical to force — verified by wiring + probe).
- [x] **A/B instrumented** — fire-and-forget `logAiGeneration` → `ai_generations` log persists `{surface,promptVersion,modelUsed,fellBack,stopReason,generatedAt}(+userId?)`, centralized in `createSynthesisMessage` **and (since R7) `createQaAnswerMessage` — TWO funnels, not one; face and palm bypass both and log themselves directly since P99, making THREE write points.** *(Live D7/D30-retention / regeneration-rate / free→paid measurement + "Premium rollout only on clear lift" = post-deploy owner analytics off this log.)*
- [x] **Migration documented** — §8 finalized: natural cache expiry (daily/weekly/monthly) + on-demand regeneration (career/name/compat, immutable snapshots); no data script; no logged-in user loses access.
- [x] **Refusal handled** — `stop_reason:'refusal'` checked before reading content in the helper; final-chain refusal → graceful thrown error, never raw.
- [x] **Fable request shape correct** — helper omits `thinking`, sends no `temperature`/`top_p`/`top_k`; `output_config.effort` set per surface; streamed via `beta.messages.stream(...).finalMessage()`.
- [x] **Zero mobile changes** — every reading's response shape byte-identical; `npx tsc --noEmit` clean on mobile AND server (every step).

---

## 11. Risks / open questions

- **#1 — Fable 5 org availability (gate a).** Owner uses Fable 5 in Claude Code/claude.ai, so it's very likely available — but that's a subscription, **not** the API org. The step-1 probe with the **server's** key confirms it outright. Until then, Opus 4.8 is the guaranteed path (flag OFF).
- **#2 — 30-day retention / ZDR (gate b).** Fable 5 is unavailable under zero-data-retention (and any retention < 30 days) — every request 400s. The probe detects it (a retention-400). **Only this item may need Sid** (changing retention is his privacy call), and only if the probe fails.
- **#3 — Server-side `fallbacks` covers POLICY declines only.** It does **not** rescue availability/retention 400s, rate limits, or 5xx. The `SYNTHESIS_FABLE_ENABLED` flag (Opus 4.8 as the guaranteed path) is the availability resilience layer — do not conflate the two. (Documented in §4/§8.)
- **#4 — Cost / margin.** Fable 5 is $10/$50 per MTok (vs Sonnet $3/$15). The routing table confines it to paid marquee surfaces; daily (free, highest volume) stays cheap. Watch per-reading cost in the A/B; Name Destiny is the marginal call (kept cheap for v1).
- **#5 — Latency (minutes-long Fable turns).** Thinking-always-on can make single turns run minutes at higher effort. Streaming avoids idle-connection drops; `effort` bounds latency (medium default). Watch p95 generation time; the reads are cached per period so user-perceived latency is the first-generation only.
- **#6 — Compatibility type change.** Weaving R1/R4 data into compat requires extending `UserCompatibilityProfile` + its builder (the only surface needing a type change). Keep it optional-field/back-compat so the dual-homed type and the partner (transient, no chart) path still compile.
- **#7 — Career blob→trait-layer switch changes some outputs (deliberate).** Career currently reads face/palm from the freeform blobs; switching to the stable R2/R3 layer aligns it with the rest of the app and may change wording on the next generation (old `CareerDestiny` docs keep their snapshot). Analogous to R4's finding-#2 fix — a correctness/consistency improvement, not a gate.
- **#8 — S1/S3 archetype names are proceed-on-default.** R5's copy weaves face/palm archetype **names** that are 🟡 PROCEEDING ON DEFAULT (sid-signoff S1/S3). R5 reads them from `UserInsightProfile` fields (re-mappable via `RULES_VERSION`) and **never hardcodes** them — a later Sid revision flows through automatically, no R5 change.
- **#9 — SDK 0.32 → current major is a large jump.** Expect minor type drift in claude.service (message-param types, response accessors). Small, but real — it's why the SDK bump is its own step-1 task with a tsc gate + `testClaudeConnection` before any prompt work.
- **No spike, restated**: nothing in R5 has a feasibility question — no CV, no new library beyond the SDK bump, no external service. The only unknowns (Fable 5 access + retention) are settled by the step-1 probe.

---

## 12. Files in scope (checklist)

**Server**
- `server/package.json` (bump `@anthropic-ai/sdk` `^0.32` → current major)
- `server/src/services/claude.service.ts` (replace the single `MODEL` constant with per-surface routing; add `createSynthesisMessage` helper — Fable 5 → Opus 4.8 via `beta.messages.stream` + `betas`/`fallbacks` + `output_config.effort` + refusal handling; keep `reconcile*` untouched)
- `server/src/services/synthesis-routing.ts` (NEW — recommend: routing table + model constants + `SYNTHESIS_FABLE_ENABLED` gate; or inline in claude.service)
- `server/src/prompts/daily-insight.prompt.ts` (weave four feature sets; `PROMPT_VERSION`)
- `server/src/prompts/weekly-forecast.prompt.ts` (weave; `PROMPT_VERSION`)
- `server/src/prompts/monthly-reading.prompt.ts` (weave; **consume R1's computed transits** instead of inventing; `PROMPT_VERSION`)
- `server/src/prompts/compatibility.prompt.ts` (weave user-side R1/R4; `PROMPT_VERSION`)
- `server/src/services/compatibility.service.ts` (+ `UserCompatibilityProfile` builder — populate R1/R4 fields)
- `server/src/controllers/reading.controller.ts` (`generateCareerDestiny`: source face/palm from the R2/R3 stable trait layer, add aspects/transits/soulUrge/personality)
- `server/src/types/shared.ts` + `packages/shared/types.ts` (extend `UserCompatibilityProfile` with optional R1/R4 fields — dual-homed)
- `server/src/services/aiFailure.service.ts` (or a sibling `logAiGeneration`) — stamp `{promptVersion, model, fellBack}` for A/B (reuse the existing logging pattern)
- Env-var docs (CLAUDE.md env table): `SYNTHESIS_FABLE_ENABLED` (default OFF until the probe passes)

**Mobile**
- **None.** Every reading's response shape (`DailyInsightOutput`, `WeeklyForecastOutput`, `MonthlyReadingOutput`, `CompatibilityOutput`, career/name JSON) preserved; zero mobile changes is an R5 passing criterion.

**Coordinate with R6 + R7**: R5 lands the frontier-model synthesis engine + the copy that reads all four feature sets. **R6 (continuity)** slots "what shifted since last reading" into R5's optional continuity block (transits + InsightCache). **R7 (Q&A)** grounds Haiku answers in the same assembled Blueprint context + inherits the SDK upgrade; the prompt-caching lever (deferred here) is R7's. Both depend on R5.
