import { schedule } from 'node-cron';
import { Report, IReport } from '../models/Report';
import { logger } from '../utils/logger';
import { generateReport, deliverReportReadyEmail, PDF_KEY_STUB } from '../services/report.service';
import { ReportInjectValidationError } from '../services/report-inject.service';
import { ReportQaFailedError } from '../services/report-render.service';

/**
 * Build 27 R9 §14 step 4 — the async report WORKER (the claim + state machine).
 *
 * 3b (commit 48ddb08) landed the enqueue API: a paid POST atomically creates a
 * `queued` Report reserved by the partial unique index on `{ userId, monthKey }`
 * (status ∈ {queued,generating,ready}). Nothing advances a `queued` doc yet —
 * THIS module is the worker that claims one and runs it through the lifecycle:
 *
 *     queued ──claim──▶ generating ──success──▶ ready   (slot held; 1/month)
 *                          │
 *                          ├─transient fail (attempts < MAX)──▶ queued (retry)
 *                          └─terminal fail  (attempts >= MAX)──▶ failed (REFUND)
 *
 * ⚠️ STATE TRANSITIONS ARE THE CREDIT MODEL (§6). `failed` drops out of the
 * partial unique index → the month's reserved slot is auto-refunded → a new
 * enqueue for that user/month succeeds. `ready`/`generating` stay in the index →
 * the slot is held → 1/month enforced. `generatedAt` is the COMPLETION stamp
 * written on `ready`, NOT a credit field. The worker MUTATES ONLY the generation
 * fields (status/attempts/generatedAt/failureReason/highlights/pdfKey and, later,
 * secureLink/linkExpiresAt) — it NEVER inserts a doc (3b invariant a) and NEVER
 * rewrites `monthKey` (moving the lock would double-lock or leak a slot).
 *
 * ⚠️ PROD-DARK (REPORT_WORKER_ENABLED, default OFF). `startReportWorker()`
 * registers the crons ONLY when `REPORT_WORKER_ENABLED === 'true'` (mirrors the
 * `SYNTHESIS_FABLE_ENABLED` convention in CLAUDE.md). While OFF, nothing is
 * claimed — a `queued` doc just sits. This keeps the single live backend dark
 * until steps 5-8 wire real generation content + renderer + QA + delivery.
 *
 * ⚠️ THE WORKER IS A SKELETON. `generateReportArtifacts` is a STUB that returns
 * a synthetic placeholder (`pdfKey: 'STUB'`). NO real astronomy/numerology
 * inject, NO Fable call, NO renderer, NO QA gate, NO delivery — those are steps
 * 5-8. See the STEP-5/6/7 seam markers in the stub.
 */

/**
 * MAX_ATTEMPTS — terminal-failure ceiling. A report that fails on this many
 * CLAIMS becomes `failed` (slot refunded). Tunable. `attempts` is incremented
 * exactly ONCE per claim (in the atomic findOneAndUpdate below) and NOWHERE
 * else — incrementing again on the failure write would halve the effective
 * ceiling.
 */
const MAX_ATTEMPTS = 3;

/**
 * GENERATION_TIMEOUT_MS — a `generating` doc whose `updatedAt` is older than
 * this is considered stale (worker crashed / box restarted mid-generation) and
 * is un-stuck by the sweep. GENEROUS by design: real Fable long-form + the
 * LibreOffice render time is unknown until step 6, so 20 min is a deliberate
 * over-estimate. Tunable (see build-27-caveats.md).
 *
 * ⚠️ STEP-5 DEPENDENCY (sweep/tick idempotency — do NOT solve here): once step 5
 * wires a real Fable call, the sweep re-queuing a doc whose generation is STILL
 * ACTUALLY RUNNING (slow, not crashed) → a later tick re-claims it → two
 * generations run for one report = a DOUBLE-SPEND of API cost. With this stub it
 * is invisible (fast, no external effect). Step 5 MUST make generation
 * idempotent per report (or the sweep timeout must provably exceed true max
 * generation time) — otherwise sweep + tick double-run and double-bill.
 */
const GENERATION_TIMEOUT_MS = 20 * 60 * 1000;

