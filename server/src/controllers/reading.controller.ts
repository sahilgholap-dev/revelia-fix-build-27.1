import { Request, Response } from 'express';
import * as readingService from '../services/reading.service';
import * as claudeService from '../services/claude.service';
import { logger } from '../utils/logger';
import { sanitiseReadPayload } from '../services/prose-sanitiser';
import { NameAnalysis } from '../models/NameAnalysis';
import { CareerDestiny } from '../models/CareerDestiny';
import { UserProfile } from '../models/UserProfile';
import { User } from '../models/User';
import {
  calculateExpressionNumber,
  calculateSoulUrgeNumber,
  calculatePersonalityNumber,
  computeNameNumbers,
  assessNameCompleteness,
} from '../utils/nameNumerology';
import { getLifePathNumber, NUMEROLOGY_VERSION } from '../utils/numerology';
import { ensureProfileNumerology } from '../services/numerology.service';
import { sendReadingError } from '../utils/readingErrorResponse';
import { AiFailure } from '../models/AiFailure';
import {
  computeNatalChartFromBirthData,
  computeTransits,
  describeNatalAspects,
  describeTransits,
} from '../services/astrology.service';
import {
  NatalChart,
  FaceTrait,
  FaceArchetypeResult,
  PalmTrait,
  PalmProfileResult,
  PalmTypeClass,
} from '../types/shared';

/**
 * POST /api/readings/face
 * Generate or regenerate face reading
 */
export async function generateFaceReading(req: Request, res: Response) {
  let userId: string | undefined;
  try {
    userId = req.user!._id.toString();
    const { regenerate = false } = req.body;

    const result = await readingService.getFaceReading(userId, regenerate);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Face reading error:', { userId, error: error.message });
    const debugRef = await latestFailureRef(userId, 'face_reading');
    sendReadingError({
      res,
      error,
      defaultMessage: 'We had trouble generating your face reading. Please try again.',
      debugRef,
    });
  }
}

async function latestFailureRef(userId: string | undefined, readingType: string): Promise<string | undefined> {
  if (!userId) return undefined;
  try {
    const fresh = await AiFailure.findOne({ userId, readingType })
      .sort({ createdAt: -1 })
      .select('_id createdAt')
      .lean();
    if (!fresh) return undefined;
    if (Date.now() - new Date(fresh.createdAt).getTime() > 60_000) return undefined;
    return fresh._id.toString();
  } catch {
    return undefined;
  }
}

/**
 * POST /api/readings/palm
 * Generate or regenerate palm reading
 */
export async function generatePalmReading(req: Request, res: Response): Promise<void> {
  let userId: string | undefined;
  try {
    userId = req.user!._id.toString();
    const { hand = 'dominant', regenerate = false } = req.body;

    if (!['dominant', 'non-dominant'].includes(hand)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid hand parameter. Must be "dominant" or "non-dominant"',
        },
      });
      return;
    }

    const result = await readingService.getPalmReading(userId, hand, regenerate);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Palm reading error:', { userId, error: error.message });
    const debugRef = await latestFailureRef(userId, 'palm_reading');
    sendReadingError({
      res,
      error,
      defaultMessage: 'We had trouble generating your palm reading. Please try again.',
      debugRef,
    });
  }
}

/**
 * GET /api/readings/face
 * Get cached face reading
 */
