import { User, IUser } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { InsightCache } from '../models/InsightCache';
import * as claudeService from './claude.service';
import { AppError } from '../middleware/error.middleware';
import {
  UserInsightProfile,
  DailyInsightOutput,
  FaceTrait,
  FaceArchetypeResult,
  PalmTrait,
  PalmProfileResult,
  PalmTypeClass,
  NatalChart,
  ContinuityBaseline,
  ContinuityDelta,
} from '../types/shared';
import {
  computeNatalChartFromBirthData,
  computeTransits,
  describeNatalAspects,
  describeTransits,
} from './astrology.service';
import {
  getPersonalYear,
  getPersonalMonth,
  getPersonalYearMeaning,
} from '../utils/numerology';
import { ensureProfileNumerology } from './numerology.service';
import {
  computeContinuityDelta,
  CONTINUITY_VERSION,
} from './continuity.service';
import {
  buildContinuityContext,
  buildContinuityHook,
  buildContinuityCard,
} from '../prompts/shared/continuity-context';
import { getEffectiveTier } from '../utils/subscriptionTier';
import { logger } from '../utils/logger';

// Build 27 R2 §9 step 6 — deterministic derivation of the insight-profile
// "growth opportunity" from the lowest-scored measured trait. This is a
// DATA-layer phrase (same nature as the rules-table phrasing), NOT the
// Sid-gated face-reading prompt COPY (R5/step 5). No LLM, no randomness.
const GROWTH_BY_TRAIT: Record<string, string> = {
  intellect: 'Sharpening focus and analytical depth',
  determination: 'Building steadier follow-through and resolve',
  empathy: 'Deepening emotional connection and patience',
  creativity: 'Giving your imagination more room to play',
  leadership: 'Stepping more confidently into a leading role',
};

