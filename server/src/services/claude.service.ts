import Anthropic from '@anthropic-ai/sdk';
import {
  buildFaceReadingPrompt,
  FACE_PROMPT_VERSION,
  FaceReadingOutput,
  FaceReadingSubstance,
} from '../prompts/face-reading.prompt';
import {
  buildPalmReadingPrompt,
  PALM_PROMPT_VERSION,
  PalmReadingOutput,
  PalmReadingSubstance,
  palmTypeDisplayName,
} from '../prompts/palm-reading.prompt';
import { buildDailyInsightPrompt, DAILY_PROMPT_VERSION } from '../prompts/daily-insight.prompt';
import { buildWeeklyForecastPrompt, WEEKLY_PROMPT_VERSION } from '../prompts/weekly-forecast.prompt';
import { buildMonthlyReadingPrompt, MONTHLY_PROMPT_VERSION } from '../prompts/monthly-reading.prompt';
import { buildCompatibilityPrompt, COMPAT_PROMPT_VERSION } from '../prompts/compatibility.prompt';
import { HONESTY_PREAMBLE } from '../prompts/shared/honesty-preamble';
import { buildFeatureContext } from '../prompts/shared/feature-context';
import {
  UserInsightProfile,
  DailyInsightOutput,
  WeeklyForecastOutput,
  MonthlyReadingOutput,
  CompatibilityOutput,
  UserCompatibilityProfile,
  PartnerCompatibilityProfile,
  RelationshipType,
} from '../types/shared';
import { logger } from '../utils/logger';
import { safeJsonParse } from '../utils/jsonParser';
import { normalizeDatesInObject } from '../utils/dateFormat';
import { logAiFailure } from './aiFailure.service';
import { logAiGeneration } from './aiGeneration.service';
import { createSynthesisMessage } from './synthesis-routing';
import { sanitiseModelProse } from './prose-sanitiser';
import axios from 'axios';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 4,
});

/**
 * Face + palm (and `testClaudeConnection`). Bumped `claude-sonnet-4-6` →
 * `claude-sonnet-5` (2026-07-31, PM-approved) alongside CHEAP_MODEL in
 * synthesis-routing.ts. Unlike the cheap surfaces, face/palm run ADAPTIVE
 * thinking at `effort: 'medium'` — they are the first-impression readings and
 * their volume is bounded by signups, not by DAU, so reasoning spend is cheap
 * here. That is also why their max_tokens had to grow: thinking shares the
 * budget with the response.
 */
const MODEL = 'claude-sonnet-5';

/**
 * User context for personalization
 */
interface UserContext {
  name?: string;
  sunSign?: string;
  lifePathNumber?: number;
  userId?: string;
}

/**
 * Fetch image from URL and convert to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mediaType: string }> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const buffer = Buffer.from(response.data);
    const base64 = buffer.toString('base64');
    
    // Determine media type from content-type header or default to jpeg
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const mediaType = contentType.includes('png') ? 'image/png' : 
                      contentType.includes('webp') ? 'image/webp' :
                      contentType.includes('gif') ? 'image/gif' : 'image/jpeg';
    
    return { data: base64, mediaType };
  } catch (error: any) {
    logger.error('Failed to fetch image:', { imageUrl, error: error.message });
    throw new Error(`Failed to fetch image: ${error.message}`);
  }
}

/**
 * Utility for retrying failed API calls
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && isRetryableError(error)) {
      logger.warn(`Retrying API call. Retries left: ${retries}`, { error: error.message });
      await sleep(delay);
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.status === 429 || // Rate limit
    error.status === 500 || // Server error
    error.status === 503 || // Service unavailable
    error.status === 529    // Anthropic overloaded
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse JSON from Claude response. Delegates to the shared safeJsonParse
 * utility, which strips markdown fences, recovers the first JSON object,
 * and throws a TruncatedAIResponseError when the response was cut off.
 *
 * 🔴 IT IS ALSO THE SECOND INSTALL POINT FOR THE PROSE CLEAN-UP, AND THAT IS NOT
 * BELT-AND-BRACES. IT IS THE ONLY COVERAGE FACE AND PALM GET.
 *
 * The obvious home for the clean-up is `createSynthesisMessage`, and it is installed
 * there too. But `generateFaceReading` and `generatePalmReading` do NOT go through
 * it: they are Vision calls issued directly against the client. A clean-up installed
 * only in the routing helper would therefore miss the two readings that are both the
 * app's entry funnel AND the ones that NEVER EXPIRE. This function is the shared
 * funnel every JSON surface does pass through, face and palm included.
 *
 * Running it here on text the routing helper already cleaned is harmless: the
 * transform is idempotent, so the second pass finds nothing and reports 0.
 *
 * Sanitising BEFORE the parse is deliberate. A comma inside a JSON string literal is
 * legal and needs no escaping, so the replacement cannot break the document, and
 * cleaning the payload once is simpler and more complete than walking the parsed tree
 * looking for prose fields.
 */
function parseClaudeJSON<T>(text: string, context: string, meter?: { removed: number }): T {
  const cleaned = sanitiseModelProse(text);
  // 🟢 P99 — the count is handed BACK to the caller when one asks, so face and palm
  //    can persist `emDashesRemoved` on their own `ai_generations` row exactly as
  //    the routed surfaces do. OPTIONAL on purpose: the other seven call sites are
  //    untouched and still pass two arguments, so this is additive rather than a
  //    nine-site refactor of a function on the reading path.
  if (meter) meter.removed = cleaned.removed;
  if (cleaned.removed > 0) {
    // ⚠️ THIS LINE PREDATES P99 AND IS KEPT, but its old justification is gone: it
    //    used to say face and palm create no `ai_generations` row at all, so this
    //    log was the only record of their clean-up rate. They now create one. The
    //    line stays because it also carries `rangesConverted`, which the row does
    //    not, and because it fires for all nine contexts rather than two.
    logger.info('prose_sanitised', {
      surface: context,
      emDashesRemoved: cleaned.removed,
      rangesConverted: cleaned.ranges,
    });
  }
  return safeJsonParse<T>(cleaned.text, context);
}

