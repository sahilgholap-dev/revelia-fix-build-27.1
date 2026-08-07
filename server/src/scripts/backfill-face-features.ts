/**
 * One-time migration: backfill the Build 27 R2 structured face layer for
 * existing UserProfile documents.
 *
 * Why this exists:
 *   Build 27 R2 added a deterministic face-feature layer on the upload path
 *   (upload.service.uploadFaceImage) plus a lazy fallback at reading time
 *   (reading.service.getFaceReading). Accounts that uploaded a face photo
 *   before R2 shipped have `images.face.url` + the freeform `faceReading` blob
 *   but no structured `faceFeatures`/`faceTraits`/`faceArchetypeResult`. This
 *   script fetches each stored face image from R2, extracts the feature vector,
 *   maps it to stable traits/archetype via the curated rules table, and persists
 *   them — so users get the stable layer without waiting for the lazy path.
 *
 * Usage:
 *   npm run backfill:face-features:dry   # preview: no writes, prints actions
 *   npm run backfill:face-features       # apply: writes the face layer
 *   (add --force to recompute profiles that already have faceTraits)
 *
 * Idempotent + resumable: profiles that already have `faceTraits` are skipped on
 * re-runs (pass --force to recompute all); profiles with no face image are
 * skipped. Safe to re-run after a partial run.
 *
 * NOT pure compute (unlike backfill-natal-chart): this does real CV over stored
 * images, so it WILL hit per-user detection failures (no face on a validated
 * image, decode error, R2 fetch error). Those are EXPECTED — each is logged with
 * the userId (+ detector confidence when available) and SKIPPED; one bad profile
 * never aborts the run. No Anthropic / rate-limited calls in the feature path.
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
import { extractFaceFeatures } from '../services/faceFeatures.service';
import { mapFeaturesToTraits, RULES_VERSION } from '../data/physiognomy-rules';

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
  let skippedHasTraits = 0;
  let skippedNoFaceImage = 0;
  let failedFetch = 0;
  let failedNoFace = 0;

  for (const profile of profiles) {
    const faceImageUrl = profile.images?.face?.url;
    if (!faceImageUrl) {
      skippedNoFaceImage++;
      continue;
    }

    if (profile.faceTraits && profile.faceTraits.length > 0 && !isForce) {
      skippedHasTraits++;
      continue;
    }

    // Fetch the CANONICAL stored R2 bytes and extract STRAIGHT on them — do NOT
    // re-run processImage; the R2 object already IS the processed buffer the
    // upload stored, and re-encoding would shift landmarks and break "same image
    // → same vector". Mirrors the reading.service lazy-fallback path exactly.
    let storedBytes: Buffer;
    try {
      const response = await axios.get(faceImageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      storedBytes = Buffer.from(response.data);
    } catch (err: any) {
      failedFetch++;
      console.log(
        `  [failed-fetch] user=${profile._id} (${
          err?.message ?? String(err)
        })`
      );
      continue;
    }

    let vector: Awaited<ReturnType<typeof extractFaceFeatures>> = null;
    try {
      vector = await extractFaceFeatures(storedBytes);
    } catch (err: any) {
      failedNoFace++;
      console.log(
        `  [failed-extract] user=${profile._id} (${
          err?.message ?? String(err)
        })`
      );
      continue;
    }

    if (!vector) {
      // No face on a previously-validated image (extreme angle/occlusion/filter)
      // or degenerate geometry — log + skip, never abort the run.
      failedNoFace++;
      console.log(
        `  [no-face] user=${profile._id} (extraction returned null)`
      );
      continue;
    }

    const { traits, archetype } = mapFeaturesToTraits(vector);
    const confidence = vector.quality?.detectorScore;

    if (isDryRun) {
      console.log(
        `  [dry-run] user=${profile._id} → ${archetype.name} (${
          vector.faceShape
        } face, ${traits.length} traits, detectorScore=${confidence})`
      );
    } else {
      await UserProfile.findOneAndUpdate(
        { userId: profile.userId },
        {
          $set: {
            faceFeatures: vector,
            faceTraits: traits,
            faceArchetypeResult: archetype,
            faceRulesVersion: RULES_VERSION,
          },
        }
      );
      console.log(
        `  [updated] user=${profile._id} → ${archetype.name} (${
          vector.faceShape
        } face, ${traits.length} traits, detectorScore=${confidence})`
      );
    }

    computedCount++;
  }

  console.log('');
  console.log('===== Backfill Summary =====');
  console.log(`Computed: ${computedCount}`);
  console.log(`Skipped (already had traits): ${skippedHasTraits}`);
  console.log(`Skipped (no face image): ${skippedNoFaceImage}`);
  console.log(`Failed (R2 fetch): ${failedFetch}`);
  console.log(`Failed (no face / extraction): ${failedNoFace}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
