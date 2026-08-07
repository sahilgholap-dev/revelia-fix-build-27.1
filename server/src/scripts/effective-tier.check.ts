/**
 * effective-tier.check.ts — EVERY DIRECT `subscription.tier` READ IS A DECLARED ONE.
 *
 * Run:  npm run check:tier          (from server/)
 *
 * ── 🔴 WHY A GATE AND NOT A CODE REVIEW ────────────────────────────────────────────────────
 *
 * `getEffectiveTier(user)` resolves the tier a user should be gated at RIGHT NOW: the higher
 * rank of their BILLING tier and any live complimentary grant. `user.subscription.tier` is only
 * ever billing truth. The two agree for every ordinary paying account and differ for exactly the
 * accounts nobody tests with — comps, influencer grants, the owner's own account.
 *
 * 🔴 SO A SITE THAT READS THE RAW FIELD IS CORRECT IN DEVELOPMENT, CORRECT IN QA, CORRECT FOR
 *    99% OF PRODUCTION, AND WRONG FOR THE PEOPLE WHOSE ACCESS WAS DELIBERATELY GRANTED. It has
 *    no type error, no crash, no failing request — the user is simply quietly given less than
 *    they were promised. That is a defect class no test in this repo can see and no reviewer
 *    reliably catches, because the correct and incorrect lines are one word apart.
 *
 * P88 was its THIRD occurrence. This file is the response.
 *
 * ── WHAT IT ASSERTS ────────────────────────────────────────────────────────────────────────
 *
 * Every `.tier` read or write reachable from `subscription` in `src/` is matched against the
 * table below and must be DECLARED with a reason. A new one — anywhere — fails the run.
 * 🔴 THE DEFAULT IS FAILURE, WHICH IS THE ONLY DIRECTION THAT WORKS HERE. An allow-list that
 *    grew silently would be a rule that stops guarding after its first unreviewed addition.
 *
 * ── ⚠️ THREE PROPERTIES, EACH ONE ALREADY PAID FOR ELSEWHERE IN THIS PROGRAMME ─────────────
 *
 * 1. IT READS THE CODE, NOT THE COMMENTS. `subscriptionTier.ts`'s own doc-block says
 *    "subscription.tier" three times in prose; without stripping, this rule would report the
 *    file that DEFINES the resolver as its worst offender, and the natural fix would be to
 *    widen the allow-list until the rule guarded nothing.
 * 2. THE ALLOW-LIST IS KEYED ON FILE + AN EXACT COUNT, never a line number. A line-numbered
 *    list rots on the first edit above it; a count moves the moment a site is added, which is
 *    the event this exists to catch.
 * 3. IT ALSO ASSERTS A FLOOR ON `getEffectiveTier` CALL SITES. A rule whose protected side is
 *    empty guards nothing — and deleting every call while leaving the raw reads declared would
 *    otherwise read green.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

/** Length-preserving comment blank-out, so an offset in one projection indexes the other. */
function stripComments(s: string): string {
  let out = '';
  let i = 0;
  let mode: 'code' | 'line' | 'block' | 'sq' | 'dq' | 'tpl' = 'code';
  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && n === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (c === "'") mode = 'sq';
      else if (c === '"') mode = 'dq';
      else if (c === '`') mode = 'tpl';
      out += c; i++; continue;
    }
    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += c; i++; continue; }
      out += c === '\r' ? c : ' '; i++; continue;
    }
    if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; out += '  '; i += 2; continue; }
      out += c === '\n' || c === '\r' ? c : ' '; i++; continue;
    }
    // inside a string literal — copied verbatim; a quoted 'subscription.tier' is a real path
    if (c === '\\') { out += s.slice(i, i + 2); i += 2; continue; }
    if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"') || (mode === 'tpl' && c === '`')) mode = 'code';
    out += c; i++;
  }
  return out;
}

interface Declared {
  file: string;
  count: number;
  kind: 'WRITE' | 'BILLING TRUTH' | 'RESOLVER' | 'DIAGNOSTIC';
  why: string;
}

/**
 * 🔴 THE DECLARED SET. Each row states WHY the raw field is the right question there.
 *    "It has always been like that" is not one of the kinds, deliberately.
 */
const DECLARED: Declared[] = [
  {
    file: 'utils/subscriptionTier.ts', count: 3, kind: 'RESOLVER',
    why: 'the resolver itself — one read of the billing tier and two of `comp.tier` (the guard ' +
         'and the binding). If this row is ever not the last word on the subject, nothing else ' +
         'in this table is either',
  },
  {
    file: 'services/webhook.service.ts', count: 4, kind: 'BILLING TRUTH',
    why: 'the RevenueCat webhook is the ONLY writer of billing truth, and it reads before/after ' +
         'to detect an upgrade. An effective tier here would make a live comp look like a ' +
         'purchase and fire the upgrade path on a grant',
  },
  {
    file: 'services/revenuecat.service.ts', count: 1, kind: 'WRITE',
    why: 'the sync write. Same reasoning as the webhook: this is the field being SET',
  },
  {
    file: 'routes/internal.routes.ts', count: 1, kind: 'WRITE',
    why: 'the internal direct grant — the SECOND grant mechanism, which writes the billing tier ' +
         'rather than a comp. Both mechanisms resolve through `getEffectiveTier` on read',
  },
  {
    file: 'scripts/updateTestAccounts.ts', count: 1, kind: 'WRITE',
    why: 'the test-account backfill writes the same direct grant',
  },
  {
    file: 'scripts/grant-comp-tier.ts', count: 3, kind: 'DIAGNOSTIC',
    why: 'the comp CLI prints billing tier and comp tier SEPARATELY, beside the effective one it ' +
         'already computes. Collapsing them would remove the only place the two are visible at once',
  },
  {
    file: 'controllers/subscription.controller.ts', count: 0, kind: 'BILLING TRUTH',
    why: 'ZERO, and asserted as zero on purpose (2026-08-06). Both endpoints return ' +
         '`getEffectiveTier`; the billing-truth fields this controller still surfaces verbatim ' +
         'are `expiresAt` / `productId` / `willRenew`, which are not tiers. A RISE here means a ' +
         "response field went back to reporting billing truth under the key its sibling uses " +
         'for entitlement — P88 exactly',
  },
  {
    file: 'middleware/name-update-rate-limit.middleware.ts', count: 0, kind: 'BILLING TRUTH',
    why: 'ZERO. This is P88 itself — the site that read the raw field and gave comped accounts ' +
         'the free limit. Pinned at zero so it cannot come back',
  },
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.ts$/.test(e.name)) acc.push(path.relative(SRC, p).split(path.sep).join('/'));
  }
  return acc;
}

