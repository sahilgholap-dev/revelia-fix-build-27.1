/**
 * ai-generation-log.check.ts — `P99`. THE FACE/PALM GENERATION LOG, AND ITS SWALLOW.
 *
 * Run:  npm run check:ailog          (from server/)
 *
 * ── 🔴 WHY THE SWALLOW IS THE THING WORTH TESTING ──────────────────────────────────────────
 *
 * `logAiGeneration` is fire-and-forget on the READING path. It is invoked `void`, which means
 * nothing awaits it and nothing catches it — so if it can ever reject, the rejection escapes as
 * an unhandled promise rejection, and on a Node process configured to exit on those it takes
 * the server down. **A logging write that can kill a reading is worse than no logging.**
 *
 * 🔴 AND IT IS EXACTLY THE SHAPE NOBODY NOTICES: Mongo is healthy in development, healthy in QA,
 *    and the failure only appears under the conditions that already make a request fragile —
 *    a replica-set election, a connection-pool exhaustion, a disk-full primary. The code path
 *    that must hold under those is the one that is never exercised under them.
 *
 * ⚠️ THE OWNER ASKED FOR THIS TO BE VERIFIED EXPLICITLY RATHER THAN ARGUED, so this file does not
 *    read the source and conclude that a `try` exists. **It makes the write fail, in both ways a
 *    write can fail, and observes what escapes** — including registering an `unhandledRejection`
 *    listener, because "it did not throw" and "it did not leak a rejection" are two claims and
 *    only one of them is visible to a `try/catch` around the call.
 *
 * 🔴 THIS IS ALSO `O-115`'s SHAPE AVOIDED ON PURPOSE. It would have been easy to copy the
 *    swallow's logic into a fixture and assert the copy behaves. That is precisely the defect
 *    `nameUpdateRateLimit.smoke.ts` carried through three occurrences. **This file INVOKES the
 *    real exported function against the real model object.** The only thing it fakes is Mongo.
 *
 * ── PART 2 — THE CALL SITES ────────────────────────────────────────────────────────────────
 *
 * A source-level assertion that both new call sites exist and are `void`-prefixed. That half IS
 * a grep and is labelled as one: it can prove the row is written and cannot prove it is correct.
 */
import * as fs from 'fs';
import * as path from 'path';
import { AiGeneration } from '../models/AiGeneration';
import { logAiGeneration } from '../services/aiGeneration.service';

let violations = 0;
const say = (s: string) => console.log(s);
const ok = (label: string, good: boolean, why: string) => {
  say(`  ${label.padEnd(52)} ${good ? '  OK' : 'FAIL'}${good ? '' : '   🔴'}`);
  if (!good) {
    say(`    🔴 ${why}`);
    violations++;
  }
};

const RECORD = {
  surface: 'face',
  promptVersion: 'face.v1',
  model: 'claude-sonnet-5',
  fellBack: false,
  stopReason: 'end_turn',
  usage: { inputTokens: 1, outputTokens: 1 },
  emDashesRemoved: 0,
};

