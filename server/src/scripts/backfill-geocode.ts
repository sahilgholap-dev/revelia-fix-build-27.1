/**
 * One-time migration: backfill geocoding + noon-default for existing
 * UserProfile documents.
 *
 * Why this exists:
 *   Build 21 added geocoder.service + the noon-default flow on the
 *   birth-data submit/update path. Existing accounts created before that
 *   change have city/country text but no lat/lng/timezone, and (for users
 *   who skipped birth time) no time at all. This script iterates every
 *   UserProfile, calls geocoder.service for unresolved coords, persists
 *   lat/lng/timezone, and noon-defaults missing birth times — bringing
 *   existing users into the unlocked moon/rising experience.
 *
 * Usage:
 *   npm run backfill:geocode:dry   # preview: no writes, prints actions
 *   npm run backfill:geocode       # apply: writes back to UserProfile
 *
 * Idempotent: profiles that already have valid coords + timezone are
 * skipped on re-runs. Profiles with no location text are skipped entirely.
 *
 * Rate-limited: 200ms delay between Anthropic calls. The geocoder cache
 * absorbs duplicate places automatically — many users share Tampa or
 * Mumbai, so the second occurrence is free.
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import { env } from '../config/env';
import { UserProfile } from '../models/UserProfile';
import { geocodeBirthPlace } from '../services/geocoder.service';

const RATE_LIMIT_MS = 200;
const isDryRun = process.argv.includes('--dry-run');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`Connected to MongoDB. Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);

  // Pull every profile — we'll filter in-memory since the schema doesn't
  // index location fields. Population is small enough this is fine.
  const profiles = await UserProfile.find({});
  console.log(`Found ${profiles.length} profiles to evaluate`);

  let geocodedCount = 0;
  let noonDefaultedCount = 0;
  let skippedAlreadyHasCoords = 0;
  let skippedNoLocation = 0;
  let unresolvableCount = 0;

  for (const profile of profiles) {
    const loc = profile.birthData?.location;

    const placeText = [loc?.city, loc?.country].filter(Boolean).join(', ');
    if (!placeText || placeText.length < 2) {
      skippedNoLocation++;
      continue;
    }

    // Skip if already geocoded with a real timezone. Treat lat:0/lng:0
    // as "not yet geocoded" — that's the legacy mobile placeholder.
    const alreadyGeocoded =
      typeof loc?.lat === 'number' &&
      typeof loc?.lng === 'number' &&
      !(loc.lat === 0 && loc.lng === 0) &&
      typeof loc?.timezone === 'string' &&
      loc.timezone.length > 0;

    if (alreadyGeocoded) {
      skippedAlreadyHasCoords++;
      continue;
    }

    const geocoded = await geocodeBirthPlace(placeText);

    if (!geocoded) {
      unresolvableCount++;
      console.log(`  [unresolvable] user=${profile._id} place="${placeText}"`);
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    if (isDryRun) {
      const willNoonDefault =
        !profile.birthData?.time || profile.birthData.time.trim() === '';
      console.log(
        `  [dry-run] user=${profile._id} place="${placeText}" → ${geocoded.normalized} (${geocoded.lat}, ${geocoded.lng}) [${geocoded.timezone}]${willNoonDefault ? ' (would noon-default)' : ''}`
      );
    } else {
      profile.birthData.location = {
        ...(profile.birthData.location as any),
        city: loc?.city ?? '',
        country: loc?.country ?? '',
        lat: geocoded.lat,
        lng: geocoded.lng,
        timezone: geocoded.timezone,
      } as any;

      // Noon-default if missing time. Only run this branch on geocoded
      // profiles — without a timezone there's no anchor for the noon.
      if (
        !profile.birthData.time ||
        profile.birthData.time.trim() === ''
      ) {
        profile.birthData.time = '12:00';
        profile.birthData.timeIsAssumed = true;
        noonDefaultedCount++;
      }

      await profile.save();
      console.log(
        `  [updated] user=${profile._id} ${geocoded.normalized}${profile.birthData.timeIsAssumed ? ' (noon-defaulted)' : ''}`
      );
    }

    geocodedCount++;
    await sleep(RATE_LIMIT_MS);
  }

  console.log('');
  console.log('===== Backfill Summary =====');
  console.log(`Geocoded: ${geocodedCount}`);
  console.log(`Noon-defaulted: ${noonDefaultedCount}`);
  console.log(`Skipped (already had coords): ${skippedAlreadyHasCoords}`);
  console.log(`Skipped (no location): ${skippedNoLocation}`);
  console.log(`Unresolvable: ${unresolvableCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
