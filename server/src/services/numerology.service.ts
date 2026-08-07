/**
 * Build 27 R4 §9 step 5 — the ONE shared home for numerology sub-doc
 * consolidation logic used by BOTH gap-closers for existing users:
 *
 *   1. the backfill script (`scripts/backfill-numerology.ts`) — calls the pure
 *      `planNumerologyUpdate` decision function directly, then writes.
 *   2. the read-time lazy fallback (`ensureProfileNumerology`) — insight path
 *      (`buildUserInsightProfile`, full doc) + career path
 *      (`generateCareerDestiny`, lean doc). Mirrors R1's natal lazy backfill.
 *
 * ONE definition, no copy-paste divergence: both paths honor the SAME provenance
 * hierarchy (`name_destiny` beats `profile_name`, never downgraded), the SAME
 * lifePath resolution (birthData.date → legacy flat → existing sub-doc), and the
 * SAME `NUMEROLOGY_VERSION` stamp + idempotency/upgrade rules as the step-3 write
 * hooks. Personal Year/Month are NOT stored here (time-varying — computed fresh
 * at read time). See plans/build-27/R4-numerology-consolidation.md §6 + §8.
 */

import { UserProfile } from '../models/UserProfile';
import { NameAnalysis } from '../models/NameAnalysis';
import { getLifePathNumber, NUMEROLOGY_VERSION } from '../utils/numerology';
import { computeNameNumbers } from '../utils/nameNumerology';
import { NumerologyNumbers } from '../types/shared';
import { logger } from '../utils/logger';

/** The most-recent NameAnalysis fields the plan needs (sorted generatedAt desc). */
export interface LatestNameAnalysis {
  fullName: string;
  expressionNumber?: number;
  soulUrgeNumber?: number;
  personalityNumber?: number;
}

export type NumerologyAction = 'create' | 'upgrade' | 'fill' | 'skip';

export interface NumerologyPlan {
  action: NumerologyAction;
  /** Human-readable reason for the log line. */
  reason: string;
  /** Persist this ONLY when `shouldWrite` is true (skip → do not write). */
  shouldWrite: boolean;
  /**
   * The value to use IN-MEMORY this request (and to persist when shouldWrite):
   *   - create/upgrade/fill → the freshly-computed desired sub-doc
   *   - skip (current version) → the existing sub-doc (nothing to do)
   *   - skip (no birth data) → undefined (no lifePath → never a schema-valid doc)
   */
  numerology?: NumerologyNumbers;
}

interface PlanInputs {
  birthDate?: Date | null;
  legacyLifePath?: number | null;
  existing?: NumerologyNumbers | null;
  profileName?: string | null;
  latestAnalysis?: LatestNameAnalysis | null;
  /** ISO timestamp to stamp — passed in so callers control it (testable). */
  computedAt: string;
  /** For discrepancy logging only. */
  userId?: string;
}

/** Resolved name-based fields + provenance (undefined when no name source). */
interface NameBlock {
  expressionNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;
  nameUsed: string;
  nameSource: NumerologyNumbers['nameSource'];
}

/**
 * Resolve the canonical name-based trio + provenance, honoring the one-way
 * hierarchy: latest `NameAnalysis` (`name_destiny`) beats `profile.name`
 * (`profile_name`), and an existing `name_destiny` trio is NEVER downgraded to
 * `profile_name` when no analysis is currently present. Returns undefined when
 * no usable name source exists at all (lifePath-only sub-doc is valid).
 */