function capitalizeTrait(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// Build 27 R3 §9 step 6 — map the deterministic `PalmTypeClass` enum
// ('earth'|'air'|'water'|'fire') from the stable palm layer back to the
// "X Hand" DISPLAY string that downstream expects (daily/monthly prompts
// interpolate it verbatim; PalmTypeHeader keys its icon off
// name.toLowerCase().includes('fire'|'water'|'earth'|'air')). Never feed the
// raw enum downstream. Deterministic, TOTAL over the closed set.
const PALM_TYPE_DISPLAY: Record<PalmTypeClass, string> = {
  earth: 'Earth Hand',
  air: 'Air Hand',
  water: 'Water Hand',
  fire: 'Fire Hand',
};

/**
 * Options for {@link buildUserInsightProfile}.
 */
export interface BuildInsightProfileOptions {
  /**
   * Build 27 R7 §13d-3 — CHART-ONLY DEGRADE. When `false`, do NOT throw the 400
   * "complete face and palm readings" gate: a user missing those layers still gets
   * a profile built from whatever layers ARE present. Defaults to `true`, so every
   * existing caller (daily / weekly / monthly / compatibility / career), which
   * legitimately requires the full blueprint, is byte-for-byte unaffected. Only the
   * Q&A surface passes `false` — the conversational surface must answer a chart-only
   * asker reflectively rather than 400. It surfaces NO fabricated face/palm content:
   * the downstream moat weave (`buildFeatureContext`) reads only the STABLE
   * `faceTraits` / `palmTraits` bands, which stay `undefined` for an incomplete
   * user → omitted; the fallback-default branches below populate only fields the
   * Q&A assembler never reads.
   */
  requireCompleteReadings?: boolean;
}

/**
 * Build user insight profile from database.
 *
 * Build 27 R7 §13c STEP 2 — EXPORTED (was module-local) so the Q&A context
 * assembly reuses the four-set assembly + lazy backfill instead of replicating
 * its sourcing (which reading.controller / compatibility.service / career had to
 * mirror pre-R7). PURE ADDITIVE: the only changes are the `export` keyword and the
 * additive `opts` param (default preserves all existing callers) — no existing
 * behavior touched.
 */
export async function buildUserInsightProfile(
  userId: string,
  opts: BuildInsightProfileOptions = {}
): Promise<UserInsightProfile> {
  const requireCompleteReadings = opts.requireCompleteReadings !== false;
  const user = await User.findById(userId);
  const profile = await UserProfile.findOne({ userId });

  if (!user || !profile) {
    throw new AppError(404, 'User or profile not found');
  }

  // Lazy backfill: ensure a Swiss Ephemeris natal chart exists. Covers users
  // created before R1 and any save where compute failed. Best-effort — a
  // failure here must never block the reading.
  if (!profile.natalChart && profile.birthData?.date) {
    try {
      const chart = computeNatalChartFromBirthData(profile.birthData as any);
      if (chart) {
        profile.natalChart = chart;
        await profile.save();
      }
    } catch (err: any) {
      logger.warn('natal_chart_lazy_compute_failed', {
        userId,
        error: err?.message ?? String(err),
      });
    }
  }

  // Build 27 R4 §9 step 5 — lazy backfill: ensure profile.numerology exists (or
  // is current-version) before the numerology reads below. Mirrors the natal
  // lazy fallback above. Builds lifePath from birthData.date + the trio from the
  // latest NameAnalysis / profile.name (provenance respected), persists
  // best-effort, and mutates profile.numerology in place so the reads at the end
  // of this function see it. A persist failure never blocks the reading. Closes
  // the step-4 interim un-backfilled gap for existing users.
  await ensureProfileNumerology(profile, { lean: false });

  // Check if user has completed readings. R7 §13d-3 chart-only degrade: the Q&A
  // surface (requireCompleteReadings:false) SKIPS this gate so a chart-only asker
  // still gets a coherent reflective answer; the face/palm layers simply self-omit
  // downstream (see BuildInsightProfileOptions). Every other caller keeps the gate.
  if (requireCompleteReadings && (!profile.faceReading || !profile.palmReading)) {
    throw new AppError(400, 'Please complete face and palm readings before generating insights');
  }
  
  // Extract relevant data from profile and readings
  const faceReading = profile.faceReading as any;
  const palmReading = profile.palmReading as any;

  // Build 27 R1: real Swiss Ephemeris chart data. Make moon/rising/transits
  // available to ALL prompts via this profile. NOTE: prompt TEXT is NOT
  // rewritten for these yet — that lands with R5 (Fable 5). These fields just
  // carry the data forward.
  const natal = profile.natalChart;
  let moonSign: string | undefined;
  let risingSign: string | null | undefined;
  let activeAspects: string[] | undefined;
  let keyTransits: string[] | undefined;
  if (natal) {
    moonSign = natal.moon;
    risingSign = natal.rising;
    activeAspects = describeNatalAspects(natal);
    try {
      const transits = computeTransits(natal, new Date());
      keyTransits = describeTransits(transits);
    } catch (err: any) {
      logger.warn('transit_compute_failed', {
        userId,
        error: err?.message ?? String(err),
      });
    }
  }

  // Build 27 R2 §9 step 6: SOURCE the face insight fields from the stable,
  // deterministic trait layer (R2) when it is present, instead of the freeform
  // `faceReading` blob. Step 4 persists faceTraits + faceArchetypeResult together
  // (at upload + lazy fallback), so they are present-together or absent-together;
  // a single gate is sufficient. FALLBACK UNCHANGED: old users pre-backfill keep
  // reading the blob/defaults exactly as before — never regress. (DATA only; the
  // synthesis-prompt COPY rewrite is R5's job.)
  const faceTraitsStable = (profile.faceTraits as FaceTrait[] | undefined) ?? [];
  const faceArch = profile.faceArchetypeResult as FaceArchetypeResult | undefined;
  const hasStableFaceLayer = !!faceArch && faceTraitsStable.length > 0;

  let faceArchetype: string;
  let faceArchetypeTagline: string;
  let strengths: string[];
  let growthOpportunity: string;
  let dominantTraits: string[];
  let faceTraits: string[] | undefined;

  if (hasStableFaceLayer) {
    faceArchetype = faceArch!.name;
    faceArchetypeTagline = faceArch!.tagline;

    // Top-scored traits, descending. Tie-break by stored order → deterministic.
    const byScore = faceTraitsStable
      .map((t, i) => ({ t, i }))
      .sort((a, b) => b.t.score - a.t.score || a.i - b.i)
      .map((x) => x.t);

    // strengths = high-band trait names; if no trait reaches the 'high' band,
    // fall back to the top-scored traits so the field is never empty.
    const highBand = faceTraitsStable.filter((t) => t.band === 'high');
    strengths = (highBand.length ? highBand : byScore.slice(0, 3)).map((t) =>
      capitalizeTrait(t.trait),
    );

    // dominantTraits = top-scored traits (top 3), matching the prior slice(0,3) shape.
    dominantTraits = byScore.slice(0, 3).map((t) => capitalizeTrait(t.trait));

    // growthOpportunity = deterministic phrase for the lowest-scored trait.
    const lowest = byScore[byScore.length - 1];
    growthOpportunity =
      GROWTH_BY_TRAIT[lowest.trait] ?? `Developing your ${lowest.trait}`;

    // Compact structured set ("<trait>: <band>", in stored order) for R5's
    // synthesis engine. DATA only — no prompt copy consumes it yet.
    faceTraits = faceTraitsStable.map((t) => `${t.trait}: ${t.band}`);
  } else {
    faceArchetype = faceReading?.archetype?.name || 'The Seeker';
    faceArchetypeTagline = faceReading?.archetype?.tagline || 'Discovering your path';
    strengths = faceReading?.strengths || ['Adaptability', 'Curiosity', 'Resilience'];
    growthOpportunity = faceReading?.growthOpportunity || 'Continued self-discovery';
    dominantTraits = faceReading?.strengths?.slice(0, 3) || [
      'Determined',
      'Thoughtful',
      'Creative',
    ];
    faceTraits = undefined;
  }

  // Build 27 R3 §9 step 6: SOURCE the palm insight fields from the stable,
  // deterministic DOMINANT-hand layer (palmProfileResult + palmDominantTraits,
  // persisted at upload + lazy fallback in steps 3/4) when present, instead of
  // the freeform `palmReading` blob. palmType comes back as the enum
  // ('earth'|'air'|...), so map it to the "X Hand" DISPLAY string downstream
  // expects. FALLBACK UNCHANGED: old users pre-backfill keep reading the
  // blob/defaults exactly as before — never regress. (DATA only; the
  // synthesis-prompt COPY rewrite is R5's job.)
  const palmProfile = profile.palmProfileResult as PalmProfileResult | undefined;
  const palmDominantTraits = (profile.palmDominantTraits as PalmTrait[] | undefined) ?? [];
  const hasStablePalmLayer = !!palmProfile;

  let palmType: string;
  let palmLifeTheme: string;
  let naturalTalents: string[];
  let palmTraits: string[] | undefined;

  if (hasStablePalmLayer) {
    palmType = PALM_TYPE_DISPLAY[palmProfile!.palmType];
    palmLifeTheme = palmProfile!.lifeTheme;
    naturalTalents = palmProfile!.naturalTalents;

    // Compact structured set ("<trait>: <band>", in stored order) for R5's
    // synthesis engine. DATA only — no prompt copy consumes it yet.
    palmTraits = palmDominantTraits.length
      ? palmDominantTraits.map((t) => `${t.trait}: ${t.band}`)
      : undefined;
  } else {
    // Pre-backfill / extraction-failed users — blob + defaults, exactly as before.
    palmType = palmReading?.palmType?.name || 'Earth Hand';
    palmLifeTheme = palmReading?.destiny?.lifeTheme || 'A life of purpose and growth';
    naturalTalents = palmReading?.destiny?.naturalTalents || [
      'Problem-solving',
      'Communication',
      'Leadership',
    ];
    palmTraits = undefined;
  }

  // Build 27 R4 §9 step 4 — numerology consolidation (read from the ONE source).
  // lifePath: canonical sub-doc first, legacy flat fallback for un-backfilled users.
  const lifePathNumber = profile.numerology?.lifePathNumber ?? profile.lifePathNumber;

  // THE STALENESS FIX (finding #1): personalYear/personalMonth are time-varying
  // (they change every calendar year/month for the same birth date) but the
  // stored flats are frozen at the last birth-data save. Compute them FRESH from
  // birthData.date + today — the exact pattern profile.service.getNumerology()
  // uses. READ-ONLY: do NOT write these back to the profile (storing them is what
  // caused the staleness bug). Fall back to the stored flats ONLY when there is no
  // birth date to compute from — preserving today's exact behavior for that edge.
  let personalYear: number;
  let personalMonth: number;
  if (profile.birthData?.date) {
    const now = new Date();
    personalYear = getPersonalYear(profile.birthData.date, now.getFullYear());
    personalMonth = getPersonalMonth(personalYear, now.getMonth() + 1);
  } else {
    personalYear = profile.personalYear;
    personalMonth = profile.personalMonth;
  }
  const personalYearMeaning = getPersonalYearMeaning(personalYear);

  return {
    name: profile.name,
    sunSign: profile.sunSign,
    lifePathNumber,
    personalYear,
    personalMonth,
    personalYearMeaning,
    faceArchetype,
    faceArchetypeTagline,
    strengths,
    growthOpportunity,
    palmType,
    palmLifeTheme,
    naturalTalents,
    dominantTraits,
    moonSign,
    risingSign,
    activeAspects,
    keyTransits,
    faceTraits,
    palmTraits,
    // Build 27 R4 §9 step 4 — name-based numerology trio from the canonical
    // sub-doc (undefined when no name source exists yet). DATA only — no prompt
    // copy reads these until R5.
    expressionNumber: profile.numerology?.expressionNumber,
    soulUrgeNumber: profile.numerology?.soulUrgeNumber,
    personalityNumber: profile.numerology?.personalityNumber,
  };
}

/**
 * Get midnight (end of day) for cache expiration
 */
function getMidnight(): Date {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return midnight;
}

/**
 * Get next Monday for weekly cache expiration
 */
function getNextMonday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  return nextMonday;
}

