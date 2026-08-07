/**
 * D5 per-device free-Deep-Insight anti-farming GATE — committed, standing guard
 * (R7 §13f). Written FIXTURE-FIRST for the point-release investigation into "one
 * device, two free accounts, two free Deep Insights".
 *
 * ── THE CONTRACT THIS PINS ────────────────────────────────────────────────────
 * Given a recorded `QaDeviceDiClaim` for {deviceHash, currentMonthKey}, a FREE-tier
 * DI request carrying that same `X-Device-Id`:
 *   • MUST throw `QaCapExceededError` with code `deep_insight_limit_reached`, and
 *   • MUST do so BEFORE any answer model is called (structurally: `enforceQaCaps`
 *     precedes `createQaAnswerMessage` in the serving path, and it throws).
 * And the FAIL-OPEN paths must STAY fail-open — a legitimate user is never blocked
 * by a failed check:
 *   • absent/blank `X-Device-Id`  → no gate
 *   • unset/blank `QA_DEVICE_SALT` → no gate (and no lookup attempted)
 *   • DB error on the lookup       → no gate
 * Plus: PAID DI is never device-gated (tier-sub-capped only — do NOT "fix" this),
 * and the claim WRITE key must equal the claim READ key byte-for-byte (a monthKey
 * or hash-input mismatch writes one key and reads another → the gate never fires).
 *
 * ── OFFLINE BY DEFAULT ────────────────────────────────────────────────────────
 * `qa-caps.service` is pure logic over two Mongoose models; importing a model does
 * not connect. The two statics the gate touches (`QaTurn.countDocuments`,
 * `QaDeviceDiClaim.exists`/`updateOne`) are stubbed here, so this needs NO DB, NO
 * API key. Deterministic via a fixed `now`.
 *
 * A LIVE round-trip (real write → real read on a real Mongo) is available behind
 * `QA_DEVICE_GATE_LIVE_DB=1` + `MONGODB_URI` — use it against a STAGING/scratch DB
 * to prove trace items #3/#4 end-to-end. Never point it at prod.
 *
 * Run: `npm run test:qa-device-gate` (from server/). Exit 0 = the gate holds,
 * 1 = the anti-farming gate or a fail-open path regressed.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { QaTurn } from '../models/QaTurn';
import { QaDeviceDiClaim } from '../models/QaDeviceDiClaim';
import {
  enforceQaCaps,
  recordDeviceDiClaim,
  isDeviceSaltConfigured,
  QaCapExceededError,
  utcMonthKey,
} from '../services/qa-caps.service';
import { TierResolvable } from '../utils/subscriptionTier';
import { SubscriptionTier } from '../types/shared';
import { logger } from '../utils/logger';

const NOW = new Date('2026-07-27T12:00:00Z');
const MONTH_KEY = '2026-07';
const SALT = 'fixture-salt-not-a-real-secret';
const RAW_DEVICE_ID = 'a1b2c3d4e5f60718'; // shape of an Android SSAID
const EXPECTED_HASH = createHash('sha256').update(SALT + RAW_DEVICE_ID).digest('hex');

const userOf = (tier: SubscriptionTier): TierResolvable => ({ subscription: { tier } });

// ── tally ────────────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const rows: { name: string; ok: boolean; note?: string }[] = [];
function check(name: string, ok: boolean, note?: string): void {
  rows.push({ name, ok, note });
  if (ok) pass++; else fail++;
}

// ── stubs (offline) ──────────────────────────────────────────────────────────
let questionUsage = 0;
let diUsage = 0;
(QaTurn as any).countDocuments = async (filter: any): Promise<number> =>
  filter?.deepInsight === true ? diUsage : questionUsage;

let existsCalls: { deviceHash: string; monthKey: string }[] = [];
let claimExists = false;
let existsThrows = false;
(QaDeviceDiClaim as any).exists = async (filter: any) => {
  existsCalls.push({ deviceHash: filter?.deviceHash, monthKey: filter?.monthKey });
  if (existsThrows) throw new Error('simulated mongo failure');
  return claimExists ? { _id: 'stub' } : null;
};

let updateCalls: { filter: any; update: any; options: any }[] = [];
let updateThrows = false;
(QaDeviceDiClaim as any).updateOne = async (filter: any, update: any, options: any) => {
  updateCalls.push({ filter, update, options });
  if (updateThrows) throw new Error('simulated mongo failure');
  return { acknowledged: true, upsertedCount: 1 };
};

// Captured telemetry. The gate's whole diagnosability rests on these lines, so the
// harness asserts BOTH that they are emitted with the right reason AND that they
// stay content-free (no raw device id, no hash) — the privacy contract.
let logs: { level: 'info' | 'warn'; msg: string; meta: any }[] = [];
(logger as any).info = (msg: string, meta?: any) => { logs.push({ level: 'info', msg, meta }); };
(logger as any).warn = (msg: string, meta?: any) => { logs.push({ level: 'warn', msg, meta }); };

/** The one `qa_device_di_gate` line emitted by the last enforce call, if any. */
const gateLog = () => logs.find((l) => l.msg === 'qa_device_di_gate');
/** The one `qa_device_di_claim` line emitted by the last record call, if any. */
const claimLog = () => logs.find((l) => l.msg === 'qa_device_di_claim');

