import { User, IUser } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { AppError } from '../middleware/error.middleware';
import { validateName, NameValidationResult } from '../utils/nameValidation';
import { logger } from '../utils/logger';

const HISTORY_CAP = 20;

export interface UpdateNameResult {
  user: IUser;
  validation: NameValidationResult;
}

/**
 * Update the user's display name across User.name and UserProfile.name.
 *
 * Flow:
 *   1. Look up user (rate limit middleware has already verified the count
 *      is under the tier limit; here we just guard against a missing user).
 *   2. Run validateName() — Layer 1 + Layer 2 + Layer 3 (Haiku).
 *   3. If validation fails: throw AppError(400) with the user-facing reason.
 *   4. Save User.name + push to nameUpdateHistory (FIFO-capped at 20).
 *   5. Try to update UserProfile.name. If that update fails, retry once;
 *      on second failure, log critical inconsistency but DO NOT roll back
 *      User.name — better to leave the canonical identity field updated
 *      than to block the user. Future readings will continue to use the
 *      stale UserProfile.name until it self-heals on the next profile
 *      mutation.
 *
 * Returns the updated user document (with sensitive fields stripped by the
 * model's toJSON transform when serialized).
 */
export async function updateUserName(
  userId: string,
  rawNewName: string
): Promise<UpdateNameResult> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const trimmed = rawNewName.trim();
  if (!trimmed) {
    throw new AppError(400, 'Name is required.');
  }

  const previousName = user.name ?? '';

  // No-op when nothing changed (case-sensitive, post-trim). Don't burn an
  // update slot or a Haiku call on a re-submit of the same name.
  if (previousName === trimmed) {
    return {
      user,
      validation: { isValid: true, internalReason: 'no-op same name' },
    };
  }

  const validation = await validateName(trimmed);
  if (!validation.isValid) {
    logger.info('name_update_rejected', {
      userId,
      internalReason: validation.internalReason,
    });
    throw new AppError(400, validation.reason ?? 'Name is not allowed.');
  }

  // Update User.name + audit history (single source of truth for rate limit).
  user.name = trimmed;
  user.nameUpdateHistory = user.nameUpdateHistory ?? [];
  user.nameUpdateHistory.push({
    updatedAt: new Date(),
    previousName,
    newName: trimmed,
  });
  // Keep at most HISTORY_CAP most recent entries.
  if (user.nameUpdateHistory.length > HISTORY_CAP) {
    user.nameUpdateHistory.splice(
      0,
      user.nameUpdateHistory.length - HISTORY_CAP
    );
  }
  await user.save();

  // Sync UserProfile.name. Retry once on transient failure. Don't roll
  // back User.name on permanent failure — see header comment.
  try {
    await UserProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: { name: trimmed } }
    );
  } catch (firstErr: any) {
    logger.warn('name_update_userprofile_first_attempt_failed', {
      userId,
      error: firstErr?.message,
    });
    try {
      await UserProfile.findOneAndUpdate(
        { userId: user._id },
        { $set: { name: trimmed } }
      );
    } catch (secondErr: any) {
      logger.error('name_update_userprofile_inconsistent', {
        userId,
        error: secondErr?.message,
        message:
          'User.name updated but UserProfile.name failed twice. The two will be inconsistent until UserProfile is updated by another flow.',
      });
      // Intentionally swallow — User.name is the canonical identity.
    }
  }

  logger.info('name_update_applied', {
    userId,
    previousName,
    newName: trimmed,
    historyLength: user.nameUpdateHistory.length,
  });

  return { user, validation };
}