/**
 * Get first of next month for monthly cache expiration
 */
function getFirstOfNextMonth(): Date {
  const now = new Date();
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return firstOfNextMonth;
}

/**
 * Get week start (Monday) for current week
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Build 27 R6 §9 step 4 — resolve the continuity ("what's shifted since your
 * last reading") block + the baseline seed/advance for the DAILY-FULL surface.
 *
 * This is the compute→render→pass keystone (plan §7 "Daily" + §4 #7). It is
 * scoped to `getDailyInsight` ONLY (weekly/monthly/teaser do NOT weave
 * continuity in this step) and is FAIL-OPEN by construction — any missing input
 * or thrown error yields an EMPTY continuity block, so the daily is a normal
 * reading and never fails because of R6.
 *
 * Returns:
 *   - `continuity` — the pre-rendered prompt block (or '' when not meaningful /
 *     no chart / no birth date / any error), passed to generateDailyInsight.
 *   - `persist`    — a BEST-EFFORT, fire-and-forget baseline writer the caller
 *     invokes AFTER the reading is served. It advances `baselineAt` to `now`
 *     only when a meaningful note was surfaced (plan §7 "advance point" + §11
 *     risk #5), otherwise persists the resolved baseline (which also seeds a
 *     fresh baseline the first time). Skips a redundant write when nothing
 *     changed; swallows all persist errors.
 */
