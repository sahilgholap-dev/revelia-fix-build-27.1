import { User } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { Compatibility, ICompatibility } from '../models/Compatibility';
import * as claudeService from './claude.service';
import { getSunSign } from '../utils/zodiac';
import { getLifePathNumber } from '../utils/numerology';
import { AppError } from '../middleware/error.middleware';
import { getEffectiveTier } from '../utils/subscriptionTier';
import { logger } from '../utils/logger';
import {
  UserCompatibilityProfile,
  PartnerCompatibilityProfile,
  RelationshipType,
  FaceTrait,
  PalmTrait,
} from '../types/shared';
import {
  computeTransits,
  describeNatalAspects,
  describeTransits,
} from './astrology.service';

/**
 * Build user compatibility profile from stored data
 */
async function buildUserCompatibilityProfile(
  userId: string
): Promise<UserCompatibilityProfile> {
  const profile = await UserProfile.findOne({ userId });
  if (!profile) {
    throw new AppError(404, 'Profile not found');
  }

  const faceReading = profile.faceReading as any;
  const palmReading = profile.palmReading as any;

  // Extract communication and emotional indicators from readings
  const communicationStyle =
    faceReading?.categories?.communication?.description ||
    faceReading?.categories?.communication?.title ||
    'Direct and clear';

  const emotionalNature =
    faceReading?.categories?.emotional?.description ||
    palmReading?.lines?.heart?.interpretation ||
    'Balanced emotional nature';

  // Build 27 R5 §9 step 2 — derive the four feature sets for the app-user (user1)
  // side, MIRRORING buildUserInsightProfile() in insight.service.ts (same
  // astrology.service helpers, same numerology sub-doc, same "<trait>: <band>"
  // mapping from the stable trait layers). All OPTIONAL + guarded so a
  // sunSign-only user still builds. No lazy natal/numerology backfill here — the
  // data is read as-is (omitted gracefully when absent); insight.service owns the
  // backfill. This is DATA→COPY only; the CompatibilityOutput shape is unchanged.

  // R1 — real Swiss Ephemeris chart + live transits (omit entirely if no chart).
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
      logger.warn('compat_transit_compute_failed', {
        userId,
        error: err?.message ?? String(err),
      });
    }
  }

  // R2 / R3 — compact stable trait bands ("<trait>: <band>") from the
  // deterministic layers (undefined when absent, exactly as insight.service).
  const faceTraitsStable = (profile.faceTraits as FaceTrait[] | undefined) ?? [];
  const palmDominantTraits =
    (profile.palmDominantTraits as PalmTrait[] | undefined) ?? [];
  const faceTraits = faceTraitsStable.length
    ? faceTraitsStable.map((t) => `${t.trait}: ${t.band}`)
    : undefined;
  const palmTraits = palmDominantTraits.length
    ? palmDominantTraits.map((t) => `${t.trait}: ${t.band}`)
    : undefined;

  return {
    name: profile.name,
    sunSign: profile.sunSign,
    // Build 27 R4 §9 step 4 — sub-doc first, legacy flat fallback for un-backfilled users.
    lifePathNumber: profile.numerology?.lifePathNumber ?? profile.lifePathNumber,
    faceArchetype: faceReading?.archetype?.name || 'The Seeker',
    faceArchetypeTagline:
      faceReading?.archetype?.tagline || 'On a journey of discovery',
    strengths: faceReading?.strengths || [],
    communicationStyle,
    emotionalNature,
    palmType: palmReading?.palmType?.name || 'Earth Hand',
    // Build 27 R5 §9 step 2 — R1/R2/R3/R4 signals (all guarded above).
    moonSign,
    risingSign,
    activeAspects,
    keyTransits,
    faceTraits,
    palmTraits,
    expressionNumber: profile.numerology?.expressionNumber,
    soulUrgeNumber: profile.numerology?.soulUrgeNumber,
    personalityNumber: profile.numerology?.personalityNumber,
  };
}

/**
 * Build partner profile
 */
