import { UserProfile, IUserProfile } from '../models/UserProfile';
import { User } from '../models/User';
import { InsightCache } from '../models/InsightCache';
import { Types } from 'mongoose';
import { getSunSign, getSunSignTraits } from '../utils/zodiac';
import {
  getLifePathNumber,
  getPersonalYear,
  getPersonalMonth,
  getLifePathMeaning,
  getPersonalYearMeaning,
  getPersonalMonthMeaning,
  NUMEROLOGY_VERSION,
} from '../utils/numerology';
import { computeNameNumbers } from '../utils/nameNumerology';
import {
  UserProfile as UserProfileType,
  AstrologyProfile,
  NumerologyProfile,
  CalculatedProfile,
} from '../types/shared';
import { AppError } from '../middleware/error.middleware';
import { geocodeBirthPlace, GeocodeResult } from './geocoder.service';
import { computeNatalChart } from './astrology.service';
import { logger } from '../utils/logger';

/**
 * Compute the Swiss Ephemeris natal chart from geocoded+noon-defaulted birth
 * data. Never throws — a chart-compute failure must not block the birth-data
 * save (the lazy fallback in insight.service will retry at reading time).
 */
function buildNatalChart(
  birthDate: Date,
  enriched: {
    location?: { lat?: number | null; lng?: number | null; timezone?: string | null };
    time?: string;
    timeIsAssumed: boolean;
  }
) {
  try {
    return computeNatalChart({
      date: birthDate,
      time: enriched.time ?? null,
      timezone: enriched.location?.timezone ?? null,
      lat: enriched.location?.lat ?? null,
      lng: enriched.location?.lng ?? null,
      timeIsAssumed: enriched.timeIsAssumed,
    });
  } catch (err: any) {
    logger.warn('natal_chart_compute_failed', { error: err?.message ?? String(err) });
    return undefined;
  }
}

/**
 * Birth data input for creating/updating profile
 *
 * lat/lng/timezone are optional — server geocoder will populate them from
 * city/country text and overwrite anything mobile sent (legacy 0/0
 * placeholders are ignored once geocoder runs).
 */
interface BirthDataInput {
  birthDate: string; // ISO date string "1990-05-15"
  birthTime?: string; // "HH:mm" format
  birthLocation?: {
    city: string;
    country: string;
    lat?: number | null;
    lng?: number | null;
    timezone?: string | null;
  };
  handedness: 'right' | 'left';
}

/**
 * Run geocoder and apply the noon-default flow:
 *   - Resolved + no birth time → time defaults to "12:00", timeIsAssumed=true
 *   - Resolved + explicit birth time → time preserved, timeIsAssumed=false
 *   - Unresolvable → location text saved without coords, no noon-default,
 *     timeIsAssumed=false (existing lock-card UX holds)
 *
 * Never throws. Geocoder failures degrade silently — submission proceeds
 * without coords.
 */
async function applyGeocodeAndNoonDefault(
  birthLocation: BirthDataInput['birthLocation'] | undefined,
  birthTime: string | undefined
): Promise<{
  location: NonNullable<BirthDataInput['birthLocation']> | undefined;
  time: string | undefined;
  timeIsAssumed: boolean;
}> {
  const explicitTime = !!(birthTime && birthTime.trim());

  if (!birthLocation || (!birthLocation.city && !birthLocation.country)) {
    return {
      location: birthLocation,
      time: birthTime,
      timeIsAssumed: false,
    };
  }

  const placeText = [birthLocation.city, birthLocation.country]
    .filter(Boolean)
    .join(', ');

  let geocoded: GeocodeResult | null = null;
  try {
    geocoded = await geocodeBirthPlace(placeText);
  } catch (err: any) {
    logger.warn('profile_geocode_failed_open', {
      placeText,
      error: err?.message ?? String(err),
    });
    geocoded = null;
  }

  if (!geocoded) {
    return {
      location: birthLocation,
      time: birthTime,
      timeIsAssumed: false,
    };
  }

  const enrichedLocation = {
    ...birthLocation,
    lat: geocoded.lat,
    lng: geocoded.lng,
    timezone: geocoded.timezone,
  };

  if (!explicitTime) {
    return {
      location: enrichedLocation,
      time: '12:00',
      timeIsAssumed: true,
    };
  }

  return {
    location: enrichedLocation,
    time: birthTime,
    timeIsAssumed: false,
  };
}

/**
 * If geocoder resolved a birthplace timezone AND the user is still on the
 * legacy 'America/New_York' default (i.e., never customized), update
 * User.preferences.timezone to the birthplace value. Build 22 UAT showed
 * Daily Insight notifications hardcoded NY for every user — this fix
 * ensures new users get their birthplace tz on first birth-data submit.
 *
 * Never overwrites a user-customized tz. Defensive: failures swallow
 * silently (this is a side-effect to a primary mutation; we don't want a
 * tz-update error to roll back the birth-data save).
 */
