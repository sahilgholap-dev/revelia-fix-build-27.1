/**
 * Q&A orchestration — R7 Conversational Q&A (Build 27), §13 charter STEP 3.1.
 *
 * The serving skeleton that wires the already-built pieces end-to-end:
 *   junk/empty check
 *     → `classifyQuestion` (Haiku router — never deducts a credit)
 *     → SAFETY short-circuit (crisis/unsafe/off_topic → the verbatim hardcoded
 *       decline string; NO answer-model call, NO credit; crisis is gated on
 *       `CRISIS_WORDING_FINALIZED`)
 *     → reflective/timing → grounded context via `assembleQaContext(
 *       buildUserInsightProfile(userId))`; timing mode runs `runTimingEngine`
 *       and splices the §5 `TimingVerdict` (never-expose scrubbed)
 *     → ANSWER via `createSynthesisMessage`'s per-tier sibling
 *       `createQaAnswerMessage` (free→sonnet-5 / paid→opus-4-8 / DI→fable-5)
 *     → return the nested-200 payload.
 *
 * ── SCOPE (Step 3.3 — safety serving; later sub-steps harden each seam) ──────
 *  • REAL inputs wired (§13d-2): `faceGate` from the querent's adult-verification
 *    + opt-in state (fail-closed, never true by omission), `birthDate` from
 *    `profile.birthData.date` (the FACE gate's independent DOB age-guard), and the
 *    router's category/compound/frame tags into the engine — category typed via
 *    the SINGLE-SOURCE `QA_CATEGORIES` import from `qa-router.service.ts` (no enum
 *    dup). frame_end is unified: router `resolveFrame` and engine `frameEndFrom`
 *    both call the shared `addUtcMonths` (`utils/frameDate.ts`) — cannot drift.
 *  • SAFETY SERVING landed (§13d-3): the crisis ship gate is ENFORCED on
 *    `CRISIS_WORDING_FINALIZED` (fail-safe to the generic unsafe decline if ever
 *    false — never an ungated crisis string); crisis/unsafe/off_topic NEVER call
 *    the answer model or deduct credit and carry no upsell/CTA; safety events log
 *    the route LABEL + userId ONLY (DPDP/GDPR — never question/answer content); and
 *    the chart-only degrade sources via `buildUserInsightProfile({
 *    requireCompleteReadings:false })` so a face/palm-incomplete asker gets a
 *    coherent reflective answer (NO AppError 400), the absent layers self-omitting.
 *  • PERSISTENCE + IDEMPOTENCY landed (§13d-4): every route writes ONE `QaTurn`
 *    calibration row — answered rows carry the full record (question/answer/model/
 *    usage/location), crisis/unsafe/off_topic rows are LABEL + TIMESTAMP ONLY (no
 *    question/answer/location/model — DPDP/GDPR). A client idempotency key (or a
 *    windowed content key) + the `{userId, idempotencyKey}` partial unique index
 *    dedup a retry / double-submit to ONE turn (a pre-router short-circuit reuses
 *    the persisted answer; a concurrent race resolves via E11000), so a future
 *    monthly cap counts it once.
 *  • CAPS + 402 + DI SUB-CAPS landed (§13d-5): after the router + safety
 *    short-circuit and before any answer work, `enforceQaCaps` (qa-caps.service)
 *    counts this UTC month's credit-consuming (reflective/timing) QaTurns and
 *    blocks over-cap requests with a QaCapExceededError → the controller's
 *    top-level 402 `{ code, tier, remaining, resetsAt, upgradeCta }`. Safety
 *    declines are uncapped; the Haiku router call never counts. The success
 *    envelope now carries the post-answer `remaining` allowance.
 *  • FOLLOW-UP CONTEXT landed (§13d-6): on a follow-up (conversationId present) the
 *    last ~6 ANSWERED turns of the thread are read OLDEST-FIRST via the
 *    `{userId, conversationId, createdAt}` index and spliced into the context as an
 *    EARLIER-IN-THIS-CONVERSATION block (assembleQaContext) with a matching
 *    continuity directive in the system prompt (buildQaSystemPrompt hasHistory).
 *    Safety rows are excluded (content-free); prior ANSWERS are never-expose-scrubbed
 *    (our output) while prior QUESTIONS are not (the current-question rule); a scrub
 *    failure degrades to a no-history answer. A first question is byte-identical to
 *    the pre-§13d-6 output (graceful absence).
 *  • If the engine cannot run (missing birth/location data, config absent, compute
 *    error) the request degrades to a grounded REFLECTIVE answer rather than 500.
 *
 * Never-expose (§2.6): the engine's own factor scrub + `renderTimingBlock`'s
 * assembly-time `scrubNeverExpose` guard the methodology; this module re-scrubs
 * ONLY the engine-produced TIMING READ section as a final guard (never the
 * user's own question — a user may legitimately type a technique word).
 */