async function main() {
  say('── ai-generation-log ──');

  // ── 1 · THE SWALLOW, MEASURED IN THREE FAILURE MODES ─────────────────────────────────────
  const leaked: unknown[] = [];
  const onLeak = (reason: unknown) => leaked.push(reason);
  process.on('unhandledRejection', onLeak);

  const realCreate = (AiGeneration as any).create;

  // (a) the ordinary case — the driver returns a rejected promise
  (AiGeneration as any).create = () => Promise.reject(new Error('simulated: no primary'));
  let threw: unknown = null;
  try {
    await logAiGeneration(RECORD as any);
  } catch (e) {
    threw = e;
  }
  ok('rejected write is swallowed', threw === null,
      'A REJECTED MONGO WRITE ESCAPED `logAiGeneration`. It is invoked `void` on the reading ' +
      'path, so nothing catches this — the rejection becomes unhandled and can take the process ' +
      'down during exactly the outage that caused it.');

  // (b) 🔴 THE ONE A `try { await }` ALONE DOES NOT COVER: a SYNCHRONOUS throw before any promise
  //     exists. Mongoose can throw on a malformed document before it ever reaches the driver, and
  //     a swallow written as `.catch()` on the returned promise would miss it entirely.
  (AiGeneration as any).create = () => { throw new Error('simulated: sync validation throw'); };
  threw = null;
  try {
    await logAiGeneration(RECORD as any);
  } catch (e) {
    threw = e;
  }
  ok('synchronous throw is swallowed', threw === null,
      'A SYNCHRONOUS THROW ESCAPED. A `.catch()`-shaped swallow catches a rejected promise and ' +
      'NOT a function that throws before returning one. The `try` must enclose the CALL.');

  // (c) the happy path still resolves, so (a) and (b) are not passing because the function is inert
  let created = 0;
  (AiGeneration as any).create = async () => { created++; return {}; };
  await logAiGeneration(RECORD as any);
  ok('the happy path actually writes', created === 1,
      'THE SWALLOW PASSES BECAUSE THE FUNCTION DOES NOTHING. A guard that always succeeds by ' +
      'never acting is the empty-protected-side failure, and it would make (a) and (b) vacuous.');

  (AiGeneration as any).create = realCreate;

  // Give any escaped rejection a turn of the event loop to surface before we read the list.
  await new Promise(r => setImmediate(r));
  process.off('unhandledRejection', onLeak);
  ok('no unhandled rejection leaked', leaked.length === 0,
      `${leaked.length} REJECTION(S) ESCAPED TO THE PROCESS. "It did not throw" and "it did not ` +
      'leak" are two different claims — a swallow that re-raises asynchronously passes the first ' +
      'and fails this one, and only this one matches how the reading path actually calls it.');

  // ── 2 · THE CALL SITES — a grep, and labelled as one ──────────────────────────────────────
  say('  (call sites — this half is a grep: it proves the row is WRITTEN, not that it is right)');
  const src = fs.readFileSync(
    path.resolve(__dirname, '..', 'services', 'claude.service.ts'), 'utf8');
  for (const [label, re] of [
    ['face row', /void logAiGeneration\(\{[\s\S]{0,400}?surface: 'face'/],
    ['palm row', /void logAiGeneration\(\{[\s\S]{0,400}?surface: 'palm'/],
    ['face version tag', /promptVersion: traitsDriven \? FACE_PROMPT_VERSION/],
    ['palm version tag', /promptVersion: traitsDriven \? PALM_PROMPT_VERSION/],
  ] as [string, RegExp][]) {
    ok(label, re.test(src),
       `\`${label}\` IS NOT IN claude.service.ts. P99 exists because face and palm produced NO ` +
       'ai_generations row at all, which made every per-surface cost figure wrong by the two ' +
       'most expensive calls in the app.');
  }

  // 🔴 AND THE ONE THAT MATTERS MOST: both must be `void`-prefixed. An AWAITED log write puts a
  //    database round trip on the reading's critical path and, worse, an awaited rejection would
  //    be caught by the enclosing `catch` and re-logged as a JSON PARSE FAILURE — a logging
  //    outage would masquerade as a model defect.
  const awaited = /(?<!void )(?<!\. )await logAiGeneration\(/.test(src);
  ok('never awaited', !awaited,
     '`logAiGeneration` IS AWAITED SOMEWHERE. It must stay fire-and-forget: an await puts a DB ' +
     'round trip on the reading path, and inside the try/catch at these two sites a logging ' +
     'failure would be re-reported as a json_parse_error.');

  say(`  ${'ai-generation-log'.padEnd(52)} ${violations ? String(violations) + ' finding(s)   🔴' : 'clean'}`);
  process.exit(violations ? 1 : 0);
}

main().catch(e => {
  console.error('  🔴 THE CHECK ITSELF THREW:', e);
  process.exit(1);
});
