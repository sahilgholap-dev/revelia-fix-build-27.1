# Build 27 — Deferred Caveats & Known Limitations

> Standing register of technical caveats / known limitations **deliberately accepted** during Build 27 implementation, to revisit **at the end of Build 27 or during feature testing** — not bugs to fix now. Each is either a v1-scope decision, a cheap additive fix, a dataset-tuning item, or cosmetic.
>
> Related registers (cross-referenced, not duplicated): owner **sign-off** gates → `sid-signoff.md`; owner **deploy/backfill** chores → `owner-actions.md` (§ POST-SHIP STATUS = the live list); **durable engine watch-outs** → `claude_progress.md` § "DURABLE ENGINE WATCH-OUTS" (rehomed there 2026-07-27 — they used to live in `session_handoff.md`, which is overwritten each session).
>
> Tags: 🔧 fix-if-cheap (do at end/test) · 📌 v1-scope (deferred to a future R.x — bigger effort) · 🎚️ tuning (threshold recentre; owner/data) · 🧹 cosmetic · ⚠️ watch-during-testing
>
> ## 🚢 POST-SHIP NOTE (2026-07-27)
> **Build 27 SHIPPED — v2.0.0 is live on Play Store production.** These caveats were accepted *during* the build and are now **live in front of real users** — "revisit at the end of Build 27" has arrived, so treat this register as a genuine backlog rather than a deferral list. Two framings below are now out of date:
> - **`REPORT_WORKER_ENABLED` is no longer "prod-dark"** — it is **ON in production**. The `pdfKey:'STUB'` tripwire still applies as a monitoring rule (any prod Report with a STUB key = a stale image), but the flag-flip gating language is spent.
> - **Anything phrased as "prove it on staging"** is unrunnable — the Build-27 staging Railway project has been **torn down**; there is one live-production backend again.
>
> Active point-release branch for acting on these: **`fix/build-27.1`** (2.0.x).

---

## Disposition at a glance (2026-07-08 — NONE cleared yet; all tracked, none dropped)

