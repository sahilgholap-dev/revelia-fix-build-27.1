/**
 * One-time migration: backfill the Build 27 R4 canonical `numerology` sub-doc
 * for existing UserProfile documents.
 *
 * Why this exists:
 *   Build 27 R4 consolidated all stored numerology into `profile.numerology`
 *   (lifePath + name-based trio + provenance + version), written at three save
 *   hooks (step 3) and read from that ONE source (step 4). Accounts created
 *   before R4 have the legacy flat `lifePathNumber` (if birth data was ever set)
 *   and possibly `NameAnalysis` docs, but no `numerology` sub-doc. This script
 *   computes and persists it for every profile that needs one, so users get the
 *   consolidated source without waiting for the read-time lazy fallback to fire.
 *
 * Per profile (see plans/build-27/R4-numerology-consolidation.md §8):
 *   - lifePath: from birthData.date via getLifePathNumber (legacy flat / existing
 *     sub-doc as fallback). NO birth data at all → SKIP the profile (never write a
 *     sub-doc without its required lifePathNumber — the step-3 ruling).
 *   - name trio: from the MOST RECENT NameAnalysis (sort generatedAt desc) →
 *     nameSource 'name_destiny'; else a non-empty profile.name → 'profile_name';
 *     else omit the trio (lifePath-only sub-doc is valid). Recomputed via
 *     computeNameNumbers (the ONE definition) — not copied from the stored doc.
 *   - version/computedAt stamped.
 *
 * Usage:
 *   npm run backfill:numerology:dry   # preview: no writes, prints per-profile intent
 *   npm run backfill:numerology       # apply: writes profile.numerology
 *
 * Idempotent + resumable + UPGRADE-aware: profiles whose sub-doc already carries
 * the current NUMEROLOGY_VERSION are skipped, EXCEPT (a) upgrade a `profile_name`
 * trio when a NameAnalysis exists, and (b) fill a missing trio when a name source
 * is now available. Never downgrades `name_destiny` → `profile_name`. Safe to
 * re-run after a partial run. The idempotency/provenance decision is shared with
 * the read-time lazy fallback via `planNumerologyUpdate` (services/numerology.service)
 * so the two can never drift.
 *
 * PURE COMPUTE — no image fetch, no CV, no Anthropic calls (the cheapest backfill
 * of the empirical thrust, R1-class and lighter). NameAnalysis is READ here,
 * never written. Per-user fail-soft: a bad profile is logged + skipped, never
 * aborts the run.
 *
 * NOT run against prod in-session — the owner runs `:dry` first, then the real
 * run, after the backend deploys (R1/R2/R3 backfill precedent).
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import { env } from '../config/env';
import { UserProfile } from '../models/UserProfile';
import { NameAnalysis } from '../models/NameAnalysis';
import {
  planNumerologyUpdate,
  LatestNameAnalysis,
} from '../services/numerology.service';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`Connected to MongoDB. Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);

  const profiles = await UserProfile.find({});
  console.log(`Found ${profiles.length} profiles to evaluate`);

  let created = 0;
  let upgraded = 0;
  let filled = 0;
  let skippedCurrent = 0;
  let skippedNoBirthData = 0;
  let failed = 0;

  for (const profile of profiles) {
    const userId = profile.userId.toString();
    try {
      // Most-recent NameAnalysis for this user (the `name_destiny` source).
      const latestAnalysis = await NameAnalysis.findOne({ userId })
        .sort({ generatedAt: -1 })
        .select('fullName expressionNumber soulUrgeNumber personalityNumber')
        .lean<LatestNameAnalysis | null>();

      const plan = planNumerologyUpdate({
        birthDate: profile.birthData?.date ?? undefined,
        legacyLifePath: profile.lifePathNumber,
        existing: profile.numerology ?? undefined,
        profileName: profile.name,
        latestAnalysis: latestAnalysis ?? null,
        computedAt: new Date().toISOString(),
        userId,
      });

      if (plan.action === 'skip') {
        // effective present → current-version skip; absent → no-birth-data skip.
        if (plan.numerology) {
          skippedCurrent++;
        } else {
          skippedNoBirthData++;
          console.log(`  [skip-no-birthdata] user=${userId} (${plan.reason})`);
        }
        continue;
      }

      const n = plan.numerology!;
      const trioDesc =
        n.nameSource !== undefined
          ? `expr=${n.expressionNumber}/soul=${n.soulUrgeNumber}/pers=${n.personalityNumber} src=${n.nameSource}`
          : 'no name trio';

      if (isDryRun) {
        console.log(
          `  [dry-run:${plan.action}] user=${userId} → lifePath=${n.lifePathNumber}, ${trioDesc} (${plan.reason})`
        );
      } else {
        await UserProfile.updateOne({ userId }, { $set: { numerology: n } });
        console.log(
          `  [${plan.action}] user=${userId} → lifePath=${n.lifePathNumber}, ${trioDesc}`
        );
      }

      if (plan.action === 'create') created++;
      else if (plan.action === 'upgrade') upgraded++;
      else if (plan.action === 'fill') filled++;
    } catch (err: any) {
      failed++;
      console.log(`  [failed] user=${userId} (${err?.message ?? String(err)})`);
    }
  }

  console.log('');
  console.log('===== Backfill Summary =====');
  console.log(`Created:  ${created}`);
  console.log(`Upgraded (profile_name → name_destiny): ${upgraded}`);
  console.log(`Filled (added missing trio): ${filled}`);
  console.log(`Skipped (already current version): ${skippedCurrent}`);
  console.log(`Skipped (no birth data → no lifePath): ${skippedNoBirthData}`);
  console.log(`Failed: ${failed}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
