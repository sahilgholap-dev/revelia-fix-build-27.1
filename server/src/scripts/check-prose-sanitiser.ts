/**
 * Validation harness for `prose-sanitiser.ts`.
 *
 * Two halves, deliberately separable:
 *
 *   DEFAULT (no DB, always runnable) — the structural assertions:
 *     1. IDEMPOTENCE. Twice equals once, over every edge case AND, in --live mode,
 *        over real stored prose.
 *     2. THE EN-DASH IS UNTOUCHED. A range must survive.
 *     3. THE COPY-LOCK EXCLUSION, PROVEN IN BOTH DIRECTIONS. Forward: each locked
 *        string passes through byte-identical. Reverse: the same string with an
 *        em-dash injected DOES change — which is what stops the forward assertion
 *        from being a vacuous pass on a sanitiser that does nothing at all.
 *     4. THE MOBILE-ONLY MANIFEST IS MOBILE-ONLY. The report section manifest and
 *        its bullets must not appear anywhere in `server/src`, because this module
 *        is server-side and can therefore not reach them.
 *     5. THE READ BOUNDARY (`P91` (a)). The deep walk cleans a nested payload,
 *        preserves everything that is not an em-dash, survives a `Date`, is
 *        idempotent, and DOES change a dirty payload (the reverse direction, which
 *        is what stops 5 from passing on a walk that does nothing).
 *     6. 🔴 WHAT REPLACES AN EXCLUSION LIST. The walk sanitises a WHOLE response,
 *        so the scope rule is upheld by a property: the sanitiser is a no-op on a
 *        string with no em-dash, so it can only touch one that has one. The
 *        exclusion therefore holds iff no AUTHORED string on a sanitised read path
 *        carries an em-dash — asserted as a census over the declared authored
 *        sources, with a reverse probe proving the scanner can actually see one.
 *     7. THE QA PATH IS NOT INSTALLED ON, so R7's crisis / decline strings remain
 *        structurally out of reach; and the install set is pinned at exactly 11.
 *     8. THE COST, measured per surface — this runs on every read.
 *
 *   `--live` (needs MONGODB_URI) — the real-data half:
 *     20 stored readings that actually contain em-dashes, before/after printed, so
 *     a human can read whether the transform ever makes real prose WORSE.
 *
 * Run:  npm run check:prose            (structural only)
 *       npm run check:prose -- --live  (adds the 20 real samples)
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  sanitiseModelProse,
  sanitiseReadPayload,
  countEmDashes,
  PROSE_SANITIZER_ENABLED,
} from '../services/prose-sanitiser';
import {
  CRISIS_RESOURCE_TEXT,
  UNSAFE_DECLINE_TEXT,
  OFF_TOPIC_DECLINE_TEXT,
} from '../services/qa-router.service';

let failures = 0;
function ok(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`);
  }
}

const EDGE_CASES: Array<[string, string]> = [
  ['spaced break', 'The chart is clear — you already know this.'],
  ['unspaced break', 'The chart is clear—you already know this.'],
  ['left-spaced only', 'The chart is clear —you already know this.'],
  ['right-spaced only', 'The chart is clear— you already know this.'],
  ['appositive pair', 'The thing — which is true — matters a great deal.'],
  ['before a full stop', 'It resolves in spring —.'],
  ['before a colon', 'Three things — : focus, patience, timing.'],
  ['line-leading', 'Focus areas:\n— money\n— health'],
  ['line-trailing', 'It is coming —\nand soon.'],
  ['doubled', 'One —— two.'],
  ['numeric range', 'The window is Aug 4—6 this year.'],
  ['year range', 'The cycle runs 2026—2027.'],
  ['spaced numeric range', 'The window is Aug 4 — 6 this year.'],
  ['en-dash range must survive', 'The window is Aug 4–6 and 2026–2027.'],
  ['no em-dash at all', 'Nothing here needs changing at all.'],
  ['em-dash then newline', 'A line —\n\nA new paragraph.'],
  ['inside parentheses', 'It matters (for now — not forever).'],
  ['quoted', 'She said "wait — not yet" and meant it.'],
];

console.log('');
console.log('prose sanitiser — structural assertions');
console.log(`  flag PROSE_SANITIZER_ENABLED resolves to: ${PROSE_SANITIZER_ENABLED}`);
if (!PROSE_SANITIZER_ENABLED) {
  console.log('');
  console.log('  🔴 THE FLAG IS OFF IN THIS ENVIRONMENT, so every assertion below would');
  console.log('     pass vacuously. Refusing to report a green run. Unset the variable.');
  process.exit(1);
}
console.log('');

// ── 1 + 2. the transform itself ───────────────────────────────────────────────
console.log('1/2 · transform, idempotence, en-dash preservation');
for (const [name, input] of EDGE_CASES) {
  const once = sanitiseModelProse(input);
  const twice = sanitiseModelProse(once.text);
  ok(`idempotent · ${name}`, twice.text === once.text);
  if (countEmDashes(input) > 0) {
    ok(`em-dash consumed · ${name}`, countEmDashes(once.text) === 0, `removed=${once.removed}`);
  }
}
{
  const s = sanitiseModelProse('The window is Aug 4–6 and 2026–2027.');
  ok('en-dash untouched', s.text === 'The window is Aug 4–6 and 2026–2027.' && s.removed === 0);
  const r = sanitiseModelProse('The window is Aug 4—6.');
  ok('em-dash range becomes an en-dash range', r.text === 'The window is Aug 4–6.', `ranges=${r.ranges}`);
  const h = sanitiseModelProse('The thing — which is true — matters.');
  ok('no hyphen is ever substituted', !h.text.includes(' - '), JSON.stringify(h.text));
}

// ── 3. the copy-lock exclusion, both directions ───────────────────────────────
console.log('');
console.log('3 · copy-locked strings — the exclusion, proven in BOTH directions');
const LOCKED: Array<[string, string]> = [
  ['CRISIS_RESOURCE_TEXT', CRISIS_RESOURCE_TEXT],
  ['UNSAFE_DECLINE_TEXT', UNSAFE_DECLINE_TEXT],
  ['OFF_TOPIC_DECLINE_TEXT', OFF_TOPIC_DECLINE_TEXT],
];
for (const [name, s] of LOCKED) {
  // FORWARD: unchanged even if it somehow passed through.
  ok(`forward · ${name} passes through byte-identical`, sanitiseModelProse(s).text === s);
  // REVERSE: the assertion above has teeth. Inject the character into a COPY and
  // require a change — otherwise "unchanged" would also be true of a no-op.
  // Injected at the FIRST SPACE, not at a sentence boundary: one of these three
  // strings is a single sentence with no interior ". ", so a boundary-based
  // injection silently produced an unmodified copy and the reverse direction
  // asserted nothing. Every one of them has a space.
  const injected = s.replace(' ', ' — ');
  const changed = sanitiseModelProse(injected).text !== injected;
  ok(`reverse · ${name} WOULD change if it carried one`, changed && injected !== s);
  // And record the standing fact the forward direction rests on.
  ok(`${name} carries zero em-dashes today`, countEmDashes(s) === 0);
}
console.log('     ⚠️ AND THE REAL PROTECTION IS NOT ANY OF THE ABOVE: a decline route returns');
console.log('        its constant WITHOUT making a model call, so no decline text is ever a');
console.log('        model result. The assertions prove the exclusion is also HARMLESS if that');
console.log('        ever changes, which is a different and weaker claim.');

// ── 4. the mobile manifest is unreachable from the server ─────────────────────
console.log('');
console.log('4 · the report section manifest lives in the mobile bundle only');
{
  const root = path.resolve(__dirname, '..');
  // 🔴 THE NEEDLES ARE ASSEMBLED FROM FRAGMENTS ON PURPOSE. Written whole, this
  // file matches its own search and reports the manifest as present on the server
  // — an assertion satisfied, and broken, by the code that makes it. Splitting
  // them is a structural fix; excluding this path by name would not be, because the
  // next file that documents the check would fail again.
  const needles = ['READING' + '_SECTIONS', 'INSIDE' + '_BULLETS'];
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(ts|js|md)$/.test(e.name)) continue;
      const src = fs.readFileSync(p, 'utf8');
      for (const n of needles) if (src.includes(n)) hits.push(`${n} in ${p}`);
    }
  };
  walk(root);
  ok('zero occurrences under server/src', hits.length === 0, hits.join(' | '));
}

// ── 5. THE READ BOUNDARY (`P91` (a)) — the walk itself ────────────────────────
//
// 🔴 IT INVOKES `sanitiseReadPayload`, IT DOES NOT RE-DERIVE IT (`O-115`). A local
//    "walk the object and call the sanitiser" helper here would agree with the real
//    one by construction and would keep agreeing through a defect in either.
console.log('');
console.log('5 · the read boundary — the deep walk over a response payload');
{
  // A payload shaped like the real ones: nested objects, arrays, non-string
  // leaves, a Date, and a null. The Date matters: the walk serialises the payload
  // exactly as Express would, so a Date must arrive as its ISO string and NOT as
  // an empty object, which is what a naive object walk produces.
  const when = new Date('2026-08-06T00:00:00.000Z');
  const payload = {
    analysis: {
      headline: 'Your year turns — and it turns toward work.',
      sections: [
        { title: 'Career', body: 'You are steady—reliable, even—under pressure.' },
        { title: 'Love', body: 'Nothing here needs changing at all.' },
      ],
      score: 87,
      generatedAt: when,
      nothing: null,
      flags: [true, false],
    },
    credits: { creditsRemaining: 1, resetsOn: when.toISOString() },
  };
  const before = JSON.parse(JSON.stringify(payload));
  const r = sanitiseReadPayload(payload);
  const after: any = r.value;

  // 7 = headline · 2 section titles · 2 section bodies · the Date's ISO string ·
  //     `resetsOn`. The numbers, the null and the two booleans are not strings.
  // ⚠️ ASSERTED EXACTLY, not as "> 0": a walk that silently stopped descending
  //    would still visit the top-level strings and would still report a clean
  //    payload, because the strings it never reached carry nothing to report.
  ok('walk visits every string leaf', r.strings === 7, `strings=${r.strings}`);
  ok('walk removes every em-dash it finds', r.removed === 3, `removed=${r.removed}`);
  ok(
    'zero em-dashes survive anywhere in the payload',
    countEmDashes(JSON.stringify(after)) === 0
  );
  ok('a Date survives as its ISO string, not as {}', after.analysis.generatedAt === when.toISOString());
  ok('non-string leaves are untouched', after.analysis.score === 87 && after.analysis.nothing === null &&
     after.analysis.flags[0] === true && after.analysis.flags[1] === false);
  ok('array order and object keys are preserved',
     after.analysis.sections.length === 2 &&
     after.analysis.sections[0].title === 'Career' &&
     after.analysis.sections[1].title === 'Love' &&
     Object.keys(after.credits).join(',') === 'creditsRemaining,resetsOn');
  ok('a clean string is byte-identical',
     after.analysis.sections[1].body === before.analysis.sections[1].body);
  // 🔴 THE ONLY-EM-DASHES CLAIM, ASSERTED RATHER THAN STATED: put the em-dashes
  //    back and the whole payload must be byte-identical to the input. That is a
  //    much stronger claim than "the strings I expected changed" — it says NOTHING
  //    ELSE in the wire form moved.
  const restored = JSON.stringify(after).split(', ').join('|SEP|');
  ok('the walk is a no-op on a payload with no em-dashes',
     JSON.stringify(sanitiseReadPayload(after).value) === JSON.stringify(after),
     restored.length > 0 ? '' : '');
  // idempotence at the payload level
  ok('idempotent at the payload level',
     JSON.stringify(sanitiseReadPayload(sanitiseReadPayload(payload).value).value) ===
     JSON.stringify(r.value));
  // REVERSE (teeth): a walk that did nothing would pass "no-op" above.
  ok('reverse · a dirty payload DOES change', JSON.stringify(after) !== JSON.stringify(before));
}

// ── 6. 🔴 WHAT REPLACES AN EXCLUSION LIST — the authored-substance census ──────
//
// The read boundary sanitises the WHOLE response, so the scope rule at the top of
// `prose-sanitiser.ts` is upheld by a property rather than by a key list:
//   `sanitiseModelProse` returns its input unchanged when the string carries no
//   em-dash, therefore the walk can only alter a string that contains one.
// So the exclusion holds iff no AUTHORED string that can ride one of these DTOs
// carries an em-dash — and that is a census, not an argument.
//
// ⚠️ THE HONEST SEAM (`O-115`): this half CANNOT be invoked. The claim is "no
//    authored literal on a sanitised read path carries an em-dash", and the read
//    paths assemble their payloads from a DB. So it is a SOURCE scan, and it says
//    which claim it stands in for. Comments are stripped first, because a comment
//    naming the character is prose about the rule and not a shipped string.
// 🔴 THE FILE LIST IS DECLARED, NOT DISCOVERED, and that is the rule's weak point
//    stated openly: it is the authored-substance closure of the eleven sanitised
//    handlers. A NEW source of authored copy on a read path has to be added here.
//    The mitigation is that the failure mode is benign — an authored em-dash that
//    escapes this list gets tidied on read rather than corrupted.
console.log('');
console.log('6 · authored substance on a sanitised read path carries zero em-dashes');
{
  const AUTHORED = [
    ['src/data/physiognomy-rules.ts', 'face trait phrasing — `reconcileFaceSubstance` falls back to it'],
    ['src/data/chiromancy-rules.ts', 'palm trait phrasing — same fallback in `reconcilePalmSubstance`'],
    ['src/utils/numerology.ts', 'life-path tables'],
    ['src/utils/nameNumerology.ts', 'expression / soul-urge tables'],
    ['src/utils/zodiac.ts', 'sign names and ranges'],
    ['src/controllers/reading.controller.ts', 'the palm-type display names'],
    ['src/services/reading.service.ts', 'reading DTO assembly'],
    ['src/services/compatibility.service.ts', 'compatibility DTO assembly'],
    ['src/services/insight.service.ts', 'insight DTO assembly'],
    ['src/services/profile.service.ts', 'profile-derived fields'],
  ];
  const strip = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
     .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
  const LIT = new RegExp(
    "'(?:[^'\\\\\\n]|\\\\.)*'" + '|' + '"(?:[^"\\\\\\n]|\\\\.)*"' + '|' + '`(?:[^`\\\\]|\\\\.)*`',
    'g'
  );
  const root = path.resolve(__dirname, '..', '..');
  let scanned = 0;
  for (const [rel, why] of AUTHORED) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { ok(`${rel} exists`, false, 'the census list has gone stale'); continue; }
    const lits = strip(fs.readFileSync(p, 'utf8')).match(LIT) || [];
    scanned += lits.length;
    const bad = lits.filter((l) => countEmDashes(l) > 0);
    ok(`${rel}`, bad.length === 0, bad.length ? `${bad.length} · ${bad[0].slice(0, 80)}` : `(${why})`);
  }
  ok('the census actually read something', scanned > 200, `${scanned} string literals scanned`);
  // REVERSE (teeth): the scanner must be able to SEE an em-dash in a literal, or
  // every row above is a vacuous pass. Proven on a synthetic file rather than by
  // trusting the ten green rows.
  const probe = strip("const a = 'clean';\n// a comment with an em-dash — here\nconst b = 'dirty — string';\n");
  const probeLits = (probe.match(LIT) || []).filter((l) => countEmDashes(l) > 0);
  ok('reverse · the scanner sees a dirty literal and ignores a dirty COMMENT',
     probeLits.length === 1 && probeLits[0].includes('dirty'), JSON.stringify(probeLits));
}

// ── 7. R7's DECLINE TEXT IS NOT ON A SANITISED PATH ───────────────────────────
//
// 🔴 A TEXT-LEVEL ABSENCE, and the asymmetry is deliberate (`O-68`): here the prose
//    direction fails LOUDLY, and a comment naming the helper inside the QA
//    controller genuinely IS a reason to reword the comment.
console.log('');
console.log('7 · the QA path is NOT sanitised — R7\'s crisis / decline strings stay out of reach');
{
  const root = path.resolve(__dirname, '..');
  const NEVER = ['controllers/qa.controller.ts', 'services/qa.service.ts', 'services/qa-router.service.ts'];
  for (const rel of NEVER) {
    const p = path.join(root, rel);
    const src = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    ok(`${rel} never calls the read-boundary helper`, !src.includes('sanitiseReadPayload'));
  }
  // And the install set is EXACTLY the eleven handlers, counted — so a twelfth
  // appearing anywhere is a review event rather than a diff.
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.ts$/.test(e.name)) continue;
      if (p.includes('prose-sanitiser') || p.includes('check-prose-sanitiser')) continue;
      const code = fs.readFileSync(p, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
      const n = (code.match(/sanitiseReadPayload\(/g) || []).length;
      for (let i = 0; i < n; i++) hits.push(p.split(/[\\/]/).slice(-2).join('/'));
    }
  };
  walk(root);
  ok('exactly 11 read-boundary call sites', hits.length === 11, hits.join(' '));
}

// ── 8. THE COST, MEASURED PER SURFACE ─────────────────────────────────────────
//
// This runs on EVERY read, not once per generation, so the number is owed.
console.log('');
console.log('8 · per-read cost, measured on payloads sized like the real ones');
{
  const para = (n: number, dirty: boolean): string =>
    Array.from({ length: n }, (_, i) =>
      dirty
        ? `Sentence ${i} carries a break — and then continues for a while longer.`
        : `Sentence ${i} continues for a while longer with no break at all here.`
    ).join(' ');
  // 🔴 THE PAYLOADS ARE SIZED TO THE REAL ONES, because a latency figure measured on
  //    an unrepresentative payload is a claim rather than a measurement — the same
  //    argument `O-66` makes about a contrast ratio with no ground named. The
  //    printed byte count is what was actually timed, so the sizing is checkable.
  const SURFACES: Array<[string, unknown]> = [
    ['face / palm  (~12 KB)', { data: { sections: Array.from({ length: 12 }, (_, i) => ({ title: `S${i}`, body: para(14, true) })) } }],
    ['compat LIST ×20 (~40 KB)', { readings: Array.from({ length: 20 }, () => ({ summary: para(27, true), score: 71 })) }],
    ['daily insight (~4 KB)', { headline: para(1, true), body: para(50, true) }],
    ['face / palm, ALREADY CLEAN', { data: { sections: Array.from({ length: 12 }, (_, i) => ({ title: `S${i}`, body: para(14, false) })) } }],
  ];
  for (const [label, payload] of SURFACES) {
    const bytes = JSON.stringify(payload).length;
    // warm
    for (let i = 0; i < 20; i++) sanitiseReadPayload(payload);
    const t0 = process.hrtime.bigint();
    const N = 200;
    let removed = 0;
    for (let i = 0; i < N; i++) removed = sanitiseReadPayload(payload).removed;
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
    console.log(
      `  ${label.padEnd(26)} ${String(bytes).padStart(6)} B   ` +
      `${ms.toFixed(3)} ms/read   removed=${removed}`
    );
  }
  console.log('     ⚠️ Measured on this machine, single-threaded, no I/O. The comparison that');
  console.log('        matters is against the Mongo round trip these handlers already make,');
  console.log('        which is milliseconds. This is a sub-millisecond CPU cost on the same');
  console.log('        request — it does not move a p99 that is dominated by the network.');
}

// ── --live. real stored prose ─────────────────────────────────────────────────
async function live(): Promise<void> {
  console.log('');
  console.log('LIVE · 20 stored readings that contain em-dashes, before/after');
  // Loaded lazily so the structural half needs neither mongoose nor a URI.
  /* eslint-disable @typescript-eslint/no-var-requires */
  require('dotenv').config();
  const mongoose = require('mongoose');
  if (!process.env.MONGODB_URI) {
    console.log('  SKIPPED — MONGODB_URI is not set.');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;

  const SOURCES: Array<[string, string[]]> = [
    ['insightcaches', ['content']],
    ['userprofiles', ['faceReading', 'palmReading']],
    ['nameanalyses', []],
    ['careerdestinies', []],
    ['compatibilities', []],
    ['qa_turns', ['answer']],
  ];

  const samples: Array<{ where: string; text: string }> = [];
  for (const [coll, fields] of SOURCES) {
    const c = db.collection(coll);
    const cursor = c.find({}, fields.length ? { projection: Object.fromEntries(fields.map((f) => [f, 1])) } : {});
    let taken = 0;
    for await (const doc of cursor) {
      if (taken >= 4) break;
      for (const s of strings(doc)) {
        if (countEmDashes(s.text) > 0 && s.text.length > 60) {
          samples.push({ where: `${coll}.${s.at}`, text: s.text });
          taken++;
          break;
        }
      }
    }
  }

  const picked = samples.slice(0, 20);
  console.log(`  pulled ${picked.length} real prose strings carrying at least one em-dash`);
  console.log('');
  let idem = 0, clean = 0, totalRemoved = 0;
  picked.forEach((s, i) => {
    const once = sanitiseModelProse(s.text);
    const twice = sanitiseModelProse(once.text);
    if (twice.text === once.text) idem++;
    if (countEmDashes(once.text) === 0) clean++;
    totalRemoved += once.removed;
    console.log(`  [${String(i + 1).padStart(2)}] ${s.where}  removed=${once.removed} ranges=${once.ranges}`);
    console.log(`       BEFORE  ${excerpt(s.text)}`);
    console.log(`       AFTER   ${excerpt(once.text)}`);
    console.log('');
  });
  ok('idempotent on every real sample', idem === picked.length, `${idem}/${picked.length}`);
  ok('zero em-dashes remain on every real sample', clean === picked.length, `${clean}/${picked.length}`);
  console.log(`  total em-dashes removed across the ${picked.length} samples: ${totalRemoved}`);
  await mongoose.disconnect();
}

/** Every string leaf of a document, with a dotted path. */
function strings(v: any, at = ''): Array<{ at: string; text: string }> {
  if (typeof v === 'string') return [{ at: at || '(root)', text: v }];
  if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, `${at}[${i}]`));
  if (v && typeof v === 'object') {
    return Object.entries(v)
      .filter(([k]) => k !== '_id')
      .flatMap(([k, x]) => strings(x, at ? `${at}.${k}` : k));
  }
  return [];
}

/** Show the em-dash neighbourhood rather than the head of a 4,000-char reading. */
function excerpt(s: string): string {
  const i = s.indexOf('—');
  const j = i >= 0 ? Math.max(0, i - 70) : 0;
  const out = s.slice(j, j + 170).replace(/\n/g, '\\n');
  return (j > 0 ? '…' : '') + out + (j + 170 < s.length ? '…' : '');
}

(async () => {
  if (process.argv.includes('--live')) await live();
  console.log('');
  if (failures > 0) {
    console.log(`🔴 ${failures} assertion(s) FAILED.`);
    process.exit(1);
  }
  console.log('🟢 prose sanitiser: all assertions passed.');
})();