export async function getCachedFaceReading(req: Request, res: Response) {
  try {
    const userId = req.user!._id.toString();
    
    // Get cached only (forceRegenerate = false)
    const result = await readingService.getFaceReading(userId, false);

    /* `P91` (a) — the read boundary. Face never expires, so 180 of 276 stored
       readings would otherwise keep the old punctuation for the life of the
       account. See `prose-sanitiser.ts`'s read-boundary block for why there is no
       exclusion list and what replaces one. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload(result).value
    });
  } catch (error: any) {
    res.status(error.statusCode || 404).json({
      success: false,
      error: error.message || 'No face reading found'
    });
  }
}

/**
 * GET /api/readings/palm
 * Get cached palm reading
 */
export async function getCachedPalmReading(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const { hand = 'dominant' } = req.query;
    
    if (!['dominant', 'non-dominant'].includes(hand as string)) {
      res.status(400).json({
        success: false,
        error: 'Invalid hand parameter. Must be "dominant" or "non-dominant"'
      });
      return;
    }
    
    const result = await readingService.getPalmReading(userId, hand as any, false);

    /* `P91` (a) — palm never expires either: 167 of 276 dominant readings dirty. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload(result).value
    });
  } catch (error: any) {
    res.status(error.statusCode || 404).json({
      success: false,
      error: error.message || 'No palm reading found'
    });
  }
}

/**
 * GET /api/readings/history
 * Get reading history
 */
export async function getReadingHistory(req: Request, res: Response) {
  try {
    const userId = req.user!._id.toString();
    const { type, limit } = req.query;
    
    const history = await readingService.getReadingHistory(
      userId,
      type as string,
      limit ? parseInt(limit as string) : 10
    );
    
    /* `P91` (a) — the LEGACY `readings` collection, and it is the dirtiest of the
       lot at 376 of 431. It is also the one a natural-expiry answer never reaches
       at all, because nothing in it expires and nothing writes to it any more. */
    res.status(200).json({
      success: true,
      data: { readings: sanitiseReadPayload(history).value }
    });
  } catch (error: any) {
    logger.error('Reading history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve reading history'
    });
  }
}

/**
 * GET /api/test/claude
 * Test Claude API connectivity
 */
export async function testClaude(_req: Request, res: Response) {
  try {
    const message = await claudeService.testClaudeConnection();

    res.status(200).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Claude test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Claude API connection failed'
    });
  }
}

// ============================================================================
// Name Destiny Analysis (Premium Plus)
// ============================================================================

/**
 * Helper: Get current month boundaries for credit check
 */
function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/**
 * GET /api/readings/name-destiny/credits
 * Check name destiny credit availability
 */
export async function getNameDestinyCredits(req: Request, res: Response): Promise<void> {
  console.log('HIT: GET /api/readings/name-destiny/credits');
  try {
    const userId = req.user!._id.toString();
    const { start, end } = getCurrentMonthRange();

    const usedThisMonth = await NameAnalysis.countDocuments({
      userId,
      generatedAt: { $gte: start, $lt: end },
    });

    const lastAnalysis = await NameAnalysis.findOne({ userId })
      .sort({ generatedAt: -1 })
      .select('generatedAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        creditsRemaining: Math.max(0, 1 - usedThisMonth),
        creditsTotal: 1,
        resetsOn: end.toISOString(),
        lastUsedAt: lastAnalysis?.generatedAt
          ? new Date(lastAnalysis.generatedAt).toISOString()
          : null,
      },
    });
  } catch (error: any) {
    logger.error('Name destiny credits error:', error);
    res.status(500).json({ success: false, error: 'Failed to check credits' });
  }
}

/**
 * GET /api/readings/name-destiny
 * Get most recent name destiny analysis
 */
