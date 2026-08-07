#!/usr/bin/env node
/**
 * motion-arrival-check.js — THE 25TH NAMED RULE. DELIVERABLE ZERO OF THE MOTION PHASE.
 *
 * ── 🔴 WHY IT IS FIRST, AND THE BASE RATE IS NOW FIVE FOR FIVE ─────────────────────────────
 *
 * Every arrival gate written in this project has caught a live defect on its FIRST run:
 * `p23-optin-check` (41 of 179 sites needed the prop at the JSX boundary) · `family-arrival-check`
 * (9 sites with the wrong face on a serif step) · its className half (the display family had ZERO
 * call sites and nobody had ever seen the serif) · `alpha-callsite-check` (a value-shaped guard
 * would have silently STOPPED throwing) · `primitive-adoption-check` (0 of 54 Button call sites) ·
 * and at the motion phase's item 0, `A6` (FOURTEEN live sub-AA pairs across nine files).
 *
 * 🔴 MOTION IS WHERE RAW VALUES DRIFT BACK IN EXACTLY AS COLOUR DID, and the reason is that a raw
 *    duration RENDERS FINE. No crash, no type error, nothing a reviewer can point at: a 250ms fade
 *    beside a 220ms fade is invisible in isolation and reads as sloppiness only in aggregate, which
 *    is the one thing a code review never sees. Measured on the tree this gate was written against:
 *
 *      8 files · 45 animation sites · ZERO values from the design
 *      14 distinct raw durations live — 0 200 250 260 280 300 800 1000 1500 3000 12k 25k 45k 60k
 *      against a spec that names SIX
 *      3 files carrying 3 different easing recipes with no name between them
 *      2 infinite loops with NO teardown  ·  1 file still on the legacy JS-thread API with a SPRING
 *      2 score bars animating `width` — a LAYOUT property, which §18 bans outright
 *
 * ── WHAT IT ASSERTS ────────────────────────────────────────────────────────────────────────
 *
 *   1  RAW DURATION      a numeric `duration:` anywhere outside the motion module        -> 0
 *   2  RAW DELAY/REPEAT  a numeric first argument to withDelay / withRepeat              -> 0
 *   3  EASING BOUNDARY   `Easing.` outside lib/motion.ts -> 0, and INSIDE it -> NONZERO
 *   4  NO SPRING         withSpring | Animated.spring                                    -> 0
 *   5  NO LEGACY API     Animated.timing / .parallel / .sequence / new Animated.Value    -> 0
 *   6  NO LAYOUT ANIMATED  every useAnimatedStyle body's keys ⊆ {opacity, transform}     -> 0 bad
 *   7  TOKEN CENSUS      every duration and curve has a call-site count; a 0 is a DECISION
 *   8  PARSED == PRESENT every animated-style body found, or the run FAILS                (O-91)
 *  10a REACHABILITY      every 0-start alpha in the module has a written path to 1
 *  10b CARRIER           an animated style may only ride a node reanimated OWNS
 *  10c PERCEPTIBILITY    an alpha-only MOUNT entrance must start after every container   🆕 2026-08-06
 *                        animation has finished, because two alpha curves MULTIPLY
 *  10d REPEATABILITY    an entrance keyed to MOUNT on a screen the navigator keeps      🆕 2026-08-06
 *                        mounted is observable ONLY ON FIRST VISIT. Reachable is not
 *                        perceptible and perceptible is not repeatable
 *
 * ── 🔴 THREE PROPERTIES, EACH ONE A LESSON ALREADY PAID FOR ────────────────────────────────
 *
 * 1. IT READS THE **CODE** PROJECTION (`O-68` direction 2). A comment naming a duration would
 *    otherwise trip rule 1, and — far worse — a comment naming a TOKEN would satisfy rule 7's
 *    census. `O-68` direction 3: an inexact census over raw source is satisfiable by its own
 *    documentation. So the census reads code only AND asserts exact counts where the count is a
 *    contract.
 * 2. THE EXCEPTIONS ARE IN-FILE MARKERS WITH EXACT COUNTS, never a file:line allow-list, because a
 *    line-numbered list rots (§0.1) and the reason belongs where the next person will read it. Two
 *    classes exist and neither may absorb the other:
 *      · `/* SNAP *\/`      a `duration: 0`. 🔴 ZERO IS NOT A DURATION, IT IS THE ABSENCE OF ONE —
 *                          the same argument `no-numeric-radius` accepts for a flush square corner
 *                          ("the scale has five steps and no zero, correctly").
 *      · `/* TIMELINE *\/`  the wait screen's four progress legs. These are REAL-TIME WAYPOINTS on a
 *                          60-second server call, named by VALUE in design §5.5, not motion steps.
 *                          🔴 The 0.97 asymptote is PRESERVE-BLINDLY and this marker is what stops a
 *                          later pass "normalising" 12s onto a 220ms token.
 * 3. IT DOES **NOT** TRY TO ASSERT §5.3 RULE 2's GUARD **AT A SITE**, and that is a ruling rather
 *    than an omission: the guard is a property of CONTROL FLOW, and a grep that approximated it
 *    would over-find on every legitimate `useEffect`. 🟢 It is closed STRUCTURALLY instead — the
 *    guard lives inside `useEntrance` / `usePlateEntrance`, and rule 6 plus the boundary in rule 3
 *    mean a hand-rolled entrance cannot get a curve to animate with.
 *    🔴 WHAT LEG D ADDED, 2026-08-06, IS THE OTHER HALF OF THAT SENTENCE: the guard is asserted
 *    inside the MODULE, where control flow is a two-hook set rather than a pattern — which key each
 *    entrance uses, that a focus-keyed one is memoised, and that mount-keyed ones are a declared
 *    set of one. §5.3 rule 2 says "never on re-render"; it does not say "never again".
 *
 * Usage, from mobile/:   node scripts/motion-arrival-check.js [--verbose]
 */
const fs = require('fs');
const path = require('path');
const { stripComments } = require('./lib/source-scan');

const ROOTS = ['app', 'components', 'lib', 'hooks', 'utils', 'store', 'services'];
const MOTION_MODULE = 'lib/motion.ts';
const VERBOSE = process.argv.includes('--verbose');

let violations = 0;
const say = s => console.log(s);

function walk(d, acc) {
  if (!fs.existsSync(d)) return acc;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p.split(path.sep).join('/'));
  }
  return acc;
}
const FILES = ROOTS.reduce((a, r) => walk(r, a), []);
const RAW = new Map(FILES.map(f => [f, fs.readFileSync(f, 'utf8')]));
const CODE = new Map(FILES.map(f => [f, stripComments(RAW.get(f))]));
const lineOf = (src, i) => src.slice(0, i).split(/\r?\n/).length;

/** Every match of `re` across the CODE projection, as `{file, line, text}`. */
function hits(re, filter) {
  const out = [];
  for (const f of FILES) {
    if (filter && !filter(f)) continue;
    const src = CODE.get(f);
    const g = new RegExp(re.source, 'g');
    let m;
    while ((m = g.exec(src))) out.push({ file: f, line: lineOf(src, m.index), text: m[0].trim() });
  }
  return out;
}

/** A blocking rule: `n` hits, expected `want`. */
function rule(name, list, want, why) {
  const ok = list.length === want;
  say(`  ${name.padEnd(34)} ${String(list.length).padStart(4)}   expected ${want}${ok ? '' : '   🔴'}`);
  if (!ok) {
    say(`    🔴 ${why}`);
    list.slice(0, 14).forEach(h => say(`       ${h.file}:${h.line}  ${h.text}`));
    if (list.length > 14) say(`       … and ${list.length - 14} more`);
    violations++;
  } else if (VERBOSE) list.forEach(h => say(`       ${h.file}:${h.line}  ${h.text}`));
}

/** A printed sub-count that ASSERTS — `O-105`. `exact` for a contract, `max` for a residue. */
function sub(name, n, mode, want, note) {
  const bad = mode === 'exact' ? n !== want : n > want;
  say(`    · ${name.padEnd(28)} ${String(n).padStart(4)}   (${mode} ${want})${bad ? '   🔴' : ''}` +
      (note ? `   ${note}` : ''));
  if (bad) violations++;
}

say('── motion-arrival ──');

