import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Report, IReport, ReportSubject } from '../models/Report';
import { getEffectiveTier } from '../utils/subscriptionTier';
import { SubscriptionTier } from '../types/shared';
import { Report as ReportDTO } from '../types/shared';
import { PDF_KEY_STUB } from '../services/report.service';
import {
  getReportSignedUrl,
  reportObjectExists,
  isReportDeliveryConfigured,
  SAMPLE_REPORT_KEY,
} from '../services/report-delivery.service';
import { logger } from '../utils/logger';

/**
 * IN-APP secureLink TTL (R9 §14 step 8, DELIVERY MODEL). Short — the link is
 * minted FRESH on every GET, so it only needs to outlive the immediate open +
 * download. NOT the durable mechanism (the app re-signs on every view, day
 * 1–59); NOT the emailed link (that is ~7 days, minted once).
 */
const GET_SECURELINK_TTL_SECONDS = 60 * 60; // 1h

/**
 * Build 27 R9 §14 step 3b — the HTTP surface that GATES + ENQUEUES the
 * Personalized Cosmic Report.
 *
 * ASYNC: POST creates a `queued` Report and returns immediately; the cron-claim
 * worker (step 4) runs the generation later. v1 is SELF-only — `subject:'other'`
 * is rejected (Phase D).
 *
 * CREDIT = RESERVE-AT-ENQUEUE, enforced ATOMICALLY by the DB (§6 / §12-D3 /
 * §14 step 3, reconciled). The `queued` doc created here counts immediately,
 * reserving the month's credit; a concurrent double-enqueue is stopped by the
 * partial unique index on `{ userId, monthKey }` (a 2nd insert throws E11000).
 * `countDocuments(...)` below is DISPLAY-ONLY (the "N remaining this month"
 * number) — it NEVER gates the enqueue. Enforcement is the index.
 */

// v1 report allowance. PREMIUM PLUS ONLY gets 1/month; Free AND Premium are
// locked (no doc ever created) — Sid's directive (2026-07-25): the Personalized
// Cosmic Report is a Premium-Plus-exclusive PDF. Kept as a function so a future
// credit-pack / tier tweak is a one-line change.
function reportLimitForTier(tier: SubscriptionTier): number {
  return tier === 'premium_plus' ? 1 : 0;
}

