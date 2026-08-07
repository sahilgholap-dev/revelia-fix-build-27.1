/**
 * One-time migration: align Daily Insight timezone to birthplace
 * timezone for existing users.
 *
 * Why this exists:
 *   Build 22 UAT identified Daily Insight notification timezone hardcoded
 *   to America/New_York for every user (User.preferences.timezone schema
 *   default), with no UI to change. Build 21 backfill populated
 *   UserProfile.birthData.location.timezone via geocoder. This script
 *   joins the two: for users still on the NY default whose UserProfile
 *   has a birthplace timezone, copy the birthplace tz to
 *   User.preferences.timezone.
 *
 * Usage:
 *   npm run backfill:daily-insight-tz:dry   # preview
 *   npm run backfill:daily-insight-tz       # apply
 *
 * Idempotent: skips users who already have a non-NY timezone (treated as
 * "user customized"). Skips users without a birthplace timezone yet.
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { UserProfile } from '../models/UserProfile';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`Connected to MongoDB. Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);

  // Pull users with the legacy NY default. Anyone with a different stored
  // value is treated as "customized" and skipped.
  const candidates = await User.find({
    $or: [
      { 'preferences.timezone': 'America/New_York' },
      { 'preferences.timezone': { $exists: false } },
    ],
  }).select('_id preferences.timezone');

  console.log(`Found ${candidates.length} candidate users to evaluate`);

  let updated = 0;
  let skippedNoBirthTz = 0;
  let skippedSameTz = 0;

  for (const user of candidates) {
    const profile = await UserProfile.findOne({ userId: user._id }).select(
      'birthData.location.timezone'
    );
    const birthTz = profile?.birthData?.location?.timezone;

    if (!birthTz) {
      skippedNoBirthTz++;
      continue;
    }

    if (birthTz === user.preferences?.timezone) {
      skippedSameTz++;
      continue;
    }

    if (isDryRun) {
      console.log(
        `  [dry-run] user=${user._id} ${user.preferences?.timezone || '[unset]'} → ${birthTz}`
      );
    } else {
      await User.findByIdAndUpdate(user._id, {
        $set: { 'preferences.timezone': birthTz },
      });
      console.log(
        `  [updated] user=${user._id} ${user.preferences?.timezone || '[unset]'} → ${birthTz}`
      );
    }
    updated++;
  }

  console.log('');
  console.log('===== Backfill Summary =====');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no birthplace tz): ${skippedNoBirthTz}`);
  console.log(`Skipped (already matched): ${skippedSameTz}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