// ── 1 · RAW DURATION ──────────────────────────────────────────────────────────────────────
//
// 🔴 THE NUMBER IS FOUND IN THE **CODE** PROJECTION AND ITS MARKER IS READ FROM **RAW**, AT THE SAME
//    BYTE OFFSET. That is not a shortcut; it is the only correct arrangement, and the first draft of
//    this rule got it wrong in a way that read as a green marker set of ZERO:
//      · read raw only  -> a comment saying "this used to be 800ms" is counted as a violation, which
//        is `O-54` direction 1 (loud, self-announcing, and it costs a rewording every time);
//      · read code only -> `/* SNAP */` VANISHES, because a marker IS a comment. CLAUDE.md states
//        that corollary outright: "a presence assertion can never assert an in-file MARKER."
//    🟢 `stripComments()` is LENGTH- AND NEWLINE-PRESERVING by contract, so an offset found in one
//       projection indexes the other exactly. The number is therefore read where prose cannot reach
//       it, and the marker is read where it actually lives.
const MARKER = /^\s*\/\* (SNAP|TIMELINE) \*\//;
function durationHits() {
  const bare = [], marked = [];
  for (const f of FILES) {
    if (f === MOTION_MODULE) continue;
    const code = CODE.get(f), raw = RAW.get(f);
    const g = /duration:\s*[0-9_]+/g;
    let m;
    while ((m = g.exec(code))) {
      const after = raw.slice(m.index + m[0].length, m.index + m[0].length + 24);
      const mk = MARKER.exec(after);
      const h = { file: f, line: lineOf(code, m.index), text: m[0].trim() + (mk ? '  ' + mk[0].trim() : '') };
      (mk ? marked : bare).push({ ...h, kind: mk && mk[1] });
    }
  }
  return { bare, marked };
}
const { bare: durBare, marked: durMarked } = durationHits();
rule('raw duration', durBare, 0,
  'A NUMERIC DURATION. §5.1 names six and lib/motion.ts is the only place they resolve. ' +
  'If this value has no token, take the NEAREST specified one and register the gap (§0.0 rule 2) — ' +
  'do not invent a seventh duration, and do not mark it: the two markers below are a closed set.');
sub('excepted: SNAP', durMarked.filter(h => /SNAP/.test(h.text)).length, 'exact', 2,
  '(zero is the ABSENCE of a duration, not one)');
sub('excepted: TIMELINE', durMarked.filter(h => /TIMELINE/.test(h.text)).length, 'exact', 4,
  '(§5.5\'s four real-time progress legs — the 0.97 asymptote)');

