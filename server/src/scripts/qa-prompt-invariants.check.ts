/**
 * Q&A prompt/context SAFETY invariant gate (R7 §13c STEP 2) — COMMITTED, STANDING
 * guard. Step 2's context assembler + fixed prompt were verified with an ad-hoc
 * harness; this pins the SAFETY-CRITICAL invariants as a committed regression test
 * (matching the Step 0/1 discipline) so a later refactor can NEVER silently open
 * the FACE gate or leak methodology.
 *
 * Pure + OFFLINE — `qa.prompt.ts` is string assembly (its engine import is
 * type-only), so this needs NO API key, NO DB, NO ephemeris. Deterministic via a
 * fixed `now`.
 *
 * Run: `npm run test:qa-prompt` (from server/). Exit 0 = all invariants hold,
 * 1 = a safety invariant regressed. ⛔ A miss here is a SAFETY regression (face
 * content reachable by a minor, or methodology leaking) — fix before shipping.
 */
import {
  faceBlockAllowed,
  ageFromDob,
  scrubNeverExpose,
  assembleQaContext,
  buildQaSystemPrompt,
  DEFAULT_FACE_GATE,
} from '../prompts/qa.prompt';
import { FeatureContextInput } from '../prompts/shared/feature-context';

const NOW = new Date('2026-07-24T00:00:00Z');
const ADULT_DOB = '1990-01-01'; // age 36 at NOW
const MINOR_DOB = '2015-01-01'; // age 11 at NOW

const PROFILE: FeatureContextInput = { name: 'Test User', moonSign: 'Aries' };

let pass = 0;
let fail = 0;
const rows: { name: string; ok: boolean }[] = [];
function check(name: string, ok: boolean): void {
  rows.push({ name, ok });
  if (ok) pass++; else fail++;
}
function throwsErr(fn: () => unknown): boolean {
  try { fn(); return false; } catch { return true; }
}

// ── FACE gate matrix — the safety core (fail-CLOSED) ─────────────────────────
check('face gate: default (both false) + adult dob → DISALLOWED',
  faceBlockAllowed(DEFAULT_FACE_GATE, ADULT_DOB, NOW) === false);
check('face gate: opt-in only (no adultVerified) + adult dob → DISALLOWED',
  faceBlockAllowed({ faceOptIn: true, adultVerified: false }, ADULT_DOB, NOW) === false);
check('face gate: opt-in + adultVerified + MINOR dob → DISALLOWED (independent DOB guard beats flags)',
  faceBlockAllowed({ faceOptIn: true, adultVerified: true }, MINOR_DOB, NOW) === false);
check('face gate: opt-in + adultVerified + NO dob → DISALLOWED (fail-closed)',
  faceBlockAllowed({ faceOptIn: true, adultVerified: true }, null, NOW) === false);
check('face gate: opt-in + adultVerified + adult dob → ALLOWED',
  faceBlockAllowed({ faceOptIn: true, adultVerified: true }, ADULT_DOB, NOW) === true);

// ── ageFromDob ───────────────────────────────────────────────────────────────
check('ageFromDob: adult ≥ 18', (ageFromDob(ADULT_DOB, NOW) ?? 0) >= 18);
check('ageFromDob: minor < 18', (ageFromDob(MINOR_DOB, NOW) ?? 99) < 18);
check('ageFromDob: missing dob → null', ageFromDob(null, NOW) === null);
check('ageFromDob: invalid dob → null', ageFromDob('not-a-date', NOW) === null);

// ── never-expose scrub (methodology must never ship) ─────────────────────────
check('scrub: THROWS on a §2.6 term ("dasha")', throwsErr(() => scrubNeverExpose('you are in a strong dasha period')));
check('scrub: THROWS on a rule number ("R7")', throwsErr(() => scrubNeverExpose('per R7 this reads favorable')));
check('scrub: ALLOWS benign text', !throwsErr(() => scrubNeverExpose('a good window ahead for this relationship')));

// ── assembler fail-closed integration: minor + both flags + face present → NO face ──
const minorCtx = assembleQaContext({
  profile: PROFILE,
  question: 'How is my year looking?',
  faceGate: { faceOptIn: true, adultVerified: true },
  birthDate: MINOR_DOB,
  faceObservation: {} as never, // never read: gate fails → renderFaceBlock not called
  now: NOW,
});
check('assembler fail-closed: minor dob + both flags + faceObservation → NO FACE block emitted',
  !/face observation/i.test(minorCtx));

