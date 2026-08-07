import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { logAiGeneration } from './aiGeneration.service';
import { sanitiseModelProse } from './prose-sanitiser';

/**
 * R5 synthesis routing — the single-source module for per-surface model routing,
 * the Fable 5 availability flag, and the `createSynthesisMessage` call helper.
 *
 * Build 27 R5 §9 STEP 1 — ADDITIVE + BEHAVIOR-NEUTRAL scaffold. Nothing consumes
 * this yet: every reading still generates via the existing `MODEL` constant and
 * `anthropic.messages.create` calls in claude.service.ts. Step 3 wires the
 * `generate*` functions through `createSynthesisMessage`; the per-surface prompt
 * rewrites + real `PROMPT_VERSION` tags land in step 2.
 *
 * The two resilience layers (do NOT conflate — see R5 plan §4):
 *   1. `SYNTHESIS_FABLE_ENABLED` (default OFF) — the AVAILABILITY/RETENTION layer.
 *      OFF → marquee surfaces run the guaranteed `claude-opus-4-8` path (NO Fable).
 *   2. Server-side `fallbacks` beta — the POLICY-DECLINE layer ONLY. It auto-
 *      recovers a Fable 5 `stop_reason:'refusal'` onto Opus 4.8 inside the same
 *      call. It does NOT rescue availability/retention 400s, rate limits, or 5xx.
 */

// ── Model constants ─────────────────────────────────────────────────────────
export const FABLE_MODEL = 'claude-fable-5';
/** Guaranteed fallback target (both the flag-OFF path and the server-side fallback chain). */
export const FABLE_FALLBACK = 'claude-opus-4-8';
/**
 * The free / high-volume writer. Bumped `claude-sonnet-4-6` → `claude-sonnet-5`
 * (2026-07-31, PM-approved): same $3/$15 per MTok as 4.6 (intro $2/$10 through
 * 2026-08-31) for a clear prose-quality lift, so there was no cost argument for
 * staying on 4.6.
 *
 * 🔴 The cheap path MUST send `thinking: { type: 'disabled' }`. On Sonnet 4.6
 * omitting `thinking` meant NO thinking; on Sonnet 5 omitting it runs ADAPTIVE
 * thinking, and thinking shares the `max_tokens` budget with the response — on
 * these tight JSON surfaces (daily 5500, monthly/compat tier-derived) that
 * silently truncates the JSON into a parse error. There is no 400 to catch it.
 */
export const CHEAP_MODEL = 'claude-sonnet-5';

/** Exact server-side fallback beta header string (verified against the SDK + probe). */
const SERVER_SIDE_FALLBACK_BETA = 'server-side-fallback-2026-06-01';

// ── Per-surface routing (R5 plan §4 table) ──────────────────────────────────
export type SynthesisSurface =
  | 'monthly-premium'
  | 'monthly-free'
  | 'compat-premium'
  | 'compat-free'
  | 'career'
  | 'weekly'
  | 'daily'
  | 'name-destiny'
  | 'report'
  | 'qa'
  | 'validation';

export type SynthesisEffort = 'low' | 'medium' | 'high';

interface SurfaceRoute {
  /** `fable` = marquee paid surface (Fable 5 → Opus 4.8); `cheap` = low-cost model. */
  tier: 'fable' | 'cheap';
  /** Effort for the marquee (Fable/Opus) path only; ignored on the cheap path. */
  effort: SynthesisEffort;
}

/**
 * Which model writes the prose for each surface. All four feature sets are woven
 * into the copy on EVERY surface regardless of model (step 2) — this only chooses
 * the writer, for margin discipline (Fable 5 is $10/$50 vs Sonnet $3/$15 per MTok).
 */