function resolveNameBlock(
  existing: NumerologyNumbers | null | undefined,
  latestAnalysis: LatestNameAnalysis | null | undefined,
  profileName: string | null | undefined,
  userId?: string
): NameBlock | undefined {
  const analysisName = latestAnalysis?.fullName?.trim();
  if (latestAnalysis && analysisName) {
    // Recompute via the ONE helper rather than copying the doc's stored numbers
    // (same values by construction; the helper is the single definition). Log if
    // they ever disagree with the stored doc.
    const trio = computeNameNumbers(latestAnalysis.fullName);
    const storedMismatch =
      (latestAnalysis.expressionNumber != null &&
        trio.expressionNumber !== latestAnalysis.expressionNumber) ||
      (latestAnalysis.soulUrgeNumber != null &&
        trio.soulUrgeNumber !== latestAnalysis.soulUrgeNumber) ||
      (latestAnalysis.personalityNumber != null &&
        trio.personalityNumber !== latestAnalysis.personalityNumber);
    if (storedMismatch) {
      logger.warn('numerology_name_analysis_recompute_mismatch', {
        userId,
        recomputed: trio,
        stored: {
          expressionNumber: latestAnalysis.expressionNumber,
          soulUrgeNumber: latestAnalysis.soulUrgeNumber,
          personalityNumber: latestAnalysis.personalityNumber,
        },
      });
    }
    return { ...trio, nameUsed: latestAnalysis.fullName, nameSource: 'name_destiny' };
  }

  // No analysis present now — never downgrade an existing birth-name trio.
  if (existing?.nameSource === 'name_destiny' && existing.expressionNumber != null) {
    return {
      expressionNumber: existing.expressionNumber,
      soulUrgeNumber: existing.soulUrgeNumber!,
      personalityNumber: existing.personalityNumber!,
      nameUsed: existing.nameUsed ?? '',
      nameSource: 'name_destiny',
    };
  }

  const trimmed = (profileName || '').trim();
  if (trimmed) {
    const trio = computeNameNumbers(trimmed);
    return { ...trio, nameUsed: trimmed, nameSource: 'profile_name' };
  }

  return undefined;
}

/**
 * Pure decision function — the single source of truth for "what should this
 * profile's numerology sub-doc be, and do we write it?". Shared by the backfill
 * script and the lazy fallback so they can never drift.
 *
 * Idempotent + UPGRADE-aware (plan §8 verbatim): a current-version sub-doc is
 * SKIPPED, EXCEPT (a) upgrade a `profile_name` trio when a `NameAnalysis` now
 * exists, and (b) fill a missing trio when a name source is now available. Never
 * downgrade `name_destiny` → `profile_name`. No lifePath computable (no birth
 * data at all) → SKIP with no write (never a schema-invalid doc — the step-3
 * ruling).
 */
export function planNumerologyUpdate(inputs: PlanInputs): NumerologyPlan {
  const { birthDate, legacyLifePath, existing, profileName, latestAnalysis, computedAt, userId } =
    inputs;

  const lifePathFromDate = birthDate ? getLifePathNumber(birthDate) : undefined;
  if (
    lifePathFromDate !== undefined &&
    legacyLifePath != null &&
    lifePathFromDate !== legacyLifePath
  ) {
    logger.warn('numerology_lifepath_discrepancy', {
      userId,
      fromDate: lifePathFromDate,
      legacyFlat: legacyLifePath,
    });
  }
  const lifePath = lifePathFromDate ?? legacyLifePath ?? existing?.lifePathNumber ?? undefined;

  // No lifePath from any source → no birth data at all → never write a sub-doc
  // (schema requires lifePathNumber; the step-3 no-birth-data ruling applies).
  if (lifePath === undefined || lifePath === null) {
    return { action: 'skip', reason: 'no birth data (no lifePath computable)', shouldWrite: false };
  }

  const nameBlock = resolveNameBlock(existing, latestAnalysis, profileName, userId);

  const desired: NumerologyNumbers = {
    lifePathNumber: lifePath,
    expressionNumber: nameBlock?.expressionNumber,
    soulUrgeNumber: nameBlock?.soulUrgeNumber,
    personalityNumber: nameBlock?.personalityNumber,
    nameUsed: nameBlock?.nameUsed,
    nameSource: nameBlock?.nameSource,
    numerologyVersion: NUMEROLOGY_VERSION,
    computedAt,
  };

  if (!existing) {
    return { action: 'create', reason: 'no existing sub-doc', shouldWrite: true, numerology: desired };
  }

  if (existing.numerologyVersion !== NUMEROLOGY_VERSION) {
    return {
      action: 'create',
      reason: `version bump (${existing.numerologyVersion} → ${NUMEROLOGY_VERSION})`,
      shouldWrite: true,
      numerology: desired,
    };
  }

  // Current version — idempotent SKIP, with the two upgrade/fill exceptions.
  const existingHasTrio = existing.expressionNumber != null;
  const desiredHasTrio = nameBlock !== undefined;

  if (!existingHasTrio && desiredHasTrio) {
    return {
      action: 'fill',
      reason: `fill missing trio (${nameBlock!.nameSource})`,
      shouldWrite: true,
      numerology: desired,
    };
  }

  if (existing.nameSource === 'profile_name' && nameBlock?.nameSource === 'name_destiny') {
    return {
      action: 'upgrade',
      reason: 'upgrade profile_name → name_destiny',
      shouldWrite: true,
      numerology: desired,
    };
  }

  return {
    action: 'skip',
    reason: 'current version, no upgrade/fill needed',
    shouldWrite: false,
    numerology: existing,
  };
}