/**
 * Reconcile a traits-driven face reading with its FIXED measured substance.
 *
 * Build 27 R2 step 5 (Sid decision #3): the archetype name/tagline, the face
 * shape, and every trait score are rules-derived — the LLM authored ONLY the
 * prose around them. This pins that substance back onto the parsed output so it
 * is exactly the measured layer regardless of any model drift, while keeping the
 * model's prose descriptions. Pure/deterministic; runs only on the traits path.
 */
function reconcileFaceSubstance(
  reading: FaceReadingOutput,
  substance: FaceReadingSubstance
): FaceReadingOutput {
  if (reading.archetype) {
    reading.archetype.name = substance.archetype.name;
    reading.archetype.tagline = substance.archetype.tagline;
  }
  if (substance.faceShape && reading.faceShape) {
    reading.faceShape.detected = substance.faceShape;
  }

  // Index the model's per-trait prose by (lowercased) trait name.
  const modelByTrait = new Map<string, { description?: string }>();
  for (const t of reading.traitAnalysis ?? []) {
    if (t && typeof t.trait === 'string') modelByTrait.set(t.trait.toLowerCase(), t);
  }

  // Rebuild traitAnalysis from the fixed substance: names + scores are pinned,
  // descriptions keep the model's prose (falling back to the rules phrasing).
  reading.traitAnalysis = substance.traits.map((t) => {
    const model = modelByTrait.get(t.trait.toLowerCase());
    return {
      trait: t.trait,
      score: t.score,
      description: model?.description || t.description || '',
    };
  });

  return reading;
}

/**
 * Generate face reading.
 *
 * Build 27 R2 step 5: when `substance` (the rules-derived trait layer) is
 * present, the reading is DRIVEN BY the traits — the image is dropped from the
 * call for maximal stability and the output substance is pinned to the measured
 * values. When absent (extraction failed / pre-R2 user), the legacy image-based
 * Vision call runs as a fail-open fallback so no user loses their reading.
 */
export async function generateFaceReading(
  imageUrl: string,
  tier: 'free' | 'premium',
  userContext?: UserContext,
  substance?: FaceReadingSubstance
): Promise<FaceReadingOutput> {
  const prompt = buildFaceReadingPrompt(tier, userContext, substance);
  const traitsDriven = !!(substance && substance.traits && substance.traits.length > 0);

  logger.info('Generating face reading', {
    tier,
    hasContext: !!userContext,
    traitsDriven,
  });

  // Traits-driven: no image (substance IS the reading's foundation). Fallback:
  // send the image alongside the legacy prompt.
  let messageContent: Anthropic.MessageParam['content'];
  if (traitsDriven) {
    messageContent = prompt;
  } else {
    const { data: imageData, mediaType } = await fetchImageAsBase64(imageUrl);
    messageContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: imageData,
        },
      },
      {
        type: 'text',
        text: prompt,
      },
    ];
  }

  // 8192 → 16000 for the Sonnet 5 bump: adaptive thinking shares this budget
  // with the response, and Sonnet 5's tokenizer counts the same text ~30% higher
  // than 4.6 did. 8192 truncated occasionally BEFORE thinking was added. 16000 is
  // the ceiling that stays safe without streaming.
  const FACE_MAX_TOKENS = 16000;
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: FACE_MAX_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    messages: [{
      role: 'user',
      content: messageContent,
    }],
  });

  // Check for truncated response (max_tokens hit = incomplete JSON)
  if (response.stop_reason === 'max_tokens') {
    logger.error('FACE_READING_TRUNCATED: Claude hit max_tokens limit', {
      tier,
      stop_reason: response.stop_reason,
      output_tokens: response.usage?.output_tokens,
    });
    void logAiFailure({
      userId: userContext?.userId,
      readingType: 'face_reading',
      errorType: 'max_tokens_truncation',
      errorMessage: `Claude hit max_tokens (${FACE_MAX_TOKENS}) on face reading`,
      modelUsed: MODEL,
      maxTokensRequested: FACE_MAX_TOKENS,
    });
  }

  // Extract text content
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  try {
    const meter = { removed: 0 };
    const parsed = parseClaudeJSON<FaceReadingOutput>(textContent.text, 'face_reading', meter);
    /* 🔴 P99 — THE ENTRY FUNNEL FINALLY WRITES AN `ai_generations` ROW. Face and palm were the
       only two GENERATIONS in the app that never did: they are direct Vision calls and reach
       neither `createSynthesisMessage` nor `createQaAnswerMessage`, so every per-surface cost
       figure was wrong by whatever the two most expensive calls in the app cost (base64 image
       in the input, `max_tokens` 16000, adaptive thinking) and wrong in the direction that made
       the routed surfaces look like the whole spend.

       ⚠️ IT IS LOGGED AFTER THE PARSE, NOT AFTER THE RESPONSE, and that is the same boundary the
       routed helper uses: a generation that could not be parsed is a FAILURE and already has a
       row of its own via `logAiFailure` in the catch below. Logging both would double-count the
       surface and make the failure rate unreadable.

       ⚠️ `fellBack` IS ALWAYS FALSE HERE AND THAT IS A FACT, NOT A PLACEHOLDER: this path has no
       server-side `fallbacks` chain at all: one model, no beta, no alternative. If it ever gains
       one, this literal is the line that must change with it.

       ⚠️ `userId` IS THREADED, UNLIKE THE ROUTED HELPER'S ROWS. Not an inconsistency — the two
       `logAiFailure` calls in this very function already carry it, so the field's presence on
       this surface is established, and per-user attribution is the whole point of measuring an
       ENTRY funnel. */
    void logAiGeneration({
      userId: userContext?.userId,
      surface: 'face',
      promptVersion: traitsDriven ? FACE_PROMPT_VERSION : `${FACE_PROMPT_VERSION}.legacy`,
      model: response.model,
      fellBack: false,
      stopReason: response.stop_reason ?? null,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        cacheReadInputTokens: response.usage?.cache_read_input_tokens ?? undefined,
        cacheCreationInputTokens: response.usage?.cache_creation_input_tokens ?? undefined,
      },
      emDashesRemoved: meter.removed,
    });
    // Pin the measured substance so the reading's substance is exactly
    // rules-derived (prose-never-contradict; LLM authored only the voice).
    return traitsDriven ? reconcileFaceSubstance(parsed, substance!) : parsed;
  } catch (err: any) {
    void logAiFailure({
      userId: userContext?.userId,
      readingType: 'face_reading',
      errorType: 'json_parse_error',
      errorMessage: err?.message || 'parse error',
      responseText: textContent.text,
      modelUsed: MODEL,
      maxTokensRequested: FACE_MAX_TOKENS,
    });
    throw err;
  }
}