/**
 * 🔴 ONE EXCLUSION, AND IT IS STRUCTURAL RATHER THAN AN EXEMPTION: this file has to SPELL the
 *    pattern it forbids in order to search for it, so it matches itself. That is the
 *    comment-is-source class arriving inside a regex, and the honest fix is to say so and pin
 *    the exclusion list at exactly one — an allow-list of files that may contain the pattern
 *    would be the beginning of the rule guarding nothing.
 * 🟢 It was found by the rule's own first run, which is the correct way for it to be found.
 */
const SELF = 'scripts/effective-tier.check.ts';
const FILES = walk(SRC).filter(f => f !== SELF);
if (!fs.existsSync(path.join(SRC, SELF))) {
  console.log(`  🔴 THE SELF-EXCLUSION POINTS AT A FILE THAT DOES NOT EXIST (${SELF}).`);
  console.log('     A stale exclusion silently widens the search root back over this file, which');
  console.log('     would then report itself forever. Fix the path, never delete the check.');
  process.exit(1);
}
const CODE = new Map(FILES.map(f => [f, stripComments(fs.readFileSync(path.join(SRC, f), 'utf8'))]));

/**
 * Both spellings of a direct read, and BOTH are needed:
 *   `user.subscription.tier` / `subscription?.tier`  — a property access
 *   `'subscription.tier'`                            — a Mongo update path in a string
 * ⚠️ The string form is why the stripper copies string literals verbatim rather than blanking
 *    them: three of the four WRITE rows above are Mongo paths and would otherwise vanish.
 */
const DIRECT = /subscription(?:\?)?\.tier|['"]subscription\.tier['"]|comp(?:\?)?\.tier/g;

let violations = 0;
const say = (s: string) => console.log(s);

say('── effective-tier ──');

const declaredBy = new Map(DECLARED.map(d => [d.file, d]));
const seen = new Map<string, number>();
for (const f of FILES) {
  const n = (CODE.get(f)!.match(DIRECT) || []).length;
  if (n > 0 || declaredBy.has(f)) seen.set(f, n);
}

for (const d of DECLARED) {
  if (!FILES.includes(d.file)) {
    say(`  🔴 DECLARED FILE IS GONE: ${d.file}`);
    say('     A row pointing at nothing is a rule guarding nothing. Delete the row deliberately,');
    say('     or find where its reads moved to.');
    violations++;
    continue;
  }
  const n = seen.get(d.file) ?? 0;
  const ok = n === d.count;
  say(`  ${d.file.padEnd(52)} ${String(n).padStart(3)}   (exact ${d.count})  ${d.kind}${ok ? '' : '   🔴'}`);
  if (!ok) {
    say(`    🔴 ${d.why}.`);
    say(`    🔴 THE COUNT MOVED (${d.count} -> ${n}). Read the new site and answer ONE question:`);
    say('       does it want the BILLING tier or the EFFECTIVE tier? If effective, call');
    say('       `getEffectiveTier(user)`. If billing, add it to the count above WITH a reason.');
    violations++;
  }
}

for (const [f, n] of seen) {
  if (declaredBy.has(f) || n === 0) continue;
  say(`  🔴 UNDECLARED DIRECT TIER READ  ${f}  (${n} site(s))`);
  say('     Every entitlement decision in this server goes through `getEffectiveTier(user)`.');
  say('     A raw read is right only when the question genuinely is "what is this account');
  say('     BILLED at" — a webhook, a write, or a diagnostic that prints both. Anything else');
  say('     silently under-serves every comped and directly-granted account.');
  violations++;
}

/**
 * 🔴 THE FLOOR. Without it the rule above is satisfiable by deleting the resolver: every raw
 *    read stays declared, every count stays exact, and no entitlement decision consults a comp
 *    at all. Measured at 21 call sites across 12 files on 2026-08-06; the floor is deliberately
 *    below that because the number legitimately moves both ways as controllers are refactored.
 */
const callSites = FILES.reduce(
  (a, f) => a + (CODE.get(f)!.match(/getEffectiveTier\s*\(/g) || []).length, 0
);
const FLOOR = 18;
say(`  ${'getEffectiveTier call sites'.padEnd(52)} ${String(callSites).padStart(3)}   (min ${FLOOR})` +
    (callSites >= FLOOR ? '' : '   🔴'));
if (callSites < FLOOR) {
  say('    🔴 THE PROTECTED SIDE OF THIS RULE HAS EMPTIED OUT. A boundary whose guarded half is');
  say('       gone reads green while guarding nothing — the same shape as an easing boundary with');
  say('       no curves behind it.');
  violations++;
}

say(`  ${'effective-tier'.padEnd(52)} ${violations ? String(violations) + ' finding(s)   🔴' : 'clean'}`);
process.exit(violations ? 1 : 0);