import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { UserProfile } from '../models/UserProfile';
import { QaTurn, QaTurnMode, IQaTurnLocation, IQaTurnUsage } from '../models/QaTurn';
import { IUser } from '../models/User';
import { AppError } from '../middleware/error.middleware';
import { getEffectiveTier } from '../utils/subscriptionTier';
import { logger } from '../utils/logger';
import {
  classifyQuestion,
  resolveDeclineText,
  CRISIS_WORDING_FINALIZED,
  CRISIS_RESOURCE_TEXT,
  UNSAFE_DECLINE_TEXT,
  QaClassification,
  QA_CATEGORIES,
  QaCategory,
} from './qa-router.service';
import {
  runTimingEngine,
  TimingQuestion,
  TimingVerdict,
} from './timing-engine.service';
import { NatalChartInput } from './astrology.service';
import { buildUserInsightProfile } from './insight.service';
import { FeatureContextInput } from '../prompts/shared/feature-context';
import {
  assembleQaContext,
  buildQaSystemPrompt,
  scrubNeverExpose,
  FaceGate,
  QaAnswerMode,
  QaHistoryTurn,
  QA_HISTORY_MAX_TURNS,
} from '../prompts/qa.prompt';
import {
  createQaAnswerMessage,
  QaAnswerTier,
  SynthesisEffort,
} from './synthesis-routing';
import { enforceQaCaps, recordDeviceDiClaim, QaRemaining } from './qa-caps.service';

// ── Junk / empty guard ────────────────────────────────────────────────────────
const MIN_QUESTION_LEN = 2;
const MAX_QUESTION_LEN = 2000;

/** A malformed/empty/oversized question — the controller maps this to a 400. */
export class QaInvalidQuestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QaInvalidQuestionError';
  }
}

// ── Question location (moment chart) ───────────────────────────────────────────
export interface QaLocation {
  lat: number;
  lng: number;
  timezone: string;
  city?: string;
}

export interface QaAskInput {
  userId: string;
  /** Authenticated user (subscription tier → answer-model routing). */
  user: IUser;
  question: string;
  /** Deep-Insight toggle: length + answer-model tier (fable-5). */
  deepInsight?: boolean;
  /** Optional multi-turn thread id. When present, the last ~6 answered turns of the
   *  thread are spliced as follow-up continuity (§13d-6); also echoed to the client. */
  conversationId?: string;
  /** City-level question location for the timing MOMENT chart. Falls back to the
   *  user's birth location when absent (proper geo-resolution is a later step). */
  location?: QaLocation | null;
  /** Client idempotency key (one per logical "send"; a network retry reuses it).
   *  Absent → the service derives a windowed auto key from the question content so
   *  an accidental rapid double-submit still dedups (§13d-4 idempotency). */
  idempotencyKey?: string;
  /** Raw hardware device id from the `X-Device-Id` header (D5 free-DI anti-farming).
   *  The mobile client attaches it ONLY on the Deep-Insight path. Used SERVER-SIDE to
   *  salt+hash for the per-device free-DI gate — NEVER persisted or logged raw. Absent
   *  ⇒ fail-open (per-account gating only). */
  deviceId?: string;
  /** Clock for the moment chart / any date logic (tests); defaults to now. */
  now?: Date;
}

export interface QaAskResult {
  answer: string;
  /** 'reflective' | 'timing' for an answered question; the route label
   *  ('crisis' | 'unsafe' | 'off_topic') for a hardcoded decline. */
  mode: string;
  deepInsight: boolean;
  conversationId?: string;
  answerId: string;
  /** Remaining monthly allowance AFTER this answer (§13d-5). Present on the
   *  answered path (reflective/timing); omitted on safety declines, which are
   *  uncapped and never touch the counter. */
  remaining?: QaRemaining;
}

/** Per-tier generation shape (§13d MODEL ROUTING). Free runs a touch lower effort
 *  for margin; paid + Deep Insight run high. `max_tokens` sized for the visible
 *  length band PLUS adaptive-thinking headroom (thinking + text share the cap). */
