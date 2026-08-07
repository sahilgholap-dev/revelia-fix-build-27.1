# R7 — Conversational Q&A + Timing Engine: Requirements Spec (input for Claude Code deep-plan)

> **What this is.** A consolidated, reviewed requirements spec for Build 27 **R7 (Q&A)**, produced by the claude.ai strategist/reviewer from the owner's R7 source material. This is the input Claude Code turns into the code-grounded plan `plans/build-27/R7-QA.md`.
> **What this is NOT.** The implementation plan. This spec deliberately does **not** assert file paths, APIs, env vars, model IDs, or library versions — every such fact is routed to §17 "Claude Code must verify / spike."
> **Owner answers baked in (2026-07): full v2 scope is in build-27 R7 v1** (Timing Engine, launch-required router, Deep Insight, tier-split answer models, full location+consent, timing_log). The moat is **both** multi-modality **and** timing. Deferrals are only what v2 itself defers.

## 0. Source hierarchy (read this first)

Sources, in priority order. **v2 is a delta on top of the PRD, not a replacement of it.**

0. **`Revelia_Build27_Timing_Engine_Handover_v1.md` (Sid, 2026-07-14) — authoritative for everything it covers:** the Timing Engine rule set + six regression fixtures, the reflective interpretation mapping, the Q&A grounding-scope decision, and the device-ID anti-farming specifics. INTERNAL/CONFIDENTIAL, access-limited to Amey/Anirudh/Sid. Where it speaks, it supersedes v2 and the PRD. This spec references it; it does **not** reproduce the rule set (trade secret — lives in the server config repo only).
1. **v2 docs (top truth for the rest of R7):** `Revelia_AI_Astrologer_QA_Section_v2.docx` + `Revelia_QA_v2_Build_Summary.docx` (Sid/Amey/Anirudh, 2026-07-10, "Supersedes v1"). Where v2 speaks, v2 wins.
2. **PRD §2.8–2.15 + §3 (governs where v2 is silent):** the original Q&A spec. Its multi-modal moat, disclosures, 👍/👎, endpoint shape, 402 gate, cron reset, non-streaming-v1, phased rollout, risks, release discipline, and human gates **all survive** because v2 never contradicts them. ⚠️ Losing sight of this loses the moat — v2 never restates it.
3. **`plans/build-27.md` R7 block + §3 passing criteria (STALE — must be updated):** derived from the PRD, now out of date wherever v2 changed things. §17 instructs Claude Code to fix it.

**The moat = multi-modality AND timing.** Every answer grounds in *this user's* full Cosmic Blueprint (astrology natal + transits **+ face traits + palm traits + numerology numbers**, from R1–R5). Timing questions additionally get the **Timing Engine** (sidereal + dasha + moment chart → directional read). Generic horoscope filler is a failure and an acceptance criterion.

---

## 1. Goal & thesis

**Goal.** A Q&A surface where a user asks a personal question and gets a personalized answer grounded in their own reading data. Two answer modes: **reflective** (open questions about self/patterns/relationships/growth) and **timing** (binary/dated/decision questions), the latter powered by the Timing Engine. Endpoint-first, Android-first, entertainment-framed.

**Thesis (why we win).** A generic astrology chatbot loses to ChatGPT. Revelia wins on two defensible axes no competitor combines: (1) **multi-modal grounding** — chart + face + palm + numerology in one conversation (PRD §2.9), and (2) **timing precision** — answers cast to the exact moment/place of asking via a proprietary rule set (v2 §4). Both require the empirical R1–R5 foundation, which is why R7 ships *with* Build 27, not before it.

---

## 2. Reconciliation summary (what changed vs the PRD)

Full table in §0's companion analysis; the deltas v2 introduces over the PRD:

- **Caps:** PRD 2/30/100 → **v2 3/10/15** + a **Deep Insight sub-cap** (1/3/8).
- **Answer model:** PRD "Haiku for Q&A" → **v2: Haiku = router only; answers = Sonnet 5 (free) / Opus 4.8 (paid) / Fable 5 (Deep Insight)**.
- **Token caps:** PRD 3000/600 → **re-derived per model** (timing prompts +1.5–3K input; Deep Insight 400–600-word answers + thinking tokens far exceed 600 output).
- **New machinery (all in v1):** the Timing Engine, the launch-required 5-label router, Deep Insight, per-question timestamp + city-level location (with consent), and the `timing_log` collection.
- **Beyond-cap monetization:** PRD "$19.99 unlimited Pro" → **v2: credit packs** (stub the counter now, build later) → Sid picks the direction (§16).
- **Dead criteria:** PRD's *avg-cost < $0.008* (assumed Haiku answers) and the *3000/600* caps no longer hold; *latency < 4s* must be re-set per model.
- **Kept from PRD (v2 silent):** multi-modal moat, disclosures, 👍/👎, endpoint shape, 402 gate, monthly cron reset, non-streaming v1, retry/degradation, phased A→D, the risk register, release discipline, human gates.

---

## 3. Scope

### In scope — build-27 R7 v1 (the full v2 "build now" set)
- Q&A endpoint: question in → one personalized answer out (reflective or timing mode).
- **Multi-modal context assembly** from R1–R5 (natal + transits + face + palm + numerology + assembled `UserInsightProfile`) + last-N prior turns as context (§11, §16-D1).
- **The Timing Engine** (§5) — moment chart + dasha + rule set → internal directional read → model phrases it.
- **Launch-required Haiku router** (§6) — 5 labels: reflective / timing / off-topic / unsafe / crisis.
- **Tier-split answer models** (§9): Sonnet 5 / Opus 4.8 / Fable 5.
- **Tier caps + Deep Insight sub-caps** (§8), **402 + upgrade payload**, monthly cron reset.
- **Deep Insight** toggle (all tiers), Fable-5 answers, free 1/mo teaser + anti-farming.
- **Per-question timestamp + city-level location** capture with consent + fallback chain (§12).
- **Persistence** (§10): Q&A turn records + the **timing_log** calibration collection (admin-only).
- **👍/👎 feedback**, **entertainment + crisis disclosures** (§13), **graceful degradation**.
- Mobile chat UI (Android-first), non-streaming.