/** Minimal profile shape the lazy fallback needs (full mongoose doc OR lean). */
interface EnsureProfileShape {
  userId: unknown;
  birthData?: { date?: Date | string | null } | null;
  lifePathNumber?: number | null;
  numerology?: NumerologyNumbers | null;
  name?: string | null;
  save?: () => Promise<unknown>;
}

/**
 * Read-time lazy fallback (plan §8). If `profile.numerology` is missing or
 * version-stale, build it from the same inputs as the backfill (lifePath from
 * birthData.date / legacy flat; trio from latest NameAnalysis else profile.name,
 * hierarchy respected) and persist BEST-EFFORT. A persist failure must NEVER
 * block the reading — the returned in-memory value is still used this request.
 *
 *   - `lean: false` (insight path — full mongoose doc): mutate + `profile.save()`.
 *   - `lean: true`  (career path — `.lean()` object): persist via `updateOne`.
 *
 * Returns the effective `NumerologyNumbers` to use for THIS request (undefined
 * when there is no birth data to compute a lifePath from). Callers on the lean
 * path MUST use the return value — the lean copy is not mutated by `updateOne`.
 */
export async function ensureProfileNumerology(
  profile: EnsureProfileShape,
  opts: { lean: boolean }
): Promise<NumerologyNumbers | undefined> {
  const userId = (profile.userId as any)?.toString?.() ?? String(profile.userId);

  let plan: NumerologyPlan;
  try {
    const latestAnalysis = await NameAnalysis.findOne({ userId })
      .sort({ generatedAt: -1 })
      .select('fullName expressionNumber soulUrgeNumber personalityNumber')
      .lean<LatestNameAnalysis | null>();

    plan = planNumerologyUpdate({
      birthDate: profile.birthData?.date ? new Date(profile.birthData.date) : undefined,
      legacyLifePath: profile.lifePathNumber,
      existing: profile.numerology ?? undefined,
      profileName: profile.name,
      latestAnalysis: latestAnalysis ?? null,
      computedAt: new Date().toISOString(),
      userId,
    });
  } catch (err: any) {
    // Could not even compute the plan (e.g. NameAnalysis query failed) — fall
    // back to whatever is already on the profile. Never block the reading.
    logger.warn('numerology_lazy_ensure_failed', {
      userId,
      error: err?.message ?? String(err),
    });
    return profile.numerology ?? undefined;
  }

  if (plan.shouldWrite && plan.numerology) {
    try {
      if (opts.lean) {
        await UserProfile.updateOne({ userId }, { $set: { numerology: plan.numerology } });
      } else {
        profile.numerology = plan.numerology;
        await profile.save?.();
      }
    } catch (persistErr: any) {
      // Persist failed — the in-memory value below is still used this request.
      logger.warn('numerology_lazy_persist_failed', {
        userId,
        action: plan.action,
        error: persistErr?.message ?? String(persistErr),
      });
    }
  }

  return plan.numerology;
}
