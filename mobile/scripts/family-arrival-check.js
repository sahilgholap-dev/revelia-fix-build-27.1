#!/usr/bin/env node
/**
 * family-arrival-check.js — THE ARRIVAL GATE FOR PASS 4's INLINE HALF.
 *
 * ── 🔴 WHY THIS EXISTS: EVERY OTHER RULE IN THIS PROJECT COUNTS REMOVALS ────────────────
 *
 * `no-fontweight` reaching 0 proves every legacy weight is GONE. It says **nothing** about
 * whether the right family ARRIVED. Removal-counting and arrival-counting are different
 * assertions, and until pass 4 every named rule in `token-gate.sh` was removal-shaped.
 *
 * 🔴 THIS IS NOT HYPOTHETICAL — IT CAUGHT A LIVE DEFECT IN PASS 4's OWN OUTPUT. The E4
 * rewrite inferred each site's family from the ramp step co-located on the SAME LINE. Three
 * sites spread `t.txt('display-md').style` on one line and carried the weight on the NEXT
 * line of the same style object, so the rewriter saw "no step", fell through to the
 * weight-derived family, and wrote a Figtree face onto a Literata display step.
 * `no-fontweight` was 0, `--diff` was clean, `--members` was clean and `tsc` was clean.
 *
 * ── WHAT IT ASSERTS ────────────────────────────────────────────────────────────────────
 *
 * For every inline style object that BOTH spreads a ramp step AND names a `fontFamily`:
 * the named family must be a legal outcome of RULE R (codemod-plan §3.6) —
 *
 *   step family is `display` or `quote`  ->  NO explicit fontFamily may be present
 *                                            (the ramp's face is the contract, and no other
 *                                             Literata face ships)
 *   otherwise                            ->  rank(named) >= rank(step family)
 *                                            (a site may add emphasis; it may never remove it)
 *
 * Objects are found by BRACE BALANCE, not by line window — the defect above is precisely what
 * a line-window heuristic cannot see, so this must not use one.
 *
 * ── 🔴 THE className HALF, ADDED IN PASS 5 (O-35) — AND IT FOUND 23 LIVE SITES ──────────
 *
 * This gate shipped in pass 4 covering the INLINE half only, and pass 5's static arrival
 * verification found why that was not enough: `font-display` had **ZERO call sites in the whole
 * app**, and 23 of the 25 `text-display-lg` classNames carried `font-body-bold`. Every
 * `display-lg` heading in the app — §17's "one hero per screen" moment — rendered in FIGTREE.
 *
 * 🔴 §3.6's own words were the cause: *"the className half is simpler … a Tailwind size utility
 *    carries no family, so there is no step-family to reconcile — a pure 1:1 weight->family map
 *    with no judgement at all."* THAT IS THE INVERSION. Because a size utility carries no family,
 *    the className half is the ONLY half where the family MUST be reconciled against the step —
 *    there is nothing else to supply it. The inline half has txt(), which carries the face.
 *
 * So RULE R's serif branch is ASYMMETRIC between the two halves, and both directions are right:
 *   inline    -> DELETE the family   (the txt() spread already carries the step's face)
 *   className -> REPLACE with `font-display` / `font-quote`  (deleting it drops the site onto the
 *                global body default, which is the same defect one step quieter)
 *
 * ── 🔴 THE MISSING-FAMILY HALF, ADDED IN PASS 3a (owner ruling R-1, 2026-08-01) ─────────
 *
 * Pass 5 shipped the className half as a WRONG-family check only, and said so: *"the className
 * rule flags a WRONG family, never a MISSING one … `text-display-lg` with no family utility at
 * all is legal and deliberate: the two such sites hold EMOJI … demanding a family there would be
 * an OVER-find on correct code."*
 *
 * 🔴 THAT WAS TRUE ONLY BECAUSE NO EXCEPTION MECHANISM EXISTED, and it left the gate one step
 *    short of the defect it was written for. O-35's actual mechanism is that **a size utility
 *    carries no family, so on the className path the family utility written at the site IS the
 *    rendered face.** A site that names NO family therefore renders in the global body default —
 *    which is the O-35 defect with the volume turned down, not a different thing. A rule that can
 *    only see `font-body-bold` on a serif step, and not the ABSENCE of any family, is a rule that
 *    would have caught 23 of pass 5's sites and been structurally blind to a 24th.
 *
 * So the assertion is now the one R-1 asks for — **every `text-display-*` / `text-quote`
 * className MUST carry its own family utility** — and the two legal emoji sites are handled the
 * way pass 2a handled exactly this argument for `fontSize`: a **NAMED, IN-FILE, PRINTED `GLYPH`
 * marker**, never a file:line allow-list (§0.1 — a line-numbered list rots) and never a silent
 * widening (§3.0.2.0 — an exception that does not report itself is how a rule gets disarmed).
 * Both numbers print on every run, so the excepted set cannot grow unnoticed.
 *
 * 🔴 THE MARKER IS FOUND BY THE ENCLOSING JSX OPENING TAG, NOT BY A LINE WINDOW. It is written
 *    inside the tag, before the attribute:  `<Text /* GLYPH *\/ className="text-display-lg …">`.
 *    The scan walks back from `className=` to the nearest tag-opening `<` and looks only inside
 *    that span. A line window is the one thing this file must never use (see the pass-4 defect
 *    above); the opening tag is a structural bound and gives the same answer on one line or five.
 *
 * ⚠️ RE-VALIDATED IN BOTH DIRECTIONS per §3.0.2.0 before it was allowed to block: on the tree as
 *    it stood before the markers were added it reported EXACTLY the two known emoji sites — not
 *    "at least" two — and 0 after marking. Removing either marker returns the count to 1.
 *
 * Exits nonzero on any violation. Usage, from mobile/:  node scripts/family-arrival-check.js
 */
