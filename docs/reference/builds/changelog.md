# Reference-docs changelog

Append one dated entry per documentation-framework run (newest last is fine — append only).

## 2026-07-11 — First run (framework bootstrap)

- Created the entire `docs/reference/` set: README, architecture (overview / infrastructure / data-model), server + mobile + packages module docs, 8 feature docs (swiss-ephemeris, face-extraction, palm-extraction, numerology, synthesis-engine, auth, push-notifications, subscriptions), builds (build-26 baseline, build-27 delta), history, setup (getting-started, environment), and the `.doc-framework-state.md` run marker.
- Documented state: Build 26 live on Play Store (vc26); Build 27 on `feature/build-27` with R1/R2/R4/R5 complete, R3 at step 10, R6–R8 unplanned.
- Created the external work log at `C:\Users\User\Downloads\mix\WORK_LOG.md` (untracked, outside repo) and backfilled project history.
- Sources: existing repo docs/tracking files + 4 sonnet sub-agent code/doc scans. Raw Claude Code session transcripts (84 files) intentionally not mined — `tracking_files/claude_progress.md` + `tracking_files/build-26/` are the curated record of the same sessions.

## 2026-07-17 — Second run (update — no sub-agents needed)

- Scope: 21 commits landed since the last run (`93d5c7b`..`a9842e4`). Read only `tracking_files/session_handoff.md` + `plans/build-27.md` (both already comprehensive) — no code sub-agent scan was needed since nothing in the underlying architecture/modules changed, only new feature scope.
- Updated `features/palm-extraction.md` (R3 flipped to ✅ IMPLEMENTED, only owner step 10 remains) and `architecture/data-model.md` + `server/overview.md` (added the R6 continuity sub-schema/service, and planned-not-yet-built R7 `QaTurn`/`timing_log` + R9 report-job docs).
- Created three new feature docs: `features/continuity-readings.md` (R6, ✅ complete), `features/qa-timing-engine.md` (R7, deep-planned, implementation deferred until after R9), `features/cosmic-report.md` (R9 — a brand-new mid-build requirement not present at the last run, deep-planned, builds before R7).
- Rewrote `builds/build-27.md` status table + testing section (Pass 2 Phase 2.0 = 89/89 pass; device phases folded into the release cycle) + outstanding-queue list.
- Appended 5 entries to the external work log: R3 completion, R6 continuity, R7 deep-plan, R9 deep-plan (new requirement), Pass 2 Phase 2.0 results.
- No TODO/verify gaps newly discovered this run; prior-run gaps (Sentry/Mixpanel activity, `.env.example` completeness, stale root `scripts/README.md`, API-domain discrepancy) remain open and unchanged.

## 2026-07-25 — Third run (update — 2 sonnet sub-agents, large delta)

- Scope: ~130 commits since the last run (`da42719`..`549cabd` on `feature/build-27`, 2026-07-17 → 2026-07-25). R7 (Q&A + Timing Engine) went from deep-plan to **code-complete** (real mobile chat UI, Haiku router, tier-split answer models, timing engine at rule-set v1.1.1, 3 committed regression harnesses). R9 (Cosmic Report) went from deep-plan to **feature-complete** (full async pipeline: astronomy → Fable 5 → render → QA gate → delivery; real mobile hub UI). This is the first run where R7/R9 actually landed mobile code, so — per the gap flagged in the previous run's state marker — dispatched 2 parallel sonnet sub-agents (mobile-delta scan, server-delta scan) instead of relying on commit-message digests alone.
- Rewrote `features/qa-timing-engine.md` and `features/cosmic-report.md` in full (deep-plan → shipped). Updated `features/continuity-readings.md` (Option C card shipped, was "deferred"). Updated `architecture/data-model.md` (`QaTurn`/`QaDeviceDiClaim`/`Report`/`timing_log` flipped from "planned" to "✅ built"), `server/overview.md` (5 new services, 2 new route groups, `reportWorker.ts`, 3 test harnesses), `mobile/overview.md` (qa.tsx, cosmic-report.tsx, ContinuityCard, 2 new home cards, 4 new `lib/` wrappers, version bump to 2.0.0, `expo-file-system`, the apiUrl churn), `packages/shared-types.md` (`DailyContinuity`, Report types; noted Q&A types are deliberately NOT shared), `setup/environment.md` (added the R7/R9 env-var groups + flagged 6 vars still missing from `.env.example`). Rewrote `builds/build-27.md` in full — status table, mid-build scope additions (Ask the Stars card, PP-only report gate, share-PDF fix, sample viewer, 5 bug fixes), outstanding-queue refresh.
- Appended entries to the external work log for: R7 code-complete, R9 feature-complete, the version-2.0.0 release-candidate bump, R6 Option C, the Ask-the-Stars/PP-only-gate/share-fix bundle.
- New TODO/verify gaps found this run: `CRISIS_WORDING_FINALIZED`, `QA_DEVICE_SALT`, `TIMING_CONFIG_DIR`, `REPORT_WORKER_ENABLED`, and all `R2_REPORTS_*` vars are used in code but absent from `server/.env.example`. Prior-run gaps unchanged.