/**
 * Reconcile a traits-driven palm reading with its FIXED measured substance.
 *
 * Build 27 R3 step 5 (prose-never-contradict, the R2 Sid-#3 analog): the palm
 * type, archetype (energyType), natural talents, and life theme are rules-derived
 * — the LLM authored ONLY the prose around them (and the line-flavor descriptions
 * from the image). This pins that substance back onto the parsed output so it is
 * exactly the measured layer regardless of any model drift, while keeping the
 * model's prose (descriptions, majorLines line flavor, wealth/love, etc.).
 * Pure/deterministic; runs only on the traits path.
 */
function reconcilePalmSubstance(
  reading: PalmReadingOutput,
  substance: PalmReadingSubstance
): PalmReadingOutput {
  if (reading.palmEnergyType && substance.energyType) {
    reading.palmEnergyType.type = substance.energyType;
  }
  if (reading.palmType) {
    reading.palmType.name = palmTypeDisplayName(substance.palmType);
  }
  if (reading.destiny) {
    reading.destiny.lifeTheme = substance.lifeTheme;
  }
  if (substance.naturalTalents && substance.naturalTalents.length > 0) {
    reading.naturalTalents = substance.naturalTalents;
  }
  return reading;
}

/**
 * Generate palm reading.
 *
 * Build 27 R3 step 5: when `substance` (the rules-derived trait layer) is
 * present, the reading is DRIVEN BY the traits — palmType/archetype/talents/
 * lifeTheme are the fixed substance and the output is pinned to them. The image
 * is STILL passed (unlike face) so the model can DESCRIBE the four major lines
 * for the `majorLines` UI (LLM flavor, not measured). When `substance` is absent
 * (extraction failed / pre-R3 user), the legacy image-based Vision call runs as a
 * fail-open fallback so no user loses their reading.
 */
export async function generatePalmReading(
  imageUrl: string,
  tier: 'free' | 'premium',
  isDominant: boolean,
  handedness: 'right' | 'left',
  userContext?: UserContext,
  substance?: PalmReadingSubstance
): Promise<PalmReadingOutput> {
  const prompt = buildPalmReadingPrompt(tier, isDominant, handedness, userContext, substance);
  const traitsDriven = !!(substance && substance.traits && substance.traits.length > 0);

  logger.info('Generating palm reading', {
    tier,
    isDominant,
    handedness,
    hasContext: !!userContext,
    traitsDriven,
  });

  // Palm ALWAYS passes the image — traits-driven uses it for line flavor only,
  // the legacy fallback uses it for full substance.
  const { data: imageData, mediaType } = await fetchImageAsBase64(imageUrl);

  // 8192 → 16000 — same reasoning as FACE_MAX_TOKENS above.
  const PALM_MAX_TOKENS = 16000;
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: PALM_MAX_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageData,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    }],
  });

  // Check for truncated response (max_tokens hit = incomplete JSON)
  if (response.stop_reason === 'max_tokens') {
    logger.error('PALM_READING_TRUNCATED: Claude hit max_tokens limit', {
      tier,
      isDominant,
      stop_reason: response.stop_reason,
      output_tokens: response.usage?.output_tokens,
    });
    void logAiFailure({
      userId: userContext?.userId,
      readingType: 'palm_reading',
      errorType: 'max_tokens_truncation',
      errorMessage: `Claude hit max_tokens (${PALM_MAX_TOKENS}) on palm reading`,
      modelUsed: MODEL,
      maxTokensRequested: PALM_MAX_TOKENS,
    });
  }

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  try {
    const meter = { removed: 0 };
    const parsed = parseClaudeJSON<PalmReadingOutput>(textContent.text, 'palm_reading', meter);
    /* 🔴 P99 — see the identical block in `generateFaceReading` for the full reasoning (after the
       parse, never after the response; `fellBack` false is a fact not a placeholder; `userId` is
       threaded because the two `logAiFailure` calls in this function already carry it).
       ⚠️ THE HAND IS NOT IN THE TAG — see `PALM_PROMPT_VERSION`. `isDominant` changes the prompt's
       framing but not its structure, so splitting it is a tag change if an A/B ever wants it, not
       a second surface. A non-dominant reading is a paid variant of one prompt. */
    void logAiGeneration({
      userId: userContext?.userId,
      surface: 'palm',
      promptVersion: traitsDriven ? PALM_PROMPT_VERSION : `${PALM_PROMPT_VERSION}.legacy`,
      model: response.model,
      fellBack: false,
      stopReason: response.stop_reason ?? null,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        cacheReadInputTokens: response.usage?.cache_read_input_tokens ?? undefined,
        cacheCreationInputTokens: response.usage?.cache_creation_input_tokens ?? undefined,
      },
      emDashesRemoved: meter.removed,
    });
    // Pin the measured substance so the reading's substance is exactly
    // rules-derived (prose-never-contradict; LLM authored only the voice + the
    // line-flavor descriptions).
    return traitsDriven ? reconcilePalmSubstance(parsed, substance!) : parsed;
  } catch (err: any) {
    void logAiFailure({
      userId: userContext?.userId,
      readingType: 'palm_reading',
      errorType: 'json_parse_error',
      errorMessage: err?.message || 'parse error',
      responseText: textContent.text,
      modelUsed: MODEL,
      maxTokensRequested: PALM_MAX_TOKENS,
    });
    throw err;
  }
}