export const SYNTHESIS_MODELS: Record<SynthesisSurface, SurfaceRoute> = {
  // Marquee paid → Fable 5 → Opus 4.8
  'monthly-premium': { tier: 'fable', effort: 'high' }, // flagship comprehensive reading
  'compat-premium': { tier: 'fable', effort: 'medium' }, // paid + viral marquee
  career: { tier: 'fable', effort: 'medium' }, // deep multi-modal synthesis
  weekly: { tier: 'fable', effort: 'medium' }, // Premium Plus only, low volume
  // R9 §14 step 5b — the flagship 18-26pp Personalized Cosmic Report. Mirrors
  // monthly-premium (Fable 5 → Opus 4.8, high effort). The single largest paid
  // generation in the app; long output → the marquee STREAMED path is required
  // (already the case for the `fable`/`opus` tiers). 1/month/paid-user (§6).
  report: { tier: 'fable', effort: 'high' },
  // R7 §13d Step 3.1 — the Conversational Q&A answer surface. NOTE: `qa` does NOT
  // resolve through `resolveRoute`/this row — the answer model is chosen at call
  // time per TIER (free→sonnet-5, paid→opus-4-8, Deep Insight→fable-5) by the
  // dedicated `createQaAnswerMessage` below. This entry exists only to satisfy the
  // exhaustive `Record<SynthesisSurface, …>` + let `logGeneration` accept surface
  // 'qa'; its `tier`/`effort` fields are inert for the qa path.
  qa: { tier: 'fable', effort: 'high' },
  // Cheap / free-tier / arithmetic-heavy → low-cost model (margin discipline)
  daily: { tier: 'cheap', effort: 'medium' }, // free, highest volume
  'monthly-free': { tier: 'cheap', effort: 'medium' },
  'compat-free': { tier: 'cheap', effort: 'medium' },
  'name-destiny': { tier: 'cheap', effort: 'medium' }, // v1: arithmetic-heavy, revisit in A/B
  validation: { tier: 'cheap', effort: 'low' }, // not synthesis
};

/**
 * Fable 5 availability flag — default OFF until the R5 rollout. OFF → marquee
 * surfaces resolve to the guaranteed Opus 4.8 path (no Fable). Documented in the
 * CLAUDE.md env-var table.
 */
export const SYNTHESIS_FABLE_ENABLED =
  (process.env.SYNTHESIS_FABLE_ENABLED || '').trim().toLowerCase() === 'true';

/**
 * Placeholder A/B tag. Step 2 replaces this with a real per-surface `PROMPT_VERSION`
 * (e.g. `daily.v2`, `monthly.v2`) co-located with each prompt builder.
 */
const DEFAULT_PROMPT_VERSION = 'r5.scaffold.v0';

// ── Client (self-contained; step 3 may consolidate with claude.service) ──────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 4,
});

export interface SynthesisImage {
  data: string; // base64
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

export interface CreateSynthesisMessageOptions {
  surface: SynthesisSurface;
  prompt: string;
  maxTokens: number;
  /**
   * Optional SYSTEM prompt (top-level `system`). Used by R9's `report` surface to
   * load the confidential generation prompt as the system role while the USER
   * message carries the injected block. Additive + behavior-neutral: existing
   * callers omit it → `system: undefined` → byte-identical to before (the cached
   * prefix is unchanged). The stable system prefix is an ideal prompt-caching
   * candidate across reports, but caching is NOT wired here (kept minimal).
   */
  system?: string;
  /** Optional vision input (compat partner face, etc.). Fable 5 supports vision. */
  image?: SynthesisImage;
  /** A/B tag stamped on the result; defaults to the scaffold placeholder. */
  promptVersion?: string;
}

/** Token usage for cost/duration logging (R9 §14 step 5b — spec §4). */
export interface SynthesisUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export interface SynthesisMessageResult {
  /** Text of the first text block, AFTER the deterministic prose clean-up. Callers
   *  parse (parseClaudeJSON) — the helper stays surface-agnostic. It is no longer
   *  the byte-exact model output; `emDashesRemoved` says how far it diverges. */
  text: string;
  /** Model that actually served the response (for A/B; reflects a server-side fallback). */
  model: string;
  /** A/B attribution tag. */
  promptVersion: string;
  stopReason: string | null;
  /** True if the served model differs from the requested marquee model (server-side fallback fired). */
  fellBack: boolean;
  /**
   * Token usage from the served response (input/output + cache split). Additive:
   * existing callers ignore it. R9's report orchestration uses it to compute the
   * per-report cost estimate and log it from day one.
   */
  usage: SynthesisUsage;
  /**
   * Em-dashes the deterministic prose clean-up consumed from `text`. Stamped onto
   * the generation log — the only signal that says whether the prompt-level style
   * rule is landing or whether the clean-up is carrying it alone.
   */
  emDashesRemoved: number;
}

/** Resolve which model/path a surface takes, honoring the flag. */
function resolveRoute(surface: SynthesisSurface): {
  model: string;
  path: 'fable' | 'opus' | 'cheap';
  effort: SynthesisEffort;
} {
  const route = SYNTHESIS_MODELS[surface];
  if (route.tier === 'cheap') {
    return { model: CHEAP_MODEL, path: 'cheap', effort: route.effort };
  }
  // Marquee: Fable behind the flag, else the guaranteed Opus 4.8 path.
  return SYNTHESIS_FABLE_ENABLED
    ? { model: FABLE_MODEL, path: 'fable', effort: route.effort }
    : { model: FABLE_FALLBACK, path: 'opus', effort: route.effort };
}

/** Map an Anthropic usage block to the surface-agnostic SynthesisUsage shape. */
function toUsage(u: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
} | undefined | null): SynthesisUsage {
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    cacheReadInputTokens: u?.cache_read_input_tokens ?? undefined,
    cacheCreationInputTokens: u?.cache_creation_input_tokens ?? undefined,
  };
}