function buildPartnerProfile(
  partnerName: string,
  partnerImageUrl: string,
  partnerBirthDate?: string,
  partnerBirthTime?: string,
  partnerBirthPlace?: string
): PartnerCompatibilityProfile {
  const profile: PartnerCompatibilityProfile = {
    name: partnerName,
    imageUrl: partnerImageUrl,
  };

  if (partnerBirthDate) {
    const birthDate = new Date(partnerBirthDate);
    profile.birthData = { date: partnerBirthDate };
    profile.sunSign = getSunSign(birthDate);
    profile.lifePathNumber = getLifePathNumber(birthDate);
  }

  if (partnerBirthTime) {
    profile.birthTime = partnerBirthTime;
  }

  if (partnerBirthPlace) {
    profile.birthPlace = partnerBirthPlace;
  }

  return profile;
}

/**
 * Check if user can generate compatibility reading
 */
async function checkCompatibilityAccess(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remainingFree?: number;
}> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Premium/Premium Plus: unlimited
  if (getEffectiveTier(user) !== 'free') {
    return { allowed: true };
  }

  // Free: 1 trial reading
  const existingCount = await Compatibility.countDocuments({ userId });
  if (existingCount >= 1) {
    return {
      allowed: false,
      reason: 'Free users get 1 compatibility reading. Upgrade for unlimited.',
    };
  }

  return { allowed: true, remainingFree: 1 - existingCount };
}

/**
 * Generate compatibility reading
 */
export async function generateCompatibility(
  userId: string,
  partnerData: {
    name: string;
    imageUrl: string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    relationshipType: RelationshipType;
    relationshipSubType?: string;
  }
): Promise<ICompatibility> {
  logger.info('Generating compatibility reading', {
    userId,
    partnerName: partnerData.name,
    hasBirthDate: !!partnerData.birthDate,
    hasBirthTime: !!partnerData.birthTime,
  });

  // 1. Check access
  const access = await checkCompatibilityAccess(userId);
  if (!access.allowed) {
    throw new AppError(403, access.reason || 'Access denied');
  }

  // 2. Get user
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // 3. Build user profile
  const userProfile = await buildUserCompatibilityProfile(userId);

  // 4. Build partner profile
  const partnerProfile = buildPartnerProfile(
    partnerData.name,
    partnerData.imageUrl,
    partnerData.birthDate,
    partnerData.birthTime,
    partnerData.birthPlace
  );

  // 5. Determine tier
  const tier = getEffectiveTier(user) === 'free' ? 'free' : 'premium';

  // 6. Generate reading with Claude
  const reading = await claudeService.generateCompatibilityReadingWithRetry(
    userProfile,
    partnerProfile,
    tier,
    partnerData.relationshipType,
    partnerData.relationshipSubType
  );

  // 7. Save to database
  const compatibility = await Compatibility.create({
    userId,
    partnerName: partnerData.name,
    partnerImageUrl: partnerData.imageUrl,
    partnerBirthData: partnerData.birthDate
      ? {
          date: new Date(partnerData.birthDate),
          sunSign: partnerProfile.sunSign,
          lifePathNumber: partnerProfile.lifePathNumber,
        }
      : undefined,
    partnerBirthTime: partnerData.birthTime || undefined,
    partnerBirthPlace: partnerData.birthPlace || undefined,
    relationshipType: partnerData.relationshipType,
    relationshipSubType: partnerData.relationshipSubType || undefined,
    reading,
    tier,
  });

  logger.info('Compatibility reading generated', {
    compatibilityId: compatibility._id.toString(),
    tier,
  });

  return compatibility;
}

/**
 * Get all compatibility readings for user
 */
export async function getCompatibilityReadings(userId: string) {
  return await Compatibility.find({ userId }).sort({ createdAt: -1 }).lean();
}

/**
 * Get specific compatibility reading
 */
export async function getCompatibilityById(
  userId: string,
  compatibilityId: string
) {
  const compatibility = await Compatibility.findOne({
    _id: compatibilityId,
    userId, // Ensure user owns this reading
  });

  if (!compatibility) {
    throw new AppError(404, 'Compatibility reading not found');
  }

  return compatibility;
}

/**
 * Delete compatibility reading
 */
export async function deleteCompatibility(
  userId: string,
  compatibilityId: string
) {
  const result = await Compatibility.deleteOne({
    _id: compatibilityId,
    userId,
  });

  if (result.deletedCount === 0) {
    throw new AppError(404, 'Compatibility reading not found');
  }
}
