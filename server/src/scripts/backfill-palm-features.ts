/**
 * One-time migration: backfill the Build 27 R3 structured palm layer for
 * existing UserProfile documents.
 *
 * Why this exists:
 *   Build 27 R3 added a deterministic hand-geometry layer on the palm upload path
 *   (upload.service.uploadPalmImage) plus a lazy fallback at reading time
 *   (reading.service.getPalmReading). Accounts that uploaded a palm photo before
 *   R3 shipped have `images.palmDominant.url` (+ `images.palmNonDominant.url` for
 *   premium) + the freeform `palmReading`/`palmReadingNonDominant` blobs but no
 *   structured `palm{Dominant|NonDominant}Features`/`…Traits`/`palmProfileResult`.
 *   This script fetches each stored palm image from R2, extracts the hand-feature
 *   vector, maps it to a stable trait profile / palmType / talents via the curated
 *   chiromancy rules table, and persists the per-hand fields — so users get the
 *   stable layer without waiting for the lazy path.
 *
 * PER HAND (this is the R3-vs-R2 divergence — palm is two images):
 *   Free-tier users have only the DOMINANT hand; premium users have both. Each
 *   present hand is processed INDEPENDENTLY:
 *     - dominant     → palmDominantFeatures / palmDominantTraits
 *                      + palmProfileResult / palmRulesVersion (dominant-derived —
 *                        the layer insight/synthesis reads)
 *     - non-dominant → palmNonDominantFeatures / palmNonDominantTraits only
 *   A profile can be HALF-DONE (dominant filled, non-dominant not, or vice-versa)
 *   — presence is checked per hand, and a failure on one hand never skips the
 *   other.
 *
 * Usage:
 *   npm run backfill:palm-features:dry   # preview: no writes, prints actions
 *   npm run backfill:palm-features       # apply: writes the palm layer
 *   (add --force to recompute hands that already have their features)
 *
 * Idempotent + resumable: a hand that already has its features is skipped on
 * re-runs (pass --force to recompute); hands with no palm image are skipped. Safe
 * to re-run after a partial run — including a run that half-completed a profile.
 *
 * NOT pure compute (like backfill-face-features, unlike backfill-natal-chart):
 * this does real CV over stored images, so it WILL hit per-hand detection failures
 * (no hand on a validated image, decode error, R2 fetch error). Those are
 * EXPECTED — each is logged with the userId + hand (+ detector confidence when
 * available) and SKIPPED; one bad hand never aborts the run and never skips the
 * other hand of the same profile. No Anthropic / rate-limited calls in the feature
 * path.
 *
 * §6 invariant: extraction runs STRAIGHT on the stored R2 bytes (the canonical
 * processed buffer) — NOT re-run through processImage — so the output matches
 * upload-time + lazy-fallback extraction exactly. Raw landmarks are persisted in
 * the vector so a later RULES_VERSION bump can re-map without re-detecting.
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import axios from 'axios';
import { env } from '../config/env';
import { UserProfile } from '../models/UserProfile';
import { extractHandFeatures } from '../services/palmFeatures.service';
import {
  mapFeaturesToPalmTraits,
  RULES_VERSION as PALM_RULES_VERSION,
} from '../data/chiromancy-rules';

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

type Hand = 'dominant' | 'non-dominant';

// Per-hand running counters (shared across every profile in the run).
const stats = {
  computed: 0,
  skippedHasFeatures: 0,
  failedFetch: 0,
  failedNoHand: 0,
};

/**
 * Backfill ONE hand of ONE profile. Fully self-contained + fail-soft: any
 * failure (fetch/decode/no-hand) logs + returns without throwing, so the caller
 * can move on to the other hand and the next profile. Mirrors the step-4 upload
 * hook + the reading-time lazy fallback exactly (fetch stored bytes → extract →
 * map → persist the per-hand fields).
 */
