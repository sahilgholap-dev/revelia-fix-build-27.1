import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Build 27 R9 §14 step 3a — the Personalized Cosmic Report record.
 *
 * A Report doc IS the async job record: it is created at ENQUEUE as `queued`
 * (mirrors `CareerDestiny.ts` as a per-user generated-output doc) and advanced
 * by the cron-claim worker (§14 step 4) through generating → ready | failed.
 *
 * ⚠️ CREDIT PREDICATE (§14 step 3/4, authoritative over §6 ~:373; §6/§12-D3
 * reconciled to match in commit 232fa58): remaining credit =
 *   tierLimit − countDocuments({ userId, status: { $ne: 'failed' },
 *                                createdAt: { within the current UTC month } })
 * i.e. RESERVE-AT-ENQUEUE. The `queued` doc counts IMMEDIATELY, reserving the
 * credit and blocking a concurrent double-enqueue on the single-instance
 * backend. A terminally-`failed` report is EXCLUDED (credit refunded); a stale
 * `generating` is timed-out → `failed` by the worker (refund). `createdAt` (the
 * enqueue time, via `timestamps`) is the credit bucket. `generatedAt` plays NO
 * role in this count — it is the COMPLETION stamp (results-page "Generated
 * <date>" + analytics), written ONLY when a QA-passed report becomes `ready`.
 *
 * v1 is SELF-only, but the schema carries the typed `otherSubject` block now
 * (unpopulated) so the deferred someone-else phase (Phase D) is turn-on-ready
 * with no migration. `otherSubject` mirrors `CompatibilityReading.partner*`
 * (`shared.ts` ~:756-774).
 *
 * ADDITIVE as of step 3a. Step 3b extends this model with the `monthKey` field
 * + a PARTIAL UNIQUE INDEX on `{ userId, monthKey }` that makes the reserve-at-
 * enqueue predicate ATOMIC at the DB layer: at most one NON-FAILED report per
 * user per UTC month. A concurrent 2nd insert throws `E11000` (the controller
 * turns that into the 402 over-limit response); a report that goes `failed`
 * drops out of the partial index → the month's slot is auto-refunded.
 *
 * ⚠️ WORKER DEPENDENCY (step 4): a stuck report MUST be retried by MUTATING the
 * existing doc (attempts++, status flip), NEVER by inserting a second doc for
 * the same `{ userId, monthKey }` — a second non-failed doc collides with the
 * unique index. A stale `generating` holds the slot until the step-4 timeout
 * flips it to `failed` (which refunds it), so that timeout is load-bearing for
 * credit correctness, not just hygiene.
 */

export type ReportSubject = 'self' | 'other';
export type ReportSubjectType = 'adult' | 'child';
export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed';

/**
 * Typed third-party subject block (Phase D — someone-else path). Mirrors
 * `CompatibilityReading.partner*`. Schema present in v1 but LEFT UNPOPULATED
 * (self-only); NO third-party palm ever (BIPA).
 */
export interface IReportOtherSubject {
  name: string;
  dob: string;   // ISO date "1990-05-15"
  tob?: string;  // "HH:mm"
  pob?: string;  // place-of-birth text (geocoded server-side)
}

/**
 * Results-page payload (highlights first, PDF below). Typed as an EXPLICIT
 * interface (never Mixed/any) so the DTO stays type-safe now; step 5/9 may
 * refine the shape.
 */
export interface IReportHighlights {
  headline?: string;
  summary?: string;
  keyPoints?: string[];
}

/** Server-only per-report generation cost/usage (spec §4 — logged from day one). */
export interface IReportUsage {
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
}

/** Optional user feedback on a delivered report. */
export interface IReportFeedback {
  rating?: number;
  comment?: string;
  submittedAt?: Date;
}

/**
 * Server-only QA verdict (R9 §14 step 7 — the deterministic pre-`ready` gate,
 * spec §4 "log the gate result"). A report reaches `ready` ONLY on a QA-PASS; a
 * persistent QA-FAIL becomes `failed` with these failures recorded. NOT in the
 * mobile DTO.
 */
export interface IReportQa {
  pass?: boolean;
  /** Classified failures ("check[CLASS]: detail") when the gate did not pass. */
  failures?: string[];
  /** Aggregate repair class of the last verdict (CONTENT | RENDER). */
  failureClass?: string;
}

export interface IReport extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  subject: ReportSubject;
  subjectType: ReportSubjectType;
  /** Phase D typed third-party inputs; unpopulated in v1 (self reads UserProfile.birthData). */
  otherSubject?: IReportOtherSubject;

  /**
   * UTC `YYYY-MM` bucket, derived from the enqueue instant (== UTC-month-of
   * `createdAt`), set ONCE at create and IMMUTABLE thereafter. Enforcement (the
   * partial unique index below) and display (the controller's month-range
   * count) both resolve to this same UTC bucket, so they can never disagree at
   * a month boundary. NEVER recompute on update — a recompute would move the
   * lock and either double-lock or leak a slot.
   */
  monthKey: string;

  status: ReportStatus;
  failureReason?: string;
  attempts: number;

  // Server-only generation metadata (NOT in the mobile DTO).
  // `modelUsed` (not `model`) mirrors `AiGeneration.ts` — `model` clashes with
  // Mongoose's reserved `Document.model` method.
  modelUsed?: string;
  usage?: IReportUsage;
  costEstimate?: number;

  /**
   * Per-report idempotency nonce (R9 §14 step 5b — double-bill defense). Stamped
   * ONCE when generation first begins; the persisted `interpretation` is tagged
   * with it. If a sweep re-queues a report whose generation already completed and
   * a later tick re-claims it, `generateReport` sees the persisted
   * `{ interpretation, generationNonce }` and RETURNS it instead of re-calling
   * Fable — so a re-claim never re-bills. SERVER-ONLY (never in the mobile DTO).
   */
  generationNonce?: string;
  /**
   * The raw Fable/Opus model output — the interpretive text step 6's renderer
   * consumes. SERVER-ONLY (never in the mobile DTO; the mobile results page reads
   * only `highlights` + a freshly-minted `secureLink`). Persisted tagged with
   * `generationNonce` for the idempotency short-circuit above.
   */
  interpretation?: string;

  /**
   * R9 §14 step 9 DO 7 — the FULL inject payload JSON (astronomy + numerology +
   * palm), persisted ONCE at first generation. The FREE rebuild path (DO 8) renders
   * from THIS persisted payload — NOT a today-recomputed one — so a rebuilt PDF's
   * dasha.current / transit-ingress / Sade-Sati tables stay faithful to the
   * original-asOf prose (a naive rebuild-for-today would drift = a correctness bug).
   * ~10-20KB of JSON per doc; SERVER-ONLY (never in the mobile DTO). Mixed so the
   * structured `ReportInjectPayload` round-trips without a per-field schema.
   */
  injectPayload?: any;

  // Delivery (server-only inputs; the DTO surfaces only a freshly-minted secureLink).
  pdfKey?: string;
  secureLink?: string;
  linkExpiresAt?: Date;

  /**
   * R9 §14 step 8 — one-time report-ready email idempotency stamp. Set ATOMICALLY
   * (and checked-before-sending) when the ready email is dispatched, so a restart/
   * redeploy or a concurrent tick can never double-send. MANDATORY that this be
   * PERSISTED (an in-memory guard would re-email after a redeploy). SERVER-ONLY.
   */
  reportEmailSentAt?: Date;

  /**
   * R9 §14 step 9 DO 8 — FREE rebuild-in-progress flag. An EXPIRED report (its
   * 60-day R2 PDF gone, but `status:'ready'` and interpretation+injectPayload
   * still durable) can rebuild its PDF from the stored interpretation with NO
   * re-Fable and NO credit charge. Set ATOMICALLY by the rebuild route (the
   * concurrent-rebuild / double-tap guard: `regenerating:{$ne:true}` → true),
   * cleared by the worker when the re-render + QA + re-upload completes (or fails).
   * The report NEVER leaves `status:'ready'` during a rebuild — so the credit
   * index is untouched and a rebuild failure can never refund a consumed credit.
   * SURFACED in the DTO so the mobile hub polls it for the "rebuilding" state.
   */
  regenerating?: boolean;

  /**
   * R9 §14 step 9 DO 4 — the QA-computed page count of the delivered PDF, persisted
   * on a QA-pass. Surfaced additively in the DTO for the Ready-screen meta
   * ("{pageCount} pages"), so the client never fabricates a count.
   */
  pageCount?: number;

  highlights?: IReportHighlights;
  feedback?: IReportFeedback;

  /** R9 §14 step 7 — QA verdict + render duration (server-only; spec §4 logging). */
  qa?: IReportQa;
  renderDurationMs?: number;

  /** COMPLETION stamp — written only when a QA-passed report becomes `ready`. NOT the credit field. */
  generatedAt?: Date;
  createdAt: Date;  // enqueue time — IS the credit bucket
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    subject: {
      type: String,
      enum: ['self', 'other'],
      required: true,
      default: 'self',
    },
    subjectType: {
      type: String,
      enum: ['adult', 'child'],
      required: true,
      default: 'adult',
    },

    otherSubject: {
      name: String,
      dob: String,
      tob: String,
      pob: String,
    },

    monthKey: {
      type: String,
      required: true,
      immutable: true, // set once at enqueue; the credit lock must never move
    },

    status: {
      type: String,
      enum: ['queued', 'generating', 'ready', 'failed'],
      required: true,
      default: 'queued',
    },
    failureReason: String,
    attempts: { type: Number, default: 0 },

    modelUsed: String,
    usage: {
      inputTokens: Number,
      outputTokens: Number,
      thinkingTokens: Number,
    },
    costEstimate: Number,

    // R9 §14 step 5b — server-only generation fields (additive; no index).
    generationNonce: String,
    interpretation: String,
    // R9 §14 step 9 DO 7 — full inject payload for a faithful FREE rebuild
    // (server-only; Mixed; no index; ~10-20KB/doc).
    injectPayload: Schema.Types.Mixed,

    pdfKey: String,
    secureLink: String,
    linkExpiresAt: Date,
    reportEmailSentAt: Date, // R9 §14 step 8 — one-time ready-email idempotency stamp
    regenerating: Boolean,   // R9 §14 step 9 DO 8 — free rebuild-in-progress flag
    pageCount: Number,       // R9 §14 step 9 DO 4 — QA-computed page count (DTO meta)



    highlights: {
      headline: String,
      summary: String,
      keyPoints: [String],
    },

    feedback: {
      rating: Number,
      comment: String,
      submittedAt: Date,
    },

    // R9 §14 step 7 — QA verdict + render duration (additive; server-only; no index).
    qa: {
      pass: Boolean,
      failures: [String],
      failureClass: String,
    },
    renderDurationMs: Number,

    generatedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret._id = ret._id.toString();
        ret.userId = ret.userId.toString();
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.generatedAt) ret.generatedAt = ret.generatedAt.toISOString();
        if (ret.linkExpiresAt) ret.linkExpiresAt = ret.linkExpiresAt.toISOString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Credit / concurrency count access path: userId equality + createdAt month-range,
// filtering out terminally-`failed` docs (§14 step 3/4 reserve-at-enqueue predicate).
reportSchema.index({ userId: 1, status: 1, createdAt: 1 });

// Worker access path: claim the oldest `queued` job + sweep stale `generating`
// docs for the timeout → `failed` transition (§14 step 4).
reportSchema.index({ status: 1, createdAt: 1 });

// ATOMIC reserve-at-enqueue (§14 step 3b) — the crux that beats the double-tap
// race. The DB enforces AT MOST ONE non-failed report per user per UTC month:
// two simultaneous POSTs both try to insert a `queued` doc for the same
// `{ userId, monthKey }`; the 2nd throws `E11000 duplicate key`, which the
// controller maps to the 402 over-limit response. A report that transitions to
// `failed` leaves the partial index → the slot is auto-refunded and the next
// POST succeeds.
//
// NOTE: partialFilterExpression does NOT support `$ne`, so the "non-failed" set
// is expressed as an `$in` over the three live statuses — semantically
// identical to `status ≠ 'failed'` across the enum, and a valid partial-filter
// operator.
reportSchema.index(
  { userId: 1, monthKey: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['queued', 'generating', 'ready'] } },
  }
);

export const Report = mongoose.model<IReport>('Report', reportSchema);