async function maybeAlignDailyInsightTz(
  userId: string,
  geocodedTimezone: string | undefined | null
) {
  if (!geocodedTimezone) return;
  try {
    const user = await User.findById(userId).select('preferences.timezone');
    if (!user) return;
    const current = user.preferences?.timezone;
    if (!current || current === 'America/New_York') {
      await User.findByIdAndUpdate(userId, {
        $set: { 'preferences.timezone': geocodedTimezone },
      });
      logger.info('daily_insight_tz_aligned', {
        userId,
        from: current ?? '[unset]',
        to: geocodedTimezone,
      });
    }
  } catch (err: any) {
    logger.warn('daily_insight_tz_align_failed', {
      userId,
      error: err?.message,
    });
  }
}

/**
 * Profile creation data
 */
interface CreateProfileData {
  name: string;
  birthData: BirthDataInput;
  handedness: 'right' | 'left';
}

/**
 * Profile service class
 */
class ProfileService {
  /**
   * Build 27 R4 hook 3 (name-based FALLBACK source): populate the
   * profile.numerology name-based trio from the display name. The one-way
   * provenance hierarchy is enforced here — a `profile_name` source may
   * overwrite an existing `profile_name` set (display name changed →
   * recompute) but NEVER a `name_destiny` set (the user's declared full birth
   * name always wins). Skips empty/whitespace-only names.
   *
   * lifePath is required by the sub-schema but a name save can hit a profile
   * without birth data. Source it from the existing sub-doc → legacy flat →
   * birthData.date; if none is available (no birth data at all) SKIP the
   * persist with a warn rather than write a partial doc that fails validation —
   * the trio self-heals via the step-5 backfill / step-4 lazy fallback once
   * birth data exists.
   *
   * Mutates profile.numerology in place; the caller saves. See
   * plans/build-27/R4-numerology-consolidation.md §6 hook 3 + §11 #5.
   */
  private applyProfileNameNumerology(profile: IUserProfile): void {
    const name = (profile.name || '').trim();
    if (!name) return;

    // One-way hierarchy: never downgrade a birth-name source.
    if (profile.numerology?.nameSource === 'name_destiny') return;

    const lifePath =
      profile.numerology?.lifePathNumber ??
      profile.lifePathNumber ??
      (profile.birthData?.date ? getLifePathNumber(profile.birthData.date) : undefined);

    if (lifePath === undefined || lifePath === null) {
      logger.warn('numerology_profile_name_persist_skipped_no_lifepath', {
        userId: profile.userId?.toString(),
      });
      return;
    }

    const { expressionNumber, soulUrgeNumber, personalityNumber } = computeNameNumbers(name);

    profile.numerology = {
      lifePathNumber: lifePath,
      expressionNumber,
      soulUrgeNumber,
      personalityNumber,
      nameUsed: name,
      nameSource: 'profile_name',
      numerologyVersion: NUMEROLOGY_VERSION,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Create profile with birth data
   */
  async createProfile(
    userId: string,
    data: CreateProfileData
  ): Promise<UserProfileType> {
    // Check if profile already exists
    const existing = await UserProfile.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (existing) {
      throw new AppError(400, 'Profile already exists for this user');
    }

    // Parse birth date
    const birthDate = new Date(data.birthData.birthDate);

    if (isNaN(birthDate.getTime())) {
      throw new AppError(400, 'Invalid birth date format');
    }

    // Geocode + noon-default. Honest degradation if geocoder fails.
    const enriched = await applyGeocodeAndNoonDefault(
      data.birthData.birthLocation,
      data.birthData.birthTime
    );

    // Create profile
    const profile = new UserProfile({
      userId: new Types.ObjectId(userId),
      name: data.name,
      birthData: {
        date: birthDate,
        time: enriched.time,
        location: enriched.location,
        timeIsAssumed: enriched.timeIsAssumed,
      },
      handedness: data.handedness,
      images: {},
    });

    // Compute the Swiss Ephemeris natal chart from geocoded birth data.
    profile.natalChart = buildNatalChart(birthDate, enriched);

    // Build 27 R4 hook 3: seed the name-based numerology trio from the initial
    // display name (guarded — never overwrites a name_destiny source, which a
    // brand-new profile never has). Set BEFORE save so the pre-save hook's
    // merge (hook 1) preserves the trio while it stamps lifePath/version.
    this.applyProfileNameNumerology(profile);

    // Calculate astrology and numerology (done in pre-save hook)
    await profile.save();

    // Align Daily Insight tz to birthplace tz on first birth-data set.
    await maybeAlignDailyInsightTz(userId, enriched.location?.timezone);

    return profile.toJSON() as unknown as UserProfileType;
  }

  /**
   * Get profile by user ID
   */
  async getProfile(userId: string): Promise<UserProfileType | null> {
    const profile = await UserProfile.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!profile) {
      return null;
    }

    return profile.toJSON() as unknown as UserProfileType;
  }

  /**
   * Update profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<{
      name: string;
      handedness: 'right' | 'left';
    }>
  ): Promise<UserProfileType> {
    const profile = await UserProfile.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    // Update fields
    if (updates.name !== undefined) {
      profile.name = updates.name;
      // Build 27 R4 hook 3: recompute name-based numerology from the new
      // display name. Guarded at the SERVICE layer on `updates.name !==
      // undefined` (§11 #5 — keep the model hook simple); the helper enforces
      // the one-way hierarchy and skips empty names. A name-only save does NOT
      // fire the model's date-gated numerology recompute, so we set the sub-doc
      // here and the following save persists it.
      this.applyProfileNameNumerology(profile);
    }
    if (updates.handedness !== undefined) {
      profile.handedness = updates.handedness;
    }

    await profile.save();

    return profile.toJSON() as unknown as UserProfileType;
  }

  /**
   * Set/update birth data (triggers recalculation)
   */
  async setBirthData(
    userId: string,
    birthData: BirthDataInput
  ): Promise<{
    profile: UserProfileType;
    calculated: CalculatedProfile;
  }> {
    // Parse birth date
    const birthDate = new Date(birthData.birthDate);

    if (isNaN(birthDate.getTime())) {
      throw new AppError(400, 'Invalid birth date format');
    }

    // Find or create profile
    let profile = await UserProfile.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!profile) {
      // Auto-create profile if it doesn't exist (handles edge cases)
      profile = new UserProfile({
        userId: new Types.ObjectId(userId),
        name: '',
        images: {},
      });
    }

    // Geocode + noon-default. Honest degradation if geocoder fails.
    const enriched = await applyGeocodeAndNoonDefault(
      birthData.birthLocation,
      birthData.birthTime
    );

    // Update birth data
    profile.birthData = {
      date: birthDate,
      time: enriched.time,
      location: enriched.location as any,
      timeIsAssumed: enriched.timeIsAssumed,
    };

    // Update handedness if provided
    if (birthData.handedness) {
      profile.handedness = birthData.handedness;
    }

    // Recompute the Swiss Ephemeris natal chart from the new birth data.
    profile.natalChart = buildNatalChart(birthDate, enriched);

    // Save (triggers recalculation in pre-save hook)
    await profile.save();

    // Align Daily Insight tz to birthplace tz when geocoder resolved one
    // and user hasn't customized away from the legacy NY default.
    await maybeAlignDailyInsightTz(userId, enriched.location?.timezone);

    // Invalidate cached insights — birth data change means sun sign may have changed
    await InsightCache.deleteMany({ userId: new Types.ObjectId(userId) });

    // Get calculated data with meanings
    const sunSign = getSunSign(birthDate);
    const sunSignTraits = getSunSignTraits(sunSign);
    const lifePathNumber = getLifePathNumber(birthDate);
    const lifePathMeaning = getLifePathMeaning(lifePathNumber);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const personalYear = getPersonalYear(birthDate, currentYear);
    const personalYearMeaning = getPersonalYearMeaning(personalYear);
    const personalMonth = getPersonalMonth(personalYear, currentMonth);
    const personalMonthMeaning = getPersonalMonthMeaning(personalMonth);

    return {
      profile: profile.toJSON() as unknown as UserProfileType,
      calculated: {
        sunSign,
        sunSignTraits,
        lifePathNumber,
        lifePathMeaning,
        personalYear,
        personalYearMeaning,
        personalMonth,
        personalMonthMeaning,
      },
    };
  }