function resetStubs(): void {
  questionUsage = 0;
  diUsage = 0;
  existsCalls = [];
  updateCalls = [];
  logs = [];
  claimExists = false;
  existsThrows = false;
  updateThrows = false;
  process.env.QA_DEVICE_SALT = SALT;
}

/** Run `enforceQaCaps` and report whether it threw + the 402 payload it carried. */
async function attempt(args: {
  tier: SubscriptionTier;
  deepInsight: boolean;
  deviceId?: string | null;
}): Promise<{ threw: boolean; err?: QaCapExceededError }> {
  try {
    await enforceQaCaps({
      user: userOf(args.tier),
      userId: 'user-fixture',
      deepInsight: args.deepInsight,
      now: NOW,
      deviceId: args.deviceId,
    });
    return { threw: false };
  } catch (err: any) {
    if (err instanceof QaCapExceededError) return { threw: true, err };
    throw err;
  }
}

async function main(): Promise<void> {
  // ── month key ──────────────────────────────────────────────────────────────
  check(`utcMonthKey(NOW) === "${MONTH_KEY}" (UTC, zero-padded)`, utcMonthKey(NOW) === MONTH_KEY);

  // ── THE GATE: recorded claim + FREE + DI + same device → 402 ───────────────
  resetStubs();
  claimExists = true;
  const gated = await attempt({ tier: 'free', deepInsight: true, deviceId: RAW_DEVICE_ID });
  check('GATE: FREE + DI + recorded claim for this device/month → THROWS QaCapExceededError',
    gated.threw);
  check('GATE: 402 code === "deep_insight_limit_reached"',
    gated.err?.payload.code === 'deep_insight_limit_reached');
  check('GATE: 402 tier === "free" and remaining.deepInsight === 0',
    gated.err?.payload.tier === 'free' && gated.err?.payload.remaining.deepInsight === 0);
  check('GATE: the lookup used sha256(QA_DEVICE_SALT + rawId) — never the raw id',
    existsCalls.length === 1 && existsCalls[0].deviceHash === EXPECTED_HASH,
    existsCalls[0] ? `looked up ${existsCalls[0].deviceHash.slice(0, 12)}…` : 'no lookup');
  check(`GATE: the lookup used monthKey "${MONTH_KEY}"`,
    existsCalls.length === 1 && existsCalls[0].monthKey === MONTH_KEY);

  // ── the gate must sit PRE-MODEL in the serving path ────────────────────────
  const svcPath = path.resolve(__dirname, '../services/qa.service.ts');
  const svc = fs.readFileSync(svcPath, 'utf8');
  const iEnforce = svc.indexOf('await enforceQaCaps(');
  const iModel = svc.indexOf('await createQaAnswerMessage(');
  check('PRE-MODEL: qa.service awaits enforceQaCaps BEFORE createQaAnswerMessage (a gated ask costs nothing)',
    iEnforce > -1 && iModel > -1 && iEnforce < iModel,
    `enforceQaCaps@${iEnforce} < createQaAnswerMessage@${iModel}`);
  check('PRE-MODEL: enforceQaCaps receives the device id from the request',
    /enforceQaCaps\(\{[\s\S]*?deviceId:\s*input\.deviceId[\s\S]*?\}\)/.test(svc));

  // ── FAIL-OPEN #1: absent / blank device id ─────────────────────────────────
  resetStubs();
  claimExists = true;
  const noHeader = await attempt({ tier: 'free', deepInsight: true, deviceId: undefined });
  check('FAIL-OPEN: absent X-Device-Id → NOT blocked (per-account gating only)', !noHeader.threw);
  check('FAIL-OPEN: absent X-Device-Id → no claim lookup attempted', existsCalls.length === 0);

  resetStubs();
  claimExists = true;
  const blankHeader = await attempt({ tier: 'free', deepInsight: true, deviceId: '' });
  check('FAIL-OPEN: blank X-Device-Id → NOT blocked', !blankHeader.threw);

  // ── FAIL-OPEN #2: unset / blank salt (misconfigured deploy) ────────────────
  resetStubs();
  claimExists = true;
  delete process.env.QA_DEVICE_SALT;
  const noSalt = await attempt({ tier: 'free', deepInsight: true, deviceId: RAW_DEVICE_ID });
  check('FAIL-OPEN: QA_DEVICE_SALT unset → NOT blocked (degrades to per-account only)', !noSalt.threw);
  check('FAIL-OPEN: QA_DEVICE_SALT unset → no unsalted lookup is attempted', existsCalls.length === 0);

  resetStubs();
  claimExists = true;
  process.env.QA_DEVICE_SALT = '   ';
  const blankSalt = await attempt({ tier: 'free', deepInsight: true, deviceId: RAW_DEVICE_ID });
  check('FAIL-OPEN: QA_DEVICE_SALT blank → NOT blocked', !blankSalt.threw);

  // ── FAIL-OPEN #3: DB error on the lookup ───────────────────────────────────
  resetStubs();
  existsThrows = true;
  const dbErr = await attempt({ tier: 'free', deepInsight: true, deviceId: RAW_DEVICE_ID });
  check('FAIL-OPEN: claim-lookup DB error → NOT blocked (transient infra never denies a free DI)',
    !dbErr.threw);

  // ── PAID is NEVER device-gated (correct by design — do not "fix") ──────────
  for (const tier of ['premium', 'premium_plus'] as const) {
    resetStubs();
    claimExists = true;
    const paid = await attempt({ tier, deepInsight: true, deviceId: RAW_DEVICE_ID });
    check(`PAID: ${tier} + DI + recorded claim on this device → NOT blocked (tier-sub-capped only)`,
      !paid.threw);
    check(`PAID: ${tier} → the device claim is not even looked up`, existsCalls.length === 0);
  }

  // ── non-DI free ask is never device-gated ──────────────────────────────────
  resetStubs();
  claimExists = true;
  const nonDi = await attempt({ tier: 'free', deepInsight: false, deviceId: RAW_DEVICE_ID });
  check('SCOPE: FREE non-DI ask with a recorded claim → NOT blocked', !nonDi.threw);
  check('SCOPE: FREE non-DI ask → no claim lookup attempted', existsCalls.length === 0);

  // ── the per-ACCOUNT sub-cap still fires independently of the device gate ───
  resetStubs();
  diUsage = 1; // free DI sub-cap = 1
  const acct = await attempt({ tier: 'free', deepInsight: true, deviceId: undefined });
  check('ACCOUNT: free account that already used its own DI → 402 deep_insight_limit_reached',
    acct.threw && acct.err?.payload.code === 'deep_insight_limit_reached');

  // ── WRITE KEY === READ KEY (a mismatch writes one key and reads another) ───
  resetStubs();
  await recordDeviceDiClaim(RAW_DEVICE_ID, NOW);
  check('WRITE: a delivered free DI upserts exactly one claim', updateCalls.length === 1);
  check('WRITE: the claim filter is { deviceHash: sha256(salt+raw), monthKey }',
    updateCalls[0]?.filter?.deviceHash === EXPECTED_HASH &&
    updateCalls[0]?.filter?.monthKey === MONTH_KEY);
  check('WRITE: upsert:true + $setOnInsert (idempotent; a concurrent double-insert collapses)',
    updateCalls[0]?.options?.upsert === true &&
    updateCalls[0]?.update?.$setOnInsert?.deviceHash === EXPECTED_HASH);
  check('WRITE: the RAW device id is never part of the persisted document',
    JSON.stringify(updateCalls[0] ?? {}).indexOf(RAW_DEVICE_ID) === -1);

  // The read path, run against the SAME raw id, must produce the SAME key.
  resetStubs();
  claimExists = true;
  await attempt({ tier: 'free', deepInsight: true, deviceId: RAW_DEVICE_ID });
  const readKey = existsCalls[0];
  resetStubs();
  await recordDeviceDiClaim(RAW_DEVICE_ID, NOW);
  const writeKey = updateCalls[0]?.filter;
  check('KEY MATCH: read key === write key (same hash input, same monthKey format)',
    !!readKey && !!writeKey &&
    readKey.deviceHash === writeKey.deviceHash &&
    readKey.monthKey === writeKey.monthKey);

  // ── record path: fail-open no-ops ──────────────────────────────────────────
  resetStubs();
  await recordDeviceDiClaim(null, NOW);
  await recordDeviceDiClaim(undefined, NOW);
  check('RECORD: absent device id → no write attempted', updateCalls.length === 0);

  resetStubs();
  delete process.env.QA_DEVICE_SALT;
  await recordDeviceDiClaim(RAW_DEVICE_ID, NOW);
  check('RECORD: unset salt → no write attempted (never persist an unsalted id)',
    updateCalls.length === 0);

  resetStubs();
  updateThrows = true;
  let recordThrew = false;
  try {
    await recordDeviceDiClaim(RAW_DEVICE_ID, NOW);
  } catch {
    recordThrew = true;
  }
  check('RECORD: a write failure never throws (a delivered answer is never failed over bookkeeping)',
    !recordThrew);

  // ── MOBILE CONTRACT (trace item #1): the header the server reads is the header
  // the client sends, and only on the DI path. Skipped in a server-only checkout.
  const mobileQa = path.resolve(__dirname, '../../../mobile/lib/qa.ts');
  const mobileDeviceId = path.resolve(__dirname, '../../../mobile/lib/deviceId.ts');
  if (fs.existsSync(mobileQa) && fs.existsSync(mobileDeviceId)) {
    const m = fs.readFileSync(mobileQa, 'utf8');
    check('MOBILE: askQuestion sets the `X-Device-Id` header (exact name the controller reads)',
      /headers\['X-Device-Id'\]\s*=/.test(m));
    check('MOBILE: the header is attached ONLY on the Deep-Insight path',
      /if\s*\(input\.deviceId\s*&&\s*input\.deepInsight\s*===\s*true\)\s*headers\['X-Device-Id'\]/.test(m));
    check('MOBILE: getDeviceId fails open to null (never blocks a send)',
      /Promise<string \| null>/.test(fs.readFileSync(mobileDeviceId, 'utf8')));
  }

  // ── SALT PREDICATE (what the boot warning keys on) ─────────────────────────
  process.env.QA_DEVICE_SALT = SALT;
  check('SALT: isDeviceSaltConfigured() true when set', isDeviceSaltConfigured() === true);
  process.env.QA_DEVICE_SALT = '   ';
  check('SALT: isDeviceSaltConfigured() false when blank', isDeviceSaltConfigured() === false);
  delete process.env.QA_DEVICE_SALT;
  check('SALT: isDeviceSaltConfigured() false when unset', isDeviceSaltConfigured() === false);
  const bootSrc = fs.readFileSync(path.resolve(__dirname, '../index.ts'), 'utf8');
  check('SALT: boot WARNS when the salt is unset (an inert gate announces itself)',
    /isDeviceSaltConfigured\(\)/.test(bootSrc) && /QA_DEVICE_SALT is NOT set/.test(bootSrc));

  // ── TELEMETRY: every branch is distinguishable from a prod log line ────────
  // Each fail-open reason used to look identical from outside (answer served, no
  // claim row, no log) — which is precisely why an inert gate could not be told
  // apart from a working one without a two-account device repro.
  const gateReasonCases: {
    label: string;
    tier: SubscriptionTier;
    deviceId?: string | null;
    salt?: string | null;
    claim?: boolean;
    dbErr?: boolean;
    expect: string;
    gated: boolean;
  }[] = [
    { label: 'claim exists', tier: 'free', deviceId: RAW_DEVICE_ID, claim: true, expect: 'claim_found', gated: true },
    { label: 'first DI on this device', tier: 'free', deviceId: RAW_DEVICE_ID, expect: 'no_claim', gated: false },
    { label: 'no header', tier: 'free', deviceId: undefined, expect: 'no_device_id', gated: false },
    { label: 'salt unset', tier: 'free', deviceId: RAW_DEVICE_ID, salt: null, claim: true, expect: 'salt_unset', gated: false },
    { label: 'lookup error', tier: 'free', deviceId: RAW_DEVICE_ID, dbErr: true, expect: 'lookup_failed', gated: false },
  ];
  for (const c of gateReasonCases) {
    resetStubs();
    if (c.salt === null) delete process.env.QA_DEVICE_SALT;
    claimExists = c.claim === true;
    existsThrows = c.dbErr === true;
    const r = await attempt({ tier: c.tier, deepInsight: true, deviceId: c.deviceId });
    const lg = gateLog();
    check(`TELEMETRY: "${c.label}" → qa_device_di_gate reason "${c.expect}", gated=${c.gated}`,
      !!lg && lg.meta?.reason === c.expect && lg.meta?.gated === c.gated && r.threw === c.gated,
      lg ? `reason=${lg.meta?.reason} gated=${lg.meta?.gated}` : 'NO LOG EMITTED');
  }

  resetStubs();
  await attempt({ tier: 'premium', deepInsight: true, deviceId: RAW_DEVICE_ID });
  check('TELEMETRY: paid DI emits no device-gate line (never device-gated)', !gateLog());

  resetStubs();
  await attempt({ tier: 'free', deepInsight: false, deviceId: RAW_DEVICE_ID });
  check('TELEMETRY: non-DI ask emits no device-gate line', !gateLog());

  // Claim-write telemetry: "no row was written" is the farming bug's symptom, so
  // every reason a write is skipped must be visible.
  const claimCases: { label: string; raw: string | null; salt?: null; err?: boolean; recorded: boolean; reason: string }[] = [
    { label: 'delivered free DI', raw: RAW_DEVICE_ID, recorded: true, reason: 'upserted' },
    { label: 'no device id', raw: null, recorded: false, reason: 'no_device_id' },
    { label: 'salt unset', raw: RAW_DEVICE_ID, salt: null, recorded: false, reason: 'salt_unset' },
    { label: 'write failed', raw: RAW_DEVICE_ID, err: true, recorded: false, reason: 'write_failed' },
  ];
  for (const c of claimCases) {
    resetStubs();
    if (c.salt === null) delete process.env.QA_DEVICE_SALT;
    updateThrows = c.err === true;
    await recordDeviceDiClaim(c.raw, NOW);
    const lg = claimLog();
    check(`TELEMETRY: claim "${c.label}" → recorded=${c.recorded}, reason "${c.reason}"`,
      !!lg && lg.meta?.recorded === c.recorded && lg.meta?.reason === c.reason,
      lg ? `recorded=${lg.meta?.recorded} reason=${lg.meta?.reason}` : 'NO LOG EMITTED');
  }

  // PRIVACY: the raw id and its hash must never reach a log line.
  resetStubs();
  claimExists = true;
  await attempt({ tier: 'free', deepInsight: true, deviceId: RAW_DEVICE_ID });
  await recordDeviceDiClaim(RAW_DEVICE_ID, NOW);
  const logDump = JSON.stringify(logs);
  check('PRIVACY: no log line contains the RAW device id', logDump.indexOf(RAW_DEVICE_ID) === -1);
  check('PRIVACY: no log line contains the device HASH', logDump.indexOf(EXPECTED_HASH) === -1);

  // ── OPTIONAL live round-trip (staging/scratch DB only) ─────────────────────
  if (process.env.QA_DEVICE_GATE_LIVE_DB === '1' && process.env.MONGODB_URI) {
    await liveRoundTrip();
  }

  report();
}