/** Build the first text block out of any content shape. */
function extractText(content: Array<{ type: string }>): string {
  const block = content.find((c) => c.type === 'text') as { text?: string } | undefined;
  if (!block || typeof block.text !== 'string') {
    throw new Error('No text response from Claude synthesis call');
  }
  return block.text;
}

/**
 * Extract the model's text AND apply the deterministic prose clean-up, returning
 * both the cleaned text and the count for the generation log.
 *
 * 🔴 THIS IS THE POINT WHERE MODEL OUTPUT BECOMES OUR TEXT, and it is the only
 * thing separating an instruction from a guarantee: a prompt rule leaks on long
 * generations, and the report surface runs past 10K output tokens.
 *
 * Used by ALL THREE result constructions in this module — the cheap path, the
 * marquee path, and the per-tier answer call. Only text a model just produced ever
 * reaches it; nothing authored passes through this function.
 */
function extractAndSanitise(content: Array<{ type: string }>): { text: string; removed: number } {
  const raw = extractText(content);
  const cleaned = sanitiseModelProse(raw);
  return { text: cleaned.text, removed: cleaned.removed };
}

/**
 * Single-source synthesis call helper. Resolves the model from the routing table
 * (flag-gated), issues the request with the correct per-model shape, checks for a
 * refusal BEFORE reading content, and returns the raw text + A/B metadata.
 *
 *   - Fable path: `beta.messages.stream({ model: FABLE_MODEL, betas: [server-side-fallback],
 *     fallbacks: [{ model: 'claude-opus-4-8' }], output_config: { effort } }).finalMessage()`.
 *     Thinking is ALWAYS ON (param omitted); NO temperature/top_p/top_k; STREAMED
 *     (thinking-always-on → minute-long turns; non-streaming risks the client timeout).
 *   - Opus guaranteed path (flag OFF): streamed Opus 4.8, no betas/fallbacks.
 *   - Cheap path: the existing non-beta `anthropic.messages.create(...)` shape, unchanged.
 *
 * A final-chain `stop_reason:'refusal'` → logged + graceful error (never raw content).
 */
