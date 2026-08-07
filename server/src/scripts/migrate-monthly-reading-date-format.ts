/**
 * One-time migration: normalize date format in cached monthly reading documents.
 *
 * Why this exists:
 *   Build 18 fixed the monthly-reading prompt so newly generated readings emit
 *   dates in standard US format ("May 6, 2026"). Cached readings already in
 *   MongoDB still carry the old placeholder shape ("May 2026 [6]"). This
 *   script walks every monthly InsightCache document and runs the existing
 *   normalizeDatesInObject() utility over its content.
 *
 * Usage:
 *   npm run migrate:date-format:dry   # preview: no writes, sample diffs printed
 *   npm run migrate:date-format       # apply: writes normalized content back
 *
 * Idempotent — re-running reports 0 changes.
 *
 * Scope: documents where InsightCache.type === 'monthly' only. Weekly/daily
 * prompts never used the bracket placeholder pattern, so their cached
 * readings don't need migration.
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import { env } from '../config/env';
import { InsightCache } from '../models/InsightCache';
import { normalizeDatesInObject } from '../utils/dateFormat';

const PROGRESS_INTERVAL = 100;
const SAMPLE_DIFF_LIMIT = 10;

const isDryRun = process.argv.includes('--dry-run');

interface SampleDiff {
  docId: string;
  before: string;
  after: string;
}

async function run(): Promise<void> {
  console.log(
    `\n=== migrate-monthly-reading-date-format ${isDryRun ? '(DRY RUN)' : '(APPLY)'} ===\n`
  );

  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
  });
  console.log('✅ Connected to MongoDB');

  const cursor = InsightCache.find({ type: 'monthly' }).cursor();

  let scanned = 0;
  let modified = 0;
  let noChange = 0;
  let totalFieldsAffected = 0;
  const sampleDiffs: SampleDiff[] = [];

  for await (const doc of cursor) {
    scanned++;

    const original = doc.content as any;
    if (!original || typeof original !== 'object') {
      noChange++;
      continue;
    }

    // Deep clone so the in-memory original stays intact for the comparison.
    const beforeJson = JSON.stringify(original);
    const cloned = JSON.parse(beforeJson);
    const normalized = normalizeDatesInObject(cloned);
    const afterJson = JSON.stringify(normalized);

    if (beforeJson === afterJson) {
      noChange++;
    } else {
      // Count how many string leaves changed by walking both trees.
      const fieldsChanged = countChangedLeaves(original, normalized);
      totalFieldsAffected += fieldsChanged;

      if (sampleDiffs.length < SAMPLE_DIFF_LIMIT) {
        sampleDiffs.push({
          docId: doc._id.toString(),
          before: pickFirstChangedSnippet(beforeJson, afterJson),
          after: pickFirstChangedSnippet(afterJson, beforeJson),
        });
      }

      if (!isDryRun) {
        await InsightCache.updateOne(
          { _id: doc._id },
          { $set: { content: normalized } }
        );
      }
      modified++;
    }

    if (scanned % PROGRESS_INTERVAL === 0) {
      console.log(
        `  scanned=${scanned}  modified=${modified}  no-change=${noChange}`
      );
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Mode:                  ${isDryRun ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log(`Documents scanned:     ${scanned}`);
  console.log(`Documents ${isDryRun ? 'would be modified' : 'modified       '}: ${modified}`);
  console.log(`Documents unchanged:   ${noChange}`);
  console.log(`Total fields affected: ${totalFieldsAffected}`);

  if (sampleDiffs.length > 0) {
    console.log(`\nSample transformations (first ${sampleDiffs.length}):`);
    for (const d of sampleDiffs) {
      console.log(`\n  doc ${d.docId}`);
      console.log(`    before: ${d.before}`);
      console.log(`    after:  ${d.after}`);
    }
  }

  if (isDryRun && modified > 0) {
    console.log(
      `\nDry run complete. Run "npm run migrate:date-format" to apply ${modified} updates.`
    );
  } else if (modified === 0) {
    console.log('\nNothing to migrate — all monthly readings are already normalized.');
  } else {
    console.log(`\n✅ Migration applied: ${modified} document(s) updated.`);
  }

  await mongoose.disconnect();
}

/** Count string leaves that differ between two trees of the same shape. */
function countChangedLeaves(a: any, b: any): number {
  if (a === b) return 0;
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b ? 0 : 1;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    let n = 0;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) n += countChangedLeaves(a[i], b[i]);
    return n;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    let n = 0;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) n += countChangedLeaves(a[k], b[k]);
    return n;
  }
  return 0;
}

/**
 * For sample-diff output: find the first ~80-char window that differs
 * between the two JSON strings so the output isn't a full document dump.
 */
function pickFirstChangedSnippet(target: string, other: string): string {
  let i = 0;
  const len = Math.min(target.length, other.length);
  while (i < len && target[i] === other[i]) i++;
  if (i === target.length && i === other.length) return '(no diff)';
  const start = Math.max(0, i - 30);
  const end = Math.min(target.length, i + 80);
  return (start > 0 ? '…' : '') + target.slice(start, end) + (end < target.length ? '…' : '');
}

run().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
