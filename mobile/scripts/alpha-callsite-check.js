#!/usr/bin/env node
/**
 * alpha-callsite-check.js — THE EIGHTEENTH NAMED RULE, and pass 5's runnable half of its
 * arrival assertion. Added 2026-07-31 (pass 5).
 *
 * ── 🔴 WHY IT EXISTS ────────────────────────────────────────────────────────────────────
 *
 * `theme.alpha()` THROWS by design on a token that already carries alpha, and pass 5 changed
 * WHICH tokens those are: `border-subtle`/`border-strong` went solid-hex -> rgba, while
 * `surface-raised`/`surface-overlay`/`locked` went rgba -> solid hex. The role denylist is
 * flip-stable so nothing should have moved — but "should" is not a measurement, and the failure
 * mode is the worst one this repo has: 17 of the call sites live inside `StyleSheet.create`,
 * i.e. MODULE SCOPE, where a throw runs at IMPORT, before React mounts, before the root
 * ErrorBoundary exists. The app dies white with no recoverable signal.
 *
 * 🔴 AND NOTHING ELSE CAN SEE IT. `tsc` types `alpha()` as `(string, number) => string` and is
 *    satisfied. `token-gate.sh` greps source text and the source is correct. `--diff` resolves
 *    className utilities and every one of these is an inline style (codemod-plan §3.0.2's
 *    standing "--diff CANNOT SEE AN INLINE STYLE"). The screen never renders to be looked at.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────
 *
 * Every `t.alpha(<expr>, <pct>)` call in app+components, with `<expr>` resolved to a real token
 * where it names one, is INVOKED against the live `theme.js`. A throw is a failure. A call whose
 * first argument is an indirection the script cannot resolve statically (a map lookup, a local
 * const) is reported as UNRESOLVED rather than silently skipped — those need a human, and there
 * are three today (`config.color` ×2 via two per-category maps, `IMPACT_TINT` ×1).
 *
 * Usage, from mobile/:  node scripts/alpha-callsite-check.js [--verbose]
 */
const fs = require('fs');
const path = require('path');

const ROOTS = ['app', 'components'];
const t = require(path.resolve(__dirname, '..', 'theme.js'));
// 🔴 `O-91` — one home for the quote-and-comment-safe walker; see that module's header.
const { stripComments } = require('./lib/source-scan');
const VERBOSE = process.argv.includes('--verbose');

function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p.replace(/\\/g, '/'));
  }
  return acc;
}

// t.alpha( <arg1> , <pct> )   — arg1 is greedy-free: no comma or paren inside a token read.
const CALL_RE = /\bt\.alpha\(\s*([^,()]+?)\s*,\s*([0-9]+)\s*\)/g;
// t.color.foo | t.color['foo'] | t.chart.foo
const TOKEN_RE = /^t\.(color|chart)(?:\.([\w-]+)|\[\s*['"]([\w-]+)['"]\s*\])$/;

// 🔴 present-vs-parsed, ASSERTED — `O-91` / `O-67`. This check printed "N ok" and never printed how
//    many `t.alpha(` call sites EXIST, so "96 ok + 3 unresolved" could not be compared with
//    anything. Measured when the question was finally asked: the tree holds 100 occurrences and the
//    check accounted for 99 — and answering whether that was a real hole took a one-off probe
//    rather than a number the gate already had. (It was not a hole: the 100th is inside a COMMENT.)
// 🟢 SO `present` IS COUNTED WITH COMMENTS BLANKED, which fixes both directions at once — prose can
//    no longer inflate the total, and an `alpha()` written in a comment can no longer be "invoked".
//    `parsed == present` then BLOCKS, so a call shape this pattern cannot read fails the gate
//    instead of vanishing from a count nobody compares.
let ok = 0, threw = 0, unresolved = 0, present = 0;
const unresolvedSites = [];
let unparsedFail = false;
for (const file of walk('.', []).filter(f => ROOTS.some(r => f.replace(/^\.\//, '').startsWith(r + '/')))) {
  // 🔴 CODE ONLY. See the `present` note above: comments must neither inflate the denominator nor
  //    supply a call site to invoke. stripComments is length- and newline-preserving, so the
  //    `where` line numbers below stay accurate.
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  if (!/t\.alpha\(/.test(src)) continue;
  present += (src.match(/\bt\.alpha\(/g) || []).length;
  CALL_RE.lastIndex = 0;
  for (const m of [...src.matchAll(CALL_RE)]) {
    const [, arg, pctRaw] = m;
    const pct = Number(pctRaw);
    const where = `${file.replace(/^\.\//, '')}:${src.slice(0, m.index).split('\n').length}`;
    const tm = TOKEN_RE.exec(arg.trim());
    if (!tm) { unresolved++; unresolvedSites.push(`${where}  t.alpha(${arg.trim()}, ${pct})`); continue; }
    const bag = tm[1] === 'chart' ? t.chart : t.color;
    const key = tm[2] || tm[3];
    if (!(key in bag)) {
      console.log(`🔴 ${where}  t.${tm[1]}.${key} is not a token`);
      threw++; continue;
    }
    try {
      const out = t.alpha(bag[key], pct);
      ok++;
      if (VERBOSE) console.log(`   ok ${where}  alpha(${key}, ${pct}) -> ${out}`);
    } catch (e) {
      console.log(`🔴 ${where}  t.alpha(t.${tm[1]}.${key}, ${pct}) THROWS: ${e.message.split('.')[0]}`);
      threw++;
    }
  }
}

printf: {
  const label = 'alpha() call sites · invoked live';
  process.stdout.write(`  ${label.padEnd(38)} ${String(ok).padStart(4)} ok, ${String(threw).padStart(4)} throwing\n`);
  process.stdout.write(`    · ${'first arg not a literal token'.padEnd(24)} ${String(unresolved).padStart(5)}   (report only — read them)\n`);
  if (unresolved && VERBOSE) for (const s of unresolvedSites) process.stdout.write(`        ${s}\n`);
  const parsed = ok + threw + unresolved;
  process.stdout.write(`    · ${'accounting'.padEnd(24)} ${String(present).padStart(5)} present (code only) = ` +
    `${ok} ok + ${threw} throwing + ${unresolved} non-literal` +
    (parsed === present ? '' : `   🔴 ${present - parsed} UNPARSED`) + '\n');
  if (parsed !== present) {
    process.stdout.write(`    🔴 ${present - parsed} call site(s) matched \`t.alpha(\` but NOT the call pattern, so they were\n`);
    process.stdout.write('       never invoked. A shape this pattern cannot read is exactly where an import-time\n');
    process.stdout.write('       throw would hide, and 17 of these live inside StyleSheet.create — i.e. module\n');
    process.stdout.write('       scope, where a throw dies white before the root ErrorBoundary exists.\n');
    process.stdout.write('       🔴 WIDEN CALL_RE. Do not adjust the count.\n');
    unparsedFail = true;
  }
}
process.exit(threw || unparsedFail ? 1 : 0);