/**
 * How many reports to process per worker tick. RECOMMEND ONE (serialize):
 * Fable long-form + a LibreOffice render is CPU-heavy on the single box, and
 * 1/tick (with a 1-minute cron) far exceeds the 1/user/month demand. Tunable.
 */
const REPORTS_PER_TICK = 1;

/** The shape the generation seam returns. */
export interface GeneratedArtifacts {
  highlights?: IReport['highlights'];
  /**
   * The R2 key of the rendered, QA-passed PDF (minted by the step-8 upload seam).
   * ⚠️ A report MUST NOT go `ready` without a REAL pdfKey — one that is present AND
   * ≠ the `'STUB'` sentinel (see the ready-authorizer guard). Step 7 retired the
   * STUB sentinel as the authorizer: a QA-PASS + a real pdfKey is now what
   * authorizes `ready`. Until step 8's real uploader replaces the default upload
   * stub, `generateReport`'s default path throws before returning a pdfKey, so no
   * report can reach `ready` in prod — correct: prod-dark.
   */
  pdfKey?: string;
}

export type ArtifactGenerator = (report: IReport) => Promise<GeneratedArtifacts>;

/**
 * ── THE GENERATION SEAM ──────────────────────────────────────────────────────
 * Steps 5-7 replace the BODY of this function, NOT the state machine around it.
 * Keep it the single obvious injection point.
 *
 *   ── STEP 5 SEAM: astronomy+numerology inject → Fable interpretation — DONE (5b) ──
 *      `reportService.generateReport(report)` computes the isolated-sidereal
 *      ASTRONOMY_JSON + the injected NUMEROLOGY_JSON (compute-once-inject; explicit
 *      allow-list, NO face fields) + self-palm traits, then calls the `report`
 *      Fable-5 synthesis surface (Fable 5 → Opus 4.8, high effort) which WRITES
 *      interpretation only (never arithmetic). It is NONCE-IDEMPOTENT: a re-claim
 *      of a report whose generation already completed reuses the persisted
 *      interpretation and never re-bills. A `ReportInjectValidationError` (bad/
 *      absent data) propagates and is routed to the terminal fail-fast path below;
 *      a transient Fable/API error takes the retry path. It STILL returns
 *      `pdfKey:'STUB'` (the renderer is step 6), so the worker stays prod-dark.
 *      (The Sid-gated prompt reconciliation prerequisite — NUMEROLOGY_JSON slot +
 *      consume-not-compute + always-vowel — landed 2026-07-20, owner-actions.md.)
 *
 *   ── STEP 6/7 SEAM: renderer → PDF+charts → QA gate — DONE (step 7) ──
 *      `generateReport` renders the interpretation to a PDF (renderReportPdf, 6a:
 *      matplotlib SVG charts + `docx` → LibreOffice `soffice`), QA-GATES it
 *      (page count 17-26 / section manifest / em+en-dash scan / zero face content /
 *      ≥3 chart images [dpi-200 raster accepted] / PDF opens), and on a QA-PASS
 *      hands the buffer to the UPLOAD SEAM. A CONTENT-class QA fail re-Fables
 *      (bounded, MAX_QA_REGEN); a RENDER-class fail re-renders only (no spend,
 *      MAX_RENDER_RETRY); on exhaustion it throws `ReportQaFailedError` → the
 *      state machine routes it to TERMINAL failed + slot REFUND (no credit spent).
 *
 *   ── STEP 8 SEAM: R2 upload → real pdfKey (authorizes `ready`) + ready email — DONE ──
 *      `generateReport`'s upload seam now defaults to the REAL private-R2 uploader
 *      (report-delivery.service): a QA-passed PDF → PutObject to `revelia-reports`
 *      → a stable owner-scoped pdfKey (≠ STUB) that authorizes `ready`. If
 *      `R2_REPORTS_*` is unset it throws a clear CONFIG error (never a silent
 *      stub). The presigned `secureLink` is NEVER persisted — it is minted FRESH
 *      per GET /api/reports/:id and ONCE for the report-ready email. After the
 *      `ready` write the worker fires `deliverReportReadyEmail` (below):
 *      best-effort + persisted-`reportEmailSentAt` idempotent.
 *
 * ⚠️ READY-AUTHORIZER (step 7): the STUB sentinel is RETIRED as the authorizer —
 * `ready` requires a REAL pdfKey (present AND ≠ 'STUB'). See the guard below.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function generateReportArtifacts(report: IReport): Promise<GeneratedArtifacts> {
  const { highlights, pdfKey } = await generateReport(report);
  return { highlights, pdfKey };
}

/**
 * ── THE REBUILD SEAM (R9 §14 step 9 DO 8) ────────────────────────────────────
 * Re-render an EXPIRED report's PDF from the STORED interpretation + the DO-7
 * persisted inject payload — NO re-Fable, NO credit. `generateReport` already
 * SHORT-CIRCUITS Fable when a persisted interpretation exists and reuses the
 * persisted `injectPayload` (asOf-faithful), so a rebuild is just its render →
 * QA → upload tail. We pass a `synthesize` dep that THROWS as a hard guarantee
 * that a rebuild can NEVER spend on Fable: the interpretation branch never calls
 * it (persisted), and if the bounded QA-repair loop ever tried to re-Fable, this
 * throws instead → the rebuild fails cleanly (stays expired), no spend.
 */
