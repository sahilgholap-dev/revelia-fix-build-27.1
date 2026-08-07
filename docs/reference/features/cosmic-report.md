# Personalized Cosmic Report (Build 27 · R9) 🔨 FEATURE-COMPLETE (2026-07-22) — prod-dark, `REPORT_WORKER_ENABLED` flip is the final gate

Full plan: `plans/build-27/R9-report.md` (§14 = the 9-step implementation record) + `R9-report-spec.md`. Built **before** R7 on purpose — it produces the shared sidereal astrology engine module R7's Timing Engine reuses.

## What it is

A **paid, async-generated 18–26 page PDF report** written by **Fable 5**: Western (tropical) + Vedic (sidereal) astrology, full natal chart + transits, numerology, and self-only palm (no face — Play Store policy; no third-party palm — BIPA). Delivered three ways: emailed secure link, an in-app PDF hub, and native share (which downloads and attaches the actual PDF file, not just marketing text). Mobile entry: a "Personalized Cosmic Report" card on Home → Explore and the Readings tab, routing to `mobile/app/(main)/readings/cosmic-report.tsx`.

## Architecture (Mode B, as shipped)

1. **`astrology-sidereal.service.ts`** — an isolated sidereal engine layer (Lahiri, whole-sign, mean node) composed on top of R1's tropical engine, not duplicating ephemeris calls. Owns the `swe.set_sid_mode` set-then-reset lifecycle. Computes the full Vedic astronomy surface: dasha ladder (MD+AD), panchanga, dignities/combustion/yogas, transit ingress tables, sade sati, planetary returns, D9 divisional chart.
2. **`report-inject.service.ts`** — pure builders assembling `ASTRONOMY_JSON` / `NUMEROLOGY_JSON` / `PALM_OBSERVATIONS` payloads (allow-listed fields only; face structurally excluded, not just omitted).
3. **`report.service.ts`** — orchestration: builds the inject payload, calls **Fable 5** (new `report` synthesis surface, high effort, streamed) for interpretation *only* — the model does no arithmetic.
4. **`report-render.service.ts`** — a controlled renderer: parses Fable's structured prose output, builds charts via `report-charts.py` (matplotlib → SVG, vector-preserving) and tables from the injected data, assembles a `.docx`, converts to PDF via LibreOffice (`soffice`) in a Docker image (Railway's default builder doesn't include native LibreOffice, hence a dedicated Dockerfile).
5. **QA gate** (`report-qa.py`): 18–26pp, all required sections present, **zero em/en dashes**, images embedded, file opens — must pass before a report is marked `ready`. A content/render-classified failure triggers a bounded regenerate + credit refund; never silently ships a bad PDF.
6. **`report-delivery.service.ts`** — a separate least-privilege R2 client (`R2_REPORTS_*` credentials, private `revelia-reports` bucket) uploads the PDF; a fresh short-TTL presigned link is minted **per request** (no durable link stored) for Open/Share/email.
7. **`reportWorker.ts`** (`server/src/jobs/`) — cron-based (not event-triggered): per-minute claim/generate jobs plus a 5-minute stale-timeout sweep, gated behind `REPORT_WORKER_ENABLED` (default OFF, same pattern as `SYNTHESIS_FABLE_ENABLED`). State machine `queued → generating → ready | failed`, transient failures retry up to 3 attempts, terminal failure refunds the credit (drops out of the reservation index).

## Product shape (as shipped)

- **Cosmic Report is Premium-Plus-only** (Sid directive, 2026-07-25 — tightened from the original both-paid-tiers plan). `reportLimitForTier` returns 1 for Premium Plus, 0 for both Free and Premium. Mobile keys its lock screen on `limit === 0`, never on tier name directly, so Premium correctly sees the same locked/upgrade screen as Free.
- **1 credit/month**, calendar-month reset (1st UTC), no rollover, reserved atomically at enqueue time (`{userId, monthKey}` partial-unique index) — deducts on enqueue, refunds only on a genuine generation failure, not on a user-visible QA-fail-then-retry.
- **Free-tier sample viewer** (`GET /reports/sample`): mints a hidden fresh 1-hour presigned link to one static shared PDF in the private bucket; the button hides gracefully if the sample object hasn't been uploaded yet.
- **Mobile hub** is one state-driven screen: `loading | generate | free-locked | paid-cap | generating | ready | expired | failed | error`, all driven by server responses, never a client tier guess. Share re-fetches a fresh secure link, downloads the PDF locally via `expo-file-system`, and shares the local file via `react-native-share` (`failOnCancel:false` + the shared `isShareDismissal` gate) — fixed from an earlier version that only shared marketing text. Open always mints a fresh link. Rebuild re-renders from the persisted inject payload for free (no new Fable call, no credit charge) — an `asOf`-faithful "regenerate the same report" path.
- **v1 = self-report generation only.** The "someone else" path (typed subject data, minors via `SUBJECT_TYPE=child`, still no third-party palm) is fully designed and turn-on-ready but deliberately deferred to the end of internal testing.

## Shared with R7

The numerology **Y-as-vowel** rule (Sid, 2026-07-16: always-vowel project-wide) landed as part of R9's numerology step — one `NUMEROLOGY_VERSION` bump + backfill used by both R7 and R9.

## Remaining ship path (non-code)

R9 is feature-complete and prod-dark. Final gates: flip `REPORT_WORKER_ENABLED=true` in production (after a report-length nudge, a Fable spot-check, and an email-link re-confirm — all folded into step-9 testing); upload the actual sample PDF to its R2 key (an owner action, tracked in `owner-actions.md`); a final review pass. `R2_REPORTS_*` env vars are used in code but **not yet documented** in `.env.example` — see `setup/environment.md`.

## Confidential assets (gitignored, never committed)

The generation prompt, the sample PDF, and an open-items tracker are excluded via `.gitignore` — same access-control posture as R7's timing rule set (also confirmed present on disk at `server/config/timing/`, contents not read by tooling).