/**
 * Test Claude connectivity
 */
export async function testClaudeConnection(): Promise<string> {
  logger.info('Testing Claude API connection');
  
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 50,
    messages: [{ 
      role: 'user', 
      content: 'Say "Revelia AI connected successfully" and nothing else.' 
    }],
  });
  
  const textContent = response.content.find(c => c.type === 'text');
  if (textContent && textContent.type === 'text') {
    return textContent.text;
  }
  
  throw new Error('No text response from Claude');
}

/**
 * Generate face reading with retry logic
 */
export const generateFaceReadingWithRetry = (
  imageUrl: string,
  tier: 'free' | 'premium',
  userContext?: UserContext,
  substance?: FaceReadingSubstance
) => withRetry(() => generateFaceReading(imageUrl, tier, userContext, substance));

/**
 * Generate palm reading with retry logic
 */
export const generatePalmReadingWithRetry = (
  imageUrl: string,
  tier: 'free' | 'premium',
  isDominant: boolean,
  handedness: 'right' | 'left',
  userContext?: UserContext,
  substance?: PalmReadingSubstance
) => withRetry(() => generatePalmReading(imageUrl, tier, isDominant, handedness, userContext, substance));

/**
 * Generate daily insight
 */
export async function generateDailyInsight(
  profile: UserInsightProfile,
  continuity?: string
): Promise<DailyInsightOutput> {
  logger.info('Generating daily insight', { name: profile.name });

  // 4096 → 5500: Sonnet 5's tokenizer counts the same text ~30% higher than 4.6,
  // so a cap tuned on 4.6 holds ~30% less prose. Thinking is OFF on this surface
  // (highest volume — 365x/active free user/yr), so this is pure output headroom.
  const DAILY_MAX_TOKENS = 5500;

  // R5 §9 STEP 3c: route the daily surface through the single-source synthesis
  // helper. Daily is a CHEAP surface (free, highest volume) — it was cheap and
  // stays cheap: the helper's cheap path was byte-identical to the previous
  // anthropic.messages.create call, so this was a pure call-path unification +
  // PROMPT_VERSION stamping, behavior-neutral. No withRetry (daily was never
  // wrapped). 2026-07-31: the cheap path now runs claude-sonnet-5 with thinking
  // explicitly DISABLED — see CHEAP_MODEL in synthesis-routing.ts.
  //
  // R6 §9 STEP 4: `continuity` is an OPTIONAL pre-rendered "what's shifted"
  // block threaded into the prompt ONLY (buildDailyInsightPrompt splices it
  // before the "now" signals). It is INPUT CONTEXT — the model, route (cheap →
  // CHEAP_MODEL per synthesis-routing.ts), maxTokens, betas, fallbacks, and
  // output_config are ALL unchanged by it. Omitted/empty → byte-identical prompt.
  const result = await createSynthesisMessage({
    surface: 'daily',
    prompt: buildDailyInsightPrompt(profile, continuity),
    maxTokens: DAILY_MAX_TOKENS,
    promptVersion: DAILY_PROMPT_VERSION,
  });

  if (result.stopReason === 'max_tokens') {
    void logAiFailure({
      readingType: 'daily_insight',
      errorType: 'max_tokens_truncation',
      errorMessage: `Claude hit max_tokens (${DAILY_MAX_TOKENS}) on daily insight`,
      modelUsed: result.model,
      maxTokensRequested: DAILY_MAX_TOKENS,
    });
  }

  try {
    return parseClaudeJSON<DailyInsightOutput>(result.text, 'daily_insight');
  } catch (err: any) {
    void logAiFailure({
      readingType: 'daily_insight',
      errorType: 'json_parse_error',
      errorMessage: err?.message || 'parse error',
      responseText: result.text,
      modelUsed: result.model,
      maxTokensRequested: DAILY_MAX_TOKENS,
    });
    throw err;
  }
}

/**
 * Generate weekly forecast
 */