function qaGenParams(
  tier: QaAnswerTier,
  deepInsight: boolean
): { maxTokens: number; effort: SynthesisEffort } {
  if (deepInsight) return { maxTokens: 16000, effort: 'high' }; // 400–600 words
  if (tier === 'free') return { maxTokens: 8000, effort: 'medium' }; // 150–250 words
  return { maxTokens: 8000, effort: 'high' }; // paid regular
}

/** Map subscription tier + the Deep-Insight toggle to the answer tier. Deep
 *  Insight routes to Fable 5 regardless of subscription (the tier caps that
 *  gate WHO may request a DI answer are §13d-5). */
function resolveQaTier(user: IUser, deepInsight: boolean): QaAnswerTier {
  if (deepInsight) return 'deep_insight';
  const sub = getEffectiveTier(user);
  return sub === 'free' ? 'free' : 'paid';
}

/** Resolve the MOMENT-chart location: the request's city-level location, else the
 *  user's birth location. null when neither carries a usable lat/lng/timezone. */
function resolveMomentLocation(
  reqLoc: QaLocation | null | undefined,
  birthLoc: { lat?: number | null; lng?: number | null; timezone?: string | null } | undefined
): { lat: number; lng: number; timezone: string } | null {
  if (
    reqLoc &&
    typeof reqLoc.lat === 'number' &&
    typeof reqLoc.lng === 'number' &&
    typeof reqLoc.timezone === 'string' &&
    reqLoc.timezone
  ) {
    return { lat: reqLoc.lat, lng: reqLoc.lng, timezone: reqLoc.timezone };
  }
  if (
    birthLoc &&
    typeof birthLoc.lat === 'number' &&
    typeof birthLoc.lng === 'number' &&
    typeof birthLoc.timezone === 'string' &&
    birthLoc.timezone
  ) {
    return { lat: birthLoc.lat, lng: birthLoc.lng, timezone: birthLoc.timezone };
  }
  return null;
}

/** The querent birth-data shape the serving path needs (natal input + the FACE
 *  gate's DOB age-guard). Read lean; every field optional (pre-backfill users). */
interface QaBirthData {
  date?: Date | string | null;
  time?: string | null;
  timeIsAssumed?: boolean;
  location?: {
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
    timezone?: string | null;
  } | null;
}

/** Per-request serving state loaded in ONE lean read (below). */
interface QaServingState {
  birthData: QaBirthData | undefined;
  faceGate: FaceGate;
}

/**
 * Load the per-request serving state in ONE lean read: the querent's `birthData`
 * (the timing engine's natal input AND the FACE gate's independent DOB age-guard)
 * and the REAL face-gate flags.
 *
 * FACE gate — fail-closed, never true by omission (§13c/§13d-2): the two consent
 * fields (`adultVerified` / `faceOptIn`) are read DEFENSIVELY with a strict `=== true`
 * default-false. They are not on the schema YET — the later FACE-capture step adds
 * + populates them through the real adult-verification + opt-in UX. Sourcing them
 * here now means that step only has to FLIP the flags; it never has to ADD the gate
 * wiring. Until then both read `undefined ⇒ false`, so no face content can surface
 * by omission (matching the DEFAULT_FACE_GATE the skeleton hardcoded).
 */
async function loadQaServingState(userId: string): Promise<QaServingState> {
  const doc = await UserProfile.findOne({ userId })
    .select('birthData adultVerified faceOptIn')
    .lean<{
      birthData?: QaBirthData | null;
      adultVerified?: boolean;
      faceOptIn?: boolean;
    } | null>();

  return {
    birthData: doc?.birthData ?? undefined,
    faceGate: {
      adultVerified: doc?.adultVerified === true,
      faceOptIn: doc?.faceOptIn === true,
    },
  };
}

/**
 * Single-source topic category for the engine call. `QA_CATEGORIES`/`QaCategory`
 * are imported from the router — the ONE enum, reconciled key-for-key against the
 * gitignored `rule-set.json` karya map — so NO category list is duplicated here.
 * The router already normalizes to a real key or null; this maps null / any
 * non-enum value to the `other` catch-all so the engine always receives a valid
 * key (an unmapped key degrades to reflective inside the engine's `resolveKarya`).
 */
function engineCategory(c: QaClassification): QaCategory {
  const cat = c.category;
  return cat !== null && (QA_CATEGORIES as readonly string[]).includes(cat) ? cat : 'other';
}

/**
 * Run the Timing Engine for a router-classified timing question. Builds the
 * querent's natal chart from the already-loaded `birthData` and the MOMENT-chart
 * location from the request (or birth) location, then feeds the classification's
 * category (single-source via {@link engineCategory}) + compound/frame tags into
 * the `TimingQuestion`. Throws on any missing input / compute failure — the caller
 * degrades to reflective (§13d-3 hardens this).
 */
