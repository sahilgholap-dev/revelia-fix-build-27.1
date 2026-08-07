import axios from 'axios';
import { User } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { Reading } from '../models/Reading';
import * as claudeService from './claude.service';
import { AppError } from '../middleware/error.middleware';
import { getEffectiveTier } from '../utils/subscriptionTier';
import { logger } from '../utils/logger';
import { extractFaceFeatures } from './faceFeatures.service';
import { mapFeaturesToTraits, RULES_VERSION } from '../data/physiognomy-rules';
import { extractHandFeatures } from './palmFeatures.service';
import {
  mapFeaturesToPalmTraits,
  RULES_VERSION as PALM_RULES_VERSION,
} from '../data/chiromancy-rules';
import { PalmReadingSubstance } from '../prompts/palm-reading.prompt';
import { HandFeatureVector } from '../types/shared';

/**
 * Get or generate face reading
 */
export async function getFaceReading(
  userId: string,
  forceRegenerate: boolean = false
) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const profile = await UserProfile.findOne({ userId });
  if (!profile) throw new AppError(404, 'Profile not found. Please complete your profile setup first.');

  console.log('Generating face reading for user:', {
    userId,
    hasProfile: !!profile,
    hasSunSign: !!profile?.sunSign,
    hasLifePath: !!(profile?.numerology?.lifePathNumber ?? profile?.lifePathNumber),
    hasImages: !!profile?.images,
    hasFaceImage: !!profile?.images?.face?.url
  });

  const faceImageUrl = profile.images?.face?.url;
  if (!faceImageUrl) {
    throw new AppError(400, 'No face image uploaded. Please capture your face photo first.');
  }

  // Build 27 R2 — lazy face-feature extraction. If the structured trait layer is
  // missing (user uploaded before R2 shipped, or upload-time extraction failed
  // / found no face), compute it now from the CANONICAL stored R2 bytes and
  // persist. Mirrors R1's lazy natal-chart compute. Two hard rules:
  //  (1) Extract STRAIGHT on the stored bytes — do NOT re-run processImage; the
  //      R2 object already IS the canonical processed buffer, and re-encoding
  //      would shift landmarks and break "same image → same vector".
  //  (2) Fail-open: a fetch/extract/map failure must NEVER block the reading —
  //      it still serves from the existing blob/defaults below.
  if (!profile.faceTraits || profile.faceTraits.length === 0) {
    try {
      const response = await axios.get(faceImageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const storedBytes = Buffer.from(response.data);
      const vector = await extractFaceFeatures(storedBytes);
      if (vector) {
        const { traits, archetype } = mapFeaturesToTraits(vector);
        await UserProfile.findOneAndUpdate(
          { userId },
          {
            $set: {
              faceFeatures: vector,
              faceTraits: traits,
              faceArchetypeResult: archetype,
              faceRulesVersion: RULES_VERSION,
            },
          }
        );
        // Reflect on the in-memory doc so anything later in this request sees it.
        profile.faceFeatures = vector as any;
        profile.faceTraits = traits as any;
        profile.faceArchetypeResult = archetype as any;
        profile.faceRulesVersion = RULES_VERSION;
        logger.info('face_features_lazy_extracted', { userId });
      } else {
        logger.warn('face_features_lazy_extract_no_face', { userId });
      }
    } catch (err: any) {
      logger.warn('face_features_lazy_extract_failed', {
        userId,
        error: err?.message ?? String(err),
      });
    }
  }

  // Return cached if exists and not forcing regenerate
  if (profile.faceReading && !forceRegenerate) {
    logger.info('Returning cached face reading', { userId });
    return {
      reading: profile.faceReading,
      cached: true,
      tier: getEffectiveTier(user) === 'free' ? 'free' : 'premium',
      generatedAt: profile.updatedAt
    };
  }

  // Check regenerate permission (premium only)
  if (forceRegenerate && getEffectiveTier(user) === 'free') {
    throw new AppError(403, 'Premium subscription required to regenerate readings');
  }

  // Generate new reading with defensive defaults for new users
  const tier = getEffectiveTier(user) === 'free' ? 'free' : 'premium';
  const userContext = {
    name: profile.name || user.name || undefined,
    sunSign: profile.sunSign || undefined,
    lifePathNumber: (profile.numerology?.lifePathNumber ?? profile.lifePathNumber) || undefined,
    userId,
  };

  // Build 27 R2 step 5 — drive the reading from the STABLE trait layer, not the
  // pixels. When the profile has rules-computed faceTraits (the common path,
  // populated at upload or by the lazy fallback above), pass the trait scores +
  // closed-set archetype + measured face shape/features as the reading's fixed
  // substance; claude.service then generates traits-only (no image) and pins the
  // substance. When faceTraits are absent (extraction failed / found no face),
  // substance stays undefined → the legacy image-based Vision call runs so no
  // user loses their reading.
  const faceSubstance =
    profile.faceTraits && profile.faceTraits.length > 0
      ? {
          faceShape: profile.faceFeatures?.faceShape,
          archetype: {
            name: profile.faceArchetypeResult?.name || 'The Seeker',
            tagline: profile.faceArchetypeResult?.tagline || '',
          },
          traits: profile.faceTraits.map((t) => ({
            trait: t.trait,
            score: t.score,
            band: t.band,
            description: t.description,
          })),
          features: profile.faceFeatures?.categoricals as
            | Record<string, string>
            | undefined,
        }
      : undefined;

  logger.info('Generating new face reading', {
    userId,
    tier,
    userContext,
    traitsDriven: !!faceSubstance,
  });

  try {
    const reading = await claudeService.generateFaceReadingWithRetry(
      faceImageUrl,
      tier,
      userContext,
      faceSubstance
    );

    // Cache in profile using atomic update (avoids full-document validation/version conflicts)
    await UserProfile.findOneAndUpdate(
      { userId },
      { $set: { faceReading: reading } }
    );

    // Save to history
    await Reading.create({
      userId,
      type: 'face',
      tier,
      content: reading,
      imageUrl: faceImageUrl,
    });

    logger.info('Face reading generated and cached', { userId });

    return {
      reading,
      cached: false,
      tier,
      generatedAt: new Date()
    };
  } catch (error: any) {
    logger.error('Face reading generation failed:', {
      userId,
      error: error.message,
      stack: error.stack,
      profileExists: !!profile,
      hasImages: !!profile?.images,
      hasFaceUrl: !!faceImageUrl,
      hasSunSign: !!profile?.sunSign,
      hasLifePath: !!(profile?.numerology?.lifePathNumber ?? profile?.lifePathNumber)
    });
    throw error;
  }
}

