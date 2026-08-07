#!/usr/bin/env node
/**
 * p23-optin-check.js — THE P23 OPT-IN COMPLETENESS CHECK.
 *
 * ── 🔴 WHY THIS EXISTS, AND WHY A GREP CANNOT DO IT ────────────────────────────────────
 *
 * P23 / O-13: pass 4 sets `Text.defaultProps.allowFontScaling = false` app-wide. That is
 * only shippable because the five `scales: true` reading-copy steps opt back IN. Pass 2b
 * landed those opt-ins. **The opt-in is TWO DIFFERENT EDITS depending on where the style
 * lives, and that is the whole point of this file:**
 *
 *   · style written INLINE on the element  ->  `{...t.txt('text-sm')}` carries the style
 *                                              AND both props. ONE edit. 138 sites.
 *   · style written in StyleSheet.create   ->  the style object carries the leading, but
 *                                              `allowFontScaling` and
 *                                              `maxFontSizeMultiplier` are <Text> PROPS
 *                                              and CANNOT live in a style object at all.
 *                                              The opt-in must be added SEPARATELY, at
 *                                              every JSX element that consumes the style.
 *                                              TWO edits, in two places. 41 sites.
 *
 * 🔴 "138 OF 179 LOOKS FINISHED" IS THE TRAP THIS FILE EXISTS TO PREVENT. A style-object
 *    rewrite closes 138, drives every other counter to its floor, passes tsc, passes
 *    --diff, passes --members — and leaves 41 reading-copy sites that SILENTLY DO NOT
 *    SCALE the moment pass 4's global freeze lands. There is no other signal: the missing
 *    thing is a prop that was never there, on an element that renders correctly today.
 *
 * 🔴 SO THE 41 ARE COUNTED SEPARATELY, ALWAYS, AND NEVER FOLDED INTO THE 138.
 *    Two independent numbers with two independent failure modes. A single total would let
 *    a shortfall in one be masked by the other — the same reasoning as §3.0.2.2.2's
 *    residual histogram, one level down.
 *
 * MISSING must be 0. It is a DECREASING COUNTER (§3.0.2.0 class 1), so it cannot be
 * blinded: a consumer that dodges the pattern is still a consumer, and the count does not
 * fall. Exits nonzero if any is missing.
 *
 * Usage, from mobile/:   node scripts/p23-optin-check.js [--verbose]
 */
const fs = require('fs');
const path = require('path');

const ROOTS = ['app', 'components'];
// 🔴 EIGHT STEPS FROM 2026-08-03, NOT FIVE — the three display steps joined the scaling set by
//    owner ruling (`P42` / `O-50`; the reasoning and the two renderer measurements are in
//    theme.js beside the ramp). ⚠️ THIS SET IS HARDCODED AND theme.js's `scales` FLAG IS THE OTHER
//    HALF OF ONE CONTRACT: nothing here derives from that table, so a future change to it that
//    does not touch this line leaves this gate enforcing the old shape while reading green. Grep
//    them together; they are one edit. The same set exists a third time in
//    scripts/primitive-adoption-check.js.
const SCALES = new Set(['text-sm', 'text-xs', 'text-base', 'text-lg', 'quote',
                        'display-lg', 'display-md', 'display-sm']);
const VERBOSE = process.argv.includes('--verbose');

function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

// Byte ranges covered by a StyleSheet.create( ... ) call.
function ssRanges(src) {
  const r = [], re = /StyleSheet\.create\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, d = 1;
    while (i < src.length && d > 0) {
      const c = src[i];
      if (c === '(') d++; else if (c === ')') d--;
      i++;
    }
    r.push([m.index, i]);
  }
  return r;
}

// StyleSheet keys whose entry holds a `scales: true` ramp step.
function scalingKeys(src, ranges) {
  const keys = new Map();
  for (const [a, b] of ranges) {
    const seg = src.slice(a, b);
    const re = /(^|[\s,{])([A-Za-z_$][\w$]*)\s*:\s*\{/g;
    let m;
    while ((m = re.exec(seg))) {
      const open = m.index + m[0].length - 1;
      let i = open + 1, d = 1;
      while (i < seg.length && d > 0) { const c = seg[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
      const s = seg.slice(open, i).match(/t\.type\['([a-z0-9-]+)'\]\.size/);
      if (s && SCALES.has(s[1])) keys.set(m[2], s[1]);
    }
  }
  return keys;
}

let inlineOptIn = 0;          // the 138 — style + props from one txt() call
let ssStyles = 0;             // StyleSheet styles holding a scaling step
let ssConsumers = 0;          // JSX elements consuming one
let ssMissing = [];           // …that carry NO allowFontScaling  -> must be 0
const detail = [];

for (const f of ROOTS.reduce((a, r) => walk(r, a), [])) {
  const rel = f.split(path.sep).join('/');
  const src = fs.readFileSync(f, 'utf8');
  const ranges = ssRanges(src);

  // ── the inline half: a txt() PROP SPREAD on a scales:true step ──
  const sp = /\{\.\.\.t\.txt\('([a-z0-9-]+)'\)\}/g;
  let m;
  while ((m = sp.exec(src))) if (SCALES.has(m[1])) inlineOptIn++;

  // ── the StyleSheet half ──
  const keys = scalingKeys(src, ranges);
  for (const [key, step] of keys) {
    ssStyles++;
    const use = new RegExp('styles\\.' + key + '\\b', 'g');
    let u;
    while ((u = use.exec(src))) {
      if (ranges.some(r => u.index >= r[0] && u.index < r[1])) continue;   // the definition
      const tAt = src.lastIndexOf('<', u.index);
      if (tAt < 0) continue;
      const tag = (src.slice(tAt).match(/^<([A-Za-z][\w.]*)/) || [, ''])[1];
      if (!/Text$/.test(tag)) continue;      // a View consuming a text style is not a scaler
      ssConsumers++;
      const head = src.slice(tAt, u.index);
      const ln = src.slice(0, u.index).split(/\r?\n/).length;
      if (head.indexOf('allowFontScaling') === -1) {
        ssMissing.push(rel + ':' + ln + '  <' + tag + '> styles.' + key + '  (' + step + ')');
      } else if (VERBOSE) {
        detail.push('  ok   ' + rel + ':' + ln + '  styles.' + key + '  ' + step);
      }
    }
  }
}

if (VERBOSE && detail.length) console.log(detail.join('\n'));

console.log('  ' + 'inline · style+props from one txt()'.padEnd(40) + String(inlineOptIn).padStart(5));
console.log('  ' + 'StyleSheet · scaling styles'.padEnd(40) + String(ssStyles).padStart(5));
console.log('  ' + 'StyleSheet · JSX consumers opted in'.padEnd(40) + String(ssConsumers - ssMissing.length).padStart(5));
console.log('  ' + 'StyleSheet · consumers MISSING the prop'.padEnd(40) + String(ssMissing.length).padStart(5) +
            (ssMissing.length ? '   🔴 MUST BE 0' : ''));

if (ssMissing.length) {
  console.log('\n🔴 THESE READING-COPY SITES WILL SILENTLY STOP SCALING AT PASS 4.');
  console.log('   Their style carries the ramp leading, but allowFontScaling is a <Text> PROP');
  console.log('   and cannot live in a style object. Add it at each element below.\n');
  ssMissing.forEach(s => console.log('  ' + s));
  process.exit(1);
}
process.exit(0);