  /**
   * Get astrology profile
   */
  async getAstrology(userId: string): Promise<AstrologyProfile> {
    const profile = await UserProfile.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    if (!profile.birthData?.date) {
      throw new AppError(400, 'Birth data not set. Please set your birth date first.');
    }

    const sunSign = getSunSign(profile.birthData.date);
    const sunSignTraits = getSunSignTraits(sunSign);

    return {
      sunSign,
      sunSignTraits,
    };
  }

  /**
   * Get numerology profile
   */
  async getNumerology(userId: string): Promise<NumerologyProfile> {
    const profile = await UserProfile.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    if (!profile.birthData?.date) {
      throw new AppError(400, 'Birth data not set. Please set your birth date first.');
    }

    const lifePathNumber = getLifePathNumber(profile.birthData.date);
    const lifePathMeaning = getLifePathMeaning(lifePathNumber);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const personalYear = getPersonalYear(profile.birthData.date, currentYear);
    const personalYearMeaning = getPersonalYearMeaning(personalYear);
    const personalMonth = getPersonalMonth(personalYear, currentMonth);
    const personalMonthMeaning = getPersonalMonthMeaning(personalMonth);

    return {
      lifePathNumber,
      lifePathMeaning,
      personalYear,
      personalYearMeaning,
      personalMonth,
      personalMonthMeaning,
    };
  }

  /**
   * Delete profile (GDPR)
   */
  async deleteProfile(userId: string): Promise<void> {
    const result = await UserProfile.deleteOne({
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new AppError(404, 'Profile not found');
    }
  }
}

export const profileService = new ProfileService();
