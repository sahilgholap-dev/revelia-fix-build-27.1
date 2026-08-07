/**
 * Reusable admin script: grant a complimentary ("comp") subscription tier to
 * an already-signed-up user, bypassing RevenueCat — for influencer/marketing
 * trials.
 *
 * The grant is written to user.subscription.comp and honored LAZILY at read
 * time by getEffectiveTier() (utils/subscriptionTier.ts) only while
 * `active && expiresAt > now`. There is no scheduler: once the window passes,
 * the comp is ignored and the user auto-reverts to subscription.tier (their
 * real billing tier — 'free' unless a real purchase has since set it higher).
 * The RevenueCat webhook clears comp.active on a real purchase.
 *
 * Env:
 *   Loads MONGODB_URI from `.env.migration` (in the server/ dir) if present,
 *   otherwise falls back to the ambient process.env / default `.env`. The
 *   connection string is NEVER hardcoded.
 *
 * Usage (run from server/):
 *   npm run grant:comp -- --email <addr> --tier premium_plus --days 30 --reason "<text>" [--dry-run]
 *   npm run grant:comp:dry -- --email <addr> --tier premium_plus --days 30 --reason "<text>"
 *
 *   # or directly:
 *   ts-node --transpile-only src/scripts/grant-comp-tier.ts --email <addr> --tier premium_plus --days 30 --reason "Influencer trial" [--dry-run]
 *
 * Behavior:
 *   - Finds the user by email, case-insensitive, EXACT single match. Aborts on 0 or >1.
 *   - Sets subscription.comp = { tier, grantedAt: now, expiresAt: now+days, reason, active: true }.
 *   - Invalidates that user's cached insights so premium content regenerates.
 *   - Prints BEFORE and AFTER state (including computed effective tier + expiresAt).
 *   - Idempotent: re-running REPLACES the window, never stacks.
 *   - --dry-run prints what it WOULD do and writes nothing.
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env BEFORE importing anything that reads process.env. Prefer an
// explicit .env.migration (where the operator keeps the production connection
// string for one-off scripts), else fall back to the default .env.
const migrationEnvPath = path.resolve(process.cwd(), '.env.migration');
if (fs.existsSync(migrationEnvPath)) {
  config({ path: migrationEnvPath });
  console.log(`Loaded env from ${migrationEnvPath}`);
} else {
  config();
  console.log('No .env.migration found — using ambient process.env / default .env');
}

import mongoose from 'mongoose';
import { User } from '../models/User';
import { invalidateUserInsightCache } from '../services/insightCache.service';
import { getEffectiveTier, TIER_RANK } from '../utils/subscriptionTier';
import { SubscriptionTier } from '../types/shared';

interface Args {
  email: string;
  tier: SubscriptionTier;
  days: number;
  reason: string;
  dryRun: boolean;
}

function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseArgs(): Args {
  const email = getFlag('email');
  const tier = getFlag('tier') as SubscriptionTier | undefined;
  const daysRaw = getFlag('days');
  const reason = getFlag('reason');
  const dryRun = process.argv.includes('--dry-run');

  const errors: string[] = [];
  if (!email) errors.push('--email is required');
  if (!tier) {
    errors.push('--tier is required');
  } else if (!(tier in TIER_RANK)) {
    errors.push(`--tier must be one of: ${Object.keys(TIER_RANK).join(', ')}`);
  }
  const days = daysRaw ? Number(daysRaw) : NaN;
  if (!daysRaw) {
    errors.push('--days is required');
  } else if (!Number.isFinite(days) || days <= 0) {
    errors.push('--days must be a positive number');
  }
  if (!reason) errors.push('--reason is required');

  if (errors.length > 0) {
    console.error('\n❌ Invalid arguments:');
    for (const e of errors) console.error(`   - ${e}`);
    console.error(
      '\nUsage: ts-node --transpile-only src/scripts/grant-comp-tier.ts ' +
        '--email <addr> --tier premium_plus --days 30 --reason "<text>" [--dry-run]\n'
    );
    process.exit(1);
  }

  return {
    email: email!.trim(),
    tier: tier!,
    days,
    reason: reason!,
    dryRun,
  };
}

function describeSubscription(label: string, sub: {
  tier: SubscriptionTier;
  comp?: {
    tier?: SubscriptionTier;
    grantedAt?: Date;
    expiresAt?: Date;
    reason?: string;
    active?: boolean;
  };
}): void {
  const effective = getEffectiveTier({ subscription: sub });
  console.log(`\n--- ${label} ---`);
  console.log(`  billing tier   : ${sub.tier}`);
  console.log(`  effective tier : ${effective}`);
  if (sub.comp && (sub.comp.tier || sub.comp.active)) {
    console.log(`  comp.tier      : ${sub.comp.tier ?? '[unset]'}`);
    console.log(`  comp.active    : ${sub.comp.active ?? false}`);
    console.log(`  comp.grantedAt : ${sub.comp.grantedAt?.toISOString() ?? '[unset]'}`);
    console.log(`  comp.expiresAt : ${sub.comp.expiresAt?.toISOString() ?? '[unset]'}`);
    console.log(`  comp.reason    : ${sub.comp.reason ?? '[unset]'}`);
  } else {
    console.log(`  comp           : [none]`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set (checked .env.migration and process.env). Aborting.');
    process.exit(1);
  }

  console.log(`\n=== grant-comp-tier ${args.dryRun ? '(DRY RUN — no writes)' : '(APPLY)'} ===`);
  console.log(`  email  : ${args.email}`);
  console.log(`  tier   : ${args.tier}`);
  console.log(`  days   : ${args.days}`);
  console.log(`  reason : ${args.reason}`);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  // Case-insensitive EXACT match. Emails are stored lowercased, but we anchor
  // a case-insensitive regex to honor "exact single match" defensively and to
  // detect (and refuse) any accidental duplicates.
  const matches = await User.find({
    email: new RegExp(`^${escapeRegex(args.email)}$`, 'i'),
  });

  if (matches.length === 0) {
    console.error(`\n❌ No user found with email "${args.email}". Aborting.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error(
      `\n❌ ${matches.length} users matched "${args.email}" (${matches
        .map((u) => u.email)
        .join(', ')}). Refusing to act on an ambiguous match. Aborting.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const user = matches[0];
  console.log(`\nMatched user: ${user.email} (_id=${user._id})`);

  describeSubscription('BEFORE', user.subscription);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + args.days * 24 * 60 * 60 * 1000);

  // Idempotent: assign (replace) the comp object — never push/stack.
  user.subscription.comp = {
    tier: args.tier,
    grantedAt: now,
    expiresAt,
    reason: args.reason,
    active: true,
  };

  // Show what the AFTER state will be (computed from the in-memory mutation).
  describeSubscription(args.dryRun ? 'AFTER (would write)' : 'AFTER', user.subscription);

  if (args.dryRun) {
    console.log('\n[dry-run] No changes written. No cache invalidated.');
    await mongoose.disconnect();
    process.exit(0);
  }

  await user.save();
  console.log('\n✓ Comp grant saved.');

  const deleted = await invalidateUserInsightCache(user._id);
  console.log(`✓ Invalidated ${deleted} cached insight document(s) — premium content will regenerate on next fetch.`);

  console.log(`\nDone. Comp ${args.tier} active until ${expiresAt.toISOString()}.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\n❌ grant-comp-tier failed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