async function runTimingForQuestion(
  birthData: QaBirthData | undefined,
  c: QaClassification,
  reqLoc: QaLocation | null | undefined,
  now: Date
): Promise<TimingVerdict | TimingVerdict[]> {
  if (!birthData?.date) {
    throw new Error('timing engine: no birth date on file');
  }

  const natalInput: NatalChartInput = {
    date: birthData.date instanceof Date ? birthData.date : new Date(birthData.date),
    time: birthData.time ?? null,
    timezone: birthData.location?.timezone ?? null,
    lat: birthData.location?.lat ?? null,
    lng: birthData.location?.lng ?? null,
    timeIsAssumed: birthData.timeIsAssumed,
  };

  const location = resolveMomentLocation(reqLoc, birthData.location ?? undefined);
  if (!location) {
    throw new Error('timing engine: no resolvable question location');
  }

  const q: TimingQuestion = {
    category: engineCategory(c),
    timestamp: now,
    location,
    deadline: c.frame.deadline ?? undefined,
    askedWindowMonths: c.frame.windowMonths ?? undefined,
    compound: c.compound,
    // For the sole compound parent (venture_scale) the leaf category keys drive
    // the engine's per-sub decomposition; they ARE the subFrameSubtypes keys.
    subQuestions:
      c.compound && c.subFrameSubtypes ? Object.keys(c.subFrameSubtypes) : undefined,
    frameBounded: c.frame.bounded,
    frameSubtype: c.frame.subtype ?? undefined,
    subFrameSubtypes: c.subFrameSubtypes ?? undefined,
  };

  return runTimingEngine(q, natalInput);
}

/** Defense-in-depth: re-scrub ONLY the engine-produced "## TIMING READ" section
 *  (never the user's question, which may legitimately contain a technique word).
 *  `renderTimingBlock` already scrubbed at assembly — this is the final guard. */
function scrubTimingSection(context: string): void {
  const start = context.indexOf('## TIMING READ');
  if (start < 0) return;
  const qHeader = context.indexOf("## THE USER'S QUESTION", start);
  const section = qHeader > start ? context.slice(start, qHeader) : context.slice(start);
  scrubNeverExpose(section);
}

// ── Follow-up context (§13d-6 / §7) ─────────────────────────────────────────────

/**
 * Load the last ~{@link QA_HISTORY_MAX_TURNS} ANSWERED turns for a thread, OLDEST-
 * FIRST, for the follow-up continuity block. Reads by the `{userId, conversationId,
 * createdAt}` index and filters to reflective/timing rows at the query — safety rows
 * (crisis/unsafe/off_topic) are content-free and carry NO history ("no history for
 * safety routes", §13d-6). Best-effort: no thread id ⇒ [] (a single-shot question);
 * any lookup error ⇒ [] (degrade to a first-question answer, never a 500). The
 * current in-flight turn is not yet persisted (persist is step 7) and the identical-
 * key retry already short-circuited (step 1b), so there is no self-inclusion.
 */
async function loadConversationHistory(
  userId: string,
  conversationId: string | undefined
): Promise<QaHistoryTurn[]> {
  if (!conversationId) return [];
  try {
    const rows = await QaTurn.find({
      userId,
      conversationId,
      mode: { $in: ['reflective', 'timing'] },
    })
      .sort({ createdAt: -1 })
      .limit(QA_HISTORY_MAX_TURNS)
      .select('question answer mode')
      .lean<{ question?: string; answer?: string; mode: QaTurnMode }[]>();
    // Query is newest-first → reverse to OLDEST-FIRST for the render. Drop any
    // content-free row defensively (the mode filter already excludes safety rows).
    return rows
      .reverse()
      .filter((r) => typeof r.answer === 'string' && r.answer.trim().length > 0)
      .map((r) => ({
        question: r.question ?? '',
        answer: r.answer as string,
        mode: r.mode as QaAnswerMode,
      }));
  } catch (err: any) {
    logger.warn('qa_history_lookup_failed', {
      userId,
      conversationId,
      error: err?.message ?? String(err),
    });
    return [];
  }
}

// ── Persistence + idempotency (§13d-4) ──────────────────────────────────────────

/** Rapid double-submit window for the AUTO (no client-key) dedup path. A retry a
 *  fraction of a second later shares the same bucket → dedups; a genuine re-ask
 *  ≥ this window later lands in a new bucket → a new turn. The client key is the
 *  strong, time-independent path — this only backstops clients that omit one. */