// ── graceful absence: chart-only asker ───────────────────────────────────────
const bare = assembleQaContext({ profile: PROFILE, question: 'What about my career?', now: NOW });
check('graceful absence: the question is present', bare.includes('What about my career?'));
check('graceful absence: no literal "undefined" leaks', !bare.includes('undefined'));
check('graceful absence: NUMEROLOGY/TIMING/PALM/FACE blocks all self-omit', !/## (NUMEROLOGY|TIMING|PALM|FACE)/i.test(bare));

// ── §13d-6 follow-up continuity block (present-when-history / absent-when-none) ─
const HISTORY = [
  { question: 'What about my career?', answer: 'Your 10th house suggests steady growth this year.' },
  { question: 'And a move?', answer: 'The months ahead favour a considered relocation.' },
];
const withHist = assembleQaContext({
  profile: PROFILE, question: 'Should I take the offer?', history: HISTORY, now: NOW,
});
check('history present: EARLIER-IN-THIS-CONVERSATION block emitted when prior turns exist',
  /## EARLIER IN THIS CONVERSATION/i.test(withHist));
check('history present: prior Q and A text spliced OLDEST-FIRST',
  withHist.includes('What about my career?') && withHist.includes('steady growth') &&
  withHist.indexOf('What about my career?') < withHist.indexOf('And a move?'));
check('history present: block sits BEFORE the user question',
  withHist.indexOf('## EARLIER IN THIS CONVERSATION') < withHist.indexOf("## THE USER'S QUESTION"));

// absent-when-none — a first question is BYTE-IDENTICAL to the pre-§13d-6 output.
const noHistBaseline = assembleQaContext({ profile: PROFILE, question: 'Should I take the offer?', now: NOW });
const emptyHist = assembleQaContext({ profile: PROFILE, question: 'Should I take the offer?', history: [], now: NOW });
check('history absent: NO block when there are no prior turns',
  !/## EARLIER IN THIS CONVERSATION/i.test(noHistBaseline));
check('history absent: empty history is BYTE-IDENTICAL to no-history (graceful absence)',
  emptyHist === noHistBaseline);

// never-expose scrub STILL applies — to OUR prior ANSWER (methodology leak in our
// own output THROWS, exactly like the TIMING READ block)…
check('history scrub: THROWS on a §2.6 term in a prior ANSWER (our output is scrubbed)',
  throwsErr(() => assembleQaContext({
    profile: PROFILE, question: 'ok?',
    history: [{ question: 'x', answer: 'you are in a strong dasha period' }], now: NOW,
  })));
// …but a technique word in the user's OWN prior question is allowed (the deliberate
// current-question rule — a user may legitimately type a technique word).
check('history scrub: ALLOWS a technique word in a prior QUESTION (never scrub the user)',
  !throwsErr(() => assembleQaContext({
    profile: PROFILE, question: 'ok?',
    history: [{ question: 'what is my dasha?', answer: 'a good window ahead for this' }], now: NOW,
  })));

// ── one fixed prompt, two variables (base shared across all 4 combos) ─────────
const combos = [
  { mode: 'reflective' as const, deepInsight: false },
  { mode: 'reflective' as const, deepInsight: true },
  { mode: 'timing' as const, deepInsight: false },
  { mode: 'timing' as const, deepInsight: true },
];
const prompts = combos.map((c) => buildQaSystemPrompt(c));
check('one fixed prompt: all 4 combos non-empty', prompts.every((p) => p.length > 0));
check('one fixed prompt: shared base (first 400 chars byte-identical across combos)',
  prompts.every((p) => p.slice(0, 400) === prompts[0].slice(0, 400)));

// ── system-prompt continuity directive: additive + byte-identical without history ─
const sysBase = buildQaSystemPrompt({ mode: 'reflective', deepInsight: false });
const sysNoHist = buildQaSystemPrompt({ mode: 'reflective', deepInsight: false, hasHistory: false });
const sysHist = buildQaSystemPrompt({ mode: 'reflective', deepInsight: false, hasHistory: true });
check('system prompt: hasHistory:false is byte-identical to omitting it (graceful absence)',
  sysNoHist === sysBase);
check('system prompt: hasHistory:true appends a CONTINUITY directive',
  sysHist.includes('CONTINUITY') && sysHist.startsWith(sysBase) && sysHist.length > sysBase.length);

// ── Report ───────────────────────────────────────────────────────────────────
console.log('\n=== Q&A prompt/context SAFETY invariants (Step 2) ===\n');
for (const r of rows) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
console.log(`\n${pass}/${rows.length} invariants held.`);
if (fail > 0) {
  console.log('\n⛔ SAFETY INVARIANT REGRESSED — face content reachable when it must not be, or methodology leaking. Fix before shipping.');
  process.exit(1);
}
console.log('\n✅ GREEN — all Step-2 safety invariants hold.');
process.exit(0);
