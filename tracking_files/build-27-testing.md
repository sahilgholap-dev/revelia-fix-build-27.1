# Build 27 — Testing Log & Strategy

> Home for the Build 27 test strategy + the summary of each test pass. Two passes, deliberately split by cost.

---

## Strategy — foundation NOW (cheap/local), presentation AFTER R5 (one device cycle)

**The distinction that drives it:** R1–R4 landed structured DATA and DEFERRED the reading COPY to R5. R5 rewrites the daily/weekly/monthly/compatibility/career synthesis copy AND likely re-routes marquee readings to Fable 5 (a different model). So:
- **Foundation (data + CV extraction + stability) is model-independent and has the real-world unknowns** (does extraction work on a *real phone photo*? is the substance stable across re-runs? is the chart/numerology correct?) → cheapest to verify NOW, before R5 stacks copy on top.
- **Presentation (synthesis copy, prose voice, final model, device UX) changes in R5** → device-testing it now is throwaway and costs a second deploy/EAS cycle.

**Pass 1 — PRE-R5 LOCAL FOUNDATION (no deploy, no EAS):** run the committed pipeline locally (ts-node scratchpad harness like the step-9 probes, optionally local HTTP) against a few REAL phone photos + real birth data. Verify extraction succeeds on real photos, substance is stable across re-runs, R1 chart is correct, R4 numerology + the two bug-fixes are correct. Record faceShape/palmType distributions on real photos (they feed the threshold-recentre decision). VERIFICATION ONLY — no product-code fixes inline; findings get triaged separately. Prompt: `prompts.txt` §10 → 10a. Does NOT block R5 (run in parallel; best done before R5 wraps).

**Pass 2 — POST-R5 OVERALL DEVICE (one cycle):** after R5 (+ any remaining work), deploy backend → EAS `preview` build → run backfills (`:dry` then real) → test the FULL flow on a physical phone with everything in final form (extraction + Fable-5-routed synthesis copy + device capture UX). **Fold in the R2 faceShape + R3 palm step-10 threshold recentres here** (real captures → recentre = `RULES_VERSION` re-map, no re-detect → THEN the wide backfills). This is the build-27 release verification. Carry forward every Pass-1 finding + the caveats in `build-27-caveats.md`.

Reuse the Pass-1 harness/Postman collection in Pass 2 — not throwaway.

---

## Pass 1 — Pre-R5 local foundation pass — RESULTS

**Run: 2026-07-09** by `build27-PreR5-Foundation-Testing`. **VERIFICATION ONLY** — scratchpad ts-node harnesses imported the COMMITTED functions UNCHANGED (cwd=`server/`, `transpile-only`, commonjs override), exactly the R2/R3 §9 step-9 method. **No product code / deps / commits touched.** Engine versions observed: face `FEATURE_VECTOR_VERSION=1.0.0`/`RULES_VERSION=1.0.0`; palm `FEATURE_VECTOR_VERSION=1.0.0`/`RULES_VERSION=1.0.0`; astro Moshier/Placidus/True-Node.

