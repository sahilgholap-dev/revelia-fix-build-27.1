# Build 27 — Delta vs Build 26 (RELEASE CANDIDATE)

**versionName bumped to 2.0.0** (2026-07-25 — `app.json` + both `package.json` files; was 1.2.0). Branch `feature/build-27` (cut from `feature/build-26`, so it contains all of Build 26). Plan index: `plans/build-27.md`; deep plans: `plans/build-27/R1–R7, R9`. Status below as of **2026-07-25**. Backend still prod-dark (R7/R9 built behind flags, nothing user-facing deployed yet); `mobile/app.json`'s `apiUrl` was toggled through staging/a custom domain during the day and settled back on the production Railway URL — consistent with an imminent release cut, not yet confirmed shipped.

Theme: **empirical accuracy + frontier-model synthesis**, extended mid-build into two large new paid surfaces. R1–R4 replaced approximations with deterministic structured extraction; R5 synthesized the four feature sets with Fable 5; R6 added a retention delta mechanic; then **R9 (a flagship paid PDF report) and R7 (Q&A + a proprietary Timing Engine)** were added as new scope — **R9 built first** since it produces the shared sidereal astrology engine R7 reuses.

| Req | Scope | Status |
|---|---|---|
| R1 Swiss Ephemeris astrology | server | ✅ DONE |
| R2 Face structured extraction | server (+minor mobile) | ✅ COMPLETE |
| R3 Palm structured extraction | server | ✅ IMPLEMENTED — only step 10 (owner on-device recentre) remains, folded into the release cycle |
| R4 Numerology consolidation | server | ✅ COMPLETE |
| R5 Fable 5 synthesis engine | server | ✅ COMPLETE (flag OFF until owner rollout) |
| R6 Continuity readings | server + mobile | ✅ COMPLETE, including the previously-deferred **Option C** card (shipped 2026-07-25) |
| R7 Q&A + Timing Engine | both | 🟢 **CODE-COMPLETE** (2026-07-24) + Timing Engine rule set at **v1.1.1** (2026-07-25) — prod-dark; remaining gates are non-code (rule-set re-upload to R2, one Sid wording confirm, 2 non-blocking config questions) |
| R9 Personalized Cosmic Report | both | 🔨 **FEATURE-COMPLETE** (2026-07-22) — prod-dark; remaining gate is the `REPORT_WORKER_ENABLED` prod flip after a final testing pass |
| R8 Export My Data (GDPR stub fix) | server | opportunistic, not started |

Per-feature detail: `../features/astrology-swiss-ephemeris.md`, `face-extraction.md`, `palm-extraction.md`, `numerology.md`, `synthesis-engine.md`, `continuity-readings.md`, `qa-timing-engine.md`, `cosmic-report.md`.

## What shipped mid-build, beyond the original R1–R9 scope

- **"Ask the Stars" home entry card** (2026-07-25) — an additive Explore-section card mirroring the Cosmic Report card, routing to the same R7 Q&A chat screen. No new logic or gating.
- **Cosmic Report → Premium-Plus-only** (Sid directive, 2026-07-25) — tightened from "both paid tiers" to PP-exclusive; free and premium both see the same locked/upgrade screen.
- **Cosmic Report Share fix** — Share previously sent only marketing text; now downloads and attaches the actual PDF file (added `expo-file-system`).
- **Monty sample-report viewer** — un-deferred and built (free-tier "see before you buy"), reusing the private report bucket with a fresh presigned link per request.
- Five internal-test bug fixes bundled in the same session (Q&A composer losing keyboard focus, a fresh-account birth-chart 404, palm extraction failing in the Docker image because vendored model weights weren't copied into the runtime stage, and the downstream "incomplete readings" gate that bug caused).

## Mobile-side changes

No longer minimal — R7 and R9 opened the first real build-27 mobile cycle: the Q&A chat screen (`qa.tsx`), the Cosmic Report hub (`cosmic-report.tsx` + history), two new Home → Explore cards, and the R6 Option C `ContinuityCard` on the daily screen. Capture screens and upload flow remain untouched (all R2/R3 extraction is still server-side).

## Testing (two-pass plan — `tracking_files/build-27-testing.md`)

- **Pass 1** (pre-R5, local, 2026-07-09): PASS.
- **Pass 2 · Phase 2.0** (R5 weave + R6 continuity local smoke, 2026-07-13): ✅ PASS 89/89.
- **Pass 2 · device phases**: folded into the release cycle itself (single live-prod backend, no separate pre-release device-test path). R7 has its own committed regression harnesses (`test:timing` 22/22, `test:qa-router`, `test:qa-prompt`) standing in for unit-level device-independent coverage; R9's pipeline was proven green end-to-end on a staging environment (async job lifecycle, render, QA gate, delivery, email link).

## Outstanding queue (owner)

**R7 launch gates (non-code):** re-upload the v1.1.1 Timing Engine rule set to the private R2 timing bucket in **both** staging and production (a code deploy alone ships new engine code against stale rules) · Sid's final wording confirm on the crisis copy · two non-blocking rule-set config questions (S-R7f/S-R7g).
**R9 launch gates (non-code):** flip `REPORT_WORKER_ENABLED=true` in production after a length-nudge/Fable-spot-check/email-link re-confirm · upload the real sample PDF to its R2 key.
**Carried over:** R3 step 10 (device recentre) · post-deploy backfills (`natal-chart`, `face-features`, `palm-features`, `numerology`, each `:dry` first) · flip `SYNTHESIS_FABLE_ENABLED` ON + live A/B · merge `feature/build-26` → `main` · project-wide `NUMEROLOGY_VERSION` bump + backfill for the Y-as-vowel rule (shared R7/R9 migration, already landed in R9's numerology step — confirm full backfill) · the deferred R9 "someone else" report path (turn-on-ready, scheduled for end of internal testing) · `.env.example` gaps (see `setup/environment.md`): `SENDGRID_*`, `SYNTHESIS_FABLE_ENABLED`, `QA_DEVICE_SALT`, `CRISIS_WORDING_FINALIZED`, `TIMING_CONFIG_DIR`, `REPORT_WORKER_ENABLED`, `R2_REPORTS_*`.

Deferred-caveat register: `tracking_files/build-27-caveats.md`. Sign-off gates: `tracking_files/sid-signoff.md`.