export async function createSynthesisMessage(
  opts: CreateSynthesisMessageOptions
): Promise<SynthesisMessageResult> {
  const { surface, prompt, maxTokens, image, system } = opts;
  const promptVersion = opts.promptVersion || DEFAULT_PROMPT_VERSION;
  const { model, path, effort } = resolveRoute(surface);

  logger.info('Synthesis call', { surface, model, path, effort, promptVersion });

  if (path === 'cheap') {
    // Existing non-beta shape — byte-for-byte the same as claude.service today.
    const content: Anthropic.MessageParam['content'] = image
      ? [
          {
            type: 'image',
            source: { type: 'base64', media_type: image.mediaType, data: image.data },
          },
          { type: 'text', text: prompt },
        ]
      : prompt;

    const resp = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      // REQUIRED on Sonnet 5 — see the CHEAP_MODEL note. Omitting this runs
      // adaptive thinking, which eats the max_tokens budget and truncates the
      // JSON. `effort` is deliberately NOT sent: it is inert with thinking off,
      // which is why the `effort` field on the cheap SYNTHESIS_MODELS rows stays
      // unread.
      thinking: { type: 'disabled' },
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content }],
    });

    if (resp.stop_reason === 'refusal') {
      logger.error('Synthesis refusal (cheap path)', { surface, model });
      throw new Error(`Synthesis call refused on ${model} for surface ${surface}`);
    }

    const cleaned = extractAndSanitise(resp.content);
    const result: SynthesisMessageResult = {
      text: cleaned.text,
      model: resp.model,
      promptVersion,
      stopReason: resp.stop_reason ?? null,
      fellBack: false,
      usage: toUsage(resp.usage),
      emDashesRemoved: cleaned.removed,
    };
    logGeneration(surface, result);
    return result;
  }

  // Marquee path (Fable behind the flag, else guaranteed Opus 4.8) — both streamed
  // via the beta endpoint with output_config.effort and NO thinking/sampling params.
  const content: Anthropic.Beta.BetaMessageParam['content'] = image
    ? [
        {
          type: 'image',
          source: { type: 'base64', media_type: image.mediaType, data: image.data },
        },
        { type: 'text', text: prompt },
      ]
    : prompt;

  const stream =
    path === 'fable'
      ? anthropic.beta.messages.stream({
          model: FABLE_MODEL,
          max_tokens: maxTokens,
          ...(system ? { system } : {}),
          betas: [SERVER_SIDE_FALLBACK_BETA],
          fallbacks: [{ model: FABLE_FALLBACK }],
          output_config: { effort },
          messages: [{ role: 'user', content }],
        })
      : anthropic.beta.messages.stream({
          model: FABLE_FALLBACK, // guaranteed Opus 4.8 path (flag OFF)
          max_tokens: maxTokens,
          ...(system ? { system } : {}),
          output_config: { effort },
          messages: [{ role: 'user', content }],
        });

  const msg = await stream.finalMessage();

  // Refusal check BEFORE reading content. The server-side fallback auto-recovers a
  // policy decline onto Opus 4.8 inside the call; a `refusal` here means the whole
  // chain refused → graceful error, never raw content.
  if (msg.stop_reason === 'refusal') {
    logger.error('Synthesis refusal (marquee path, final chain)', {
      surface,
      requestedModel: model,
      servedModel: msg.model,
      stopDetails: msg.stop_details,
    });
    throw new Error(`Synthesis call refused on ${model} chain for surface ${surface}`);
  }

  const cleaned = extractAndSanitise(msg.content);
  const result: SynthesisMessageResult = {
    text: cleaned.text,
    model: msg.model,
    promptVersion,
    stopReason: msg.stop_reason ?? null,
    fellBack: path === 'fable' && msg.model !== FABLE_MODEL,
    usage: toUsage(msg.usage),
    emDashesRemoved: cleaned.removed,
  };
  logGeneration(surface, result);
  return result;
}

/**
 * Fire-and-forget A/B generation log (R5 §9 step 4). Centralized here so every
 * synthesis generation — all 6 surfaces, both the cheap and marquee paths — is
 * logged once, uniformly, with the surface/promptVersion/model/fellBack/
 * stopReason the helper already has. NON-BLOCKING (`void`) + swallow-on-error
 * inside `logAiGeneration`: a log write can never add latency to, or throw
 * into, a reading. `userId` is intentionally NOT threaded through the helper
 * (optional per the plan) — surface-level A/B does not need it, and the log
 * shape stays additive + zero-impact on the returned reading.
 */
function logGeneration(surface: SynthesisSurface, result: SynthesisMessageResult): void {
  void logAiGeneration({
    surface,
    promptVersion: result.promptVersion,
    model: result.model,
    fellBack: result.fellBack,
    stopReason: result.stopReason,
    // 2026-07-31: `usage` was already on the result and discarded here. Persisting
    // it makes per-surface COST measurable off the log (the daily-insight-vs-Haiku
    // question) instead of estimated. Still fire-and-forget + swallow-on-error.
    usage: result.usage,
    emDashesRemoved: result.emDashesRemoved,
  });
}

// ── R7 §13d Step 3.1 — Conversational Q&A answer call (per-tier routing) ──────
/**
 * The three Q&A answer tiers (R7 §13d MODEL ROUTING, verified via the claude-api
 * skill 2026-07-24):
 *   • free        → `claude-sonnet-5`  (adaptive thinking; effort per tier)
 *   • paid        → `claude-opus-4-8`  (EXPLICIT adaptive thinking — omitting the
 *                   `thinking` param on Opus 4.8 runs it WITHOUT thinking)
 *   • deep_insight→ `claude-fable-5`   (thinking always on) behind the SAME
 *                   `SYNTHESIS_FABLE_ENABLED` gate + server-side fallback to
 *                   Opus 4.8; flag OFF → the guaranteed Opus 4.8 path.
 * NEVER send budget_tokens / temperature / top_p / top_k (all 400 on these
 * models). Depth is steered by prompt + `output_config.effort`.
 */
export type QaAnswerTier = 'free' | 'paid' | 'deep_insight';