interface DailyContinuityResult {
  // Build 27 R6 §9 step 5 — the raw computed delta is exposed ADDITIVELY so the
  // free/premium TEASER path can render its short hook (`buildContinuityHook`)
  // from the SAME machinery that produces the daily-FULL block. `null` when no
  // chart / no birth date / any error (fail-open). The daily-FULL path (step 4)
  // consumes `continuity` + `persist` only and is unaffected by this addition.
  delta: ContinuityDelta | null;
  continuity: string;
  persist: () => Promise<void>;
}

async function resolveDailyContinuity(
  userId: string,
  user: IUser
): Promise<DailyContinuityResult> {
  const NOOP: DailyContinuityResult = {
    delta: null,
    continuity: '',
    persist: async () => {},
  };

  try {
    // Lean projection of ONLY the fields the delta + baseline need. natalChart
    // is lazily backfilled by buildUserInsightProfile (which ran just before
    // this on the cache-miss path), so a fresh read observes it when available.
    const profileDoc = await UserProfile.findOne({ userId })
      .select('natalChart birthData continuity')
      .lean<{
        natalChart?: NatalChart | null;
        birthData?: { date?: Date | null } | null;
        continuity?: ContinuityBaseline | null;
      } | null>();

    if (!profileDoc) return NOOP;

    const now = new Date();

    // Baseline SEED (plan §4 #7): stored baseline → else the engagement signal
    // (lastCheckIn ?? lastSeenAt) → else now. `??` treats null/undefined alike.
    const storedBaselineAt = profileDoc.continuity?.baselineAt;
    const baseline = storedBaselineAt
      ? new Date(storedBaselineAt)
      : (user.engagement?.lastCheckIn ?? user.lastSeenAt ?? now);

    // Compute the delta ONLY when the inputs exist — no chart / no birth date →
    // a normal reading, never a fabricated shift. Any throw → fail-open null.
    let delta: ContinuityDelta | null = null;
    if (profileDoc.natalChart && profileDoc.birthData?.date) {
      try {
        delta = computeContinuityDelta({
          natal: profileDoc.natalChart,
          baselineAt: baseline,
          now,
          birthDate: new Date(profileDoc.birthData.date),
        });
      } catch (err: any) {
        logger.warn('continuity_delta_compute_failed', {
          userId,
          error: err?.message ?? String(err),
        });
        delta = null;
      }
    }

    const continuity = delta ? buildContinuityContext(delta) : '';

    // Advance the baseline to `now` ONLY when a meaningful note was surfaced;
    // otherwise keep the resolved baseline (also persists a fresh SEED the first
    // time). Stamp the algorithm version.
    const newBaseline = delta?.meaningful ? now : baseline;
    const desired: ContinuityBaseline = {
      baselineAt: newBaseline.toISOString(),
      continuityVersion: CONTINUITY_VERSION,
    };

    const persist = async () => {
      try {
        // Skip a redundant write when the stored baseline is byte-identical
        // (ISO round-trips canonically) AND the version tag is unchanged.
        if (
          profileDoc.continuity?.baselineAt === desired.baselineAt &&
          profileDoc.continuity?.continuityVersion === desired.continuityVersion
        ) {
          return;
        }
        await UserProfile.updateOne({ userId }, { $set: { continuity: desired } });
      } catch (err: any) {
        logger.warn('continuity_baseline_persist_failed', {
          userId,
          error: err?.message ?? String(err),
        });
      }
    };

    return { delta, continuity, persist };
  } catch (err: any) {
    // Any failure resolving continuity → fail-open to a normal reading.
    logger.warn('continuity_resolve_failed', {
      userId,
      error: err?.message ?? String(err),
    });
    return NOOP;
  }
}