We are **deferring, not skipping.** Each caveat has a moment:
- 🎚️ **tuning** (R2 faceShape, R3 palm thresholds) → addressed in **Pass 2 (post-R5 device pass)**, before the wide backfills. Pass 1 (pre-R5 local) just *records the real-photo distributions* that inform them.
- 🔧 **fix-if-cheap** (R3 `financialGrowthScore` not rules-pinned; S1/S3 first-pass archetype/trait names) → decide at **end of build-27**; each is an additive `RULES_VERSION` bump (or a re-map if Sid revises) — no re-detect.
- 🧹 **cosmetic** (forehead loading string, R4 dead/stale code, R1 legacy `birthChart` field) → end-of-build tidy or leave; zero user impact.
- 📌 **v1-scope / roadmap** (measured palm lines → R3.x, mounts, forehead-card replacement, reserved finger ratios) → deliberately **OUT of build-27 scope** (future R.x). Product-tracked, not forgotten.
- ⚠️ **watch-in-testing** (R4's two deliberate value changes) → observe during Pass 1/2; no fix unless it surprises a user.
- **R5 gates** (SDK upgrade, Fable 5 access / ZDR) → handled **inside R5** (step 1 + the probe), not here.
- **Owner chores** (recentres → wide backfills, `feature/build-26`→`main`, R8 export stub) → **release time**.

**Walk this whole register at end of build-27 and during both test passes** — clear items as they're actually done.

---

## R2 — Face  (✅ IMPLEMENTED)
- 🎚️ **faceShape thresholds skew round/square on best-case GAN faces** (step-9 probe). Owner recentres thresholds (a re-detect per §6) **BEFORE a wide `backfill:face-features`**. Data-tuning, not a code bug. **UPDATE (Pass 1, 2026-07-09): the skew reproduces on REAL photos too — 2/2 real selfies → `square`.** So it is NOT purely a GAN artifact; the recentre is more warranted, not less. Calibrate on a LARGER real-capture set in Pass 2 before the backfill (N=2 here is directional only).
- ⚠️ **watch-in-testing: real-selfie detector confidence runs lower than GAN best-case** (Pass 1: Amey detScore 0.65 vs Prasad 0.9997 vs ~0.99 for GAN). Both still detected + stable. Watch real-device camera-capture extraction success-rate — angled/low-light captures could dip below `DETECTION_MIN_CONFIDENCE` and fail-open to the blob path. No code change; monitor in Pass 2.
- 🔧/📌 **Archetype taxonomy is first-pass (S1 proceed-on-default).** If Sid revises names/logic → `RULES_VERSION` bump + no-CV re-map (cheap). See `sid-signoff.md` S1.
- 🧹 **Cosmetic loading string** "Reading what your forehead reveals…" in `mobile/.../GeneratingReading.tsx` — leftover after the forehead card was dropped; tidy the rotating spinner copy. (Flagged in the 1j session; not the feature card.)
- 📌 **No measured feature replaced the dropped forehead card** — may add one (e.g. brows/chin) in a future iteration (R2 §4/§7).

## R3 — Palm  (§9 steps 1–9 done; step 10 = owner)
- 📌 **Palm LINES are NOT measured (geometry-only v1)** — heart/head/life/fate ship as flagged LLM *flavor*. True measured line segmentation = future **R3.x** (trained U-Net/segmentation microservice + its own spike). The single biggest R3 caveat; product-approved (S2). See R3 plan §13.
- 🔧 **`financialGrowthScore` (wealth score) is NOT rules-pinned** (flagged in 2j). The chiromancy table produces no wealth score, so the model still writes it (instructed to stay consistent with the measured traits, but it's not deterministic). A stable wealth score = additive `RULES_VERSION` bump later.
- 🎚️ **Palm dataset skewed fire/Leader in the step-9 probe.** Owner recentres thresholds (re-detect per §6) at **step 10, BEFORE a wide `backfill:palm-features`**. **UPDATE (Pass 1, 2026-07-09): reproduces on real palms — both of Amey's hands → `fire`/Leader Palm.** Confirms the recentre need; calibrate on a wider real set (multiple people) in Pass 2. N=1 person here.
- 🧹 **`PalmLineCard` strength dot-bar reflects LLM description, not a measured band** — acceptable for v1 lines-as-flavor; revisits with R3.x if lines become measured.
- 🔧/📌 **Palm trait vocab + 6-archetype set are first-pass (S3 proceed-on-default)** — re-mappable via `RULES_VERSION` (incl. reverting 6→4 archetypes) if Sid revises. See `sid-signoff.md` S3.
- 📌 **Mounts NOT measured** (fleshy-pad prominence is a 3-D property, unmeasurable from 2-D landmarks) — deferred (R3 plan §11).
- 📌 **`thumbAngle`/`fingerSpread` demoted (pose-dependent, advisory) + index/middle/pinky finger ratios reserved** for a future richer geometry pass (additive `RULES_VERSION`, no re-detect). (R3 spike / step 3.)

## R4 — Numerology  (✅ IMPLEMENTED)
- ⚠️ **Two deliberate value changes for some existing users** (the fixed bugs): career **Expression** now comes from the canonical source (not the display name), and insight **personalYear/Month** are now computed fresh (were stale). Not gated; watch during testing that no user is surprised by a changed number. (R4 §11.)
- 🧹 **Known dead/stale (recorded, no action):** mobile `api.ts` `POST /numerology` (no matching server route); compiled `packages/shared/types.d.ts(.map)` artifacts.

## R1 — Astrology  (✅ DONE)
- ⚠️ **watch-in-testing: Asc/MC accuracy depends on the GEOCODED birth coordinates** (surfaced in Pass 1, 2026-07-09). Planetary longitudes are geocentric = location-independent (matched astro.com regardless), but the **Ascendant/MC/house cusps depend on exact lat/lng** — Pass 1 saw a ~3′ Asc/MC gap purely from a generic Mumbai centroid vs astro.com's exact coords (18n58, 72e50); converged once exact coords were used. **In production the birthplace is geocoded** (Haiku geocoder), so a coarse centroid shifts angles by arc-minutes and — **near a sign cusp — can flip the displayed rising sign.** The ephemeris is proven; the geocode precision is the untested link. **Pass-2 check:** for a known birth, confirm the production geocode yields Asc/MC matching a good chart. **Enhancement proposal recorded → `plans/build-27.md` §4** (tiered precise-place autocomplete + optional exact-coordinate/hospital override + cusp-proximity guard; candidate for late build-27 / build-28 / a point release). No code change now — verify on-device/real-DB in Pass 2, decide the enhancement's timing separately.
- 🧹 **Legacy `birthChart` Mixed field deprecated-but-retained** — safe to drop in a later migration once all docs carry `natalChart`.

## R5 — Fable 5 synthesis  (✅ IMPLEMENTED 2026-07-11 — §9 steps 1–4 committed `2c7a463`→`1227d6a`; flag OFF until owner rollout)
- ✅ **RESOLVED — SDK upgrade prerequisite**: `@anthropic-ai/sdk ^0.32.0` → `^0.110.0` (step 1, committed `2c7a463`). No longer a caveat.
- ✅ **RESOLVED — Fable 5 org access + 30-day retention**: step-1 probe with the server's API-org key → 200/end_turn, BOTH gates PASS. No ZDR, no Sid escalation. (`sid-signoff.md` 🔵 R5 → PASS.)
- 📌 **Monthly premium astrology block is grounded in R1's CURRENT-MOMENT transits, not forward month-long transit windows** (R5 step 2·monthly, 2026-07-09). R1 computes `computeTransits(natal, new Date())` — a snapshot of the active transits at generation time, NOT a per-date calendar across the month. So the R5 monthly fix = feed the model the user's REAL placements (moon/rising/active natal aspects/current transits, via `buildFeatureContext`) + forbid fabricating placements the user doesn't have; where the copy projects across the month it stays anchored to those real placements, but precise forward-dated transit WINDOWS remain a model projection (not ephemeris-computed). Computing true month-scoped transit windows would be an R1/insight DATA-layer change (call `computeTransits` for multiple in-month dates) — deferred; out of R5's COPY scope. The v1 win is eliminating fabricated PLACEMENTS + grounding the narrative in the real chart. Revisit if forward-window precision is wanted (additive, R1/insight territory).
- ⚠️ **`SYNTHESIS_FABLE_ENABLED` stays OFF until step-4 rollout** even though both gates pass — marquee surfaces run the guaranteed Opus 4.8 path until A/B + fallback verification land. The server-side `fallbacks` beta (POLICY declines) and the flag (availability/retention) are SEPARATE layers — do not conflate. (CLAUDE.md env table + `synthesis-routing.ts`.)
- 📌 **R5 deeper-signal weave depends on the R1–R4 data being PRESENT; pre-backfill users degrade gracefully** (cross-cutting, all step-2 surfaces; first flagged R5 step 2·compat 2026-07-10). `buildFeatureContext` only emits a section when its source is present (R1 moon/rising/aspects/transits ← `natalChart`; R2 faceTraits ← stable `faceTraits`; R3 palmTraits ← `palmDominantTraits`; R4 trio ← `numerology` sub-doc), and each surface still produces a full reading from the base fields (sunSign/lifePath/archetype/palmType) when signals are absent — so this is fail-open, NOT a bug. **Surface-specific nuance:** the daily/weekly/monthly INSIGHT path lazy-computes `natalChart` + `numerology` in `buildUserInsightProfile`, so it self-heals for any user with birth data; **compatibility and career do NOT lazy-backfill** (compat reads what's persisted; career computes `natalChart` in-memory but reads the stable face/palm + numerology layers as-is) → they lean harder on the owner's pending backfills. **Fully resolves once the owner runs the queued backfills** (`backfill:natal-chart`, `:face-features`, `:palm-features`, `:numerology` — already in the owner queue below) + as users re-upload/regenerate post-deploy. **Verify in Testing Pass 2** that a fully-backfilled user shows the deeper signals woven into every surface. Not gated; no code change — it's the intended pre-backfill degradation. **UPDATE (Pass 2 · Phase 2.0, 2026-07-13 — PARTIALLY VERIFIED LOCALLY):** on a fully-populated synthetic profile, all four sets appear in the assembled prompt for daily/weekly/monthly-free/monthly-premium/compat/career (via `buildFeatureContext`), and a live marquee call served `claude-opus-4-8` (flag OFF), referencing real placements. **Still device-pending (Phase 2.4):** real-DB fully-backfilled user shows the woven signals end-to-end + full prose quality; compat+career (no lazy-backfill) depend on the Phase 2.3 backfills.

## R6 — Continuity readings  (✅ IMPLEMENTED 2026-07-13 — §9 steps 1–6 committed `49344eb`→`98e0485`; validation 41/41)
- 📌 **Option C — dedicated continuity CARD + conversion CTA — DEFERRED to the build-27 mobile cycle** (owner decision 2026-07-13, `sid-signoff.md` S-R6). R6 v1 ships **Option A** (zero-mobile): full continuity prose in daily-full (PP) + a short hook prepended to the free/premium daily-teaser string — no response-shape change, no mobile change. **Option C** = a styled "What's shifted since you were last here" card in the daily screen (PP) + a dedicated `continuityHook` field with its own "unlock to see what changed" CTA (free/premium). C is the stronger UX + conversion lever but requires a `DailyInsightOutput` output-shape change + a real mobile component → it breaks R6's zero-mobile-changes criterion. **Build C in the same mobile cycle R7 (Q&A chat UI) requires** — it folds in for free, keeps R6 backend-complete + independently deployable now, and keeps the retention A/B signal clean (A = retention; C's CTA = conversion, a separate hypothesis). Not lost, not a bug — a deliberate v1-scope split. **UPDATE (owner, 2026-07-24): scheduled as a STANDALONE `build27-R6-OptionC` step to run AFTER R7 mobile lands — explicitly NOT folded into R7 §13e (it's R6, not R7 Q&A) and NOT a gate on R7 completion.** Sized 2026-07-24 (read `continuity.service`/`insight.service`/`DailyInsightOutput`): **small, additive, no daily-insight generation-logic change** — the continuity delta + rendered block + teaser hook are ALREADY computed by Option A (`computeContinuityDelta`, `resolveDailyContinuity`, `buildContinuityHook`), so Option C just EXPOSES them as 2 new `DailyInsightOutput` fields (`continuity`/`continuityHook`) + the mobile card. Scope ≈ **2 backend files** (`types/shared.ts` +2 fields; `insight.service.ts` populate in getDailyInsight/getDailyTeaser) + **~2 mobile files** (card + daily-screen wiring + DTO field). (`sid-signoff.md` S-R6.) **✅ BUILT 2026-07-25 (`build27-testing-fixes`, purely additive, Option-1/distinct-summary confirmed by owner):** new `DailyContinuity` type + `continuity`/`continuityHook` optional fields on `DailyInsightOutput` + `DailyTeaserOutput` (dual-homed `packages/shared` + `server/src/types`); `buildContinuityCard` renderer beside the existing hook/context builders; attached from the ALREADY-COMPUTED `continuityResult.delta` in `getDailyInsight` (BEFORE caching → stable all day, mirrors the woven prose) + `getDailyTeaser`. Mobile `ContinuityCard` on the daily screen (`astrology/daily.tsx`); unlock CTA shown to non-PP only. **Woven prose UNCHANGED (still passed to generateDailyInsight); no generation-logic change; CONTINUITY_VERSION unchanged; no Sid gate.** tsc both clean.
- ⚠️ **watch-in-testing: the continuity note only fires for users with a stored `natalChart` + birth date and a meaningful, ≥`MIN_GAP_DAYS`(3-day) delta** — by design (fail-open + the code-level meaningfulness gate = the "nothing changed" honesty rule). Pre-backfill users / short gaps correctly get a normal reading with no note. Verify in Pass 2 that a returning fully-backfilled user actually sees a woven "since you were last here" note. `MIN_GAP_DAYS` (=3) + the moon-sign guard are tunable knobs if the note fires too rarely/often. **UPDATE (Pass 2 · Phase 2.0, 2026-07-13 — PARTIALLY VERIFIED LOCALLY):** on a real natal chart, a 40-day gap → accurate `## WHAT'S SHIFTED…` block + honest one-line hook (newAspects/endedAspects JSON-equal to an independent transit re-derivation, no fabrication); a 1-day gap (< MIN_GAP_DAYS) → both block and hook `''`; no-chart → fail-open `''`. **Still device-pending (Phase 2.4):** baseline PERSIST+ADVANCE on the live Mongo (`resolveDailyContinuity`), a returning fully-backfilled user seeing the note end-to-end, and the real Anthropic woven-prose quality.

## R7 — Q&A + Timing Engine  (📋 DEEP-PLANNED 2026-07-15 — `build-27/R7-QA.md`; caveats identified AT PLANNING, resolve DURING implementation)
- ✅ **RESOLVED (Sid Rule Set v1.1, 2026-07-23) — FX3/FX6b were handover-UNDERSPECIFICATION, not scoring bugs.** v1.1 adds R16 (dual-primary chains), R17 (frame-bounded two-part verdict, subsumes R10), 2.4a (threshold vs momentum), amends R2/R5/R12 (R2a/R5a/R12a), and adds a `frame` object to the §5 contract. **FX3 fixture CORRECTED to favorable/0.60** (0.70 was practitioner judgment; 0.60 is the intended calibrated engine output — the *fixture* was wrong, not the engine). **FX6b = `unfavorable_for_frame`/0.70 directional-favorable** (window 2028-09 beyond the asked 6-mo frame; threshold subtype). Impl = Step-0b re-open (`prompts.txt §13a-v1.1`); v1.1 `.md` is gitignored config source. (`sid-signoff.md` S-R7d RESOLVED.)
- 🎚️ **v1.1 IMPL INTERPRETATION (Step-0b, 2026-07-23) — 2.4a threshold windows = ANTARDASHA-gate granularity only (`rule-set.json` `thresholdUsesAntardashaGatesOnly:true`).** To reproduce FX6b's `unfavorable_for_frame` verdict, the Step-0b chat set threshold-subtype window derivation to use antardasha (era) boundaries only, EXCLUDING an in-frame Jupiter **pratyantardasha (PD)** boundary (~2026-10-14) that would otherwise open the threshold window inside the 6-mo frame → collapse the 2.4a threshold/momentum distinction → flip FX6b favorable (wrong). **Defensible** (grounded in 2.4a's "era boundaries complete them" + §3's literal "antardasha gate" wording; a boundary-GRANULARITY choice, not a weight change) — but note the coupling: it is a **config decision the impl chat made to reproduce a fixture**, adjacent to the "never retune to fit a fixture" discipline we've held all thread. Documented here so if **Sid ever revisits threshold-window granularity** it's a KNOWN, deliberate v1.1 interpretation, not a buried one. (`sid-signoff.md` S-R7e; Step-0b report in `per-chat-report.md` flag 2.) 🎚️
- 🎚️ **v1.1 IMPL SCOPE (Step-1b router, 2026-07-23) — frame_end weeks/days → WHOLE-MONTH coarse-map.** The router's `frame_end` arithmetic (`addMonthsUtc`) works at **month granularity**; "within N weeks" / "within N days" phrasings are coarse-mapped to whole months rather than exact day-precision frame_end. v1-scope simplification (the fixtures + the common "within N months" case are exact); acceptable because the frame verdict compares a month-granular window (§2.4/2.4a emits month/month-range) against frame_end, so sub-month precision wouldn't change the verdict in practice. Revisit if day-precision framing matters. **Related coupling:** the router's `addMonthsUtc` is a byte-for-byte DUPLICATE of the engine's module-local `frameEndFrom` (documented, not a shared import) → **unify (export/shared date util) when Step 3 wires router→engine** so "cannot drift" is structural, not by-comment. (`prompts.txt §13b-v1.1` DONE note; Step-1b report in `per-chat-report.md`.) 🎚️
- 📌 **DEFERRED owner option — crisis country-append (Sid v1.1 §5, optional 27.1 fast-follow, ZERO launch dependency).** The general number-free crisis wording is FINAL (`CRISIS_WORDING_FINALIZED=true`, `77df885`). Optional future add: a server-side one-line append for the 4 launch markets only (US/CA 988, IN Tele-MANAS 14416, BR CVV 188) as a 4-entry map + quarterly review — the general sentence stays, the number appends beneath. NOT the per-country lookup the guide avoided. **Build only if the owner opts in.** (`owner-actions.md` R7 crisis; `sid-signoff.md` S-R7b/D6.)
- 🎚️ **FX5 window-RANGE derivation is approximate (surfaced Step-0 run 1, 2026-07-23) — ✳️ CAUSE NOW IDENTIFIED (v1.1.1, 2026-07-25).** The engine's `window.basis` matches the handover (ad_boundary) and PASSES the acceptance gate (basis-only), but the emitted RANGE (2027-08…, unchanged through v1.1.1) differs from the handover's FX5 window (2026-10…2027-01). **New evidence (v1.1.1 ablation):** the documented 2026-10 IS exactly reproducible — but only with the R11a natal-functional path applied **at PD granularity to the DEGRADED 1st house** (`requiresMappedKaryaHouse:false` AND `antardashaGatesOnly:false`), where Jupiter — which rules the querent's natal 1st — takes the 2026-10-14 Saturn-Mercury-Jupiter PD. Two implications: (a) it suggests the natal-functional path was **already live in the v1.0/v1.1 hand-derivations**, consistent with Sid's "both were always part of the practitioner methodology; v1.1.1 writes the second one down"; (b) it **collides head-on with the v1.1.1 FX3 pin**, which requires `antardashaGatesOnly:true` — both cannot hold. FX3's pin is explicit and fresh while FX5's window was never asserted, so **FX3 wins for now and FX5 stays byte-identical**. `elective_timing_ok` also has no §2.1 karya row, so the engine degrades to the 1st and the natal-functional path is (deliberately) withheld. **→ Sid's call to arbitrate** — correct the FX5 doc, or rule on natal-functional granularity. Logged in the gitignored `fixtures.json` FX5 `_windowNotAsserted` note so it can't be "fixed" blind. (`sid-signoff.md` S-R7g.) 🎚️
- 🎚️ **v1.1.1 IMPL DECISION (2026-07-25) — the R11a NATAL-FUNCTIONAL path qualifies a lord at ANTARDASHA (era) gates only (`rule-set.json` `natalFunctional.antardashaGatesOnly:true`); PD boundaries stay natural-path-only.** **Required to reproduce Sid's pinned FX3 = 2027-07.** Without it the natal-functional path qualifies the Saturn **pratyantardasha** at 2027-02-22 (Saturn rules Aquarius = the querent's natal 12th, a relocation karya house) and FX3 surfaces **2027-02** instead — ablation-verified. **Defensible** on the same doctrine as the existing `thresholdUsesAntardashaGatesOnly` (the natal-functional path is an era-level statement — "this lord delivers these houses in this life" — whereas PD sub-divisions are momentum-grade progress ripples), and it is what makes **both** of Sid's v1.1.1 worked examples literal "AD scans". **But note the same coupling flagged for v1.1:** R11a's prose says the scan takes "the next AD **or PD** boundary", so this is an impl **granularity interpretation adopted to reproduce a pinned fixture** — adjacent to the "never retune to fit a fixture" discipline. It is a boundary-GRANULARITY choice, **not a weight change** (Sid confirms no weights move). One config key; flip to `false` to get the literal PD-inclusive reading. **→ Sid confirm** (`sid-signoff.md` S-R7g). 🎚️
- 🎚️ **v1.1.1 OPEN AMBIGUITY (2026-07-25) — does a natal-functional match on the RUNNING AD lord earn the R11 ±1, or only the texture? (`rule-set.json` `natalFunctional.runningPeriodScores`, shipped `true`.)** v1.1.1 states BOTH that the two-path test "applies in the ±1 scoring factor (current AD lord versus domain)" AND that FX3's verdict is "favorable 0.60 unchanged". **On this querent those cannot both hold:** FX3's running AD lord is Mercury, which OCCUPIES the natal 12th (a relocation karya house), so the natal-functional path fires → R11 +1 → **S 4→5 → confidence 0.60→0.65**. Shipped `true` = the patch's literal instruction (FX3 = 5 / 0.65); `false` = the pinned-arithmetic reading, where a running-period match yields only the "already in motion" texture and no score (FX3 = 4 / 0.60, byte-identical to v1.1). **Both sit inside the fixture's ±0.05 confidence band, so the gate is green either way, and NO other fixture is affected either way** (ablation-verified). Deliberately a config key rather than a hard-coded reading. **→ Sid's call** (`sid-signoff.md` S-R7f). 🎚️
- 📌 **v1.1.1 fallback is a safety net with no fixture coverage by construction (2026-07-25) — covered by a dedicated PROBE instead.** The 30-year no-alignment fallback cannot be reached through FX1–FX6b: once R11a's natal-functional path is on, the karya house's own sign lord always turns up at some AD gate well inside 30 years (that is exactly why the 2035 fabrication disappeared). So `timing-fixtures.check.ts` carries a **PROBE-fallback** unit that collapses the horizon to 1 year via the existing `setRuleSet` seam and asserts the engine degrades to `basis:'transit_fallback'` + the honest `window_beyond_alignment_horizon` texture + a real transit date. Not a caveat about correctness — a note that this path's coverage is a probe, not a fixture, so **don't delete the probe** thinking the fixtures cover it. Also note `transit_fallback` is a NEW value in the `TimingWindow.basis` union (`qa.prompt.ts` never switches on basis, so no consumer change was needed — re-check if a future consumer does).
- 🔧 **D3/D6/D7 reclassified to PM-APPROVED build tasks (2026-07-16)** — moved from ⛔ Sid decision gates to ordinary build tasks (tracked here, NOT dropped). **D3:** confirm annual $59.99/$89.99 → same monthly caps in RevenueCat config (config check). **D6:** produce final entertainment-disclosure / 402-CTA / trade-secret-marketing strings before wiring; **the crisis / off-topic / unsafe strings are DELIVERED in the PM-approved Off-Topic/Unsafe/Crisis Guide (single general-wording, number-free, hardcoded; + classifier prompt + 10 fixtures + routing) — wire verbatim, never invent/draft/stub/model-generate; residual = only Sid's "wording FINAL" confirm, gating Phase-B crisis wiring not Phase A.** **D7:** produce location consent copy + privacy-policy change (legal); birth-city fallback interim stands. (See `sid-signoff.md` S-R7 + `R7-QA.md §11`.)
- ✅ **RESOLVED (Sid, 2026-07-16): Y is ALWAYS a vowel, standardized project-wide.** (Was: `server/src/utils/nameNumerology.ts` treated **Y as a CONSONANT** — "for simplicity", `:33-34`; `VOWELS={a,e,i,o,u}` — contradicting the handover's Y-as-vowel rule.) **Decision:** add `y` to `VOWELS` in the single canonical `computeNameNumbers` util — ONE rule, ONE source, no per-call mode, no fork (master 11/22/33 preserved). **Migration task (project-wide, NOT R7-only):** bump `NUMEROLOGY_VERSION` (`numerology.ts:5-11`) + deliberate backfill recomputing the name trio for existing users. Touches the shared util + **all numerology surfaces**: cached `UserProfile.numerology` sub-doc, `NameAnalysis` (name-destiny), career, daily/weekly/monthly insights (`buildUserInsightProfile`), compatibility, and R7's cached Q&A numerology block. Reuse R4's `backfill-numerology.ts` (`:dry`→real) + read-time lazy re-derive (`numerology.service.ts` `ensureProfileNumerology`). ⚠️ **User-visible:** soul_urge/personality change for some users on next generation (correctness fix — mirror R4's deliberate value-change note). The derived Vedic fields `mulank`/`bhagyank`/`birthday_number`/`personal_year_current` remain net-new (derived, no literal fields today). 🔧
- 📌 **No separate "server config repo" exists** (handover mandates the trade-secret rule set live in one; §17.1 spike confirmed none exists — config today is env-vars + code constants). Workaround in the plan: an **access-controlled directory in the server repo** (`server/config/timing/`) holding the rule set + 6 fixtures + Monty Adams natal, **gitignored from client bundles / analytics / off-server logs**, never imported into mobile. **Confirm the access-control approach with Sid/Amey** (§17.14 "verify"). Trade-secret leakage into the client bundle/logs is the risk to guard.
- ⚠️ **`swe.set_sid_mode` is PROCESS-GLOBAL — sidereal state must be isolated or it silently corrupts R1's tropical charts** (surfaced by the 2026-07-16 spike re-verification; `R7-QA.md §0`). The Timing Engine's Lahiri-sidereal computation and R1's tropical natal/transit charts run in the **same `astrology.service` process** (shared `sweph` instance; tropical consumers: `reading.controller`, `insight.service`, `continuity.service`, `compatibility.service`, `profile.service`, `astrology.routes`, `backfill-natal-chart`). A naive `set_sid_mode(SE_SIDM_LAHIRI)` flip makes **all** of them sidereal — a subtler bug than "mutating the natal path." **Action during impl:** own the `set_sid_mode` lifecycle in an isolated sidereal/timing module (set-then-reset around each located computation, or a dedicated code path), and add a regression check that a tropical natal computed *after* a sidereal moment chart is byte-identical to one computed before. 🔧
- ✅/📌 **Swiss Ephemeris commercial license (D8) is LIKELY MOOT for R7.** The §17.1 spike (report `R7-QA.md §0`) shows Moshier reproduces Lahiri sidereal + whole-sign + mean node + speed + Vimshottari dasha with **no `.se1` files and no license**. The fixtures pass at Moshier precision by construction (if the impl is correct). Sid's plan to buy the Astrodienst license at internal-testing may be unnecessary — **confirm with Sid** before purchase. The only reason to buy would be arc-second `.se1` precision the fixtures don't require.
- ✅ **RESOLVED (owner, 2026-07-24): Response envelope + 402 shape** — 200 answer nested under `{success:true, data:{…}}`; **402 (at cap) metadata TOP-LEVEL** `{code, tier, remaining, resetsAt, upgradeCta}` (mirrors the existing 403 gate middleware). Baked into §13d (Step 3). (Was: net-new decision, no 402 precedent — §17.3.) 🔧
- ⚠️ **`createSynthesisMessage` needs EXTENSION for the regular tiers, not just table rows.** It exposes no `effort`/`thinking` param and hardcodes `cheap`=`claude-sonnet-4-6`; the DI (Fable→Opus) path is a drop-in, but free→`claude-sonnet-5` and paid→`claude-opus-4-8` (explicit `thinking:{type:'adaptive'}`) require a new model/thinking config path in `resolveRoute`. Don't underestimate this as "add a row." 🔧
- 📌 **Palm/face Q&A observation blocks are wired-now-empty** — mirror `FaceFeatureVector`/`HandFeatureVector` (geometry-only, **NO `lines` block**); populate only after capture ships (FACE = adult + opt-in). Same pre-backfill degradation posture as R5 (`buildFeatureContext` omits absent layers). ⚠️/📌
- ⚠️ **watch-in-testing: RevenueCat prices are HARDCODED in the paywall JSX** (`mobile/app/(paywall)/index.tsx` — $7.99/$59.99/$12.99/$89.99, matching the spec) — the real store product prices live in the RevenueCat dashboard and are NOT verifiable from the repo. Confirm the dashboard actuals + the annual→cap mapping (D3 caps PM-approved 2026-07-16 — this is the residual config check, not a gate) before launch.
- 📌 **Fable 5 Deep Insight latency/UX** — R5 observed minutes-long Fable turns; non-streaming-to-client DI will feel slow → needs a strong loading UX and argues for prioritizing v1.1 client streaming for DI. The free 1/mo DI teaser makes a bad first impression costly.
- 🎚️ **§13e-2 (mobile Q&A Item B) — location + device-id design choices (2026-07-24):** (a) **Location is COARSE-only / city-level** — app.json declares `ACCESS_COARSE_LOCATION` and BLOCKS `ACCESS_FINE_LOCATION`; capture uses `Accuracy.Low`. Honors the D7 "city-level" promise but means the moment-chart location is city-granular (fine for a per-question moment chart). (b) **Timezone = the DEVICE's current IANA zone** (`Intl…resolvedOptions().timeZone`), not a lat/lng→tz lookup — correct while the querent is physically in that zone; a VPN/travel edge could mismatch tz vs coordinates (acceptable v1; the server also has the birth-city fallback). (c) **city** is a best-effort reverse-geocode (may be undefined; server only needs lat/lng/tz). (d) **iOS device-id = `identifierForVendor`** (resets if all Revelia apps are uninstalled) — weaker anti-farming signal than Android's SSAID, but the app ships Android-first and the gate is fail-open anyway. 🎚️
- ⚠️ **§13e-2 — SERVER-SIDE D5 gate NOT built (the remaining half of D5).** Mobile now sends the raw device id as `X-Device-Id` on the DI ask, but the server salt+hash + per-device free-DI gate (plan §11 Step-4 acceptance) was never implemented in §13d-5 — the server IGNORES the header today. Tracked as an actionable server follow-up in `owner-actions.md` §"R7 D5 — SERVER-SIDE per-device free-DI anti-farming gate". NOT a hard ship-blocker (free-DI is already 1/month/account; device farming is an abuse-optimization). ⚠️

- 🎚️ **D5 device gate — RESIDUAL hole: a device whose hardware id is unavailable is never gated (accepted, 2026-07-27).** `mobile/lib/deviceId.ts` fails open to `null` when Android SSAID (`Settings.Secure.ANDROID_ID`, surfaced by `expo-application@6.1.5` `getAndroidId()`) or iOS IDFV is unavailable — which happens on some emulators/wiped devices, and on iOS after all vendor apps are uninstalled. No header ⇒ no claim recorded AND none enforced ⇒ that device can farm free Deep Insights. **Deliberately NOT fixed in the 2026-07-27 point release.** The fix would be a persisted app-generated fallback identifier (SecureStore UUID), which is a *new* identifier class — it touches the Play Data-safety "Device or other IDs" declaration the owner already submitted (2026-07-24) and the privacy-policy "Fraud and abuse prevention" line, so it is an owner/PM call, not an engineering one. Note the fallback would also be weaker (an app-data clear or reinstall regenerates it) though still strictly better than no gate. **The gate is now self-reporting** — `qa_device_di_gate {reason:"no_device_id"}` in the prod logs measures how often this actually happens, so the decision can be made on data rather than speculation. 🎚️
- 📌 **D5 gate is only as strong as `QA_DEVICE_SALT` on the environment the app actually hits.** Fail-open on an unset salt is correct and stays (a misconfigured deploy must never block a legitimate user's free DI) — it is also exactly how the gate came to be inert in prod during the internal test. Boot now warns and every decision is logged, but the invariant remains: **a new backend environment without `QA_DEVICE_SALT` has NO per-device anti-farming**, silently, at 200 OK. Walk `owner-actions.md` before any deploy to a new env. 📌
- 📌 **DEFERRED v1 GAP — no Q&A chat-history UI (intentional, surfaced on-device 2026-07-24).** The R7 Q&A screen (`mobile/app/(main)/readings/qa.tsx`) holds `messages` + `conversationId` in **in-memory React state only** — no AsyncStorage/SecureStore persistence — so closing + reopening the app resets to the blank template (empty state + counters). Mount only reloads `getQaCredit()` (the remaining-N counters), never past turns. This is a **deliberate v1-scope decision**, NOT a bug: §13e was scoped to exactly two DO-items (Item A chat + counters/DI/paywall; Item B crisis-suppression/location/device-id) — a "previous chats" surface (the analog of R9's reports-history screen) was never in scope. **Consequences:** (1) chat is ephemeral per app session; (2) since `conversationId` is also in-memory, a reopen starts a NEW conversation → even the model's ~6-turn continuity (`loadConversationHistory`, server-side, by conversationId) resets across restarts (persists only WITHIN one session's thread). **The data is NOT lost** — every turn is persisted server-side as `QaTurn` rows (§13d-4, `f93ccd1`); there is simply no client-facing endpoint to list/reload them (routes are only `POST /ask` + `GET /credit`). **A history screen is therefore a purely ADDITIVE future feature** (like R9's reports-history): needs a new `GET /api/qa/history` (list conversations) + `GET /api/qa/conversation/:id` (reload a thread) endpoint + a mobile history screen + client persistence of the active `conversationId`. No data migration, no engine/model change. Scope ≈ **~2 backend** (route+controller reading existing `QaTurn`; no new model) + **~2–3 mobile** (history screen + top-right entry icon + qa.tsx load-on-mount + persist conversationId). Scoped-but-NOT-built, same posture as R6 Option C (LG13); would run as a standalone `build27-R7-QA-history` step if the owner opts in. (Owner logged 2026-07-24.) **UPDATE 2026-07-24: ready-to-issue step-prompt DRAFTED in `prompts.txt` §13i (`build27-R7-QA-history`, [DRAFT]) — safety constraint baked in (content-free crisis/unsafe rows omitted, no blank bubbles, no model/credit on reload).** 📌

## R9 — Personalized Cosmic Report  (📋 DEEP-PLANNED 2026-07-16; ✅ PHASE-0 SPIKE DONE 2026-07-18, `881645c` — `build-27/R9-report.md §0.1`)

> **Phase-0 spike closed two of the caveats below** (astronomy-offload probe → recorded/rejected; D-render → validated). It also surfaced **new** build-time caveats (vector charts / Georgia embedding / en-dash scan / Dockerfile / cost-heuristic / MC convention) and a **Y-rule conflict** — all recorded below.

### NEW from the Phase-0 spike (2026-07-18)
- ✅ **RESOLVED (§14 step 6a, 2026-07-21) — Charts VECTOR-vs-RASTER SETTLED + docx→LibreOffice-preserves-vector = YES.** 6a re-inspected the ACTUAL shipped sample PDF (pymupdf): **0 raster image xobjects on EVERY page; chart pages are 44–48 vector path groups → DEFINITIVELY VECTOR** — overriding both the prompt §8 "dpi 200 PNG" text and the claude.ai browser run's "raster PNG" report (the SHIPPED artifact is the fidelity target). Then the fork-reopen test: matplotlib **SVG** (text kept selectable) → docx **SVG `ImageRun`** (+PNG fallback) → **`soffice` docx→PDF** → OUTPUT re-inspected = **0 raster xobjects, vector preserved end-to-end → the Q1 docx→LibreOffice fork does NOT reopen.** Re-confirmed on the real report charts in the full Monty render (0 raster doc-wide; chart pages 125/201/221 vector items). **Decision: charts = matplotlib SVG through docx→LibreOffice** (`report-render.service.ts` + `report-charts.py`; `svg.fonttype=none` + `axes.unicode_minus=False` so no chart-label dash/minus survives the §9 scan). (`R9-report.md §14 step 6 / §0.1 B1`.)
- ⚠️ **§14 step 6b — CONTAINER FIDELITY DELTA: charts RASTERIZE on the deployment-target LibreOffice (CORRECTS the 6a "vector settled" line above).** The 6b Dockerfile's runtime LibreOffice is **7.4.7.2** (Debian bookworm apt); a full in-container Monty render (pymupdf QA) shows the 3 charts embed as **dpi-200 raster PNG (~825–1297px), NOT vector** — LO 7.4 rasterizes the docx SVG `ImageRun` on PDF export (uses the renderer's PNG fallback). 6a's "docx SVG → LibreOffice preserves vector end-to-end = YES" held on the **dev-box's newer LibreOffice**; it does **NOT** hold on LO 7.4. Charts are present + crisp (dpi 200) — a vector→raster fidelity reduction, not a broken/missing chart; the sample's true fidelity baseline is base-14 anyway. **Renderer NOT rewritten (6b scope = containerize only; delta flagged per brief).** **STEP-7 GATE INPUT** (`R9-report.md §14 step 7` "images embedded (vector)"): either (a) accept high-dpi raster [recommended — vector-preservation is LO-version-fragile], or (b) pin a newer LibreOffice in the Dockerfile [heavier/less reproducible]. (`owner-actions.md`; `R9-report.md §14 step 6b`; handoff STEP 6b.)
- 📌 **§14 step 6b — Docker image ≈ 2.81 GB (larger than the plan's +350–500MB estimate).** LibreOffice-writer + python3-matplotlib (numpy) + node_modules on `node:20-bookworm-slim`. This is a DISK/registry-storage + build/deploy-time cost, NOT a RAM cost (total-container render peak ≈ 300 MiB, far under Pro-tier). Acceptable for v1; a later trim lever if needed: `libreoffice-core-nogui`-only paths, dropping `fonts-liberation2`, or a matplotlib slim install. (`R9-report.md §14 step 6b`.)
- ⚠️ **§14 step 6b — RENDERER-WIRING GAP (confirmed from code 2026-07-21): `renderReportPdf` (6a) is UNWIRED; the worker seam still returns `pdfKey:'STUB'`.** `report.service.generateReport` returns `PDF_KEY_STUB` (lines 265/392); `renderReportPdf` is called NOWHERE in product code (only 6a's scratch harness). This is CORRECT per 5b/6a/6b scope (renderer built standalone) — but it means (i) a staging ENQUEUE renders NOTHING yet, so **the on-Railway render-RAM measure via enqueue is NOT yet possible**; and (ii) there is an explicit **"wire `renderReportPdf` into `generateReport`" task = FOLDED INTO STEP 7** (render must run before QA can gate). **6b RAM gate = PROVISIONALLY PASSED on the LOCAL 6b docker smoke** (~300 MiB total-container peak, SAME image, a full `soffice` docx→PDF render — a valid render-RAM proxy since the render path is identical however triggered); **CONFIRM on-Railway render-RAM under real worker load once step 7 wires the renderer + enqueue renders.** (`owner-actions.md` staging RAM item; `prompts.txt §12s`.) ✅ **CONFIRMED 2026-07-22 (step-7 clean re-run on staging):** soffice+matplotlib render peaked **~185 MB total container** (98 baseline → 185 peak → settled), well under Pro-tier → **docx→LibreOffice viable on Railway, @react-pdf fallback NOT needed;** the provisional local ~300 MiB is retired by this real on-Railway number.
- 📌 **§14 step 7 — READY-AUTHORIZER transition (recorded now so it isn't lost): STUB → QA-pass; real pdfKey at step 8.** Today the worker's ready-guard = "pdfKey present" (STUB satisfies it, prod-dark). Step 7 retires the STUB sentinel AS THE AUTHORIZER: after step 7 a report may go `ready` ONLY via a QA-PASS. The REAL R2 pdfKey is minted at **step 8 (upload)**, which a QA-pass unlocks and which is what flips the report to `ready`; a QA-passed report stays `generating` until step 8 (correctly holds the credit slot — never `ready`-with-STUB). QA-FAIL → bounded regenerate → terminal `failed` → slot REFUND (step-4 partial index). (`prompts.txt §12s`.)
- ✅ **§14 step 6b — GEORGIA font = metric-compatible SUBSTITUTE (DejaVu Serif), not licensed Georgia.** Georgia is proprietary + non-redistributable → cannot bake it in. The Dockerfile installs `fonts-dejavu-core` + a fontconfig alias (`docker/fontconfig/99-revelia-georgia.conf`) mapping Georgia→DejaVu Serif (verified in-image `fc-match Georgia` → `DejaVu Serif`). DejaVu Serif = report-charts.py's own next fallback (body+chart consistent) + Georgia-width (preserves the ~18pp layout). Fidelity baseline = the SHIPPED SAMPLE (base-14/Times-Roman, NOT true Georgia) so a metric-compatible serif legitimately matches. Owner may later drop in a licensed Georgia .ttf + delete the alias for exact fidelity. (`R9-report.md §14 step 6b`.)
- 📌 **§14 step 6a residual cosmetics (renderer; revisit in 6b/feature-testing, none block).** (a) **Transit dates presented as the injected UT date, birthplace-TZ localization DEFERRED** — the §8 map wants transit/ingress dates localized to the birthplace timezone (≤1-day shift); 6a formats the raw injected UT date (and the row-1==payload assertions compare against it). Localization is an additive 6b/step-7 refinement. (b) **H2 sub-heading detection is heuristic** (short standalone line, no comma/colon, ends "."): catches "The Numbers." / "The Hand." / "The Convergence Verdict." but renders longer sub-heads (e.g. "The thirties, closing now.") as body — cosmetic. (c) **Minor North-Indian rasi label crowding** (a house's gold sign-number can sit close to a stacked planet dms). (d) **Section H1 is FORCED from the canonical §8 title** (not the model's title line) so the step-7 heading gate passes by construction; the model's title line is dropped when it matches. (`R9-report.md §14 step 6`.)
- 📌 **Renderer external assets `report-charts.py` (+ the confidential `.md`) are NOT copied to `dist/` by `tsc`.** `report-render.service.ts` resolves `report-charts.py` robustly (src → dist fallback) like the prompt loader, but before `REPORT_WORKER_ENABLED` in prod, the 6b build must copy `src/services/*.py` (and `src/prompts/*.md`) to `dist/` or ship `src/` alongside `dist/`. (Same class as the existing prompt-`.md` copy owner-action.) (`owner-actions.md`; `R9-report.md §14 step 6`.)
- ⚠️ **Render container MUST install + embed Georgia (or a licensed metric-compatible substitute).** Both the spike's reproduced page AND the shipped sample fell back to base-14 / substitute serif because Georgia was absent from the render environment. Exact typographic fidelity depends on the font being present in the container (pairs with the Dockerfile below). Build-time config item. (`R9-report.md §0.1 B1`.)
- 🔧 **QA em/en-dash scan MUST flag EN-dashes (`–` U+2013), not only em-dashes (`—` U+2014).** The "gold" sample itself ships with **0 em- but 2 EN-dashes** — i.e., the reference artifact fails the `§9` "zero en-dashes" rule. The deterministic `§8` scan must catch both. (`R9-report.md §0.1 B1`.)
- 🔧 **Western wheel MC placement convention unresolved.** An independent RAMC-based MC computation put MC in Pisces; the sample anchors the MC line at the top of the wheel. A chart-convention detail to lock at build (orthogonal to render fidelity). (`R9-report.md §0.1 B1`.)
- 📌 **LibreOffice on Railway = VIABLE-WITH-DOCKERFILE (empirical Railway deploy DEFERRED to Phase-A step-1).** `soffice --headless --convert-to pdf` was confirmed working locally (docx→PDF, exit 0, ~1.4s warm). Repo has **no Dockerfile/nixpacks.toml/railway.json** today → default Nixpacks auto-detection. Adding LibreOffice (recommend a Dockerfile: `node:20-bookworm-slim` + `apt-get install libreoffice-writer libreoffice-core fonts-*`) is a **deliberate change to the repo's build path**; +~350–500MB image, ~150–400MB RAM/convert, first-invocation ~3–8s (negligible vs the already-async turn). Consistent with the glibc/non-Alpine constraint. The actual Railway build + cold-start timing is a Phase-A step-1 task. Fallback if unviable: HTML→headless-Chromium (plan §0 D-render original; comparable weight). (`R9-report.md §0.1 B2/B3`.)
- ⚠️ **B4 per-report cost (~$1.5–$2.5, ~$2) is a char→token HEURISTIC**, not a `count_tokens` measurement — no `ANTHROPIC_API_KEY`/`ant` was available in the spike env. Dominant driver = Fable 5 output + always-on thinking at $50/MTok. Re-baseline with `count_tokens` on the real prompt + a real injected payload at build. (`R9-report.md §0.1 B4`.)
  - ✅ **INPUT measured (step-5 cost pass, 2026-07-20): 21,595 tok ≈ $0.22/report (fixed).** Reconciled prompt (system) = 11,038 tok + Monty inject = 10,562 tok. Input is only ~10% of the bill; output at $50/MTok dominates.
  - ✅ **OUTPUT cost + wall-clock MEASURED (owner cost smoke, 2026-07-21 — `tracking_files/build27-usage-cost.md`).** Real billed runs on the Monty fixture, `end_turn` (no truncation): **Mode-A (pre-reconcile) prompt** — Opus $0.87 (in 37.2K / out 27.5K, 339s) · Fable $3.35 (in 37.2K / out 59.5K, 701s). **Mode-B reconciled prompt (`2755538`, code gone)** — **Opus $0.46/report** (in 41.2K / out 10.3K, 168s, 4.7K words). Output is the ~90% cost driver as predicted; all comfortably affordable at 1/month/paid-user. **`maxTokens=96,000` CONFIRMED ample** — max observed output was Fable's 59.5K vs the 96K ceiling; `end_turn` every run, no `max_tokens` truncation → do NOT raise. (`R9-report.md §0.1 B4`.)

- ✅ **RESOLVED (Phase-0 spike) — astronomy-offload probe.** No probe run; offload REJECTED on cost (astronomy stays in Node). The §0 "one remaining runtime probe" paragraph is SUPERSEDED. (Was: "verify whether Anthropic code-execution exposes pyswisseph + file output.")
- ✅ **RESOLVED (Phase-0 spike) — D-render render spike.** The confirmed chain (matplotlib → Node `docx` → `soffice` PDF) reproduced the sample at fidelity; LibreOffice verdict = viable-with-Dockerfile (above). The plan's "docx opens" QA line is a Mode-A artifact; the Mode-B gate is "PDF opens + renders all pages."
- ✅ **D5 REFRAMED (2026-07-16) — delivery seam built in Phase A, NOT a blocking pre-ship "fix".** R9 builds the delivery seam as first-class infra: a **buffer-upload path** (`uploadBuffer` for non-image content — `uploadImage` is jpeg-only `r2.service.ts:55`) → a **private R2 key/path with a TTL link** (wire the dead `getSignedUrl` `:84-91`) → a **`sendReportEmail` wrapper** emailing the **presigned link** (not the 18–26pp attachment). **Export-My-Data (R8) completion is a FAST-FOLLOW that reuses this same seam** (it currently never calls the email layer — `account.controller.ts:32-57`, `EmailOptions` has no `attachments` `email.service.ts:12-17`). So there's no "broken SendGrid gate" — R9 builds what it needs; R8 rides it. Residual: verify `SENDGRID_API_KEY` on Railway + link-TTL. 🔧
- ⚠️ **Numerology divergence until the D1 Y-as-vowel migration lands (shared with R7).** Code still treats **Y as a consonant** — `VOWELS={a,e,i,o,u}` (`nameNumerology.ts:13`), comment "Y is treated as consonant for simplicity" (`:34`), Y value 7 (`:10`). Sid's 2026-07-16 decision is **Y always a vowel, project-wide.** R9 **injects numerology** into the report (compute-once, single-source), so if R9 shipped before the migration the report would disagree with the (old) app numbers. **R9 must land + consume the migration:** add `'y'` to the single `VOWELS` set → **`NUMEROLOGY_VERSION` bump** (`numerology.ts:11`) → re-run `backfill:numerology` (already version-aware, `numerology.service.ts:185-192`). **User-visible:** soul-urge/personality shift for some existing Y-name users across Complete Reading / Name Destiny / Career / insights / compatibility / R9 (correctness fix — mirror R4's value-change note). The report's net-new numerology fields (**Chaldean / Vedic Mulank/Bhagyank / birthday number / personal-year series**) are all absent today (only Pythagorean exists) — net-new compute, reuse `reduceToSingleDigit`. Same migration as R7's §6 (do it once). 🔧/⚠️
  - 🆕 **Y-rule THREE-WAY conflict discovered when the prompt was READ (Phase-0 spike, 2026-07-18) — needs Sid.** The committed prompt `Revelia_Complete_Reading_Generation_Prompt_v1.md §4` says **Y is CONTEXTUAL**: "Y counts as a vowel when it is the only vowel sound in its syllable, otherwise as a consonant." That conflicts with **D1** ("Y always a vowel, project-wide") AND current code ("Y always consonant"). Under Mode B the **injected** Node numerology (always-vowel per D1) wins at runtime — the model does not compute numerology — so functionally D1 governs the numbers; BUT the prompt TEXT and any methodology/disclosure line would still describe the contextual rule, a mismatch. **Action for Sid:** either edit prompt §4 to "always a vowel" to match D1, or confirm "injected values win, leave the prompt text." Recorded in `sid-signoff.md` S-R9 (D1). ⚠️
- 📌 **Generation architecture is almost-entirely NET-NEW (D2 spike).** No PDF/docx/chart generation (`server/package.json:37-66`), no async job/queue (only `node-cron`), R2 serves **public** image URLs + `uploadImage` is jpeg-only (`r2.service.ts:55`) + the `getSignedUrl` helper is **dead code** (`:84-91`). Mode B (backend-computes / model-writes / controlled-renderer-builds) **APPROVED (D2 ✅ 2026-07-16)** (§0). ~~The one remaining runtime probe: verify whether Anthropic code-execution exposes `pyswisseph` + file output.~~ **✅ CLOSED (Phase-0 spike 2026-07-18): no probe run — astronomy stays in Node, offload rejected on cost.** 📌
- ⚠️ **`swe.set_sid_mode` process-global hazard (same as R7).** R9 builds the **isolated sidereal engine module** (sidereal natal + dasha ladder + panchanga + D9 + ingress/sade/returns + dignities/yogas — all net-new, far beyond R7's moment chart) in the SAME `astrology.service` process that serves R1's tropical charts. A naive `set_sid_mode` flip silently makes all tropical consumers sidereal. **R9 owns the set-then-reset lifecycle + a regression check** that a tropical natal computed after a sidereal report is byte-identical to one before. **R9 ships before R7 → R9 establishes this module and R7 reuses it** (inverted from the R7 plan's framing). 🔧
- 📌 **Job runner is deliberately minimal for v1** — the `Report` row IS the job (`status` field), advanced by a `node-cron` claim tick (no queue library). Fine at 1/month/paid-user volume; **revisit a real queue (BullMQ/bee-queue) if concurrency/observability grows.** 📌
- ✅ **Doc-render path (D-render) — SPIKE DONE (Phase-0, 2026-07-18).** The CONFIRMED chain (matplotlib charts → Node `docx` → LibreOffice `soffice` PDF → pypdf/pymupdf QA) reproduced the sample at fidelity; LibreOffice-on-Railway = **viable-with-Dockerfile** (see the NEW spike caveats above). HTML→headless-Chromium is retained as the fidelity-preserving fallback (plan §0 D-render original) if the Railway LibreOffice deploy proves unviable at Phase-A step-1; `@react-pdf/renderer` = lighter/lower-fidelity second option. The prompt's "docx opens" QA line is a Mode-A artifact; the Mode-B gate is "PDF opens + renders all pages." ✅
- ⚠️ **Page-count / format variance** — Fable 5 output length varies; the 18–26pp QA gate may fail → budget bounded repair/regenerate passes; the render spike calibrates. A gate FAIL → NOT `ready`, NO credit spent. ⚠️
- 🔧 **RENDERER-CONTRACT (step-6 blocker candidate — surfaced by 5b, DO 6).** The confidential prompt is a **Mode-A "the model builds the .docx itself"** prompt. Its §8 "Section order (fixed)" + §10 QA step 5 ("text-extract and confirm every Part and Appendix heading is present") give only a **WEAK/IMPLICIT** contract: the exact §8 heading strings (`Part I. Two Charts, One Sky` … `Appendix D. …`) appear as headings in the output, and QA already checks their presence. But the prompt does **NOT** instruct the model to emit **explicit, stable, machine-parseable section delimiters** (a marker token per section, or JSON keyed by the §8 manifest), and the heading *form* is not pinned (styling directives are docx-style, not text-delimiter contracts — `Part I.` vs `## Part I` vs bold is unconstrained in Mode-B text output). So a step-6 Node/Mode-B renderer would have to **heuristically split undelimited prose on heading text** — fragile (heading drift, prose bleed across boundaries, table-section ambiguity since Mode-B tables are Node-rendered yet the prompt still tells the model to author tables). **Verdict: step 6 does NOT have a reliable section contract as the prompt stands.** **A Sid-gated prompt tweak is recommended BEFORE step 6** (finding-C family — do NOT perform it here): add a stable section-boundary convention to the Mode-B output instruction (e.g. `===SECTION: part-i===` delimiter lines matching the §8 manifest, or emit interpretation as JSON keyed by section id) so the renderer splits deterministically. Feeds the step-6 go/no-go. (`owner-actions.md` STEP-6 GO/NO-GO.) 🔧
- ⏳ **Prompt `.md` not copied to `dist/` by the build (step-6+ owner action).** `npm run build` = `tsc`, which does NOT copy `src/prompts/*.md` into `dist/`. `report.service.loadConfidentialPrompt()` resolves robustly (dev `src/prompts` via `__dirname`; deployed-source-tree `cwd/src/prompts`; `dist/prompts` if a copy step exists) and is cached. Prod-dark today, so not a 5b blocker; **before `REPORT_WORKER_ENABLED` is flipped in prod, add a build asset-copy step for `src/prompts/*.md` OR confirm `src/` ships alongside `dist/` on Railway** (the cwd/src fallback relies on it). (`owner-actions.md` GATING.) ⏳
- ✅ **`MODEL_RATES` VERIFIED CORRECT (2026-07-21, step-5b cost smoke).** Cross-checked vs the claude-api skill: `claude-opus-4-8` = $5/$25, `claude-fable-5` = $10/$50 — both `report.service` constants correct. Caveat SETTLED, no fix needed. (was: log-only concern.) ✅
- ✅ **RESOLVED 2026-07-21 (option A + confirm-smoke 3/3 PASS on `2755538`) — resolution note at the END of this entry; [HISTORICAL framing retained below].** 🛑 **DECISIVE / step-6 BLOCKER — the confidential prompt's OUTPUT CONTRACT is MODE-A (code-execution `.docx`), NOT Mode-B prose.** Empirically confirmed by the step-5b cost smoke (`tracking_files/build27-usage-cost.md`) + home-chat independent read of the Opus dump: given the shipped prompt as SYSTEM with NO code tool wired, BOTH Opus and Fable emit a **`.docx` BUILD-SCRIPT transcript** (```python/```output blocks, matplotlib+`docx` module, hallucinated pypdf/page-count verification, dead `computer:///tmp/…docx` link) — **not a prose interpretation.** `report.service` would persist that CODE BLOB as `report.interpretation`, which a Mode-B Node renderer cannot consume. ROOT CAUSE: prompt §1 ("run in a fresh chat with **code execution and file creation** … returns the **.docx**") + §8 (target = one `.docx`) + §10 QA (docx checks) were **never reconciled to Mode B** — finding-C + S-R9j fixed the INPUT side (consume injected numbers ✅, spot-checks confirm the values ARE consumed verbatim + the prose inside the code is sample-grade), but the OUTPUT side still targets a model-built `.docx`. This is the **INPUT-side reconciliations' missing OUTPUT-side twin.** ⚠️ **This is the #1 STEP-6 GO/NO-GO item — resolution is Sid-gated (`sid-signoff.md` S-R9k) and gates step 6.** OPTIONS: **(A) rewrite the prompt to emit PURE structured prose Mode B** (drop all code-exec/docx/matplotlib/verification machinery; emit per-§8-section prose with stable machine-parseable delimiters — the same finding-C/S-R9j family, output-side; the Node renderer [step 6] then builds the PDF+charts) — RECOMMENDED, it's the D2-decided architecture and the smoke proves the model consumes values + writes sample-grade prose; **(B) wire a code-execution renderer (Mode A)** — spike whether an API code-exec sandbox can run the emitted script + convert docx→PDF (spike §0.1 Part A REJECTED Mode A: no LibreOffice in sandbox, .docx-not-PDF, contradicts the controlled-renderer/QA-gate rationale + reintroduces model arithmetic). **SUPERSEDES the "RENDERER-CONTRACT (weak section boundaries)" entry above — same root cause, now fully understood: it's not weak delimiters, it's the wrong output medium entirely.** 🛑
  - ✅ **RESOLUTION (2026-07-21): option (A) chosen + landed (`2755538`); owner confirm-smoke on that commit = 3/3 PASS.** Opus-4.8 floor (flag OFF) now emits **PURE PROSE + the 14-id `===SECTION: <id>===` manifest (exact ids, fixed order) + bare `[[CHART|TABLE]]` markers, ZERO model-authored cells** (0 code fences / 0 `docx`·matplotlib / 0 hallucinated verification / 0 `computer://` links; numbers consumed verbatim — ayanamsa 23.6227, Taurus lagna 20°09', LP master 11). With the code scaffolding gone, cost fell to **Opus $0.46/report** (in 41.2K / out 10.3K tok, `end_turn`, 168s, 4.7K words) vs the pre-reconcile Mode-A $0.87. The §8 Output Contract is now the step-6 renderer split contract. This also re-validated 5b's persisted `interpretation` (now prose, not a code blob). **`sid-signoff.md` S-R9k CLOSED; full numbers in `tracking_files/build27-usage-cost.md`.** ✅
- 🧹 **`[[TABLE: birth-details]]` double-placement (cosmetic, surfaced by the 2026-07-21 confirm-smoke).** The Opus reconciled-prompt run emitted the `birth-details` table marker TWICE — once in `cover` and again in `part-i`. Both are VALID per the §8 map ("`birth-details` | `cover` / `part-i`"), so this is NOT a contract breach or an authored-cell violation — but the renderer will render the table twice unless it dedupes. **Fix (either): (a) the step-6 renderer dedupes a repeated table-id, or (b) a one-line prompt tweak pins `birth-details` to a SINGLE section** (recommend `part-i`, keeping `cover` text-only). Decide at step 6 when the renderer is built. 🧹
- ✅ **D8 RESOLVED (PM 2026-07-17) — confidential-config home split by sensitivity.** (1) The confidential `Revelia_Complete_Reading_Generation_Prompt_v1.md` (authoritative for section manifest / QA-checklist wording / child-rule domains) is **committed to this private, org-only (dev + founder) repo** as a normal server-side file → the backend reads it **bundled**, so the earlier "gitignored ≠ deployed" worry is moot (it's committed, not gitignored — no Railway runtime-loading problem). (2) The Monty-Adams **sample PDF → R2** as a plain **public** object (shown to every user incl. free — not a paid per-user report; NOT git; local gitignored copy = render-spike fidelity target). (3) The **R7 Timing-Engine rule set stays OUT of git regardless** (tighter access) → a private-R2 `loadConfidentialConfig` loader R7 inherits; R9's prompt doesn't need it. **Remaining action (not a decision):** the prompt is now **committed at `server/src/prompts/Revelia_Complete_Reading_Generation_Prompt_v1.md`**; **upload the sample PDF to R2.** This plan did not read the prompt → prompt-specific facts stay "verify against the prompt" at build. ✅
- ⏳ **D7 — private R2 bucket being provisioned by Sid.** PDFs live under a private key/path in that bucket; the D5 delivery seam wires `getSignedUrl` for TTL'd links. Confirm the link-TTL policy + bucket name/creds at build. ⏳
- ✅ **D4 RESOLVED (scope split, 2026-07-16) — v1 = SELF only; someone-else deferred to end of internal testing.** The "generate for someone else" path (typed third-party name/DOB/TOB/POB, minors via age-from-DOB → `SUBJECT_TYPE=child`, **no third-party palm**) is **fully designed + turn-on-ready** in the plan but shipped as a **deferred phase** (§9 Phase D). **Cleanly additive** — compute/render/deliver are subject-agnostic, so turn-on = inputs + child-rule branch + chooser UI, no re-architecture. Child rules (Mind/Temperament/Learning, gentle health, **no romantic/fear content about a minor**, face auto-skipped — verify against the prompt) are enforced end-to-end at turn-on. Face stays excluded (Play Store); third-party palm stays excluded (BIPA). ✅/📌
- ⚠️ **Someone-else third-party privacy** — the report record stores a named third party's typed birth data; document retention + the BIPA rationale for excluding third-party palm (typed data only for others). ⚠️

### R9 Phase-A step 1c (dignities / combustion / yogas) — rulings + records (2026-07-18, committed `6814eea`)
- ⚠️ **The sample's Appendix A has a PROVEN arithmetic error (Mars combustion) → the sample is now a CROSS-CHECK, not an oracle.** The sample marks Mars combust, but its OWN Appendix A puts Mars **17°59′ from the Sun — OUTSIDE its own stated 17° orb** (prompt §3 item 4). The engine computed **17.984°**, applied the prompt orb, and correctly reported **NOT-combust** with the escape margin. **RULING (owner, 2026-07-18): the engine wins; do NOT widen the orb.** This is exactly the LLM arithmetic slip Mode B removes. **Consequence (inherited by 1d + step 5): a discrete astronomy fact is trusted when the engine computes it deterministically AND it survives a canonical cross-check (astro.com / classical tables) — NOT because the sample displays it** (same posture as the astro.com check on 1a). 🔧/⚠️
- 📌 **Step-5 forward flag — the sample's Part II "Named Combinations" table is 8 rows, but only 4 are DO-2 classical yogas.** The other 4 (stationary Jupiter, Chandra-Rahu-in-2nd, chart-lord-in-12th, Rohini lagna) are **positional/speed facts the engine ALREADY produces** (1a/1c), not classical yogas. **Step 5's inject payload must CARRY those positional facts** so the model assembles the full 8-row table by PHRASING, not by deriving (Mode B: the model never computes) — otherwise Part II ships half-populated. Not a 1c gap; a step-5 injection-scope requirement. 📌
- (Two non-blocking Sid confirms routed to `sid-signoff.md` S-R9h/S-R9i — stationary threshold 0.03°/day + nodes-get-no-dignities; do NOT hold 1d, building on the defaults.)

### R9 Phase-A step 1d (forward transits + strict vara) — records (2026-07-18, committed `4d32c13`; F-delta CLOSED)
- ⚠️ **SECOND proven sample defect — Appendix B's Jupiter-return year is astronomically impossible.** Natal Jupiter is Scorpio 17°16′, so Jupiter returns fall ~2018-19 / 2030-31 / 2042; the sample's stated return year has Jupiter in Aries. Engine (+ canonical) = 2030-12-14 / 2042-11-29 / 2054-11-14 → **engine wins, sample cell flagged** (same as the Mars combustion defect). Reconfirms: the sample is a CROSS-CHECK, not an oracle. 🔧/⚠️
- 📌 **Ingress/return dates are computed in UT → the renderer/inject MUST localize to the birthplace timezone.** The engine reports UT instants; the sample + canonical panchang sources report IST — they agree on the *instant* but the printed *date* differs by the UT→local shift (+5:30 for Monty). **Step 5 (inject) / step 6 (render) must present transit dates in the subject's birthplace TZ**, or a near-midnight ingress will print one day off. Recorded so it's not missed at render. 📌 (step-5/6)
- 📌 **Accepted numerical deviations (negligible, do not shift any ingress date):** the scan derives sidereal = tropical − Lahiri ayanamsa (≈0.005° vs a native `SEFLG_SIDEREAL` calc) with the ayanamsa yearly-node linear-interpolated (error ≪0.001″) — the mitigation-(b) design that removes the event-loop block. All ingress dates still matched Appendix B to the day + canonical, so the deviation is sub-display-resolution. 🧹
- ⚠️ **Strict sunrise-vara divergence path is UNEXERCISED by the Monty fixture** (post-sunrise birth → strict == civil). The pre-sunrise branch (birth before local sunrise → vara = previous weekday) is coded but needs a **pre-sunrise fixture** to validate in later testing. `rise_trans` uses standard `SE_CALC_RISE`. ⚠️/📌

### R9 Phase-A step 2b (report numerology fields) — records (2026-07-18, committed `ba1e6f1`)
- ⚠️ **Master-scope divergence: the shared `reduceToSingleDigit` preserves 11/22/33 project-wide, but prompt §4 names only "11 and 22".** For a report field that reduces to 33, the engine (single-source reducer) shows 33-master where §4's literal rule would reduce to 6. Deliberate **SINGLE-SOURCE** choice (D1 principle — one reducer for the report AND app-wide Life-Path/Personal-Year, no fork) over literal §4-fidelity; accepted for consistency (Monty hits no 33, so the sample can't exercise it). If §4-fidelity (11/22-only for the report) is ever wanted, fold it into the **step-5 Sid-gated numerology reconciliation** (same bucket as the Y-rule wording) — do NOT fork a report-only reducer. 🔧
- 📌 **Pythagorean name-component compounds = §4 MODEL-DISCRETION, not a fixed field** (only the Chaldean compounds are fixed in §4). R9 nonetheless COMPUTES + surfaces them (with an `isMaster` flag) so the engine supplies the sample's "ADAMS = 11"-style rows and the model never does that arithmetic (Mode B + reproducibility). Recorded so a later reader doesn't drop them as "not required." 📌

### R9 Phase-A step 4 (async report worker — atomic claim + state machine + stale sweep) — records (2026-07-20)
- 🎚️ **`GENERATION_TIMEOUT_MS` = 20 min is a GENEROUS PLACEHOLDER — re-tune at step 6.** The stale-generating sweep (`reportWorker.ts`) treats a `generating` doc with no `updatedAt` progress for > 20 min as crashed and un-sticks it (retry/failed → slot refund). Real Fable long-form + LibreOffice render time is **unknown until step 6** — 20 min is a deliberate over-estimate so the sweep never kills a legitimately slow-but-live generation. Re-baseline against measured step-6 render time (must provably EXCEED true max generation time). Same for `MAX_ATTEMPTS`=3 and `REPORTS_PER_TICK`=1 (serialize — CPU-heavy render on the single box; 1/min ≫ the 1/user/month demand). All three are single-const tunables. 🎚️
- ⚠️ **SWEEP/TICK DOUBLE-RUN → DOUBLE-BILL — a STEP-5 dependency (recorded, NOT solved in step 4).** The stale sweep can re-queue a `generating` doc whose generation is **still actually running** (slow, not crashed) → a later tick re-claims it → **two generations run for one report**. With the step-4 STUB this is invisible (fast, no external effect). But once step 5 wires a real Fable call it is a **DOUBLE-SPEND of API cost** (~$2/report). **RESOLUTION DECIDED (owner, 2026-07-20): a PER-REPORT GENERATION KEY/NONCE.** Step 5 must stamp a generation nonce per report and make the Fable call a **no-op if a result already exists for that report+nonce** (i.e. the generation is idempotent on `{reportId, nonce}` — a re-claim/re-run finds the existing result and short-circuits instead of re-billing). This is the primary defense; the generous `GENERATION_TIMEOUT_MS` is defense-in-depth, not the mechanism. Recorded in the `reportWorker.ts` GENERATION_TIMEOUT / STEP-5 seam comments and in the (gated) §12n step-5 prompt. Cross-refs the timeout-tuning item above. ⚠️ (step-5)
- 🧹 **`REPORT_WORKER_ENABLED` prod-dark flag + `pdfKey:'STUB'` tripwire** — the worker is OFF by default (no cron registered). Owner-action to flip is in `owner-actions.md` (gated on steps 5-8 + finding-C). The `pdfKey:'STUB'` sentinel on any real prod Report = the flag was flipped before real artifacts were wired. See the READY-REQUIRES-ARTIFACTS guard (a report cannot go `ready` without a `pdfKey`). 🧹

### R9 Phase-A step 5a (inject-payload builders) — records (2026-07-20)
- 📌 **`current_name` overlay: the string is injected, but its Pythagorean EXPRESSION number is NOT (deferred).** `NUMEROLOGY_JSON.current_name` (prompt §3 :109 "optional; adopted overlay, Pythagorean expression") is emitted by `buildNumerologyJson` as the adopted-name STRING only; the adopted name's expression number has no schema slot and is not computed-for-inject. Under Mode B the model cannot compute it, so if a report ever needs to PRESENT the current-name expression, that value must be added to the inject (a `computePythagoreanCompound(currentName)` call + a schema slot). v1 self reports key off name-at-birth, so this is non-blocking — revisit if the current-name overlay becomes user-facing (5b / prompt). 📌
- ✅ **S-R9j inject-full-derived is LIVE in 5a** (`report-inject.service.ts` `ReportAstronomyPayload.derived`) regardless of the prompt tweak — belt-and-braces. The **Sid-gated §3/§92 prompt tweak (finding-C analog) is REQUIRED before 5b** (owner decided 2026-07-20; `owner-actions.md` 🚫 GATING, `sid-signoff.md` S-R9j). Step-7 QA validates the rendered astronomy values vs the injected engine values as the runtime backstop.

### R9 Phase-A step 8 (R2 delivery seam) — records (2026-07-22)
- 🛑 **PERMANENT GOTCHA (step-8 fix, 2026-07-22) — SendGrid click/open tracking REWRITES links → breaks/corrupts R2 (and any) presigned/one-time URLs.** The report-ready email's raw R2 presigned link (`...r2.cloudflarestorage.com/...?X-Amz-Signature=...`) was being rewritten by SendGrid's account-default click tracking into a `url*.revelia.me/ls/click?...` redirect. That tracking subdomain is **NXDOMAIN** (never configured) AND the rewrite can corrupt the presigned URL's query-string signature → the "Open your report" link 404'd / failed to open the PDF. **FIX: transactional emails carrying a signed/one-time URL MUST send with `trackingSettings` click+open tracking DISABLED — PER-SEND, not by touching the global SendGrid account setting.** Mechanism: `EmailOptions` (`email.service.ts`) gained an optional `trackingSettings?` field spread into `sgMail.send({...})` ONLY when present; `sendReportEmail` sets `{ clickTracking:{ enable:false, enableText:false }, openTracking:{ enable:false } }`. OTP/welcome/reset sends omit the field → no `trackingSettings` key → account default (byte-identical, unchanged). **Blast radius = report email only.** Applies to ANY future email carrying a presigned/one-time/signed URL (e.g. R8 export). Also in `CLAUDE.md` → Permanent gotchas. 🛑
- 📌 **Report-ready email is AT-MOST-ONCE (never-double-send prioritized over guaranteed-delivery) — deliberate.** `deliverReportReadyEmail` claims the persisted `reportEmailSentAt` flag ATOMICALLY *before* sending (`updateOne({_id,status:'ready',reportEmailSentAt:{$exists:false}})` → send only if `modifiedCount===1`). Consequence: if the send then FAILS, the flag stays set → **no automatic retry** (the report is still `ready` + fully downloadable IN-APP, which is the durable path — the email is a best-effort first-week notification only). This is the correct reading of the pin-B "sent once / persisted-flag / restart-safe" requirement; the alternative (set-flag-after-success) would risk a double-send on a crash-after-send. If email delivery ever needs to be guaranteed, add an explicit retry that is safe against double-send (e.g. a provider idempotency key) rather than unsetting the flag. Non-blocking; v1-correct. (`report.service.deliverReportReadyEmail`; `prompts.txt §12t` pin B.) 📌
- ✅ **Step-8 deviation from the §14 8a/8b plan split — SOUND.** The plan had 8a add a generic `uploadBuffer` on the PUBLIC `r2.service.ts` + 8b reuse it. Instead step 8 built a SEPARATE least-privilege `report-delivery.service.ts` reading the `R2_REPORTS_*` namespace (private bucket + scoped token → stronger isolation; the public images creds can't touch reports and vice versa). `r2.service.ts` untouched. Home-chat concurs — least-privilege is the better call for a private per-user PDF bucket. (`prompts.txt §12t`.)

### R9 Phase-A step 7 (QA gate + render wired) — records (2026-07-22)
- ✅ **RESOLVED — chart-embed criterion accepts dpi-200 RASTER (counts raster image xobjects, does NOT assert vector).** Closes the 6b chart-raster gate-input. `qaReportPdf` requires ≥3 DISTINCT raster image xobjects (`QA_MIN_CHARTS=3`); LO 7.4 rasterises the docx SVGs → 3 distinct xobjects. Empirically: local LO preserves vector (0 xobjects) so the criterion is verified against a real container raster render (`report-6b.pdf`, exactly 3). ⚠️ **COUPLING TRAP:** this criterion assumes the deployment LO RASTERIZES (LO 7.4 / bookworm). If LibreOffice is ever UPGRADED — the 6b option-(b) "pin newer LO for vector" path, or a base-image bump — charts become VECTOR → 0 raster xobjects → the `≥3-raster` check FALSE-FAILS every report. **If LO is upgraded, revisit `QA_MIN_CHARTS` to count chart images raster-OR-vector** (the QA chart check + the 6b LO-version choice are linked — change them together). (`owner-actions.md`; `build-27-caveats.md` §14 step 6b chart-raster.)
- ⚠️ **PAGE-COUNT is ENVIRONMENT-SENSITIVE (font metrics) — the QA gate MUST run in the shipping container.** Same interpretation: local render (real Georgia) = 18pp; container render (DejaVu-Serif substitute) adds pages (report-6b's 10.7K-word prose → 27pp). The QA page gate [17,26] therefore only means what the CONTAINER produces. Since `qaReportPdf` runs in-process in the same container as the renderer, this is correct in production — but a dev-box QA verdict on page count is NOT authoritative. 🎚️
- ⚠️ **Reconciled prose hovers at the 18pp floor → floor set to 17 + a Sid-gated length nudge is the real fix.** Floor = 17 (NOT 18) so a typical 18pp report never trips a paid re-Fable; the "target ~20–24pp" prompt nudge (owner-action, Sid-gated) is the length lever, not a tight floor. 🎚️
- 📌 **QA face-scan is a HEURISTIC backstop, not the guarantee.** It targets affirmative face phrasing + the literal 5a inject keys and deliberately avoids bare "face"/"samudrika" (the correct report contains the face-EXCLUSION disclosure "The Face. No face photograph…" and palm "hasta samudrika" — a bare-word scan would false-positive). The STRUCTURAL guarantee remains 5a's compile-time allow-list (`AssertNoFaceKeys`); the scan is belt-and-braces. If a future report needs face vocabulary in a legitimate non-face context, tune `FACE_TERMS`. 🔧
- 📌 **QA dashes/face classified CONTENT when present in the interpretation** (re-render cannot remove model-authored text; only a re-Fable can). The brief listed "dash in the rendered PDF" as a RENDER example, but the determination rule ("present-in-interpretation ⇒ …") governs: the renderer emits no dashes/face terms, so a hit originates from the model prose ⇒ CONTENT. Bounded by `MAX_QA_REGEN=1` (at most 2 Fable calls). Deviation recorded, rationale sound. 🔧
- ⏳ **Dockerfile touch: `python3-pypdf` added** to the runtime apt line (the QA inspector `report-qa.py`). One small package; the builder's existing `cp src/services/*.py dist/services/` already ships the script. `report-qa.py` falls back to PyMuPDF on a dev box lacking pypdf, but the container uses pypdf. Deploy the updated Dockerfile before the flag flip. 📌
- ⏳ **On-Railway render-RAM still owner-pending (now actionable at step 7).** Step 7 wired the renderer, so a staging enqueue renders end-to-end — the owner measures peak RAM under a real render vs Pro-tier (owner-actions). The provisional local ~300 MiB (6b) stands until then. ⚠️
- 📌 **`generateReport` grew injectable deps (`renderPdf`/`qa` alongside `synthesize`/`uploadReportPdf`).** Clean testability seams with real defaults; also the step-8 injection point for the real uploader. The worker's `generate` remains injectable and defaults to the real chain. 🧹

### R9 Phase-A step 9 (mobile UI + free rebuild-from-interpretation) — records (2026-07-22)
- ✅ **Tier gating is SERVER-SIDE, not client-side (deviation from the app's PLUS-features convention — intentional + correct).** Name/Career Destiny gate client-side on `tier==='premium_plus'`. The Cosmic Report does NOT: the entry cards are IDENTICAL for all users (only a gold NEW badge, no PLUS pill), and the hub routes purely off `GET /reports/credit` `tier`/`resetsAt` + the POST `402` `tier` (free→locked, else→paid-cap). This matches the backend (`reportLimitForTier`: free→0, both paid→1) and the spec's "tier field is the switch" — and avoids a client/server tier mismatch. A free user tapping the card sees the paywall state from the server, never a client guess. `FEATURE_ACCESS.cosmicReport` was added (premium+PP true) for any future `canAccess` use but is NOT the gate. 🧹
- 📌 **No async-job polling pattern existed in the app → step 9 introduced one** (`cosmic-report.tsx`): a `useEffect` recursive-`setTimeout` poll of `GET /:id` with 3s→8s backoff, a `cancelled` flag + `clearTimeout` cleanup on unmount/phase-change. The app's long readings block synchronously (180s axios timeout); the report is genuinely async, so this is net-new but minimal and self-contained. Drives BOTH the generate poll (until status `ready`/`failed`) and the rebuild poll (until `regenerating` clears). 📌
- 📌 **PDF opens via `Linking.openURL(secureLink)` (no browser/print/file lib installed).** The link is minted FRESH per open (a re-GET `/:id`), never cached — presigned 1h links expire. Opens in the device browser/viewer. If a future build wants an in-app viewer, add `expo-web-browser`/`expo-file-system` (not installed today). 📌
- 📌 **Share = promotional TEXT, not the private link.** The Ready "Share" affordance uses RN `Share.share({message})` with a marketing line — it deliberately does NOT share the presigned URL (private + 1h-expiring → sharing it would leak a private link that soon 404s). Gated on a genuine share (`result.action===sharedAction` → `recordMeaningfulAction('share:report')`); dismissal detected via the shared `isShareDismissal`. This honors "existing share affordance" without the private-link leak; a captured-card share (ShareCard) wasn't apt for a PDF deliverable. 🧹
- 🎚️ **History "Expired" pill is a CLIENT-SIDE 60-day HEURISTIC** (the history endpoint is link-less by design — no per-item HEAD, so true expiry is unknown in the list). A `ready` report whose `generatedAt||createdAt` is older than 60 days shows `EXPIRED`; the TRUE state resolves on tap (GET `/:id` does the HEAD → real `expired`). A report expired a little early/late by the heuristic still routes correctly once opened. Tunable (`SIXTY_DAYS_MS`). 🎚️
- 📌 **DO 7 — the FULL inject payload is persisted (server-only `Report.injectPayload`, Mixed, ~10-20KB) at first generation; the rebuild renders from IT, asOf-faithful.** `generateReport` now anchors `asOf` to the original `generatedAt` on a rebuild and REUSES the persisted payload instead of recomputing (`buildReportInjectPayload` with `asOf=now` would drift the `dasha.current`/transit-ingress/Sade-Sati tables away from the persisted prose = a correctness bug). Persisting the WHOLE payload (not just `asOf`) also immunizes a rebuild against a between-generation-and-rebuild engine/`NUMEROLOGY_VERSION` change. 📌
- 📌 **DO 8 rebuild — minor cover-meta faithfulness gap (accepted).** The rebuild reuses the persisted payload for the correctness-critical astronomy/numerology TABLES, but `renderMeta` (cover preparedFor/dob/pob display) is still read from the CURRENT `UserProfile`. If the user renamed / changed birth data between generation and rebuild, the rebuilt PDF's COVER header could differ from the original while the tables stay faithful. Negligible + rare; revisit only if it surfaces. Also: if the user deleted their birth data, a rebuild fails (load throws) → caught → stays expired, no credit impact. 📌
- 📌 **DO 8 rebuild claim = ONE `regenerating` flag; double-tap guarded by the atomic route set, double-tick by the in-process boolean + single backend.** The route's `findOneAndUpdate({...,regenerating:{$ne:true}},{regenerating:true})` is the double-TAP guard (a 2nd tap matches nothing). `reportRebuildRunning` + the single live instance serialize ticks so two renders of the same doc can't overlap. A cross-restart re-render is HARMLESS (stable pdfKey → overwrite-in-place, deterministic render, no Fable, no credit). The stale-generating sweep also clears a `regenerating` flag stuck > `GENERATION_TIMEOUT_MS`. A rebuild NEVER re-Fables (a throwing `synthesize` dep is a hard guard) and NEVER marks the report `failed` (which would refund a consumed credit) — a failed rebuild just clears the flag and leaves the report expired. 📌
- ✅ **In-app SAMPLE viewer BUILT (2026-07-25, un-deferred) — the earlier "DEFERRED" note was STALE vs the authoritative spec.** The step-9 mockup's `In-app sample viewer is DEFERRED` line (R9-step9-mockups.html:217) was a build-time assumption (explicitly flagged as changeable) that contradicted the authoritative product spec: `R9-report-spec.md` §2 ("Free = sample only"), §3.2 ("Free user: sees the static sample"), §3.3 (paid entry "View Sample Reading"), §5 ("Sample asset … served to all users") — and the mockup itself designed a `.viewer`/`.pdfpg` component + screen 4 "Sample stays viewable". Owner confirmed PM/Sid approval (2026-07-25). **Now wired:** `GET /api/reports/sample` mints a fresh 1h presigned link to a STATIC shared object; a "View a sample report" outline button on the free-locked + paid-entry (generate) screens opens it via `Linking.openURL` (same open path as a real report — no in-app PDF lib). **Bucket decision: the PRIVATE `revelia-reports` bucket** at key `samples/cosmic-report-sample.pdf`, served via presigned URL — NOT a new public bucket (deviation from S-R9f's "public object" wording, justified: reuses the already-provisioned `R2_REPORTS_*` least-privilege client; all users are authenticated so a presigned link satisfies "shown to all"). **Owner action = upload the one asset** (`owner-actions.md`); until then the endpoint returns `sample_unavailable` and mobile hides the button (graceful, additive). 📌

## Cross-cutting / owner (also in `session_handoff.md` queue)
> 👉 **Canonical owner-action checklist = `tracking_files/owner-actions.md`** (durable; walk it before every deploy / internal-testing / prod ship). The items below are limitations/chores; the actionable owner TODOs (gated backfill, asset uploads, temp-IP removal, etc.) live there so they survive the handoff being overwritten.
> **⏱️ TIMING (revised 2026-07-13):** these now run **in the build-27 RELEASE CYCLE** (Internal Testing on the deployed prod backend), NOT in a separate pre-release device pass. Reason: single live-prod Railway backend + APK hardwired to it ⇒ no non-prod device-test path (Testing Pass 2 device scope folded into release; `build-27-testing.md` "Pass 2 CLOSEOUT" has the ordered checklist). Memory: `infra-single-railway-backend.md`.
- **Recentre thresholds before wide backfills:** R2 faceShape + R3 palm (the 🎚️ items above) — on a larger real **camera-capture** set at release.
- **Post-deploy backfills**, each `:dry` first: `backfill:natal-chart` (R1), `backfill:face-features` (R2, after recentre), `backfill:palm-features` (R3, after step-10 recentre), `backfill:numerology` (R4).
- **Git housekeeping:** merge `feature/build-26` → `main`.
- 📌 **R8 — "Export My Data" is a GDPR stub** (counts data, emails nothing) — opportunistic fix (build-26 carry-over).

---

## 🎨 BUILD 27.1 / 2.1.0 UI REVAMP — PASS 0 (foundation) · added 2026-07-30 (`build27.1-pass0-foundation`)

- 🔴 **NOTHING CROSS-CHECKS `mobile/theme.js` AGAINST `mobile/theme.d.ts`.** `theme.js` stays `.js`
  (so `tailwind.config.js` can `require()` it with no loader) and `allowJs` is unset, so **it is
  never compiled at all**; `skipLibCheck: true` additionally means `theme.d.ts`'s own body is never
  checked. **Use sites in `.ts`/`.tsx` ARE checked — that is the gate's actual value and it works** —
  but a token added to one file and forgotten in the other produces **no error from any layer of the
  §4.5 stack**. Mitigation is convention only: edit both in the same commit. Pass 5's colour flip
  changes *values* only, so it is the one pass that cannot drift them. 🎚️
- 🎚️ **`max-w-sm` / `max-w-md` (2 sites) stay `rem`-valued PERMANENTLY and remain
  `inlineRem`-dependent after the whole codemod.** `theme.maxWidth` is *not* replaced by design
  §6.2, so they moved 336→**384** and 392→**448** at the flip and will keep tracking `inlineRem`.
  The claim *"the config is explicit px throughout so `inlineRem` goes inert"* is true of spacing,
  radius and fontSize — **not** of `maxWidth`, and not of `leading-*` until `theme.lineHeight` is
  deleted in 2b. **This is the register entry §1.6 3a asks for.** Left as-is deliberately. 🎚️
- 🔴 **The inline `borderRadius:` ledger measures 159, not the plan's 162.** Re-measured this
  session over `app components` (`borderRadius\s*:\s*[0-9]`). **Pass 3b must RE-DERIVE its own
  ledger from a fresh grep rather than trusting 162** — the plan's §1.6/§3.5 figure predates this
  measurement. (The ten *gate* baselines all reproduce exactly; this is a pass-3b work estimate,
  not a gate baseline.) 📌
- 🔴 **Four `bg-black/NN` scrims cannot keep their alpha modifier under the new `scrim` token.**
  `bg-black/70` works because `black` is `#000000` and `/70` drives `--tw-bg-opacity`; `scrim` is
  *itself* an rgba value, so **`bg-scrim/70` does not compose.** All four collapse to a flat
  `bg-scrim` at 0.6 — consistent with P20's "the spread is drift" ruling, but **`SunSignReveal.tsx:59`
  goes 0.90 → 0.60**, a visibly lighter overlay and a bigger move than the stated 0.5–0.7 range
  implies. **Must be in the pass-1b screenshot pass.** 🎚️
- ⚠️ **The pre-push hook runs the token gate REPORT-ONLY until after pass 5** — a deliberate
  deviation from `codemod-plan.md` §1.2's snippet, because the gate exits nonzero *by design* for
  the duration of the revamp and `set -e` would make the repo unpushable from the pass-0 commit
  onward. `tsc` ×2 blocks. **Flip it to blocking as the last step of the revamp** (owner-actions
  **P22** follow-up 2). Full limits in `codemod-plan.md` **§4.6**. ⚠️
- 📌 **`text-4xl`/`5xl`/`6xl` (30 usages, 27 files) still have no ramp target** and remain 30
  per-site decisions in pass 2a; the design never enumerated them. Unchanged by pass 0, restated
  here so it is not rediscovered late. 📌

## 🎨 BUILD 27.1 / 2.1.0 UI REVAMP — the §14–§18 DISTINCTIVENESS LAYER · added 2026-07-30 (`build27.1-distinctiveness-transcribe`)

Accepted while transcribing the design canvas's turns 8a and 9 into `UI-revamp-design.md`
**§14–§18** and **§10.1.0**. 🔴 **None of these belongs to codemod passes 0–5** — plates and shape
primitives are new components in the **primitives** phase, §17 lands in **screens**, §18 in
**motion**, and **nothing in §14–§18 changes the token contract.**

- 🔴 **The `tide` plate breaches its own legibility floor, and it is the only specimen that does.**
  §14.2 sets the floor at **strokes ≥1.25px at a token ≥4.5:1**, but `tide`'s 2nd and 3rd paths
  carry `opacity=".7"` / `".45"` on `fg-muted`, computing to **≈3.2:1 and ≈2.0:1 on `bg`**
  (`fg-muted` is 5.36:1 at full opacity). Either the floor means *"the plate's primary stroke"* and
  receding tide lines are deliberately atmospheric, or the opacities rise to ≈0.85/≈0.7. **A
  visibility judgement, not a WCAG failure** — a plate is decorative and
  `importantForAccessibility="no"`. → **O-20**, designer. 🎚️
- ⚠️ **`tide`'s stated ratio does not match its `viewBox`.** Labelled **3:1**; the box is
  **160×72 = 2.22**. The other four labels are honest roundings of theirs (`orbits` is exact).
  **Resolution rule adopted meanwhile: the `viewBox` is NORMATIVE, the ratio label DESCRIPTIVE** —
  which is consistent with §14.4's fixed `viewBox` + `preserveAspectRatio="xMidYMid meet"`.
  🔴 **Do not "fix" the specimen to 216×72** without the designer. → **O-20**. 📌
- ⚠️ **Three unverified rendering assumptions, each with a pre-decided fallback**, all to ride the
  same device pass as W1 and the `resizeMode="repeat"` grain-tiling check:
  **(i)** `currentColor` in `react-native-svg` **15.11.2** (version confirmed in `package.json`) —
  fallback is **five lines inside `Plate`**: resolve `theme.color[tint]` to a literal `stroke`/`fill`.
  Same API, same call sites (**O-19**).
  **(ii)** SVG under `BlurView` for LockShell d1's `comet` plate — 🔴 **failure mode already ruled:
  the plate is DROPPED from d1 entirely, NEVER moved above the blur**, because a crisp plate over
  blurred content would read as unlock UI and dilute the one meaning blur has (**O-21**).
  **(iii)** all of `react-native-svg` inside `react-native-view-shot@4.0.0-alpha.2` — see W1 below. ⚠️
- 🔴 **W1 is WIDER than the caveat register previously recorded.** It was *"the SVG `RadialGradient`
  aura may not capture"*; turn 9 restates it as **zero `react-native-svg` nodes in `ShareCard` /
  `ShareableQuote` / `CompatibilityShareCard`** — **no plate, no aura, no primitives** — until
  view-shot capture of SVG is verified on Android. **The flat fallback drops BOTH the aura AND the
  plate, as one rule for the whole surface family, with no per-element judgement.** The shipping
  share design is `expo-linear-gradient` washes (proven inside view-shot in production) + token
  fills + type; **`tide`'s share slot is a post-W1 upgrade, not a launch state.** Note
  `CompatibilityShareCard` is named here and is **not** in §9's 15-component list. 🔴
- 🔴 **Home's Do / Avoid pair needs a `success` @12% and a `danger` @12% wash — neither token
  exists.** §2 has `accent-muted` and `accent-2-muted` only. §2.1 is **not** breached (copy is `fg`
  on a wash over `surface-raised`), but adopting turn 8a's hero as drawn either adds two muted
  tokens — contradicting *"tokens unchanged"* — or renders Do/Avoid another way. → **O-18**, owner.
  🔴 **Do not let a pass invent the tokens.** 🎚️
- ⚠️ **Turn 8a's right-bled hero card constrains §5.4's `card-entrance` for that one card: its
  entrance must be OPACITY-ONLY.** A `translateY` on a flush-edge card **visibly clips against the
  screen edge**. Same class of exception as §10.3's wheel (which mounts at full opacity, no
  transform). Cheap, but invisible until someone sees it on a device. ⚠️
- 📌 **Turn 8a's two-line name break is optional and it costs ~34dp of fold.** §17.1 allows **one**
  `display-lg` per screen and §17.3 assigns Home's to the **energy numeral**, so the name stays at
  `display-md` 24/29 per §10.1's table — which also removes this cost and keeps the table's
  load-bearing reason (*"24 leaves room for a long name at 320dp"*). 📌
- 📌 **`ArcDivider` / `RidgeField` / `TickRule` stroke 1px at 7%–16% white, so they inherit O-5 / W3
  verbatim** — *"`borderWidth: 1` at 7% white is 3 physical px on a 3× panel"*, and at hairline width
  the alpha may need to rise to ~10%. ⚠️ **§14.2's ≥1.25px floor is scoped to PLATES and does not
  apply to the primitives** — generalising it would delete three of the four. 📌
- 📌 **Two review artefacts that must never reach the app**, both labelled as such in the canvas and
  now recorded in §18.3: turn 9's **3.6 s demo loop is a review harness** (`dur-ambient` **2600** is
  the only looping duration in the system), and turn 8a's **3× grain/aura were diagnostic only** —
  ship values are **grain .05 · clay aura .16 · iris aura .12**. ⚠️ 8a's own option label says
  *".05 / accent-muted .14"*, which is a slip: **.14 is the `accent-muted` TOKEN's alpha (§2 row 14),
  not the rendered aura opacity.** Turn 9 is later and says **.05 / .16 / .12**. 📌

---

## PASS 1a — STEP 1 / STEP 2 (2026-07-30, `build27.1-pass1a-colour`)

Recorded from the count re-derivation and the six owner rulings R1–R6. **The rewrite did not start**
— see `session_handoff.md` for why.

- 🔴 **`bg-success/12` / `bg-danger/12` DO NOT COMPILE, and NativeWind drops them SILENTLY.**
  Tailwind 3.4's `theme.opacity` scale is **steps of five** (`0 5 10 15 … 95 100`);
  `nativewind/preset` does **not** override it (verified); and Tailwind 3 does **not** accept a bare
  off-scale number as an arbitrary modifier. Owner ruling **R2** resolves O-18 with that spelling, so
  **the ruling as worded produces no wash at all** — no build error, no warning, no runtime signal.
  Working spellings, both measured: **`bg-success/[0.12]`** → `#10b9811f` · **`bg-danger/[0.12]`** →
  `#ef44441f` · on-scale `/10` → `#10b9811a`. **Owner must confirm which.** → **O-18**, `P25(b)`. 🎚️
- 🔴 **`§1.6b` V-5's stated reason was FALSE and is withdrawn.** *"`bg-scrim/70` does not compose
  because `scrim` is itself an rgba value"* — measured, **it composes**: Tailwind parses the `rgba()`
  and **replaces** the alpha channel (`bg-scrim/90` on `rgba(0,0,0,0.6)` → `#000000e6`). **R3's
  conclusion (solid hex) still stands, but on different grounds** — recorded because a false reason
  invites the next reader who tests it to "correct" the token back to rgba. ⚠️
- ⚠️ **NEW FOOTGUN created by R3: a bare `bg-scrim` is OPAQUE BLACK, not 60% black.** With `scrim` as
  a solid hex there is **no default alpha** — every scrim site must spell its modifier
  (`bg-scrim/60`, `bg-scrim/90`). Verified: bare `bg-scrim` resolves to
  `rgba(0,0,0,var(--tw-bg-opacity,1))`. There is **no gate rule that catches a forgotten modifier**,
  and the failure is a full-screen black overlay. ⚠️
- 🔴 **`no-white-on-accent` can NEVER be promoted to a failure condition, and the proof is now
  concrete.** `astrology/index.tsx`'s `StyleSheet` holds `unlockButton {backgroundColor:'#F59E0B'}`
  and `unlockButtonText {color:'white'}` **four properties apart, in different style objects**,
  joined only at the JSX call site — and `unlockButtonText` names no accent, so **no proximity window
  of any size pairs them.** This is a **fifth** known A5 violation the plan's list of four omits.
  Comment added to `scripts/token-gate.sh` so nobody re-reads the rule as promotable. 🔴
- 📌 **`ShareableQuote.tsx`'s `bg-[#F59E0B]` + `text-[#0F0A1A]` is a fifth `on-accent` candidate**
  that §1.6b V-7's four-site list omits. In 1a it is two ordinary identity renames (`bg-accent` +
  `text-bg`); re-resolving to `text-on-accent` is a **value change** (`#0F0A1A` → `#000000`) and so
  is 1b. ⚠️ It is also a **W1 / X6 / X7 share surface** — read §7.3 first. 📌
- 📌 **`astrology/index.tsx`'s PLUS badge (`backgroundColor:'#F59E0B'` + `color:'black'`) is the
  single `black` keyword in the entire 81-keyword ledger.** Contrast is already correct so it is a
  V-7 rename in kind — **but `UI-audit.md` §5.7 DELETES this badge** as R1 gate #10. **Register, do
  not rename.** 📌
- 📌 **O-20 is reclassified, not fixed: the ≥4.5:1 plate floor is a VISIBILITY standard, not an
  accessibility one.** WCAG 1.4.3's 4.5:1 governs **text**; non-text contrast is **1.4.11** at
  **3:1** and applies only to **meaningful** graphics; **decorative graphics are exempt.** Plates
  carry no information, so `tide` at ≈2.0:1 is a documented deliberate-subtlety exception. The floor
  still stands as a visibility rule for the other four, and `border-subtle` stays banned inside
  plates. **The ratio audit is COMPLETE** (design §14.3 finding (i)): `tide` is `160×72` = 20:9 vs a
  `3:1` label; the other four are honest roundings within ±4%; **the `viewBox` is normative and the
  slot reserves whatever it implies**, so no mismatch can reserve a wrong-sized box. 📌
- 🔴 **`<Plate/>` must set BOTH `accessibilityElementsHidden` (iOS) AND
  `importantForAccessibility="no-hide-descendants"` (Android)** — `react-native-svg` nodes otherwise
  surface to assistive tech as unlabelled elements. **On the component, never per-site.** Neither
  prop covers the other platform. The omission is **invisible** unless someone runs a screen reader,
  and nothing in this repo's verification stack does. New design **§14.1.1**. The four §15 shape
  primitives want the same treatment in the primitives phase; 🔴 **do NOT generalise it to
  `BirthChartWheel`**, whose SVG *is* meaningful (§11.6). 🔴

### Pass 1a — `astrology/index.tsx` rewrite (2026-07-30)

- 🔴 **PASS 1a BLINDED ITS OWN GATE, and this will recur.** `no-white-on-accent`'s inline half matched
  only raw hex (`backgroundColor:[^,;]*#(F59E0B|92722D)`). 1a rewrites those to `t.color.accent`,
  which matches **neither** that pattern **nor** `\bbg-accent\b` (no `bg-` prefix on an inline style).
  Measured: `astrology/index.tsx` went **1 hit → 0** the moment 1a ran — *not fixed, unseen.*
  **A gate that reports clean BECAUSE the codemod ran is worse than no gate.** Both halves widened to
  match legacy **and** token spellings. 🔴 **Every later pass must re-check its own greps for the same
  erosion** — any rule naming a *value* rather than a *token* decays as that value migrates.
  `no-white-on-accent` was the only report-only rule, so the only one that could erode invisibly.
  **Re-verify before 2a, 3b and 4.** 🔴
- 🆕 **Three A5 candidates the narrow pattern never caught**, surfaced by the widening and needing a
  human read in 1b: `readings/combined.tsx` ≈`:67` · `components/readings/StrengthsList.tsx` ≈`:33` ·
  `components/readings/DestinyCard.tsx` ≈`:45`. Proximity is not nesting — some may be false
  positives. ⚠️
- 🔴 **`astrology/index.tsx` holds SIX white-on-accent sites, not four.** The generate CTA ×4 plus
  **two StyleSheet pairs** — `unlockButton`/`unlockButtonText` and 🆕 `assumedNoteCta`/
  `assumedNoteCtaText`. Both pairs remain **structurally unreachable** by any proximity grep even
  after the widening, which is the standing proof the rule can never become a failure condition.
  🟢 All six migrated **fill and foreground** in 1a (both identity-preserving); **1b re-resolves six
  named `t.color.fg` references to `t.color['on-accent']`** — an enumerated list, not a hunt. 🔴
- 🔴 **NEW GATE RULE `no-bare-scrim` (the 8th named rule), baseline 0 and it must stay 0.** Solid-hex
  `scrim` trades a fail-safe default for a **fail-dangerous** one: with `rgba(0,0,0,0.6)` a forgotten
  modifier still rendered a 60% scrim; with `#000000` it renders an **opaque black overlay**. No other
  rule catches it — `scrim` is a *legal* token name, so `no-legacy-tokens` passes it and `no-raw-hex`
  never sees it. 🔴
- 📌 **§11's 1a estimate is re-budgeted 2–3 → 1–2 sessions, and the reason matters more than the
  number: 1a's unit of work is a LITERAL, not a SITE.** 62 sites in the worst file collapsed to **11
  find-and-replace operations**, because identity makes the mapping context-free. The
  *"97 inline styles / 3 local components / own StyleSheet"* framing predicted the wrong cost — those
  make a file expensive to **restyle**, nearly free to **rename**. 🔴 **Do not reuse §3.2's
  scatter-ranked file order as a 1a effort model.** The real 1a cost is the **exclusions**, and each
  one needs a named §1.6b row to justify it. Full record: **§11.1**. 📌
- ⚠️ **`#10B981` / `#EF4444` resolving as Tailwind's `emerald-500` / `red-500` is NOT a config bug.**
  `success` and `danger` are not Tailwind colour keys at all, so they can only resolve through the S0
  bridge; those hexes **are** the HELD values (§1.6a) because the original palette was drawn from
  Tailwind's ramp. Vellum's `#86A97B` / `#C8695E` arrive at **pass 5** — seeing them earlier would be
  the real bug. Recorded because the misreading is reasonable and chasing it means re-opening a
  correct bridge. ⚠️

### Pass 1a — four rulings generalising the gate-blinding finding (2026-07-30)

- 🔴 **THE GATE HAS TWO CLASSES OF RULE, WITH OPPOSITE FAILURE MODES — now a standing rule
  (`codemod-plan.md` §3.0.2.0 + §4.6).** **DECREASING COUNTERS** (`no-raw-hex`, `no-legacy-tokens`,
  `no-numeric-fontsize`, `no-legacy-radii`, `no-leading-utilities`) target 0 and are verified by
  asserting the count fell by **exactly N** — they **cannot** be blinded, because a rewrite that dodges
  the pattern also fails the count. **PERMANENT INVARIANTS** (`no-white-on-accent`, `no-bare-scrim`,
  and `no-fontweight` once pass 4 drives it to 0) target 0 **forever** with a count **already** 0 — so
  there is no counter to cross-check them, and a syntax change **silently disarms them while they keep
  reporting 0.** 🔴 **Before every remaining pass: list the permanent-invariant rules that pass could
  blind, widen them, and RE-RUN THE WIDENED PATTERN AGAINST THE PRE-MIGRATION TREE.** A widened rule
  that finds nothing on old code has only moved the blind spot. **Scheduled: `no-bare-scrim` after 1b
  (rgba → `t.color.scrim` changes what it looks at), `no-fontweight` after pass 4.** 🔴
- 🟢 **The rule was PROVEN on its first application, and the proof caught a bug in my own fix.** The
  widened `no-white-on-accent` now returns the **identical 6-site set** on both trees. ⚠️ **The first
  widening was wrong**: relaxing `backgroundColor:` to `(background)?[Cc]olor:` made a gold
  *foreground* count as a fill, inflating astrology from 1 hit to 3 with two false positives. The
  pre-migration run is what exposed it. **Tightened back to `backgroundColor:` only.** 🟢
- 🔴 **A5 ENFORCEMENT HAS LEFT THE GATE PERMANENTLY.** Six sites, three independent structural reasons
  (proximity is not nesting; fill and text in different style objects; two `StyleSheet` pairs joined
  only at a JSX call site). **No proximity window closes those gaps and widening does not either.** The
  rule stays REPORT-ONLY forever. **The control is now a permanent gotcha in `CLAUDE.md`:** *"`on-accent`
  is the only legal foreground on an accent/warning/success/danger fill. Never `fg`, never white.
  `#FFFFFF` on `#F59E0B` is 2.15:1."* Once 1b fixes the six, the residual risk is **new code adding a
  seventh** — and a documented rule in the file every session reads beats a grep that cannot see it. 🔴
- 📌 **§11 RE-BUDGETED BY DISTINCT OPERATIONS, NOT SITES — codemod total 13–17 → 10–13 sessions.**
  Per-LITERAL (revised down): 1a 2–3→1–2 · 2a 1–2→1 · 2b apply-cost down (the *review* is the cost) ·
  3a 1→<1. 🔴 **Per-SITE, UNCHANGED and now dominating the critical path: 1b** (role resolution is
  per-context by definition) and **3b** (the 49 `rounded-xl`/`rounded-lg` are ambiguous **by name**, so
  no per-literal shortcut can exist). ⚠️ **Pass 4 is MIXED and its estimate is split**: ~8 operations
  for the className half, but the ~173 inline `fontWeight:` sites need family context. 📌
- 📌 **1a now runs PER-LITERAL IN ROLE BATCHES, not file-by-file** (§3.2 rewritten; the old per-file
  order is retained for **1b**, whose unit *is* the site). A per-file sweep re-pays the same reasoning
  in every file holding a literal — `#9CA3AF` is in ~40 files and the decision is identical in all of
  them. **~6 gated commits** (neutrals → whites → golds → status → surfaces+scrims → ramp → arbitrary)
  instead of 58 file commits or one unreviewable 1,129-site diff. 🔴 **The check stays PER-LITERAL,
  never per-line** — `#F59E0B` (1a) and `#92722D` (1b) sit in the same ternary. A batch is a commit
  boundary, not a shortcut. 📌

### Pass 1a — the pre-2.1 palette had SYSTEMIC contrast failures (2026-07-30)

- 🔴 **The pre-2.1 palette failed AA at multiple independent sites, and every one was found
  INCIDENTALLY while doing something else.** Not one was found by a check that was looking for it:
  **six** A5 white-on-accent sites in `astrology/index.tsx` alone (2.15:1) · **`PremiumBadge`'s
  `bg-pink`/`text-white`** at **3.53:1** (O-22, live in production) · **`home.tsx`'s two PLUS pills**
  at **1.62:1** (`#9333EA` on `#6B21A8`, purple on purple, effectively invisible, on the
  highest-traffic screen — deleted by R1 gates #29/#30, so no separate action). **Three distinct
  defect sites, three separate accidents.**
  🔴 **THIS IS WHY THE TOKEN TABLE'S PER-PAIRING CONTRAST COLUMN IS A GATE, NOT DOCUMENTATION**
  (`UI-revamp-design.md` §2, §16.7, `codemod-plan.md` §5). The old palette had no such column and the
  result was not one bad pairing but a *pattern* of them, each individually plausible. A ratio
  recorded per pairing is the only thing that makes the next one visible before it ships — and
  `no-white-on-accent` is permanently unable to do that job (§3.0.2.1). ⚠️ **Corollary: do not treat
  the six/three as "the list."** They are what fell out of two files' worth of attention; the honest
  statement is that the old palette was never contrast-audited, and 2.1's table is the audit.
- 📌 **`PremiumBadge` has exactly ONE call site** — `LockedOverlay.tsx:19`, `tier={requiredTier}`,
  **one tier at a time.** So O-22 needs **no** visual-rank treatment: label-only is sufficient, and the
  filled-vs-outline rank idea is **skipped** as unnecessary. ⚠️ Nuance worth keeping: that badge shows
  the tier the content **requires**, not the tier the user **has** — so if a future surface renders two
  tiers together, revisit (filled `accent-2` for Plus, `accent-2-muted` + `accent-2` border for
  Premium — rank without a second hue, never clay). 📌

### Sonnet 5 free-tier model bump (2026-07-31) — PM-approved, `fix/build-27.1`

The six free / all-tier reading surfaces moved `claude-sonnet-4-6` → **`claude-sonnet-5`**
(monthly-free, compat-free, daily, name-destiny, face, palm). Paid marquee surfaces (Fable 5 →
Opus 4.8) and Q&A are untouched. Caveats accepted with it:

- ⚠️ **1 SEPT 2026 IS A REAL COST STEP, AND NOTHING IN THE CODE WILL REMIND ANYONE.** Sonnet 5 is
  `$3/$15` per MTok — identical to 4.6 — but carries an **introductory `$2/$10` through
  2026-08-31**. Independently, Sonnet 5's tokenizer counts the same text **~30% higher** than 4.6's.
  Those two roughly cancel until 31 Aug and then **don't**: expect free-tier AI spend to step up
  ~30% on 1 Sept with zero code or traffic change. **Do not diagnose that as a regression.**
- 🔴 **`thinking: { type: 'disabled' }` on the cheap path is LOAD-BEARING, not boilerplate.** On
  Sonnet 4.6, omitting `thinking` meant no thinking; on Sonnet 5, **omitting it runs adaptive
  thinking**, and thinking shares the `max_tokens` budget with the response. On these tight
  JSON surfaces that truncates the JSON into a parse error — **with no 400 and no warning**, just
  `stop_reason:'max_tokens'` and a `json_parse_error`. Anyone "simplifying" that param away
  reintroduces a silent failure. Same reasoning documented at `CHEAP_MODEL`.
- 🎚️ **Every `max_tokens` on these surfaces was re-tuned for the new tokenizer** — daily
  4096→5500, name-destiny 6144→8192, face/palm 8192→**16000** (the latter also absorbing adaptive
  thinking, which face/palm DO run at `effort:'medium'`). 16000 is the ceiling that stays safe
  **without** streaming; anything higher needs the streamed path. ⚠️ Face/palm were already
  truncating occasionally at 8192 *before* thinking was added — watch `FACE_READING_TRUNCATED` /
  `PALM_READING_TRUNCATED` through the first cycle rather than assuming the bump was enough.
- ⚠️ **Face/palm latency is the risk this change actually carries.** They are already the slowest
  screens (vision + large JSON) and now run adaptive thinking on top. The fix if the wait becomes
  unacceptable is known — move those two to the streamed beta path the marquee surfaces already
  use — but it is **extra work, deliberately not done pre-emptively.**
- 🔧 **Vision-token cost is UNVERIFIED.** Sonnet 5 is the first Sonnet with high-res image input
  (2576px long edge, up to ~4784 image tokens vs 1568 on 4.6), so palm + compat-free could cost up
  to ~3× per image *if the app uploads large images*. **Nobody has checked what mobile actually
  sends.** Do that before reading anything into the cost numbers.
- 📌 **Sonnet 5 follows instructions more literally than 4.6.** Prompt lines written to push 4.6
  around may now over-apply. Not a blocker — a first-cycle read-the-output item.
- 🔧 **`daily` may belong on Haiku 4.5, but that is DELIBERATELY NOT DECIDED.** Rough estimate is
  ~$0.03–0.04/generation → **~$1/month per daily-active free user**, which would make daily insight
  the dominant free-tier line item by an order of magnitude (365×/user/yr vs 12× monthly, 1× face).
  Haiku is 3× cheaper and daily's substance is already deterministic (astrology/numerology/timing
  engines), so it is plausible — but it is the **most-seen** surface, so it needs a side-by-side
  quality read on real output, on **measured** cost, not this estimate. Token usage is now persisted
  per generation (below) precisely to answer this.
- 📌 **Two Sonnet 4.6 holdouts are intentional**: `geocoder.service.ts`'s fallback and
  `imageValidation.service.ts`. Both emit structured JSON, not prose, so Sonnet 5's gains buy
  nothing; geocode results are permanently cached so a model change wouldn't fix past rows anyway;
  and 4.6 is not retired, so there is no forcing function. **Not an oversight — leave them.**
- 📌 **`SYNTHESIS_MODELS`' `effort` field is now unread on every cheap row.** Effort is inert with
  thinking disabled, so the four cheap rows' `effort: 'medium'`/`'low'` values are decorative. Left
  in place because the `Record<SynthesisSurface, SurfaceRoute>` shape is exhaustive. If a future
  pass wants per-surface effort on the cheap path, it must **also** turn thinking back on there —
  and re-tune `max_tokens` again.
- 🟢 **Token usage is now persisted per generation** (`AiGeneration.inputTokens`/`outputTokens`/
  cache split; `tokensBySurface` added to `getRecentAiGenerations`). The helper had `usage` on its
  result all along and discarded it. ⚠️ **Rows written before 2026-07-31 have nulls and contribute
  0** — a window spanning the change **under-reports**; it does not lie, but don't read a partial
  window as a full one.
- 🔴 **Monthly + compat `maxTokens` is now TIER-SPLIT (`tier === 'premium' ? 8192 : 11000`), and that
  shape is load-bearing.** One `const maxTokens` feeds **both** branches of the surface split, so the
  obvious flat bump would have raised the **PAID Fable 5** cap as a side effect of a free-tier change.
  Premium holds at 8192, unchanged. ⚠️ Anyone "simplifying" this back to a single number silently
  re-scopes a free-tier tuning decision onto a paid surface. (Earlier notes in this session called
  these values "tier-derived" — they were **flat 8192** until now.)

---

# PASS 1b — the colour VALUE pass (2026-07-31, session `build27.1-pass1b-colour-value`)

Accepted during 1b. Revisit at the §4.4 screenshot pass, or at the primitives/screens phase where noted.

- 🔴 **`O-24` — three qualitative scales have no semantic home, and 1b shipped a PROVISIONAL answer.**
  Three score components encode 3-band ladders (gold/pink/purple) and `name-destiny` encodes a
  **6**-category `IMPACT_COLORS` map. The mechanical V-1/V-3 mappings **collapse best-band onto
  worst-band**. 1b shipped `accent` / `accent-2` / `fg-muted` (and a 6-way spread for the map) purely to
  preserve distinguishability. **The success/warning/danger reading is equally defensible and would give
  `warning` its first call sites.** ⚠️ Also a **product-tone** question — is a low compatibility score a
  `danger`? **Owner review wanted.** Touches a **W1** share surface.
- 🔴 **`warning` STILL ends pass 1 with ZERO call sites, and that is now a deliberate choice, not an
  oversight.** It was the obvious candidate for `IMPACT_COLORS`' sixth category — and was **rejected
  because held `warning` equals held `accent`**, so any category assigned it would render **identically
  to `Creativity` for the whole of passes 1–4** and separate only at pass 5. **A held-value collision can
  bite BEFORE the flip, not only at it.** That case is not in §3.0.2.2's table; it should be.
- ⚠️ **6 sites had off-scale alphas and were ROUNDED, which is a value change.** `0.08 → 10` ×3
  (gold/success/danger washes), `0.12 → 10` ×3 (`name-destiny` ×2, `TimezonePicker`). Forced by the ruling
  that `pct` sits on Tailwind's 5-step scale — the same fact that makes `bg-success/12` non-compiling. The
  deltas are ≤2% on decorative washes behind text.
- ⚠️ **`border-primary/30` and `/40` lost their modifiers going to bare `border-strong`, and get visibly
  dimmer.** Composited on `bg`: `/20` → ≈`#332C47` vs `border-strong` `#2D2640` (near-identical, fine);
  `/30` → ≈`#453D5E` and `/40` → ≈`#574E75` are **clearly lighter than the token**. Sites:
  `ProfileHeader:28` (/20), `SunSignReveal:69` (/30), `SunSignReveal:113` (/40). Consistent with the
  design dialling borders down deliberately, but **it is a visible reduction — put it on the screenshot pass.**
- ⚠️ **`birth-data`'s handedness toggle now signals selection mainly by its LABEL, not its border.**
  Selected was `border-primary` (`#C4B5FD`, bright lilac) against unselected `border-gray-700`
  (`#374151`) — a strong contrast. Post-1b it is `border-strong` `#2D2640` vs `border-subtle` `#1F2937`,
  which are **much closer**. The label still moves `accent` ↔ `fg-muted`, so the affordance survives —
  **but this screen is NOT on the §4.4 18-capture list.** Add it.
- ⚠️ **11 `LinearGradient` slabs were migrated rather than left alone**, against §1.6b V-1's "do not
  migrate a site that is about to be removed." **The gate forced it**: `no-raw-hex` must reach 0, and a
  raw `#6B21A8` left in place would also stay purple *through pass 5* if the primitives phase slipped.
  They are migrated **transitionally** and are still slated for replacement by the single `aura` (design
  §2). 🔴 **Four of them would have FLATTENED** (both stops in one colour family): `readings/index.tsx`
  ×3 and `GrowthCard`. Their second stop took `t.alpha(accent, 60)` to preserve a two-tone ramp — that is
  **1b inventing a transitional value**, and the primitives phase should overwrite it, not inherit it.
- ⚠️ **`#92722D` did NOT go to `accent-muted`, contradicting V-8's letter.** V-8 routes the gold-tinted
  grounds there, but `accent-muted` is **14% gold** and this site is the astrology CTA's **loading-state
  fill** — 14% would have made the button nearly transparent mid-request. It took
  `t.alpha(accent, 60)`. Same reasoning split `#1c1708` (ground, → `alpha(accent, 5)`) from `#4a3c1c`
  (its border, → `accent-muted`) so the two-step gold ladder survives.
- ⚠️ **Three of V-5's 17 "scrims" are not scrims by role** and took `scrim` anyway per R3's collapse
  ruling: **7 rounded legibility chips** over a camera preview, and **one `textShadowColor`** — the single
  `textShadow` in the entire app (preflight §C.1). A primitives-phase "legibility plate" primitive may
  want them back. Recorded in `held-collision-ledger.md` ENTRY 5.
- ⚠️ **`readings/index.tsx`'s PREMIUM PLUS marker is a FIFTH tier-badge treatment (`O-25`).** O-22
  unified `PremiumBadge`'s two branches; this one (dark text on a **white** `bg-fg` pill) is untouched by
  that ruling and took the **minimal** fix (label → `on-accent`) rather than the O-22-consistent
  `bg-accent-2` + `text-on-accent`, because the latter is a **fill** change. So the app still ships
  multiple tier-badge treatments. **Screens phase should unify them.**
- ⚠️ **`numerology/index.tsx:403` held a DEAD `text-primary`** — overridden by an adjacent inline
  `style={{ color: colors.primaryLight }}`, so it rendered nothing. Deleted rather than migrated. The
  inline is C11's. **This is the `w-30 h-30` failure mode in a colour class**, and no gate catches it:
  the class resolves fine, it is just never visible.
- ⚠️ **`app/index.tsx:85`'s comment names `colors.background`**, which C11 deletes. The hex inside it is
  legitimate permanent residue (a non-colour context), but **C11 must update the comment text** or it
  becomes a dangling reference to a deleted module.
- 📌 **`O-16` RESOLVED BY FOLD.** The single `#0A0A0F` at `(capture)/_layout.tsx:8` — "deliberate darker
  camera surface, or a transposition of `#0F0A1A`?" — was **folded into `bg`**. It is one site, the
  difference is imperceptible, and keeping a one-off token for it fails the same test that killed
  `success-muted`. ⚠️ If the owner intended a genuinely darker camera canvas, this is where to reinstate it.
- 📌 **`bg-card-translucent` needed no decision after all.** The handoff flagged it as "value ≠ `surface`;
  needs its own decision." `t.alpha(t.color.surface, 80)` reproduces `rgba(26,20,37,0.8)` **exactly**, so
  it is an **identity** migration. The `alpha()` helper closed it for free.

- 🔴 **SHIPPED 2.0.0 CARRIES SYSTEMIC CONTRAST FAILURES, and the token system is what surfaced them.**
  Pass 1b's A5 accounting closed at **~40 sites** where a foreground sits on a filled `accent` /
  `accent-2` / `success` / `danger` ground. **Only 6 were known in advance** (V-7's four plus
  `astrology/index.tsx`'s pair). **34 — 85% — were invisible until the codemod ran**: some were
  created by a mapping that was locally correct (C7's `red-600 → danger` took two buttons from
  4.83:1 to 3.76:1), most were merely *unreachable by any grep* until a token name replaced a hex.
  🔴 **The headline is `DailyInsightCard`:** `text-accent` on an `accent` gradient — **text the exact
  colour of its own background, 1.00:1, invisible** — on the most prominent card of the
  highest-traffic screen. It is codemod-created (pre-1b it was gold on purple: marginal but
  legible), and **no gate, no type-check and no `--diff` could see it.** Only the
  gradient-fill register (`held-collision-ledger.md` ENTRY 6) reaches that class at all.
  ⚠️ **The honest reading is not "the codemod broke 34 things".** It is that a raw-hex codebase has
  **no vocabulary in which a contrast rule can be expressed**, so these failures were unstateable
  before the tokens existed. Naming the roles is what made them findable. That is the strongest
  argument in the whole revamp for the token system paying for itself — and it lands before pass 5
  has changed a single value.
  📌 Two sub-cases worth keeping separate, because they teach different lessons:
  **`readings/index.tsx:225` was ALREADY 2.15:1 before 1b** (pre-existing; the codemod is innocent)
  while **`numerology/index.tsx:678` DEGRADED from 5.6:1 to 2.15:1** (the codemod is the cause).
  A register that conflates the two would misattribute blame and mis-schedule the fix.

---

### 🔴 `no-numeric-fontsize` CAN NEVER REACH ZERO — 60 permanent glyph sites (pass 2a, 2026-07-31)

**§4.6's closing plan is "AFTER PASS 5, flip the hook to blocking … at that point every count is 0."
That is now false for one rule, and the difference is structural rather than unfinished work.**

**60 sites size a PICTOGRAPH, not text** — emoji, chevrons, ✕ closes, ✓ ticks, bullet dots, zodiac
glyphs, `{icon}` expressions. The ramp is a **type** ramp: its ceiling is `display-lg` 30, so an emoji
at 40/44/52/96 has no target at all, and **§5's X12 and X17 protect several outright** (X17 says pass
2b must not normalise `numerology`'s `fontSize:40, lineHeight:50`; the same pattern appears seven more
times in `readings/index.tsx`, plus `SunSignReveal`'s 52/60).

🔴 **And below the ceiling the mapping is not merely hard, it is UNDEFINED**: at 20 and at 24 the ramp
holds **two steps of equal size** (`text-xl`/`display-sm`, `text-2xl`/`display-md`) and a chevron has
no role that picks between them.

**Mechanism.** Each of the 60 carries an inline `/* GLYPH */` marker; the rule discards marked sites via
the `G()` third-argument filter, alternation ordered most-specific-first. Keyed on a **marker, not a
`file:line` allow-list**, because §0.1's line refs drift ~80 lines per pass.

🟢 **The exception reports itself** — `inline 64 · excepted: GLYPH 60 · (raw, incl. excepted) 124`
print on every run, so a widened exception is visible rather than silent. That is the whole difference
between a scoped exception and a disarmed rule (§3.0.2.0).

**Revisit at:** the §9 primitives phase. The honest long-term fix is a named `glyph(px)` helper in
`theme.js` — the same move 1b made with `alpha()`, giving an inline-only concept one spelling — which
would drive the raw count to 0 **and** make a mechanical `txt()` conversion structurally unable to
swallow a glyph. Not done here because inventing token API is outside a fontSize identity pass.

⚠️ **Standing risk while it is a comment:** a future session doing O-13's ~180 `txt()` conversions must
not convert a `/* GLYPH */` site. The marker is the only thing saying so.

---

### 🟢 THE GLYPH CAVEAT'S STANDING RISK DID NOT MATERIALISE — but only because it was written down (pass 2b, 2026-07-31)

The block above closes with: *"a future session doing O-13's ~180 `txt()` conversions must not convert
a `/* GLYPH */` site. The marker is the only thing saying so."* **That session was pass 2b, one day
later, and the marker did its job**: the conversion script skips any line matching `GLYPH`, and the
excepted count held at exactly **60** across all six batches.

Worth recording as a **method** result, not just an outcome: the protection was a *comment plus a
caveat entry*, with no gate able to enforce it — and it held because the caveat named the future
session and the exact mistake. That is the same shape as CLAUDE.md's `on-accent` rule.

---

### 🔴 `no-numeric-fontsize`'s FLOOR IS 67, NOT 60 — 7 ABOVE-CEILING sites join the glyphs (pass 2b, 2026-07-31)

The glyph caveat above says the rule cannot reach 0. **It also cannot reach 60.** Pass 2b drove the
unexcepted `inline` count from 64 down to **7**, and those 7 are permanent-until-ruled, not pending:

`verify-email.tsx` **32** ("Verify Your Email") · `app/index.tsx` **32** ("Revelia") ·
`combined.tsx` **36 ×2** (decorative `"` marks) · `combined.tsx` **40** (`lifePathNumber`) ·
`compatibility/index.tsx` `styles.fallbackIcon` **40** · `face-capture.tsx` `styles.countdownText` **96**

**They sit ABOVE the ramp ceiling** (`display-lg` 30), so there is no step to move them to. They are
the inline half of the same question as the 30 live `text-4xl`/`5xl`/`6xl` classNames, which pass 2a
froze in the config for exactly this reason: retiring type that has no target is a **per-site VALUE
decision in its own reviewed commit**, not something that rides a leading pass.

⚠️ **Two of the seven look like glyphs** — the `"` marks and `fallbackIcon` — and marking them would
drop the visible count to 4. **Deliberately not done.** Widening a scoped exception to improve a
number is precisely the disarming move §3.0.2.0 describes; the `/* GLYPH */` marker records a
judgement made *at the site*, and retro-fitting it to tidy a report would turn a reasoned exception
into a habit. They stay visible until someone rules on them.

**So the gate's own line now reads `inline 7 · excepted: GLYPH 60 · raw 67`, and every one of the 67
has a named reason.** `GATE_STRICT=1` needs both floors in its allow-list before the pre-push hook
can block — see `codemod-plan.md` §4.6's named-floors table, which now also carries
`no-raw-hex`'s ~12 (`BirthChartWheel`, until §11.4).

---

### 🔴 A FIFTH BLINDNESS CLASS — 15 TYPE SIZES THAT NO COUNT IN THE PLAN HAS EVER SEEN (pass 2b, 2026-07-31)

Full record: **`O-29`** in `codemod-plan.md` §12. Registered here because it is a standing limitation
of the instrument, not a task.

`no-numeric-fontsize` greps `fontSize:` followed by a **digit**, so `fontSize: cfg.emoji` is invisible
to it. **15 sites** were found this way, and **none had ever appeared in any figure in the plan** —
not the 346 pass-0 baseline, not 2a's 341, not the 124 residual. They were never skipped; they were
never seen.

🔴 **The shape is what makes it recur:** all 15 live in per-size lookup tables that **mix TYPE with
DIMENSION** — `{ height: 28, paddingHorizontal: 10, emoji: 14, number: 13, label: 11 }`. At the
literal the property is named `emoji`/`number`/`label`, so it reads as a dimension to a human *and*
is unreachable to a grep keyed on `fontSize:`. And they cluster in `Button` (X3), `StreakBadge` (X11)
and `AstroNumeroBadge` (X12) **because** those tables exist to hold the iOS explicit-dimension
guards — the register's own defence mechanism is what hid the type.

**Status:** `no-variable-fontsize` added to `token-gate.sh` as a **REPORT-ONLY watchlist** (it can
never be a decreasing counter — `fontSize: <expression>` is a legal idiom). `Button`'s 4 converted.
**`StreakBadge` ×3 and `AstroNumeroBadge` ×8 deliberately deferred**: their tables interleave glyph
sizes with numerals and labels so each entry needs its own role call, and §6.6.2 measures
`StreakBadge` small at **6.0px of headroom — the tightest surface in the entire X register**, which
§5.3 says needs an iOS build this repo cannot produce.

**Revisit at:** the §9 primitives phase, or the first iOS device pass, whichever comes first.
**Baseline to watch: 11.** A rise means someone introduced a new indirected type size.

---

## 🆕 PASS 4 (fonts + weight→family) — five caveats accepted 2026-07-31

*Session `build27.1-pass4-fonts`. Full record: `codemod-plan.md` §1.7's DONE banner and §12's
`O-30`…`O-34`. Numbers here are MEASURED from the shipped font files, not recalled.*

### 🧹 C-P4-1 — Literata's display steps have NEGATIVE leading, so ink can extend past the line box

Measured default line height (`hheaAsc − hheaDesc + gap`, per em) from the files now in
`mobile/assets/fonts/`: **Roboto 1.1719 · Figtree 1.2000 · Literata 1.4850**. Against the ramp's
baked values that leaves Literata's three display steps asking for more box than they get:

| step | size / lineHeight | Literata wants | leading | ink beyond the box |
|---|---|---|---|---|
| `display-lg` | 30 / 34 | 44.55 | **−10.55** | ≈5.3px above and below |
| `display-md` | 24 / 29 | 35.64 | **−6.64** | ≈3.3px |
| `display-sm` | 20 / 25 | 29.70 | **−4.70** | ≈2.4px |
| `text-2xl` (Figtree) | 24 / 28 | 28.80 | −0.80 | ≈0.4px |

🟢 **Layout is unaffected** — both platforms force the paragraph to `lineHeight × lines` and
deliberately let glyphs draw outside the box (Android's `CustomLineHeightSpan` says so in a comment).
Cap height is 0.700 em = 21px at `display-lg`, comfortably inside the effective ascent, so English
display copy is safe; **accented capitals are the exposure**, as is any ancestor with
`overflow: 'hidden'`.

🔴 **THE TWO-LINE CASE, MEASURED FROM REAL GLYPH INK (owner ruling 2026-07-31) — real but bounded.**
The 1.4850 figure above is the font's *declared* ascent+descent, which reserves room for accents. The
actual glyph extents are what decide a collision: capitals reach **+0.715 em**, lowercase **+0.782**,
deepest descenders **−0.230** — **but accented capitals reach +0.970 em.** Line-2-tallest-ink vs
line-1-lowest-ink:

| step | typical capitals | accented capitals |
|---|---|---|
| `display-lg` | **+5.65px clear** | 🔴 **−2.00px COLLIDES** |
| `display-md` | +6.32px clear | 🟠 +0.20px TIGHT |
| `display-sm` | +6.10px clear | 🟠 +1.00px TIGHT |

🟢 **So an ordinary English two-line display heading does NOT collide.** It needs line 2 to begin
with an accented capital while line 1 ends in a descender — i.e. `C-P4-2`'s surface: user names and
LLM-generated themes.

**WHICH SITES CAN EVEN REACH TWO LINES — all 35 display sites measured at 360dp and 320dp** (advance
widths from Literata-Bold; available width = screen minus that site's own horizontal padding):

- **23 fit on one line at both widths.**
- 🔴 **8 literal-content sites wrap.** At **both** widths: `(paywall)/index.tsx:104` "Unlock Your Full
  Destiny" (372px into 312), `compatibility/index.tsx:139` (335px), `SunSignReveal.tsx:79` (301px into
  264). At **320dp only**: `BiometricConsent.tsx:148`, `ErrorBoundary.tsx:55`,
  `GeneratingReading.tsx:374`, `CaptureInfoModal.tsx:113`, `LockedSection.tsx:168`.
- ⚠️ **12 sites are unbounded** — 3 LLM themes, 2 user names, 3 rules-table archetype/palm names,
  server section titles, 2 lucky values (plus 2 that are emoji and therefore not Literata at all).

**If the device read says it is tight, the arithmetic is closed: `theme.type` display lineHeights
38 / 31 / 26** put accented capitals at **+2.00 / +2.20 / +2.00** and clear every case, costing
4 / 2 / 1px more leading on the app's largest type.

▶ **ON CUT 2's CAPTURE LIST EXPLICITLY: check every `display-*` heading for clipped ascenders and for
collision with the element above — starting with the three that wrap at 360dp.**

**Why it is not fixed:** raising a step's `lineHeight` is a **2b-class VALUE decision** and 2b has
shipped. If the display headings read cramped on device the fix is `theme.type`'s three display
lineHeights (38 / 31 / 26 would make every step positive), **not** a per-site override.
**Revisit at:** the pass-4 screenshot read, then the §11 display work in the screens phase.

### ⚠️ C-P4-2 — **PM-VISIBLE:** a Hindi or Tamil name renders lighter than an English one

🔴 **PLAIN LANGUAGE FIRST, because this is a quality difference correlated with LANGUAGE, in our
primary market, and it should not be buried in a technical note.** After pass 4, if a user's name is
written in Devanagari, Tamil, Telugu or Bengali, it displays **correctly but not bold** — while the
same heading shows an English name in semibold or bold. Nothing is broken, nothing is unreadable; a
name in an Indian script just looks a little lighter than a name in Latin script on the same screen.

**Why, in one line:** Literata and Figtree are Latin faces. Before this pass, "bold" was a *weight*
that the phone's own Hindi/Tamil font could honour. After it, "bold" is the *name of a font file*, and
the phone's fallback font has no way to honour a name it does not have.

**The technical detail, for whoever picks this up:**

- The script itself renders correctly — Android's Minikin and iOS's CoreText both fall back per glyph
  run, so the text appears in the platform's Noto/system script font.
- Mixed-face rendering on one line (Latin in Figtree, Devanagari in Noto) is the normal behaviour of
  every RN app shipping a Latin-only face, and is **acceptable**.
- **Exposure is narrow and enumerable.** `birth-data.tsx`'s own validator already restricts the
  profile name to `[A-Za-zÀ-ɏ]` and rejects non-Latin outright ("letters only"), so non-Latin can
  only arrive via **signup**, **UpdateNameModal** and the **compatibility partner name / birthplace**
  fields — reaching ~10 display sites (`home.tsx` greeting, `profile.tsx` ×3,
  `name-destiny.tsx` ×2, `combined.tsx`, the compatibility screens) plus every `TextInput` value.
- 🔴 **It is also the same surface as `C-P4-1`'s collision case:** accented and non-Latin glyphs are
  exactly where a two-line `display-lg` heading's ink can touch. One exposure, two symptoms.

🟢 **THE EXIT IS BOUNDED, and that is worth writing down so nobody treats this as a dead end.**
**Noto Sans Devanagari is SIL OFL**, like both shipped faces. If it ever matters, the fix is **a sixth
TTF and a family assignment on those ~10 sites** — not a re-architecture. What was rejected was the
*unbounded* version: exempting user-content Text nodes from the family altogether, which trades one
visible inconsistency for a larger one and requires identifying a set nobody can enumerate.

**Accepted for 2.1.0. Revisit if/when the Indian-language share of signups makes it visible.**

### ❌ C-P4-3 — **RECLASSIFIED, NOT ACCEPTED.** ▲ ▼ ● are not in Figtree → convert to Ionicons

🔴 **OWNER RULING 2026-07-31: this is NOT a caveat. It is a primitives-phase work item, and the
precedent is already set twice — the 🔒 lock glyph, and the Stage-1 rejection of text glyphs in the
tab bar.** A glyph that renders differently per OEM is the thing those two decisions were about.

▲ / ▼ (`U+25B2/25BC`) are absent from **Figtree**; ● (`U+25CF`) is absent from **both** faces. All six
live sites sit on Figtree Texts, so they resolve through the platform's symbol-font fallback. Five are
**disclosure toggles** (`birth-data.tsx:377`, `astrology/index.tsx:85` and `:125`,
`readings/face.tsx:69`, `readings/palm.tsx:73`); one is a **pagination dot**
(`cosmic-report.tsx:701`). Those are **functional iconography, not typography.**

**Straight swaps, and Ionicons is already a dependency:** `chevron-up`/`chevron-down` for the five
toggles — the design's own disclosure idiom — and `ellipse` for the dot.

⚠️ **It is not done in pass 4 because it changes the ELEMENT, not the style**, and four of the six
carry a `/* GLYPH */` marker whose entire purpose is that a codemod leaves them alone. ▶ **Tracked as
item 5 of `codemod-plan.md` §9.1.** 🟢 The arrival check is free: `no-numeric-fontsize`'s excepted
count falls from **60** when the markers go with the glyphs.

### ⚠️ C-P4-4 — three display sites go one weight rank LIGHTER, and it cannot be avoided

Five inline sites sat on a `display-*` step **and** carried an explicit weight; three of those were
`800`. **Literata-Bold is 700 and no ExtraBold ships**, so those three render one rank lighter than
authored (`combined.tsx:227`, `combined.tsx:243`, `cosmic-report.tsx:463`). The ramp's family is the
contract (§3.3), and adding a sixth face for three sites is not a trade worth making.
Symmetrically, the **8 `font-medium` className sites go one rank UP** (500 has no shipped face; the
alternative was dropping them into Regular, which would de-emphasise a field label).

### ⚠️ C-P4-5 — the className half of P23 is still frozen, and pass 4 is when it starts to matter

Pass 2b landed the inline opt-ins (158 `txt()` spreads + 70 JSX props, `MISSING 0`). A
`<Text className="text-sm">` carries no props, so **every className-typed reading-copy site now
follows the global default and does not scale.** This is inherent to option (a) and design §3.6 calls
it "the honest cost" — but before pass 4 it was theoretical, and now it is live.
🔴 **The one-line escape hatch is deliberate:** `FREEZE_FONT_SCALING` in `mobile/lib/textDefaults.ts`
is a separate constant from the family default precisely so §1.7's named fallback ("drop the global
freeze from 2.1.0, keep today's behaviour") costs one token and does **not** cost the font family.
**Revisit at:** the pass-4 device check — read a reading screen at the OS's largest font setting.

---

## 🆕 PASS 5 (the Vellum flip + display leading) — four caveats accepted 2026-07-31 (`build27.1-pass5-vellum`)

### `C-P5-1` — 🔴 **`fg`-on-accent-fill is now a QUIETER failure, not a smaller one, and that makes cut 2 harder**

**Measured post-flip.** Vellum's grounds are lighter and its `fg` is warmer, so every A5 pairing
improved *slightly* and not one of them became legal:

| ground | held: `fg` `#FFFFFF` | **Vellum: `fg` `#F4EFE9`** | legal (`on-accent`) |
|---|---|---|---|
| `accent` | 2.15 | **3.06** | 6.86 |
| `accent-2` | 2.64 | **3.80** | 8.08 |
| `success` | 2.54 | **3.05** | 6.90 |
| `danger` | 3.76 | **3.26** | 5.60 |
| `warning` | 2.15 | **2.92** | 8.20 |

🔴 **The consequence is counter-intuitive and it is the caveat: white-on-gold at 2.15:1 was *offensive*
to look at, and near-white-on-clay at 3.06:1 merely looks a bit soft.** A missed A5 site is therefore
**less likely to be caught by eye at cut 2 than it would have been on the held palette.** The seventh
violation will not announce itself.
🟢 **Which is the argument for `CLAUDE.md`'s prose rule over a device read, not against it** —
`no-white-on-accent` stays permanently report-only (§3.0.2.1) and the enforcement stays in the file
every session reads. **Revisit at:** cut 2, deliberately rather than reactively — and every screens-phase
batch that adds a fill.

### `C-P5-2` — ⚠️ **The `on-accent` ledger is SHORT by ~28 sites. Every one of them is correct.**

Pass 5 measured **73 `on-accent` code sites**; `held-collision-ledger.md` ENTRY 5 + ENTRY 6 name ~45.
Every one of the 73 was read individually and sits on a genuine accent-family FILL, so **nothing was
over-applied and the invisible-text error direction does not occur.** The ~28 arrived through the
C-batch className renames, the STATE-BORDER ruling's four `name-destiny` labels, and per-site A5 fixes
made *correctly* in batches that ran after ENTRY 5 was written.

🔴 **The caveat is about the instrument, not the code: a ledger is a record of DECISIONS, not an index
of SITES, and the two drift apart the moment a later batch does the right thing without appending.**
So the ledger cannot be used as a completeness check on its own — the measured set is the authority.
**Revisit at:** the screens phase, which will add more `on-accent` sites; append or accept that the
ledger is reasoning-only. Recorded in ENTRY 7.

### `C-P5-3` — ⚠️ **19 className sites name a family one rank LIGHTER than their ramp step's default**

`family-arrival-check.js`'s className half reports **19** `text-xl font-body-semi` sites (welcome ×1,
monthly ×5, weekly ×2, compat/index ×1, profile ×7, DestinyCard ×2, StrengthsList ×1). `text-xl`'s ramp
family is `body-bold`; these render **SemiBold**.

🟢 **Not a defect and deliberately NOT failed.** Every one was `text-xl font-semibold` on `main`, so
pass 4 translated them faithfully, and the ramp's family column is a step **DEFAULT**, not a
prohibition — RULE R's own "REPLACE with the weight's family" branch does exactly this for 38 `text-sm`
sites. Failing on them returned **19 hits on correct code**, which is §3.0.2.0's OVER-finding mode: a
rule that cries wolf is a decommissioned rule.
⚠️ **But it IS design drift**, and the screens phase should decide once whether a 20px section heading
is Bold (ramp) or SemiBold (as authored) — not per file. **Revisit at:** the screens phase. The number
is a watchlist; a RISE means someone introduced a new one.

### `C-P5-4` — 🟢 **COLOUR HALF CLOSED 2026-08-03. The ARTWORK half is still open.**

> ⚠️ **ID COLLISION, flagged not renumbered.** A second `C-P5-4` exists further down this file (the
> primitives-phase batch-5 entry, *"design §2.2's A5 table is wrong on the destructive row"*), and
> `owner-actions.md`'s **`P57` references THAT one.** Renumbering either breaks an inbound reference.
> **This entry is the `app.json` one.** Whoever next touches the register should disambiguate; the
> collision is recorded here so it is not discovered a third time.

**AS ORIGINALLY WRITTEN.** `splash.backgroundColor` (the old near-black purple) and
`android.adaptiveIcon.backgroundColor` (the old deep violet) are **OS surfaces painted before any JS
runs**. No token reaches them and `no-raw-hex` is structurally blind to both (codemod-plan §1.3) —
`app.json` is not under `$SRC` (`app components lib store services hooks utils types`) and is not a
directory the greps walk. Pass 5 changed neither.

🔴 **The visible symptom was: the native splash old-purple, the JS loading screen behind it Vellum,
and the app CROSS-FADING between two palettes on first paint.** Before pass 5 the two matched, which
is why this was theoretical and became live at the flip. The seam is documented at the site
(`app/index.tsx`, the `target === null` branch).

#### 🟢 THE COLOUR HALF IS CLOSED — both literals are now the palette's own `bg`

**Both keys now carry `bg`** — the same value `app/index.tsx`'s loading screen already paints, so
**the cross-fade is gone.** This was a two-literal edit with no artwork involved, which is precisely
why it could land ahead of `P18a`: the *ground* the OS paints is a colour decision the palette already
made, and it does not wait on a mark.

⚠️ **`adaptiveIcon.backgroundColor` is currently INERT and the fix is still correct.** Measured: the
file behind `foregroundImage` is **100% opaque across all 1600×1600 pixels**, so the background colour
is never visible on any launcher today. It becomes load-bearing the moment the foreground gains the
transparency the format requires — see the artwork half. **Setting it now means the artwork fix does
not also have to remember this.**

#### 🟢 THE GEOMETRY HALF OF THE ARTWORK IS CLOSED TOO — 2026-08-04. The COLOUR half is still `P70`.

**`app.json` now points `icon` at `assets/icon.png` and `android.adaptiveIcon.foregroundImage` at
`assets/adaptive-icon.png`, and both are GENERATED, committed and re-runnable:**

```
node scripts/check-brand-assets.js --emit
```

🔴 **The defect this closes is GEOMETRIC and had nothing to do with the palette.** One file served
both keys, and the two rule sets are **mutually exclusive by construction** — `icon` must be OPAQUE
and full-bleed, `foregroundImage` must be TRANSPARENT with content inside the centre 66%. So the
shipped 2.0.0 foreground layer was 100% opaque at 100% of its canvas, and **every circular launcher
mask cropped 65.8% of the artwork** (34.2% of the area survives; 34.0% of the width goes along each
centreline, 53.3% along each diagonal). **A zodiac RING is the worst possible shape for that**, because
its outer ring is exactly what the corners lose. Live on Android home screens today.

**Measured, and the ink-vs-alpha distinction is why `safe-zone-66` read 100%:** `logo.png` is
1600×1600, colour type 6 — an alpha channel **is present** but **100% of pixels are opaque**, so an
alpha bbox is the whole canvas *by definition* and measures the GROUND, not the drawing. The **INK
bbox** (by hue, the same `INK_ARC` the separability report uses) is **1560×1497 at (21,58) = 97.5% of
width**. The adaptive layer crops the square 1560×1560 centred on that ink and scales it to 676×676 —
the safe-zone side **derived from the assertion's own formula**, never re-typed as "66% of 1024".

🔴 **GEOMETRY ONLY — NO PIXEL WAS REMAPPED, and that boundary is enforced by what the code does:**
`icon.png` **composites** over the brand ground rather than replacing anything (a **measured no-op**
at 0 px on an opaque source, written anyway because it becomes load-bearing the moment the artwork
gains alpha); `adaptive-icon.png` **crops**, and cropping is geometry — whatever ground sits *inside*
the box is carried through untouched and only the area *outside* becomes transparent.

🟢 **AND THAT TRANSPARENCY IS WHAT FINALLY MAKES `adaptiveIcon.backgroundColor` LIVE.** The colour half
above recorded it as INERT because the layer in front of it was fully opaque. It is 56.4% clear now.
**The two halves of `P18a` met without either having to know about the other.**

**All nine format assertions across the four `app.json` targets now PASS, so the checker went green by
being SATISFIED — which is the precondition its own footer named — and it is therefore WIRED INTO
`npm run gate` in the same commit** (the 23rd named rule, and the first that looks at a **binary**:
`no-raw-hex` cannot see a PNG and `app.json` is outside `$SRC` and outside both content globs).

⚠️ **`logo.png` is KEPT** — it is the source `--emit` re-runs against — and is now unreferenced, so
~3.1 MB rides the AAB as orphan weight (`assetBundlePatterns` is `**/*`). Deleting it is the owner's
call. ⚠️ **PNG filtering was measured and NOT taken:** per-row adaptive filters would take the pair
from 2.00 MB to 1.70 MB (−14%), which does not pay for a determinism surface in a script that must not
be wrong. Recorded so it is not re-guessed. ⚠️ **`splash.png` and `favicon.png` are UNCHANGED** — the
splash already sits on the brand ground and needs no geometry; the favicon is web-only.

#### 🔴 THE COLOUR HALF OF THE ARTWORK IS STILL OPEN, AND THE MEASUREMENT CHANGED WHAT IT IS

`P18a` was scoped as *"recolour the existing mark"* on the premise that the brand files carry the
retired palette as **flat literals**. 🔴 **Measured, they do not — and the premise was inverted:**

| `app.json` key | file | what is actually in it |
|---|---|---|
| `icon` **and** `adaptiveIcon.foregroundImage` | **`assets/logo.png`** (one file, both keys) | 1600×1600 · **85,802 distinct RGBA** · amber line-art medallion on a **purple GRADIENT** ground · **zero** occurrences of any retired literal |
| `splash.image` | `assets/splash.png` | 2732×2732 · **271,806 distinct RGBA** · same medallion + a partial-alpha purple diagonal glow · **zero** retired literals |
| `web.favicon` | `assets/favicon.png` | 48×48 · flat **retired literals present** — but web-only, reaches no shipped app |
| *(unreferenced)* | `assets/icon.png` ≡ `assets/adaptive-icon.png` | byte-identical placeholders, flat retired literals, and a **bare "R" — a DIFFERENT mark from the live medallion** |

🔴 **So a per-literal channel map — the instrument `P18a` specified — is a measured NO-OP on both live
native assets.** It matches only the web favicon and two orphans. The live mark is continuous-tone
artwork; there is no literal to substitute.

🟢 **But the mark is NOT inseparable from purple, and that is the finding that keeps `P18a` a re-skin
rather than a rebrand.** The two colour populations are cleanly separable by hue: ink 0–34 (15.4% of
`logo.png`'s saturated pixels) · purple ground 270–315 (77.2%) · a 7.3% antialias band between them,
and an empty valley of **235° in `logo.png` and 230° in `splash.png`**. The line art — zodiac ring,
open palm, filigree, `R` monogram — survives the separation intact.

> ⚠️ **CORRECTED: that valley was first published in this file as "240°", read off 15° buckets by
> eye.** Measured by `scripts/check-brand-assets.js` it is **235 / 230**, and it is stated per-file
> because the two files genuinely differ. One rounded number covering both is the shape of error
> `O-66` names for contrast ratios — a single published figure read as if it covered every case.
> **Re-derive it from the script; do not quote it from a commit body.** The conclusion is unchanged:
> anything above 180° means the populations cannot be confused.

**What is open is therefore a RULING, not artwork:** a hue-population remap preserves the drawing
exactly but is a *different algorithm* from the one specified, and its role→token table (where the
purple ground goes, what becomes of the splash glow) contains choices nobody has made. **Registered as
`P70`.** ⚠️ **Do not read "the literal map is a no-op" as "the assets cannot be recoloured"** — they
can, mechanically and with no new dependency; what is missing is the owner's sign-off on the table.

✅ **Three pre-existing FORMAT defects were surfaced by the same measurement and none was caused by the
recolour question — ALL THREE ARE CLOSED as of 2026-08-04, by geometry alone.** They had been live on
the shipped 2.0.0 icon: `foregroundImage` had **no transparency** and its content filled **100%** of the
canvas rather than the centre 66% launchers require (so every circular/squircle mask cropped the
medallion's ring), and `icon` was **1600×1600** rather than 1024×1024. 🔴 **That they were fixable
without any colour decision is the whole point** — the recolour they were bundled with is still open, and
a colour-only fix would have left all three shipping. See the geometry-half block above.

#### ✅ `P70` IS CLOSED AND IT RESOLVED TO NOTHING — 2026-08-04

Written out, the missing role→token table is **two rows and both were already decided**: the **INK**
stays (it is already amber line art — measured hue 21–24 on the opaque population, i.e. already the
accent family), and the **GROUND** is `bg` `#100E0D`, set in **`7787636`**. 🔴 **The premise that made
`P70` a ruling was that "where the purple ground goes" was unmade. It was made in the colour half, and
nobody noticed it closed this too** — because the ground is not a colour inside the artwork, it is a
key in `app.json`.

🟢 **AND THAT IS WHY THE SPLASH NEEDED NOTHING.** Decoded 2026-08-04: 2732×2732 RGBA, **51.43% fully
clear**, and **every one of its 1,516,952 fully-opaque pixels is INK — ZERO opaque ground-hue pixels.**
The purple is a translucent corner glow (25.99% of canvas, mean alpha 65/255, **peak 175, never
opaque**, top-right at a 26:1 ratio over bottom-left), compositing over `#100E0D` to
`#12040F`…`#725A6A`. **`splash.backgroundColor` already IS the ground.** Now asserted permanently by
`no-baked-ground` in `check-brand-assets.js` — **splash only**, because `icon` must be opaque by
necessity and the two icons' baked grounds are a standing owner ruling (809,145 and 347,553 opaque
ground-hue px), not an omission.

⚠️ **The remaining glow is retired-palette DECORATION, not a ground.** Removing it changes the artwork
rather than fixing an alpha bug, so it rides the new splash asset — which is now a **design refresh**,
not a defect fix.

**Revisit at:** cut 3. **Nothing in `C-P5-4` or `P70` is open. What remains of `P18a` is one piece of
artwork a person has to draw**, and the favicon is closed as out of scope (web-only; Android-first,
iOS paused).

---

## 🆕 PASS 3a (spacing · IDENTITY) — three caveats accepted 2026-08-01 (`build27.1-pass3-radius-spacing`)

### `C-P3a-1` — ⚠️ **12 of the 18 hand-typed `24`s were deliberately LEFT, and the reason is a collision**

Design §4.2 names `screen-x` (24) and `screen-y` (32) *"so the next screen does not re-type 24"*, and
§1.6's 3a row says to point the hand-rolled padding at them *"wherever it recurs."* 🔴 **Measured, the
recurrence is mostly NOT the gutter: 12 of the 18 sites are a component's own padding** — 4 ×
`unlockButton`, `BiometricConsent` ×2, `LockedSection`, `ShareCard` (a **W1** share surface, §7.3),
`GeneratingReading`, and `TimezonePicker` ×3 (the picker's own gutter, not the screen's).

**Only the 6 genuine gutter sites + 2 vertical were migrated.** The 12 keep their literal `24`, with
the named reason *"a component's own 24 is the step-6 spacing token, not the gutter."*

🔴 **WHY THIS IS A CAVEAT AND NOT A CHOICE: `screen-x` and `space-6` BOTH resolve to 24, so the
identity gate cannot tell a right assignment from a wrong one** — it is §3.0.2.2's held-value
collision, arriving in `space` instead of `color` for the first time (now the table's sixth entry, and
`screen-y` = `space-8` = 32 is a seventh of the same shape). A mechanical sweep would have mis-roled
two thirds of them and **every gate would have read green.** They diverge the first time anyone
retunes the screen gutter — which is the entire reason the token was named.
**Revisit at:** the screens phase, or the first time the gutter changes. The reasoning is recorded at
the canonical site in `ScreenContainer.tsx`, not only here.

### `C-P3a-2` — 🔴 **`O-39`: design §4.3's "five spacing outliers" are DIMENSIONS. They stay.**

All 13 live usages are `w-`/`h-` — explicit dimensions that resolve *through* the spacing scale
because Tailwind's `width`/`height` merge `theme.spacing`. The authoring vocabulary tops out at
**48dp** and these are **56 / 128 / 192 / 256**, so §4.3's "nearest authoring step" is −8px / −80px /
−144px / −208px. The 192×192 case would make a container **smaller than the 60px glyph inside it**.

**Marked in-file at all 7 sites** with the `ABOVE-CEILING` idiom pass 5 established, because §4.3 read
alone instructs a future session to migrate them. Full reasoning: `O-39`.
**Revisit at:** the §9 primitives phase, and only as *"should `theme.js` have a `dimension` scale?"* —
never as an outlier migration. **Consequence: pass 3a moved zero pixels.**

### `C-P3a-3` — 🔴 **`--diff` CAUGHT TWO COMMENT-HARVESTED RULES, AND BOTH WORDS WERE ORDINARY PROSE**

`CLAUDE.md`'s "A COMMENT IS SOURCE" has now fired **seven** times. Instances 6 and 7 both landed in
this pass, in comments written **by the session documenting the hazard**, and neither word is
class-like or literal-like: one means *"change the size of"*, one means *"reduce"*. Both are bare
Tailwind utility names, so the content scanner emitted **two live rules with zero call sites**, moving
the resolved count 202 → 203 each time. `tsc` clean, all 18 greps clean, the app renders identically.

⚠️ **The test therefore widens, permanently: not "would a named gate rule match this line?" but "is
any WORD in this sentence also a bare utility name?"** — `resize`, `truncate`, `italic`, `underline`,
`uppercase`, `hidden`, `visible`, `static`, `fixed`, `absolute`, `relative`, `sticky`, `isolate`,
`container`, `border`, `rounded`, `shadow`, `blur`, `filter`, `transform`, `transition`, `grayscale`,
`invert`, `ordinal`, `overline`, `capitalize`, `antialiased`.

🔴 **AND ONE HALF OF IT IS INVISIBLE TO `--diff`.** Naming a LIVE class in prose emits nothing new, so
`--diff` stays at 0 — but it still inflates that utility's census. Measured: mentioning the flex-gap
utility 4 times in two comments took its count from **9 to 13**. Only a census catches that half.
**Revisit at:** never — this is a standing authoring rule. `--diff` on every batch is the instrument.

---

## 🆕 PASS 3b (radius · VALUE · LOSSY) — two caveats accepted 2026-08-01 (`build27.1-pass3-radius-spacing`)

### `C-P3b-1` — 🔴 **§4.4's `absorbs` COLUMN IS NON-NORMATIVE AND MUST BE DELETED, NOT JUST MARKED**

`O-40`. Design §4.4 held two columns that disagreed — `absorbs` (value-driven, "16 → the 14px key")
and `use` (role-driven, "`Card` → 20") — with nothing saying which won. It produced **three**
collisions before anyone noticed it was ambiguous rather than wrong.

**Ruled: `use` is normative, `absorbs` is descriptive.** `absorbs` is now marked non-normative in
§4.4, **and it is retained rather than deleted for exactly one reason**: §4.4 is the reference for
BUILDING `Card` / `SectionCard` / `LockShell` in the §11 primitives phase, and a reader who hits the
disagreement *there* gets no diff to read. So the risk is deferred, not removed.
🔴 **DELETE the column once the primitives phase is done with it.** It answers *"which key does this
legacy value land near?"* — a question that stops being askable the moment no legacy value remains,
which is now.
**Revisit at:** the end of the §11 primitives phase. Until then the marking is the whole control.

### `C-P3b-2` — ⚠️ **`xl` 28 ON THE THREE SHARE SURFACES READS TIGHTER IN THE EXPORT THAN IN THE APP**

§4.4 puts `ShareCard` on the 28px step and pass 3b applied it. But the three share surfaces render
**twice at very different scales**: in-app at ~360dp, and through `react-native-view-shot` at
**1080×1080 / 1080×1920** with type scaled ~5.8×. A 28px corner is roughly **8%** of a 360dp preview
and roughly **2.6%** of a 1080px export, because **the radius does not scale with the canvas.**

**Not a reason to deviate from §4.4** — the in-app rendering is the one a user judges the app by, and
a per-surface radius exception is the drift the token system removes. But the exported card is the
app's main organic-growth artefact, so the corner is worth one look.
**Revisit at:** **cut 3**, alongside **O-4 / W1** (SVG `RadialGradient` inside `view-shot` on
Android). Both are properties of the same export path and **one build answers both** — that pairing is
the reason this is a caveat rather than a blocker.

---

## 🆕 PRIMITIVES PHASE, BATCH 5 (items 9–10 · 14 · 15 · 18–19) — accepted 2026-08-04 (`build27.1-primitives-05-share-plates`)

### 🔴 `C-P5-2` — **A SHIPPED CONTENT-LEAK DEFECT, CLOSED BY THIS PHASE. Recorded so nobody re-adds it.**

> **CLASS: shipped defect, not a caveat. It is filed here because this register is the only durable
> place a *closed* defect's MECHANISM survives, and the mechanism is what would bring it back.**

**`expo-blur` HAS NEVER BLURRED ANYTHING ON ANDROID IN THIS APP.** Measured in the installed
`expo-blur@14.1.5`, not recalled:

1. `experimentalBlurMethod` defaults to `'none'` (`src/BlurView.tsx`);
2. on that path `ExpoBlurView` calls **`setBlurEnabled(false)`** and paints `tint.toBlurEffect()` as a
   **flat background**;
3. with no `tint` prop the Android branch is `TintStyle.DEFAULT` — **white at `255 × (radius/100) ×
   0.44`**, i.e. alpha 22 = **8.6%** at intensity 20.

🔴 **A white 8.6% sheet leaves the text under it READABLE. So the four card lock overlays were not
locking anything — they were leaking withheld premium content to free users on Android.** That is a
**monetisation defect**, not a styling one, and it is a *worse* member of the same class as B1's
decorative locks: `LockedSection` never rendered the withheld content at all, while `BlurView`
**renders it and relies on obscuring that never happened.**

🟢 **CLOSED at item 13** — the four overlays merged onto `LockShell` density 3, which grounds
**opaquely** in the `locked` token. `GrowthCard`'s lock label, which used the on-fill role over that
non-existent blur at **1.25:1**, was fixed by the same merge.

> ### 🔴 THE RULE THIS LEAVES BEHIND
> **DO NOT ADD A `BlurView` LOCK IN THE SCREENS PHASE OR EVER.** Blur is not a lock signal on Android
> because there is no blur; and per `C-P5-3` it cannot be *chrome* there either. A lock must ground
> **opaquely**. `LockShell` is the only legal lock treatment and its plate is opaque by construction.
> ⚠️ Turning the real method on is **`P52`** and the default answer is **NO** — it is a per-frame
> capture of the root view, and `O-46` already has a per-frame Android cost open as a **memory**
> question (a view-sized bitmap per mounted screen, no cache key).

**Revisit at:** never as a defect. **As a rule, at every lock surface in the screens phase.**

### ⚠️ `C-P5-3` — **DESIGN §4.2's PRESERVATION ARGUMENT AND THE STAGE-1 BLUR-AS-LOCK RULING BOTH REST ON A FALSE PREMISE ON ANDROID**

Both say, in substance, *"the meaning users already learned — blurred = paywalled — is preserved rather
than diluted."* 🔴 **On Android users never learned it, because it never rendered.** The premise is
false on the platform this app actually ships to.

🟢 **THE CONCLUSION SURVIVES AND HOLDS HARDER.** §4.2 confines blur to LockShell density 1 and forbids
it everywhere else. Read against `C-P5-2` the reason is stronger than the one given: **blur is
unusable on Android, so it cannot be a lock signal there — and it cannot be decorative chrome there
either.** A treatment that renders as a flat 8.6% white wash is not a treatment. The one thing that
would be wrong is to *widen* blur on the strength of the original wording.

**Revisit at:** the design doc carries this note inline at §4.2 (same commit). Nothing in code changes.

### ⚠️ `C-P5-4` — **DESIGN §2.2's A5 TABLE IS WRONG ON THE DESTRUCTIVE ROW: 4.86:1, NOT 5.60:1**

Measured with a calculator first calibrated against **eleven** published figures, all of which it
reproduces exactly (the whole `16.84 / 10.38 / 5.36 / 3.30 / 7.30 / 8.59 / 7.31 / 8.75 / 5.17` column,
plus muted-on-overlay `4.43` and danger-on-overlay `4.28`). On that calculator the other four A5 rows
are exact or round (`accent` 6.86 exact, `warning` 8.23 vs 8.20, `success` 6.88 vs 6.90, `accent-2`
8.08 exact). **`on-accent` on `danger` is 4.86:1. The published 5.60 is off by 0.74.**

🟢 **THE CONCLUSION HOLDS — 4.86 clears AA — so §2.1's resolution for the prohibition is correct and
nothing needs re-deciding.** ⚠️ **What is wrong is the MARGIN: 0.36, not 1.10.** It is by far the
tightest of the five A5 pairings (the next is 6.86) while the document makes it read as the most
comfortable — on a control whose history is **three ever-quieter near-misses** (4.83 → 3.76 → 3.26).

🔴 **AND §2.2's OWN NOTE DISCOURAGES THE CHECK THAT FINDS IT**: *"the discrepancy matters only if
someone re-derives the ratios and thinks they have found a bug."* Re-deriving the ratios is exactly
what found it. **That sentence should be corrected, not the ratio trusted.**

**Revisit at:** a designer/PM pass on §2.2. **Nothing in code depends on the wrong figure** — the
pairing is pinned mechanically now (`C-P5-6`'s row 2 and item 15's contract).

### ⚠️ `C-P5-5` — **THE WASH GROUNDS ARE A FIFTH SURFACE STEP AND §2's CONTRAST TABLE DOES NOT COVER THEM**

`O-66` one ground over. §2 publishes the label role at **5.36 / 5.11 / 4.81 / 4.43** across the four
**surface** steps. On the two **wash** grounds (`accent-muted` and `accent-2-muted` composited over the
canvas) it measures **4.41:1 and 4.47:1** — **sub-AA, in the same band as §2.1's prohibition at 4.28**.

**Consequence:** any muted copy on a wash-grounded card is a defect the published figures will not warn
you about. Two surfaces already ground on a wash (`AffirmationCard`, `ShareableQuote`) and both are
clean — the quote card's footer was moved up a step at items 9–10 for exactly this reason.
**Revisit at:** the screens phase, whenever a wash ground is used. **A row for the wash grounds belongs
in §2's table.**

### ⚠️ `C-P5-6` — **THREE DESIGN SCOPE CLAIMS ABOUT COMPONENT SHAPE WERE FALSE, AND ACTING ON ONE WOULD HAVE BEEN AN A11Y REGRESSION**

Class 7 three more times, all found by measuring:

| the claim | measured |
|---|---|
| §9 rows 9/10: the share cards are *"off-screen render target(s); excluded from the a11y tree"* | 🔴 **all three render INLINE AND VISIBLE** in the scroll flow — the capture target IS the visible element. **Hiding them would have hidden real copy, including the quote, which appears nowhere else, from screen-reader users.** NOT applied |
| §9 row 15: `Sheet` covers *"4 account modals"* | **four of the five are FULL-SCREEN PAGE SHEETS** with headers and multi-field forms. Migrating one would turn its legal danger-role copy (5.17:1 on the canvas) into §2.1's **4.28:1 prohibition** — i.e. CREATE violations of the rule the component enforces. 2 adopters, not 4 |
| §9.2 / X18: tab icons are *"24dp"* | the installed navigator passes **25** on a regular bar and **18** on a compact one; 24 is its `material` variant, which this bar is not. X18's documented band arithmetic was **off by one** (headroom 10, not 11) |

**Revisit at:** the screens phase owns the four deferred modal migrations. Both corrections are recorded
in-file at their sites.

### ⚠️ `C-P5-7` — **`Sheet` SHIPS AS THE `degraded` STATE, AND FOUR OF ITS SEVEN DESIGNED STATES ARE NOT BUILT**

The approved bottom-sheet library is **not installed**, and `react-native-gesture-handler` has exactly
**one** reference in the tree (the root view) and **zero gestures** — nothing in this app has ever
recognised a pan. §3.1's gate for item 15 pre-authorises the platform-`Modal` degradation, and it is one
of the seven designed states rather than a fallback that was reached for.

**Unbuilt, each with a named debtor:** `dragging` (no gesture exists) · `loading` and `error` (neither
adopter can be in flight or fail; the deferred FORMS can) · 🔴 **`destructive` (NO ADOPTER — §2.1's
resolution lives in `DeleteAccountModal`, and putting the app's most sensitive colour pairing in a code
path nothing exercises is how a pairing drifts).**
⚠️ **The drag handle IS drawn and does not drag** — §4.1 requires the gesture and no-gesture builds to
look identical so adopting the library later is not a visual change. It is hidden from the accessibility
tree, and dismissal has two real affordances beside it.

**Revisit at:** cut 3 (does the degraded sheet feel right?), then a decision on the library.

### ⚠️ `C-P5-8` — **DESCOPE 3 REDUCES THE PLATE SYSTEM TO *ONE* NEW MOUNT**

Intersecting §0.0 rule 5 (funnel screens + Home only) with §14.5's may-list leaves exactly one: `orbits`
on `GeneratingReading`. `lunar`, `constellation` and `tide` are **BUILT AND NOT MOUNTED** (their
surfaces are outside the funnel, and `tide`'s second home is banned from all SVG by W1 regardless of any
mount map). `comet` is also unmounted — **not** for the descope's reason but because §4.2 pre-specifies
dropping it from density 1 if it does not composite under the veil, and that check has not run.

🔴 **THE PAYWALL HEADER IS A DESIGNER GAP, NOT A DESCOPE:** §14.5 says it MAY carry a plate and it is the
funnel's last screen, but §14.3 assigns each of the five to named surfaces and it is not among them.
**Choosing one would be inventing a design assignment.**
⚠️ `TickRule` is likewise built and not mounted: §15.1 puts it under a section eyebrow and **the eyebrow
kicker has zero call sites** (the design lists one, no site passes one, the data has no field).

**Revisit at:** an owner call on widening the mount map, and a designer call on the paywall header.
**If the release wants more visual payoff from §14–§15, this is the lever.**

### ⚠️ `C-P5-10` — **THE SHARE SURFACES HAVE NO RENDER TARGET, SO THE EXPORT IS CAPTURED AT ON-SCREEN WIDTH**

§9 rows 9/10 specify **1080×1080** and **1080×1920** exports, with the quote step *"scaled to 44/60 at
export"*. **No render target exists and never has** — `captureRef` snapshots the visible card at its
on-screen size, so the PNG that leaves the app is roughly a third of the specified resolution and none
of the export-scale type sizes apply. Building one is a render target, not a restyle.
⚠️ Pairs with `C-P3b-2` (the corner reads tighter in the export) — **same path, one build answers both.**
**Revisit at:** with `P51` (the post-release W1 check), which visits this path anyway.

---

## 🆕 THE ALIGNMENT / DEVICE-REVIEW PASS — four caveats accepted 2026-08-04 (`build27.1-alignment-fixes`)

### `C-AL-1` — 🔴 THE LONG-WAIT SCREEN KEEPS ITS FULL-BLEED ACCENT SLAB, ON PURPOSE, AND IT IS THE MOST VISIBLE THING ON THIS LIST

`GeneratingReading` mounts `LinearGradient colors={[accent, bg, bg]}` at two branches, reached from
FIVE flows. §2's `aura` row specifies `accent-muted` → transparent, RADIAL, and states in its own
words that it *"replaces all 21 `LinearGradient` slabs **except** X3's `Button` fill."*

  the specified first stop, composited   `#2C2017`   L 0.0163
  what ships                             `#D98E57`   L 0.3479
  🔴 luminance ratio                     **21.3x**
  the plain foreground on the shipped stop           **2.31:1**

That 2.31 is the same figure that made A5 a token-table rule rather than a hotfix. Nothing sits on
the full-strength band **today** — the layout is centre-justified — so this is a design defect, not
a live AA failure, and any content that moves up there becomes one.

⚠️ **The brief's own figures do not reproduce:** it cites *"clay aura at 0.16, iris at 0.12"*. §2
row 14 is **14%**; row 16 is 12%. The iris figure is right and the clay one is not. Quote §2.

🔴 **NOT RETUNED, DELIBERATELY.** The instruction was to stop for a ruling rather than pick a number,
and §0.0 rule 2 forbids inventing one. **Registered as `P71`.** ⚠️ 25 gradient mounts remain
tree-wide across 16 files against §2's expected ONE — so `P71` is the loudest instance of a larger
un-executed subtraction, not an isolated site.
**Revisit at:** the designer's ruling on `P71`, which should scope the other 24 at the same time.

### `C-AL-2` — THE STREAK PILL SITS FLUSH TO THE PHYSICAL SCREEN EDGE AND HALF OF ITS MECHANISM IS STILL UNBUILT

The device review read this component as misaligned. Measured, **nothing metric regressed**: its
three text nodes are inline-sized with no line height (three of `no-variable-fontsize`'s eleven held
sites), so pass 2b's leading never reached them, and the face swap moved their ink by 0.51–0.77px.
Box-centring already puts same-face ink within 0.01·size of optically centred.

What changed is POSITION: `main` rendered the pill inside the gutter; it now sits
`alignSelf: 'flex-end'` with a negative right margin, flush to the display edge — §10.1.0 mechanism
4(a), deliberate, and half-implemented by its own in-file record, because the CROP the mechanism
actually specifies needs one corner squared and that corner is `cfg.height / 2`, X11's coupled pair.

🔴 **X11 untouched.** Accepted as-is; **registered as `P72`**, which pairs with the existing `P69`(a).
**Revisit at:** the designer's ruling on `P69`(a) / `P72` — one decision covers both.

### `C-AL-3` — `readings/cosmic-report.tsx`'s `case 'loading'` IS THE ONE UNLABELLED LOADER LEFT

Three of the four unlabelled screen loaders migrated onto the loading primitive and gained a message
plus the group progress role. The fourth did not: that file is RESTYLE-ONLY / structure-frozen, its
loader is one arm of a nine-wide server-driven `Phase` switch (R4), and adding user-facing copy there
is a PM call on the surface carrying the most invariants in the file.

⚠️ **The cost is real and specific:** a screen reader on that branch announces nothing at all, on the
Premium-Plus report screen. It is the smallest of the four surfaces and the only one gated.
**Registered as `P74`. Revisit at:** the next PM copy pass.

### `C-AL-4` — THE READINGS HUB'S SEVEN GLYPHS ARE MONOCHROME AND TWO OF THEM MAY READ ALIKE

The owner ruled option (a): one accent, differentiation carried by icon, label and position. Six of
the seven glyphs were taken from Home's Explore group, which already assigns one to the same
destination — so they are the repo's own vocabulary rather than a choice. The seventh
(Combined Profile) has no Home entry and was chosen.

🔴 **Reported honestly rather than asserted:** six of the seven silhouettes are distinct in
monochrome; `text-outline` reads as "a document" and so does `layers-outline`, and they sit two rows
apart. **If they fail on a device the fix is POSITION supplying identity — NOT reintroducing hue.**

🔴 **⚠️ AMENDED 2026-08-06 — THIS ROW'S NAMED FALLBACK NO LONGER EXISTS.** It pointed at "Explore's
GROUPING pattern", and `P98` deleted every Explore group heading in favour of a flat 7-row list. The
PRINCIPLE (position supplies identity where hue used to) is intact and is why the sentence above was
reworded rather than deleted; the WORKED EXAMPLE it pointed at is gone, so a reader following this
row to Home would have found a flat list and concluded the note was stale. **A ruling whose premise
is quietly swapped is how a decision becomes folklore** — same discipline as `O-86`/`P65`'s re-basing.

⚠️ Option (b), a documented `category.*` sub-palette scoped to this screen like `chart.*`, is
**DEFERRED BY OWNER DECISION, not rejected**, so a future reader of §16 does not re-open it as a bug.
**Registered as `P75`. Revisit at:** cut 3's device pass.

---

## 🆕 THE MOTION FOLLOW-UP — one caveat accepted 2026-08-06 (`build27.1-motion-explore-fixes`)

### 🔴 `C-M-1` — **A DESIGN SPEC ROW THAT CANNOT BE MET: the tab-bar icon/label cross-fade. CLOSED PERMANENTLY.**

> **Class:** IMPOSSIBLE, not deferred. 🔴 **This is the first row on this register that is neither a
> trade nor a threshold to tune** — everything else here could be done and was not. This cannot be
> done within a constraint the project has already ruled on, and it is written down so it is not
> re-opened as an unfinished item every time someone reads design §5.4.

**§5.4's tab-switch row specifies "icon + label colour cross-fade only."** Half of that row shipped
and half of it is unbuildable.

**MEASURED in the installed `@react-navigation/bottom-tabs@7.16.1`, `views/BottomTabItem.tsx`:**

```
const activeOpacity   = focused ? 1 : 0;
const inactiveOpacity = focused ? 0 : 1;
```

**No `Animated`, no interpolation, no timing anywhere in that file.** The two stacked icons swap
instantly. 🔴 **The structure is a cross-fade; the behaviour is a CUT.** No prop, spec or
interpolator changes it — this is the absence of an animation, not a configuration gap.

**Why it is permanent and not deferred, and both halves are needed:**

1. 🔴 **The only fix is the `tabBar` render prop, i.e. re-implementing the bar** — which puts
   **X18**'s three coupled numbers (`height: 85 + inset`, `paddingBottom: 24 + inset`,
   `paddingTop: 8`) under our control, and **five screens derive their bottom padding from them**.
   §0.0 rule 3 makes that a hard stop, not a trade.
2. 🔴 **iOS verification is closed.** A hand-rolled bar's layout could never be confirmed on the
   platform where X18's numbers matter most, so even a successful Android rebuild would ship an
   unverifiable regression risk on every screen at once — **to animate a colour swap.**

🟢 **WHAT DID SHIP, and it is the whole of what was available:** `transitionSpec: navTiming` +
`sceneStyleInterpolator: SceneStyleInterpolators.forFade`, retiming the SCENE cross-fade off the
navigator's own default (**150ms `Easing.in(Easing.linear)`**, off the ramp in both respects) and
onto `dur-base` 220 / `ease-standard`. `shift` was rejected — it translates the scene by screen
width, against §5.3 rule 3.

⚠️ **A CORRECTION THIS ROW CARRIES:** `app/(main)/_layout.tsx`'s own header once claimed *"the
opacity cross-fade already runs today."* It never did. That claim was corrected at the file when the
retiming landed, and this row is the durable record.

**If the bar is ever rebuilt for an unrelated reason, the cross-fade comes back with it — as a
consequence, never as the justification.**

---

## 🆕 THE CROSS-FADE REVERT + THE WAVE DRAW-IN — three caveats accepted 2026-08-06 (`build27.1-crossfade-ambient`)

### 🔴 C-XF-1 — the tab-switch row's SECOND half is now also unmeetable, and this one was BUILT first

**The row above (`C-TAB-1`) closed the icon/label half as impossible. This closes the SCENE half as
WRONG.** They are two different failures and only the second one cost a shipped animation.

| | |
|---|---|
| **what shipped** | motion item 5: `transitionSpec: navTiming` + `sceneStyleInterpolator: forFade`, i.e. §5.4's tab-switch row implemented exactly |
| **what the device showed** | entering Home from Readings, the previous screen's copy legible THROUGH the new one — five distinct strings from Readings visible behind Home's greeting, bar still showing Readings active. Reported as a **white flash** |
| **what it actually is** | a **DOUBLE EXPOSURE**. A cross-fade works for IMAGES, where one picture replaces another. Between two opaque full-screen TEXT layouts the user reads both for the length of the overlap, and two sets of type at partial alpha composite into a bright hazy smear |
| **why no timing fixes it** | 220 ms was already short. Shortening it makes the smear briefer, not absent; lengthening it is worse. **The window has to not exist** |
| **the fix** | both keys deleted. `bottom-tabs@7.16.1` then defaults `animation: 'none'` → `duration: 0`, no interpolator, `hasAnimation()` false, so the outgoing scene detaches at once instead of interpolating. Pre-item-5 behaviour, which `UI-audit` §4.3 recorded as *"instant, no animation"* |
| 🔴 **the asymmetry** | `hasAnimation()` reads the SPEC when no animation name is set, so **a half revert keeps the 220 ms overlap window open with no fade in it.** Both keys, or neither |

🟢 **CONSISTENCY GAINED RATHER THAN LOST:** the bar's icon swap is already an instantaneous cut that
X18 forbids changing. Scene and bar were on two different models for one gesture; they now agree.

⚠️ **WHAT IS GIVEN UP, STATED PLAINLY SO IT IS NOT REDISCOVERED AS A GAP:** the tab switch has **no
motion of any kind**. §5.4's row is annotated as unmeetable in both halves. Do not re-open it.

### 🔴 C-XF-2 — the tab navigator had NO scene background, and react-navigation's default theme is LIGHT

**Independent of the cross-fade, and it is what made the smear BRIGHT.** A `bottom-tabs` scene is
painted by `@react-navigation/elements`' `Background`, which fills `useTheme().colors.background`.
Expo Router's container defaults that theme to react-navigation's **light** theme
(`expo-router/build/fork/NavigationContainer.js`: `theme = DefaultTheme`) and **exports no way to
replace it** — `ThemeProvider` is not re-exported and `@react-navigation/native` is a transitive
dependency, which audit finding I-4 stands against importing.

| navigator | ground named? |
|---|---|
| root stack + all five nested stacks (`(auth)`, `(capture)`, `(paywall)`, `readings`, `astrology`, `numerology`, `compatibility`) | 🟢 **yes** — `contentStyle: { backgroundColor: bg }`, and native-stack applies ours over the theme's |
| **the `(main)` tab navigator** | 🔴 **NO. Nothing at all** — and `sceneContainerStyle` does not exist in v7; the prop is `sceneStyle` |
| the `NavigationContainer` theme itself | 🔴 **light, and unreachable from app code** |

🟢 **CLOSED by `sceneStyle: { backgroundColor: t.color.bg }` on the tab navigator**, which is
asserted as a literal. **The theme itself is left alone deliberately:** every surface that reads
`colors.background` is either a stack content view (`contentStyle` wins) or a tab scene (`sceneStyle`
wins), so the light default is now fully masked at every navigator, and reaching into a transitive
dependency to change one colour that nothing can see is the larger change.

⚠️ **AND THE ROOT VIEW / `android:windowBackground` IS STILL A PLATFORM DEFAULT — REGISTERED, NOT
FIXED.** `expo-system-ui` is not installed and `app.json` sets no `backgroundColor` (top-level or
`android.`), so `@expo/prebuild-config`'s `withAndroidRootViewBackgroundColor` no-ops:
`getRootViewBackgroundColor()` returns null and `android:windowBackground` is never assigned on
`AppTheme`. What covers the launch window today is the **splash** theme
(`splash.backgroundColor: #100E0D`) plus `app/_layout.tsx`'s three nested brand-background layers.
Setting it is a native config change requiring a rebuild to verify — it is an **owner action**,
not a code change made blind.

⚠️ **THE THREE BRAND-BACKGROUND LAYERS IN `app/_layout.tsx` ARE *NOT* REDUNDANT AND WERE NOT
TOUCHED.** They cover a different layer: the `fontsReady ? … : null` branch and any ErrorBoundary
fallback, i.e. the frames where the navigator tree does not exist at all. The theme leak is ABOVE
them, inside a mounted scene. Same colour, two unrelated holes.

### ⚠️ C-XF-3 — the draw-in re-arms per focus, so the wave is absent for 600 ms on every return

Owner ruling: the draw-in is **focus-keyed**, like the screen entrance, so that it is not
"invisible on every return" (LEG D's defect). The consequence, stated rather than glossed: because
the channel is a **paint** property (`strokeDashoffset`), re-arming means the stroke is **undrawn**
for the 600 ms clearance-plus-sequencing wait on **every** revisit, then draws over 420 ms.

**This is the same trade `usePlateEntrance` declined** — §18.1 makes the plate alpha-only, and a wait
on an alpha-only entrance is a wait on nothing being painted, so the plate is the one declared
mount-keyed exception. The owner ruled the other way here, deliberately. **Registered beside `P101`
(the plate's 1020 ms first paint) as a single device question about decorative first paint**, and it
is a tuning lever (drop the clearance term for a paint-channel entrance) rather than a defect.

---

## 🆕 THE R9 QA INCIDENT — four caveats accepted 2026-08-06 (`build27.1-r9-qa-incident`)

> Production incident: the Premium-Plus Cosmic Report failing QA for real users. Diagnosed against
> the live `reports` / `ai_generations` collections (read-only). **Neither suspected prompt change
> caused it**; the two caveats below are the real defects, and both are DEFERRED because this
> session's brief forbade touching a QA threshold or the no-face rule.

### 🔴 `C-R9-1` — **THE 26-PAGE CAP HAS NEVER HAD HEADROOM. IT IS A COIN FLIP, AND IT ALWAYS WAS.**

`QA_PAGE_MAX = 26`. Every report ever generated, measured:

| generated (UTC) | words | pages | verdict |
|---|---|---|---|
| 2026-07-26 | 7223 | 26 | PASS (at the cap) |
| 2026-07-28 | 7351 | 26 | PASS (at the cap) |
| 2026-08-05 10:52 | 7252 | **27** | 🔴 FAIL |
| 2026-08-05 11:48 | 7098 | 26 | PASS (at the cap) |
| 2026-08-06 11:08 | 7290 | **27** | 🔴 FAIL |

**Four of five renders land at the maximum; two of five land one page past it.** The prompt asks for
20–24 pages / 5,500–6,500 words (`6f1b489`, the length nudge written to clear the 17pp FLOOR). The
model has delivered **7,098–7,351 words at 26–27 pages on every single run**, from the first report
onward. Nobody looked at the ceiling because the nudge was aimed at the floor.

🔴 **AND WORD COUNT DOES NOT ORDER PAGE COUNT: 7351 → 26pp, 7252 → 27pp.** Pagination turns on where
tables, chart markers and section breaks fall, so a words-per-page constant does not predict it and
tuning the prompt's word target is not a reliable lever on the page count. ⚠️ **This is why the
failure looks intermittent and why any "the prompt got wordier" hypothesis will keep finding
support in noise.**

**NOT FIXED HERE — changing a QA threshold was on the session's DO-NOT list.** The decision is the
owner's and it is one of: raise `QA_PAGE_MAX` to 28 (the document is described to the user as
"18-to-26 pages", so this is a copy question too), lower the prompt's length target, or take
`C-R9-2`'s trim.

### 🔴 `C-R9-2` — **A SOFT THRESHOLD DISCARDS A ~$1.6 GENERATION WHEN A LAYOUT LEVER WOULD DO**

A `pageCount` failure is classed `CONTENT`, which routes to a **re-Fable** — a fresh generation at
full price — even though the interpretation is fine and the deficiency is one page of LAYOUT. The
renderer's own levers (US-Letter, 1" margins, `spacing.after: 160`, `line: 276`, the inter-section
`PageBreak` at line 849) are all deterministic and free to adjust; **reflowing 27 pages to 26 costs
nothing and re-generating costs the whole call again.**

**Measured cost of the discard:** the two failed attempts since 2026-08-05 burned **$6.19** across
**four** generations and delivered **zero** reports. Each failed attempt is 2 generations
(`MAX_QA_REGEN = 1`), ≈ **$3.10**.

⚠️ **AND THE PERSISTED COST UNDER-REPORTS IT BY HALF.** `synthesizeInterpretation` does
`$set: { costEstimate }` — an OVERWRITE, not an increment — so a report that re-Fabled records only
its LAST generation. The Aug-6 failure shows `costEstimate = $1.6362`; it actually cost $3.2023.
**Any spend analysis built on `reports.costEstimate` is low by exactly the discarded generations.**
This one is a genuine bug rather than a tuning question.

### 🔴 `C-R9-3` — **THE FACE QA RULE FIRES ON THE COMPLIANCE STATEMENT ITSELF**

The Aug-6 report tripped `face[CONTENT]: face-derived phrasing: physiognom`. Both hits are
DISCLOSURES OF ABSENCE:

> "The Face. No face photograph was provided for this reading, so the **physiognomy** layer is
> omitted entirely."
> "No face photograph was provided and the **physiognomy** layer was omitted."

That is the no-face rule **working** — zero face content, and the report says so, which §8's Part VII
spec requires it to say. `physiognom` is simply the synonym the model reached for on this run and
not on the previous four.

⚠️ **THE GATE'S OWN COMMENT PREDICTED THIS CLASS AND STOPPED ONE WORD SHORT.** It excludes the bare
word "face" precisely because "the correct report legitimately contains the exclusion DISCLOSURE",
then leaves `physiognom` in `FACE_TERMS` — the word such a disclosure naturally uses. The scan is
`normText.includes(term)` over the whole PDF with **no polarity**: it cannot distinguish "the
physiognomy layer is omitted" from a physiognomy reading.

🔴 **DO NOT FIX THIS BY DELETING THE TERM.** `physiognom` is the correct needle for the failure the
rule exists to catch; the defect is the absent negation context, not the word. **NOT FIXED HERE —
the no-face rule was explicitly out of scope this session.** Whatever replaces it must still fail a
report that actually reads a face.

### ⚠️ `C-R9-4` — **NOTHING BOUNDS "TRY AGAIN" ON THE MOST EXPENSIVE CALL IN THE APP**

A QA-failed report goes `status: 'failed'`, which drops it out of the partial unique index on
`{ userId, monthKey }` → **the month's slot is refunded and the user may enqueue again immediately,
without limit.** Confirmed in production: user `6a3a4f9d…` failed at 10:52Z on 2026-08-05 and
successfully re-enqueued at 11:42Z the same day, same `monthKey`.

🟢 **The refund is correct and the user-facing copy is accurate** — see the verification below. The
caveat is that the ONLY bound on repeated paid regeneration is the user's patience: `MAX_QA_REGEN`
bounds re-Fables *within* one attempt and `MAX_ATTEMPTS` bounds *transient* retries, but **no
counter survives the `failed` write**, so attempt N+1 starts from zero. At ~$3.10 per failed attempt
against a deterministically-failing cause (`C-R9-1`), a single determined user can loop
indefinitely. **Reported, not acted on** — a cap changes credit-adjacent behaviour, which was on the
DO-NOT list.

### 🔴 `C-R9-5` — **A LOCAL RENDER IS NOT A VALID REPRODUCTION OF THE PAGE-COUNT GATE. IT IS 3–4 PAGES SHORT.**

Measured as a control (free — re-render only, no Fable call): **every stored interpretation
re-rendered on a dev box paginates SHORTER than the production container did for the identical
text.**

| report | words | PROD pages | LOCAL pages | delta |
|---|---|---|---|---|
| 2026-07-26 | 7223 | 26 | 22 | **−4** |
| 2026-07-28 | 7351 | 26 | 23 | **−3** |
| 2026-08-05 (failed) | 7252 | 27 | 24 | **−3** |
| 2026-08-05 (passed) | 7098 | 26 | 23 | **−3** |
| 2026-08-06 (failed) | 7290 | 27 | 23 | **−4** |

The cause is the same LibreOffice-version difference already documented for `imageCount` (the dev box
preserves vector, the 6b container rasterises) — but it was only ever recorded as a CHART-COUNT
artifact. **It moves the page count too, by 3 to 4 pages, which is larger than the entire margin the
gate has.**

🔴 **CONSEQUENCE FOR ANY FUTURE VERIFICATION: a local `pageCount: true` MEANS NOTHING.** Add 3–4.
This session's end-to-end run produced **7466 words → 23 local pages**, which maps to **26–27
production pages** — i.e. the run that "passed" locally was at or over the cap in production. 🟢 The
`face`, `dashes` and `sections` checks ARE faithful locally (the same failed report reproduces its
`face` hit exactly), so a dev box can verify those three and only those three.

⚠️ **This also means `QA_PAGE_MAX` was very likely tuned against a dev-box render.** Whoever takes
`P108` should confirm the constant against a CONTAINER render before choosing a number.

## 🆕 GOOGLE SIGN-IN WEB BUTTON FLOW — one caveat accepted 2026-08-11 (`fix/google-signin-web`)

### 🔴 `C-GSI-1` — **AN UNAUTHORISED ORIGIN FAILS SILENTLY, BY CONSTRUCTION, AND NOTHING IN-APP CAN DETECT IT**

**Owner-ruled 2026-08-11: no code change.** The real fix is the owner action (`P112` / `P113`), not
the client. Recorded here because the failure mode is permanent and worth knowing before it is
mistaken for a regression.

The button-mode implementation (`mountGoogleButton` in `lib/googleSignIn.web.ts`) has **no callback
for an unauthorised-origin rejection** — GSI's own SDK exposes none. Measured on this machine
2026-08-11 against `http://localhost:8093` (not on the authorised list): the console shows
`error: [GSI_LOGGER]: The given origin is not allowed for the given client ID.` and the button's
underlying request (`https://accounts.google.com/gsi/button?...`) comes back **HTTP 403** — but
`document.querySelector('iframe[src*="accounts.google.com"]')` still returns truthy
(`googleIframe: true` alongside the 403), because Google still writes the iframe element pointing at
that URL regardless of what the URL returned. **An in-app "did the button render" check cannot see
the difference between success and this failure — the DOM shape is identical.** A click still opens a
real `accounts.google.com` popup too (a separate code path from the button-render request), so even
"the popup opened" is not evidence the origin is authorised.

**Symptom:** tap, popup, nothing, forever. No error toast, no timeout — the old One Tap
implementation's 120-second backstop named this exact cause; it is deleted along with `prompt()` (see
`docs/GOOGLE_SIGNIN_WEB_SETUP.md` §5). The failure is indistinguishable, from inside the app, from a
user who simply hasn't finished picking an account yet.

**First thing to check when this is reported: the authorised-origins list, not the code.** `P112`
covers adding the stable origins; `P113` covers the specific measured gap that `http://localhost:8093`
itself is not currently on that list.