### Deferred (only what v2 itself defers)
- **Randomized forced-binary tiebreak** for mixed timing cases → **Build 28**, pending the live validation study. Until then, mixed = honest both-sides + revisit window.
- **Credit-pack purchase flow** → future build. **Build now:** the counter + at-cap upsell screen, structured so a pack later just increments the counter (no schema change).
- **Streaming** (v1.1). **iOS** release (Android-first; iOS Q&A must pass Apple 5.1.1 when it ships). **Website**.

---

## 4. Functional requirements

1. **Ask.** Authenticated user submits a question. Pipeline: junk check → router classifies → tier/credit gate → context assembly (+ moment chart if timing) → answer-model call (non-streaming) → persist turn (+ timing_log if timing) → return.
2. **Grounding (acceptance-critical).** Reflective answers cite ≥1 specific placement / face trait / palm trait / numerology number. Timing answers add a plain-language directional read + a concrete window, grounded in the user's real periods. Generic filler = failure (20-question acceptance test).
3. **Two answer modes**, one system prompt, two variables (length from Deep Insight toggle; mode from router) — see §11.
4. **Junk rejection** before any model call (client/gateway): no cost, no credit, "Sorry, we didn't understand that."
5. **Safety** (§6): off-topic/unsafe → generic decline (small cost, no credit); crisis → supportive + resources (no credit); carve-outs (§5) → real reflective answer, **credit deducts** (a complete answer was delivered).
6. **Rate limit** (§8): tier cap checked before the answer call → over-cap 402 + upgrade payload. **Credit deducts when the answer is generated (server-side completion in v1; stream start in v1.1), not when the client receives it.** A refund happens **only on system failure** (Anthropic 5xx/timeout, an unrecovered refusal, or our own exception before any content). **Grace window (~2s from request start):** a cancel within it **aborts the upstream model call**, charges nothing, and persists no answer — covers genuine mis-taps; kept short and fixed so a streamed partial (v1.1) can't be harvested for a refund. **After the grace window, client cancellation/disconnect does NOT refund** (it stays charged) and the completed answer is **persisted to the user's history regardless of disconnect**, so cancelling gains nothing and a dropped connection loses nothing. An **idempotency key** prevents a client auto-retry from double-charging. The router call never affects credits.
7. **Persistence & follow-up context** (§10, §16-D1): turns stored per user; last-N fed as context (recommended default); a follow-up costs a credit like any question.
8. **Feedback:** 👍/👎 per answer. No report flow v1.
9. **Disclosures** (§13) on every answer; never claim a real psychic; never expose the timing methodology.
10. **Degradation:** on model 5xx/timeout retry once w/ backoff, then a friendly "the stars are misaligned, try again" message; no credit, no raw error.

---

## 5. The Timing Engine (the v2 core)

> **Internal name only — never surfaced to users.** Trade secret.

**What it does.** For a router-labeled **timing** question, the backend: (a) casts a **sidereal moment chart** for the question's server timestamp at the user's city-level location; (b) judges it against a **fixed internal rule set** *plus* the user's natal chart and running dasha periods; (c) produces an **internal directional read** — favorable / unfavorable / mixed — with supporting factors + a timing window. The **answer model then writes the user-facing text from that read** under §11 style rules. The model phrases; the engine decides. (This mirrors R6's non-fabrication discipline: the model is never handed a shift/verdict the engine didn't produce.)

**What the user sees:** an answer that feels uncannily specific about timing — a directional read in plain words, one or two plain-language reasons, a concrete window. If genuinely mixed: name what would tip it and when to revisit; never a forced yes/no.