**Inputs (owner-supplied):** 2 REAL selfies (Amey Sawant, Prasad Sawant); 2 REAL palms of Amey (`dominant_right.jpg`, `nondominant_left.jpg`); R1 birth data = Amey (2003-08-06, 10:06, Mumbai/Asia/Kolkata). Small real set (2 faces / 1 person's 2 palms) — enough to prove the real-photo path works; NOT a distribution study.

### Per-check verdict

- [x] **R1 chart accuracy — PASS (owner-confirmed vs astro.com).** Live `computeNatalChart` (the wired sweph/Moshier/Placidus path, not just the R1 spike). **Owner generated Amey's chart on astro.com (Web Style/Placidus) → matches ours across the board:** all 10 planets + True Node match to sub-arc-minute (Sun 13 Leo 19′53″=our 13°20′; Moon 24 Sco 56′25″=24°56′; Merc 9 Vir 13′40″; Ven 9 Leo 52′; Mars 9 Pis 43′ r; Jup 25 Leo 23′; Sat 7 Can 57′; Ura 1 Pis 33′ r; Nep 11 Aqu 44′ r; Plu 17 Sag 22′ r; Node 26 Tau 15′). Angles matched EXACTLY once computed with astro.com's own coordinates (18n58, 72e50): **Asc Libra 5°49′ = 5°49′; MC Cancer 5°38′ = 5°38′** (a first ~3′ gap was only my generic Mumbai lat/lng — planets are coordinate-independent and matched regardless, proving the ephemeris; angles converged on the exact coords). Also 3 Rodden-AA control charts match published data (Diana/Obama Asc to the arc-minute). Determinism: recompute → identical longitudes. Astro.com reference saved: `scratchpad/astrodotcom/astro_w2gw_amey_sawant.*.png`.
- [x] **R2 face — PASS on REAL photos.** (a) Extraction SUCCEEDED on both real selfies (landmarks found, non-null). (b) Same stored bytes ×2 → **bit-identical** `FaceFeatureVector` (both); `mapFeaturesToTraits` identical on repeat (both). (c)+(d) One LIVE traits-only `generateFaceReading` (Amey) → `reconcileFaceSubstance` pinned **archetype** ("The Visionary"), **faceShape** ("square"), and **every trait score** exactly to the rules-derived substance; model authored only prose around them → prose-never-contradict confirmed on a live call. PIN VERDICT PASS.
- [x] **R3 palm — PASS on REAL photos (both hands).** Extraction SUCCEEDED on dominant AND non-dominant; same-bytes bit-identical + `mapFeaturesToPalmTraits` identical on repeat (both hands). Non-dominant re-mapped from its own vector (no stored profile), matching production. One LIVE `generatePalmReading` (dominant, image served over localhost so the line-flavor path runs) → `reconcilePalmSubstance` pinned **palmType** ("Fire Hand"), **energyType** ("Leader Palm"), **lifeTheme**, **naturalTalents**; all four **majorLines present as flavor** (`heartLine/headLine/lifeLine/fateLine`, each with a real model-written `observation`). PIN VERDICT PASS.
- [x] **R4 numerology — PASS.** `computeNameNumbers` deterministic (Expression/SoulUrge/Personality). **Finding #2 (career Expression = canonical name-destiny, not display name) confirmed observable:** display-name vs full-birth-name Expression differ (`"John"`→2 ≠ `"John Michael Smith"`→5; `"Amey"`→8 ≠ `"Amey Ramesh Sawant"`→6); wiring sources the numerology sub-doc (`reading.controller` L591-593, *"NOT derived from the display name"*). **Finding #1 (personalYear/Month current, not frozen) confirmed:** `getPersonalYear` advances per year (dob 1990-05-15 → PY 2024=1, 2025=2, 2026=3), `getPersonalMonth` varies per month; computed fresh at read (`insight.service` L232-244 uses `now`).
- [x] **Real-photo distributions recorded (recentre inputs):**
  - **faceShape:** `square ×2` (Amey + Prasad both square). archetype: Visionary ×1, Strategist ×1.
  - **palmType:** `fire ×2` (Amey both hands → "Leader Palm").

### FINDINGS (severity; NO fixes applied — owner-triaged)

1. **[LOW · 🎚️ tuning] Real photos also skew square / fire — the step-9 bin-skew is NOT just a GAN artifact.** Both real faces → `square`; both real palms → `fire`/Leader. This *strengthens* the existing recentre case (R2 faceShape + R3 palm thresholds, `build-27-caveats.md` 🎚️ items): recalibrate against a larger REAL capture set in **Pass 2 BEFORE the wide backfills**. N here is tiny (2 faces / 1 person's palms) — directional, not conclusive.
2. **[LOW · ⚠️ watch] Real selfie detector confidence lower than GAN best-case.** Amey detScore **0.65** vs Prasad **0.9997** (GAN step-9 faces were ~0.99). Still above threshold → detected + stable, extraction succeeded. Watch real-device **camera-capture** extraction success-rate (lower-quality/angled captures may dip below `DETECTION_MIN_CONFIDENCE` → fail-open to the blob path).
3. **[INFO · harness-only, no product impact] majorLines key names.** First harness run checked `heart/head/...`; actual output keys are `heartLine/headLine/lifeLine/fateLine`. Product correct; harness corrected + re-run → PASS. Recorded so Pass 2 reuses the right keys.

### MUST re-check on a real DEVICE in Pass 2 (not covered here)

- **Camera-capture path** — these were files dropped into a folder; on-device capture (resolution/orientation/EXIF/lighting) is the real unknown (see Finding #2). Extraction success-rate + faceShape/palmType distribution on a LARGER, more varied real set → the actual recentre inputs.
- **Fable-5-routed synthesis COPY (R5)** — daily/weekly/monthly/compatibility/career prose consuming these four feature sets; the model wasn't the marquee model here (face/palm ran on the current `claude-sonnet-4-6`).
- **faceShape + palmType threshold recentres folded in** (RULES_VERSION/FEATURE_VECTOR_VERSION per §6) BEFORE the wide `backfill:face-features` / `backfill:palm-features`.
- **R1** lazy-compute + `backfill:natal-chart` on the real DB. (Astro.com accuracy confirmed in Pass 1 — no re-verify needed; device pass just exercises the lazy/backfill wiring.)
- **R4** `backfill:numerology` on the real DB + confirm the two deliberate value-changes don't surprise a live user.
- **Mobile UX** — capture screens, loading strings (incl. the cosmetic "forehead" spinner string), PalmLineCard rendering the `majorLines` flavor.

**Harness artifacts (scratchpad, throwaway):** `r1-amey.ts`, `r1-chart.ts`, `r2-face.ts`, `r3-palm.ts`, `r4-numerology.ts`, `r3-live-reading.json`.

---

## Pass 2 — Post-R5 overall device pass — RESULTS
_(filled during the build-27 release verification. Keep the Pass-1 findings + `build-27-caveats.md` in view.)_

**Home chat:** `build27-Pass2-Testing` (charter = `prompts.txt` §10b). VERIFICATION ONLY; `SYNTHESIS_FABLE_ENABLED` OFF (guaranteed Opus 4.8 marquee path). Per-phase sub-prompts generated one at a time (10c, 10d, …), each run by the owner in a fresh chat + reported back here.

### ⚠️ PASS 2 DISPOSITION (revised 2026-07-13 — single-backend infra reality)

**The pre-release LOCAL scope of Pass 2 is COMPLETE (Phase 2.0 ✅); the DEVICE scope (Phases 2.1–2.4) folds into the build-27 RELEASE CYCLE.** Root cause surfaced in Phase 2.1 prep: Revelia has **one live-production Railway backend**, and the preview APK's API base URL is **hardwired** to it (`app.json` `extra.apiUrl`). R1–R6 are 100% server-side ⇒ there is **no way to device-test the build-27 engine without deploying untested code to live prod**. So the "one device cycle" Pass 2 envisioned *is* the release cycle (deploy → Internal Testing → promote) — there was never a separate staging path. Owner decision (2026-07-13): **do not deploy to prod for testing; lean on the passed Phase 2.0 local smoke for engine confidence now, and run the device verification inside the normal release cycle.** (Constraint saved to memory: `infra-single-railway-backend.md`.)

### Phase status
| Phase | What | Prompt | Status |
|---|---|---|---|
| 2.0 | Pre-deploy LOCAL end-to-end smoke (R5 four-set weave + R6 continuity, together; flag-OFF Opus 4.8) | §10c | ✅ **PASS** (89/89, 0 FAIL) — 2026-07-13 |
| 2.1 | Backend deploy + EAS `preview` build | §10d | ⛔ **DEFERRED to release cycle** (single prod backend; no non-prod device-test path) — 2026-07-13 |
| 2.2 | R2 faceShape + R3 palm threshold RECENTRES (RULES_VERSION re-map) BEFORE wide backfills | §10d(rel) | ⤳ **folds into release cycle** (needs real captures from the deployed APK) |
| 2.3 | Backfills `:dry`→real (natal-chart / face / palm / numerology) | §10d(rel) | ⤳ **folds into release cycle** (needs deployed backend + real DB) |
| 2.4 | On-device FULL-FLOW R1–R6 + build-26 no-regression | §10d(rel) | ⤳ **folds into release cycle** (Internal Testing on the deployed prod backend) |
| 2.5 | Record + triage → release-readiness | — | ✅ **done** (local-scope closeout below) — 2026-07-13 |

### Phase 2.1 — DEFERRED — 2026-07-13
Prep run by `build27-Pass2-Deploy-EAS`. **No deploy, no EAS build, no product-code changes, no commits** — the phase was correctly halted when the single-backend blocker surfaced (above). **Local pre-deploy gates VERIFIED (carry into the release cycle):** 1a ✅ tsc clean BOTH sides; 1b ✅ `google-services.json` git-tracked; env-var + FCM checklist code-verified for the eventual deploy. **Flagged:** 1c — `origin/feature/build-27` is ~2 docs-only commits behind local (cosmetic; push before the release deploy). No HIGH/LOW findings.

### Phase 2.0 — LOCAL smoke — RESULTS — ✅ ALL PASS (89/89, 0 FAIL) — 2026-07-13

**Run** by `build27-Pass2-LocalSmoke`: ephemeral ts-node `--transpile-only` harness (commonjs override, server/ ROOT), imported the COMMITTED fns unchanged (R6-step-6 method), deleted after. Zero product-code/deps/deploy/EAS/commits. **ENV:** `SYNTHESIS_FABLE_ENABLED=false` (verified in-code → guaranteed `claude-opus-4-8` marquee path); `ANTHROPIC_API_KEY` present. Real chart: `computeNatalChartFromBirthData` (Moshier, Amey — rising Libra, 11 planets/18 aspects, timeKnown); live signals Mercury sextile Saturn (orb 0.1°), transiting Moon sextile natal Mercury (0.4°); R4 trio Expression 6 / SoulUrge 5 / Personality 1.

- **TEST A — R5 deeper-signal weave — PASS (primary gate, deterministic).** Every surface's assembled prompt literally contains all four sets (R1 moon/rising + active aspect + key transit, R2 face bands, R3 palm bands, R4 expression/soulUrge/personality) via `buildFeatureContext`: daily / weekly / monthly-free / monthly-premium / compat. **monthly-premium grounding:** `## ASTROLOGY GROUNDING` block present ("REAL, computed astrology" / "actual Swiss Ephemeris chart") + anti-fabrication rule ("NEVER fabricate a placement, aspect, or transit") + the snapshot-not-calendar honesty caveat; grounds in the real moon/rising. **career:** no exported pure builder (prompt inline, `claude.service` L900-911) — verified via the exact `buildFeatureContext({...})` call it splices → all four present. **Live confirm:** `createSynthesisMessage({surface:'monthly-premium'})` → served `claude-opus-4-8`, `fellBack===false`, `stop_reason='end_turn'`, copy referenced real placements; daily → served `claude-sonnet-4-6`, end_turn. (1 marquee + 1 cheap live call.)
- **TEST B — R6 continuity — PASS (B1/B2/B3).** B1 (40-day gap): `meaningful=true`, gapDays=40, newAspects=10 / endedAspects=10, personalMonth 3→4, moon correctly omitted; newAspects/endedAspects JSON-equal to an INDEPENDENT re-derivation from raw `computeTransits`/`describeTransits` (orb-free identity diff); every newAspect ∈ the "now" set (no fabrication); `buildContinuityContext` → non-empty `## WHAT'S SHIFTED…` block enumerating only engine lines + the strict "ONLY the shifts listed / Do not invent" instruction; `buildContinuityHook` → one honest sentence, real gap, no raw aspects. B2 (1-day < MIN_GAP_DAYS=3): `meaningful=false` → both `buildContinuityContext` and `buildContinuityHook` return `''`. B3 (fail-open): render-level guarded ternary with delta=null → continuity `''` + hook `''`.
- **TEST C — the two together — PASS.** Continuity block spliced BEFORE `## DEEPER PROFILE SIGNALS` and the combined daily still carries all four woven signals; byte-identical fail-open `buildDailyInsightPrompt(p) === buildDailyInsightPrompt(p,'')` (both 10000 chars); teaser prepends the hook, base verbatim after.

**Findings:** `[INFO]` `ai_generations` write timed out (Mongo buffering 1s, no DB in harness) — correctly swallowed by the fire-and-forget `logAiGeneration`; confirms the "logging never blocks a reading" contract. No action. `[INFO]` career has no exported pure prompt builder — uses the identical shared `buildFeatureContext` block (moot here; compat+career don't lazy-backfill → they lean on the Phase 2.3 backfills on a real DB). **No HIGH/LOW defects; nothing to patch.**

**Remains DEVICE-only for Phase 2.4** (not machine-checkable locally): R6 baseline PERSIST+ADVANCE on the live Mongo (`resolveDailyContinuity` seed→advance→redundant-write-skip; the `natalChart && birthData?.date` DB guard for B3) — harness proved the decision, not the Mongo write; real Anthropic woven-PROSE quality across all surfaces (one marquee live-confirmed the served model + real placements; full prose read is device); a returning fully-backfilled user actually seeing the "since you were last here" note end-to-end; camera-capture extraction; mobile UX / teaser rendering.

---

## Pass 2 — CLOSEOUT & release-readiness (Phase 2.5) — 2026-07-13

**Pre-release verdict: R1–R6 are release-ready to the limit local verification can reach.** Pass 1 (2026-07-09) proved the R1–R4 foundation on real photos + real birth data (chart accuracy owner-confirmed vs astro.com; extraction + substrate stability; numerology correctness). Pass 2 · Phase 2.0 (2026-07-13, 89/89) proved the R5 four-set synthesis weave + R6 continuity — the only surface never previously exercised together — on the guaranteed flag-OFF `claude-opus-4-8` marquee path, with the R6 non-fabrication gate and both fail-open invariants holding. tsc clean both sides. **No HIGH/LOW defects across either pass.**

**What local verification CANNOT reach (by infra, not by choice) → carried into the release cycle:** the entire DEVICE surface. Because there is one live-prod backend and the APK is hardwired to it (see disposition above), every device check runs against the deployed prod backend during Internal Testing. This is the same "one device cycle" Pass 2 always meant — it just happens at release, not before it.

### RELEASE-CYCLE DEVICE CHECKLIST (carries Pass-2 phases 2.1–2.4 + all deferred device items)
Run during build-27 Internal Testing, in this order, on the deployed `feature/build-27` backend + a fresh EAS `preview`/`production` APK:
1. **Deploy prep (was 2.1):** push `feature/build-27` to origin (currently ~2 docs-only commits behind); re-confirm the CLAUDE.md env table on Railway — esp. `SYNTHESIS_FABLE_ENABLED` **OFF** (guaranteed Opus 4.8; the Fable flip is a separate post-A/B action), `ONESIGNAL_REST_API_KEY`, FCM (service-account JSON in OneSignal + committed `google-services.json`); post-deploy `GET /api/health` (all services true + db connected) + `GET /api/test/claude` (200).
2. **Threshold RECENTRES (was 2.2 — the one product-code step = `RULES_VERSION`/`FEATURE_VECTOR_VERSION` re-map, no re-detect):** collect a LARGER, varied real **camera-capture** set → observe faceShape/palmType distributions (Pass-1 saw square×2 / fire×2 at N=2 — directional only) → recentre BEFORE the wide backfills. Owner-committed. (Optional de-risk: the distribution study can be pre-advanced locally now with more dropped-in real photos via the Pass-1 harness, refined against camera captures at release.)
3. **Backfills (was 2.3), each `:dry` first:** `backfill:natal-chart` (R1), `backfill:face-features` (R2, AFTER recentre), `backfill:palm-features` (R3, AFTER recentre), `backfill:numerology` (R4) — verify counts + a spot-checked user.
4. **On-device FULL-FLOW (was 2.4):** R1 chart render + geocode-precision Asc/MC caveat; R2 camera-capture extraction success-rate (watch the Pass-1 detScore-0.65-near-floor finding) + stable reading; R3 both palms lines-flavor + stable; R4 numerology consistency (career Expression == name-destiny; current PY/PM); **R5 deeper copy on EVERY surface for a fully-backfilled user** (completes the Phase-2.0-partially-verified caveat) on the Opus 4.8 marquee path; **R6 continuity for a RETURNING user** — gap ≥3 → accurate note, same-day → none, free/premium teaser hook, PP full prose, **+ the live-DB baseline PERSIST+ADVANCE** the Phase-2.0 harness deferred; mobile UX (capture screens, the cosmetic "forehead" spinner string, PalmLineCard). **NO-REGRESSION on build-26:** auth 3 paths, push/FCM, subscriptions, share cancel-cascade, account delete.

### Carried-forward findings (from Pass 1 + Phase 2.0 — re-check at release)
- [LOW · 🎚️] Real photos skew square/fire (Pass-1 N=2) → the recentre case; calibrate on the larger real set at step 2.
- [LOW · ⚠️] Real-selfie detScore 0.65 near the `DETECTION_MIN_CONFIDENCE` floor → watch camera-capture success-rate at step 4.
- [INFO] Phase-2.0 harness: `ai_generations` no-DB log timeout (fire-and-forget contract confirmed) + career's inline-but-shared `buildFeatureContext` — neither a defect.
