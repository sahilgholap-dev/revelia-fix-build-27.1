import api from '@/lib/api';

/**
 * Personalized Cosmic Report — mobile API + DTO types (R9 §14 step 9).
 *
 * Consumes the LIVE endpoints shipped in steps 3b/8/9 with NO backend change of
 * shape:
 *   POST /reports {subject:'self'}   → 201 { reportId, status } | 402 (tier-split)
 *   GET  /reports/:id                → the report DTO (mints a FRESH 1h secureLink)
 *   GET  /reports                    → history (link-less)
 *   GET  /reports/credit             → { tier, used, limit, remaining, resetsAt }
 *   POST /reports/:id/rebuild        → 202 (free rebuild; no re-Fable, no credit)
 *
 * The base URL already carries `/api`, so paths here are `/reports…`.
 */

export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed';
export type ReportTier = 'free' | 'premium' | 'premium_plus';

export interface ReportHighlights {
  headline?: string;
  summary?: string;
  keyPoints?: string[];
}

export interface Report {
  _id: string;
  subject: 'self' | 'other';
  subjectType: 'adult' | 'child';
  status: ReportStatus;
  failureReason?: string;
  /** Freshly-minted 1h presigned link (only on GET /:id, never cached/persisted). */
  secureLink?: string;
  /** `ready` but the 60-day R2 PDF is gone → offer the free rebuild. */
  expired?: boolean;
  /** A free rebuild is in progress (poll signal; report stays `ready`). */
  regenerating?: boolean;
  /** QA-computed page count (Ready-screen meta). */
  pageCount?: number;
  highlights?: ReportHighlights;
  createdAt: string;
  generatedAt?: string;
}

export interface ReportCredit {
  tier: ReportTier;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string; // ISO
}

export type CreateReportResult =
  | { ok: true; reportId: string; status: ReportStatus }
  // 402 — BOTH free-lock and paid-cap; only `tier`/`resetsAt` distinguish them.
  | { ok: false; tier: ReportTier; resetsAt?: string; locked: boolean };

export type RebuildResult =
  | { ok: true; report: Report }
  | { ok: false; reason: 'cannot_rebuild' | 'error' };

/**
 * GET /reports/sample — a fresh presigned link to the STATIC Monty sample report
 * (the free-tier "see before you buy" surface + the paid entry's "View Sample
 * Reading"). Resolves `{ ok:false }` — never throws — when the asset isn't
 * provisioned yet / R2 is unconfigured, so the caller simply hides the button.
 */
export type SampleReportResult = { ok: true; secureLink: string } | { ok: false };
export async function getReportSample(): Promise<SampleReportResult> {
  try {
    const res = await api.get<{ secureLink: string }>('/reports/sample');
    if (!res.success || !res.data?.secureLink) return { ok: false };
    return { ok: true, secureLink: res.data.secureLink };
  } catch {
    // 404/503 (asset/R2 not provisioned) or any transient error → hide the button.
    return { ok: false };
  }
}

/** GET /reports/credit — the entry/landing signal (tier + remaining + reset). */
export async function getReportCredit(): Promise<ReportCredit> {
  const res = await api.get<ReportCredit>('/reports/credit');
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to load report credit');
  return res.data;
}

/** GET /reports — history (newest first, link-less). */
export async function getReportHistory(): Promise<Report[]> {
  const res = await api.get<Report[]>('/reports');
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to load reports');
  return res.data;
}

/** GET /reports/:id — a single report with a fresh secureLink / expired state. */
export async function getReport(id: string): Promise<Report> {
  const res = await api.get<Report>(`/reports/${id}`);
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to load report');
  return res.data;
}

/**
 * POST /reports — enqueue a self report. Resolves to a discriminated result:
 * `{ok:true}` on 201, or `{ok:false, ...}` on 402 (locked=free, else paid-cap).
 * Any other error throws.
 */
export async function createReport(): Promise<CreateReportResult> {
  try {
    const res = await api.post<{ reportId: string; status: ReportStatus }>('/reports', {
      subject: 'self',
    });
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to start report');
    return { ok: true, reportId: res.data.reportId, status: res.data.status };
  } catch (err: any) {
    if (err?.response?.status === 402) {
      const body = err.response.data || {};
      const tier: ReportTier = body.tier || 'free';
      // LOCKED (feature not available to this tier) vs paid-cap (used this
      // month). The report is Premium-Plus-only, so free AND premium come back
      // with limit 0 → locked; only premium_plus can hit the used-up cap
      // (limit 1, used 1). Key on the server's `limit`, not the tier name.
      const locked = (body.limit ?? 0) === 0;
      return { ok: false, tier, resetsAt: body.resetsAt, locked };
    }
    throw err;
  }
}

/**
 * POST /reports/:id/rebuild — free rebuild of an expired PDF (from the stored
 * interpretation; no re-Fable, no credit). 202 → poll GET /:id with rebuild copy.
 */
export async function rebuildReport(id: string): Promise<RebuildResult> {
  try {
    const res = await api.post<Report>(`/reports/${id}/rebuild`, {});
    if (!res.success || !res.data) return { ok: false, reason: 'error' };
    return { ok: true, report: res.data };
  } catch (err: any) {
    if (err?.response?.status === 409) return { ok: false, reason: 'cannot_rebuild' };
    return { ok: false, reason: 'error' };
  }
}