export const QA_FREE_MODEL = 'claude-sonnet-5';
/** Paid-regular + the guaranteed Deep-Insight fallback target (= FABLE_FALLBACK). */
export const QA_PAID_MODEL = FABLE_FALLBACK; // 'claude-opus-4-8'

/** Explicit adaptive thinking — REQUIRED on Opus 4.8 (omission = no thinking),
 *  accepted on Sonnet 5, and the always-on default on Fable 5. One config for all. */
const QA_ADAPTIVE_THINKING = { type: 'adaptive' } as const;

export interface CreateQaAnswerMessageOptions {
  tier: QaAnswerTier;
  /** SYSTEM prompt (buildQaSystemPrompt output). */
  system: string;
  /** USER message = the assembled grounded context (assembleQaContext output). */
  prompt: string;
  maxTokens: number;
  /** output_config.effort; defaults to 'high'. */
  effort?: SynthesisEffort;
  promptVersion?: string;
}

/**
 * Issue the Q&A answer generation. Resolves the model from the tier, streams the
 * response SERVER-SIDE (thinking-on turns can run long → non-streaming risks the
 * client timeout; the HTTP response to the app is still a single non-streamed
 * JSON), checks for a refusal BEFORE reading content, and returns the raw text +
 * A/B metadata. Deep Insight carries the R5 server-side fallback beta unchanged.
 */
export async function createQaAnswerMessage(
  opts: CreateQaAnswerMessageOptions
): Promise<SynthesisMessageResult> {
  const effort = opts.effort ?? 'high';
  const promptVersion = opts.promptVersion || DEFAULT_PROMPT_VERSION;
  const surface: SynthesisSurface = 'qa';

  // Resolve model + path from the tier (NOT resolveRoute — see the qa row above).
  let model: string;
  let path: 'sonnet' | 'opus' | 'fable';
  if (opts.tier === 'free') {
    model = QA_FREE_MODEL;
    path = 'sonnet';
  } else if (opts.tier === 'paid') {
    model = QA_PAID_MODEL;
    path = 'opus';
  } else {
    // deep_insight → Fable 5 behind the flag, else the guaranteed Opus 4.8 path.
    if (SYNTHESIS_FABLE_ENABLED) {
      model = FABLE_MODEL;
      path = 'fable';
    } else {
      model = FABLE_FALLBACK;
      path = 'opus';
    }
  }

  logger.info('QA answer call', { surface, tier: opts.tier, model, path, effort, promptVersion });

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: opts.prompt }];

  // All paths stream via the beta endpoint (matches the R5 marquee path — that is
  // where `output_config.effort` + `fallbacks` are wired). Fable adds the
  // server-side fallback beta; sonnet/opus omit it. Thinking is explicit-adaptive
  // on every path (mandatory on Opus 4.8).
  const stream =
    path === 'fable'
      ? anthropic.beta.messages.stream({
          model: FABLE_MODEL,
          max_tokens: opts.maxTokens,
          system: opts.system,
          betas: [SERVER_SIDE_FALLBACK_BETA],
          fallbacks: [{ model: FABLE_FALLBACK }],
          thinking: QA_ADAPTIVE_THINKING,
          output_config: { effort },
          messages,
        })
      : anthropic.beta.messages.stream({
          model, // sonnet-5 (free) or opus-4-8 (paid / flag-OFF Deep Insight)
          max_tokens: opts.maxTokens,
          system: opts.system,
          thinking: QA_ADAPTIVE_THINKING,
          output_config: { effort },
          messages,
        });

  const msg = await stream.finalMessage();

  // Refusal check BEFORE reading content. For Fable's fallback chain, a refusal
  // here means the whole chain (incl. Opus 4.8) refused → graceful error.
  if (msg.stop_reason === 'refusal') {
    logger.error('QA answer refusal', {
      surface,
      tier: opts.tier,
      requestedModel: model,
      servedModel: msg.model,
      stopDetails: msg.stop_details,
    });
    throw new Error(`QA answer call refused on ${model} for tier ${opts.tier}`);
  }

  const cleaned = extractAndSanitise(msg.content);
  const result: SynthesisMessageResult = {
    text: cleaned.text,
    model: msg.model,
    promptVersion,
    stopReason: msg.stop_reason ?? null,
    fellBack: path === 'fable' && msg.model !== FABLE_MODEL,
    usage: toUsage(msg.usage),
    emDashesRemoved: cleaned.removed,
  };
  logGeneration(surface, result);
  return result;
}