**What the user must never see:** any technique name (the handover's hard-blocked list: prashna, horary, muhurta, lagna, bhava, karya, dasha, antardasha, nakshatra, tithi, amavasya, ayanamsa, upachaya, dusthana, plus any rule number), any rule citation, any hint a rule set exists. The model translates everything to plain language ("your chart right now / the period you are in / the window ahead").

**✅ Rule set DELIVERED (was the #1 launch dependency).** Sid's handover supplies the full rule set + six regression fixtures + the reflective mapping. Both blocked artifacts are in hand; the schedule risk is now Amey's to estimate. Build-facing facts Claude Code must plan around (the rule set itself stays in the confidential handover / server config repo — do not copy it into the app repo or this plan):

- **Fixed computation settings (must match the ephemeris service):** Lahiri sidereal, whole-sign houses, mean node, speed flags on (retrograde + stationary detection), Vimshottari on 365.25-day years. These are the acceptance target for the §17.1 spike.
- **Pipeline seam:** router labels `timing` → Stage 2 computes the sidereal moment chart (per-question) + the user's sidereal natal + running dasha stack (natal + dasha cached) → the rule set consumes those and emits an internal read → Stage 4 hands the read to the model → the model writes user text. Engine decides, model phrases (R6 non-fabrication discipline).
- **Output contract (engine → Stage 4):** a JSON object with `category, carve_out, elective_timing_ok, indication (favorable|unfavorable|mixed), confidence, score, factors_plain[], window{from,to,basis}, textures[], tip_condition, revisit_date`. Build the pipeline to this shape.
- **Classification:** net score S over the rules → S ≥ +3 favorable, S ≤ −2 unfavorable, else mixed. Confidence is internal only (never shown as a probability). **Mixed = no randomization in Build 27:** present both sides, name the single tipping condition, give a revisit date. (Randomized tiebreak is Build 28.)
- **Carve-out gate runs first** (see below), with an `elective_timing_ok` sub-flag for pure scheduling questions (timing quality only, outcome claims suppressed).
- **Regression fixtures = the acceptance test.** Six sealed sittings (FX1–FX6) on one shared natal (Monty Adams test data) with exact expected `indication` / `confidence` (±0.05) / window basis, including a compound-question case (FX6 → two verdict objects, never averaged). **If a fixture misclassifies, the implementation is wrong, not the fixture — escalate before touching weights.** These are the concrete pass/fail gate for the engine.
- **Priority order (Sid):** implement the rule set against the fixtures **first** — everything else in the build is comparatively unblocked paperwork.
- **Trade-secret repo split:** the rule set + fixtures (with Monty Adams natal) live in the **server config repo only, never the app repo**, access-controlled (Amey/Anirudh/Sid); excluded from client bundles, analytics, and any logs shipped off-server.

**Carve-outs — never get a directional call even if timing-shaped:** health outcomes, pregnancy/conception outcomes, medical choices, legal/financial decisions, another named person's job/livelihood, or a minor's future beyond temperament/learning style. These get a warm reflective answer + a one-sentence pointer to the right professional, and **do deduct a credit** (a complete answer was delivered — not a decline).

**Trade-secret handling (build implications):** rule set, routing logic, prompt corpus, calibration data are server-side only; excluded from client bundles and analytics payloads. Marketing may say at most "answers are timed to the moment of asking." Support never explains derivation.

**Calibration logging (build now):** every timing question writes a **timing_log** row (§10). This is the future accuracy dataset — the most defensible long-term asset. Admin-only raw-read flag for the owner's test interface; never exposed to users.

**Deferred to Build 28:** forced-binary verdict + randomized tiebreak, pending the validation study. Nothing randomized ships to users before it reads out.

---

## 6. Question routing & safety

**Layer 1 — Haiku 4.5 pre-check (LAUNCH-REQUIRED in v2).** Runs on every question, returns one label: **reflective / timing / off-topic / unsafe / crisis**. Routing depends on it (the Timing Engine needs the timing label), so it ships with Build 27 — not optional, not deferred. Cost is a fraction of a cent; it also produces the abuse-pattern/audit log. Its call **never affects credits**.

- reflective → v1 reflective pipeline (Blueprint context).
- timing → additionally gets the moment chart + dasha context handed into prompt assembly.
- off-topic / unsafe → generic decline, small cost, **no credit**, no explanation of why (being specific teaches people to phrase around the block).
- crisis (self-harm/suicide) → supportive response + crisis resources, **no credit**, never the generic decline.

**Layer 2 — the answering model** is the backstop: declines anything harmful that slips past Layer 1. Safety net, not the primary defense (it costs a full model call).

---

## 7. API contract — *shapes to confirm in-repo (§17)*

**Request** — `POST /api/qa/ask` (confirm route/prefix/body):
```
{ "question": string, "conversationId"?: string, "deepInsight"?: boolean }
```
- Server captures the **timestamp** (server-side, to the minute — never client clock) and resolves **location** (§12); neither is a client-supplied answer field.

**200 (answered):**
```
{ "answer": string, "answerId": string, "conversationId"?: string,
  "mode": "reflective" | "timing", "deepInsight": boolean,
  "usage": { ... }, "remaining": { "questions": number, "deepInsight": number },
  "disclosure": string }
```

**402 (at cap):**
```
{ "error": "limit_reached",
  "scope": "questions" | "deep_insight",
  "tier": "free" | "premium" | "premium_plus",
  "used": number, "limit": number, "resetsAt": ISO8601,
  "upgrade": { "targetTier": string, "cta": string } }   // wording → §16-D6
```

Other returns: junk → validation error (no model call); off-topic/unsafe → generic decline (no credit); crisis → supportive + resources (no credit); **system failure** (Anthropic 5xx/timeout, unrecovered refusal) → degraded message, no credit; **client cancellation/disconnect after the answer was generated → charged, answer persisted to history** (see §8 deduction rule). Design the counter so a **future credit pack** just increments it — no schema change.

---

## 8. Rate-limiting, tiers, caps, credits

**Caps (v2, pending Sid final sign-off §16-D3):**

| Tier | Price (monthly) | Questions/mo | Deep Insight sub-cap | Reset |
|---|---|---|---|---|
| Free | $0 | 3 | 1 of the 3 (teaser) | Calendar month, no rollover |
| Premium | $7.99 | 10 | 3 of the 10 | Calendar month, no rollover |
| Premium Plus | $12.99 | 15 | 8 of the 15 | Calendar month, no rollover |

- **Annual plans** (PRD: Premium $59.99, PP $89.99) are v2-silent → assume they still exist and map to the same monthly caps; **verify in RevenueCat (§17).**
- **Gate:** middleware checks the per-user monthly question counter (and the Deep Insight sub-counter) against the effective tier **before** the answer-model call. Use `getEffectiveTier(user)` so comp grants are honored (§17).
- **At cap:** 402 + upgrade payload → upgrade CTA, never a raw error. Distinguish "out of questions" from "out of Deep Insight" (`scope`).
- **Deduction:** charge **when the answer is generated** (server-side completion in v1; stream start in v1.1), not on client receipt. Refund **only on system failure** (Anthropic 5xx/timeout, unrecovered refusal, our exception before any content). **Grace window (~2s from request start):** a cancel within it **aborts the upstream model call**, charges nothing, and persists no answer (covers mis-taps); keep it short and fixed so a v1.1 streamed partial can't be harvested. **After the grace window, client cancellation/disconnect does NOT refund** — the completed answer is persisted to history regardless, so there's no incentive to cancel and no loss on a dropped connection. Use an **idempotency key** so client retries don't double-charge, and a basic **per-user requests-per-minute cap** so ask-then-grace-cancel can't grief the API. Carve-outs deduct (answer delivered); junk/off-topic/unsafe/crisis declines never deduct (no real answer generation); the router call never deducts. *(Optional: for the scarce free 1/month Deep Insight, a pre-dispatch confirm tap prevents mis-spends better than the timer.)*
- **Reset:** monthly cron, UTC midnight on the 1st (existing `node-cron` scheduler, §17). No rollover.
- **Deep Insight sub-cap** (§9): unused Deep Insight taps expire at month end. Free's 1 teaser, once used, leaves the toggle **visible but locked** behind an upgrade prompt for the rest of the month (this is the conversion surface — do not hide it). Surface remaining Deep Insight count in the question-box UI on every tier.
- **Anti-farming (free Deep Insight) — APPROVED (handover §6):** registered account only (never guest) **and** per-device, at launch. Device gating uses the **OS-sanctioned device ID** (Android: `Application.getAndroidId()` via `expo-application`), **never IMEI/serial** (blocked on both platforms) and **never a hardware fingerprint** (barred by Apple). Backend **stores only a salted hash** (raw ID never persisted; salt server-side, rotate on suspected compromise). A free user's Deep Insight is blocked if either the account or the device hash has already claimed its free one this month. **Fail-open** if the ID is unavailable. iOS equivalent at its launch. **Retention:** life of the account, purged on account deletion; purge block-list entries after 60 days of inactivity (they only cover a monthly window). **Privacy-policy line (approved, under a "Fraud and abuse prevention" heading):** *"To prevent misuse of free features, we collect a device identifier and store it only in a hashed form. It is used solely to enforce fair-use limits, is not used for advertising or cross-app tracking, is not shared with third parties, and is deleted when your account is deleted."* **Google Play Data-safety form:** declare "Device or other IDs," purpose "App functionality" + "Fraud prevention, security, and compliance," not shared, encrypted in transit, deletable with account deletion.
- **Edge cases to specify (§16-D9 / Claude Code proposes):** concurrent in-flight double-spend; mid-month tier change; comp tier; reset timezone; answer succeeded but persist failed.

---

## 9. Model routing & token/cost budget

**Routing by tier (v2 §7/§8 — confirm every ID + param via the `claude-api` skill, §17):**

| Answer type | Model | Effort | Thinking | Build note |
|---|---|---|---|---|
| Free question | **Sonnet 5** (newer than `claude-sonnet-4-6` — confirm ID) | Medium | On (default) | Nothing to configure |
| Premium / PP, regular | **Opus 4.8** | Medium | **Must explicitly enable** ("adaptive") or it silently runs with no reasoning step | The one routing item that needs a deliberate build step |
| Deep Insight (any tier) | **Fable 5** → fallback **Opus 4.8** | High (default) | Always on, can't disable | Reuse R5's server-side `fallbacks` beta; nothing else to configure |
| Router / safety pre-check | **Haiku 4.5** | — | — | <$0.005/question; never affects credits |

- **Timing vs reflective does NOT change the model** — same tier model; the Timing Engine changes the *prompt contents*. Deep Insight on a timing question = fuller treatment (more factors, longer window), same style rules.
- **Token caps (supersede PRD 3000/600):** set `max_tokens` **comfortably above** the word target because **thinking tokens share the ceiling** — too tight a ceiling truncates mid-sentence. Answer lengths: 150–250 words regular, 400–600 Deep Insight. Input grows for timing (natal + sidereal + dasha + moment chart +1.5–3K tokens). **Claude Code sizes the exact caps per model via the skill** — do not assume the PRD numbers.
- **Prompt caching (cost lever, more valuable now):** cache the per-user **tropical natal, sidereal natal, and dasha table**; the **moment chart is per-question, NOT cacheable** — compute inline. Cache floor is model-specific (differs from Haiku) — confirm via skill.
- **Cost estimates (v2 §9, directional until week-one token logging):** free/Sonnet <$0.02; regular reflective/Opus ~$0.02; regular timing/Opus ~$0.03; Deep Insight reflective/Fable ~$0.11; Deep Insight timing/Fable $0.13–$0.15; router/Haiku <$0.005. **Worst-case monthly ceilings:** Free ~$0.20, Premium ~$1.25, PP ~$2.35 — healthy margin vs $7.99/$12.99. **The PRD's avg-cost-<$0.008 criterion is dead** (assumed Haiku answers) → replace with these per-tier ceilings + a week-one token-logging gate before any pricing decision.
- **⚠️ Latency:** Opus/Fable with thinking are slow; R5 observed **minutes-long Fable turns**. Non-streaming Deep Insight will feel slow → needs a strong loading UX, and argues for prioritizing streaming (v1.1) for Deep Insight. Re-set the PRD's <4s target **per model** (realistic for Sonnet/Opus regular; not for Fable Deep Insight).

---

## 10. Data model & persistence

- **Q&A turn record** (MongoDB, indexed by user): question, answer, answerId, mode (reflective/timing), deepInsight flag, model + usage, feedback (👍/👎, nullable), conversationId (if threading kept, §16-D1), timestamps. **Question timestamp (server, to the minute) + city-level location captured on EVERY question** (all types) so the calibration dataset is complete from day one — with the consent + fallback rules in §12.
- **Counters:** `user.qa` sub-doc — `{ monthlyQuestionCount, monthlyDeepInsightCount, ... }` (confirm exact shape, §17), reset by cron. Designed so a future credit pack increments without schema change.
- **timing_log collection** (per timing question, admin-only, never user-exposed): question text, timestamp, location, **the full engine output object** (indication, confidence, score, factors, window, textures), answerId, and a **null outcome field** until graded. **No sampling — log every run.** This is the calibration dataset. Admin-only raw-read flag for the owner's test interface.
- **Numerology block (new, from handover §5):** deterministic, computed **once at profile save** and cached alongside the natal chart. Fields (plain key-value): `life_path, birthday_number, expression, soul_urge, personality, mulank, bhagyank, personal_year_current`. Computation reuses the letter tables + reduction rules already in the delivered Complete Reading generation prompt (master 11/22 preserved; Y-as-vowel rule) — **reuse, don't re-derive (§17)**. Requires **one new onboarding field: name-at-birth** (optional, with a one-line explanation that it unlocks number-based insight); numerology injects only when it's on file.
- **Palm/face observation blocks (schema now, data later):** wire the storage schema + Stage-4 injection now, populated only after the capture feature ships (FACE = adult + explicit opt-in only). Schema = the structured observation shape from the generation prompt (hand type, thumb, finger architecture, four major lines, density, left/right; face zone observations).
- **Shared types:** any mobile-read DTO → `packages/shared/types.ts` (`@shared/types`); confirm pattern (§17).

---

## 11. Prompt & grounding strategy

**One fixed system prompt, two variables** — answer **length** (Deep Insight toggle) and answer **mode** (reflective/timing from the router). Do not maintain near-duplicate prompts.

**Context in:**
- Always (both modes): the full Cosmic Blueprint — natal placements + transits (R1), face trait bands (R2), palm trait bands (R3), numerology numbers (R4), assembled via R5's context builder (reuse, don't re-derive — §17). + last-N prior turns (§16-D1).
- Timing mode additionally: the sidereal moment chart + running dasha context (as the engine's inputs; the model receives the **directional read + factors**, not raw technique names).

**System prompt must enforce (v2 §5 Stage 4):** use only supplied data, never invent placements; ground every claim in *this user's* specifics, never in statements that could apply to anyone; stay in astrology + personal reflection; no medical/legal/financial advice (say so briefly, answer only the reflective side); if data is thin, say so honestly. **Reflective mode:** direct answer first, then reasoning from placements/transits. **Timing mode:** directional read in plain words first, then 1–2 strongest reasons in plain language, then a concrete window; if mixed, name what would tip it + when to revisit, never force yes/no. **Never expose methodology** (no horary/prashna/muhurta/lagna/dasha/nakshatra — translate to "your chart right now / the current period you're in / the window ahead"). **Enforce the §5 carve-outs.** Consistent format on every answer: direct response first, grounded reasoning second.

**Canonical v2 system-prompt draft (Sid content sign-off pending — Claude Code should use this string, not re-derive it from the summary above).** `{chart/Blueprint data}` is injected below the prompt; **length** and **mode** are the two variables.

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

> ✅ **Grounding scope RESOLVED (handover §5): CONDITIONAL FULL-BLUEPRINT GROUNDING.** Sid confirmed the narrowing to chart-only was drift, not intent, and restored the moat. Stage 4 assembles whatever layers exist for the user: **CHART_BLOCK + TIMING_BLOCK always**; **NUMEROLOGY_BLOCK** whenever name-at-birth is on file (cached, §10); **PALM_BLOCK + FACE_BLOCK** wired now, populated only after capture ships (face = adult + opt-in). **Stage-4 prompt rule to add:** the chart stays primary; cite **at most one numerology reference and one palm/face reference per regular answer (two each for Deep Insight)**, only when genuinely relevant, and a numerology/palm citation **must sit beside a chart placement, never replace it.** This supersedes my earlier "two small edits" proposal — the paste-ready reflective interpretation guidance in **handover §4** goes into the Stage-4 placeholder verbatim, and the block-conditional wording above replaces the astrology-only framing of the draft below.

**Pre-backfill users degrade gracefully** (mirrors R5's caveat): omit absent sections, still personalize from present layers, never fabricate to fill a gap.

---

## 12. Location capture & consent (full v2 version — owner-approved)

- Capture **city-level** location on every question: from profile setting or device location **with consent**. Fallback order: last-known city → birth city, with the fallback **flagged in the log**.
- City-level precision is enough (the moment chart differs Mumbai vs New York, but not block-to-block).
- **Build implications:** a device-location **permission + consent flow** on mobile, consent copy, and a **privacy-policy touch** (legal). Consent UX + copy is a Sid/legal item (§16-D7). Server-side timestamp (never device clock, to prevent spoofing).

---

## 13. Disclosures, legal & trade-secret posture

- **Entertainment disclosure** on every answer (PRD draft: *"AI-generated guidance based on astrological tradition. For entertainment purposes only."*) — final wording Sid/legal (§16-D6).
- **Never claim a real psychic** (Apple 5.1.1 + Google liability). No medical/legal/financial advice.
- **Crisis handling:** self-harm/suicide → supportive response + resources, never a generic decline. Wording + resource list is sensitive → Sid/legal (§16-D6).
- **Trade-secret posture:** never name or hint at the timing methodology in UI, marketing, App Store text, or support. Marketing max claim: "answers are timed to the moment of asking." Keep rule set/routing/prompt-corpus/calibration server-side; exclude from client bundles + analytics.

---

## 14. Phased rollout (A→D)

- **Phase A** — chart UI + history schema + context assembly + **the Timing Engine (rule set now delivered — implement it against the six fixtures FIRST, per Sid's priority order) + router + Deep Insight + numerology cache + name-at-birth field + palm/face empty schema + location/consent + timing_log** + rate limits + RC tier mapping + prompt engineering against the structured Blueprint. Rule set + fixtures live in the server config repo (access-controlled), not the app repo.
- **Phase B** — soft-launch to **Premium only** (Internal Testing); collect 👍/👎 + week-one token logging; refine prompts.
- **Phase C** — open **free tier** (per §16-D3 caps); watch free→paid conversion (the headline metric).
- **Phase D — DECISION, do not build now (§16-D4):** beyond-cap monetization — v2 **credit packs** *or* PRD **$19.99 unlimited Premium Plus Pro** — build when ~3–5% of PP users consistently hit cap.

Release mechanics per `dev-notes/workflow.md`: backend → `main` (Railway auto-deploys); mobile → `feature/build-27`, merged at release; single AAB promotes Internal Testing → Production. **No pre-release device-test path** for server-side work — device pass rides the Internal Testing → promote cycle, so keep R7 **fail-open + response-shape-preserving** and verify as much as possible in local harnesses first (mirrors R1–R6). **Swiss Ephemeris license:** Sid's plan is to run the **free** license during dev and **purchase the commercial license at the internal-testing stage** — a scheduled purchase, not an open blocker (§16-D8 records it).

---

## 15. Non-goals

Randomized forced-binary tiebreak + the validation study (Build 28); credit-pack purchase flow (stub the counter only); streaming (v1.1); iOS release; website. Exposing the timing methodology anywhere user-facing.

---

## 16. DECISIONS NEEDED FROM SID (self-contained — lift straight into an email)

Each item is written to be decided from the email alone. **Blocking** items gate the plan or launch; **non-blocking** can be decided during the build.

**Status after Sid's 2026-07-14 handover:** ✅ **RESOLVED** — D2 (rule set + reflective mapping delivered), D5 (anti-farming approved with privacy copy), and the grounding-scope question (conditional full-blueprint, §11). **Still open:** D3 caps sign-off, D6 copy (disclaimer / CTA / crisis — the anti-farming privacy line is now done), D7 location consent copy, plus the non-blocking D3b / D4 / D8 / D-routing. These four open items were **not** in the trimmed email Sid answered, so they still need a raise (see the follow-up note in chat).

- **D2 — Timing rule set + reflective mapping [✅ RESOLVED, handover 2026-07-14].** Full rule set + six regression fixtures (§3 of the handover, Monty Adams natal) + paste-ready reflective mapping (§4) all delivered; both live in the server config repo, access-controlled. Sid's priority: implement the rule set against the fixtures first. Sid's timeline answer: both blocking artifacts are in hand, so remaining schedule risk is Amey's to estimate back to him. **Action for Amey:** estimate the engine build (against fixtures) and send Sid a rough schedule.

- **D3 — Question caps + Deep Insight sub-caps [BLOCKING for pricing/UI].** Confirm Free 3 (1 Deep Insight) / Premium $7.99 → 10 (3 DI) / Premium Plus $12.99 → 15 (8 DI), calendar-month reset, no rollover. Also: do the annual plans ($59.99 / $89.99) keep the same monthly caps? **Recommendation:** ship as drafted (tight-then-loosen; raising caps later is goodwill, cutting them is a support fire; the DI sub-cap 3-vs-8 becomes the real paid-tier differentiator, so paywall copy should lead with DI allowance). **Blocks:** counter logic, paywall copy, acceptance tests.

- **D3b — Free tier from day one, or hold for the conversion experiment? [non-blocking].** Launch free 3/mo immediately, or soft-launch paid first (Phase B) and open free later (Phase C)? **Recommendation:** phased (B before C) so we measure the free→paid lift cleanly. (PRD §3.4 open item.)

- **D4 — Beyond-cap monetization direction [non-blocking — deferred build, but sets how we stub the counter].** Two candidates: v2 **credit packs** (consumable IAP, ~5-question pack, low single-digit $, ~90-day expiry) vs PRD **$19.99/mo Premium Plus Pro unlimited**. Not built now either way. **Need:** which direction, so the counter is stubbed to match. **Recommendation:** credit packs (finer-grained, less cannibalization of PP); pricing after week-one cost data.

- **D5 — Per-device anti-farming [✅ RESOLVED, handover §6].** Approved as proposed: salted hash, never raw; exact privacy-policy line + Google Play Data-safety declarations + salt rotation + retention rules all supplied (folded into §8). Nothing outstanding.

- **D6 — Copy sign-off [BLOCKING for App Review; sensitive].** (a) Entertainment disclosure final wording. (b) 402 upgrade-CTA wording. (c) **Crisis-response wording + resource list** (self-harm/suicide — must be right). (d) Trade-secret marketing/support guardrails ("timed to the moment of asking" as the max claim). **Need:** approved strings. **Blocks:** App Review readiness + the crisis path.

- **D7 — Location consent UX + privacy-policy update [BLOCKING for the location feature].** We capture city-level location per question (device-with-consent, fallback last-known → birth city). Need approved consent copy + the privacy-policy change (legal). **Blocks:** the location capture flow (a fallback-to-birth-city path can ship without device consent as an interim).

- **D8 — Swiss Ephemeris commercial license [RECORDED — likely resolved].** Your stated plan: run the free license during dev, purchase the Astrodienst commercial license at the internal-testing stage. Recording it so it isn't re-litigated. **Confirm** that still holds, and that it covers the sidereal/dasha use if Claude Code's spike (§17) shows we stay on Moshier or need `.se1` files.

- **D-routing — Premium vs Premium Plus model split [non-blocking].** v2 routes both paid tiers to the same models (Opus regular, Fable Deep Insight); the differentiator is the DI sub-cap, not the model. Confirm there's no per-tier model difference beyond that (PRD §3.4 had this as open).

---

## 17. Claude Code must VERIFY / SPIKE in-repo (do not assert from this spec)

1. **Astrology feasibility [SPIKE — crucial, do not assume].** Can the R1 `sweph` **Moshier** engine produce, at the handover's fixed settings — **Lahiri sidereal, whole-sign houses, mean node, speed flags on (retrograde + stationary), Vimshottari on 365.25-day years** — a **sidereal natal chart**, the **Vimshottari dasha stack**, and a **per-question moment chart**, or does that need new libraries / the licensed `.se1` files / a separate service? **Acceptance = the six regression fixtures (FX1–FX6) reproduce** (indication exact, confidence ±0.05, window basis matches). Report before committing to Phase A sizing; this also settles D8's licensing question. Remember Sid's rule: if a fixture misclassifies, the implementation is wrong, escalate before touching weights.
2. **Model facts via the `claude-api` skill:** exact IDs for **Sonnet 5** (confirmed newer than `claude-sonnet-4-6`), **Opus 4.8**, **Fable 5**, **Haiku 4.5**; the "explicitly enable thinking / adaptive" requirement on Opus; Fable's always-on thinking + refusal handling + the R5 server-side `fallbacks` beta; per-model pricing, context windows, `max_tokens`/thinking-token sharing, and cacheable-prefix floors. Re-verify build-27 §7's numbers (they drift).
3. **Endpoint/route reality:** does a `qa` route group / `POST /api/qa/ask` exist or need mounting in `server/src/routes/index.ts`? Real request/response envelope (some endpoints put fields top-level).
4. **Counters/schema:** `user.qa` sub-doc shape (question + Deep Insight counters); the `timing_log` collection; any existing Q&A scaffolding.
5. **Cron reset** hook in `server/src/jobs/`.
6. **Rate-limit + 402:** how `express-rate-limit` is wired (recall `ipKeyGenerator` + `trust proxy` gotchas); how to return **402** (not the 429 used elsewhere).
7. **Tier gating + prices:** `SubscriptionTier` values + `getEffectiveTier(user)`; the **real Premium/PP monthly + annual prices** in RevenueCat (v2 says $7.99/$12.99 monthly; PRD says $59.99/$89.99 annual — confirm, and confirm annual→cap mapping).
8. **Context seam:** how R5 assembles context (`createSynthesisMessage` / `synthesis-routing.ts` / `buildFeatureContext`-style) so R7 **reuses** it; which `UserInsightProfile` fields carry R1–R4 data.
9. **SDK inheritance:** confirm `@anthropic-ai/sdk ^0.110.0` supports the tier-split calls (Sonnet/Opus/Fable, non-streaming, thinking params, `fallbacks`).
10. **Disclaimer / honesty-preamble** location (`server/src/prompts/`) to reuse consistent copy.
11. **Mobile location** capability: what's available for device location + runtime permission in the Expo stack, and whether a city-level geocode path already exists (R1 used a Haiku geocoder server-side).
12. **Prompt caching** behavior for the chosen answer models against the assembled context.
13. **Device identity (per-device anti-farming, §8/§16-D5 — now settled):** confirm `expo-application` is a dependency (or plan its config-plugin install — no eject, EAS-compatible), that `getAndroidId()` adds no user-visible/dangerous permission to the Android manifest, and how `expo-secure-store`/Keychain behaves across reinstall on iOS (for the later IDFV+UUID path). Design the store as a hashed-device-ID + month-key claim record (raw ID never persisted).
14. **Server config repo (trade secret):** confirm where the server config repo lives and its access controls; the rule set + fixtures (Monty Adams natal) go there, never in the app repo, never in client bundles/analytics/off-server logs.
15. **Reuse, don't re-derive:** the **numerology computation** (letter tables + reduction rules, master 11/22, Y-as-vowel) already exists in the delivered Complete Reading generation prompt — locate and reuse it for the cached numerology block. Same for the **palm/face structured observation schema** — reuse the generation-prompt shape for the (initially empty) storage blocks.
16. **UPDATE the stale ground truth:** revise the `plans/build-27.md` **R7 detail block** + **§3 Q&A passing criteria** to match this spec (new caps 3/10/15 + DI sub-caps; Haiku=router + tier-split answer models; Timing Engine + router + Deep Insight + numerology + location + timing_log in scope; kill the avg-cost-<$0.008 + 3000/600 criteria; re-set latency per model). Note the handover as authoritative for the engine, v2 as superseding, and the PRD as governing where both are silent.

---

## 18. Kickoff prompt for the `build27-R7-QA-Planning` chat (paste into Claude Code)

> **R7 (Q&A + Timing Engine) — DEEP-PLAN ONLY. No code, no deps, no schema changes, no commits. Output = `plans/build-27/R7-QA.md`** (plus the §17 spike report and the `plans/build-27.md` update called out below).
>
> You are on branch `feature/build-27`. Deep-plan Build 27 **R7 (conversational Q&A grounded in the full Cosmic Blueprint, with a proprietary Timing Engine)**, mirroring how R4/R5/R6 were deep-planned. Follow `CLAUDE.md` + `dev-notes/workflow.md`.
>
> **Read first (ground truth, in priority order):** the attached **`R7-QA-spec.md`** (top spec — its §0 source hierarchy, §5 Timing Engine, §16 Sid decisions, and §17 verify/spike list are binding structure); `PROJECT_CONTEXT.md`; `plans/build-27.md` (R7 block + §3 — **STALE, you will update it per spec §17.16**); `tracking_files/session_handoff.md`. Read `plans/build-27/R5-synthesis-engine.md` and mirror its section STRUCTURE.
>
> **Source truth:** the v2 Q&A docs supersede the older PRD/`build-27.md` R7 block **where they speak**; the PRD governs where v2 is silent (especially the multi-modal moat — chart + face + palm + numerology — which stays central and is an acceptance criterion). Do not silently drop the moat.
>
> **Load the `claude-api` skill and use it for EVERY Anthropic fact** — do not assert model IDs (esp. "Sonnet 5" — a genuinely newer model than `claude-sonnet-4-6`), pricing, context windows, thinking/effort params (Opus needs thinking explicitly enabled; Fable always-on + refusal handling; Haiku is router-only here), `max_tokens`/thinking-token sharing, or cacheable-prefix floors from memory. R7 inherits SDK `^0.110.0` + R5's `createSynthesisMessage`/`synthesis-routing.ts` + the server-side `fallbacks` beta.
>
> **Plan the full v2 scope as build-27 R7 v1 (spec §3):** multi-modal context assembly reusing R5's seam; the **Timing Engine** (spec §5 — the rule set + six regression fixtures + reflective mapping are DELIVERED in Sid's confidential handover / server config repo; implement the rule set against the fixtures FIRST per Sid's priority, build to the §5 output contract + fixed compute settings, keep it in the server config repo not the app repo); the **launch-required Haiku router** (spec §6, 5 labels + carve-outs + crisis); **tier-split answer models** Sonnet 5 / Opus 4.8 / Fable 5 (spec §9); caps 3/10/15 + Deep Insight sub-caps 1/3/8 with **402 + upgrade payload** + monthly cron reset (spec §8); Deep Insight toggle + free teaser + approved anti-farming (spec §8); **conditional full-blueprint grounding** (spec §11 — chart+timing always, numerology when name-at-birth on file, palm/face schema wired-now-empty; add the Stage-4 citation rule and paste the handover §4 reflective guidance); the **numerology cache + one new name-at-birth onboarding field** (spec §10); per-question timestamp + city-level location with consent + fallback (spec §12); persistence + counters + `timing_log` (full output object, no sampling); 👍/👎; disclosures + crisis path (spec §13); credit-deduction rule + ~2s grace window (spec §8); graceful degradation; non-streaming. **Deferrals** (spec §15): randomized tiebreak → Build 28; credit-pack purchase flow → future (stub the counter only); streaming → v1.1; iOS.
>
> **§17.1 is a first-class SPIKE, not an assumption:** determine whether the R1 Moshier engine can produce, at the fixed settings (Lahiri sidereal, whole-sign, mean node, speed flags, Vimshottari 365.25), a sidereal natal + dasha stack + per-question moment chart, or whether that needs new libs / `.se1` files / a service. **Acceptance = the six fixtures (FX1–FX6) reproduce** (indication exact, confidence ±0.05, window basis). Run it and report before sizing Phase A; this also settles the Swiss-Ephemeris license question. If a fixture misclassifies, the implementation is wrong — escalate, don't retune weights.
>
> **Verify in-repo before asserting (spec §17):** real route/body/envelope; `user.qa` counters + `timing_log`; cron reset; 402-not-429 given `express-rate-limit` + `trust proxy` + `ipKeyGenerator`; `getEffectiveTier` + real monthly/annual RC prices; the R5 context seam + which `UserInsightProfile` fields carry R1–R4 data; disclaimer/honesty-preamble location; Expo device-location + permission capability; prompt-caching floors; device-identity options (if per-device anti-farming lands). Where a fact isn't in the repo, write "verify X" — don't invent it.
>
> **Also produce:** (a) the spec §16 Sid decisions restated in a short "Open decisions" section (do NOT resolve them yourself — note D2 rule set, D5 anti-farming, and grounding scope are RESOLVED by the handover; flag the still-open ones: D3 caps, D6 copy, D7 location consent as blocking); and (b) the **`plans/build-27.md` update** per spec §17.16 (new caps + model routing; Timing Engine/router/Deep Insight/numerology/location/timing_log in scope; kill the dead avg-cost + 3000/600 criteria; re-set latency per model; mark the handover as authoritative for the engine, v2 as superseding, PRD as governing silence).
>
> **Mirror R5's plan structure:** goal + thesis (multi-modality AND timing moat); current state + file refs + "what R7 inherits from R1–R5"; target architecture (junk → router → gate → context assembly (+moment chart if timing) → tier-model call → persist (+timing_log) → return; the Timing Engine internals; 402 payload); key decisions (tier-split routing, caps + DI sub-caps, rule-set-produces-the-read discipline, follow-up context depth, degradation, caching, per-device anti-farming); data model / shared types; sequencing (Phase A: engine against fixtures first, then the rest → B Premium soft-launch → C free → D deferred); passing criteria (cite ≥1 specific datum on 20 questions; per-tier cost ceilings + week-1 token logging; **per-model** latency targets; caps + 402; App-Review disclosures; timing reads non-fabricated — engine-produced, model-phrased, à la R6); risks (grounding vs generic filler; pre-backfill degradation; Fable Deep Insight latency/UX; astrology-compute feasibility; abuse/rate-limit edge cases; trade-secret leakage); files-in-scope checklist. **PLANNING ONLY.**
