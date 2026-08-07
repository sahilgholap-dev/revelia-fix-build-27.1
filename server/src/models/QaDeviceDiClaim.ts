import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * R7 Conversational Q&A (Build 27) — §13f / D5: per-device free-Deep-Insight
 * anti-farming claim.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────────
 * The free monthly Deep Insight is the single most expensive Q&A call (Fable 5).
 * The per-ACCOUNT DI sub-cap (`qa-caps.service`) already caps it at 1/free-account/
 * month, but a single physical device could farm unlimited free DI by creating new
 * accounts. This collection adds the per-DEVICE dimension: at most ONE free DI per
 * physical device per UTC month, across ANY account.
 *
 * ── PRIVACY (owner-actions D5 launch) ─────────────────────────────────────────
 * The RAW device id (Android SSAID / iOS IDFV) is NEVER stored and NEVER logged.
 * Only a SERVER-SIDE salted hash `sha256(QA_DEVICE_SALT + rawId)` is persisted
 * (`deviceHash`). The salt lives only in the `QA_DEVICE_SALT` env; rotating it
 * invalidates every stored hash (acceptable — a claim covers a single month).
 *
 * ── RETENTION ─────────────────────────────────────────────────────────────────
 * A claim only gates the CURRENT UTC month, so rows are worthless after ~a month.
 * A TTL index purges each row 60 days after `createdAt` (the plan's "purge after 60
 * days of inactivity" — a claim is written once per device/month, so createdAt-age
 * IS its inactivity age).
 */

export interface IQaDeviceDiClaim extends Document {
  _id: Types.ObjectId;
  /** `sha256(QA_DEVICE_SALT + rawDeviceId)` — the RAW id is never stored. */
  deviceHash: string;
  /** UTC month key `YYYY-MM` the free DI was claimed in. */
  monthKey: string;
  /** Claim instant; also the TTL anchor (row purged 60 days later). */
  createdAt: Date;
}

const qaDeviceDiClaimSchema = new Schema<IQaDeviceDiClaim>(
  {
    deviceHash: { type: String, required: true },
    monthKey: { type: String, required: true },
    // Explicit (not schema `timestamps`) so the TTL index below anchors on it.
    createdAt: { type: Date, required: true },
  },
  { collection: 'qa_device_di_claims' }
);

// At most ONE claim per { device, UTC month } — the single gate a second account on
// the same device hits. Unique so the record path can upsert idempotently and a
// concurrent double-insert collapses (E11000) to one row.
qaDeviceDiClaimSchema.index({ deviceHash: 1, monthKey: 1 }, { unique: true });

// Retention: purge each claim 60 days after it was written (a monthly window is all
// it ever gates). 60 days × 24h × 3600s = 5,184,000s.
qaDeviceDiClaimSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

export const QaDeviceDiClaim = mongoose.model<IQaDeviceDiClaim>(
  'QaDeviceDiClaim',
  qaDeviceDiClaimSchema
);
