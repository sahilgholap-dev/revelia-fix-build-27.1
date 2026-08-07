import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Build 27 R5 §9 STEP 4 — A/B generation log.
 *
 * Sibling of `AiFailure`: where `AiFailure` records synthesis FAILURES, this
 * records every successful synthesis GENERATION so the D7/D30-retention /
 * regeneration-rate / free→paid A/B (old engine vs the Fable-5/Opus-4.8
 * engine) is measurable off the log later. It stores ONLY generation metadata
 * — never reading content, prompts, images, or birth data. Additive: no
 * reading/InsightCache CONTENT shape changes; mobile is untouched.
 */

export interface IAiGeneration extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  /** Synthesis surface (SynthesisSurface): daily, weekly, monthly-premium/free, compat-premium/free, career, name-destiny, validation. */
  surface: string;
  /** A/B prompt-version tag (e.g. `daily.v2`) stamped by the generate fn. */
  promptVersion: string;
  /**
   * Model that actually served the response (reflects a server-side fallback).
   * Named `modelUsed` (not `model`) to mirror `AiFailure` and avoid clashing
   * with Mongoose's reserved `Document.model` method.
   */
  modelUsed: string;
  /** True when the served model differs from the requested marquee model (server-side fallback fired). */
  fellBack: boolean;
  /** `end_turn` | `max_tokens` | `refusal` | … (null if the SDK omitted it). */
  stopReason?: string | null;
  /**
   * Token usage from the served response (2026-07-31). The helper already had
   * this on `SynthesisMessageResult` and threw it away; persisting it is what
   * makes per-surface COST measurable instead of estimated — the open question
   * is whether daily insight dominates free-tier spend enough to justify moving
   * it to Haiku. Optional: rows written before this field existed have none.
   */
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadInputTokens?: number | null;
  cacheCreationInputTokens?: number | null;
  /**
   * How many em-dashes the deterministic prose clean-up consumed from this
   * generation's output (2026-08-05). This is the ONLY way to know whether the
   * prompt-level style rule is working: a rate trending to zero means the
   * instruction landed and the clean-up has become a no-op; a flat rate means the
   * instruction is being dropped and the clean-up is the only thing holding the
   * line. Optional: rows written before this field existed have none, and a row
   * with 0 means the generation arrived already clean.
   */
  emDashesRemoved?: number | null;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AiGenerationSchema = new Schema<IAiGeneration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    surface: { type: String, required: true, index: true },
    promptVersion: { type: String, required: true, index: true },
    modelUsed: { type: String, required: true, index: true },
    fellBack: { type: Boolean, required: true, default: false, index: true },
    stopReason: { type: String, default: null },
    inputTokens: { type: Number, default: null },
    outputTokens: { type: Number, default: null },
    cacheReadInputTokens: { type: Number, default: null },
    cacheCreationInputTokens: { type: Number, default: null },
    emDashesRemoved: { type: Number, default: null },
    generatedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true, collection: 'ai_generations' }
);

AiGenerationSchema.index({ createdAt: -1 });

export const AiGeneration = mongoose.model<IAiGeneration>('AiGeneration', AiGenerationSchema);
