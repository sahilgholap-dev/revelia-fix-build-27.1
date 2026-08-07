/**
 * One-time migration: backfill the Swiss Ephemeris natal chart for existing
 * UserProfile documents.
 *
 * Why this exists:
 *   Build 27 R1 added server-side natal-chart computation on the birth-data
 *   save path (profile.service) plus a lazy fallback at reading time. Accounts
 *   created before R1 have birthData (often with lat/lng/timezone from the
 *   build-22 geocode backfill) but no structured `natalChart`. This script
 *   computes and persists `natalChart` for every profile that has a birth date
 *   but no chart yet, so users get the real chart without waiting for the lazy
 *   path to fire.
 *
 * Usage:
 *   npm run backfill:natal-chart:dry   # preview: no writes, prints actions
 *   npm run backfill:natal-chart       # apply: writes natalChart to UserProfile
 *
 * Idempotent: profiles that already have a `natalChart` are skipped on re-runs
 * (pass --force to recompute all). Profiles with no birth date are skipped.
 *
 * Pure compute (no network/API) — Moshier mode needs no ephemeris files and no
 * external calls, so this runs fast with no rate limiting.
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import { env } from '../config/env';
import { UserProfile } from '../models/UserProfile';
import { computeNatalChartFromBirthData } from '../services/astrology.service';

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

async function main() {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(
    `Connected to MongoDB. Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}${
      isForce ? ' (FORCE recompute)' : ''
    }`
  );

  const profiles = await UserProfile.find({});
  console.log(`Found ${profiles.length} profiles to evaluate`);

  let computedCount = 0;
  let skippedHasChart = 0;
  let skippedNoBirthDate = 0;
  let failedCount = 0;

  for (const profile of profiles) {
    if (!profile.birthData?.date) {
      skippedNoBirthDate++;
      continue;
    }

    if (profile.natalChart && !isForce) {
      skippedHasChart++;
      continue;
    }

    const chart = computeNatalChartFromBirthData(profile.birthData as any);
    if (!chart) {
      failedCount++;
      console.log(`  [failed] user=${profile._id} (compute returned null)`);
      continue;
    }

    if (isDryRun) {
      console.log(
        `  [dry-run] user=${profile._id} → ${chart.sun} Sun / ${chart.moon} Moon / ${
          chart.rising ?? 'no'
        } Rising (houses: ${chart.houses.length}, timeKnown: ${chart.timeKnown})`
      );
    } else {
      profile.natalChart = chart;
      await profile.save();
      console.log(
        `  [updated] user=${profile._id} ${chart.sun} Sun / ${chart.moon} Moon / ${
          chart.rising ?? 'no'
        } Rising`
      );
    }

    computedCount++;
  }

  console.log('');
  console.log('===== Backfill Summary =====');
  console.log(`Computed: ${computedCount}`);
  console.log(`Skipped (already had chart): ${skippedHasChart}`);
  console.log(`Skipped (no birth date): ${skippedNoBirthDate}`);
  console.log(`Failed: ${failedCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
