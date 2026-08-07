import api from '@/lib/api';
import { SubscriptionTier } from '@/lib/constants';

/**
 * Conversational Q&A — mobile API + DTO types (R7 §13e Item A / §13e-1).
 *
 * Mirrors the LIVE §13d serving contracts with NO backend change of shape:
 *   POST /qa/ask     → NESTED-200 { answer, mode, deepInsight, conversationId?,
 *                                   answerId, remaining? }
 *                      | TOP-LEVEL 402 { code, tier, remaining, resetsAt,
 *                                        upgradeCta } at the monthly cap
 *   GET  /qa/credit  → { tier, remaining:{questions,deepInsight}, resetsAt }
 *
 * The client keys on `mode` + `answer` (never a raw classification field). The
 * two-part frame verdict is spliced into `answer` server-side and renders VERBATIM
 * — there is no separate frame field to assemble. The base URL already carries
 * `/api`, so paths here are `/qa…`.
 *
 * DTOs are dual-homed here (mirroring `mobile/lib/reports.ts`) rather than shared
 * from `packages/` — the server module `qa-caps.service.ts` owns the source of
 * truth; these are the intentional client-side mirror.
 */

/** The answered modes plus the safety-decline route labels. `reflective`/`timing`
 *  are real answers; `crisis`/`unsafe`/`off_topic` are the hardcoded declines
 *  served with NO model call and NO credit (and NO cap / `remaining`). */
export type QaMode = 'reflective' | 'timing' | 'crisis' | 'unsafe' | 'off_topic';

/** Machine code on the 402 body — distinguishes the question cap from the DI
 *  sub-cap so the CTA can lead with the right upgrade copy. */
export type QaCapCode = 'question_limit_reached' | 'deep_insight_limit_reached';

/** Remaining monthly allowance (questions + the Deep-Insight sub-cap). */
export interface QaRemaining {
  questions: number;
  deepInsight: number;
}

/** Structural upgrade CTA carried on the 402 (final copy is a server-side D6
 *  concern) — the deep link + the tier that raises the cap (null at the top). */
export interface QaUpgradeCta {
  deepLink: string;
  nextTier: SubscriptionTier | null;
}

/** TOP-LEVEL 402 metadata (spread alongside `success:false`, NOT under `data`). */
export interface QaCapPayload {
  code: QaCapCode;
  tier: SubscriptionTier;
  remaining: QaRemaining;
  /** ISO instant the count resets (start of the NEXT UTC month). */
  resetsAt: string;
  upgradeCta: QaUpgradeCta;
}

/** The answered turn (nested-200 `data`). `remaining` is present on the answered
 *  path (reflective/timing) and omitted on safety declines (uncapped). */
export interface QaAskResult {
  answer: string;
  mode: QaMode;
  deepInsight: boolean;
  conversationId?: string;
  answerId: string;
  remaining?: QaRemaining;
}

/** GET /qa/credit — the chat entry signal (tier + remaining + reset). */
export interface QaCredit {
  tier: SubscriptionTier;
  remaining: QaRemaining;
  resetsAt: string; // ISO
}

/** City-level question location for the timing MOMENT chart. Optional — the
 *  server falls back to the querent's birth location when absent (Item B wires
 *  the consent UX). */
export interface QaLocation {
  lat: number;
  lng: number;
  timezone: string;
  city?: string;
}

export interface AskQuestionInput {
  question: string;
  deepInsight?: boolean;
  /** Thread id for follow-ups; echoed back on the first answer to continue. */
  conversationId?: string;
  location?: QaLocation | null;
  /** ONE per logical send. A network auto-retry of the same send reuses it so the
   *  turn dedups to one (and a future cap charges it once). */
  idempotencyKey?: string;
  /** RAW device id for free-Deep-Insight anti-farming (D5). Sent ONLY as the
   *  `X-Device-Id` header, and ONLY on the Deep-Insight path (`deepInsight:true`) —
   *  the sole surface it gates. The server salts + hashes it; the raw value is
   *  never persisted server-side and never sent on any other request. */
  deviceId?: string;
}

/** Discriminated ask result — mirrors `reports.ts`'s 201-vs-402 split. `ok:true`
 *  on a nested-200 answer; `ok:false` on the top-level 402 (read off `err.response`).
 *  Any other error throws. */
export type AskQuestionResult =
  | { ok: true; result: QaAskResult }
  | { ok: false; cap: QaCapPayload };

/**
 * POST /qa/ask — ask one question. The `Idempotency-Key` header carries the
 * caller's per-send key so a retry / double-submit collapses to one turn.
 */
export async function askQuestion(input: AskQuestionInput): Promise<AskQuestionResult> {
  try {
    // Build the header set: the idempotency key (dedup) plus — ONLY on the
    // Deep-Insight path — the raw device id for the server's free-DI anti-farming
    // hash+gate (D5). The device id is never attached to a non-DI request, so the
    // raw id leaves the device on the DI ask alone.
    const headers: Record<string, string> = {};
    if (input.idempotencyKey) headers['Idempotency-Key'] = input.idempotencyKey;
    if (input.deviceId && input.deepInsight === true) headers['X-Device-Id'] = input.deviceId;

    const res = await api.post<QaAskResult>(
      '/qa/ask',
      {
        question: input.question,
        deepInsight: input.deepInsight === true,
        conversationId: input.conversationId,
        location: input.location ?? undefined,
      },
      Object.keys(headers).length ? { headers } : undefined
    );
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to get an answer');
    return { ok: true, result: res.data };
  } catch (err: any) {
    // TOP-LEVEL 402 (cap): the metadata sits alongside `success:false`, NOT under
    // `data`. Read it off the raw axios response like reports.ts does for its 402.
    if (err?.response?.status === 402) {
      const body = (err.response.data || {}) as Partial<QaCapPayload>;
      return {
        ok: false,
        cap: {
          code: (body.code as QaCapCode) || 'question_limit_reached',
          tier: (body.tier as SubscriptionTier) || 'free',
          remaining: body.remaining || { questions: 0, deepInsight: 0 },
          resetsAt: body.resetsAt || '',
          upgradeCta: body.upgradeCta || { deepLink: 'revelia://paywall', nextTier: null },
        },
      };
    }
    throw err;
  }
}

/** GET /qa/credit — tier + remaining monthly allowance + reset instant. */
export async function getQaCredit(): Promise<QaCredit> {
  const res = await api.get<QaCredit>('/qa/credit');
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to load Q&A credit');
  return res.data;
}