export async function generateWeeklyForecast(
  profile: UserInsightProfile,
  weekStart: Date
): Promise<WeeklyForecastOutput> {
  logger.info('Generating weekly forecast', { name: profile.name });

  const WEEKLY_MAX_TOKENS = 6144;

  // R5 §9 STEP 3a: route the marquee weekly surface through the single-source
  // synthesis helper (flag OFF → guaranteed Opus 4.8 streamed path; ON → Fable 5
  // with server-side fallback). The helper resolves the model, streams, and
  // checks for a refusal BEFORE reading content — a final-chain refusal throws a
  // graceful Error that propagates to the caller/route. Prompt copy + the
  // four-feature-set weave are unchanged (step 2); this changes only HOW we call.
  const result = await createSynthesisMessage({
    surface: 'weekly',
    prompt: buildWeeklyForecastPrompt(profile, weekStart),
    maxTokens: WEEKLY_MAX_TOKENS,
    promptVersion: WEEKLY_PROMPT_VERSION,
  });

  if (result.stopReason === 'max_tokens') {
    void logAiFailure({
      readingType: 'weekly_forecast',
      errorType: 'max_tokens_truncation',
      errorMessage: `Claude hit max_tokens (${WEEKLY_MAX_TOKENS}) on weekly forecast`,
      modelUsed: result.model,
      maxTokensRequested: WEEKLY_MAX_TOKENS,
    });
  }

  try {
    return parseClaudeJSON<WeeklyForecastOutput>(result.text, 'weekly_forecast');
  } catch (err: any) {
    void logAiFailure({
      readingType: 'weekly_forecast',
      errorType: 'json_parse_error',
      errorMessage: err?.message || 'parse error',
      responseText: result.text,
      modelUsed: result.model,
      maxTokensRequested: WEEKLY_MAX_TOKENS,
    });
    throw err;
  }
}

/**
 * Generate monthly reading
 */
export async function generateMonthlyReading(
  profile: UserInsightProfile,
  month: number,
  year: number,
  tier: 'free' | 'premium'
): Promise<MonthlyReadingOutput> {
  logger.info('Generating monthly reading', { name: profile.name, tier });

  // 🔴 TIER-SPLIT ON PURPOSE. This one value feeds BOTH branches of the surface
  // split below, so a flat bump would silently raise the PAID Fable 5 cap too.
  // Only the free branch moved to Sonnet 5, so only the free branch gets the
  // ~30% tokenizer headroom (8192 → 11000); premium holds at 8192, unchanged.
  const maxTokens = tier === 'premium' ? 8192 : 11000;

  // R5 §9 STEP 3b: route the monthly surface through the single-source synthesis
  // helper with a TIER SPLIT — premium is a marquee paid surface (flag OFF →
  // guaranteed Opus 4.8 streamed; ON → Fable 5 with server-side fallback), free
  // stays on the cheap model. Prompt copy + the four-feature-set weave are
  // unchanged (step 2); this changes only HOW we call. The date-format safety
  // net (normalizeDatesInObject) is preserved below.
  const surface = tier === 'premium' ? 'monthly-premium' : 'monthly-free';
  const result = await createSynthesisMessage({
    surface,
    prompt: buildMonthlyReadingPrompt(profile, month, year, tier),
    maxTokens,
    promptVersion: MONTHLY_PROMPT_VERSION,
  });

  if (result.stopReason === 'max_tokens') {
    void logAiFailure({
      readingType: 'monthly_astrology',
      errorType: 'max_tokens_truncation',
      errorMessage: `Claude hit max_tokens (${maxTokens}) on monthly reading`,
      modelUsed: result.model,
      maxTokensRequested: maxTokens,
    });
  }

  try {
    const parsed = parseClaudeJSON<MonthlyReadingOutput>(result.text, 'monthly_astrology');
    // Safety net: normalize any "Month YYYY [DD]" remnants to "Month DD, YYYY"
    // even if Claude slips back to the old placeholder pattern. Idempotent
    // when the model outputs the correct format.
    return normalizeDatesInObject(parsed);
  } catch (err: any) {
    void logAiFailure({
      readingType: 'monthly_astrology',
      errorType: 'json_parse_error',
      errorMessage: err?.message || 'parse error',
      responseText: result.text,
      modelUsed: result.model,
      maxTokensRequested: maxTokens,
    });
    throw err;
  }
}

/**
 * Generate compatibility reading
 */
export async function generateCompatibilityReading(
  user1: UserCompatibilityProfile,
  user2: PartnerCompatibilityProfile,
  tier: 'free' | 'premium',
  relationshipType: RelationshipType = 'love',
  relationshipSubType?: string
): Promise<CompatibilityOutput> {
  logger.info('Generating compatibility reading', {
    user1Name: user1.name,
    user2Name: user2.name,
    tier
  });

  // 🔴 TIER-SPLIT ON PURPOSE — same reasoning as generateMonthlyReading above:
  // this value feeds both branches, only free moved to Sonnet 5, so only free
  // gets the tokenizer headroom. Premium (Fable 5) holds at 8192.
  const maxTokens = tier === 'premium' ? 8192 : 11000;

  // Fetch partner image and convert to base64
  const { data: imageData, mediaType } = await fetchImageAsBase64(user2.imageUrl);

  // R5 §9 STEP 3b: route the compatibility surface through the single-source
  // synthesis helper with a TIER SPLIT — premium is a marquee paid + viral
  // surface (flag OFF → guaranteed Opus 4.8 streamed; ON → Fable 5 with
  // server-side fallback), free stays on the cheap model. The partner-face image
  // is passed via the helper's `image` option (Fable 5 supports vision). Prompt
  // copy + the four-feature-set weave are unchanged (step 2); this changes only
  // HOW we call.
  const surface = tier === 'premium' ? 'compat-premium' : 'compat-free';
  const result = await createSynthesisMessage({
    surface,
    prompt: buildCompatibilityPrompt(user1, user2, tier, relationshipType, relationshipSubType),
    maxTokens,
    image: {
      data: imageData,
      mediaType: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    },
    promptVersion: COMPAT_PROMPT_VERSION,
  });

  if (result.stopReason === 'max_tokens') {
    void logAiFailure({
      readingType: 'compatibility',
      errorType: 'max_tokens_truncation',
      errorMessage: `Claude hit max_tokens (${maxTokens}) on compatibility reading`,
      modelUsed: result.model,
      maxTokensRequested: maxTokens,
    });
  }

  try {
    return parseClaudeJSON<CompatibilityOutput>(result.text, 'compatibility');
  } catch (err: any) {
    void logAiFailure({
      readingType: 'compatibility',
      errorType: 'json_parse_error',
      errorMessage: err?.message || 'parse error',
      responseText: result.text,
      modelUsed: result.model,
      maxTokensRequested: maxTokens,
    });
    throw err;
  }
}

