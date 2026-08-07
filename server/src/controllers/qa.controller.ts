import { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { getEffectiveTier } from '../utils/subscriptionTier';
import {
  answerQuestion,
  QaInvalidQuestionError,
  QaLocation,
} from '../services/qa.service';
import {
  QaCapExceededError,
  QA_CAPS,
  countQaUsage,
  utcMonthBounds,
  getQaCreditPackBalance,
} from '../services/qa-caps.service';

/**
 * R7 §13d Step 3.1 — Conversational Q&A HTTP surface.
 *
 * Mounted at `/api/qa`; all routes require authentication. The success response
 * is the decided NESTED-200 shape:
 *   { success:true, data:{ answer, mode, deepInsight, conversationId?, answerId,
 *                          remaining? } }
 * (crisis/unsafe/off_topic still return 200 with the hardcoded decline string as
 * `answer` and the route label as `mode`; NO model call, NO credit.)
 *
 * At the monthly cap the service throws `QaCapExceededError` → a TOP-LEVEL 402
 * (§13d-5): `{ success:false, code, tier, remaining, resetsAt, upgradeCta }` —
 * metadata alongside `success`, NOT under `data`.
 */

/** Coerce the optional request `location` into a typed `QaLocation` (or null). */
function parseLocation(raw: unknown): QaLocation | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.lat !== 'number' || typeof o.lng !== 'number' || typeof o.timezone !== 'string') {
    return null;
  }
  return {
    lat: o.lat,
    lng: o.lng,
    timezone: o.timezone,
    city: typeof o.city === 'string' ? o.city : undefined,
  };
}

/**
 * Resolve the client idempotency key (§13d-4). Prefer the standard
 * `Idempotency-Key` request header; fall back to a body field. Absent → the
 * service derives a windowed auto key from the question content.
 */
function parseIdempotencyKey(req: Request, body: Record<string, unknown>): string | undefined {
  const header = req.get('Idempotency-Key');
  if (typeof header === 'string' && header.trim()) return header.trim();
  if (typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()) {
    return body.idempotencyKey.trim();
  }
  return undefined;
}

/**
 * Read the raw device id (D5 free-DI anti-farming) from the `X-Device-Id` header.
 * The mobile client attaches it ONLY on the Deep-Insight path. The raw value is
 * forwarded to the service (which salts + hashes it) and is NEVER logged here.
 */
function parseDeviceId(req: Request): string | undefined {
  const header = req.get('X-Device-Id');
  return typeof header === 'string' && header.trim() ? header.trim() : undefined;
}

/**
 * POST /api/qa/ask
 * Body: { question: string, deepInsight?: boolean, conversationId?: string,
 *         location?: { lat, lng, timezone, city? }, idempotencyKey?: string }
 * Header (preferred): `Idempotency-Key` — a client auto-retry / double-submit with
 * the same key returns the same persisted answer (dedup to one turn).
 */
export async function ask(req: Request, res: Response): Promise<void> {
  const userId = req.user!._id.toString();
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const result = await answerQuestion({
      userId,
      user: req.user!,
      question: typeof body.question === 'string' ? body.question : '',
      deepInsight: body.deepInsight === true,
      conversationId: typeof body.conversationId === 'string' ? body.conversationId : undefined,
      location: parseLocation(body.location),
      idempotencyKey: parseIdempotencyKey(req, body),
      // D5: raw device id (DI path only, per the client). SERVER salts + hashes it;
      // never persisted or logged raw. Absent ⇒ the per-device gate fails open.
      deviceId: parseDeviceId(req),
    });

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof QaInvalidQuestionError) {
      res.status(400).json({ success: false, error: 'invalid_question', message: error.message });
      return;
    }
    if (error instanceof QaCapExceededError) {
      // Top-level 402 (§13d-5): the cap metadata sits ALONGSIDE `success:false`,
      // NOT nested under `data` — mirroring subscription.middleware's top-level
      // requiredTier/currentTier/upgradeUrl convention. Distinguishes the question
      // cap from the DI sub-cap via `code`.
      res.status(402).json({ success: false, ...error.payload });
      return;
    }
    if (error instanceof AppError) {
      // §13d-3 chart-only degrade means buildUserInsightProfile no longer 400s the
      // Q&A path for incomplete readings (it is called with requireCompleteReadings:
      // false). A genuinely missing user/profile (404) can still surface here.
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }
    logger.error('QA ask error:', { userId, error: error?.message ?? String(error) });
    res.status(500).json({ success: false, error: 'Failed to answer question' });
  }
}

/**
 * GET /api/qa/credit
 * The chat-screen entry signal — the querent's tier + REMAINING monthly allowance
 * (questions + the Deep-Insight sub-cap) + the reset instant. Mirrors
 * `report.controller`'s credit endpoint: `remaining` is computed live from the
 * same source the enforcer uses (`countQaUsage` doc-count within the UTC month +
 * `QA_CAPS` + the credit-pack additive allowance), so there is NO stored counter
 * and NO cron. `resetsAt` is the start of the NEXT UTC month (`utcMonthBounds`),
 * the same instant `enforceQaCaps` stamps on a 402.
 *
 * Shape (nested-200): `{ success:true, data:{ tier, remaining:{questions,
 * deepInsight}, resetsAt } }`. The mobile chat seeds its counters from this at
 * load, then refreshes them from the answered turn's `remaining`.
 */
export async function getQaCredit(req: Request, res: Response): Promise<void> {
  const userId = req.user!._id.toString();
  try {
    const tier = getEffectiveTier(req.user!);
    const caps = QA_CAPS[tier] ?? QA_CAPS.free;
    const now = new Date();
    const { end } = utcMonthBounds(now);

    const usage = await countQaUsage(userId, now);
    // The question allowance grows additively with any future credit-pack balance
    // (D4 stub → 0 today), matching enforceQaCaps' allowance exactly.
    const questionAllowance = caps.questions + getQaCreditPackBalance(req.user!);

    res.status(200).json({
      success: true,
      data: {
        tier,
        remaining: {
          questions: Math.max(0, questionAllowance - usage.questions),
          deepInsight: Math.max(0, caps.deepInsight - usage.deepInsight),
        },
        resetsAt: end.toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('QA credit error:', { userId, error: error?.message ?? String(error) });
    res.status(500).json({ success: false, error: 'Failed to check Q&A credit' });
  }
}
