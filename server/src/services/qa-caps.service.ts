/**
 * R7 Conversational Q&A (Build 27) — §13d charter STEP 3.5: question caps +
 * top-level 402 + Deep-Insight sub-caps.
 *
 * ── WHAT THIS ENFORCES (D3, PM-approved — final, not a gate) ──────────────────
 *   • Per-tier monthly caps: free 3 (1 DI) / premium 10 (3 DI) / PP 15 (8 DI).
 *   • Calendar-month reset, **UTC**, NO rollover.
 *   • The DI allowance is a SUB-cap enforced WITHIN the question cap — a Deep
 *     Insight question consumes BOTH a question slot and a DI slot.
 *
 * ── COUNTING MODEL (mirrors R9's doc-count reset; §6 convention note) ─────────
 * The month's usage is the COUNT of answered `QaTurn` rows in the current UTC
 * month — NOT a stored counter. This mirrors R9's report credit predicate
 * (`countDocuments` within a calendar-month range), needs no reset job, and is
 * immune to cron downtime. Only the credit-consuming modes count:
 *   • `reflective` / `timing`  → COUNT (a real answer was delivered / a credit
 *     was deducted; carve-outs land here as reflective and correctly count).
 *   • `crisis` / `unsafe` / `off_topic` → NEVER count (hardcoded declines cost no
 *     model call and no credit — the plan's "junk/off-topic/unsafe/crisis/router
 *     never deduct"). They are content-free rows; excluded by the mode filter.
 * The Haiku router call is not a `QaTurn` at all, so **router calls never count**
 * by construction.
 *
 * ── AT-CAP RESPONSE (top-level 402, mirrors the gate middleware) ──────────────
 * `enforceQaCaps` throws {@link QaCapExceededError} carrying the top-level 402
 * metadata `{ code, tier, remaining, resetsAt, upgradeCta }`. The controller
 * spreads it alongside `success:false` at the TOP LEVEL (NOT nested under `data`),
 * mirroring `subscription.middleware`'s `requiredTier`/`currentTier`/`upgradeUrl`
 * shape and the repo's known top-level-metadata convention.
 *
 * ── CREDIT-PACK STUB (D4 — purchase flow is v2; NOT built here) ───────────────
 * {@link getQaCreditPackBalance} is the seam for a future beyond-cap credit pack.
 * It returns 0 today (no pack can be purchased yet) and feeds the question
 * allowance additively, so a future pack just makes it return > 0 and the
 * allowance grows with NO other change. Do NOT build the purchase flow now.
 */
import { createHash } from 'crypto';
import { QaTurn } from '../models/QaTurn';
import { QaDeviceDiClaim } from '../models/QaDeviceDiClaim';
import { getEffectiveTier, TierResolvable } from '../utils/subscriptionTier';
import { SubscriptionTier } from '../types/shared';
import { logger } from '../utils/logger';

/** D3 monthly caps per tier. `questions` = total answered (reflective + timing)
 *  questions / UTC-month; `deepInsight` = the DI SUB-cap, enforced WITHIN the
 *  question cap. No rollover. */
export interface QaCapTable {
  questions: number;
  deepInsight: number;
}

export const QA_CAPS: Record<SubscriptionTier, QaCapTable> = {
  free: { questions: 3, deepInsight: 1 },
  premium: { questions: 10, deepInsight: 3 },
  premium_plus: { questions: 15, deepInsight: 8 },
};

/** The `QaTurn.mode`s that consume a credit and therefore count toward the cap.
 *  Safety declines (crisis/unsafe/off_topic) are deliberately excluded. */
export const COUNTED_QA_MODES = ['reflective', 'timing'] as const;

/** Machine code on the 402 body — distinguishes the question cap from the DI
 *  sub-cap so the client can lead with the right upgrade copy. */
export type QaCapCode = 'question_limit_reached' | 'deep_insight_limit_reached';

export interface QaRemaining {
  questions: number;
  deepInsight: number;
}

/** Top-level 402 metadata (spread alongside `success:false`, NOT under `data`). */
export interface QaCapPayload {
  code: QaCapCode;
  tier: SubscriptionTier;
  remaining: QaRemaining;
  /** ISO instant the count resets (start of the NEXT UTC month). */
  resetsAt: string;
  upgradeCta: QaUpgradeCta;
}

/** Structural upgrade CTA. Final marketing copy is a D6 build task (still to be
 *  produced) — this carries only the deep link + the tier that raises the cap
 *  (null for premium_plus, whose beyond-cap path is the v2 credit pack). */
export interface QaUpgradeCta {
  deepLink: string;
  /** The tier a user would move to for a higher cap; null at the top tier. */
  nextTier: SubscriptionTier | null;
}