/**
 * Generate compatibility reading with retry logic
 */
export const generateCompatibilityReadingWithRetry = (
  user1: UserCompatibilityProfile,
  user2: PartnerCompatibilityProfile,
  tier: 'free' | 'premium',
  relationshipType: RelationshipType = 'love',
  relationshipSubType?: string
) => withRetry(() => generateCompatibilityReading(user1, user2, tier, relationshipType, relationshipSubType));

/**
 * Prompt version tag for A/B attribution (R5 §5). Co-located with the builder,
 * mirroring DAILY/WEEKLY/MONTHLY/COMPAT/CAREER_PROMPT_VERSION; the stamping is
 * wired later by STEP 3's createSynthesisMessage — this step only defines/exports
 * it. Bump when the prompt copy changes meaningfully.
 *
 * v2 = Build 27 R5 §9 step 2 (LIGHT — name-destiny already reads its core R4
 * trio, so this is the tag-and-tidy surface, NOT a full four-set weave): brings
 * name-destiny into the versioned-prompt convention and adds a MODEST astrology
 * deepening — the user's moon/rising signs join the sun sign already carried so
 * the analysis can relate the name's numbers to the whole chart identity
 * (numerology↔astrology synthesis). Deliberately NO face/palm bands and NO
 * live aspects/transits (off-topic for a timeless name-analysis tool). The R4
 * canonical trio (expression/soulUrge/personality, sourced by the controller
 * from the submitted birth name via computeNameNumbers) is unchanged.
 */
export const NAME_PROMPT_VERSION = 'name-destiny.v2';

/**
 * Name Destiny Analysis data input
 */
interface NameDestinyInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  expressionNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;
  dob?: string;
  lifePathNumber?: number;
  sunSign?: string;
  /**
   * Build 27 R5 §9 step 2 — OPTIONAL R1 chart identity (moon/rising) sourced by
   * the controller from the natal chart, mirroring career's guarded sourcing.
   * Both are optional: pre-backfill / no-birth-time users render 'Unknown' and
   * still get a full analysis. Kept modest (chart identity only, no aspects/
   * transits) — on-topic for numerology↔astrology synthesis, not a full weave.
   */
  moonSign?: string;
  risingSign?: string;
  /**
   * Optional confidence-calibration instruction injected into the prompt
   * based on the controller's name-completeness assessment. When the name
   * appears partial (level !== 'high'), this directs Claude to lead the
   * analysis with an explicit disclaimer.
   */
  completenessNote?: string;
}

/**
 * Generate Name Destiny Analysis
 */
