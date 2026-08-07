import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * R7 Conversational Q&A (Build 27) — §6 data model / §13d charter STEP 3.4.
 *
 * ONE row per question, captured on EVERY route with NO sampling (§4: this is
 * the calibration set — the future accuracy dataset, complete from day one).
 * `answerQuestion` (qa.service) persists a turn on both the answered path
 * (reflective / timing) and the safety short-circuit (crisis / unsafe /
 * off_topic).
 *
 * ── PRIVACY (DPDP/GDPR launch-gate, owner-actions #1) ─────────────────────────
 * A crisis / unsafe row is **LABEL + TIMESTAMP ONLY**: `question` and `answer`
 * are NEVER written for those modes (self-harm content is health-adjacent and
 * must never feed analytics / marketing / model training), and neither is the
 * `location`, `model`, `usage`, or an idempotency key. The `mode` label plus the
 * `timestamp` / `createdAt` is the whole record. The service enforces this — the
 * schema simply makes every content field optional so a content-free row is
 * valid. (`off_topic` is not health-adjacent, but is served the same content-free
 * way: it carries no answer content of ours worth storing either.)
 *
 * ── IDEMPOTENCY (§6 idempotency store; mirrors report.service) ────────────────
 * report.service dedups a re-claim via a persisted-result short-circuit + a
 * unique constraint (the per-report nonce / the `{userId, monthKey}` partial
 * unique index). The Q&A analog is `idempotencyKey` + the partial unique index
 * `{ userId, idempotencyKey }`: a client auto-retry / rapid double-submit resolves
 * to ONE turn, so a future monthly cap (§13d-5, which counts QaTurn rows) charges
 * it once and we persist it once. Safety rows carry NO key — they cost no model
 * call and no credit, so there is nothing to dedup (a retry simply re-serves the
 * hardcoded string).
 */

export type QaTurnMode = 'reflective' | 'timing' | 'crisis' | 'unsafe' | 'off_topic';
export type QaLocationSource = 'device' | 'last_known' | 'birth';
export type QaFeedback = 'up' | 'down' | null;

/** Token usage from the served answer model (cost/calibration). */
export interface IQaTurnUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

/** City-level provenance of the timing MOMENT-chart location (§6). */
export interface IQaTurnLocation {
  city?: string | null;
  source: QaLocationSource;
  fallbackFlagged: boolean;
}

export interface IQaTurn extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Optional multi-turn thread id (follow-up context splice is a later step). */
  conversationId?: string | null;
  /** The user's question. EMPTY for crisis/unsafe/off_topic (content-free rows). */
  question: string;
  /** The served answer. EMPTY for crisis/unsafe/off_topic (content-free rows). */
  answer: string;
  /** The answerId echoed to the client (service-generated ObjectId string). */
  answerId: string;
  mode: QaTurnMode;
  deepInsight: boolean;
  /** Served answer-model id; absent on safety declines (no model call). */
  modelUsed?: string | null;
  usage?: IQaTurnUsage | null;
  /** 👍 / 👎 (later endpoint); null until graded. */
  feedback: QaFeedback;
  /** Dedup key (client key or windowed auto key); absent on safety rows. */
  idempotencyKey?: string | null;
  /** Server clock, truncated to the minute (§6). */
  timestamp: Date;
  /** Present on answered rows; omitted on content-free safety rows. */
  location?: IQaTurnLocation | null;
  createdAt: Date;
  updatedAt: Date;
}

const usageSchema = new Schema<IQaTurnUsage>(
  {
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    cacheReadInputTokens: { type: Number },
    cacheCreationInputTokens: { type: Number },
  },
  { _id: false }
);

const locationSchema = new Schema<IQaTurnLocation>(
  {
    city: { type: String, default: null },
    source: { type: String, enum: ['device', 'last_known', 'birth'], required: true },
    fallbackFlagged: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const qaTurnSchema = new Schema<IQaTurn>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: { type: String, default: null },
    // Content fields are optional at the schema level so a content-free safety row
    // (label+timestamp only) is valid; the service defaults them to '' on answered
    // rows and never sets them on crisis/unsafe/off_topic rows.
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
    answerId: { type: String, required: true },
    mode: {
      type: String,
      enum: ['reflective', 'timing', 'crisis', 'unsafe', 'off_topic'],
      required: true,
    },
    deepInsight: { type: Boolean, required: true, default: false },
    modelUsed: { type: String, default: null },
    usage: { type: usageSchema, default: null },
    feedback: { type: String, enum: ['up', 'down', null], default: null },
    idempotencyKey: { type: String, default: null },
    timestamp: { type: Date, required: true },
    location: { type: locationSchema, default: null },
  },
  { timestamps: true, collection: 'qa_turns' }
);

// Cap counting (§13d-5 counts rows in the current UTC month) + per-user history.
qaTurnSchema.index({ userId: 1, createdAt: -1 });
// Follow-up context (§7 last-N-turns, wired in a later step) reads by thread.
qaTurnSchema.index({ userId: 1, conversationId: 1, createdAt: -1 });

// IDEMPOTENCY — at most ONE turn per { userId, idempotencyKey }. Partial so the
// null-key safety rows (which carry no key) are exempt (a plain unique index would
// otherwise collide on repeated nulls). A concurrent 2nd insert with the same key
// throws E11000, which the service maps to a short-circuit reuse of the winner's
// persisted answer — mirroring report.service's { userId, monthKey } partial index.
qaTurnSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
);

export const QaTurn = mongoose.model<IQaTurn>('QaTurn', qaTurnSchema);