async function rebuildReportArtifacts(report: IReport): Promise<GeneratedArtifacts> {
  const { highlights, pdfKey } = await generateReport(report, {
    synthesize: async () => {
      throw new Error(
        'rebuild must not call Fable — expected a persisted interpretation + inject payload'
      );
    },
  });
  return { highlights, pdfKey };
}

/**
 * ⚠️ ATOMIC CLAIM (no double-processing). Claim the oldest `queued` report with a
 * single atomic findOneAndUpdate that flips it to `generating` and increments
 * `attempts` in the same DB round-trip. Two concurrent ticks (or two instances)
 * can never both claim the same doc — MongoDB serializes the update, so the
 * loser matches nothing and returns null. `attempts` is incremented ONLY here.
 *
 * Exported so steps 5+ and the offline harness can exercise the atomic claim
 * directly (two concurrent claims → exactly one non-null → DB serialization
 * proven, independent of the in-process `reportTickRunning` guard).
 */
export async function claimNextQueuedReport(): Promise<IReport | null> {
  return Report.findOneAndUpdate(
    { status: 'queued' },
    { $set: { status: 'generating' }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  );
}

let reportTickRunning = false;

/**
 * One worker tick: claim up to REPORTS_PER_TICK queued reports and run each
 * through the generation → state-machine flow. Serialized within the process by
 * the module boolean (an overlapping minute-tick returns early), and serialized
 * ACROSS processes/instances by the atomic claim.
 *
 * `generate` is injectable (defaults to the real stub) so steps 5-7 can swap in
 * the real generator and the offline harness can force failure/no-pdfKey paths
 * without editing committed code.
 */
export async function runReportWorkerTick(
  generate: ArtifactGenerator = generateReportArtifacts
): Promise<void> {
  if (reportTickRunning) return;
  reportTickRunning = true;

  try {
    for (let i = 0; i < REPORTS_PER_TICK; i++) {
      const claimed = await claimNextQueuedReport();
      if (!claimed) break; // nothing queued — done for this tick

      const reportId = claimed._id.toString();
      // `claimed.attempts` is the value AFTER the increment (new: true), so the
      // 1st claim yields attempts === 1 and terminal failure is reached at
      // exactly MAX_ATTEMPTS claims.
      const attempts = claimed.attempts;

      try {
        const artifacts = await generate(claimed);

        // ⚠️ READY-AUTHORIZER GUARD (§6 credit-correctness defense). A report MUST
        // NOT go `ready` without a REAL pdfKey — present AND ≠ the 'STUB' sentinel.
        // Step 7 RETIRED STUB as the authorizer: `ready` now requires a QA-passed
        // report that the upload seam gave a real key. Without this, an early
        // REPORT_WORKER_ENABLED=true flip (before step 8 wires the real uploader)
        // would mark reports `ready` with a fake key and consume the 1/month credit.
        if (!artifacts.pdfKey || artifacts.pdfKey === PDF_KEY_STUB) {
          throw new Error(
            `ready-requires-real-pdfKey: generation returned no real pdfKey (got '${artifacts.pdfKey ?? 'none'}')`
          );
        }

        // SUCCESS → ready. Slot stays held (ready ∈ the partial index) → 1/month.
        // NO secureLink persisted — it is minted FRESH per GET (controller) and
        // once for the ready email (DELIVERY MODEL: never a stored stale link).
        await Report.updateOne(
          { _id: claimed._id },
          {
            $set: {
              status: 'ready',
              generatedAt: new Date(), // COMPLETION stamp (§6), NOT a credit field
              highlights: artifacts.highlights,
              pdfKey: artifacts.pdfKey,
            },
            $unset: { failureReason: '' }, // clear any prior transient reason
          }
        );
        logger.info(
          `[ReportWorker] Report ${reportId} → ready (attempts=${attempts}, pdfKey=${artifacts.pdfKey})`
        );

        // ⚠️ STEP-8 DELIVERY (pin B) — one-time report-ready email, BEST-EFFORT +
        // PERSISTED-flag idempotent. Fired AFTER the `ready` write and OUTSIDE the
        // ready/credit path: it never flips status, never re-enters generation,
        // and a failure NEVER un-`ready`s the report (a crash between ready and the
        // email at most RE-SENDS, and the persisted reportEmailSentAt stops even
        // that). Errors are swallowed here as a final backstop (the fn is already
        // best-effort internally).
        try {
          await deliverReportReadyEmail({
            _id: claimed._id,
            userId: claimed.userId,
            pdfKey: artifacts.pdfKey,
            highlights: artifacts.highlights,
          });
        } catch (emailErr) {
          logger.error(
            `[ReportWorker] Report ${reportId} ready-email delivery error (report stays ready):`,
            emailErr
          );
        }
      } catch (err) {
        const failureReason = err instanceof Error ? err.message : String(err);

        if (err instanceof ReportInjectValidationError) {
          // ⚠️ FAIL-FAST (DO 4). Bad/absent data won't fix on retry → TERMINAL
          // immediately, WITHOUT burning MAX_ATTEMPTS. `failed` drops out of the
          // partial unique index → the month's slot is REFUNDED (never spent).
          // This is a distinct, non-retry failure from a transient Fable/API 5xx.
          await Report.updateOne(
            { _id: claimed._id },
            { $set: { status: 'failed', failureReason: `validation: ${failureReason}` } }
          );
          logger.error(
            `[ReportWorker] Report ${reportId} → FAILED (validation fail-fast, attempts=${attempts}): ${failureReason}`
          );
        } else if (err instanceof ReportQaFailedError) {
          // ⚠️ TERMINAL QA FAILURE (DO 4). `generateReport` already exhausted its
          // bounded QA repair budget (MAX_QA_REGEN re-Fables / MAX_RENDER_RETRY
          // re-renders). A re-claim would only re-render/re-Fable the same deficient
          // inputs and burn more money → fail-fast TERMINAL, do NOT retry via
          // MAX_ATTEMPTS. `failed` → the slot is REFUNDED; NO credit is spent on a
          // QA-failed report. The QA failures[] + class are captured in the reason.
          await Report.updateOne(
            { _id: claimed._id },
            {
              $set: {
                status: 'failed',
                failureReason: `qa (${err.failureClass}): ${err.failures.join('; ')}`,
              },
            }
          );
          logger.error(
            `[ReportWorker] Report ${reportId} → FAILED (QA ${err.failureClass}, attempts=${attempts}): ${err.failures.join('; ')}`
          );
        } else if (attempts >= MAX_ATTEMPTS) {
          // TERMINAL failure → failed. Drops out of the partial unique index →
          // the month's slot is REFUNDED (§6). NO attempts increment here — it
          // happened on claim.
          await Report.updateOne(
            { _id: claimed._id },
            { $set: { status: 'failed', failureReason } }
          );
          logger.error(
            `[ReportWorker] Report ${reportId} → FAILED (terminal, attempts=${attempts}/${MAX_ATTEMPTS}): ${failureReason}`
          );
        } else {
          // TRANSIENT failure → back to queued for a later tick. MUTATE, never
          // re-insert (a 2nd non-failed doc collides with the unique index). NO
          // attempts increment here.
          await Report.updateOne(
            { _id: claimed._id },
            { $set: { status: 'queued', failureReason } }
          );
          logger.warn(
            `[ReportWorker] Report ${reportId} → queued (transient retry, attempts=${attempts}/${MAX_ATTEMPTS}): ${failureReason}`
          );
        }
      }
    }
  } finally {
    reportTickRunning = false;
  }
}

let reportRebuildRunning = false;

/**
 * One REBUILD tick (R9 §14 step 9 DO 8). Claims the oldest report flagged for a
 * free rebuild (`status:'ready'` + `regenerating:true`, set atomically by the
 * rebuild route) and re-renders its PDF from the stored interpretation.
 *
 * ⚠️ CREDIT-SAFE: the report STAYS `status:'ready'` throughout — only the
 * `regenerating` flag toggles — so the credit index / `monthKey` are untouched and
 * a rebuild failure can NEVER refund a consumed credit (unlike the generation
 * failure path, which marks `failed` → refund). On success we refresh `pdfKey`
 * and clear the flag; `generatedAt` is NOT bumped (the rebuild is faithful to the
 * original reading). On failure we clear the flag and leave the report expired so
 * the user can retry.
 *
 * Double-work guards: the route's atomic `regenerating:{$ne:true}→true` set is the
 * double-TAP guard; this in-process boolean + the single live backend serialize
 * ticks so two renders of the same doc can't overlap; and even a cross-restart
 * re-render is harmless (stable pdfKey → overwrite-in-place, deterministic render,
 * no Fable, no credit). `generate` is injectable for the offline harness.
 */
export async function runReportRebuildTick(
  generate: ArtifactGenerator = rebuildReportArtifacts
): Promise<void> {
  if (reportRebuildRunning) return;
  reportRebuildRunning = true;

  try {
    const report = await Report.findOne({ status: 'ready', regenerating: true }).sort({
      updatedAt: 1,
    });
    if (!report) return; // nothing to rebuild

    const reportId = report._id.toString();
    try {
      const { pdfKey } = await generate(report);
      // A rebuild MUST produce a real pdfKey (the upload seam ran). Guard the same
      // way the ready-authorizer does.
      if (!pdfKey || pdfKey === PDF_KEY_STUB) {
        throw new Error(`rebuild returned no real pdfKey (got '${pdfKey ?? 'none'}')`);
      }
      // SUCCESS → clear the flag + refresh pdfKey. Stay `ready`; do NOT touch
      // generatedAt / monthKey / credit. The object now exists again → the next
      // GET /:id mints a fresh secureLink (expired:false).
      await Report.updateOne(
        { _id: report._id },
        { $set: { pdfKey, regenerating: false } }
      );
      logger.info(`[ReportWorker] Rebuild ${reportId} → ready (pdfKey=${pdfKey}); no Fable, no credit`);
    } catch (err) {
      // FAILURE → clear the flag; the report stays `ready` (expired — object still
      // gone) so the user can retry. NEVER mark `failed` (that would refund a
      // consumed credit). No credit impact either way.
      const reason = err instanceof Error ? err.message : String(err);
      await Report.updateOne({ _id: report._id }, { $set: { regenerating: false } });
      logger.error(
        `[ReportWorker] Rebuild ${reportId} FAILED (stays expired, no credit impact): ${reason}`
      );
    }
  } finally {
    reportRebuildRunning = false;
  }
}

let reportSweepRunning = false;

/**
 * ⚠️ STALE-GENERATING TIMEOUT SWEEP (load-bearing for credit correctness).
 *
 * A report the worker crashed on mid-generation is stuck in `generating`, which
 * stays in the partial unique index and locks the user out for the month. This
 * sweep un-sticks it: a `generating` doc whose `updatedAt` is older than
 * GENERATION_TIMEOUT_MS is flipped back to `queued` (attempts < MAX → retry) or
 * to `failed` (attempts >= MAX → refund). Staleness is detected via the
 * `timestamps: true` `updatedAt` bumped by the claim (and every mutate).
 *
 * Runs on a slower cron than the tick (every 5 min). No attempts increment here
 * (attempts move only on claim); a re-queued doc's next claim counts as its next
 * attempt.
 */
export async function runReportTimeoutSweep(): Promise<void> {
  if (reportSweepRunning) return;
  reportSweepRunning = true;

  try {
    const cutoff = new Date(Date.now() - GENERATION_TIMEOUT_MS);
    const stale = await Report.find({
      status: 'generating',
      updatedAt: { $lt: cutoff },
    });

    let requeued = 0;
    let failed = 0;

    for (const report of stale) {
      const reportId = report._id.toString();
      const failureReason = `stale generating: no progress for > ${Math.round(
        GENERATION_TIMEOUT_MS / 60000
      )} min`;

      if (report.attempts >= MAX_ATTEMPTS) {
        // Exhausted → failed (slot refunded).
        await Report.updateOne(
          { _id: report._id },
          { $set: { status: 'failed', failureReason } }
        );
        failed++;
        logger.error(
          `[ReportWorker] Sweep: report ${reportId} → FAILED (stale, attempts=${report.attempts}/${MAX_ATTEMPTS})`
        );
      } else {
        // Retry-able → back to queued for a later tick.
        await Report.updateOne(
          { _id: report._id },
          { $set: { status: 'queued', failureReason } }
        );
        requeued++;
        logger.warn(
          `[ReportWorker] Sweep: report ${reportId} → queued (stale retry, attempts=${report.attempts}/${MAX_ATTEMPTS})`
        );
      }
    }

    if (stale.length > 0) {
      logger.info(
        `[ReportWorker] Timeout sweep: stale=${stale.length} requeued=${requeued} failed=${failed}`
      );
    }

    // ⚠️ STUCK-REBUILD RECOVERY (R9 §14 step 9 DO 8). A report flagged for a free
    // rebuild (`regenerating:true`) whose worker crashed mid-render stops bumping
    // `updatedAt` → clear the flag so the user can retry. Stays `ready` (expired);
    // NO credit impact (rebuild never touches the credit index).
    const stuckRebuilds = await Report.updateMany(
      { status: 'ready', regenerating: true, updatedAt: { $lt: cutoff } },
      { $set: { regenerating: false } }
    );
    if (stuckRebuilds.modifiedCount > 0) {
      logger.warn(
        `[ReportWorker] Sweep: cleared ${stuckRebuilds.modifiedCount} stuck rebuild flag(s)`
      );
    }
  } finally {
    reportSweepRunning = false;
  }
}

/**
 * Register the worker crons — GATED behind REPORT_WORKER_ENABLED (default OFF).
 * Mirrors `startPushScheduler` (node-cron `schedule()` + a module-boolean guard
 * on each tick). Called from `index.ts` beside `startPushScheduler()`.
 *
 * OFF → no cron is registered, nothing is ever claimed (a queued doc just sits).
 */
export function startReportWorker(): void {
  if (process.env.REPORT_WORKER_ENABLED !== 'true') {
    logger.info('[ReportWorker] disabled (REPORT_WORKER_ENABLED != true)');
    return;
  }

  logger.info('[ReportWorker] enabled — registering claim tick + timeout sweep crons');

  // Claim + generate: every minute (process REPORTS_PER_TICK per tick).
  schedule('* * * * *', () => {
    runReportWorkerTick().catch((err: unknown) => {
      logger.error('[ReportWorker] tick error:', err);
    });
  });

  // Free-rebuild tick: every minute (R9 §14 step 9 DO 8). Claims a `regenerating`
  // report and re-renders from the stored interpretation (no Fable, no credit).
  schedule('* * * * *', () => {
    runReportRebuildTick().catch((err: unknown) => {
      logger.error('[ReportWorker] rebuild tick error:', err);
    });
  });

  // Stale-generating timeout sweep: every 5 minutes.
  schedule('*/5 * * * *', () => {
    runReportTimeoutSweep().catch((err: unknown) => {
      logger.error('[ReportWorker] sweep error:', err);
    });
  });
}