export async function generateNameDestiny(input: NameDestinyInput): Promise<any> {
  const prompt = `${HONESTY_PREAMBLE}

You are an expert numerologist with deep knowledge of Pythagorean name numerology. Analyze the following name and provide insights, then suggest 3 optimized name variations.

${input.completenessNote ? `NAME COMPLETENESS NOTE: ${input.completenessNote}\n` : ''}
Full Name: ${input.fullName}
Expression Number: ${input.expressionNumber} (calculated from all letters)
Soul Urge Number: ${input.soulUrgeNumber} (calculated from vowels)
Personality Number: ${input.personalityNumber} (calculated from consonants)

Also consider the user's birth data for context:
Date of Birth: ${input.dob || 'Unknown'}
Life Path Number: ${input.lifePathNumber || 'Unknown'}
Sun Sign: ${input.sunSign || 'Unknown'}
Moon Sign: ${input.moonSign || 'Unknown'}
Rising Sign: ${input.risingSign || 'Unknown'}

Respond with ONLY a JSON object (no other text, no markdown):
{
  "currentNameAnalysis": {
    "expressionMeaning": "2-3 sentences about what their Expression Number reveals about their life purpose and talents",
    "soulUrgeMeaning": "2-3 sentences about what their Soul Urge Number reveals about their inner desires and motivations",
    "personalityMeaning": "2-3 sentences about what their Personality Number reveals about how others perceive them",
    "overallAssessment": "3-4 sentences synthesizing all three numbers and how they interact with the user's Life Path and astrological chart identity (Sun, Moon, and Rising signs, weave in only the placements provided above, do not reference any marked Unknown)",
    "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
    "challenges": ["challenge 1", "challenge 2"]
  },
  "nameVariations": [
    {
      "rank": 1,
      "suggestedName": "A subtle variation of the original name (e.g., adding/removing/changing one letter)",
      "changeDescription": "Explain what specific letter change was made and why",
      "newExpressionNumber": 0,
      "newSoulUrgeNumber": 0,
      "newPersonalityNumber": 0,
      "benefitSummary": "2-3 sentences explaining how this name variation improves cosmic alignment, luck, and life outcomes",
      "impactAreas": ["Career", "Wealth"]
    },
    {
      "rank": 2,
      "suggestedName": "Another subtle variation",
      "changeDescription": "Explain the change",
      "newExpressionNumber": 0,
      "newSoulUrgeNumber": 0,
      "newPersonalityNumber": 0,
      "benefitSummary": "2-3 sentences",
      "impactAreas": ["Relationships", "Health"]
    },
    {
      "rank": 3,
      "suggestedName": "Third subtle variation",
      "changeDescription": "Explain the change",
      "newExpressionNumber": 0,
      "newSoulUrgeNumber": 0,
      "newPersonalityNumber": 0,
      "benefitSummary": "2-3 sentences",
      "impactAreas": ["Spiritual Growth", "Creativity"]
    }
  ]
}

IMPORTANT RULES FOR NAME VARIATIONS:
- Keep variations subtle and realistic, they should still sound like the person's actual name
- Changes should be minor: adding a letter, removing a letter, changing a vowel, adjusting spelling
- Never suggest a completely different name
- Each variation should target different life improvement areas
- Explain the numerological reasoning for each change
- Calculate the ACTUAL new numbers for each variation (don't just make them up)`;

  logger.info('Generating name destiny analysis', { fullName: input.fullName });

  // 6144 → 8192 for Sonnet 5's ~30% higher token counts (thinking OFF here).
  const NAME_MAX_TOKENS = 8192;

  // R5 §9 STEP 3c: route the name-destiny surface through the single-source
  // synthesis helper. Name-destiny is a CHEAP surface (arithmetic-heavy; kept
  // cheap for v1 per the routing table) — it was cheap and stays cheap: the
  // helper's cheap path was byte-identical to the previous anthropic.messages
  // .create call; it now runs claude-sonnet-5, thinking disabled, per
  // CHEAP_MODEL in synthesis-routing.ts. KEEP the withRetry wrapper
  // name-destiny already had — harmless + preserves transient-error resilience.
  // Prompt copy (chart-identity-only weave) is unchanged.
  const result = await withRetry(() =>
    createSynthesisMessage({
      surface: 'name-destiny',
      prompt,
      maxTokens: NAME_MAX_TOKENS,
      promptVersion: NAME_PROMPT_VERSION,
    })
  );

  if (result.stopReason === 'max_tokens') {
    logger.error('NAME_DESTINY_TRUNCATED: Claude hit max_tokens limit');
    void logAiFailure({
      readingType: 'name_destiny',
      errorType: 'max_tokens_truncation',
      errorMessage: `Claude hit max_tokens (${NAME_MAX_TOKENS}) on name destiny`,
      modelUsed: result.model,
      maxTokensRequested: NAME_MAX_TOKENS,
    });
  }

  try {
    return parseClaudeJSON<any>(result.text, 'name_destiny');
  } catch (err: any) {
    void logAiFailure({
      readingType: 'name_destiny',
      errorType: 'json_parse_error',
      errorMessage: err?.message || 'parse error',
      responseText: result.text,
      modelUsed: result.model,
      maxTokensRequested: NAME_MAX_TOKENS,
    });
    throw err;
  }
}

/**
 * Prompt version tag for A/B attribution (R5 §5). Co-located with the builder;
 * the stamping is wired later by STEP 3's createSynthesisMessage — this step
 * only defines/exports it. Bump when the prompt copy changes meaningfully.
 * v2 = Build 27 R5 §9 step 2: sources face/palm from the R2/R3 stable trait
 * layer (was the freeform reading blobs) and weaves the full feature set —
 * R1 moon/rising/active aspects/key transits, R2 face-trait bands, R3 palm-trait
 * bands, R4 name trio (expression + soul urge + personality).
 */
export const CAREER_PROMPT_VERSION = 'career.v2';

/**
 * Career Destiny Path data input.
 *
 * Build 27 R5 §9 step 2: face/palm now arrive from the R2/R3 STABLE trait layer
 * (the controller mirrors buildUserInsightProfile's sourcing) — `faceTraits`/
 * `palmTraits` are the compact "<trait>: <band>" band sets, `palmLifeTheme` is
 * the rules-derived life theme, and the R1 (aspects/transits) + R4 (soul urge/
 * personality) signals join moon/rising/expression which career already carried.
 * Every field is OPTIONAL — a pre-backfill or reading-less user still generates
 * (the prompt renders 'Unknown'/'Not available'; buildFeatureContext omits absent
 * sections). Names are read from fields, never hardcoded.
 */
interface CareerDestinyInput {
  name: string;
  sunSign?: string;
  moonSign?: string;
  risingSign?: string | null;
  lifePathNumber?: number;
  expressionNumber?: number;
  soulUrgeNumber?: number;
  personalityNumber?: number;
  activeAspects?: string[];
  keyTransits?: string[];
  faceArchetype?: string;
  faceStrengths?: string;
  faceTraits?: string[];
  palmType?: string;
  palmTalents?: string;
  palmLifeTheme?: string;
  palmTraits?: string[];
}

/**
 * Generate Career Destiny Path
 */
