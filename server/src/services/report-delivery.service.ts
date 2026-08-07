/**
 * Report DELIVERY seam — R9 Personalized Cosmic Report (Build 27), charter §14
 * STEP 8 + §12-D5 (buffer-upload + private-path/TTL link) + D7 (private bucket).
 *
 * ── WHY A SEPARATE CLIENT (not r2.service.ts) ─────────────────────────────────
 * The public images client (`r2.service.ts`) is scoped to the PUBLIC
 * `revelia-images` bucket + its long-lived public URL. Reports are PRIVATE,
 * 60-day-lifecycle objects served ONLY via short-lived presigned URLs. This
 * module builds a SEPARATE, LEAST-PRIVILEGE S3 client from the `R2_REPORTS_*`
 * envs (a scoped token that can only touch `revelia-reports`), so a leak of the
 * public images creds can never read a user's report and vice-versa. It mirrors
 * r2.service.ts's client construction but reads a distinct env namespace and has
 * NO public-URL concept.
 *
 * ── DELIVERY MODEL (the authoritative frame) ──────────────────────────────────
 * Generate ONCE (credit consumed at `ready`); the PDF lives in the private
 * bucket for 60 days (the R2 lifecycle rule). Access = mint a FRESH presigned
 * URL on demand from the STORED object — NEVER one durable stored link:
 *   • IN-APP (the durable path, day 1–59): GET /api/reports/:id mints a fresh
 *     short-TTL presigned URL PER REQUEST from the existing object.
 *   • EMAIL (one-time notification at `ready`): a presigned URL at ≤7-day TTL,
 *     best-effort, sent ONCE. After 7 days the emailed link expires — FINE,
 *     because the app re-signs on every view.
 *   • RE-ACCESS = RE-SIGN (free), NEVER re-generate. Real expiry = the 60-day
 *     R2 lifecycle deleting the object → GET finds no object → an "expired"
 *     state (regenerate-handling is a STEP-9 decision, not built here).
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { IReport } from '../models/Report';
import { logger } from '../utils/logger';

/**
 * Least-privilege reports endpoint. Supports either `R2_REPORTS_ENDPOINT` (full
 * URL) or `R2_REPORTS_ACCOUNT_ID` (constructs the cloudflarestorage URL) — the
 * same either-or the public r2.service.ts client accepts.
 */
const reportsEndpoint =
  process.env.R2_REPORTS_ENDPOINT ||
  (process.env.R2_REPORTS_ACCOUNT_ID
    ? `https://${process.env.R2_REPORTS_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);

const REPORTS_BUCKET = process.env.R2_REPORTS_BUCKET_NAME || 'revelia-reports';

const reportsClient = new S3Client({
  region: 'auto',
  endpoint: reportsEndpoint,
  credentials:
    process.env.R2_REPORTS_ACCESS_KEY_ID && process.env.R2_REPORTS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.R2_REPORTS_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_REPORTS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

/** Presigned-URL hard ceiling — AWS SigV4 caps a presigned GET at 7 days. */
export const MAX_PRESIGN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Raised when `R2_REPORTS_*` is not configured — a clear config error (never a silent stub). */
export class ReportDeliveryNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportDeliveryNotConfiguredError';
  }
}

/** True once the reports-R2 client has real creds + an endpoint. */
export function isReportDeliveryConfigured(): boolean {
  return !!(
    reportsEndpoint &&
    process.env.R2_REPORTS_ACCESS_KEY_ID &&
    process.env.R2_REPORTS_SECRET_ACCESS_KEY
  );
}

/**
 * Stable, owner-scoped object key for a report PDF: `reports/<userId>/<reportId>.pdf`.
 * Stable (same report → same key, so a re-render overwrites in place) and
 * owner-scoped (the userId prefix makes an accidental cross-user read obvious).
 */
export function reportPdfKey(report: Pick<IReport, '_id' | 'userId'>): string {
  return `reports/${report.userId.toString()}/${report._id.toString()}.pdf`;
}

/**
 * Fixed object key for the STATIC, shared Monty Adams sample report — the "see
 * before you buy" PDF shown to ALL users (free = sample only; paid entry = "View
 * Sample Reading"). ONE pre-uploaded object in the SAME private reports bucket,
 * served via a short-TTL presigned URL exactly like a user's own report — no
 * public bucket and no new creds. Not user-scoped (a single shared asset).
 * (R9 spec §2 / §3.2 / §3.3 / §5.) The asset upload is a one-time owner action.
 */
export const SAMPLE_REPORT_KEY = 'samples/cosmic-report-sample.pdf';

/**
 * Upload the QA-passed PDF buffer to the PRIVATE reports bucket.
 * `application/pdf` (r2.service.ts's `uploadImage` is JPEG-only — D5's
 * buffer-upload path). Returns the object key (persisted as the report's pdfKey;
 * this real key — ≠ the 'STUB' sentinel — is what authorizes `ready`).
 */
export async function uploadReportPdf(
  pdf: Buffer,
  report: IReport
): Promise<{ pdfKey: string }> {
  if (!isReportDeliveryConfigured()) {
    throw new ReportDeliveryNotConfiguredError(
      '[report-delivery] R2_REPORTS_* not configured (endpoint/account-id + access key + secret required)'
    );
  }

  const pdfKey = reportPdfKey(report);
  await reportsClient.send(
    new PutObjectCommand({
      Bucket: REPORTS_BUCKET,
      Key: pdfKey,
      Body: pdf,
      ContentType: 'application/pdf',
    })
  );
  logger.info(
    `[report-delivery] uploaded report ${report._id.toString()} → ${REPORTS_BUCKET}/${pdfKey} (${pdf.length} bytes)`
  );
  return { pdfKey };
}

/**
 * Mint a FRESH presigned GET URL for a stored report PDF. The private-bucket
 * analog of r2.service.ts's dead `getSignedUrl`. TTL is clamped to the SigV4
 * 7-day ceiling. NEVER persisted — minted on demand (per GET request / once per
 * email) so a re-access always re-signs the existing object.
 */
export async function getReportSignedUrl(
  pdfKey: string,
  ttlSeconds: number
): Promise<string> {
  if (!isReportDeliveryConfigured()) {
    throw new ReportDeliveryNotConfiguredError(
      '[report-delivery] R2_REPORTS_* not configured; cannot mint a secure link'
    );
  }
  const expiresIn = Math.max(1, Math.min(ttlSeconds, MAX_PRESIGN_TTL_SECONDS));
  return getS3SignedUrl(
    reportsClient,
    new GetObjectCommand({ Bucket: REPORTS_BUCKET, Key: pdfKey }),
    { expiresIn }
  );
}

/**
 * Does the stored report object still exist? Presigning never touches R2, so it
 * cannot detect the 60-day-lifecycle deletion — a HEAD does. GET /api/reports/:id
 * uses this to distinguish a live report (mint a fresh link) from an "expired"
 * one (object gone → step-9 regenerate decision, NOT built here). A NotFound/404
 * → false; any other error propagates (treat an unknown failure as a real error,
 * not as "expired").
 */
export async function reportObjectExists(pdfKey: string): Promise<boolean> {
  try {
    await reportsClient.send(
      new HeadObjectCommand({ Bucket: REPORTS_BUCKET, Key: pdfKey })
    );
    return true;
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err?.name === 'NotFound' || err?.name === 'NoSuchKey') {
      return false;
    }
    throw err;
  }
}