/**
 * Get or generate daily insight
 */
export async function getDailyInsight(userId: string) {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  
  // Daily insight is available to all users (free tier content strategy)

  // Check cache
  const cached = await InsightCache.findOne({
    userId,
    type: 'daily',
    validUntil: { $gt: new Date() }
  });
  
  if (cached) {
    logger.info('Returning cached daily insight', { userId });
    return { 
      insight: cached.content, 
      cached: true,
      generatedAt: cached.createdAt
    };
  }
  
  // Generate new insight
  logger.info('Generating new daily insight', { userId });
  const profile = await buildUserInsightProfile(userId);

  // Build 27 R6 §9 step 4 — resolve the continuity block + baseline BEFORE
  // generation (buildUserInsightProfile has already lazily backfilled the natal
  // chart, so the lean read inside sees it). Fail-open: '' continuity on any
  // missing input / error → a normal daily reading.
  const continuityResult = await resolveDailyContinuity(userId, user);

  const insight = await claudeService.generateDailyInsight(
    profile,
    continuityResult.continuity
  );

  // Build 27 R6 Option C — surface the ALREADY-COMPUTED continuity as ADDITIVE
  // structured fields on the SAME daily output, so the mobile "what's shifted"
  // card mirrors the continuity woven into the prose. Attached BEFORE caching so
  // it stays STABLE all day (matching the reading) — a re-computed-at-view card
  // would vanish once the baseline advances. No generation change; the prose
  // still weaves continuityResult.continuity exactly as before.
  if (continuityResult.delta) {
    const card = buildContinuityCard(continuityResult.delta);
    if (card) {
      insight.continuity = card;
      insight.continuityHook = buildContinuityHook(continuityResult.delta);
    }
  }

  // Cache until midnight
  const midnight = getMidnight();

  await InsightCache.create({
    userId,
    type: 'daily',
    content: insight,
    validUntil: midnight
  });

  // Advance/seed the persisted baseline BEST-EFFORT after the reading is served
  // (a meaningful note was generated into a served reading — plan §7). Fire-and-
  // forget: never blocks or fails the reading (persist swallows its own errors).
  void continuityResult.persist();

  return {
    insight,
    cached: false,
    generatedAt: new Date()
  };
}