export async function generateCareerDestiny(input: CareerDestinyInput): Promise<any> {
  // R5 (Build 27 §9 step 2): the four now-stable feature sets (R1 moon/rising/
  // active aspects/key transits, R2 face-trait bands, R3 palm-trait bands, R4
  // name trio), each omitted when absent. Empty string for a sunSign-only /
  // reading-less user — the reading still runs on the base fields below.
  const featureContext = buildFeatureContext({
    name: input.name,
    moonSign: input.moonSign,
    risingSign: input.risingSign,
    activeAspects: input.activeAspects,
    keyTransits: input.keyTransits,
    faceTraits: input.faceTraits,
    palmTraits: input.palmTraits,
    expressionNumber: input.expressionNumber,
    soulUrgeNumber: input.soulUrgeNumber,
    personalityNumber: input.personalityNumber,
  });

  const prompt = `${HONESTY_PREAMBLE}

You are an expert career counselor who combines astrology, numerology, physiognomy (face reading), and palmistry to provide deeply personalized career guidance.

USER DATA:
Name: ${input.name}
Sun Sign: ${input.sunSign || 'Unknown'}
Life Path Number: ${input.lifePathNumber || 'Unknown'}

Face Reading Data (if available):
- Archetype: ${input.faceArchetype || 'Not available'}
- Strengths: ${input.faceStrengths || 'Not available'}

Palm Reading Data (if available):
- Palm Type: ${input.palmType || 'Not available'}
- Life Theme: ${input.palmLifeTheme || 'Not available'}
- Natural Talents: ${input.palmTalents || 'Not available'}
${featureContext}
Based on ALL available data (weave in every DEEPER PROFILE SIGNAL listed above, chart placements, active aspects, key transits, face and palm trait bands, and the name-numerology trio, wherever present), provide career guidance. Respond with ONLY a JSON object (no other text):
{
  "careerProfile": {
    "summary": "3-4 sentence overview of this person's professional strengths and natural career inclinations based on their combined cosmic and physical traits",
    "coreStrengths": ["strength1", "strength2", "strength3", "strength4", "strength5"],
    "workStyle": "2-3 sentences describing their ideal work environment, pace, and structure",
    "leadershipStyle": "2 sentences about how they naturally lead, collaborate, or contribute in teams"
  },
  "careers": [
    {
      "rank": 1,
      "title": "Specific career title",
      "field": "Industry/field name",
      "confidenceScore": 92,
      "description": "2-3 sentences explaining why this career is an excellent fit based on specific traits and placements",
      "alignedTraits": ["Sun in ${input.sunSign || '<their sun sign>'} = <trait-based reason>", "Life Path ${input.lifePathNumber ?? '<their life path>'} = <reason>", "${input.palmType || '<their palm type>'} = <reason>"],
      "growthPotential": "Very High",
      "icon": "appropriate emoji"
    },
    {
      "rank": 2,
      "title": "Second career",
      "field": "Field",
      "confidenceScore": 85,
      "description": "2-3 sentences",
      "alignedTraits": ["trait = reason"],
      "growthPotential": "High",
      "icon": "emoji"
    },
    {
      "rank": 3,
      "title": "Third career",
      "field": "Field",
      "confidenceScore": 80,
      "description": "2-3 sentences",
      "alignedTraits": ["trait = reason"],
      "growthPotential": "High",
      "icon": "emoji"
    },
    {
      "rank": 4,
      "title": "Fourth career",
      "field": "Field",
      "confidenceScore": 76,
      "description": "2-3 sentences",
      "alignedTraits": ["trait = reason"],
      "growthPotential": "Moderate",
      "icon": "emoji"
    },
    {
      "rank": 5,
      "title": "Fifth career",
      "field": "Field",
      "confidenceScore": 72,
      "description": "2-3 sentences",
      "alignedTraits": ["trait = reason"],
      "growthPotential": "Moderate",
      "icon": "emoji"
    }
  ],
  "nonTraditionalPaths": [
    {
      "title": "Non-traditional career",
      "description": "2 sentences about why this alternative path could work",
      "alignedTraits": ["specific trait = specific reason"],
      "icon": "appropriate emoji"
    }
  ],
  "actionAdvice": "2-3 sentences of practical, actionable career guidance the person can act on today"
}

IMPORTANT RULES:
- Be specific with career titles, not just "Doctor" but "Healthcare Administrator" or "Pediatric Specialist"
- Confidence scores should vary meaningfully (not all 90+). The top career should be 88-97, lower ones 70-85
- Each career should cite SPECIFIC traits/placements that support it (not generic)
- Include non-traditional paths ONLY if genuinely supported by the data, include performing arts, content creation, entrepreneurship, professional sports, music, acting, social influencing, YouTube, etc. where the chart clearly shows it. Include 2-3 non-traditional paths only if genuinely supported.
- The tone should be encouraging but honest, not everything is a 95% match
- If face/palm data is not available, note which recommendations would be strengthened by completing those readings`;

  logger.info('Generating career destiny path', { name: input.name });

  const CAREER_MAX_TOKENS = 6144;

  // R5 §9 STEP 3b: route the career surface (a marquee paid one-time reading)
  // through the single-source synthesis helper (flag OFF → guaranteed Opus 4.8
  // streamed; ON → Fable 5 with server-side fallback). KEEP the withRetry wrapper
  // career already had — harmless + preserves transient-error resilience. Prompt
  // copy + the four-feature-set weave are unchanged (step 2); this changes only
  // HOW we call.
  const result = await withRetry(() =>
    createSynthesisMessage({
      surface: 'career',
      prompt,
      maxTokens: CAREER_MAX_TOKENS,
      promptVersion: CAREER_PROMPT_VERSION,
    })
  );

  if (result.stopReason === 'max_tokens') {
    logger.error('CAREER_DESTINY_TRUNCATED: Claude hit max_tokens limit');
    void logAiFailure({
      readingType: 'career_destiny',
      errorType: 'max_tokens_truncation',
      errorMessage: `Claude hit max_tokens (${CAREER_MAX_TOKENS}) on career destiny`,
      modelUsed: result.model,
      maxTokensRequested: CAREER_MAX_TOKENS,
    });
  }

  try {
    return parseClaudeJSON<any>(result.text, 'career_destiny');
  } catch (err: any) {
    void logAiFailure({
      readingType: 'career_destiny',
      errorType: 'json_parse_error',
      errorMessage: err?.message || 'parse error',
      responseText: result.text,
      modelUsed: result.model,
      maxTokensRequested: CAREER_MAX_TOKENS,
    });
    throw err;
  }
}