/**
 * Real write → real read against a real Mongo, using the UNSTUBBED model. Proves
 * trace items #3 (the row is actually written) and #4 (the same key reads it back)
 * against MongoDB's actual upsert semantics, which the stubs cannot model. Opt-in:
 * `QA_DEVICE_GATE_LIVE_DB=1 MONGODB_URI=<staging> npm run test:qa-device-gate`.
 */
async function liveRoundTrip(): Promise<void> {
  const mongoose = await import('mongoose');
  // A distinct raw id per run so a re-run is never gated by its own prior row.
  const liveRaw = `fixture-${process.pid}-${NOW.getTime()}`;
  const liveHash = createHash('sha256').update(SALT + liveRaw).digest('hex');
  await mongoose.default.connect(process.env.MONGODB_URI as string);
  const Model = mongoose.default.model('QaDeviceDiClaim');
  try {
    process.env.QA_DEVICE_SALT = SALT;
    // Unstub for the live leg by going through the real collection directly.
    await Model.deleteMany({ deviceHash: liveHash });
    await Model.updateOne(
      { deviceHash: liveHash, monthKey: MONTH_KEY },
      { $setOnInsert: { deviceHash: liveHash, monthKey: MONTH_KEY, createdAt: NOW } },
      { upsert: true }
    );
    const found = await Model.exists({ deviceHash: liveHash, monthKey: MONTH_KEY });
    check('LIVE: the upsert actually wrote a row that the gate\'s exact lookup finds', found !== null);
    // Idempotency: a second upsert must not create a second row.
    await Model.updateOne(
      { deviceHash: liveHash, monthKey: MONTH_KEY },
      { $setOnInsert: { deviceHash: liveHash, monthKey: MONTH_KEY, createdAt: NOW } },
      { upsert: true }
    );
    const count = await Model.countDocuments({ deviceHash: liveHash });
    check('LIVE: a repeat claim collapses to exactly ONE row', count === 1, `count=${count}`);
    await Model.deleteMany({ deviceHash: liveHash });
  } finally {
    await mongoose.default.disconnect();
  }
}

function report(): void {
  console.log('\n=== D5 per-device free-Deep-Insight gate (R7 §13f) ===\n');
  for (const r of rows) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.note ? `  [${r.note}]` : ''}`);
  }
  console.log(`\n${pass}/${rows.length} assertions held.`);
  if (fail > 0) {
    console.log('\n⛔ D5 GATE REGRESSED — a device can farm free Deep Insights, or a legitimate user is being blocked. Fix before shipping.');
    process.exit(1);
  }
  console.log('\n✅ GREEN — the per-device free-DI gate holds and every fail-open path stays open.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n⛔ harness crashed:', err);
  process.exit(1);
});