/**
 * Get daily teaser for free/premium users
 */
export async function getDailyTeaser(userId: string) {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  
  // If user has Premium Plus, redirect to full insight
  if (getEffectiveTier(user) === 'premium_plus') {
    const fullInsight = await getDailyInsight(userId);
    return fullInsight;
  }
  
  // For free/premium users, generate a teaser
  // We'll generate a full insight but only return teaser
  // Check cache first
  const cached = await InsightCache.findOne({
    userId,
    type: 'daily',
    validUntil: { $gt: new Date() }
  });
  
  let insight: DailyInsightOutput;
  
  if (cached) {
    insight = cached.content as DailyInsightOutput;
  } else {
    // Generate new insight
    const profile = await buildUserInsightProfile(userId);
    insight = await claudeService.generateDailyInsight(profile);
    
    // Cache it
    const midnight = getMidnight();
    await InsightCache.create({
      userId,
      type: 'daily',
      content: insight,
      validUntil: midnight
    });
  }
  
  // Build teaser from new structured format (with fallback for old cached data)
  const headline = insight.overallEnergy?.headline || insight.headline || '';
  const baseTeaser = insight.career?.summary && insight.love?.summary
    ? `${insight.career.summary}. ${insight.love.summary}.`
    : (insight as any).insight
      ? ((insight as any).insight.split('. ').slice(0, 2).join('. ') + '...')
      : headline;

  // Build 27 R6 §9 step 5 — free/premium daily-teaser continuity HOOK (Option A,
  // zero-mobile; S-R6 default). Reuse the SAME baseline machinery as the full
  // daily via `resolveDailyContinuity` (single-sourced seed/advance/persist,
  // fail-open). The hook depends on baseline-vs-now, NOT on the cached reading
  // content, so it is computed independent of the cache hit/miss above. When
  // meaningful, PREPEND the finished sentence to the teaser; headline / focusArea
  // / unlockPrompt stay UNCHANGED (response shape byte-identical → no mobile
  // change). On a same-day repeat call the baseline has already advanced → gap
  // small → !meaningful → no hook (self-regulating, matches the full daily).
  const continuityResult = await resolveDailyContinuity(userId, user);
  const hook = continuityResult.delta ? buildContinuityHook(continuityResult.delta) : '';
  const teaser = hook ? `${hook} ${baseTeaser}` : baseTeaser;
  // R6 Option C — additive structured continuity mirroring the hook prepended above.
  const continuityCard = continuityResult.delta ? buildContinuityCard(continuityResult.delta) : null;

  // Advance/seed the persisted baseline BEST-EFFORT after building the response
  // (a meaningful hook was served — plan §7 advance point). Fire-and-forget:
  // never blocks or fails the teaser (persist swallows its own errors).
  void continuityResult.persist();

  return {
    headline,
    teaser,
    focusArea: insight.focusArea,
    unlockPrompt: "Unlock full daily insights with Premium Plus",
    ...(continuityCard ? { continuity: continuityCard, continuityHook: hook } : {}),
  };
}