const DEDUP_WINDOW_MS = 120_000;

/**
 * Resolve the idempotency key (§6 "key → { answerId }"; mirrors report.service's
 * dedup constraint). A client-supplied key is used verbatim (namespaced `c:`) — it
 * is time-independent, so a network auto-retry of the SAME logical send dedups no
 * matter how late it arrives. When the client omits one we derive a windowed `a:`
 * key from the question content + thread + DI flag bucketed by {@link DEDUP_WINDOW_MS},
 * so an accidental rapid double-tap still collapses to one turn while a deliberate
 * later re-ask is honored as a new turn.
 */
function resolveIdempotencyKey(input: QaAskInput, question: string, now: Date): string {
  const client = typeof input.idempotencyKey === 'string' ? input.idempotencyKey.trim() : '';
  if (client) return `c:${client}`;
  const bucket = Math.floor(now.getTime() / DEDUP_WINDOW_MS);
  const hash = createHash('sha256')
    .update(
      `${input.userId}|${input.conversationId ?? ''}|${input.deepInsight === true}|${bucket}|${question.toLowerCase()}`
    )
    .digest('hex')
    .slice(0, 32);
  return `a:${hash}`;
}

/** Reconstruct the client result from a persisted answered turn (short-circuit /
 *  E11000 reuse). Safety rows never carry a key, so any keyed row IS an answered
 *  row with real `answer`/`mode`. */
function resultFromTurn(turn: {
  answer: string;
  mode: QaTurnMode;
  deepInsight: boolean;
  conversationId?: string | null;
  answerId: string;
}): QaAskResult {
  return {
    answer: turn.answer,
    mode: turn.mode,
    deepInsight: turn.deepInsight,
    conversationId: turn.conversationId ?? undefined,
    answerId: turn.answerId,
  };
}

/** Look up an already-persisted answered turn for this idempotency key (the
 *  short-circuit that skips the router + the answer model on a retry). Returns the
 *  reusable result or null. Best-effort: a lookup error degrades to a fresh answer. */
async function findExistingTurn(
  userId: string,
  idempotencyKey: string
): Promise<QaAskResult | null> {
  try {
    const turn = await QaTurn.findOne({ userId, idempotencyKey })
      .select('answer mode deepInsight conversationId answerId')
      .lean<{
        answer: string;
        mode: QaTurnMode;
        deepInsight: boolean;
        conversationId?: string | null;
        answerId: string;
      } | null>();
    return turn ? resultFromTurn(turn) : null;
  } catch (err: any) {
    logger.warn('qa_idempotency_lookup_failed', {
      userId,
      error: err?.message ?? String(err),
    });
    return null;
  }
}

/** City-level provenance of the timing MOMENT-chart location for the turn record
 *  (§6). Interim sourcing (proper consent/geo UX is a later step): a usable request
 *  location ⇒ `device`; falling back to the birth location ⇒ `birth` + flagged;
 *  neither ⇒ null. */
function resolveQaTurnLocation(
  reqLoc: QaLocation | null | undefined,
  birthData: QaBirthData | undefined
): IQaTurnLocation | null {
  if (
    reqLoc &&
    typeof reqLoc.lat === 'number' &&
    typeof reqLoc.lng === 'number' &&
    typeof reqLoc.timezone === 'string' &&
    reqLoc.timezone
  ) {
    return { city: reqLoc.city ?? null, source: 'device', fallbackFlagged: false };
  }
  const birthLoc = birthData?.location;
  if (
    birthLoc &&
    typeof birthLoc.lat === 'number' &&
    typeof birthLoc.lng === 'number' &&
    typeof birthLoc.timezone === 'string' &&
    birthLoc.timezone
  ) {
    return { city: birthLoc.city ?? null, source: 'birth', fallbackFlagged: true };
  }
  return null;
}

/**
 * Persist ONE answered (reflective / timing) turn — the calibration record (§6,
 * NO sampling). On the idempotency-key E11000 (a concurrent double-submit won the
 * race) reuse the winner's persisted answer so BOTH callers return the same turn
 * (dedup → one row → one future charge). Any OTHER persist failure is logged and
 * swallowed: the user already got a valid answer (spec §11 #5 — never refund /
 * never 500 a delivered answer over a persistence miss). Returns the result the
 * caller should return (its own, or the dedup winner's).
 */