export async function getNameDestiny(req: Request, res: Response): Promise<void> {
  console.log('HIT: GET /api/readings/name-destiny');
  try {
    const userId = req.user!._id.toString();
    const { start, end } = getCurrentMonthRange();

    const analysis = await NameAnalysis.findOne({ userId })
      .sort({ generatedAt: -1 })
      .lean();

    const usedThisMonth = await NameAnalysis.countDocuments({
      userId,
      generatedAt: { $gte: start, $lt: end },
    });

    /* `P91` (a) — name destiny never expires: 13 of 14 stored analyses dirty. The
       whole `data` node goes through, not just `analysis`, because the walk is a
       no-op on anything carrying no em-dash and narrowing it would make the call
       site a second place that has to know the payload's shape. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload({
        analysis: analysis || null,
        credits: {
          creditsRemaining: Math.max(0, 1 - usedThisMonth),
          resetsOn: end.toISOString(),
        },
      }).value,
    });
  } catch (error: any) {
    logger.error('Get name destiny error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve name analysis' });
  }
}

/**
 * POST /api/readings/name-destiny
 * Generate a new name destiny analysis
 */
export async function generateNameDestiny(req: Request, res: Response): Promise<void> {
  console.log('HIT: POST /api/readings/name-destiny');
  try {
    const userId = req.user!._id.toString();
    const { firstName, middleName, lastName } = req.body;

    if (!firstName || !lastName) {
      res.status(400).json({ success: false, error: 'First name and last name are required' });
      return;
    }

    // Check credit availability
    const { start, end } = getCurrentMonthRange();
    const usedThisMonth = await NameAnalysis.countDocuments({
      userId,
      generatedAt: { $gte: start, $lt: end },
    });

    if (usedThisMonth >= 1) {
      res.status(403).json({
        success: false,
        error: `You've used your Name Destiny Analysis for this month. It resets on ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`,
        credits: { creditsRemaining: 0, resetsOn: end.toISOString() },
      });
      return;
    }

    // Build full name
    const fullName = middleName
      ? `${firstName} ${middleName} ${lastName}`
      : `${firstName} ${lastName}`;

    // Calculate numerology numbers server-side (the ONE definition of "the set"
    // — identical values to the three calculate* calls by construction, Build 27
    // R4 step 2's computeNameNumbers).
    const { expressionNumber, soulUrgeNumber, personalityNumber } =
      computeNameNumbers(fullName);

    // Assess whether the submitted name appears to be a full birth name.
    // Never blocks — used only to calibrate Claude's confidence and to
    // surface a mild educational disclaimer in mobile when level !== 'high'.
    const completeness = assessNameCompleteness(firstName, middleName ?? null, lastName);
    const completenessNote =
      completeness.level === 'high'
        ? undefined
        : `The name may be partial or informal (${completeness.warnings.join(' ')}). Lead the analysis with: "Based on the name you provided. Pythagorean numerology traditionally uses your full birth name as it appears on a birth certificate." Then proceed with analysis using the numbers calculated from what was given.`;

    console.log('Name destiny calculation:', {
      fullName,
      expressionNumber,
      soulUrgeNumber,
      personalityNumber,
      completenessLevel: completeness.level,
    });

    // Get user profile for birth data context
    const profile = await UserProfile.findOne({ userId }).lean();
    const dob = profile?.birthData?.date
      ? new Date(profile.birthData.date).toISOString().split('T')[0]
      : undefined;

    // Build 27 R5 §9 step 2 (LIGHT astro touch) — real moon/rising from the
    // Swiss Ephemeris natal chart, so the name analysis can relate the name's
    // numbers to the user's chart identity. `profile` is lean(), so compute
    // in-memory when the chart hasn't been persisted (mirrors career's guarded
    // sourcing; no save here — the insight path + backfill persist it). Both
    // stay optional: a pre-backfill / no-birth-time user simply omits them.
    let natalChart = (profile as any)?.natalChart as NatalChart | null | undefined;
    if (!natalChart && profile?.birthData?.date) {
      natalChart = computeNatalChartFromBirthData(profile.birthData as any) ?? undefined;
    }

    // Call Claude API
    const aiResponse = await claudeService.generateNameDestiny({
      firstName,
      middleName,
      lastName,
      fullName,
      expressionNumber,
      soulUrgeNumber,
      personalityNumber,
      dob,
      // Build 27 R4 §9 step 4 — sub-doc first, legacy flat fallback (same value
      // by construction; uniformity is the §10 criterion).
      lifePathNumber: profile?.numerology?.lifePathNumber ?? profile?.lifePathNumber,
      sunSign: profile?.sunSign,
      moonSign: natalChart?.moon as string | undefined,
      risingSign: (natalChart?.rising ?? undefined) as string | undefined,
      completenessNote,
    });

    // Recalculate numbers for each suggested variation (don't trust Claude's math)
    if (aiResponse.nameVariations && Array.isArray(aiResponse.nameVariations)) {
      for (const variation of aiResponse.nameVariations) {
        if (variation.suggestedName) {
          variation.newExpressionNumber = calculateExpressionNumber(variation.suggestedName);
          variation.newSoulUrgeNumber = calculateSoulUrgeNumber(variation.suggestedName);
          variation.newPersonalityNumber = calculatePersonalityNumber(variation.suggestedName);
        }
      }
    }

    // Save to database
    const analysis = await NameAnalysis.create({
      userId,
      fullName,
      firstName,
      middleName: middleName || undefined,
      lastName,
      expressionNumber,
      soulUrgeNumber,
      personalityNumber,
      currentNameAnalysis: aiResponse.currentNameAnalysis,
      nameVariations: aiResponse.nameVariations,
      generatedAt: new Date(),
    });

    console.log('Name destiny analysis saved:', analysis._id);

    // Build 27 R4 hook 2: persist the canonical name-based numbers to the
    // profile sub-doc. `name_destiny` is the highest-provenance source (the
    // user's declared full birth name) and ALWAYS overwrites the name-based
    // fields here — even over a previous `name_destiny` set (newest declared
    // birth name wins); the one-way hierarchy only blocks `profile_name` from
    // overwriting upward. FAIL-SOFT: a persist failure must NOT fail the 201 —
    // the analysis itself already succeeded. See §6 hook 2.
    try {
      const profileDoc = await UserProfile.findOne({ userId });
      if (profileDoc) {
        // lifePath is required by the sub-schema but name-destiny does not
        // require birth data. Source it from the existing sub-doc → legacy flat
        // → birthData.date; if none exists (no birth data at all) SKIP with a
        // warn rather than write a partial doc that fails validation. The trio
        // self-heals via the step-5 backfill / step-4 lazy fallback once birth
        // data exists.
        const lifePath =
          profileDoc.numerology?.lifePathNumber ??
          profileDoc.lifePathNumber ??
          (profileDoc.birthData?.date
            ? getLifePathNumber(profileDoc.birthData.date)
            : undefined);

        if (lifePath === undefined || lifePath === null) {
          logger.warn('numerology_name_destiny_persist_skipped_no_lifepath', { userId });
        } else {
          profileDoc.numerology = {
            lifePathNumber: lifePath,
            expressionNumber,
            soulUrgeNumber,
            personalityNumber,
            nameUsed: fullName,
            nameSource: 'name_destiny',
            numerologyVersion: NUMEROLOGY_VERSION,
            computedAt: new Date().toISOString(),
          };
          await profileDoc.save();
        }
      }
    } catch (persistErr: any) {
      logger.warn('numerology_name_destiny_persist_failed', {
        userId,
        error: persistErr?.message ?? String(persistErr),
      });
    }

    res.status(201).json({
      success: true,
      data: {
        analysis: analysis.toJSON(),
        credits: {
          creditsRemaining: 0,
          resetsOn: end.toISOString(),
        },
        nameCompleteness: {
          level: completeness.level,
          warnings: completeness.warnings,
        },
      },
    });
  } catch (error: any) {
    logger.error('Generate name destiny error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to generate name analysis',
    });
  }
}

// ============================================================================
// Career Destiny Path (Premium Plus)
// ============================================================================

/**
 * GET /api/readings/career-destiny
 * Get most recent career destiny analysis
 */
export async function getCareerDestiny(req: Request, res: Response): Promise<void> {
  console.log('HIT: GET /api/readings/career-destiny');
  try {
    const userId = req.user!._id.toString();

    const career = await CareerDestiny.findOne({ userId })
      .sort({ generatedAt: -1 })
      .lean();

    // Check if user has updated face/palm since last generation
    let canRegenerate = !career;
    if (career) {
      const profile = await UserProfile.findOne({ userId }).lean();
      const lastGen = new Date(career.generatedAt);
      const faceUpdated = profile?.images?.face?.uploadedAt && new Date(profile.images.face.uploadedAt) > lastGen;
      const palmUpdated = profile?.images?.palmDominant?.uploadedAt && new Date(profile.images.palmDominant.uploadedAt) > lastGen;
      canRegenerate = !!(faceUpdated || palmUpdated);
    }

    /* `P91` (a) — career destiny never expires: 20 of 26 stored analyses dirty. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload({
        career: career || null,
        canRegenerate,
      }).value,
    });
  } catch (error: any) {
    logger.error('Get career destiny error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve career analysis' });
  }
}

// Build 27 R5 §9 step 2 — career sources face/palm from the R2/R3 STABLE trait
// layer, so it needs the same two tiny transforms buildUserInsightProfile uses
// (insight.service.ts). Replicated here (that helper's copies are module-local
// and not exported, and R5 must not modify insight.service). Keep in sync if the
// insight-service originals ever change. Deterministic, TOTAL over the closed set.
function capitalizeTrait(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
const PALM_TYPE_DISPLAY: Record<PalmTypeClass, string> = {
  earth: 'Earth Hand',
  air: 'Air Hand',
  water: 'Water Hand',
  fire: 'Fire Hand',
};

/**
 * POST /api/readings/career-destiny
 * Generate a new career destiny analysis
 */
export async function generateCareerDestiny(req: Request, res: Response): Promise<void> {
  console.log('HIT: POST /api/readings/career-destiny');
  try {
    const userId = req.user!._id.toString();

    // Gather all available user data
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const profile = await UserProfile.findOne({ userId }).lean();
    if (!profile) {
      res.status(400).json({ success: false, error: 'Profile not found. Please complete your profile first.' });
      return;
    }

    // Build 27 R5 §9 step 2 — FACE: source from the R2 STABLE trait layer
    // (faceArchetypeResult + faceTraits), MIRRORING buildUserInsightProfile's
    // gate (they persist together, so a single gate suffices). FALL BACK to the
    // freeform reading blob ONLY when the stable layer is absent — never regress
    // pre-backfill users. `profile` is lean() here: read plain fields, no .save().
    let faceArchetype: string | undefined;
    let faceStrengths: string | undefined;
    let faceTraits: string[] | undefined; // compact "<trait>: <band>" bands (stable layer only)
    const hasFaceReading = !!profile.faceReading;
    {
      const faceTraitsStable = (profile.faceTraits as FaceTrait[] | undefined) ?? [];
      const faceArch = profile.faceArchetypeResult as FaceArchetypeResult | undefined;
      if (faceArch && faceTraitsStable.length > 0) {
        faceArchetype = faceArch.name;
        // strengths = high-band trait names; fall back to top-scored (as insight.service).
        const byScore = faceTraitsStable
          .map((t, i) => ({ t, i }))
          .sort((a, b) => b.t.score - a.t.score || a.i - b.i)
          .map((x) => x.t);
        const highBand = faceTraitsStable.filter((t) => t.band === 'high');
        faceStrengths = (highBand.length ? highBand : byScore.slice(0, 3))
          .map((t) => capitalizeTrait(t.trait))
          .join(', ');
        faceTraits = faceTraitsStable.map((t) => `${t.trait}: ${t.band}`);
      } else if (profile.faceReading) {
        const fr = profile.faceReading as any;
        faceArchetype = fr.archetype?.name || fr.archetype;
        faceStrengths = Array.isArray(fr.strengths) ? fr.strengths.join(', ') : undefined;
        // No trait bands pre-backfill — buildFeatureContext omits the section gracefully.
      }
    }

    // Build 27 R5 §9 step 2 — PALM: source palmType (the "X Hand" display),
    // lifeTheme, naturalTalents, and trait bands from the R3 STABLE DOMINANT-hand
    // layer (palmProfileResult + palmDominantTraits). FALL BACK to the freeform
    // blob when absent — never regress pre-backfill users.
    let palmType: string | undefined;
    let palmTalents: string | undefined;
    let palmLifeTheme: string | undefined;
    let palmTraits: string[] | undefined; // compact "<trait>: <band>" bands (stable layer only)
    const hasPalmReading = !!profile.palmReading;
    {
      const palmProfile = profile.palmProfileResult as PalmProfileResult | undefined;
      const palmDominantTraits = (profile.palmDominantTraits as PalmTrait[] | undefined) ?? [];
      if (palmProfile) {
        palmType = PALM_TYPE_DISPLAY[palmProfile.palmType];
        palmLifeTheme = palmProfile.lifeTheme;
        palmTalents = palmProfile.naturalTalents?.length
          ? palmProfile.naturalTalents.join(', ')
          : undefined;
        palmTraits = palmDominantTraits.length
          ? palmDominantTraits.map((t) => `${t.trait}: ${t.band}`)
          : undefined;
      } else if (profile.palmReading) {
        const pr = profile.palmReading as any;
        palmType = pr.palmType?.name;
        palmLifeTheme = pr.destiny?.lifeTheme;
        palmTalents = pr.destiny?.naturalTalents
          ? (Array.isArray(pr.destiny.naturalTalents)
            ? pr.destiny.naturalTalents.join(', ')
            : pr.destiny.naturalTalents)
          : undefined;
      }
    }

    // Build 27 R4 §9 step 4 — THE EXPRESSION FIX (finding #2): read the canonical
    // Expression number from the numerology sub-doc, NOT derived from the display
    // name. Do NOT re-add a name-string fallback (computing from
    // profile.name/user.name is exactly the bug being fixed). Un-backfilled users
    // pass undefined here — the career prompt renders 'Unknown' (claude.service);
    // step 5's backfill + lazy fallback closes that interim gap (steps 4–6 ship
    // together as one release).
    const userName = profile.name || user.name || 'User';

    // Build 27 R4 §9 step 5 — lazy backfill closes step-4's interim gap: an
    // un-backfilled user with birth data + a NameAnalysis (or usable
    // profile.name) gets a real Expression instead of undefined. `profile` is
    // lean() here, so the helper persists via updateOne and RETURNS the effective
    // sub-doc to use for THIS request — do NOT re-read profile.numerology (the
    // lean copy is stale after the updateOne). Same provenance hierarchy + version
    // stamp as the backfill; still NOT derived from the display name (finding #2).
    const effectiveNumerology = await ensureProfileNumerology(profile as any, { lean: true });
    const expressionNumber: number | undefined =
      effectiveNumerology?.expressionNumber ?? profile.numerology?.expressionNumber;
    // Build 27 R5 §9 step 2 — the rest of the R4 name trio, same provenance as
    // Expression (canonical sub-doc via the lazy-backfill helper; expression is
    // still NOT derived from the display name — R4 finding #2 intact).
    const soulUrgeNumber: number | undefined =
      effectiveNumerology?.soulUrgeNumber ?? profile.numerology?.soulUrgeNumber;
    const personalityNumber: number | undefined =
      effectiveNumerology?.personalityNumber ?? profile.numerology?.personalityNumber;

    // Build 27 R1: real moon/rising from the Swiss Ephemeris natal chart.
    // `profile` is lean(), so compute in-memory when the chart hasn't been
    // persisted yet (no save here — the insight path + backfill persist it).
    let natalChart = (profile as any).natalChart as NatalChart | null | undefined;
    if (!natalChart && profile.birthData?.date) {
      natalChart = computeNatalChartFromBirthData(profile.birthData as any) ?? undefined;
    }

    // Build 27 R5 §9 step 2 — derive R1 active natal aspects + today's key
    // transits from that chart, MIRRORING buildUserInsightProfile (same
    // astrology.service helpers, same try/catch around the date-sensitive
    // transit compute). Omitted gracefully when there is no chart.
    let activeAspects: string[] | undefined;
    let keyTransits: string[] | undefined;
    if (natalChart) {
      try {
        activeAspects = describeNatalAspects(natalChart);
        const transits = computeTransits(natalChart, new Date());
        keyTransits = describeTransits(transits);
      } catch (err: any) {
        logger.warn('career_transit_compute_failed', {
          userId,
          error: err?.message ?? String(err),
        });
      }
    }

    const inputData = {
      sunSign: profile.sunSign,
      moonSign: natalChart?.moon as string | undefined,
      risingSign: (natalChart?.rising ?? undefined) as string | undefined,
      lifePathNumber: profile.lifePathNumber,
      expressionNumber,
      faceArchetype,
      palmType,
      hasFaceReading,
      hasPalmReading,
    };

    console.log('Career destiny input data:', inputData);

    // Call Claude API
    const aiResponse = await claudeService.generateCareerDestiny({
      name: userName,
      sunSign: profile.sunSign,
      moonSign: inputData.moonSign,
      risingSign: inputData.risingSign,
      lifePathNumber: profile.lifePathNumber,
      expressionNumber,
      soulUrgeNumber,
      personalityNumber,
      activeAspects,
      keyTransits,
      faceArchetype,
      faceStrengths,
      faceTraits,
      palmType,
      palmTalents,
      palmLifeTheme,
      palmTraits,
    });

    // Save to database
    const career = await CareerDestiny.create({
      userId,
      inputData,
      careerProfile: aiResponse.careerProfile,
      careers: aiResponse.careers,
      nonTraditionalPaths: aiResponse.nonTraditionalPaths || [],
      actionAdvice: aiResponse.actionAdvice,
      generatedAt: new Date(),
    });

    console.log('Career destiny saved:', career._id);

    res.status(201).json({
      success: true,
      data: {
        career: career.toJSON(),
        canRegenerate: false,
      },
    });
  } catch (error: any) {
    logger.error('Generate career destiny error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to generate career analysis',
    });
  }
}