// ── 2 · RAW DELAY / REPEAT COUNT ──────────────────────────────────────────────────────────
// ⚠️ `withRepeat(…, -1, …)` IS NOT GREPPED, and that is deliberate: -1 means FOREVER. It is a
//    sentinel, not a tuned value, so tokenising it would put a non-value in the scale — the same
//    reason the radius scale has no zero step.
rule('raw delay', hits(/withDelay\(\s*[0-9]/, f => f !== MOTION_MODULE), 0,
  'A NUMERIC DELAY. §5.4\'s only specified delay is the 40ms stagger, capped at 5 — use ' +
  '`staggerFor(index)`. A one-off beat before a fill takes a duration token.');

// ── 3 · THE EASING BOUNDARY, BOTH DIRECTIONS ──────────────────────────────────────────────
// 🔴 THE SECOND HALF IS THE ONE THAT MATTERS. A boundary rule whose protected side is EMPTY is a
//    rule guarding nothing, and that is exactly how a gate reads green after the thing it guards has
//    been deleted (`O-38`'s zero-call-site class, one field over).
rule('inline easing', hits(/Easing\.[A-Za-z]+/, f => f !== MOTION_MODULE), 0,
  'AN EASING WRITTEN AT A SITE. §5.2 names four curves and they are built once, in lib/motion.ts. ' +
  'Import `curve.standard | curve.enter | curve.exit | curve.linear`.');
const inModule = (CODE.get(MOTION_MODULE) || '').match(/Easing\.[A-Za-z]+/g) || [];
say(`  ${'easing resolved in the module'.padEnd(34)} ${String(inModule.length).padStart(4)}   ` +
    `expected nonzero${inModule.length ? '' : '   🔴'}`);
if (!inModule.length) {
  say('    🔴 THE MOTION MODULE RESOLVES NO CURVES AT ALL. "0 inline easing" beside this is vacuous —');
  say('       the boundary above is satisfied by an empty protected side, which is not a pass.');
  violations++;
}

// ── 3a · R-4 · THE OS REDUCED-MOTION SETTING MUST NOT BE DEFEATED ─────────────────────────
//
// 🔴 THE RULING ASKED FOR AN `AccessibilityInfo` FLAG WIRED AT THE HOOK. MEASURED AGAINST THE
//    INSTALLED RENDERER, THAT WOULD BE A REIMPLEMENTATION OF SOMETHING ALREADY DONE PER ANIMATION,
//    AND A STRICTLY WORSE ONE. `react-native-reanimated@3.17`'s `withTiming`, `withDelay` AND
//    `withRepeat` each take a `reduceMotion` option that **DEFAULTS TO `ReduceMotion.System`** —
//    verified in `animation/timing.d.ts`, `delay.d.ts` and `repeat.d.ts`. With the OS flag set, every
//    animation in this tree therefore already resolves AT ITS FINAL VALUE and every delay collapses.
//    A hand-rolled JS boolean would race its own listener and could not reach an animation that
//    started before the flag resolved; the renderer's version runs on the UI thread per animation.
//
// 🟢 SO THE CODE R-4 NEEDS IS ONE BRANCH, NOT A SUBSYSTEM: a LOOP has no final value, so a
//    suppressed `withRepeat` leaves its shared value parked at the loop's START — the aura frozen at
//    half opacity, which is a dimmed screen rather than reduced motion. `useAmbient` handles that
//    with `useReducedMotion()`, and this rule asserts the hook is still consulted there.
//
// 🔴 AND THE ASSERTION THAT ACTUALLY PROTECTS THE OTHER FIFTY ANIMATIONS IS AN ABSENCE: the default
//    must never be OVERRIDDEN. `ReduceMotion.Never` means "enable the animation anyway" — one word at
//    one call site silently opts a vestibular-sensitive user back into motion, and no other
//    instrument in this tree can see it.
rule('reduce-motion defeated', hits(/ReduceMotion\.(Never|Always)/), 0,
  'R-4 — `ReduceMotion.Never` DEFEATS THE OS SETTING and `Always` hard-disables regardless of it. ' +
  'Both override a default that is correct everywhere in this app: `System`. If a specific animation ' +
  'ever genuinely needs one, it needs an owner ruling and an in-file marker first, not a keyword.');
const ambient = CODE.get(MOTION_MODULE) || '';
say(`  ${'reduced-motion consulted'.padEnd(34)} ` +
    `${String((ambient.match(/useReducedMotion\(\)/g) || []).length).padStart(4)}   expected nonzero` +
    (/useReducedMotion\(\)/.test(ambient) ? '' : '   🔴'));
if (!/useReducedMotion\(\)/.test(ambient)) {
  say('    🔴 THE MODULE NO LONGER CONSULTS THE REDUCED-MOTION FLAG. The renderer covers every');
  say('       finite animation by default, but NOT a loop — a suppressed `withRepeat` parks its value');
  say('       at the loop\'s START, which leaves the wait screen\'s aura frozen at half opacity.');
  violations++;
}

// ── 3b · THE MODULE'S OWN SPEC NUMBERS, ASSERTED EXACTLY ──────────────────────────────────
//
// 🔴 EVERY RULE ABOVE CHECKS THAT A VALUE CAME FROM THE MODULE. NOTHING CHECKED WHAT THE MODULE
//    SAYS — and the four numbers below are §5.4's, not the module's own, so they are as much a spec
//    surface as the six durations in `theme.js`. The gap was found by writing an injection case for
//    the success overshoot and discovering that nothing in the tree could see it.
//
// ⚠️ THE OVERSHOOT ONE IS THE REASON THIS BLOCK EXISTS. §5.3 bans bounce and overshoot, and §5.4 says
//    the success scale runs 0.92 -> 1 and NEVER above 1. A scale that passes 1 and settles back IS a
//    bounce whatever curve produced it — and it reads as "delightful" rather than as a defect, so it
//    is the one value here that a reviewer would wave through.
// 🔴 THE ERROR RISE USED TO BE ASSERTED AS AN EXPRESSION — `t.motion.distance / 2` — ON THE ARGUMENT
//    THAT 4 IS CORRECT *BECAUSE* IT IS HALF THE ENTRANCE. `P97` DESTROYED THAT ARGUMENT AND THE
//    ASSERTION WITH IT, and the sequence is worth keeping because the rule's own blind spot was
//    named a session before it fired:
//      · the entrance rose 8 -> 12 (the fade it companioned no longer exists);
//      · 4 is not half of 12, so the division would have re-specified §5.4's error rise as **6**;
//      · and this assertion would have stayed GREEN, because it checks that the number is half of
//        SOMETHING, never that it is 4.
// 🟢 So the two are now separate tokens and each is asserted BY VALUE against `theme.js`. An
//    expression assertion proves a RELATIONSHIP; a value assertion proves a NUMBER. Where the spec
//    names a number, the number is the contract.
// 🔴 AND THE TOKEN FILE IS READ, NOT THE MODULE. Measured at P97: deleting `distance` from
//    `theme.js` outright left this whole block GREEN, because every row above is a grep over
//    `lib/motion.ts` and the text `t.motion.distance` was still there. A reference to a token that
//    no longer exists reads exactly like a reference to one that does.
{
  const M = require(path.resolve('theme.js')).motion;
  for (const [label, got, want] of [
    ['token entranceRise', M.entranceRise, 12],
    ['token errorRise', M.errorRise, 4],
    ['token stagger', M.stagger, 40],
    ['token staggerCap', M.staggerCap, 5],
  ]) {
    sub(label, got === undefined ? -1 : got, 'exact', want,
        '— §5.4/§5.3 name this number. `-1` means the token is GONE from theme.js, which every ' +
        'grep-shaped rule in this file would otherwise read as present.');
  }
}
say('  (the module\'s own §5.4 numbers — nothing else in the tree checks these)');
for (const [label, re] of [
  ['success scale from', /const SUCCESS_SCALE_FROM = 0\.92;/],
  ['press opacity', /const PRESS_OPACITY = 0\.88;/],
  ['press scale', /const PRESS_SCALE = 0\.985;/],
  ['error rise = token', /lift\.value = t\.motion\.errorRise;/],
  ['entrance rise = token', /useSharedValue\(enabled \? t\.motion\.entranceRise : 0\)/],
  // 🔴 A ROW WAS DELETED HERE ON 2026-08-06 AND THE DELETION IS RECORDED RATHER THAN SILENT.
  //    `nav curve = token` asserted that the SECOND easing family — react-native's own, needed
  //    because bottom-tabs drives its scene with that renderer — was built from the token array.
  //    The owner reverted the tab switch to a CUT, so the family has no consumer and was removed
  //    from the module (rule 9 would have failed on it anyway: an exported helper with no call
  //    sites). 🔴 AN ASSERTION WHOSE SUBJECT NO LONGER EXISTS IS NOT A WEAKENED GATE, IT IS A
  //    STALE CLAIM — the same reading `inject-a6.sh`'s header gives a validation case that
  //    outlives its mechanism. What replaces it is an ABSENCE, in `primitive-adoption-check.js`'s
  //    `Tabs` contract: both keys must stay gone from the layout file, so the cut cannot be
  //    reverted-back silently either.
]) {
  const ok = re.test(CODE.get(MOTION_MODULE) || '');
  say(`    · ${label.padEnd(28)} ${ok ? '  OK' : 'GONE'}${ok ? '' : '   🔴'}`);
  if (!ok) {
    say(`    🔴 §5.4's value for "${label}" is no longer in lib/motion.ts. These are SPEC numbers, not`);
    say('       implementation details — the same class as the six durations, one level in.');
    violations++;
  }
}

// ── 4 · NO SPRING ─────────────────────────────────────────────────────────────────────────
rule('spring', hits(/withSpring|Animated\.spring/), 0,
  '§18\'s contract: ZERO SPRINGS, no bounce, no overshoot anywhere in the system. A spring\'s ' +
  'settle is a function of tension and friction, so it has no duration to tokenise at all.');

// ── 5 · NO LEGACY JS-THREAD API ───────────────────────────────────────────────────────────
rule('legacy Animated API', hits(/Animated\.(timing|parallel|sequence|loop|decay)\b|new Animated\.Value/), 0,
  'THE LEGACY `Animated` API. §18 requires reanimated `withTiming` on the UI thread. ' +
  '⚠️ `useNativeDriver: true` moves the FRAMES off the JS thread but leaves the ORCHESTRATION on ' +
  'it, so a legacy file is not equivalent just because its driver is native.');

// ── 6 · NO LAYOUT PROPERTY ANIMATED ───────────────────────────────────────────────────────
// 🔴 THIS IS THE ASSERTION §18's CONTRACT ACTUALLY MAKES, and it is the one no grep can express as a
//    pattern: the illegal thing is a KEY in an object returned from a worklet. So the body is located
//    by brace balance from `useAnimatedStyle(` and its top-level keys are read.
// 🔴 AND `O-91`: THE NUMBER OF BODIES PARSED MUST EQUAL THE NUMBER PRESENT. A body this cannot read
//    is a hole, and printing "0 bad" beside a shortfall is O-67 exactly.
// 🟢 THE WORKLET-BODY READER IS A FUNCTION, AND THAT IS `O-115` APPLIED TO THIS FILE'S OWN CODE.
//    Rule 6a below asks the SAME question of a different hook (`useAnimatedProps`), and re-stating
//    a four-level brace walk twice is exactly the shape that produced `decide()` — two copies of
//    one rule do not check each other, they agree. One reader, two allow-sets, two call sites.
function workletKeys(hookRe) {
  let present = 0, parsed = 0;
  const found = [];   // {file, line, key}
  for (const f of FILES) {
    const src = CODE.get(f);
    const g = new RegExp(hookRe.source, 'g');
    let m;
    while ((m = g.exec(src))) {
      present++;
      // the callback's returned object literal: the first balanced `{ … }` that follows a `=> (` or a
      // `return `, searched inside the balanced argument list of the hook call
      let i = m.index + m[0].length, depth = 1;
      while (i < src.length && depth > 0) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') depth--;
        i++;
      }
      if (depth !== 0) continue;
      const arg = src.slice(m.index + m[0].length, i - 1);
      const objs = [...arg.matchAll(/(?:=>\s*\(\s*|return\s*)\{/g)];
      if (!objs.length) continue;
      parsed++;
      for (const o of objs) {
        const start = o.index + o[0].length - 1;
        let j = start + 1, d = 1;
        while (j < arg.length && d > 0) { if (arg[j] === '{') d++; else if (arg[j] === '}') d--; j++; }
        const body = arg.slice(start + 1, j - 1);
        // top-level keys only — a nested object (a transform entry) is not a style key
        let k = 0, dd = 0;
        const keys = [];
        let token = '';
        for (; k < body.length; k++) {
          const c = body[k];
          if ('([{'.includes(c)) dd++;
          else if (')]}'.includes(c)) dd--;
          if (dd === 0 && c === ':') { keys.push(token.trim().replace(/^['"]|['"]$/g, '')); token = ''; continue; }
          if (dd === 0 && c === ',') { token = ''; continue; }
          token += c;
        }
        for (const key of keys) {
          if (!key || !/^[A-Za-z_$][\w$]*$/.test(key)) continue;
          found.push({ file: f, line: lineOf(src, m.index), key });
        }
      }
    }
  }
  return { present, parsed, found };
}

const ALLOWED = new Set(['opacity', 'transform']);
const styleBodies = workletKeys(/useAnimatedStyle\s*\(/);
const layoutBad = styleBodies.found
  .filter(h => !ALLOWED.has(h.key))
  .map(h => ({ file: h.file, line: h.line, text: `animates \`${h.key}\`` }));
rule('layout property animated', layoutBad, 0,
  '§18: "opacity and transform ONLY. ZERO layout properties animated — animating layout causes ' +
  'reflow." A width/height/margin/flex in a worklet re-lays-out the subtree every frame, which is ' +
  'precisely the "laggy on low-end Android" this direction is guarding against. A left-anchored ' +
  '`scaleX` with `transformOrigin` draws the same bar with no reflow — see `useFill`.');
say(`    · ${'animated-style bodies'.padEnd(28)} ${String(styleBodies.parsed).padStart(4)}   ` +
    `parsed of ${styleBodies.present} present${styleBodies.parsed === styleBodies.present ? '' : '   🔴'}`);
if (styleBodies.parsed !== styleBodies.present) {
  say('    🔴 O-91 — A BODY THIS RULE COULD NOT READ IS A HOLE, NOT A SKIP. `0 bad` beside a');
  say('       shortfall is a printed count standing in for a checked one.');
  violations++;
}

// ── 6a · 🆕 THE **OTHER** WORKLET CHANNEL — `animatedProps`. Added 2026-08-06. ──────────────
//
// 🔴 THIS WAS A HOLE, AND THE DRAW-IN ITEM WIDENED IT BEFORE CLOSING IT. Rule 6 reads
//    `useAnimatedStyle` only, so `useAnimatedProps` — the SVG paint channel — was never key-checked
//    at all. That was tolerable while the tree had ONE such site (`CompatibilityScoreRing`'s ring);
//    the §15 draw-in makes it two, and the next one arrives without a review.
// 🔴 AND `animatedProps` REACHES FURTHER THAN A STYLE, WHICH IS WHY IT NEEDS ITS OWN ALLOW-SET
//    RATHER THAN RULE 6's: it sets an ARBITRARY PROP on the host node, so it can carry `width`,
//    `height`, `x`, `y`, `r`, `d` — every one of which is geometry on an SVG node and several of
//    which are §18's banned class wearing SVG's spelling. `d` is the worst: morphing a path is a
//    JS-thread recalculation per frame, and §18 bans it BY NAME for low-end Android.
// 🟢 SO THE SET IS DECLARED AND SMALL, exactly like LEG B's WRAPPERS table, and for the same reason:
//    whether a given prop is safe to drive per frame is a fact about the renderer, not about this
//    tree. A new key here is a review event, not a diff.
const PAINT_ALLOWED = new Set(['strokeDashoffset']);
const propsBodies = workletKeys(/useAnimatedProps\s*\(/);
const paintBad = propsBodies.found
  .filter(h => !PAINT_ALLOWED.has(h.key))
  .map(h => ({ file: h.file, line: h.line, text: `animates prop \`${h.key}\`` }));
rule('non-paint prop animated', paintBad, 0,
  'AN `animatedProps` WORKLET DRIVING A PROP OUTSIDE THE DECLARED PAINT SET. `strokeDashoffset` is ' +
  'legal because it is a PAINT property — it changes what is drawn, never the box. A GEOMETRY prop ' +
  '(`d`, `x`, `y`, `r`, `width`, `height`) recomputes the shape per frame, which is §18\'s ban in ' +
  'SVG spelling, and `d` specifically is the one §18 names for low-end Android. If a new paint prop ' +
  'is genuinely needed, add it HERE with its reason — never widen this set to make a site pass.');
say(`    · ${'animated-props bodies'.padEnd(28)} ${String(propsBodies.parsed).padStart(4)}   ` +
    `parsed of ${propsBodies.present} present${propsBodies.parsed === propsBodies.present ? '' : '   🔴'}`);
if (propsBodies.parsed !== propsBodies.present) {
  say('    🔴 O-91 AGAIN, ON THE NEW CHANNEL — an unreadable body is a hole, not a skip.');
  violations++;
}
sub('animated-props sites', propsBodies.present, 'exact', 2,
    '— the compatibility ring\'s sweep and the §15 draw-in. 🔴 A RISE is a new SVG paint animation ' +
    'and must be read against LEG B first: `animatedProps` is the ONLY channel a react-native-svg ' +
    'node may carry, and a `style` on one of those nodes is the cut-3 defect.');

// ── 7 · THE TOKEN CENSUS — arrival, not removal ───────────────────────────────────────────
// 🔴 A REMOVAL GATE CANNOT SEE A WRONG ARRIVAL (`O-35`'s whole lesson): every rule above reaching 0
//    proves the raw values are GONE and says nothing about whether the right token turned up. So each
//    duration and curve gets a call-site count, and a 0 must be a RECORDED DECISION.
say('  (token census — arrival. a 0 must be a recorded decision, not a surprise)');
// ══════════════════════════════════════════════════════════════════════════════════════════
// 🔴 THIS CENSUS WAS RE-SCOPED **TWICE** AND THE SECOND TIME DELETED A MECHANISM. Both changes are
//    recorded because the pair is the lesson, not either half.
//
// DRAFT 1 — counted TREE-WIDE, and I called it vacuous: every token is referenced inside the motion
//   module by construction, since that is what the module is FOR. Measured, four rows read "1 call
//   site" and all four were the module's own definition.
// DRAFT 2 — counted OUTSIDE the module, which fixed that, and four rows then read 0. Those got a
//   ⬜ PENDING marker with a named debtor apiece ("arrives with the Button press item").
// 🔴 DRAFT 3, WHICH IS THIS ONE — AND THE BUTTON PRESS ITEM IS WHAT REFUTED DRAFT 2. That item
//   landed, `usePress` gained two call sites, and `dur.instant` / `dur.quick` / `curve.exit` STILL
//   read 0 outside the module — because they are consumed BY THE HOOK, and a token reached through a
//   live hook is not a dead token. **The debtors could never have been discharged, so under R-3 they
//   were permanently-pending counters, which is precisely what the deleted `GP()` block forbids.**
//
// 🟢 THE FIX IS THAT DRAFT 1's SCOPE WAS RIGHT AND ITS COMPANION WAS MISSING. Tree-wide is vacuous
//    ALONE; paired with rule 9 below — every exported helper has a call site outside the module — it
//    is sound, and the three cases partition cleanly:
//      · a token referenced nowhere at all            -> this census fails
//      · referenced only inside a helper NOBODY calls -> rule 9 fails
//      · referenced inside a helper that IS called    -> reachable, and correctly credited
//    So the PENDING mechanism is DELETED rather than kept. 🔴 `token-gate.sh`'s standing rule applies
//    to a gate's own scaffolding too: before adding a pending counter, ask whether the thing it
//    measures is actually assertable. Here it was, by a second rule rather than a marker.
const CENSUS = [
  ['dur.instant', /\bdur\.instant\b/, 'press-in'],
  ['dur.quick', /\bdur\.quick\b/, 'press-out'],
  ['dur.base', /\bdur\.base\b/, 'cross-fades'],
  ['dur.moderate', /\bdur\.moderate\b/, 'entrances, the ring\'s beat'],
  ['dur.slow', /\bdur\.slow\b/, 'fills, success'],
  ['dur.ambient', /\bdur\.ambient\b/, 'the ONLY looping duration'],
  ['curve.standard', /\bcurve\.standard\b/, ''],
  ['curve.enter', /\bcurve\.enter\b/, ''],
  ['curve.exit', /\bcurve\.exit\b/, 'leaving'],
  ['curve.linear', /\bcurve\.linear\b/, 'progress and loops only'],
];
for (const [name, re, note] of CENSUS) {
  const n = hits(re).length;
  say(`    · ${name.padEnd(28)} ${String(n).padStart(4)}   references` + (note ? `   — ${note}` : '') +
      (n ? '' : '   🔴'));
  if (!n) {
    say('    🔴 A TOKEN REFERENCED NOWHERE IN THE TREE — not even inside the motion module — IS THE');
    say('       font-display DEFECT one system over: the ramp exists, every gate reads green, and');
    say('       nobody has ever seen the value render. Either a surface owes it, or §5.1 owes a');
    say('       ruling that the system does not need it.');
    violations++;
  }
}

// ── 9 · 🔴 EVERY EXPORTED HELPER HAS A CALL SITE OUTSIDE THIS MODULE ──────────────────────
//    The census above can only see a TOKEN. A HOOK is the more dangerous shape: it typechecks, it
//    reads as finished work, and it is the thing a later reader assumes is wired. THREE were written
//    for this module and deleted again before the commit for exactly this reason — `useEntrance`,
//    `usePlateEntrance` and `usePress`, all correct, all with zero callers.
say('  (helper call sites — a helper nobody calls is finished-looking work that does nothing)');
const modSrc = CODE.get(MOTION_MODULE) || '';
for (const m of modSrc.matchAll(/export (?:function|const) ([A-Za-z_$][\w$]*)/g)) {
  const name = m[1];
  const n = hits(new RegExp('\\b' + name + '\\b'), f => f !== MOTION_MODULE).length;
  say(`    · ${name.padEnd(28)} ${String(n).padStart(4)}   call sites${n ? '' : '   🔴'}`);
  if (!n) {
    say(`    🔴 \`${name}\` IS EXPORTED AND NEVER CALLED. Land a helper in the commit of the item that`);
    say('       consumes it, never before — "a contract nothing satisfies is a pending counter with no');
    say("       debtor\" (primitive-adoption-check.js's own header).");
    violations++;
  }
}

// ── 10 · 🔴 OPACITY-0 REACHABILITY — the arrival-gate shape applied to MOTION ──────────────
//
// 🔴 WRITTEN BECAUSE CUT 3 SHIPPED WITH EVERY PLATE IN THE APP INVISIBLE AND NOT ONE OF THE
//    TWENTY-SIX NAMED RULES COULD SEE IT. Every layer read green: `tsc` clean, `--diff` clean,
//    `--members` clean, the Plate adoption contract a perfect 6/6/0 with all seven mounts present,
//    the duration and curve censuses nonzero, the layout-property rule 0. The plates were mounted,
//    the tokens were right, the entrance was spec-exact — and the drawing never became visible.
//
// ── THE MEASURED MECHANISM, which is what the rule keys on ─────────────────────────────────
//
// `react-native-svg@15.11.2`'s `Svg.render()` does not merely forward its `style` prop:
//
//     const gStyle = Object.assign({}, StyleSheet.flatten(style));   // src/elements/Svg.tsx
//     <RNSVGSvgView style={rootStyles}> <G style={gStyle} .../> </RNSVGSvgView>
//
// The style is CLONED onto the inner group, which is a SECOND host node. Reanimated drives the value
// on the UI thread precisely so that React does NOT re-render, so it updates the node it resolved and
// `render()` never runs again — leaving `gStyle` frozen at the first-render snapshot forever. An
// entrance starting at opacity 0 therefore holds the whole drawing at group-opacity 0 for the life of
// the mount, while the OUTER node's opacity animates perfectly and invisibly.
//
// ── 🔴 AND NOTE WHY NO EXISTING RULE SHAPE REACHES IT ──────────────────────────────────────
//
// Every rule above this one asks about a VALUE — is the duration on the ramp, is the curve named, is
// the token referenced, is the layout property untouched. This defect has no wrong value anywhere.
// It is a REACHABILITY defect: a start state with no path to its end state. That is the arrival-gate
// question (§1.1: "did the right thing ARRIVE?") asked of motion instead of of type or colour, and
// `primitives-plan` §1.1's base rate applies — this one found a live defect on its first run too,
// except that the device found it first, which is the expensive ordering.
//
// ⚠️ AND `O-67`, WEARING A THIRD FACE: the Plate contract DID assert the entrance, exactly, and the
//    assertion was `<AnimatedSvg` — it pinned the broken form. A printed count is not a checked
//    count; a checked count is not a checked MECHANISM.
say('  (opacity-0 reachability — a start state with no path to its end state)');

// ── LEG A · every 0-start opacity in the module has a WRITTEN path to 1 ────────────────────
// The module is chunked on its own `export function` boundaries rather than parsed: a hook whose
// returned style names `opacity` and whose shared value starts at 0 must contain a `withTiming(1`.
// ⚠️ `usePress` and `useErrorEntrance` both start a value at 0 and both pass — that is the point of
//    keying on the presence of the path rather than on the initial value alone.
{
  const chunks = modSrc.split(/(?=export (?:function|const) )/).filter(c => /^export /.test(c));
  let checked = 0;
  for (const c of chunks) {
    const name = (c.match(/export (?:function|const) ([A-Za-z_$][\w$]*)/) || [])[1] || '?';
    const startsAtZero = /useSharedValue\([^)]*\b0\b[^)]*\)/.test(c);
    const carriesOpacity = /\bopacity\s*:/.test(c);
    if (!startsAtZero || !carriesOpacity) continue;
    checked++;
    const reaches = /withTiming\(\s*1\b/.test(c);
    say(`    · ${name.padEnd(28)} ${reaches ? '  ->1' : '  🔴  '}   0-start opacity`);
    if (!reaches) {
      say(`    🔴 \`${name}\` STARTS AN OPACITY AT 0 AND NEVER WRITES 1. Whatever consumes it is`);
      say('       invisible for the life of the mount, and nothing else in this stack can see that —');
      say('       the element mounts, the tokens are right and every census stays nonzero.');
      violations++;
    }
  }
  sub('0-start opacity hooks', checked, 'exact', 4,
      '— usePress · usePlateEntrance · useErrorEntrance · useSuccessEntrance. ' +
      'A FALL means a hook stopped starting at 0, i.e. an entrance became a no-op; a RISE is a new ' +
      'entrance that must be read against LEG B and LEG C before it is trusted. ' +
      '⚠️ It was 5 until 2026-08-06: `useEntrance` no longer animates an alpha at all (LEG C).');
}

// ── LEG B · the CARRIER — 🔴 an animated style may only ride a node reanimated OWNS ─────────
//
// 🔴 `createAnimatedComponent` OVER A THIRD-PARTY COMPONENT IS A DECLARED, COUNTED SET. Not because
//    the helper is wrong — four of the five live wrappers are correct and necessary — but because
//    whether a given target is safe depends on something no grep can read: what that component does
//    with the `style` prop internally. So the set is small, enumerated, and each entry states which
//    channel it carries. A NEW wrapper appearing is a review event, not a diff.
//
// 🔴 THE HARD BAN: a `react-native-svg` target may carry `animatedProps` and MUST NOT carry `style`.
//    `animatedProps` sets a PAINT property on the very node reanimated resolved, so the clone above
//    is irrelevant to it. `CompatibilityScoreRing`'s `strokeDashoffset` is the legal form; `Plate`'s
//    former `<AnimatedSvg style={…}>` was the illegal one.
const WRAPPERS = [
  { target: 'Circle', from: 'react-native-svg', carries: 'animatedProps',
    why: 'the compatibility ring sweeps `strokeDashoffset` — a paint prop on the node reanimated owns' },
  { target: 'Path', from: 'react-native-svg', carries: 'animatedProps',
    why: 'the §15 one-shot draw-in (`useDrawIn`), owner-requested 2026-08-06. 🟢 SAME CHANNEL AND ' +
         'SAME LIBRARY AS THE ROW ABOVE, which is the whole argument for it being safe: a dash phase ' +
         'is a PAINT property, set on the node reanimated resolved, so `<Svg>`\'s style CLONE — the ' +
         'cut-3 defect — cannot reach it. ⚠️ AND THE HARD BAN STILL APPLIES TO IT: this wrapper may ' +
         'never be handed a `style`, which the check below asserts at every call site' },
  { target: 'LinearGradient', from: 'expo-linear-gradient', carries: 'style',
    why: 'the wait screen\'s ambient aura. 🟢 MEASURED IN THE INSTALLED SOURCE, not argued: its ' +
         '`render()` is `<NativeLinearGradient {...props} …/>`, so `style` rides straight into one ' +
         'codegen\'d host component and is never handed to a child. ⚠️ It IS a class component, so ' +
         'reanimated resolves its host through `findHostInstance_DEPRECATED` exactly as it did for ' +
         '`Svg` — the difference between them is the CLONE and nothing else' },
  { target: 'TouchableOpacity', from: 'react-native', carries: 'style',
    why: '§5.4\'s press feedback on `Button`. First-party RN view. ⚠️ AND IT HAS AN OPACITY ANIMATION ' +
         'OF ITS OWN on the same node, which is why the call site passes `activeOpacity={1}` — two ' +
         'opacity curves with different durations on one node is a flicker, not a press' },
  { target: 'SafeAreaView', from: 'react-native-safe-area-context', carries: 'style',
    why: 'the screen entrance, appended to X1\'s existing style array so there are zero new nodes ' +
         '(`O-110`). 🟢 MEASURED: it is a `forwardRef` rendering `<NativeSafeAreaView {...props} ' +
         'ref={ref}/>` — one host node, no clone, and the ref reaches it directly. ' +
         '⚠️ IT NOW CARRIES A TRANSLATE AND NO ALPHA (LEG C, 2026-08-06), which RETIRES THE CONTROL ' +
         'THIS ROW USED TO NAME: it was the node that refuted H-2 on the cut-3 device, because it ' +
         'started at 0 alpha under every screen\'s content and content being visible proved the ' +
         'write path worked. Nothing in the tree makes that inference available any more — recorded ' +
         'rather than deleted, so a later reader does not reach for a control that is gone' },
];
{
  // 🔴 THE DECLARATION IS MATCHED WHOLE — `const <local> = …createAnimatedComponent(<target>)` — SO
  //    THAT `local` COMES OUT OF THE MATCH. The first draft read the target from the match and tried
  //    to recover `local` from the same string, which contains no `const`; `local` was therefore
  //    ALWAYS undefined and the entire react-native-svg channel check below never executed. Green,
  //    silent, and pointed at nothing. **Found by injection case 4, not by reading the code** —
  //    `O-54` direction 2 arriving inside a gate rather than inside a component: a guard that quietly
  //    opens. The `discovered !== declaredSites` sub-count is the belt that makes that unrepeatable.
  const DECL = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:[A-Za-z_$][\w$]*\.)?createAnimatedComponent\(\s*([A-Za-z_$][\w$.]*)\s*\)/;
  const found = new Map();
  for (const h of hits(DECL)) {
    const m = h.text.match(DECL);
    if (!m) continue;
    const target = m[2];
    if (!found.has(target)) found.set(target, []);
    found.get(target).push({ ...h, local: m[1] });
  }
  // Every `createAnimatedComponent` in the tree must be one of the declarations above. An inline or
  // otherwise-shaped call would be invisible to `DECL`, and invisible is how this rule's own hole
  // stayed open — so the two discovery numbers are reconciled rather than assumed equal.
  const anyCalls = hits(/createAnimatedComponent\s*\(/).length;
  const declaredSites = [...found.values()].reduce((a, s) => a + s.length, 0);
  sub('calls vs declarations', anyCalls, 'exact', declaredSites,
      '— every `createAnimatedComponent` call is a named `const` declaration. A MISMATCH means a ' +
      'call in a shape this rule cannot read, which is a hole rather than a violation.');
  const declared = new Set(WRAPPERS.map(w => w.target));
  const SVG_BANNED = /^(Svg|G|Path|Circle|Ellipse|Rect|Line|Polygon|Polyline|Text|TSpan|Defs|ClipPath|Mask|Use|Image|Symbol)$/;

  for (const w of WRAPPERS) {
    const sites = found.get(w.target) || [];
    say(`    · ${(w.target + ' <- ' + w.from).padEnd(48)} ${String(sites.length).padStart(3)} wrapper(s)` +
        `   carries ${w.carries}${sites.length === 1 ? '' : '   🔴'}`);
    if (sites.length !== 1) {
      say(`    🔴 EXPECTED EXACTLY ONE WRAPPER OVER \`${w.target}\`. ${w.why}.`);
      violations++;
      continue;
    }
    // The channel claim is not prose — assert it at the JSX call site.
    const src = CODE.get(sites[0].file) || '';
    const local = sites[0].local;
    if (w.from === 'react-native-svg') {
      if (!local) {
        say(`    🔴 COULD NOT RESOLVE THE LOCAL NAME FOR THE \`${w.target}\` WRAPPER, so its channel`);
        say('       was NOT checked. Treat an unresolvable name as a failure, never as a pass — an');
        say('       unrun check reads identically to a passing one.');
        violations++;
      }
    }
    if (local && w.from === 'react-native-svg') {
      const tags = src.match(new RegExp('<' + local + '\\b[\\s\\S]*?>', 'g')) || [];
      const styled = tags.filter(tg => /\sstyle\s*=/.test(tg));
      if (styled.length) {
        say(`    🔴 \`<${local}>\` IS A \`react-native-svg\` ELEMENT AND IT IS BEING HANDED A \`style\`.`);
        say('       That library clones the style onto a second host node reanimated does not own, so');
        say('       an animated value written there is frozen at its first-render snapshot forever.');
        say('       Use `animatedProps` with a paint property, or move the style to a wrapper View.');
        violations++;
      }
      if (!tags.some(tg => /animatedProps\s*=/.test(tg))) {
        say(`    🔴 \`<${local}>\` DECLARES A REACT-NATIVE-SVG WRAPPER THAT CARRIES NOTHING.` +
            ' A wrapper with no animated channel is a dead const that reads as wired work.');
        violations++;
      }
    }
  }

  for (const [target, sites] of found) {
    if (declared.has(target)) continue;
    say(`    🔴 UNDECLARED ANIMATED WRAPPER over \`${target}\`  (${sites.map(s => s.file + ':' + s.line).join(', ')})`);
    if (SVG_BANNED.test(target)) {
      say(`       🔴 AND \`${target}\` IS A react-native-svg ELEMENT. This is the exact pairing that`);
      say('          shipped cut 3 with every plate invisible. It may carry `animatedProps` ONLY, and');
      say('          it must be declared in this rule\'s WRAPPERS table with its channel stated.');
    } else {
      say('       Whether a target is safe depends on what it does with `style` internally, which no');
      say('       grep can read. Add it to WRAPPERS with a reason, or use a first-party `Animated.*`.');
    }
    violations++;
  }
  sub('animated wrappers total', [...found.values()].reduce((a, s) => a + s.length, 0), 'exact', WRAPPERS.length,
      '— the declared set, and nothing else. This is the number that would have blocked cut 3: the ' +
      'fifth wrapper was `createAnimatedComponent(Svg)` carrying a style.');
}

// ── LEG C · 🔴 PERCEPTIBILITY — REACHABLE IS NOT THE SAME AS OBSERVABLE ────────────────────
//
// 🔴 LEG A ASKS WHETHER A VALUE HAS A PATH TO ITS END STATE. THIS ASKS WHETHER ANYONE CAN SEE IT
//    TRAVEL. Cut 3's device pass reported "no motion anywhere" and LEG A was green on all five hooks
//    — correctly, because every value did reach 1. The alpha ramp was running; it was simply
//    multiplied away.
//
// ── THE MECHANISM, MEASURED IN THE INSTALLED NAVIGATORS ────────────────────────────────────
//
// A navigator fades the CONTAINER in while the entrance inside it fades the CONTENT, so the eye
// receives the PRODUCT of two alpha curves. `ease-enter` is a hard decelerate: 83% of a 300ms curve
// is spent inside the first 150ms, which is exactly the window the root fade occupies. The whole
// perceptible part of the entrance therefore happened underneath the container's own arrival, and
// what remained afterwards was the last sixth of an alpha ramp — nothing.
//
// 🟢 A GEOMETRIC OFFSET DOES NOT COMPOSE THAT WAY, WHICH IS THE ENTIRE BASIS OF THE RULE. Alpha ×
//    alpha is destructive; alpha × position is not. At composite alpha 0.5 the content is
//    half-visible AND STILL MOVING, so the rise survives a container fade the fade cannot. The
//    ruling that followed was therefore a DELETION (`useEntrance` lost its alpha channel) rather
//    than a retiming, a focus listener or a `transitionEnd` dependency — none of which this rule
//    would have been able to check.
//
// ⚠️ SO THE ILLEGAL SHAPE IS NARROW AND STATED AS SUCH: an entrance that (a) plays once per MOUNT,
//    which is precisely when a navigator animation is also running, and (b) animates NOTHING BUT
//    alpha, so it has no channel that survives the composition. Either half alone is fine.
say('  (perceptibility — an alpha-only arrival entrance under a container fade is unobservable)');
{
  const DURATIONS = require(path.resolve('theme.js')).motion.duration;

  // 🔴 THE CONTAINER ANIMATIONS ARE A DECLARED, COUNTED SET, for the same reason LEG B's wrappers
  //    are: whether a given navigator fades its scene is a fact about a LIBRARY, not about this
  //    tree, so it cannot be discovered by grepping this tree. Each row states where it was
  //    measured. Rows that HAVE a code site are probed, so the table cannot drift away from the app.
  const CONTAINER_FADES = [
    { where: 'app/_layout.tsx', what: 'the root stack fade', ms: 150,
      probe: /animation:\s*'fade'/, want: 1,
      why: 'react-native-screens 4.11.1, res/base/anim/rns_fade_in.xml: alpha 0 to 1 over 150ms, ' +
           'no offset. It governs every root-level move (auth, main, capture, paywall)' },
    // 🔴 THE TAB SCENE CROSS-FADE WAS A ROW HERE AND IT IS **GONE**, OWNER-RULED 2026-08-06 AFTER A
    //    DEVICE PASS. It ran at `dur-base` 220 and was THE LONGEST OF THE THREE, i.e. it set the
    //    floor below — so its removal is not a bookkeeping edit, it MOVES A THRESHOLD every entrance
    //    in the module is judged against (220 -> 200), which is exactly why the floor is asserted
    //    `exact` two blocks down rather than merely printed.
    // 🔴 WHY THE ROW IS DELETED RATHER THAN KEPT AT 0: this table's contract is "container
    //    animations that put a scene below alpha 1". A cut does not, so a 0-ms row would be a claim
    //    about a window that no longer exists, and `Math.max` over it would read as if the class had
    //    been considered and measured. **The absence of the two keys is asserted where an absence
    //    belongs** — `primitive-adoption-check.js`'s `Tabs` contract, `absent` — so re-adding either
    //    one fails there, loudly, in the same run.
    // ⚠️ THE DOUBLE EXPOSURE IT PRODUCED IS THE REASON, and it is a DIFFERENT defect from the one
    //    this rule was written for: LEG C is about an entrance being INVISIBLE under a container
    //    fade; the tab cross-fade was about the container fade itself being VISIBLE as two text
    //    layouts at once. Same window, opposite complaint.
    // 🔴 NOT PROBED, AND THE ROW STAYS ANYWAY — this is the class the first draft of this rule
    //    dropped. A nested Stack that sets NO `animation` is the one with the widest blast radius in
    //    this app (every reading, every astrology sub-screen), and it has no code to match on
    //    precisely BECAUSE it is the default. Declaring it with its measured value is the honest
    //    form; omitting it because it is ungreppable would be the search-root blindness class
    //    (`M-5`) arriving inside a rule.
    { where: '(implicit) every nested Stack', what: "react-native-screens' DEFAULT", ms: 200,
      probe: null,
      why: 'anim-v33/rns_default_enter_in.xml: alpha over 83ms from a 50ms offset (done at 133). ' +
           'The pre-API-33 base variant is 100ms from a 100ms offset (done at 200), so 200 is the ' +
           'value carried here — the worst case across the supported range, never the newest' },
  ];
  for (const c of CONTAINER_FADES) {
    if (!c.probe) {
      say(`    · ${(c.where + '  ' + c.what).padEnd(52)} ${String(c.ms).padStart(4)}ms   (declared, ungreppable)`);
      continue;
    }
    const n = hits(c.probe, f => f === c.where).length;
    say(`    · ${(c.where + '  ' + c.what).padEnd(52)} ${String(c.ms).padStart(4)}ms   ${n} site(s)` +
        (n === c.want ? '' : '   🔴'));
    if (n !== c.want) {
      say(`    🔴 THE DECLARED CONTAINER ANIMATION AT \`${c.where}\` IS NO LONGER THERE (or moved).`);
      say(`       ${c.why}.`);
      say('       This table sets the floor every alpha-only entrance below is measured against, so a');
      say('       stale row silently relaxes the rule rather than failing it.');
      violations++;
    }
  }
  const FLOOR = Math.max(...CONTAINER_FADES.map(c => c.ms));
  sub('longest container animation', FLOOR, 'exact', 200,
      'ms — the floor an alpha-only mount entrance must clear. A CHANGE here is a review event: it ' +
      'moves a threshold every hook below is judged against. ⚠️ It was 220 until 2026-08-06, set by ' +
      'the tab scene cross-fade; that transition is now a CUT and the floor is the pre-API-33 nested ' +
      'stack. 🔴 The clearance did NOT move with it — 300 still clears 200, and re-tuning a shared ' +
      'front-load to whatever the current worst case happens to be turns a derived number into a ' +
      'fitted one.');

  // ── THE DELAY RESOLVER, shared by LEG C and LEG D ────────────────────────────────────────
  //
  // 🔴 IT RESOLVES A SUM OF NAMED TERMS, NOT A SINGLE TOKEN, AND THE WIDENING IS FORCED RATHER
  //    THAN CONVENIENT. Both entrance delays are now written as `TRANSITION_CLEARANCE + dur.x` —
  //    that shape is the whole point (the clearance is a shared front-load; the second term is the
  //    per-hook sequencing) and the first draft of this rule, which matched `withDelay(dur.` only,
  //    would have failed to resolve it. ⚠️ AND AN UNRESOLVED DELAY IS TREATED AS A FAILURE
  //    THROUGHOUT, never skipped: an unrun check reads identically to a passing one (LEG B).
  // ⚠️ `TRANSITION_CLEARANCE` IS READ FROM THE MODULE AND ITS VALUE FROM `theme.js`, so a rename
  //    fails loudly and a re-pointing at a different duration is visible in the printed number.
  const CLEARANCE_DECL = modSrc.match(/const TRANSITION_CLEARANCE = dur\.([a-z]+);/);
  const CLEARANCE = CLEARANCE_DECL ? DURATIONS[CLEARANCE_DECL[1]] : undefined;
  say(`    · ${'TRANSITION_CLEARANCE'.padEnd(28)} ` +
      `${typeof CLEARANCE === 'number' ? String(CLEARANCE).padStart(4) + 'ms' : '  🔴  '}   ` +
      `the shared front-load every entrance waits out${typeof CLEARANCE === 'number' ? '' : '   🔴'}`);
  if (typeof CLEARANCE !== 'number') {
    say('    🔴 THE MODULE NO LONGER DECLARES `TRANSITION_CLEARANCE` AS A DURATION TOKEN. That');
    say('       constant is the only thing putting the entrances outside the container animations,');
    say('       and every delay below is expressed in terms of it — so losing it makes the two rules');
    say('       under this heading unresolvable rather than false, which is worse.');
    violations++;
  }
  //
  // 🔴 AND IT RESOLVES A GUARANTEED **MINIMUM**, NOT A VALUE, WHICH IS THE ONLY SOUND READING WHEN
  //    ONE TERM COMES FROM A CALLER. `useEntrance`'s delay is the clearance PLUS a per-item stagger
  //    supplied at the call site — a number no static reader can know. 🔴 THE FIRST DRAFT OF THIS
  //    RESOLVER SIMPLY FAILED ON IT, WHICH WAS RIGHT (an unresolvable delay is never a pass) AND
  //    THE FIX BELONGED IN THE MODULE RATHER THAN HERE: the addend is now written
  //    `Math.max(0, delay)`, so the term is provably non-negative and the sum's floor is the
  //    constant part. A clamp in the source is worth more than an assumption in the gate — it also
  //    stops a negative index at any of the call sites pulling the start back inside the window.
  // ⚠️ ANY OTHER SHAPE STAYS UNRESOLVABLE ON PURPOSE. A bare identifier could be negative and a
  //    zero lower bound would then be a fiction, which is the "unrun check reads as a pass" class.
  const firstArg = chunk => {
    const i = chunk.search(/withDelay\s*\(/);
    if (i < 0) return undefined;
    let j = chunk.indexOf('(', i) + 1, d = 1;
    const start = j;
    for (; j < chunk.length && d > 0; j++) {
      const c = chunk[j];
      if (c === '(') d++;
      else if (c === ')') d--;
      else if (c === ',' && d === 1) return chunk.slice(start, j);
    }
    return undefined;
  };
  const plusTerms = expr => {
    const out = [];
    let d = 0, cur = '';
    for (const c of expr) {
      if ('([{'.includes(c)) d++;
      else if (')]}'.includes(c)) d--;
      if (c === '+' && d === 0) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  function resolveDelay(chunk) {
    const arg = firstArg(chunk);
    if (!arg) return undefined;
    let total = 0;
    for (const term of plusTerms(arg)) {
      if (term === 'TRANSITION_CLEARANCE') {
        if (typeof CLEARANCE !== 'number') return undefined;
        total += CLEARANCE;
        continue;
      }
      const d = term.match(/^dur\.([a-z]+)$/);
      if (d && typeof DURATIONS[d[1]] === 'number') { total += DURATIONS[d[1]]; continue; }
      // a caller-supplied term, clamped at its source — contributes its floor of 0
      if (/^Math\.max\(\s*0\s*,/.test(term)) continue;
      return undefined;
    }
    return total;
  }

  const chunks = modSrc.split(/(?=export (?:function|const) )/).filter(c => /^export /.test(c));
  const nameOf = c => (c.match(/export (?:function|const) ([A-Za-z_$][\w$]*)/) || [])[1] || '?';
  // "plays once per mount" — a mutable box read inside an effect is the module's one spelling of
  // it, and rule 3's easing boundary is what stops a hand-rolled entrance existing elsewhere.
  // ⚠️ READ FROM THE CODE PROJECTION, NEVER THE RAW SOURCE. `modSrc` is already comment-stripped —
  //    without that, the paragraph explaining why a hook is keyed the way it is would name the very
  //    spelling this keys on and classify the hook it describes. That is `O-54` direction 2 exactly,
  //    and it is a guard that quietly opens. It is also why the prose in `lib/motion.ts` can discuss
  //    both keyings freely: nothing here can see it.
  const isMountKeyed = c => /played\.current/.test(c);
  const isFocusKeyed = c => /useFocusEffect\s*\(/.test(c);

  let alphaOnly = 0;
  for (const c of chunks) {
    const name = nameOf(c);
    const carriesAlpha = /\bopacity\s*:/.test(c);
    const carriesOffset = /\btransform\s*:/.test(c);
    if (!(isMountKeyed(c) || isFocusKeyed(c)) || !carriesAlpha || carriesOffset) continue;
    alphaOnly++;

    const ms = resolveDelay(c);
    const ok = typeof ms === 'number' && ms >= FLOOR;
    say(`    · ${name.padEnd(28)} ${ok ? String(ms).padStart(4) + 'ms' : '  🔴  '}   alpha-only, ` +
        `arrival-keyed  (needs >= ${FLOOR})`);
    if (typeof ms !== 'number') {
      say(`    🔴 \`${name}\` IS AN ALPHA-ONLY ARRIVAL ENTRANCE AND ITS DELAY COULD NOT BE RESOLVED.`);
      say('       An unresolvable delay is a FAILURE, never a pass — an unrun check reads identically');
      say('       to a passing one (LEG B paid for that lesson already). Write the delay as a sum of');
      say('       named tokens so this rule can read it, or give the entrance a second channel.');
      violations++;
    } else if (!ok) {
      say(`    🔴 \`${name}\` ANIMATES NOTHING BUT ALPHA AND STARTS AT ${ms}ms, INSIDE A CONTAINER`);
      say(`       ANIMATION THAT RUNS TO ${FLOOR}ms. Two alpha curves on one surface MULTIPLY, so this`);
      say('       entrance is running and cannot be seen — no wrong value anywhere, every other rule');
      say('       green, and the only witness is a person looking at a device. Either delay it past');
      say('       the floor above, or give it a channel that survives the composition (a translate is');
      say('       not multiplied by the container alpha; a second alpha ramp is).');
      violations++;
    }
  }
  // ── §18.1's SEQUENCING, ASSERTED AS A RELATIONSHIP BETWEEN TWO HOOKS ──────────────────────
  //
  // 🔴 FOUND BY AN INJECTION CASE, NOT BY READING THE CODE, AND IT IS THE `O-67` FAMILY AGAIN:
  //    deleting the clearance term from the plate's delay leaves it at 300ms, which CLEARS THE
  //    220ms FLOOR — so every rule above stayed green while §18.1's "SEQUENCED AFTER its host
  //    card's entrance, never parallel" had silently inverted into a parallel arrival. A floor is
  //    not an ordering, and the plate needs both.
  // 🟢 So the host's LANDING TIME is computed from the focus-keyed entrance itself — its resolved
  //    start plus its own animation duration — and the plate is measured against that rather than
  //    against a number written here. Retiming the entrance moves this threshold with it, which is
  //    the same derivation the module makes in code, checked instead of trusted.
  //
  // 🔴 TWO HARDENINGS LANDED 2026-08-06 WITH THE `useDrawIn` ITEM, AND BOTH ARE THE SAME LESSON:
  //    THIS BLOCK USED TO ASSUME THERE WAS EXACTLY ONE FOCUS-KEYED HOOK IN THE MODULE.
  //      1 THE HOST IS RESOLVED BY **NAME**, not by `find(isFocusKeyed)`. With a second focus-keyed
  //        hook in the file, `find` returns whichever one is written FIRST — so a reordering of two
  //        function declarations, which no reviewer would look at twice, could silently re-point the
  //        threshold at the wrong hook. A missing host is a FAILURE, never a skip.
  //      2 THE SEQUENCING CHECK NO LONGER FILTERS ON THE ALPHA CHANNEL. It used to require
  //        `opacity:` and no `transform:`, which described `usePlateEntrance` and nothing else — so
  //        a NEW arrival-keyed entrance on any other channel (a paint prop, say) would have been
  //        exempt from §18.1's ordering rule by accident of its channel. The ordering rule is about
  //        WHEN two things arrive, not about what they animate. The rule is now: every arrival-keyed
  //        hook EXCEPT the host itself must start at or after the host lands.
  {
    const HOST = 'useEntrance';
    const host = chunks.find(c => nameOf(c) === HOST);
    if (!host) {
      say(`    🔴 THE HOST ENTRANCE \`${HOST}\` IS NOT IN THIS MODULE, so §18.1's sequencing has no`);
      say('       threshold to measure against and was NOT checked. It was resolved by name rather');
      say('       than by "the first focus-keyed hook" precisely so this fails instead of silently');
      say('       re-pointing at another hook.');
      violations++;
    }
    const hostStart = host ? resolveDelay(host) : undefined;
    const hostDurTok = host && host.match(/withTiming\([^)]*\{\s*duration:\s*dur\.([a-z]+)/);
    const hostDur = hostDurTok ? DURATIONS[hostDurTok[1]] : undefined;
    const land = typeof hostStart === 'number' && typeof hostDur === 'number'
      ? hostStart + hostDur : undefined;
    say(`    · ${'host entrance lands at'.padEnd(28)} ` +
        `${typeof land === 'number' ? String(land).padStart(4) + 'ms' : '  🔴  '}   ` +
        `§18.1's "never parallel" threshold${typeof land === 'number' ? '' : '   🔴'}`);
    if (typeof land !== 'number') {
      say('    🔴 THE HOST ENTRANCE\'S LANDING TIME COULD NOT BE COMPUTED, so §18.1\'s sequencing was');
      say('       NOT checked. An unrun check reads identically to a passing one.');
      violations++;
    } else {
      let sequenced = 0;
      for (const c of chunks) {
        if (!(isMountKeyed(c) || isFocusKeyed(c))) continue;
        const name = nameOf(c);
        if (name === HOST) continue;                       // the host cannot follow itself
        sequenced++;
        const ms = resolveDelay(c);
        if (typeof ms === 'number' && ms >= land) continue;
        say(`    🔴 \`${name}\` STARTS AT ${ms}ms, BEFORE ITS HOST ENTRANCE LANDS AT ${land}ms.`);
        say('       §18.1: a decorative layer\'s entry is "SEQUENCED AFTER its host card\'s entrance —');
        say('       never parallel", because "two things arriving at once reads as jitter." Clearing');
        say('       the container floor is a different, weaker claim and does not imply this one.');
        violations++;
      }
      sub('sequenced after the host', sequenced, 'exact', 2,
          '— `usePlateEntrance` (§18.1 row 1) and `useDrawIn` (§18, owner-requested 2026-08-06). ' +
          '🔴 A FALL means an arrival-keyed hook stopped being MEASURED against the ordering rule, ' +
          'which is how the channel filter this replaced exempted anything that was not alpha-only.');
    }
  }
  sub('alpha-only arrival entrances', alphaOnly, 'exact', 1,
      '— `usePlateEntrance`, and it is legal only because §18.1 sequences it AFTER its host. ' +
      'A RISE is a new entrance in the shape that shipped cut 3 unobservable. A FALL means the plate ' +
      'gained a second channel, which §18.1 forbids in those words ("opacity ONLY").');

  // ── LEG D · 🔴 REPEATABILITY — PERCEPTIBLE ONCE IS NOT PERCEPTIBLE ────────────────────────
  //
  // 🔴 LEG C ASKED WHETHER ANYONE CAN SEE THE ENTRANCE TRAVEL. THIS ASKS WHETHER THEY EVER GET A
  //    SECOND CHANCE. Cut 4's device pass reported "no motion anywhere except button clicks" with
  //    LEG A green on every hook and LEG C green on the only one it governs — because the surviving
  //    defect was not in a value or a channel, it was in the KEY.
  //
  // ── THE MECHANISM, MEASURED IN THE INSTALLED NAVIGATOR ─────────────────────────────────────
  //
  // `@react-navigation/bottom-tabs` KEEPS A SCENE MOUNTED once it has been visited — that is what
  // makes tab switching instant. So an entrance guarded to play once per MOUNT gets **exactly one
  // opportunity in the life of the app per screen**, and that opportunity lands during the
  // container animation LEG C measures. The two defects compose into a total loss: the one showing
  // is invisible, and the guard correctly suppresses every repeat that would have been visible.
  //
  // 🔴 SO THE RULE IS A SHAPE, NOT A NUMBER, AND IT IS STATED IN BOTH DIRECTIONS. An entrance must
  //    replay on a NEW FOCUS and must NOT replay on a RE-RENDER. Those are different events and
  //    conflating them is what produced the defect:
  //      · focus-keyed via the navigator's own focus/blur events -> replays per visit;
  //      · with a MEMOISED callback -> a re-render is not an input at all (§5.3 rule 2).
  //    ⚠️ THE MEMOISATION HALF IS NOT STYLE. The focus hook lists its callback in a dependency
  //       array, so an inline arrow re-subscribes on every render and re-fires the entrance with
  //       it — a list re-fetch would re-stagger, which is precisely what §5.3 rule 2 forbids. The
  //       fix for one direction is the defect in the other, so both are asserted here.
  //
  // ⚠️ MOUNT-KEYING IS NOT BANNED, IT IS **DECLARED AND COUNTED**, for the same reason LEG B's
  //    wrappers are: `usePlateEntrance` is alpha-only by §18.1's explicit ruling, and a wait on an
  //    alpha-only entrance is a wait on nothing being painted. Replaying it per focus would blank a
  //    decorative layer on every return. The exception is real, it is one, and a SECOND one is a
  //    review event rather than a diff.
  say('  (repeatability — a once-per-mount entrance on a screen the navigator keeps mounted');
  say('   is observable only on FIRST VISIT)');
  {
    const MOUNT_KEYED_ALLOWED = new Set(['usePlateEntrance']);
    let focusKeyed = 0, mountKeyed = 0;
    for (const c of chunks) {
      const name = nameOf(c);
      const focus = isFocusKeyed(c), mount = isMountKeyed(c);
      if (!focus && !mount) continue;
      const ms = resolveDelay(c);
      const clears = typeof ms === 'number' && ms >= FLOOR;
      say(`    · ${name.padEnd(28)} ${focus ? 'FOCUS-keyed' : 'MOUNT-keyed'}   ` +
          `${clears ? String(ms).padStart(4) + 'ms' : '  ??  '} start (needs >= ${FLOOR})` +
          (clears ? '' : '   🔴'));
      if (!clears) {
        say(`    🔴 \`${name}\` IS AN ARRIVAL ENTRANCE WHOSE START COULD NOT BE RESOLVED, OR WHICH`);
        say(`       STARTS INSIDE THE ${FLOOR}ms CONTAINER WINDOW. An entrance that resolves while its`);
        say('       own screen is still being brought in is running and unobservable, whatever');
        say('       channel it travels on — the schedule is a second mechanism from the channel and');
        say('       fixing one does not fix the other.');
        violations++;
      }
      if (focus) {
        focusKeyed++;
        if (mount) {
          say(`    🔴 \`${name}\` IS FOCUS-KEYED **AND** CARRIES A PER-MOUNT GUARD. The guard wins on`);
          say('       every visit after the first, so the focus keying is decorative and the entrance');
          say('       is back to one opportunity per screen. Keep one key, not two.');
          violations++;
        }
        if (!/useFocusEffect\s*\(\s*\r?\n?\s*useCallback\s*\(/.test(c)) {
          say(`    🔴 \`${name}\`'s FOCUS EFFECT IS NOT MEMOISED. The hook lists its callback in a`);
          say('       dependency array, so an inline callback tears down and re-subscribes on EVERY');
          say('       RENDER and replays the entrance with it. §5.3 rule 2: "never on re-render; a');
          say('       list re-fetch does not re-stagger." Wrap it in `useCallback`.');
          violations++;
        }
      } else {
        mountKeyed++;
        if (!MOUNT_KEYED_ALLOWED.has(name)) {
          say(`    🔴 \`${name}\` PLAYS ONCE PER MOUNT AND IS NOT A DECLARED EXCEPTION. Bottom tabs`);
          say('       keep their scenes mounted, so this entrance has exactly ONE opportunity per');
          say('       screen for the life of the app — and it spends it under the container');
          say('       animation. Key it on focus, or add it to MOUNT_KEYED_ALLOWED with the reason');
          say('       its wait is a wait on something PAINTED.');
          violations++;
        }
      }
    }
    sub('focus-keyed entrances', focusKeyed, 'exact', 2,
        '— `useEntrance`, inherited by 25 screens, and `useDrawIn`, the §15 one-shot path draw-in ' +
        '(owner-requested 2026-08-06). A FALL to 1 or 0 is the cut-4 defect restored: an entrance ' +
        'animating exactly once in the life of the app, under its own arrival. ⚠️ It was 1 until ' +
        'the draw-in landed; a RISE beyond 2 is a new per-visit entrance and a review event, because ' +
        'every focus-keyed hook replays on EVERY return and its wait is paid every time.');
    sub('mount-keyed entrances', mountKeyed, 'exact', MOUNT_KEYED_ALLOWED.size,
        '— the declared set, and nothing else.');
  }
}

say(`  ${'motion arrival'.padEnd(34)} ${violations ? String(violations) + ' finding(s)   🔴' : 'clean'}`);
process.exit(violations ? 1 : 0);