/**
 * Get or generate weekly forecast
 */
export async function getWeeklyForecast(userId: string) {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  
  if (getEffectiveTier(user) !== 'premium_plus') {
    throw new AppError(403, 'Premium Plus subscription required for weekly forecasts');
  }

  // Get week start (Monday)
  const weekStart = getWeekStart();
  
  // Check cache
  const cached = await InsightCache.findOne({
    userId,
    type: 'weekly',
    validUntil: { $gt: new Date() }
  });
  
  if (cached) {
    logger.info('Returning cached weekly forecast', { userId });
    return { 
      forecast: cached.content, 
      cached: true,
      generatedAt: cached.createdAt
    };
  }
  
  // Generate new forecast
  logger.info('Generating new weekly forecast', { userId });
  const profile = await buildUserInsightProfile(userId);
  const forecast = await claudeService.generateWeeklyForecast(profile, weekStart);
  
  // Cache until next Monday
  const nextMonday = getNextMonday();
  
  await InsightCache.create({
    userId,
    type: 'weekly',
    content: forecast,
    validUntil: nextMonday
  });
  
  return { 
    forecast, 
    cached: false,
    generatedAt: new Date()
  };
}

/**
 * Get or generate monthly reading
 */
export async function getMonthlyReading(userId: string) {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  // Check cache
  const cached = await InsightCache.findOne({
    userId,
    type: 'monthly',
    validUntil: { $gt: new Date() }
  });
  
  if (cached) {
    logger.info('Returning cached monthly reading', { userId });
    return {
      reading: cached.content,
      cached: true,
      tier: getEffectiveTier(user) === 'free' ? 'free' : 'premium',
      generatedAt: cached.createdAt
    };
  }

  // Determine tier (free gets basic, premium/premium_plus get full)
  const tier = getEffectiveTier(user) === 'free' ? 'free' : 'premium';
  
  // Generate new reading
  logger.info('Generating new monthly reading', { userId, tier });
  const profile = await buildUserInsightProfile(userId);
  const reading = await claudeService.generateMonthlyReading(profile, month, year, tier);
  
  // Cache until 1st of next month
  const firstOfNextMonth = getFirstOfNextMonth();
  
  await InsightCache.create({
    userId,
    type: 'monthly',
    content: reading,
    validUntil: firstOfNextMonth
  });
  
  return { 
    reading, 
    cached: false,
    tier,
    generatedAt: new Date()
  };
}

/**
 * Clean up expired cache entries (can be run as a background job)
 */
export async function cleanupExpiredCache(): Promise<number> {
  const result = await InsightCache.deleteMany({
    validUntil: { $lt: new Date() }
  });
  
  logger.info('Cleaned up expired insight cache', { deletedCount: result.deletedCount });
  return result.deletedCount || 0;
}