async function persistAnsweredTurn(
  input: QaAskInput,
  args: {
    question: string;
    result: QaAskResult;
    idempotencyKey: string;
    modelUsed: string | null;
    usage: IQaTurnUsage | null;
    location: IQaTurnLocation | null;
    now: Date;
  }
): Promise<QaAskResult> {
  const { question, result, idempotencyKey } = args;
  try {
    await QaTurn.create({
      userId: input.userId,
      conversationId: input.conversationId ?? null,
      question,
      answer: result.answer,
      answerId: result.answerId,
      mode: result.mode as QaTurnMode,
      deepInsight: result.deepInsight,
      modelUsed: args.modelUsed,
      usage: args.usage,
      feedback: null,
      idempotencyKey,
      timestamp: args.now,
      location: args.location,
    });
    return result;
  } catch (err: any) {
    if (err?.code === 11000) {
      // A concurrent submit with the same key already persisted → reuse ITS answer.
      const existing = await findExistingTurn(input.userId, idempotencyKey);
      if (existing) {
        logger.info('qa_idempotency_dedup', { userId: input.userId, idempotencyKey });
        return existing;
      }
    }
    logger.warn('qa_persist_answered_failed', {
      userId: input.userId,
      error: err?.message ?? String(err),
    });
    return result;
  }
}

/**
 * Persist ONE safety (crisis / unsafe / off_topic) turn — LABEL + TIMESTAMP ONLY.
 * NEVER writes question/answer content, location, model, usage, or a dedup key
 * (DPDP/GDPR launch-gate; owner-actions #1). Best-effort + never throws (a safety
 * reply must never fail over a persistence miss). Not deduped: re-serving the
 * hardcoded string costs no model call and no credit, so there is nothing to guard.
 */
async function persistSafetyTurn(
  input: QaAskInput,
  args: { mode: QaTurnMode; deepInsight: boolean; answerId: string; now: Date }
): Promise<void> {
  try {
    await QaTurn.create({
      userId: input.userId,
      conversationId: input.conversationId ?? null,
      // question/answer/location/modelUsed/usage/idempotencyKey deliberately UNSET —
      // the schema defaults question/answer to '' and the rest to null.
      answerId: args.answerId,
      mode: args.mode,
      deepInsight: args.deepInsight,
      feedback: null,
      timestamp: args.now,
    });
  } catch (err: any) {
    logger.warn('qa_persist_safety_failed', {
      userId: input.userId,
      mode: args.mode,
      error: err?.message ?? String(err),
    });
  }
}

/**
 * Answer one Q&A question end-to-end. Credit-consuming (reflective/timing)
 * requests are gated by the per-tier monthly caps (§13d-5); safety declines and
 * idempotency retries are not capped.
 */