// ── UTC month helpers (the plan mandates UTC — §6 "computed in UTC"). The
// house `getCurrentMonthRange()` (reading.controller.ts:228) uses LOCAL time;
// on Railway (UTC) that coincides with UTC, but here we pin UTC explicitly so
// the display count and the immutable `monthKey` resolve to the IDENTICAL
// bucket regardless of the server timezone. ──
function getUtcMonthKey(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getUtcMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** DISPLAY-ONLY non-failed report count for the current UTC month. NOT the gate. */
async function countUsedThisMonth(userId: string, now: Date = new Date()): Promise<number> {
  const { start, end } = getUtcMonthRange(now);
  return Report.countDocuments({
    userId,
    status: { $ne: 'failed' },
    createdAt: { $gte: start, $lt: end },
  });
}

/** Map a Report doc (or lean object) to the mobile-read DTO. Server-only
 *  internals (pdfKey, usage, costEstimate, modelUsed, otherSubject,
 *  reportEmailSentAt) are NEVER surfaced. `secureLink` is minted FRESH per
 *  request (step 8) and passed in via `extra` — NEVER read from a persisted
 *  stale value. `expired` marks a `ready` report whose stored object is gone
 *  (past the 60-day lifecycle); regenerate-handling is a step-9 decision. */
function toReportDTO(
  r: Pick<IReport,
    '_id' | 'subject' | 'subjectType' | 'status' | 'failureReason' | 'highlights'
    | 'createdAt' | 'generatedAt' | 'regenerating' | 'pageCount'>,
  extra: { secureLink?: string; expired?: boolean } = {}
): ReportDTO {
  return {
    _id: r._id.toString(),
    subject: r.subject,
    subjectType: r.subjectType,
    status: r.status,
    failureReason: r.failureReason,
    // Minted from pdfKey via getReportSignedUrl at GET-time, never a persisted
    // stale value (presigned links expire; a link stored at generation time is
    // dead by the time an older report is opened).
    secureLink: extra.secureLink,
    expired: extra.expired || undefined,
    // Step 9 DO 8 — free rebuild in progress (mobile "rebuilding" poll signal).
    regenerating: r.regenerating || undefined,
    // Step 9 DO 4 — QA-computed page count (Ready-screen meta).
    pageCount: r.pageCount,
    highlights: r.highlights,
    createdAt: new Date(r.createdAt).toISOString(),
    generatedAt: r.generatedAt ? new Date(r.generatedAt).toISOString() : undefined,
  };
}

/**
 * Resolve the fresh per-request delivery state for a report: a freshly-minted
 * short-TTL `secureLink` when the stored object is live, or `expired:true` when
 * it is gone (past the 60-day R2 lifecycle). Only meaningful for a `ready` report
 * with a REAL pdfKey. Never throws — a delivery hiccup must not 500 the GET, so
 * on any error we return neither (the report metadata still renders).
 */
async function resolveDeliveryState(
  doc: Pick<IReport, '_id' | 'status' | 'pdfKey'>
): Promise<{ secureLink?: string; expired?: boolean }> {
  if (doc.status !== 'ready' || !doc.pdfKey || doc.pdfKey === PDF_KEY_STUB) return {};
  if (!isReportDeliveryConfigured()) return {};
  try {
    // RE-ACCESS = RE-SIGN (free), NEVER re-generate. Confirm the object still
    // exists (presigning cannot detect the lifecycle deletion) → mint a fresh
    // link; a gone object → an "expired" state (step-9 regenerate decision).
    const exists = await reportObjectExists(doc.pdfKey);
    if (!exists) return { expired: true };
    const secureLink = await getReportSignedUrl(doc.pdfKey, GET_SECURELINK_TTL_SECONDS);
    return { secureLink };
  } catch (err) {
    logger.error('resolveDeliveryState error:', {
      reportId: doc._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
    return {};
  }
}

/** Build the 402 cap payload — R7's convention (metadata top-level alongside
 *  success/error; mirrors subscription.middleware.ts's top-level style). Used
 *  for BOTH the free-locked and the paid-over-limit responses (matches R7,
 *  which chose 402 as the net-new cap code — R7-QA.md:87/161/163). */
function buildLimitPayload(opts: {
  tier: SubscriptionTier;
  used: number;
  limit: number;
  resetsAt: Date;
  locked: boolean;
}) {
  const { tier, used, limit, resetsAt, locked } = opts;
  const resetLabel = resetsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return {
    success: false,
    error: 'limit_reached',
    scope: 'report',
    tier,
    used,
    limit,
    resetsAt: resetsAt.toISOString(),
    upgrade: {
      targetTier: locked ? 'premium_plus' : tier,
      cta: locked
        ? 'Upgrade to unlock your Personalized Cosmic Report.'
        : `You've used this month's Personalized Cosmic Report. It resets on ${resetLabel}.`,
      upgradeUrl: 'revelia://paywall',
    },
  };
}

/**
 * POST /api/reports  { subject: 'self' }
 * Tier gate → atomic credit reserve → create `queued` Report → return reportId.
 * v1 rejects `subject:'other'` (Phase D).
 */
export async function createReport(req: Request, res: Response): Promise<void> {
  const userId = req.user!._id.toString();
  try {
    const subject: ReportSubject = req.body?.subject ?? 'self';

    // v1 is SELF-only. Reject the someone-else path (Phase D) explicitly.
    if (subject === 'other') {
      res.status(400).json({
        success: false,
        error: 'not_available',
        message: 'Generating a report for someone else is not available yet.',
      });
      return;
    }
    if (subject !== 'self') {
      res.status(400).json({ success: false, error: 'invalid_subject' });
      return;
    }

    // Tier gate. Free → LOCKED (402), and NO Report doc is created
    // ("no report ever generated for a free user", spec §3).
    const tier = getEffectiveTier(req.user!);
    const limit = reportLimitForTier(tier);
    const now = new Date();
    const { end } = getUtcMonthRange(now);

    if (limit === 0) {
      res.status(402).json(
        buildLimitPayload({ tier, used: 0, limit, resetsAt: end, locked: true })
      );
      return;
    }

    // ATOMIC RESERVE. The create IS the credit reservation: the partial unique
    // index on { userId, monthKey } lets at most one non-failed report exist per
    // user per UTC month. A concurrent 2nd enqueue throws E11000 → over-limit.
    const monthKey = getUtcMonthKey(now);
    try {
      const doc = await Report.create({
        userId,
        subject: 'self',
        subjectType: 'adult', // v1 self path is adult-only; child rules are Phase D
        monthKey,
        status: 'queued',
        attempts: 0,
      });

      res.status(201).json({
        success: true,
        data: { reportId: doc._id.toString(), status: doc.status },
      });
    } catch (err: any) {
      // Duplicate-key from the partial unique index = the month's slot is
      // already reserved (a concurrent enqueue won the race, or one exists).
      if (err?.code === 11000) {
        const used = await countUsedThisMonth(userId, now);
        res.status(402).json(
          buildLimitPayload({ tier, used, limit, resetsAt: end, locked: false })
        );
        return;
      }
      throw err;
    }
  } catch (error: any) {
    logger.error('Create report error:', { userId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create report' });
  }
}

/**
 * GET /api/reports/:id
 * Owner-only Report DTO. 404 if not found, 403 for another user's report.
 */
export async function getReport(req: Request, res: Response): Promise<void> {
  const userId = req.user!._id.toString();
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ success: false, error: 'not_found' });
      return;
    }

    const doc = await Report.findById(id).lean<IReport | null>();
    if (!doc) {
      res.status(404).json({ success: false, error: 'not_found' });
      return;
    }
    if (doc.userId.toString() !== userId) {
      res.status(403).json({ success: false, error: 'forbidden' });
      return;
    }

    // Mint a FRESH presigned secureLink per request from the stored object (the
    // durable in-app path, day 1–59) — or flag `expired` if the object is gone.
    const delivery = await resolveDeliveryState(doc);
    res.status(200).json({ success: true, data: toReportDTO(doc, delivery) });
  } catch (error: any) {
    logger.error('Get report error:', { userId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve report' });
  }
}

/**
 * GET /api/reports
 * The user's report history (DTO list, newest first).
 */
export async function getReportHistory(req: Request, res: Response): Promise<void> {
  const userId = req.user!._id.toString();
  try {
    const docs = await Report.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean<IReport[]>();

    // History is link-less by design (no per-item presign/HEAD fan-out) — the
    // mobile results screen fetches the individual report (GET /:id) to mint a
    // fresh secureLink when the user opens one.
    res.status(200).json({ success: true, data: docs.map((d) => toReportDTO(d)) });
  } catch (error: any) {
    logger.error('Get report history error:', { userId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve report history' });
  }
}

/**
 * POST /api/reports/:id/rebuild  (R9 §14 step 9 DO 8 — FREE rebuild)
 *
 * Rebuild an EXPIRED report's PDF from the STORED interpretation — NO re-Fable and
 * NO credit charge. The interpretation + the DO-7 inject payload are the durable
 * asset; the R2 PDF is a regenerable 60-day cache. This endpoint ONLY marks the
 * report claimable — the EXISTING async worker does the LibreOffice render off the
 * API request path (RAM/timeout safety on the single live backend).
 *
 * ⚠️ CREDIT-SAFE BY CONSTRUCTION: the report NEVER leaves `status:'ready'` during a
 * rebuild — only the additive `regenerating` flag toggles. So the partial unique
 * index (the credit lock) is untouched, `monthKey`/`reportEmailSentAt` are never
 * rewritten, and a rebuild FAILURE can never mark the report `failed` (which would
 * refund a credit the user already consumed). The atomic `regenerating:{$ne:true}
 * → true` set is BOTH the trigger and the concurrent-rebuild / double-tap guard: a
 * second tap matches nothing.
 */
export async function rebuildReport(req: Request, res: Response): Promise<void> {
  const userId = req.user!._id.toString();
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ success: false, error: 'not_found' });
      return;
    }

    // ATOMIC claim = trigger + double-tap guard. Eligible only when the report is
    // the owner's, `ready`, NOT already rebuilding, and has BOTH the stored
    // interpretation AND the DO-7 inject payload (so the rebuild is faithful and
    // never needs Fable). A concurrent 2nd tap matches nothing (regenerating true).
    const claimed = await Report.findOneAndUpdate(
      {
        _id: id,
        userId,
        status: 'ready',
        regenerating: { $ne: true },
        interpretation: { $exists: true, $nin: [null, ''] },
        injectPayload: { $exists: true, $ne: null },
      },
      { $set: { regenerating: true } },
      { new: true }
    ).lean<IReport | null>();

    if (claimed) {
      // Accepted — the worker will render → QA → upload and clear `regenerating`.
      // Mobile reuses the generating-poll UI (GET /:id) with "rebuilding" copy.
      res.status(202).json({ success: true, data: toReportDTO(claimed) });
      return;
    }

    // Not claimed — diagnose why so mobile can show the right message.
    const doc = await Report.findById(id).lean<IReport | null>();
    if (!doc) {
      res.status(404).json({ success: false, error: 'not_found' });
      return;
    }
    if (doc.userId.toString() !== userId) {
      res.status(403).json({ success: false, error: 'forbidden' });
      return;
    }
    if (doc.regenerating) {
      // Already rebuilding (a prior tap won the race) — idempotent success.
      const delivery = await resolveDeliveryState(doc);
      res.status(202).json({ success: true, data: toReportDTO(doc, delivery) });
      return;
    }
    // Ready-but-not-eligible = no stored interpretation/payload (e.g. a report
    // generated before DO-7 shipped), or not `ready`. Cannot rebuild for free.
    res.status(409).json({
      success: false,
      error: 'cannot_rebuild',
      message: "This report can't be rebuilt.",
    });
  } catch (error: any) {
    logger.error('Rebuild report error:', { userId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to rebuild report' });
  }
}

/**
 * GET /api/reports/sample
 *
 * A fresh short-TTL presigned link to the STATIC Monty Adams sample report,
 * shown to ALL users — the free-tier "see before you buy" surface and the paid
 * entry's "View Sample Reading" (R9 spec §2/§3.2/§3.3/§5; step-9 mockup screen
 * 4 "Sample stays viewable"). Not user-scoped: one shared, pre-uploaded object
 * in the private reports bucket, re-signed per request like a real report.
 *
 * GRACEFUL when the asset is not yet provisioned (owner upload pending) or R2 is
 * unconfigured: a non-200 with `sample_unavailable` so mobile simply hides the
 * button instead of erroring — the sample is additive, never a hard gate.
 */
export async function getSampleReport(_req: Request, res: Response): Promise<void> {
  try {
    if (!isReportDeliveryConfigured()) {
      res.status(503).json({ success: false, error: 'sample_unavailable' });
      return;
    }
    // Confirm the shared object exists before minting a link (presigning never
    // touches R2, so a missing asset would otherwise hand back a link that 404s).
    const exists = await reportObjectExists(SAMPLE_REPORT_KEY);
    if (!exists) {
      res.status(404).json({ success: false, error: 'sample_unavailable' });
      return;
    }
    const secureLink = await getReportSignedUrl(SAMPLE_REPORT_KEY, GET_SECURELINK_TTL_SECONDS);
    res.status(200).json({ success: true, data: { secureLink } });
  } catch (error: any) {
    logger.error('Get sample report error:', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to load sample report' });
  }
}

/**
 * GET /api/reports/credit
 * { remaining, limit, resetsAt } for the mobile entry screen
 * ("1 credit remaining this month"). `remaining` = limit − the DISPLAY count.
 */
export async function getReportCredit(req: Request, res: Response): Promise<void> {
  const userId = req.user!._id.toString();
  try {
    const tier = getEffectiveTier(req.user!);
    const limit = reportLimitForTier(tier);
    const now = new Date();
    const { end } = getUtcMonthRange(now);
    const used = await countUsedThisMonth(userId, now);

    res.status(200).json({
      success: true,
      data: {
        tier,
        used,
        limit,
        remaining: Math.max(0, limit - used),
        resetsAt: end.toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Get report credit error:', { userId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to check report credit' });
  }
}