/**
 * Get or generate palm reading
 */
export async function getPalmReading(
  userId: string,
  hand: 'dominant' | 'non-dominant',
  forceRegenerate: boolean = false
) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const profile = await UserProfile.findOne({ userId });
  if (!profile) throw new AppError(404, 'Profile not found. Please complete your profile setup first.');

  console.log('Generating palm reading for user:', {
    userId,
    hand,
    hasProfile: !!profile,
    hasSunSign: !!profile?.sunSign,
    hasLifePath: !!(profile?.numerology?.lifePathNumber ?? profile?.lifePathNumber),
    hasImages: !!profile?.images,
    handedness: profile?.handedness
  });

  // Check premium for non-dominant hand
  if (hand === 'non-dominant' && getEffectiveTier(user) === 'free') {
    throw new AppError(403, 'Premium subscription required for non-dominant palm reading');
  }

  const isDominant = hand === 'dominant';
  const imageField = isDominant ? 'palmDominant' : 'palmNonDominant';
  const imageUrl = profile.images?.[imageField]?.url;

  if (!imageUrl) {
    throw new AppError(400, `No ${hand} palm image uploaded. Please capture your palm photo first.`);
  }

  // Build 27 R3 — lazy palm-feature extraction, PER HAND. If this hand's
  // structured feature layer is missing (uploaded before R3 shipped, or
  // upload-time extraction failed / found no hand), compute it now from the
  // CANONICAL stored R2 bytes and persist. Mirrors getFaceReading's lazy fallback
  // + R1's lazy natal compute. Two hard rules:
  //  (1) Extract STRAIGHT on the stored bytes — do NOT re-run processImage; the R2
  //      object already IS the canonical processed buffer, and re-encoding would
  //      shift landmarks and break "same image → same vector".
  //  (2) Fail-open: a fetch/extract/map failure must NEVER block the reading — it
  //      still serves from the existing blob/defaults below.
  // Per-hand field rules match the upload hook: the dominant hand additionally
  // writes palmProfileResult/palmRulesVersion; the non-dominant hand does not.
  const existingPalmFeatures = isDominant
    ? profile.palmDominantFeatures
    : profile.palmNonDominantFeatures;
  if (!existingPalmFeatures) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const storedBytes = Buffer.from(response.data);
      const vector = await extractHandFeatures(storedBytes, hand);
      if (vector) {
        const mapped = mapFeaturesToPalmTraits(vector);
        const lazyUpdate: Record<string, any> = { $set: {} };
        if (isDominant) {
          lazyUpdate.$set.palmDominantFeatures = vector;
          lazyUpdate.$set.palmDominantTraits = mapped.traits;
          lazyUpdate.$set.palmProfileResult = mapped.profile;
          lazyUpdate.$set.palmRulesVersion = PALM_RULES_VERSION;
          // Reflect on the in-memory doc so anything later in this request sees it.
          profile.palmDominantFeatures = vector as any;
          profile.palmDominantTraits = mapped.traits as any;
          profile.palmProfileResult = mapped.profile as any;
          profile.palmRulesVersion = PALM_RULES_VERSION;
        } else {
          lazyUpdate.$set.palmNonDominantFeatures = vector;
          lazyUpdate.$set.palmNonDominantTraits = mapped.traits;
          profile.palmNonDominantFeatures = vector as any;
          profile.palmNonDominantTraits = mapped.traits as any;
        }
        await UserProfile.findOneAndUpdate({ userId }, lazyUpdate);
        logger.info('palm_features_lazy_extracted', { userId, hand });
      } else {
        logger.warn('palm_features_lazy_extract_no_hand', { userId, hand });
      }
    } catch (err: any) {
      logger.warn('palm_features_lazy_extract_failed', {
        userId,
        hand,
        error: err?.message ?? String(err),
      });
    }
  }

  // Check cache
  const cachedReading = isDominant ? profile.palmReading : profile.palmReadingNonDominant;
  if (cachedReading && !forceRegenerate) {
    logger.info('Returning cached palm reading', { userId, hand });
    return {
      reading: cachedReading,
      cached: true,
      tier: getEffectiveTier(user) === 'free' ? 'free' : 'premium',
      generatedAt: profile.updatedAt
    };
  }

  // Check regenerate permission
  if (forceRegenerate && getEffectiveTier(user) === 'free') {
    throw new AppError(403, 'Premium subscription required to regenerate readings');
  }

  // Generate new reading with defensive defaults for new users
  const tier = getEffectiveTier(user) === 'free' ? 'free' : 'premium';
  const userContext = {
    name: profile.name || user.name || undefined,
    sunSign: profile.sunSign || undefined,
    lifePathNumber: (profile.numerology?.lifePathNumber ?? profile.lifePathNumber) || undefined,
    userId,
  };

  // Default handedness to 'right' if not set (new users may not have set this yet)
  const handedness = profile.handedness || 'right';

  // Build 27 R3 step 5 — drive the reading from the STABLE per-hand trait layer,
  // not the pixels. When this hand has rules-computed traits (populated at upload
  // or by the lazy fallback above), pass the trait scores + closed-set archetype
  // + palmType + talents + life theme as the reading's fixed substance;
  // claude.service then pins them (the image is still sent, but only for major-line
  // FLAVOR — S2 default). The dominant hand persists `palmProfileResult`; the
  // non-dominant hand has none stored, so its profile is RE-MAPPED (not
  // re-detected) from the stored vector via the same pure rules function. When the
  // trait layer is absent (extraction failed / found no hand), substance stays
  // undefined → the legacy image-based Vision call runs so no user loses access.
  const handTraits = isDominant
    ? profile.palmDominantTraits
    : profile.palmNonDominantTraits;
  const handFeatures = isDominant
    ? profile.palmDominantFeatures
    : profile.palmNonDominantFeatures;

  let palmSubstance: PalmReadingSubstance | undefined;
  if (handTraits && handTraits.length > 0) {
    const profileResult =
      (isDominant ? profile.palmProfileResult : undefined) ??
      (handFeatures
        ? mapFeaturesToPalmTraits(handFeatures as unknown as HandFeatureVector).profile
        : undefined);
    if (profileResult) {
      palmSubstance = {
        palmType: profileResult.palmType,
        energyType: profileResult.energyType,
        lifeTheme: profileResult.lifeTheme,
        naturalTalents: profileResult.naturalTalents,
        traits: handTraits.map((t) => ({
          trait: t.trait,
          score: t.score,
          band: t.band,
          description: t.description,
        })),
      };
    }
  }

  logger.info('Generating new palm reading', {
    userId,
    hand,
    tier,
    handedness,
    userContext,
    traitsDriven: !!palmSubstance,
  });

  try {
    const reading = await claudeService.generatePalmReadingWithRetry(
      imageUrl,
      tier,
      isDominant,
      handedness,
      userContext,
      palmSubstance
    );

    // Cache in profile using atomic update (avoids full-document validation/version conflicts)
    const cacheField = isDominant ? 'palmReading' : 'palmReadingNonDominant';
    await UserProfile.findOneAndUpdate(
      { userId },
      { $set: { [cacheField]: reading } }
    );

    // Save to history
    await Reading.create({
      userId,
      type: isDominant ? 'palm-dominant' : 'palm-non-dominant',
      tier,
      content: reading,
      imageUrl,
    });

    logger.info('Palm reading generated and cached', { userId, hand });

    return {
      reading,
      cached: false,
      tier,
      generatedAt: new Date()
    };
  } catch (error: any) {
    logger.error('Palm reading generation failed:', {
      userId,
      hand,
      error: error.message,
      stack: error.stack,
      profileExists: !!profile,
      hasImages: !!profile?.images,
      hasPalmUrl: !!imageUrl,
      hasSunSign: !!profile?.sunSign,
      hasLifePath: !!(profile?.numerology?.lifePathNumber ?? profile?.lifePathNumber),
      handedness
    });
    throw error;
  }
}

/**
 * Get reading history
 */
export async function getReadingHistory(
  userId: string,
  type?: string,
  limit: number = 10
) {
  const query: any = { userId };
  if (type) query.type = type;

  logger.info('Fetching reading history', { userId, type, limit });

  return await Reading.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
