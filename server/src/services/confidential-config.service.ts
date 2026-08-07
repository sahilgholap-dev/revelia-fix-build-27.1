/**
 * Confidential-config runtime loader — R7 Timing Engine (Build 27), LG1.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────
 * The Timing Engine rule set (§2 formula / carve-outs / scoring / classification /
 * language / never-expose map) is the core Revelia trade secret. Posture (settled,
 * S-R9f/D8): it stays OUT of git and loads AT RUNTIME — never committed to the app
 * repo. `timing-engine.service.ts` reads it fail-closed off the local filesystem
 * (`config/timing/rule-set.json`, gitignored), which is fine for local/harness runs
 * but has NO production source (the dir does not ship in the build). This module is
 * that production source: it fetches the rule set from a PRIVATE R2 bucket over the
 * network and hands it to the engine's in-memory memo at boot.
 *
 * ── SEPARATE LEAST-PRIVILEGE CLIENT (mirrors report-delivery.service.ts) ──────
 * A DISTINCT `R2_TIMING_*` env namespace → a scoped token that can ONLY read the
 * timing-config bucket. It reuses NOTHING from the public-images (`R2_*`) or
 * reports (`R2_REPORTS_*`) creds, so a leak of one creds set can never expose the
 * timing rule set (and vice-versa).
 *
 * ── FAIL-CLOSED + NEVER-ON-DISK + NEVER-LOGGED ────────────────────────────────
 *  • Unconfigured creds / missing object / fetch error / malformed-or-partial JSON
 *    → throw `TimingConfigUnavailableError` (the engine's own type/semantics). The
 *    engine MUST NOT run on a missing or partial rule set — a malformed rule set is
 *    as dangerous as an absent one, so the shape is validated before returning.
 *  • The fetched bytes live ONLY in a module-level in-memory memo (one R2 hit per
 *    process). NEVER written to disk / /tmp, and the rule-set CONTENTS are never
 *    logged — success logs a content-free byte count; failure logs a reason only.
 *    Error messages carry a reason (never the config bytes), and the raw JSON is
 *    never spread into a thrown Error / `.cause` / a logged object. In particular a
 *    JSON.parse failure is re-thrown as a generic reason so a stray config fragment
 *    from the parser's message can never ride into a log line.
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  TimingRuleSet,
  TimingConfigUnavailableError,
  setRuleSet,
} from './timing-engine.service';
import { logger } from '../utils/logger';

/**
 * Least-privilege timing-config endpoint. Supports either `R2_TIMING_ENDPOINT`
 * (full URL) or `R2_TIMING_ACCOUNT_ID` (constructs the cloudflarestorage URL) —
 * the same either-or the public and reports R2 clients accept.
 */