const fs = require('fs');
const path = require('path');

const ROOTS = ['app', 'components'];
const t = require(path.resolve(__dirname, '..', 'theme.js'));
const { braceSpans } = require('./lib/source-scan');
const RANK = { body: 0, 'body-semi': 1, 'body-bold': 2 };
const VERBOSE = process.argv.includes('--verbose');

function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p.replace(/\\/g, '/'));
  }
  return acc;
}

// Every `{ … }` object literal in the file, by brace balance, skipping strings and comments.
// 🔴 EXTRACTED TO `scripts/lib/source-scan.js` — `O-91`. The five-line quote skip this used to
//    inline had been copy-pasted into THREE scanners and the same bug was in all three; it was
//    LIVE here and latent in the other two. A fourth paste would be indefensible, so the
//    hazardous logic now has exactly one home. The full measurement is in that module.
const objects = braceSpans;

const STEP_RE = /t\.txt\(\s*['"]([a-z0-9-]+)['"]\s*\)|t\.type\[\s*['"]([a-z0-9-]+)['"]\s*\]/g;
const FAM_RE = /fontFamily\s*:\s*(?:[A-Za-z_$][\w$.]*\s*\?\s*)?t\.family(?:\.([\w-]+)|\[\s*['"]([\w-]+)['"]\s*\])/g;

// ══════════════════════════════════════════════════════════════════════════════════════════════
// 🔴 SUPERSEDED WITHIN THE DAY — AND THE CORRECTION IS THE POINT, SO BOTH HALVES ARE KEPT.
//
//    The block below shipped two REPORT-ONLY counters and argued that the doubt could only be
//    PUBLISHED, because separating a JS string from JSX text "needs a parser, not a scanner."
// 🔴 THAT WAS WRONG, AND IT WAS WRONG IN THE DIRECTION THAT MATTERS: it moved a real defect into a
//    number nobody blocks on. `O-67` says a printed count is not a checked count; publishing the
//    shortfall is the same half-measure one level up — the gate still passes while coverage rots.
// 🟢 IT NEEDED NO PARSER. One line — "a quoted string must close on its own line" — takes
//    unresolvable-by-parse from 4 to 0 and reveals four real pairings. See `objects()` above.
// 🟢 SO THE DOUBT IS NOW ASSERTED, NOT PUBLISHED: `present == checked + no-literal-step`, with the
//    two PARSE-FAILURE buckets at a hard 0 and the one legitimate exclusion ENUMERATED per site.
// 🔴 AND THE `implausible span` COUNTER IS DELETED RATHER THAN KEPT. It was a PROXY for desync;
//    with the desync asserted directly, the three spans that remain are ordinary style objects that
//    are only large because they contain long COMMENTS. A proxy that now measures prose volume
//    would fail on correct code, which is the OVER-finding direction that decommissions a rule.
//    Removing it also shrinks token-gate.sh's report-only register from seven back to five.
// ══════════════════════════════════════════════════════════════════════════════════════════════
//
// ── the superseded reasoning, retained because the MEASUREMENT in it is still the evidence ────
// 🔴 THIS CHECK PRINTED "N checked" AND NEVER PRINTED HOW MANY IT COULD NOT CHECK — 2026-08-04.
//
//    Measured tree-wide the moment the question was asked: **128 inline sites, 113 checked, 15
//    SILENTLY SKIPPED** across the `continue`s below. `O-67` is "a printed count is not a checked
//    count"; an UNPRINTED count is strictly worse, because there is no number to doubt. The four
//    buckets are counted and printed from here on. They are REPORT-ONLY and cannot be driven to
//    zero — see the reason below — so they are enumerated instead, the same shape the two
//    report-only grep rules in token-gate.sh take.
//
// ⚠️ THE BUCKETS ARE NOT ALL THE SAME KIND OF MISS, AND CONFLATING THEM WOULD BE THE SAME ERROR
//    AGAIN. `no-step` (11) is mostly LEGITIMATE indirection — `Button`, `LockShell` and
//    `AstroNumeroBadge` read a step through a VARIABLE key, which no literal pattern can follow,
//    and that is class 5, not a desync. `ambiguous` (1) is the desync bucket proper. `no-object`
//    (3) is a `fontFamily` at module scope. Read the `--verbose` enumeration, never the total.
//
// 🔴 AND THE ROOT CAUSE IS A NEW MEMBER OF THE "A COMMENT IS SOURCE" FAMILY, IN A NEW TOOL AND BY
//    A NEW MECHANISM: **AN APOSTROPHE.** `objects()` above correctly skips comments, but it has no
//    idea what JSX is, so it treats the `'` in ordinary English — in JSX TEXT or in a comment —
//    as a string delimiter. One unmatched apostrophe opens a phantom string that swallows every
//    brace until the next apostrophe, and the innermost-object resolution downstream of it is then
//    whatever the parity happens to be.
//
//    MEASURED, not inferred. `readings/qa.tsx` renders the JSX text `You've used ...`. That single
//    apostrophe desynchronised the scanner, so the two `fontFamily` sites below it both resolved
//    to one 6,040-character span holding three different steps, hit the `>1 step` skip, and were
//    INVISIBLE to the only instrument in the tree that can see a wrong family on an inline step.
//    They became visible again when an unrelated comment added elsewhere in the file happened to
//    RE-BALANCE the parity — which is the whole hazard in one sentence: **whether a real pairing is
//    checked depends on how many apostrophes appear above it.**
//
// ⚠️ WHY IT IS NOT FIXED HERE, AND THE HONEST STATEMENT OF THE LIMIT. Telling a JS string from JSX
//    text needs a parser, not a scanner, and the OVER-finding direction is the one that
//    decommissions a rule (see the 125 false positives recorded just below). So the scanner stays
//    conservative and the DOUBT IS PUBLISHED: `unresolvable` says how much of the tree this gate
//    never had an opinion about, and `implausible span` flags pairings it resolved against a span
//    far too large to be a style object — a style object is 100-300 characters, and one site in
//    `readings/cosmic-report.tsx` resolves against **18,778**, i.e. most of a render function.
//    🔴 A RISE IN EITHER NUMBER MEANS COVERAGE FELL. Read them; they are the gate's own blind spot
//       reported as a quantity instead of left as silence.
// ══════════════════════════════════════════════════════════════════════════════════════════════
let violations = 0, checked = 0, present = 0;
let skipNoObj = 0, skipNoStep = 0, skipAmbiguous = 0, skipNoSpec = 0;
const parseFailWhere = [], noStepWhere = [];
for (const file of walk('.', []).filter(f => ROOTS.some(r => f.replace(/^\.\//, '').startsWith(r + '/')))) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/fontFamily/.test(src)) continue;
  const objs = objects(src);
  // 🔴 A `fontFamily` must be paired ONLY with a step in its INNERMOST enclosing object.
  //    Pairing across a whole StyleSheet.create({...}) is meaningless — that object holds
  //    dozens of unrelated entries, and the first version of this check reported 125
  //    "violations" of which nearly all were cross-entry noise. §3.0.2.0 names OVER-finding as
  //    the more insidious direction: a rule that cries wolf is a disabled rule.
  FAM_RE.lastIndex = 0;
  for (const m of [...src.matchAll(FAM_RE)]) {
    const fam = m[1] || m[2];
    const at = m.index;
    present++;
    const at_line = () => `${file.replace(/^\.\//, '')}:${src.slice(0, at).split('\n').length}`;
    let best = null;
    for (const [a, b] of objs) if (a < at && at < b && (!best || (b - a) < (best[1] - best[0]))) best = [a, b];
    // 🔴 PARSE FAILURE, BUCKET 1. Every `fontFamily:` in valid TSX sits inside SOME object literal,
    //    so "no enclosing object" cannot be a property of the source — it can only mean the brace
    //    scan lost sync. Asserted at 0.
    if (!best) { skipNoObj++; parseFailWhere.push(`${at_line()}  no enclosing object — the brace scan lost sync`); continue; }
    const body = src.slice(best[0], best[1]);
    STEP_RE.lastIndex = 0;
    const steps = [...new Set([...body.matchAll(STEP_RE)].map(s => s[1] || s[2]))];
    // ⚠️ THE ONE LEGITIMATE EXCLUSION, and it is class 5 rather than a parse failure: the object
    //    reads its step through a VARIABLE KEY (`t.type[SIZE[size]]`), which no literal pattern can
    //    follow. Enumerated per site so it cannot hide anything.
    if (steps.length === 0) { skipNoStep++; noStepWhere.push(`${at_line()}  fam='${fam}' — no LITERAL step in the object`); continue; }
    // 🔴 PARSE FAILURE, BUCKET 2. Two different steps in one innermost object means the resolved
    //    span is not a single style rule. Asserted at 0. If a legitimate case ever appears, this
    //    blocking and someone looking is the correct outcome — the pairing genuinely cannot be
    //    decided, and guessing is what the 125-false-positive first draft did.
    if (steps.length > 1) { skipAmbiguous++; parseFailWhere.push(`${at_line()}  ${steps.length} steps in one object (${steps}) — the span is not a single style rule`); continue; }
    const step = steps[0];
    const spec = t.type[step];
    if (!spec) { skipNoSpec++; noStepWhere.push(`${at_line()}  step '${step}' is not in the ramp`); continue; }
    checked++;
    const line = src.slice(0, at).split('\n').length;
    const where = `${file.replace(/^\.\//, '')}:${line}`;
    // `quote` is an ITALIC-ROLE decision (pass 4 · E4b) and is orthogonal to weight rank: an
    // italic site keeps its size step and takes the one italic face. Legal on any body step;
    // redundant on the quote step; wrong on a display step, which is never italic.
    if (fam === 'quote') {
      if (spec.family === 'display') {
        console.log(`🔴 ${where}  step '${step}' is a display step — the italic face is not legal on it`);
        violations++;
      } else if (VERBOSE) console.log(`   ok ${where}  step '${step}' + italic face (E4b)`);
      continue;
    }
    if (spec.family === 'display' || spec.family === 'quote') {
      // 🔴 THE ONLY LEGAL EXPLICIT FAMILY ON A SERIF STEP IS THE STEP'S OWN — and it is not
      //    merely tolerated, it is REQUIRED in one of the two idioms. A txt() SPREAD already
      //    carries the face, so an explicit line there is redundant; but a StyleSheet object
      //    that reads `t.type[step].size/lineHeight/letterSpacing` as PLAIN PROPERTY READS
      //    (which pass 2b mandated at module scope, because txt() throws at import) carries NO
      //    family at all, so it MUST name one or the site falls through to the global body
      //    default. The first version of this rule banned both and reported 6 false positives
      //    on correct code — §3.0.2.0's OVER-finding direction, caught the same way it always is.
      if (fam !== spec.family) {
        console.log(`🔴 ${where}  step '${step}' is ${spec.family} — the only legal explicit family here is '${spec.family}' (no second Literata face ships), found '${fam}'`);
        violations++;
      } else if (VERBOSE) console.log(`   ok ${where}  step '${step}' + its own '${fam}' face`);
    } else if (RANK[fam] === undefined) {
      console.log(`🔴 ${where}  step '${step}' is ${spec.family} — '${fam}' is not a body face`);
      violations++;
    } else if (RANK[fam] < RANK[spec.family]) {
      console.log(`🔴 ${where}  step '${step}' is ${spec.family} but '${fam}' is LIGHTER — a family pass must never de-emphasise`);
      violations++;
    } else if (VERBOSE) {
      console.log(`   ok ${where}  step '${step}' (${spec.family}) + '${fam}'`);
    }
  }
}

// ── the className half (O-35) ────────────────────────────────────────────────────────────────
// Every className attribute value that names a ramp step AND a family utility. A step whose face
// is Literata (display ×3, quote) may only carry that face's own utility.
//
// 🔴 THE ALTERNATION IS ORDERED MOST-SPECIFIC-FIRST, and that is not defensive tidiness — the
//    pass-5 rewrite script that fixed the 23 sites got this exact regex WRONG on its first run:
//    `body|body-semi|body-bold` matches `font-body` INSIDE `font-body-bold`, because the `-` after
//    `body` is a word boundary. It emitted `font-display-bold`, a class that resolves to nothing.
//    P-2 direction 1, reproduced live, inside the fix for an arrival defect.
const CLASSNAME_RE = /className=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
const FAM_UTIL_RE = /\bfont-(display|quote|body-bold|body-semi|body)\b/g;
const STEP_UTIL_RE = /\btext-(display-lg|display-md|display-sm|quote|2xl|xl|lg|base|sm|xs|2xs|overline)\b/g;
//
// 🔴 THE RANK CHECK IS *REPORT-ONLY* ON THIS HALF, AND THAT ASYMMETRY IS THE RULING — measured,
//    because the first version of this block FAILED on it and returned 19 hits, ALL of them
//    correct code (§3.0.2.0's OVER-finding direction, one commit after the rule was written).
//    On the INLINE half `rank(named) >= rank(step)` is right: txt() has ALREADY supplied the
//    step's face, so a lighter explicit family OVERRIDES it downward — a real de-emphasis.
//    On the className half there is no step-supplied family to override: the site is simply
//    NAMING its own face. All 19 hits are `text-xl font-body-semi`, and every one of them was
//    `text-xl font-semibold` on `main` — pass 4 translated them faithfully. The ramp's family
//    column is the step's DEFAULT, not a prohibition (RULE R's own "REPLACE with the weight's
//    family" branch does exactly this for 38 `text-sm` sites). So it is DESIGN DRIFT for the
//    screens phase to normalise, not an arrival defect — reported so it stays visible, never
//    failed. The SERIF branch stays blocking: there, the wrong utility silently substitutes the
//    wrong TYPEFACE, which is a different kind of error from a weight preference.
// 🔴 THE GLYPH MARKER SCAN — bounded by the enclosing JSX OPENING TAG, never by a line window.
//    Walk back from the `className=` attribute to the nearest `<` that actually opens a tag (a `<`
//    followed by a letter), and look for the marker only inside that span. Requiring the `<` to be
//    tag-shaped matters: `style={{ w: a < b }} className=…` would otherwise stop the scan at a
//    comparison operator and MISS a marker sitting at the real tag start. Missing one FAILS loudly
//    rather than passing silently, which is the correct direction for an exception scan.
function glyphMarked(src, classNameAt) {
  let i = classNameAt;
  while (i > 0) {
    i = src.lastIndexOf('<', i - 1);
    if (i < 0) return false;
    if (/[A-Za-z]/.test(src[i + 1] || '')) break;
  }
  return i >= 0 && /\/\*[^*]*\bGLYPH\b[^*]*\*\//.test(src.slice(i, classNameAt));
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// 🔴 THE className HALF HAS ITS OWN present-vs-parsed GAP, AND IT IS ASSERTED THE SAME WAY.
//
//    `CLASSNAME_RE` reads three forms — a double-quoted string, a single-quoted string and a
//    braced template literal. It does NOT read the fourth: `className={cond ? 'a' : 'b'}`, a bare
//    expression. Measured tree-wide: 1,349 className attributes present, 1,346 readable, so THREE
//    are invisible to this gate — plus ONE readable attribute that names TWO steps and is skipped
//    as ambiguous. Four sites this gate had no opinion about and never said so.
//
// 🟢 THE ASSERTION IS SHARPER THAN AN EXACT COUNT, AND DELIBERATELY SO. An exact count of
//    expression-form classNames would fail on ordinary React work — `className={x ? 'a' : 'b'}` is
//    a normal idiom — and a rule that cries wolf is a decommissioned rule (§3.0.2.0). What actually
//    matters is narrow: THE BLOCKING HALF OF THIS GATE IS THE SERIF SUBSTITUTION. A size utility
//    carries no family, so a SERIF step with no family utility silently renders in the body face;
//    a BODY step needs no utility at all, because the global default IS its face.
// 🔴 SO: every className this gate cannot fully resolve is scanned for a SERIF step, and finding
//    one BLOCKS. Everything present is therefore either parsed, or PROVEN NOT TO MATTER. Measured:
//    all four unresolved sites carry body steps only (two date/time pseudo-field labels and the
//    focus-area badge's two size branches), so the residue is provably benign rather than assumed.
const SERIF_STEP_RE = /\btext-(display-lg|display-md|display-sm|quote)\b/;

/** The full `{...}` expression after a className=, brace-balanced and quote-safe (O-91). */
function attrExpr(src, at) {
  let i = src.indexOf('{', at);
  if (i < 0) return '';
  const start = i;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { const n = src.indexOf('\n', i); i = n < 0 ? src.length : n; continue; }
    if (c === '/' && src[i + 1] === '*') { const n = src.indexOf('*/', i); i = n < 0 ? src.length : n + 2; continue; }
    if (c === '`') { i++; while (i < src.length && !(src[i] === '`' && src[i - 1] !== '\\')) i++; i++; continue; }
    if (c === '"' || c === "'") {
      const q = c; let j = i + 1;
      while (j < src.length && src[j] !== '\n' && !(src[j] === q && src[j - 1] !== '\\')) j++;
      if (j < src.length && src[j] === q) { i = j + 1; continue; }
      i++; continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    i++;
  }
  return src.slice(start);
}

let cnChecked = 0, cnViolations = 0, cnLighter = 0, cnMissing = 0, cnGlyph = 0;
let cnPresent = 0, cnUnreadable = 0, cnAmbiguous = 0;
const cnUnresolvedWhere = [];
for (const file of walk('.', []).filter(f => ROOTS.some(r => f.replace(/^\.\//, '').startsWith(r + '/')))) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/className=/.test(src)) continue;
  CLASSNAME_RE.lastIndex = 0;
  // ── present vs readable: every attribute, then the ones the pattern can actually decode ──
  const readableAt = new Set([...src.matchAll(CLASSNAME_RE)].map(m => m.index));
  const anyAttr = /className=/g;
  let a;
  while ((a = anyAttr.exec(src))) {
    cnPresent++;
    if (readableAt.has(a.index)) continue;
    cnUnreadable++;
    const expr = attrExpr(src, a.index);
    const where = `${file.replace(/^\.\//, '')}:${src.slice(0, a.index).split('\n').length}`;
    const serif = expr.match(SERIF_STEP_RE);
    if (serif) {
      console.log(`🔴 ${where}  an EXPRESSION-form className this gate cannot decode carries the SERIF step ` +
        `'${serif[0]}'. A size utility carries no family, so without an explicit family utility this renders ` +
        `in the global BODY face. Reshape it into a readable form, or name the face inside every branch.`);
      cnViolations++;
    }
    cnUnresolvedWhere.push(`${where}  expression-form${serif ? ' 🔴 SERIF' : ' (body steps only — provably benign)'}`);
  }
  for (const m of [...src.matchAll(CLASSNAME_RE)]) {
    const raw = m[1] ?? m[2] ?? m[3];
    STEP_UTIL_RE.lastIndex = 0; FAM_UTIL_RE.lastIndex = 0;
    const steps = [...new Set([...raw.matchAll(STEP_UTIL_RE)].map(s => s[1]))];
    const fams = [...new Set([...raw.matchAll(FAM_UTIL_RE)].map(s => s[1]))];
    if (steps.length > 1) {
      // AMBIGUOUS — two steps in one attribute, so there is no single pair to rule on. Same
      // treatment: benign unless a SERIF step is among them.
      cnAmbiguous++;
      const where = `${file.replace(/^\.\//, '')}:${src.slice(0, m.index).split('\n').length}`;
      const serif = raw.match(SERIF_STEP_RE);
      if (serif) {
        console.log(`🔴 ${where}  a className naming ${steps.length} steps (${steps}) includes the SERIF step ` +
          `'${serif[0]}', so this gate cannot decide its pair and the serif face may not arrive. Split it.`);
        cnViolations++;
      }
      cnUnresolvedWhere.push(`${where}  ${steps.length} steps (${steps})${serif ? ' 🔴 SERIF' : ' (body steps only — provably benign)'}`);
      continue;
    }
    if (steps.length !== 1) continue;                        // 0 = nothing to pair
    // ── the MISSING-family assertion (R-1). A serif step with NO family utility renders in the
    //    global BODY default, because a size utility carries no family. That is O-35 one step
    //    quieter, so it blocks — minus the named GLYPH exception, which prints either way.
    if (fams.length === 0) {
      const serif = /^(display-lg|display-md|display-sm|quote)$/.test(steps[0]);
      if (!serif) continue;                                  // a body step needs no utility — the global default IS its face
      const abs0 = m.index + m[0].indexOf(raw);
      const where0 = `${file.replace(/^\.\//, '')}:${src.slice(0, abs0).split('\n').length}`;
      if (glyphMarked(src, m.index)) { cnGlyph++; if (VERBOSE) console.log(`   ok ${where0}  text-${steps[0]} + no family — GLYPH (the step is a DIMENSION)`); }
      else {
        console.log(`🔴 ${where0}  className step 'text-${steps[0]}' names NO family — a size utility carries none, so this renders in the global BODY default. Add 'font-${/^display/.test(steps[0]) ? 'display' : 'quote'}', or mark the site GLYPH if it holds a pictograph.`);
        cnMissing++;
      }
      continue;
    }
    if (fams.length !== 1) continue;                         // >1 = ambiguous
    // the ramp key: `text-2xl` -> `text-2xl`; `display-lg` and `quote` are unprefixed keys
    const step = /^(display-|quote$)/.test(steps[0]) ? steps[0] : `text-${steps[0]}`;
    const spec = t.type[step] || t.type[steps[0]];
    if (!spec) continue;
    cnChecked++;
    const abs = m.index + m[0].indexOf(raw);
    const where = `${file.replace(/^\.\//, '')}:${src.slice(0, abs).split('\n').length}`;
    const fam = fams[0];
    if (fam === 'quote') continue;                            // the italic decision, E4b — orthogonal
    if (spec.family === 'display' || spec.family === 'quote') {
      if (fam !== spec.family) {
        console.log(`🔴 ${where}  className step 'text-${steps[0]}' is ${spec.family} — a size utility carries NO family, so 'font-${fam}' IS the rendered face. Use 'font-${spec.family}'.`);
        cnViolations++;
      } else if (VERBOSE) console.log(`   ok ${where}  text-${steps[0]} + font-${fam}`);
    } else if (RANK[fam] === undefined) {
      // `font-display` on a BODY step — a serif face at body size. Same class as the O-35
      // defect read from the other side, so it blocks for the same reason.
      console.log(`🔴 ${where}  className step 'text-${steps[0]}' is ${spec.family} — 'font-${fam}' is not a body face`);
      cnViolations++;
    } else if (RANK[fam] < RANK[spec.family]) {
      cnLighter++;                               // REPORT ONLY — see the block comment above
      if (VERBOSE) console.log(`   ⚠️ ${where}  text-${steps[0]} (ramp default font-${spec.family}) + font-${fam}`);
    } else if (VERBOSE) console.log(`   ok ${where}  text-${steps[0]} + font-${fam}`);
  }
}

printf: {
  const a = 'family arrival · inline step-vs-family';
  const b = 'family arrival · className step-vs-family';
  const c = 'family arrival · className MISSING family';
  process.stdout.write(`  ${a.padEnd(38)} ${String(checked).padStart(4)} checked, ${String(violations).padStart(4)} violating\n`);
  // 🔴 `parsed == present`, ASSERTED. The two PARSE-FAILURE buckets BLOCK; the one legitimate
  //    exclusion is named and enumerated. An unmatched apostrophe now fails the gate instead of
  //    silently shrinking coverage — see `objects()` and the superseded block above it.
  const parseFail = skipNoObj + skipAmbiguous;
  const excluded = skipNoStep + skipNoSpec;
  const accounted = checked + excluded + parseFail === present;
  process.stdout.write(`    · ${'inline accounting'.padEnd(24)} ${String(present).padStart(5)} present = ` +
    `${checked} checked + ${excluded} excluded + ${parseFail} unparsed` + (accounted ? '' : '   🔴 DOES NOT SUM') + '\n');
  process.stdout.write(`    · ${'inline UNPARSED'.padEnd(24)} ${String(parseFail).padStart(5)}   🔴 must be 0` +
    `   (${skipNoObj} no-object / ${skipAmbiguous} multi-step span)\n`);
  process.stdout.write(`    · ${'inline excluded (class 5)'.padEnd(24)} ${String(excluded).padStart(5)}   ` +
    `(a step read through a VARIABLE key — no literal pattern can follow it)\n`);
  if (!accounted) { process.stdout.write('    🔴 the buckets do not sum to the sites found — a counter was added without being accounted for.\n'); violations++; }
  if (parseFail) {
    process.stdout.write('    🔴 THE SCANNER FAILED TO RESOLVE A SITE IT FOUND. This is O-91: one unmatched\n');
    process.stdout.write('       apostrophe in JSX text or in a comment desynchronises the brace scan and every\n');
    process.stdout.write('       resolution below it silently changes. Do NOT reword prose to appease it — fix the\n');
    process.stdout.write('       scanner, or the next apostrophe hides a different site.\n');
    parseFailWhere.forEach(s => process.stdout.write(`       ${s}\n`));
    violations++;
  }
  if (VERBOSE) noStepWhere.forEach(s => process.stdout.write(`        excluded  ${s}\n`));
  process.stdout.write(`  ${b.padEnd(38)} ${String(cnChecked).padStart(4)} checked, ${String(cnViolations).padStart(4)} violating\n`);
  process.stdout.write(`    · ${'className lighter-than-ramp'.padEnd(24)} ${String(cnLighter).padStart(5)}   (report only)\n`);
  // 🔴 present-vs-parsed for this half. The residue is not asserted to ZERO — an expression-form
  //    className is ordinary React — it is asserted to be SERIF-FREE, which is the only direction
  //    that can render the wrong typeface. Everything present is parsed, or proven not to matter.
  process.stdout.write(`    · ${'className accounting'.padEnd(24)} ${String(cnPresent).padStart(5)} attributes present = ` +
    `${cnPresent - cnUnreadable} readable + ${cnUnreadable} expression-form\n`);
  process.stdout.write(`    · ${'className unresolved'.padEnd(24)} ${String(cnUnreadable + cnAmbiguous).padStart(5)}   ` +
    `(${cnUnreadable} expression-form / ${cnAmbiguous} multi-step) — 🔴 each asserted SERIF-FREE\n`);
  if (VERBOSE) cnUnresolvedWhere.forEach(s => process.stdout.write(`        unresolved  ${s}\n`));
  process.stdout.write(`  ${c.padEnd(38)} ${String(cnMissing).padStart(4)} violating\n`);
  process.stdout.write(`    · ${'excepted: GLYPH'.padEnd(24)} ${String(cnGlyph).padStart(5)}   (a pictograph's step is a DIMENSION)\n`);
}
process.exit(violations + cnViolations + cnMissing ? 1 : 0);
