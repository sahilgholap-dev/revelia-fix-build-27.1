# R6 — Continuity readings ("what shifted since your last reading" — temporal delta + synthesis)

> Part of **Build 27** (see `../build-27.md`). Status: **✅ IMPLEMENTED (2026-07-13)** — §9 steps 1–6 all done + committed (`49344eb` types+baseline → `537596c` delta module+gate → `0804428` seam+daily param → `6582c75` daily wiring+`daily.v3`+seed/advance → `1ede90d` free/premium teaser hook [S-R6 Option A] → `98e0485` validation pass 41/41). Area: **Server only — ZERO mobile changes** (every reading's response shape preserved). Priority: Medium. Sixth in the sequence (R1 ✅ → R2 ✅ → R3 ✅ → R4 ✅ → R5 ✅ → **R6 ✅**). Depends on **R1 (transit engine + natal baseline)** and **R5 (synthesis engine + `createSynthesisMessage` routing)** — both ✅. R7 (Q&A) is independent of R6 (also post-R5). **S-R6 tier-reach gate RESOLVED on default = Option A (zero-mobile); Option C (dedicated card + CTA) DEFERRED to the build-27 mobile cycle — see `../../tracking_files/build-27-caveats.md` R6 §.**
>
> ⚠️ **R6 IS A DIFFERENT SHAPE FROM R1–R5 — stated up front.** R1–R4 built the **DATA** layers (chart, face traits, palm traits, numerology). R5 wrote the synthesis **COPY** that reads them at a single point in time. **R6 is neither a data-extraction problem nor a first-time copy problem — it is a *temporal delta* problem.** Every prior requirement described the user's state **now**; R6 is the first to compare **now vs the user's state at their last reading** and narrate what changed. It is a **retention mechanic**: "welcome back — here's what's shifted since you were last here." The novel unknown is **the baseline** — to say what "shifted," R6 must know the prior reading's astro/transit state. That is R6's #1 decision, surfaced explicitly in §4.
>
> ⚠️ **All Claude/Fable-5 facts below were re-verified against the `claude-api` skill at plan time (2026-07-11)** — model IDs, the `createSynthesisMessage` routing helper shape, streaming, the server-side `fallbacks` beta. R6's continuity copy is synthesis prose, so it **reuses R5's `createSynthesisMessage`** (`server/src/services/synthesis-routing.ts`) — **no new model plumbing.** Re-verify before implementing (models/pricing drift).
>
> ⚠️ **CORRECTION vs the R5 plan (verified in code 2026-07-11).** R5's plan (`R5-synthesis-engine.md` §7) states it "left an optional continuity block seam" in the synthesis templates. **In code, that seam was NOT materialized** — `buildFeatureContext` (`server/src/prompts/shared/feature-context.ts`) takes no continuity param, and none of the three prompt builders accept one. The only artifacts are *comments* (`server/src/types/shared.ts:379` "…and R6 continuity. Computed on demand, cached by date."; `chiromancy-rules.ts:234`). **So R6 must BUILD the seam, not merely fill it** — this is scoped into §6/§7 below. The R5 groundwork R6 *does* inherit is real: `createSynthesisMessage` routing, `buildFeatureContext` as the extension point, and the DATA-complete `UserInsightProfile`.

---

## 1. Goal

Add a **continuity insight** — "what has shifted since your last reading" — that (a) establishes a **baseline** for the user's last engagement, (b) computes the **transit/state delta** between that baseline and now, and (c) **synthesizes** that delta into the existing reading copy through R5's synthesis engine, **honestly omitting the note when nothing meaningful has changed.** It is a retention/re-engagement mechanic: a returning user is greeted with a grounded, chart-accurate summary of what moved while they were away.

```
TODAY                                             AFTER R6
Every reading describes the user's state NOW:     Same "now" reading, PLUS an optional woven note:
  buildUserInsightProfile → moon/rising/            "Since you were last here <N days ago>,
    activeAspects/keyTransits (all at new Date())     transiting Saturn moved off your Sun and
  → synthesis copy (R5) → DailyInsightOutput         Mars now squares your Moon; your Personal
No memory of the PRIOR reading's state             Month rolled from 4 → 5 …"  (woven into the prose)
No "what changed" comparison anywhere            Baseline = recompute transits for the last-
                                                   engagement DATE from the stored natal chart
                                                   (R1 engine, exact + deterministic)
                                                 Delta computed in code → fed to R5's synthesis
                                                   prompt as an optional continuity block
                                                 Low/zero delta → block OMITTED (no fabrication)
                                                 Output shapes unchanged → zero mobile changes
```

Acceptance (from build-27 §3, empirical accuracy row for R1–R6): the "shift" narrated to the user must be **accurate** (it matches a deterministic re-derivation of the transit engine) and **non-fabricated** (the model narrates only deltas present in the fed continuity block, and the block is absent when the delta is trivial — the astro analog of R5's *prose-never-contradict*).

---

## 2. Current state (verified in codebase) + the "engine exists, no temporal delta" verdict

### The transit ENGINE + natal baseline exist (R1) — and are date-flexible

- **`server/src/services/astrology.service.ts:414` — `computeTransits(natal: NatalChart, date: Date): TransitSet`.** Takes an **explicit arbitrary `date`**; never calls `new Date()` internally. Anchored to **UTC noon** of that calendar date (`transitingPositions`, L388–408, `swe.julday(...,12.0,...)`). **Pure + deterministic** — a function only of `(natal, date)`; reads no DB; the module-level `transitPositionCache` (L372, cap 64) is a natal-independent memoization keyed by UTC date (affects speed, never output). ⇒ **Given a stored natal chart and any past date, R6 can re-derive that date's transits EXACTLY.** This is the single most important enabling fact for R6's baseline decision (§4).
- **`describeTransits(transits, limit=8): string[]`** (`astrology.service.ts:481`) — human-readable lines ("Transiting Saturn square natal Sun (orb 1.2°)"), tightest-orb-first. **`describeNatalAspects(chart, limit=8): string[]`** (`:468`) — pure function of the stored `chart.aspects` (static per user).
- **`natalChart` on `UserProfile`** (`server/src/models/UserProfile.ts:96` interface, `:539` schema, sub-schema L195–221): sun/moon/rising, `planets[]` (11 bodies incl. True Node), `houses[]` (Placidus), `aspects[]`, `angles` (asc/mc/desc/ic, `null` when time unknown), + `houseSystem`/`ephemeris`/`timeKnown`/`computedAt`. **Stable per user** — computed once at birth-data save (`profile.service.ts:294`/`:415` via `buildNatalChart`), with lazy backfill at read time (`insight.service.ts:73–86`, `reading.controller.ts:378`/`671`). The fixed reference the transits move against.

### The synthesis engine exists (R5) — R6 reuses it wholesale

- **`server/src/services/synthesis-routing.ts:159` — `createSynthesisMessage({surface, prompt, maxTokens, image?, promptVersion?})`.** Resolves model per `SynthesisSurface` (flag-gated Fable 5 → Opus 4.8 for marquee; `claude-sonnet-4-6` for cheap), streams via `beta.messages.stream(...).finalMessage()`, handles `stop_reason:'refusal'`, and fire-and-forget logs `{surface,promptVersion,model,fellBack,stopReason}` to `ai_generations`. **R6 continuity = synthesis prose → routes through this helper; no new model plumbing.**
- **`server/src/prompts/shared/feature-context.ts` — `buildFeatureContext(profile: FeatureContextInput): string`** renders a `## DEEPER PROFILE SIGNALS` block from R1 astro / R2 face / R3 palm / R4 numerology; returns `''` when no signals. **This is R6's extension point** — the continuity block is a sibling section (or a dedicated `buildContinuityContext`) spliced into the same prompts. It labels transits `**Today's Key Transits:**` (a current-moment snapshot) — R6 adds the *temporal* dimension.
- **The three prompt builders** (`daily-insight.prompt.ts:33`, `weekly-forecast.prompt.ts:45`, `monthly-reading.prompt.ts:50`) each call `buildFeatureContext(profile)` and splice it in. **None accepts a continuity/delta param today** — R6 threads an optional one through.

### What is CACHED — and what is NOT (the gap R6 fills)

- **`server/src/models/InsightCache.ts`** — `{ userId, type:'daily'|'weekly'|'monthly', content:Mixed, validUntil, createdAt, updatedAt }` + compound index `{userId,type,validUntil:-1}`. **`content` is the rendered reading blob ONLY.** **No generation-time STATE is persisted** — no `activeAspects`/`keyTransits`/placement snapshot, no prompt version, no model, no `UserInsightProfile`. (Confirmed: the mirror type `shared.ts:970` agrees.)
- **Cadence** (`insight.service.ts`): daily → `getMidnight()` (24:00 today, L284); weekly → `getNextMonday()` (L293); monthly → `getFirstOfNextMonth()` (L308). Reads filter `validUntil:{$gt:now}` (L339/454/506); **`cleanupExpiredCache()` (L551) deletes expired rows** → **the prior reading's `createdAt` is NOT durably available after expiry.**
- **`keyTransits` is computed live at `new Date()`** in `buildUserInsightProfile` (`insight.service.ts:120`: `computeTransits(natal, new Date())`) every generation and **persisted nowhere.** personalYear/personalMonth likewise fresh (R4 staleness fix, L239–249).
- **No transit-history table, no persisted transit time-series** anywhere (confirmed: model list has no transit model; grep `transit` over `models/` → none).

### Is there ANY "since last reading" / streak / delta notion today?

- **Continuity/delta: 100% greenfield.** No runtime feature. Only planning notes (`build-27.md:36`) + the two forward-looking comments above. (The only "since last" logic that runs is `reading.controller.ts:516` — a career-destiny *regeneration-eligibility* staleness check, `career.generatedAt` vs face/palm `uploadedAt`; not a user-facing delta.)
- **BUT a server-side engagement/streak primitive already exists** — `User.engagement { currentStreak, longestStreak, lastCheckIn?, totalCheckIns }` (`server/src/models/User.ts:58–64` / `:211–225`), driven by `engagement.controller.ts` (`checkIn` L9–79, `getStreak` L85–106; routes `POST /engagement/checkin`, `GET /engagement/streak`), plus `lastSeenAt`/`lastDailyPushSentAt` (`User.ts:78–81`). **R6 can seed/anchor its baseline off this "last active" signal** rather than inventing a new tracking system.
- Mobile `reviewStore.ts recordMeaningfulAction` is an app-rating counter (`daily:<date>`/`monthly:<month>` dedup), **not** a streak/visited-days notion — not a baseline source.

### ⚖️ THE R6 VERDICT — distinct from R1–R5

**The transit ENGINE + natal baseline exist (R1) and the synthesis engine exists (R5), but there is NO temporal delta — nothing computes or narrates "what changed since last time."** Explicitly:

- **NOT a data-extraction/spike problem (R2/R3)** — no CV, no new library; the transit engine is already exact and date-flexible.
- **NOT a data-plumbing refactor (R4)** — nothing scattered to consolidate.
- **NOT a first-time-copy problem (R5)** — the synthesis engine is built; R6 feeds it a *new kind* of context.
- The actual work is **three pieces**: (a) **establish a baseline** for "last reading" (the #1 decision — nothing durably records it today); (b) **compute the transit/state delta** vs now (a pure diff of two `computeTransits` results + moon-sign / personal-month rollovers); (c) **synthesize** the delta into R5's copy through a continuity block **that R6 must first build into the seam** (§1 correction), omitting it honestly when trivial.

**The fix is: a small persisted baseline timestamp + a deterministic delta module + a continuity block woven into the existing synthesis surface — no new endpoint, no new model plumbing, zero mobile changes.**

---

## 3. Target architecture

```
BASELINE (the #1 decision — recompute, not snapshot; see §4)
  Persist ONE per-user timestamp: continuity.baselineAt (advanced when a note is surfaced).
  Natal chart is already stored + stable. To reconstruct the prior state, RE-DERIVE it:
    computeTransits(natal, baselineAt)   — exact + deterministic (R1 engine, arbitrary date)
  No per-reading transit snapshot stored — recompute is exact, so a snapshot buys nothing.

DELTA (pure, in code — R6's analog of R2/R3's rules table / R5's routing module)
  server/src/services/continuity.service.ts  (NEW)
    computeContinuityDelta(natal, baselineAt, now, numerologyThen/Now) → ContinuityDelta
      = diff( describeTransits(computeTransits(natal, baselineAt)),
              describeTransits(computeTransits(natal, now)) )
        → newAspects[]  (formed since baseline)
        → endedAspects[] (dissolved since baseline)
        + transiting-Moon sign change (coarse — UTC-noon; guarded, see §4/§11)
        + Personal Month / Personal Year rollover (R4, computed fresh both dates)
      + a MEANINGFULNESS gate:  isMeaningful(delta, gapDays) → boolean
        (≥1 formed/ended aspect, OR a sign/personal-month rollover, AND gap ≥ MIN_GAP_DAYS)

SYNTHESIS (reuse R5 — build the seam R5 documented but didn't ship)
  buildContinuityContext(delta): string   (NEW, in prompts/shared/)
    → "" when !delta.meaningful  (fail-open: a normal reading, no fabricated shift)
    → else a "## WHAT'S SHIFTED SINCE YOUR LAST READING" block + a strict instruction:
        narrate ONLY these listed changes; if the list is empty, say nothing about change.
  Thread an optional `continuity?: string` through buildFeatureContext / the prompt builder,
  spliced BEFORE the "now" signals, so R5's createSynthesisMessage sees it as extra context.
  Output shape (DailyInsightOutput / …) UNCHANGED → zero mobile changes.

CADENCE + CACHING
  Continuity rides the surface it's woven into (primary: daily) — no new endpoint, no new
  cache. It regenerates with that surface's InsightCache cadence. baselineAt advances to
  "now" WHEN a meaningful note is surfaced (so the next same-cadence reading sees a ~0 gap
  and omits — self-regulating). Seeded from User.engagement.lastCheckIn / lastSeenAt on
  first run (retroactive first delta for existing users).

MODEL ROUTING
  Continuity is CONTEXT within an existing surface → it inherits that surface's route in
  SYNTHESIS_MODELS (daily = cheap today). No new SynthesisSurface unless a dedicated
  continuity surface is chosen (§4 alternative) — then add `continuity` (recommend cheap).
```

---

## 4. Key decisions

> ✅ **NO SPIKE** — R6 has no feasibility question: the transit engine is proven exact + date-flexible (R1 §13 + this plan's §2), the synthesis engine is proven (R5), and the delta is a pure diff. The only unknown is a *product* one (tier-reach), surfaced as a Sid gate below.

| # | Decision | Recommendation | Why / caveat |
|---|---|---|---|
| **1 — BASELINE (the central R6 decision)** | **Recompute** the prior state by re-deriving transits for a persisted **last-engagement timestamp**, NOT by snapshotting per-reading transit state. Store ONE field: `continuity.baselineAt`. | `computeTransits(natal, date)` is **exact + deterministic** for any past date (§2), so recompute === what a snapshot would have stored — a snapshot buys **no accuracy** and costs per-reading storage + is **forward-only** (dead for every existing user). Recompute needs only a tiny timestamp, works **retroactively** for all users with a natal chart, and keeps both delta endpoints on the **same engine version** (a snapshot would freeze the old engine → cross-version diff mismatch if `ephemeris`/orbs ever change). **Rejected: (b) snapshot into each cached reading** — heavier, forward-only, redundant. |
| **1b — what to persist** | **Only `baselineAt` (timestamp).** Re-derive BOTH endpoints' transits on demand and diff. (Optional micro-opt: cache the baseline's `describeTransits` signature to skip one recompute — do NOT bake it in; it re-introduces snapshot-style state for negligible gain given the memoized engine.) | Minimal state; the diff is cheap (two memoized transit computes). Storing the prior signature would drift toward option (b) for no real benefit. |
| **2 — SURFACE** | **Weave into the existing DAILY insight** (primary) as optional synthesis **context** — no new endpoint, no new cache, **output shape unchanged**. Flag monthly as a secondary candidate. **Reject a dedicated "what's shifted" card/endpoint for v1.** | Daily is the retention/habit surface where an engagement *gap* is most visible ("returning after 2 weeks"). Weaving as context keeps the R1–R5 **zero-mobile-changes** discipline (a dedicated card = new endpoint + new cache + mobile render + a new `SynthesisSurface`). R5 *documented* this intent (its "continuity block seam"); R6 materializes it. Monthly has a built-in 1-month gap (always "meaningful") but reads as "this month," not "since you were last here" — weaker fit; keep as a secondary weave if the daily reach (see #4) is too narrow. |
| **3 — CADENCE + CACHING** | Continuity rides the woven surface's cadence + `InsightCache` (daily → midnight). **`baselineAt` advances to `now` only when a *meaningful* note is actually surfaced.** No new cron, no new cache row. | Self-regulating: after a meaningful note shows, the next same-day/next-day reading sees a ~0 gap → block omitted. The baseline measures "time since we last TOLD you what shifted," so the gap is semantically correct (distinct from `lastSeenAt`, which fires every request). Caveat: the note is baked into the cached `content`; that's fine — it's correct as of generation and expires normally. |
| **4 — TIER-GATING (product/Sid call)** | **Default: continuity reaches the surface it rides.** Woven into daily-full ⇒ Premium Plus (matches today's daily-full gate; free/premium get the teaser). **RECOMMEND additionally carrying a short continuity *hook* into the free/premium daily TEASER** as a re-engagement + conversion pull. **Flag the exact tier-reach as an owner/product decision → `sid-signoff.md` (S-R6).** | Genuine tension: the retention goal argues for reaching **free/premium** (the churn-risk tiers), but the richest surface (daily-full) is **PP-only**. This is the one real product gate in R6 (a reach/copy-tone call, not an engineering one). Proceed-on-default = daily-full (PP) + a teaser hook; adjust on Sid's reach preference (cheap prompt/gate re-map, no re-architecture). |
| **5 — MODEL ROUTING** | **Reuse `createSynthesisMessage`; NO new `SynthesisSurface`** — continuity is context within an existing surface, inheriting its route (daily = `cheap` / `claude-sonnet-4-6`). Add a `continuity` surface entry **only if** a dedicated surface is later chosen (then recommend `cheap` — a short delta note, not a marquee reading). | Continuity is synthesis prose; the routing module is R5's single source. A dedicated marquee model for a one-paragraph "what shifted" note is not worth Fable-5 economics. The four feature sets still weave into the copy on whatever model the surface uses (R5 invariant). |
| **6 — "NOTHING CHANGED" HONESTY (the prose-never-contradict analog)** | The delta's **meaningfulness gate lives in CODE, before the LLM sees anything.** `buildContinuityContext` returns `''` when `!delta.meaningful` → no continuity block → the reading is just a normal reading. When a block IS emitted, it **enumerates the exact changes** and instructs the model to narrate **only those**. Never fabricate a dramatic shift. | Transits move slowly; a 1-day or even 1-week gap is often ~0 delta (UTC-noon coarseness compounds this for the fast Moon — §11). Because the "is there a meaningful shift?" decision is deterministic code, the model is structurally prevented from inventing change — it only ever narrates a list R6 computed. This is the astro analog of R5's *prose-never-contradict* and an explicit passing criterion (§10). |
| **7 — BASELINE SEEDING (existing users)** | On first R6 run with no `baselineAt`, **seed from `User.engagement.lastCheckIn` ?? `lastSeenAt` ?? `now`.** If seeded from a real prior-activity timestamp → an immediate first delta; if only `now` is available → first reading has no continuity (block omitted), and continuity accrues from the next gap. | Reuses the existing engagement primitive (§2) so returning users get a first "welcome back" delta rather than a cold start. Fail-open: a user with no natal chart or no prior-activity signal simply gets a normal reading. |
| **8 — DELTA CONTENT** | Delta sources: **(primary) formed/ended natal-transit aspects** (diff of `describeTransits` at the two dates); **(secondary) transiting-Moon sign change** (guarded — coarse); **(R4) Personal Month / Personal Year rollover** (computed fresh both dates). Sun/rising never change (natal) → never in the delta. | Rich but honest. The aspect diff is the backbone (slow outer-planet movement = the real "shifts"). Moon-sign changes are flagged low-confidence (UTC-noon, ~6°/day) and only surfaced on a clear cross-cusp move + a ≥ MIN_GAP gap. Personal-month rollover is a clean, discrete, correct "shift" straight from R4. |

### Where continuity sits relative to the four feature sets

Continuity does **not** replace the R1–R4 "now" signals in `buildFeatureContext` — it is an **additional, temporal** block spliced **before** them ("here's what moved since last time" → then "here's where you are now"). The four feature sets still weave into every reading exactly as R5 built them; R6 adds the delta layer on top.

---

## 5. Data model / shared types

R6 needs **one small persisted field** + **one internal delta type** — no user-facing schema change (output shapes unchanged).

**New persisted field — the baseline.** Add to the profile (recommend `UserProfile`, which the insight path already loads and which owns `natalChart`; alternatively co-locate under `User.engagement` since it's an engagement signal — pick one, `UserProfile` keeps continuity state beside the chart it depends on):

```ts
// server/src/models/UserProfile.ts  (+ mirror the type in server/src/types/shared.ts
// and packages/shared/types.ts if surfaced in any DTO — internal-only is fine to keep server-side)
continuity?: {
  baselineAt: string;        // ISO — the last-engagement date the current delta is measured FROM.
                             // Advanced to "now" whenever a MEANINGFUL continuity note is surfaced.
  continuityVersion: string; // CONTINUITY_VERSION — algorithm tag (mirrors NUMEROLOGY/RULES_VERSION)
};
```

**New internal type — the computed delta (server-only; not persisted, not a DTO):**

```ts
export interface ContinuityDelta {
  meaningful: boolean;          // the code-level gate (§4 #6) — false ⇒ no continuity block
  gapDays: number;              // whole days from baselineAt → now
  newAspects: string[];         // transit aspects FORMED since baseline (describeTransits lines)
  endedAspects: string[];       // transit aspects DISSOLVED since baseline
  moonSignChange?: { from: string; to: string };   // guarded, coarse (§11) — omit if low-confidence
  personalMonthChange?: { from: number; to: number };
  personalYearChange?: { from: number; to: number };
}
```

**No `InsightCache` schema change** — continuity is baked into the existing `content` prose; nothing new is cached. **No `UserInsightProfile` change is strictly required** (the delta is computed in a sibling step and passed as a prompt param) — optionally add an internal `continuity?: ContinuityDelta` for symmetry, but keep it DATA-flow-only, not a rendered field.

`CONTINUITY_VERSION = '1.0.0'` constant (co-located with the delta module) — the R2/R3 `RULES_VERSION` / R4 `NUMEROLOGY_VERSION` pattern: bumping it lets a future algorithm change (orb policy, Moon handling, gate thresholds) be rolled out deliberately.

---

## 6. The continuity-delta module (R6's analog of R2/R3's rules table / R5's routing module)

R6's single-source module is **`server/src/services/continuity.service.ts` (NEW)** — the one place the delta is computed and the meaningfulness gate lives, so every surface that ever weaves continuity does it identically:

- **`computeContinuityDelta({ natal, baselineAt, now, birthDate }): ContinuityDelta`**
  1. `then = describeTransits(computeTransits(natal, baselineAt))`; `now_ = describeTransits(computeTransits(natal, now))` — two exact, memoized transit reads.
  2. `newAspects = now_ \ then`; `endedAspects = then \ now_` (set diff on the descriptor lines; normalize orb wording so orb drift alone isn't counted as a change — diff on the *aspect identity* "transiting X <asp> natal Y", not the parenthetical orb).
  3. Moon-sign change: transiting Moon sign at `baselineAt` vs `now` — **only surfaced when it's a clean single-boundary move AND `gapDays ≥ MIN_GAP_DAYS`** (guard against UTC-noon coarseness spuriously flipping near a cusp).
  4. personalMonth/personalYear at both dates via the R4 utils (`getPersonalMonth`/`getPersonalYear`, fresh from `birthDate`) → rollover changes.
  5. `gapDays` from `baselineAt → now`.
  6. **`meaningful = gapDays ≥ MIN_GAP_DAYS && (newAspects.length || endedAspects.length || moonSignChange || personalMonthChange || personalYearChange)`.**
- **`buildContinuityContext(delta: ContinuityDelta): string`** (recommend `server/src/prompts/shared/continuity-context.ts`, beside `feature-context.ts`):
  - `!delta.meaningful` → return `''` (fail-open — no block, no fabrication).
  - else a `## WHAT'S SHIFTED SINCE YOUR LAST READING` markdown block listing the enumerated changes + a **strict instruction**: *"Weave a brief, warm 'since you were last here (~N days ago)' note using ONLY the shifts listed above. Do not invent movement, dates, or placements not listed. If a listed item is minor, mention it lightly. Never overstate the magnitude of a slow transit."* (mirrors R5's monthly "forbid fabricating placements" framing + the §8 snapshot-vs-window caveat).
- **`CONTINUITY_VERSION`** + `MIN_GAP_DAYS` (recommend a small default, e.g. 3–4 days; tune in testing/A-B) constants exported from the module — the single knobs for the honesty gate.
- **Honesty note (doc-level, as in R2/R3/R4 §6):** continuity is entertainment framing over a real, deterministic ephemeris diff. The bar is *accuracy* (the narrated shift matches a re-derivation of the engine) and *honesty* (no shift narrated when the diff is empty). R6 alters **no** substance — it reads the R1 engine and R4 numbers and reports their difference.

**Do not disturb** R2/R3's `reconcile*` (face/palm substance pinning) or R5's `createSynthesisMessage` internals — R6 only *calls* the helper with an augmented prompt.

---

## 7. Wiring into readings (per surface)

- **Daily** (primary — `insight.service.ts getDailyInsight` + `claude.service.ts generateDailyInsight` + `daily-insight.prompt.ts`): on cache miss, after loading the profile + natal, call `computeContinuityDelta(...)`; pass `buildContinuityContext(delta)` as a new optional `continuity` param to `buildDailyInsightPrompt(profile, continuity?)`, which splices it (before `buildFeatureContext`'s "now" signals). Bump `DAILY_PROMPT_VERSION` (`daily.v2 → daily.v3`) so A/B attributes continuity. **If `delta.meaningful`, advance `profile.continuity.baselineAt = now` and persist (best-effort, fire-and-forget — must not fail the reading).** `DailyInsightOutput` **unchanged**. Route stays `cheap`.
- **Daily teaser** (`getDailyTeaser`, free/premium): per decision #4, optionally carry a short continuity *hook* — a one-line "since you were last here…" pull — into the teaser copy (tier-reach pending the Sid gate). Same delta, shorter render. `unlockPrompt` unchanged.
- **Monthly** (secondary candidate — `monthly-reading.prompt.ts`): a monthly "since last month" weave is possible but reads differently (built-in 1-month gap). **Defer unless the Sid tier-reach decision favors monthly** (monthly reaches free+premium, unlike daily-full). Same module, same optional param.
- **Weekly** (`weekly-forecast.prompt.ts`): PP-only, low volume — **out of scope for v1** (redundant with daily continuity for the same PP user). Revisit only if daily is dropped as the surface.
- **Compatibility / Career / Name-Destiny**: **out of scope** — these are one-time/on-demand marquee readings, not cadence surfaces; "since your last reading" has no natural baseline there. (Career already has its own regeneration-eligibility staleness check, §2 — unrelated.)
- **Baseline advance point (subtle, get it right):** advance `baselineAt` when a **meaningful note is generated into a served reading**, not on every request and not when the block is omitted. This keeps "gap" = "time since we last showed you a shift." Guard the advance behind the same `delta.meaningful` used to emit the block.

---

## 8. Migration / baseline seeding / verification (acceptance: no user loses access; no fabrication)

- **No data backfill script needed.** Continuity is computed on-demand from the stable natal chart + a lazily-seeded timestamp. Existing users:
  - First post-R6 daily generation with no `continuity.baselineAt` → **seed** it (decision #7: `engagement.lastCheckIn ?? lastSeenAt ?? now`). If seeded from a real prior-activity date, the first reading carries an immediate "welcome back" delta; if only `now`, the first reading has no continuity and it accrues from the next gap. Either way **no user loses access** — continuity is strictly additive to an otherwise-normal reading.
  - Users **without a natal chart** (no/incomplete birth data) → `computeTransits` unavailable → **fail-open to a normal reading** (no continuity block). The insight path already lazy-computes `natalChart` when birth data exists (`insight.service.ts:73–86`), so most users self-heal.
- **Coexistence:** cached daily content that predates R6 expires naturally (midnight) → regenerates with the continuity-aware prompt on next request. No invalidation needed; no mixed-state document is ever produced.
- **Accuracy verification (the retention-mechanic acceptance):** because the delta is a **deterministic re-derivation** of the R1 engine, "is the shift accurate?" is unit-testable: pick a known natal + two dates → assert the module's `newAspects`/`endedAspects`/rollovers match a hand-computed `computeTransits` diff. **Non-fabrication** is structural (§4 #6): the model only receives shifts R6 enumerated, and receives an empty block (⇒ no continuity prose) when the diff is trivial.
- **Migration doc:** record the above as the R6 migration note (no data script; lazy baseline seed; fail-open when no chart; additive to existing readings).

---

## 9. Sequencing (within R6) — no spike; baseline + delta first, then the seam, then wiring

0. ~~Phase-0 spike~~ — **N/A** (§4): no feasibility question. This plan is the entry gate.
1. **Types + baseline field**: `continuity` sub-doc on `UserProfile` (`baselineAt` + `continuityVersion`); `ContinuityDelta` internal type; `CONTINUITY_VERSION` + `MIN_GAP_DAYS` constants. tsc clean both sides.
2. **Delta module** (`continuity.service.ts`): `computeContinuityDelta` (two-date transit diff + moon/personal-month/-year rollovers + the meaningfulness gate). Pure, unit-tested against hand-computed diffs. No prompt/reading touched yet.
3. **Build the seam** (`prompts/shared/continuity-context.ts`): `buildContinuityContext(delta)` → block or `''`; thread an optional `continuity?: string` param through `buildDailyInsightPrompt` (and, if chosen, monthly). tsc clean.
4. **Wire into daily**: compute delta in `getDailyInsight` on cache miss; pass the block; bump `DAILY_PROMPT_VERSION`; advance `baselineAt` on a meaningful surface (fire-and-forget persist); baseline seeding for un-seeded users. `DailyInsightOutput` unchanged → zero mobile changes.
5. **Tier-reach + teaser hook** (behind the Sid gate, decision #4): daily-full (PP) default + optional free/premium teaser hook; adjust to Sid's reach preference (cheap re-map).
6. **Validation pass**: unit tests (delta correctness, low-delta omission, gap gate); a seeded-profile smoke (returning user after N days → correct woven note; 1-day gap → no block); `tsc --noEmit` clean both; confirm output shapes byte-identical (zero mobile changes).

*(Steps 1–3 are Sid-independent; step 5's tier-reach is the only gated piece, proceed-on-default per §4 #4.)*

---

## 10. Passing criteria (R6-specific — from build-27 §3)

- [x] **Baseline established**: `UserProfile.continuity.baselineAt` sub-doc landed (step 1); seeded `stored ?? engagement.lastCheckIn ?? lastSeenAt ?? now` and advanced to `now` only on a meaningful surfaced note, else kept (step 4/5, `resolveDailyContinuity`); best-effort/fire-and-forget persist with redundant-write skip. (Step-6 harness proved the seed/advance/keep DECISION; the Mongo persist itself is exercised on-device in **Testing Pass 2**.)
- [x] **Delta accurate (retention-mechanic acceptance)**: step-6 harness — `computeContinuityDelta` (42-day gap) newAspects(7)/endedAspects(14)/gapDays(42)/personalMonth(9→1) JSON-equal to an INDEPENDENT re-derivation from raw `computeTransits`/`describeTransits` + R4 utils; every newAspect present in the raw "now" set; moon correctly omitted (multi-sign move ≠ clean single-sign advance). The narrated shift is exactly the engine's.
- [x] **Non-fabrication verified (prose-never-contradict analog)**: the meaningfulness gate is code-level — a 1-day gap (< `MIN_GAP_DAYS`=3) → `meaningful=false` → BOTH `buildContinuityContext` and `buildContinuityHook` return `''` (no block, no hook); a meaningful gap → block enumerates only real engine lines + carries the strict "ONLY the shifts listed / do not invent" instruction. The model is structurally never handed a shift that didn't happen. (Woven-PROSE quality read = **Pass 2**.)
- [x] **Woven, not bolted on**: continuity rides the daily via R5's `createSynthesisMessage` (daily stays `tier:'cheap'`, `synthesis-routing.ts`); step-6 grep confirmed **no new endpoint, no new cache type, no new `SynthesisSurface`**; block spliced before `## DEEPER PROFILE SIGNALS`, teaser prepends the hook; `DailyInsightOutput` + teaser shape byte-identical → **zero mobile changes**.
- [x] **Fail-open**: no natal chart / no `birthData.date` / any throw → continuity `''` → daily prompt + teaser byte-identical to pre-R6 (step-6: `buildDailyInsightPrompt(p)===buildDailyInsightPrompt(p,'')`).
- [x] **A/B attributable**: `DAILY_PROMPT_VERSION === 'daily.v3'` (step 4) — the `ai_generations` log tags continuity-capable dailies.
- [x] **`tsc --noEmit` clean** on mobile AND server — held green every step (step 6: server exit 0, mobile exit 0).
- [x] **No regression** in the non-continuity path: sub-`MIN_GAP` / no-chart → empty continuity thread → daily + teaser byte-identical to pre-R6 (`git diff --stat 49344eb^..HEAD` = 7 server files only, zero `mobile/`).

---

## 11. Risks / open questions

- **#1 — Baseline availability for pre-R6 / low-engagement users.** No `baselineAt` exists for existing users; `InsightCache.createdAt` is purged on expiry so it can't supply one. **Mitigation:** seed from `User.engagement.lastCheckIn ?? lastSeenAt ?? now` (§7); worst case the first reading has no continuity and it accrues from the next gap. Not a blocker — fail-open by construction.
- **#2 — Low-delta fabrication (the headline risk).** Slow transits + short gaps ⇒ frequent ~0 deltas; a naive prompt would invent drama. **Mitigation:** the deterministic code-level meaningfulness gate (§4 #6) — the model never sees a "change" that didn't happen. Tune `MIN_GAP_DAYS` + the aspect-diff normalization in testing so orb drift alone never reads as a shift.
- **#3 — UTC-noon Moon coarseness.** `computeTransits` anchors to UTC noon (Moon ~6°/day), so a moon-sign flip near a cusp can be off by a day. **Mitigation:** moon-sign change is a *guarded, secondary* delta source — surfaced only on a clean single-boundary move with a ≥ `MIN_GAP` gap; the aspect diff (slow outer planets) is the reliable backbone.
- **#4 — Cost / cadence.** No new LLM call (woven context) — cost is a slightly longer prompt on the daily + two memoized transit computes. **Watch:** daily prompt token growth; the transit cache is cap-64 UTC-date-keyed (recompute for an old baseline date is one extra memoized entry).
- **#5 — Baseline-advance correctness.** Advancing `baselineAt` on the wrong event (every request, or when the block is omitted) breaks the "gap since we last told you" semantics. **Mitigation:** advance strictly when a *meaningful* note is generated into a *served* reading (§7), behind the same `delta.meaningful` guard, fire-and-forget so it never fails the reading.
- **#6 — Tier-reach is a product decision (Sid gate).** Whether continuity reaches free/premium (retention-optimal) or stays PP-only (matches daily-full) is a reach/copy-tone call, not engineering. **→ `sid-signoff.md` S-R6, proceed-on-default = daily-full PP + a free/premium teaser hook.**
- **#7 — Cached-content staleness of the note.** The continuity note is baked into the cached daily `content` (valid until midnight). If the user re-opens the same day, they see the same note — correct (the gap hasn't changed) and it expires normally. Not a bug; noted so it isn't "fixed" into a per-open recompute.
- **#8 — Surface choice may need revisiting.** If the Sid tier-reach decision favors reaching free users, monthly (free+premium) may become the primary/secondary weave instead of / alongside daily-full (PP). The module is surface-agnostic, so this is a wiring re-point, not a re-architecture.
- **No spike, restated**: no CV, no new library, no external service, no model plumbing — the transit engine (exact, date-flexible), the synthesis engine (R5), and R4's numbers already exist; R6 diffs and narrates them.

---

## 12. Files in scope (checklist)

**Server**
- `server/src/services/continuity.service.ts` (**NEW** — `computeContinuityDelta` + the meaningfulness gate + `CONTINUITY_VERSION`/`MIN_GAP_DAYS`; R6's single-source module)
- `server/src/prompts/shared/continuity-context.ts` (**NEW** — `buildContinuityContext(delta)` → block or `''`; the seam R5 documented but didn't ship)
- `server/src/prompts/daily-insight.prompt.ts` (accept optional `continuity` param; splice before `buildFeatureContext`; bump `DAILY_PROMPT_VERSION` → `daily.v3`)
- `server/src/prompts/shared/feature-context.ts` (optional — if continuity is threaded through `buildFeatureContext` rather than the builder directly)
- `server/src/services/insight.service.ts` (`getDailyInsight`/`getDailyTeaser`: compute delta on cache miss; pass the block; advance `baselineAt` on a meaningful surface; baseline seeding)
- `server/src/services/claude.service.ts` (`generateDailyInsight`: thread the continuity param into `buildDailyInsightPrompt`; routing unchanged — reuses `createSynthesisMessage`)
- `server/src/models/UserProfile.ts` (typed `continuity` sub-schema `{ baselineAt, continuityVersion }`, `_id:false`)
- `server/src/types/shared.ts` (`ContinuityDelta` internal type; `continuity` on the profile type if surfaced) + `packages/shared/types.ts` (mirror only if any DTO carries it — internal-only stays server-side)
- `server/src/prompts/monthly-reading.prompt.ts` (**secondary/deferred** — only if the Sid tier-reach decision adds a monthly weave)
- Env/version docs: `CONTINUITY_VERSION` note (no new env var required)

**Mobile**
- **None.** Every touched reading's response shape (`DailyInsightOutput`, teaser shape) preserved; zero mobile changes is an R6 passing criterion.

**Coordinate with R5 + R7**: R6 **builds the continuity seam R5 documented but did not ship** and fills it via `createSynthesisMessage` (no new model plumbing). **R7 (Q&A)** is independent of R6 (also post-R5) — it inherits the same SDK + synthesis infra; if R7 wants to answer "what's changed for me lately?", it can call R6's `computeContinuityDelta` as grounding, but that is an R7 decision, not an R6 dependency.