const timingEndpoint =
  process.env.R2_TIMING_ENDPOINT ||
  (process.env.R2_TIMING_ACCOUNT_ID
    ? `https://${process.env.R2_TIMING_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);

const TIMING_BUCKET = process.env.R2_TIMING_BUCKET_NAME || 'revelia-timing';

/** Object key of the rule set within the bucket. Env-overridable; defaults to the
 *  same file name the local filesystem path uses. */
function ruleSetKey(): string {
  return process.env.R2_TIMING_RULESET_KEY || 'rule-set.json';
}

const timingClient = new S3Client({
  region: 'auto',
  endpoint: timingEndpoint,
  credentials:
    process.env.R2_TIMING_ACCESS_KEY_ID && process.env.R2_TIMING_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.R2_TIMING_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_TIMING_SECRET_ACCESS_KEY,
        }
      : undefined,
});

/** True once the timing-config R2 client has an endpoint + real creds. When this is
 *  false the loader is unconfigured (local/dev/harness) and boot uses the engine's
 *  local-filesystem fallback instead of R2. */
export function isTimingConfigConfigured(): boolean {
  return !!(
    timingEndpoint &&
    process.env.R2_TIMING_ACCESS_KEY_ID &&
    process.env.R2_TIMING_SECRET_ACCESS_KEY
  );
}

/** The required TimingRuleSet top-level keys (§2). A fetched object missing ANY of
 *  these is treated as partial/malformed → fail-closed. Names only (safe to log). */
const REQUIRED_RULESET_KEYS: (keyof TimingRuleSet)[] = [
  'carveOut',
  'karyaBhava',
  'scoring',
  'classification',
  'confidence',
  'window',
  'mixed',
  'language',
  'neverExpose',
];

/** Validate the fetched object has every required top-level key as a non-null
 *  object/value. Throws `TimingConfigUnavailableError` naming the FIRST missing key
 *  (a key NAME, never a value) if partial. */
function assertRuleSetShape(obj: unknown): asserts obj is TimingRuleSet {
  if (!obj || typeof obj !== 'object') {
    throw new TimingConfigUnavailableError(
      '[timing-config] fetched rule set is not a JSON object (fail-closed)'
    );
  }
  const rec = obj as Record<string, unknown>;
  for (const k of REQUIRED_RULESET_KEYS) {
    if (rec[k] === undefined || rec[k] === null) {
      throw new TimingConfigUnavailableError(
        `[timing-config] fetched rule set is missing required key "${k}" (partial → fail-closed)`
      );
    }
  }
}

let _loaded: TimingRuleSet | null = null;

/**
 * Fetch + validate the confidential rule set from the private R2 bucket. Memoized
 * per process (one network hit; subsequent calls return the in-memory copy). The
 * bytes are held ONLY in this module-level variable — never written to disk.
 *
 * Throws `TimingConfigUnavailableError` (fail-closed) when the client is
 * unconfigured, the object is missing, the fetch errors, or the JSON is
 * malformed/partial. No trade-secret bytes ever appear in a thrown message or log.
 */
export async function loadConfidentialConfig(): Promise<TimingRuleSet> {
  if (_loaded) return _loaded;

  if (!isTimingConfigConfigured()) {
    throw new TimingConfigUnavailableError(
      '[timing-config] R2_TIMING_* not configured (endpoint/account-id + access key + secret required) — fail-closed'
    );
  }

  const key = ruleSetKey();
  let text: string;
  try {
    const res = await timingClient.send(
      new GetObjectCommand({ Bucket: TIMING_BUCKET, Key: key })
    );
    if (!res.Body) {
      throw new TimingConfigUnavailableError(
        '[timing-config] rule-set object returned an empty body (fail-closed)'
      );
    }
    // v3 sdk-stream mixin — read the object to a string in memory only.
    text = await res.Body.transformToString('utf-8');
  } catch (err: any) {
    if (err instanceof TimingConfigUnavailableError) throw err;
    // Reason ONLY — S3 error name/status, never the fetched bytes (there are none
    // on a fetch failure) and never the raw error chain (no `cause`).
    const reason = err?.name || err?.$metadata?.httpStatusCode || 'fetch failed';
    throw new TimingConfigUnavailableError(
      `[timing-config] could not fetch rule set from R2 (${String(reason)}) — fail-closed`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // NB: do NOT propagate the JSON.parse message — it can embed a fragment of the
    // malformed rule-set bytes (e.g. "Unexpected token … at position …"). Generic
    // reason only, so no trade-secret byte can ride into a log via the error.
    throw new TimingConfigUnavailableError(
      '[timing-config] rule set JSON is malformed (fail-closed)'
    );
  }

  assertRuleSetShape(parsed);
  _loaded = parsed;
  // Content-free: byte count + key NAME only, never the contents.
  logger.info(
    `[timing-config] rule set loaded from R2 (${Buffer.byteLength(text, 'utf8')} bytes, key "${key}")`
  );
  return _loaded;
}

/**
 * Boot-time prefetch (the SYNC/ASYNC seam resolver). Called ONCE at server boot,
 * BEFORE the /api/qa route can serve. Resolves how the engine's in-memory rule-set
 * memo is populated:
 *
 *   • R2 CONFIGURED (prod): fetch + validate via loadConfidentialConfig and push it
 *     into the engine via setRuleSet — the engine's sync loadRuleSet() then returns
 *     this value for every request, with NO engine-logic change. If the fetch/
 *     validation fails this THROWS (fail-closed) — the boot caller logs a loud
 *     content-free warning and lets the server come up; the timing path then
 *     fail-closes PER-REQUEST (per the resolved boot-failure decision), never a
 *     boot hard-fail over a prod-dark feature.
 *   • R2 UNCONFIGURED (local/dev/harness): a NO-OP. The engine's loadRuleSet() reads
 *     the gitignored local filesystem config on first use, exactly as before — so
 *     `npm run test:timing` and local runs keep working unchanged.
 */
export async function initTimingConfig(): Promise<void> {
  if (!isTimingConfigConfigured()) {
    logger.info(
      '[timing-config] R2_TIMING_* unset — Timing Engine will use the local filesystem config (dev/harness). No R2 fetch.'
    );
    return;
  }
  const rs = await loadConfidentialConfig();
  setRuleSet(rs);
  logger.info('[timing-config] Timing Engine rule set initialized from R2.');
}