async function backfillHand(
  profile: InstanceType<typeof UserProfile>,
  hand: Hand
): Promise<void> {
  const isDominant = hand === 'dominant';
  const imageUrl = isDominant
    ? profile.images?.palmDominant?.url
    : profile.images?.palmNonDominant?.url;

  // No image for this hand — nothing to backfill (free tier has no non-dominant).
  if (!imageUrl) return;

  const existingFeatures = isDominant
    ? profile.palmDominantFeatures
    : profile.palmNonDominantFeatures;
  if (existingFeatures && !isForce) {
    stats.skippedHasFeatures++;
    return;
  }

  // Fetch the CANONICAL stored R2 bytes and extract STRAIGHT on them — do NOT
  // re-run processImage; the R2 object already IS the processed buffer the upload
  // stored, and re-encoding would shift landmarks and break "same image → same
  // vector". Mirrors the upload hook + reading.service lazy-fallback path.
  let storedBytes: Buffer;
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    storedBytes = Buffer.from(response.data);
  } catch (err: any) {
    stats.failedFetch++;
    console.log(
      `  [failed-fetch] user=${profile.userId} hand=${hand} (${
        err?.message ?? String(err)
      })`
    );
    return;
  }

  let vector: Awaited<ReturnType<typeof extractHandFeatures>> = null;
  try {
    vector = await extractHandFeatures(storedBytes, hand);
  } catch (err: any) {
    stats.failedNoHand++;
    console.log(
      `  [failed-extract] user=${profile.userId} hand=${hand} (${
        err?.message ?? String(err)
      })`
    );
    return;
  }

  if (!vector) {
    // No hand on a previously-validated image (odd pose/occlusion/cropping) or
    // degenerate geometry — log + skip, never abort the run or skip the other hand.
    stats.failedNoHand++;
    console.log(
      `  [no-hand] user=${profile.userId} hand=${hand} (extraction returned null)`
    );
    return;
  }

  const mapped = mapFeaturesToPalmTraits(vector);
  const confidence = vector.quality?.detectorScore;

  if (isDryRun) {
    console.log(
      `  [dry-run] user=${profile.userId} hand=${hand} → ${vector.palmType} hand (${
        mapped.traits.length
      } traits, detectorScore=${confidence})`
    );
  } else {
    // Persist per-hand fields — match the upload hook exactly. The DOMINANT hand
    // additionally writes the dominant-derived profile + rules version; the
    // non-dominant hand only writes its own features/traits.
    const update: Record<string, any> = { $set: {} };
    if (isDominant) {
      update.$set.palmDominantFeatures = vector;
      update.$set.palmDominantTraits = mapped.traits;
      update.$set.palmProfileResult = mapped.profile;
      update.$set.palmRulesVersion = PALM_RULES_VERSION;
    } else {
      update.$set.palmNonDominantFeatures = vector;
      update.$set.palmNonDominantTraits = mapped.traits;
    }
    await UserProfile.findOneAndUpdate({ userId: profile.userId }, update);
    console.log(
      `  [updated] user=${profile.userId} hand=${hand} → ${vector.palmType} hand (${
        mapped.traits.length
      } traits, detectorScore=${confidence})`
    );
  }

  stats.computed++;
}

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

  let skippedNoPalmImage = 0;

  for (const profile of profiles) {
    const hasDominant = !!profile.images?.palmDominant?.url;
    const hasNonDominant = !!profile.images?.palmNonDominant?.url;

    if (!hasDominant && !hasNonDominant) {
      skippedNoPalmImage++;
      continue;
    }

    // Process BOTH hands that exist, independently. A failure on one must not
    // skip the other (backfillHand is self-contained + fail-soft).
    if (hasDominant) await backfillHand(profile, 'dominant');
    if (hasNonDominant) await backfillHand(profile, 'non-dominant');
  }

  console.log('');
  console.log('===== Backfill Summary (per hand) =====');
  console.log(`Computed: ${stats.computed}`);
  console.log(`Skipped (already had features): ${stats.skippedHasFeatures}`);
  console.log(`Skipped profiles (no palm image at all): ${skippedNoPalmImage}`);
  console.log(`Failed (R2 fetch): ${stats.failedFetch}`);
  console.log(`Failed (no hand / extraction): ${stats.failedNoHand}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