export async function answerQuestion(input: QaAskInput): Promise<QaAskResult> {
  const now = input.now ?? new Date();
  const deepInsight = input.deepInsight === true;
  const conversationId = input.conversationId;
  const answerId = new Types.ObjectId().toString();

  // ── (1) junk / empty guard ─────────────────────────────────────────────────
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  if (question.length < MIN_QUESTION_LEN) {
    throw new QaInvalidQuestionError('Please enter a question.');
  }
  if (question.length > MAX_QUESTION_LEN) {
    throw new QaInvalidQuestionError('That question is too long — please shorten it.');
  }

  // ── (1b) IDEMPOTENCY short-circuit (§13d-4) ─────────────────────────────────
  // Resolve the dedup key (client key, else a windowed content key) and, if an
  // answered turn already exists for it, RETURN that persisted answer WITHOUT the
  // router / engine / answer model — a client auto-retry or rapid double-tap
  // collapses to ONE turn (so a future monthly cap charges it once). Safety rows
  // carry no key, so a crisis retry falls through and simply re-serves the string.
  const idempotencyKey = resolveIdempotencyKey(input, question, now);
  const priorTurn = await findExistingTurn(input.userId, idempotencyKey);
  if (priorTurn) {
    logger.info('qa_idempotency_short_circuit', { userId: input.userId, idempotencyKey });
    return priorTurn;
  }

  // ── (2) router (never deducts a credit) ─────────────────────────────────────
  const classification = await classifyQuestion(question, { now });
  const route = classification.route;

  // ── (3) SAFETY short-circuit — NO answer-model call, NO credit ──────────────
  // crisis / unsafe / off_topic are served the verbatim hardcoded guide string and
  // return HERE, before buildUserInsightProfile / the engine / the answer model —
  // so NO model is ever called and NO credit is ever deducted for a safety route.
  if (route === 'crisis' || route === 'unsafe' || route === 'off_topic') {
    // CRISIS SHIP GATE (§13d-3, ENFORCED): only surface the crisis resource text
    // once `CRISIS_WORDING_FINALIZED` is true (Sid-confirmed FINAL, S-R7b/D6). If it
    // is ever flipped back to false we FAIL-SAFE to the generic unsafe decline —
    // NEVER serve an ungated/unfinalized crisis string. The flag is the single ship
    // gate; the router intentionally classifies crisis regardless of the flag.
    let answer: string;
    let mode: string;
    if (route === 'crisis') {
      answer = CRISIS_WORDING_FINALIZED ? CRISIS_RESOURCE_TEXT : UNSAFE_DECLINE_TEXT;
      mode = CRISIS_WORDING_FINALIZED ? 'crisis' : 'unsafe';
    } else {
      // resolveDeclineText returns the verbatim guide string for unsafe/off_topic.
      answer = resolveDeclineText(route) ?? UNSAFE_DECLINE_TEXT;
      mode = route;
    }
    // PRIVACY (DPDP/GDPR launch-gate, owner-actions #1): a safety event logs the
    // ROUTE LABEL + userId ONLY — NEVER the question or answer content (self-harm
    // content is health-adjacent). The logger stamps the timestamp; label +
    // timestamp is the whole record. This event never feeds analytics/marketing/
    // model training. Do NOT add `question`/`answer` here.
    logger.info('qa_safety_short_circuit', { userId: input.userId, route, mode });
    // PERSIST a content-free calibration row (label + timestamp ONLY — no question/
    // answer/location/model/key). Awaited best-effort: a persistence miss must never
    // block or fail a safety reply. The `mode` may be `unsafe` when the crisis flag
    // is off (fail-safe) — the stored label matches what the user received.
    await persistSafetyTurn(input, { mode: mode as QaTurnMode, deepInsight, answerId, now });
    // The decline response carries NO upsell/paywall/CTA/suggestion-chip shape (the
    // envelope has no such fields; the mobile screen suppresses chips/upsell — a
    // separate mobile-step owner action). Nothing is sold to a person in crisis.
    return { answer, mode, deepInsight, conversationId, answerId };
  }

  // ── (3b) TIER / CAP GATE (§13d-5) — BEFORE any answer work ──────────────────
  // Only credit-consuming reflective/timing turns reach here (safety returned
  // above; the router call never counted). Enforce the querent's per-tier monthly
  // question cap + the Deep-Insight SUB-cap by COUNTING this UTC month's answered
  // QaTurns (mirrors R9's doc-count reset — no stored counter, no cron). Over cap
  // → QaCapExceededError (→ top-level 402) thrown before context/engine/model, so
  // a capped request costs nothing. `remaining` is the post-answer allowance for
  // the success envelope.
  const remaining = await enforceQaCaps({
    user: input.user,
    userId: input.userId,
    deepInsight,
    now,
    // D5: on a FREE-tier DI ask, ALSO gate against the per-device claim (one free DI
    // per physical device per UTC month, across any account). Absent ⇒ fail-open.
    deviceId: input.deviceId,
  });

  // ── (4) answered path — grounded reflective / timing ────────────────────────
  // CHART-ONLY DEGRADE (§13d-3): source via buildUserInsightProfile but do NOT
  // require completed face+palm readings — a chart-only (or blueprint-incomplete)
  // asker still gets a coherent reflective answer instead of a 400. The assembler
  // passes ONLY the present layers (buildFeatureContext self-omits the absent
  // faceTraits/palmTraits), so NO fabricated face/palm content surfaces. A
  // genuinely missing user/profile still throws AppError(404) → surfaced by the
  // controller.
  const profile = await buildUserInsightProfile(input.userId, {
    requireCompleteReadings: false,
  });
  // ONE lean read → the querent's birthData (natal input + FACE-gate DOB guard) +
  // the REAL fail-closed face-gate flags. Both the engine and assembleQaContext
  // below consume this, so birthData is single-sourced (no double read).
  const serving = await loadQaServingState(input.userId);
  let mode: QaAnswerMode = route === 'timing' ? 'timing' : 'reflective';

  let timing: TimingVerdict | TimingVerdict[] | null = null;
  if (mode === 'timing') {
    try {
      timing = await runTimingForQuestion(serving.birthData, classification, input.location, now);
    } catch (err: any) {
      // Degrade to a grounded reflective answer rather than 500 (§13d-3 hardens).
      logger.warn('qa_timing_engine_failed_degrade_reflective', {
        userId: input.userId,
        category: classification.category,
        error: err?.message ?? String(err),
      });
      timing = null;
      mode = 'reflective';
    }
  }

  // ── (4b) FOLLOW-UP CONTEXT (§13d-6) — last ~6 answered turns of this thread ──
  // On a follow-up (conversationId present) load the prior turns OLDEST-FIRST for the
  // continuity block. Only reflective/timing rows are fetched (safety rows are
  // content-free — "no history for safety routes"). Empty ⇒ a first question, whose
  // assembled context is byte-identical to today's output (graceful absence).
  const history = await loadConversationHistory(input.userId, conversationId);

  // ── (5) assemble grounded context (REAL fail-closed face gate + DOB guard) ──
  const baseContextArgs = {
    profile: profile as FeatureContextInput,
    question,
    timing: mode === 'timing' ? timing : null,
    // REAL face-gate state (§13d-2): the structural gate ALSO requires the
    // independent DOB age-guard (birthDate) to pass — a minor / no-DOB user gets
    // no face content even if the flags were set. Both default false ⇒ fail-closed.
    faceGate: serving.faceGate,
    birthDate: serving.birthData?.date ?? null,
    now,
  };
  let historyUsed = history.length > 0;
  let context: string;
  try {
    context = assembleQaContext({ ...baseContextArgs, history });
  } catch (err: any) {
    // A never-expose scrub in the history block (a methodology leak in one of OUR
    // OWN prior answers) THROWS. Degrade to a NO-HISTORY answer rather than 500 a
    // legitimate follow-up — history is additive continuity, not correctness. A
    // timing-section scrub failure would re-throw on the retry (history removed,
    // timing unchanged) so that internal invariant still surfaces.
    if (historyUsed) {
      logger.warn('qa_history_scrub_failed_degrade_no_history', {
        userId: input.userId,
        conversationId,
        error: err?.message ?? String(err),
      });
      historyUsed = false;
      context = assembleQaContext({ ...baseContextArgs, history: null });
    } else {
      throw err;
    }
  }

  // Never-expose final guard over the engine-produced timing section only.
  if (mode === 'timing' && timing) {
    scrubTimingSection(context);
  }

  // ── (6) answer via the per-tier Q&A model ───────────────────────────────────
  // hasHistory matches what was ACTUALLY spliced (false after a degrade) so the
  // system prompt's continuity directive never claims a block the context lacks.
  const system = buildQaSystemPrompt({ mode, deepInsight, hasHistory: historyUsed });
  const tier = resolveQaTier(input.user, deepInsight);
  const { maxTokens, effort } = qaGenParams(tier, deepInsight);

  const result = await createQaAnswerMessage({
    tier,
    system,
    prompt: context,
    maxTokens,
    effort,
    promptVersion: `qa.${mode}.v1`,
  });

  const answerResult: QaAskResult = {
    answer: result.text.trim(),
    mode,
    deepInsight,
    conversationId,
    answerId,
    remaining,
  };

  // ── (7) PERSIST the answered turn + idempotency (§13d-4) ────────────────────
  // The full calibration record. persistAnsweredTurn dedups on the key's E11000 (a
  // concurrent double-submit) → BOTH callers return the winner's turn; any other
  // persistence miss is logged + swallowed (the user already got a valid answer —
  // spec §11 #5: never refund / 500 over a persistence failure). The location's
  // moment-chart provenance is stamped for the calibration set on every answered
  // turn (reflective or timing).
  const usage: IQaTurnUsage | null = result.usage
    ? {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cacheReadInputTokens: result.usage.cacheReadInputTokens,
        cacheCreationInputTokens: result.usage.cacheCreationInputTokens,
      }
    : null;

  // ── (7b) D5: record the per-device free-DI claim ────────────────────────────
  // ONLY for a FREE-tier DI answer that was actually DELIVERED, and only when the
  // client sent a device id. Recorded POST-answer (mirroring the per-account DI
  // sub-cap, which counts delivered QaTurn rows) so a legit user whose answer failed
  // is never wrongly marked as having consumed their free DI. Best-effort (never
  // throws). Absent id / unset salt ⇒ no-op. The raw id is never persisted/logged.
  if (deepInsight && input.deviceId && getEffectiveTier(input.user) === 'free') {
    await recordDeviceDiClaim(input.deviceId, now);
  }

  return persistAnsweredTurn(input, {
    question,
    result: answerResult,
    idempotencyKey,
    modelUsed: result.model ?? null,
    usage,
    location: resolveQaTurnLocation(input.location, serving.birthData),
    now,
  });
}

// Re-export for the controller's typed error handling.
export { AppError };