export interface QaUsage {
  questions: number;
  deepInsight: number;
}

/** Raised when the querent is at their monthly cap. The controller maps this to a
 *  top-level 402 (`res.status(402).json({ success:false, ...payload })`). */
export class QaCapExceededError extends Error {
  readonly payload: QaCapPayload;
  constructor(payload: QaCapPayload) {
    super(`qa_cap_reached:${payload.code}`);
    this.name = 'QaCapExceededError';
    this.payload = payload;
  }
}

/** UTC calendar-month bounds for `now`: `[start, end)` where `start` is the 1st
 *  of this UTC month at 00:00Z and `end` is the 1st of next UTC month (also the
 *  reset instant). Year rollover handled by `Date.UTC` month overflow. */
export function utcMonthBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** UTC month key `YYYY-MM` — the claim bucket for the per-device free-DI gate. */
export function utcMonthKey(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ── D5 per-device free-Deep-Insight anti-farming (§13f) ─────────────────────────
//
// The free monthly DI (Fable 5) is the most expensive Q&A call. The per-ACCOUNT DI
// sub-cap already holds it to 1/free-account/month; this ADDS a per-DEVICE dimension
// so one physical device cannot farm unlimited free DI by making new accounts. The
// Android SSAID / iOS IDFV arrives SERVER-SIDE via the `X-Device-Id` header (mobile
// attaches it only on the DI ask). We store ONLY a salted hash — the raw id is never
// persisted and never logged. See {@link QaDeviceDiClaim}.
//
// FAIL-OPEN throughout: an absent/blank id, an unset salt (misconfig), or a DB error
// must NEVER block a legitimate user's free DI. The gate only ever DENIES on a
// positive claim hit for a present id under a configured salt.

/**
 * Is `QA_DEVICE_SALT` present? The gate hashes nothing without it, so this single
 * predicate decides whether D5 is ACTIVE or INERT. Exported because the answer must
 * be visible at BOOT (`index.ts` warns when false) — the failure it guards is a
 * missing env var on one environment, which is otherwise invisible until someone
 * reproduces the farming case by hand.
 */
export function isDeviceSaltConfigured(): boolean {
  const salt = process.env.QA_DEVICE_SALT;
  return typeof salt === 'string' && salt.trim().length > 0;
}

/** `sha256(QA_DEVICE_SALT + rawId)` — server-only. Returns null (⇒ fail-open, no
 *  device gating) when the salt is unset/blank, so a deploy that forgot to set
 *  `QA_DEVICE_SALT` degrades to per-account-only rather than blocking every DI.
 *  Read at call time (not module load) so the value is never cached across a rotate. */
function hashDevice(rawDeviceId: string): string | null {
  const salt = process.env.QA_DEVICE_SALT;
  if (!salt || !salt.trim()) {
    logger.warn('qa_device_salt_unset_fail_open'); // no raw id / hash in the log
    return null;
  }
  return createHash('sha256').update(salt + rawDeviceId).digest('hex');
}

/**
 * Why a free-DI ask was, or was not, device-gated. Content-free by construction —
 * it carries a reason code and nothing else (no raw id, no hash, no question).
 *
 * This exists because every fail-open branch of D5 used to look IDENTICAL from
 * outside: a missing header, an unset salt and a never-written claim all produced
 * "answer served, no claim row, no log". That made the one bug this gate can have
 * — being silently inert — indistinguishable from working correctly, and it is what
 * turned a one-line misconfiguration into a device-repro hunt.
 */
export type QaDeviceGateReason =
  /** The client sent no `X-Device-Id` (non-DI ask, older client, or the hardware id
   *  was unavailable on that device). Fail-open by design. */
  | 'no_device_id'
  /** `QA_DEVICE_SALT` unset on THIS environment ⇒ the gate is inert. Fail-open. */
  | 'salt_unset'
  /** The claim lookup errored. Fail-open — transient infra never denies a free DI. */
  | 'lookup_failed'
  /** Salt set, id present, looked up, no prior claim this month ⇒ the DI is granted
   *  and a claim SHOULD be recorded post-answer. */
  | 'no_claim'
  /** A claim exists for {this device, this UTC month} ⇒ DENY (the gate firing). */
  | 'claim_found';

export interface QaDeviceGateDecision {
  /** True ⇒ deny with the DI 402. Every other reason serves the answer. */
  gated: boolean;
  reason: QaDeviceGateReason;
}

/**
 * Has THIS device already consumed a free DI in the current UTC month (under ANY
 * account)? Returns the DECISION plus WHY, so the caller can emit one content-free
 * telemetry line covering all five branches.
 *
 * Fail-open semantics are unchanged and must stay that way: absent id, absent salt
 * and a DB error all resolve to `gated:false`. A transient infra hiccup must never
 * wrongly tell a user they have used their free Deep Insight. Never logs the raw id.
 */
async function lookupDeviceFreeDiClaim(
  rawDeviceId: string | null | undefined,
  now: Date
): Promise<QaDeviceGateDecision> {
  if (!rawDeviceId) return { gated: false, reason: 'no_device_id' };
  const deviceHash = hashDevice(rawDeviceId);
  if (!deviceHash) return { gated: false, reason: 'salt_unset' };
  try {
    const existing = await QaDeviceDiClaim.exists({
      deviceHash,
      monthKey: utcMonthKey(now),
    });
    return existing !== null
      ? { gated: true, reason: 'claim_found' }
      : { gated: false, reason: 'no_claim' };
  } catch (err: any) {
    logger.warn('qa_device_di_claim_lookup_failed', { error: err?.message ?? String(err) });
    return { gated: false, reason: 'lookup_failed' };
  }
}

/**
 * Record that this device consumed its free DI for the current UTC month. Called by
 * the serving path ONLY after a FREE-tier DI answer is actually delivered (mirrors
 * the per-account DI sub-cap, which counts delivered `QaTurn` rows — a user whose
 * answer failed is never wrongly charged). Idempotent upsert on {@link QaDeviceDiClaim}'s
 * unique `{deviceHash, monthKey}`; a concurrent double-insert (E11000) collapses to
 * one row. Best-effort + never throws: a persistence miss must not fail a delivered
 * answer. No-ops on absent id / unset salt. Never persists or logs the raw id.
 */
export async function recordDeviceDiClaim(
  rawDeviceId: string | null | undefined,
  now: Date
): Promise<void> {
  if (!rawDeviceId) {
    // No claim is written — so nothing will gate the NEXT account on this device.
    // Logged (content-free) because "no row exists" is the exact symptom of the
    // farming bug, and this is one of the two reasons it can happen benignly.
    logger.info('qa_device_di_claim', { recorded: false, reason: 'no_device_id' });
    return;
  }
  const deviceHash = hashDevice(rawDeviceId);
  if (!deviceHash) {
    logger.info('qa_device_di_claim', { recorded: false, reason: 'salt_unset' });
    return;
  }
  const monthKey = utcMonthKey(now);
  try {
    await QaDeviceDiClaim.updateOne(
      { deviceHash, monthKey },
      { $setOnInsert: { deviceHash, monthKey, createdAt: now } },
      { upsert: true }
    );
    logger.info('qa_device_di_claim', { recorded: true, reason: 'upserted', monthKey });
  } catch (err: any) {
    // E11000 (concurrent insert won the race — the claim exists, which is the goal)
    // or any transient error: swallow. The gate is best-effort by design.
    if (err?.code === 11000) {
      logger.info('qa_device_di_claim', { recorded: true, reason: 'duplicate_race', monthKey });
      return;
    }
    logger.warn('qa_device_di_claim_record_failed', { error: err?.message ?? String(err) });
    logger.info('qa_device_di_claim', { recorded: false, reason: 'write_failed', monthKey });
  }
}

/**
 * D4 credit-pack stub. Beyond-cap purchases (credit packs) are v2 — the purchase
 * flow is NOT built. Returns the user's purchased extra-question balance for the
 * current month, which is ALWAYS 0 today. The seam exists so a future pack just
 * makes this return > 0 and {@link enforceQaCaps} grows the allowance additively
 * with no other change. Do NOT build the purchase flow here.
 */
export function getQaCreditPackBalance(_user: TierResolvable): number {
  return 0;
}

/**
 * Count this user's credit-consuming Q&A turns in the current UTC month: the
 * total (reflective + timing) and the Deep-Insight subset. Safety declines are
 * excluded by the mode filter, so they never count against a cap. Counts by
 * `createdAt` (indexed `{ userId, createdAt }`), mirroring R9's doc-count reset.
 */
export async function countQaUsage(userId: string, now: Date): Promise<QaUsage> {
  const { start, end } = utcMonthBounds(now);
  const base = {
    userId,
    mode: { $in: COUNTED_QA_MODES as unknown as string[] },
    createdAt: { $gte: start, $lt: end },
  };
  const [questions, deepInsight] = await Promise.all([
    QaTurn.countDocuments(base),
    QaTurn.countDocuments({ ...base, deepInsight: true }),
  ]);
  return { questions, deepInsight };
}

function buildUpgradeCta(tier: SubscriptionTier): QaUpgradeCta {
  const nextTier: SubscriptionTier | null =
    tier === 'free' ? 'premium' : tier === 'premium' ? 'premium_plus' : null;
  return { deepLink: 'revelia://paywall', nextTier };
}

/**
 * Enforce the caller's monthly question + Deep-Insight sub-caps BEFORE any answer
 * work (called after the router + safety short-circuit, before context/engine/
 * model). The question cap is checked first; the DI sub-cap is checked WITHIN it
 * only when `deepInsight` is requested. On breach, throws {@link QaCapExceededError}
 * with the top-level 402 payload.
 *
 * Returns the remaining allowance AFTER accounting for the current (about-to-be-
 * answered) turn — the value the success envelope surfaces so the UI can show the
 * post-answer counts (§4: surface remaining DI on every tier).
 */
export async function enforceQaCaps(args: {
  user: TierResolvable;
  userId: string;
  deepInsight: boolean;
  now: Date;
  /** Raw `X-Device-Id` (D5). Present ⇒ a FREE-tier DI ask is ALSO checked against
   *  the per-device claim (one free DI/device/UTC month across any account). Absent/
   *  blank ⇒ fail-open (per-account gating only). NEVER persisted/logged raw. */
  deviceId?: string | null;
}): Promise<QaRemaining> {
  const { user, userId, deepInsight, now, deviceId } = args;
  const tier = getEffectiveTier(user);
  const caps = QA_CAPS[tier] ?? QA_CAPS.free;
  const questionAllowance = caps.questions + getQaCreditPackBalance(user);

  const usage = await countQaUsage(userId, now);
  const { end } = utcMonthBounds(now);
  const resetsAt = end.toISOString();

  // Remaining BEFORE this turn (never negative). Used for the 402 body (0 on the
  // breached axis) and, minus this turn's consumption, for the success envelope.
  const preQuestions = Math.max(0, questionAllowance - usage.questions);
  const preDeepInsight = Math.max(0, caps.deepInsight - usage.deepInsight);

  // (1) Question cap — the DI sub-cap lives WITHIN it, so this is checked first.
  if (usage.questions >= questionAllowance) {
    throw new QaCapExceededError({
      code: 'question_limit_reached',
      tier,
      remaining: { questions: 0, deepInsight: preDeepInsight },
      resetsAt,
      upgradeCta: buildUpgradeCta(tier),
    });
  }

  // (2) Deep-Insight sub-cap (per ACCOUNT) — only when a DI answer is requested.
  if (deepInsight && usage.deepInsight >= caps.deepInsight) {
    throw new QaCapExceededError({
      code: 'deep_insight_limit_reached',
      tier,
      remaining: { questions: preQuestions, deepInsight: 0 },
      resetsAt,
      upgradeCta: buildUpgradeCta(tier),
    });
  }

  // (3) Per-DEVICE free-DI gate (D5) — FREE tier only, and only for a DI ask that
  // passed the per-account sub-cap above. This is what stops a device from farming
  // unlimited free DI via new accounts: if THIS device already consumed a free DI
  // this UTC month under ANY account, deny with the SAME 402 shape as the DI sub-cap.
  // Paid-tier DI is NOT device-gated (governed by the tier DI sub-cap) — that is
  // correct, not a gap: paid DI is bounded by the tier's own sub-cap. Fail-open on
  // absent id / unset salt / DB error. Placed pre-model like the sub-cap above, so a
  // gated device costs nothing.
  //
  // The decision is ALWAYS logged, content-free, including every fail-open branch —
  // that log is the difference between diagnosing an inert gate from one prod line
  // and reproducing it by hand on two accounts. Volume is negligible: at most one
  // line per free DI, and a free account gets one DI per month.
  if (deepInsight && tier === 'free') {
    const decision = await lookupDeviceFreeDiClaim(deviceId, now);
    logger.info('qa_device_di_gate', {
      gated: decision.gated,
      reason: decision.reason,
      monthKey: utcMonthKey(now),
    });
    if (decision.gated) {
      throw new QaCapExceededError({
        code: 'deep_insight_limit_reached',
        tier,
        remaining: { questions: preQuestions, deepInsight: 0 },
        resetsAt,
        upgradeCta: buildUpgradeCta(tier),
      });
    }
  }

  // Remaining AFTER this turn is answered (this turn consumes one question, and a
  // DI slot when deepInsight). Surfaced on the 200 success envelope.
  return {
    questions: Math.max(0, preQuestions - 1),
    deepInsight: Math.max(0, preDeepInsight - (deepInsight ? 1 : 0)),
  };
}
