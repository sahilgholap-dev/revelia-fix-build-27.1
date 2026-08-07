#!/usr/bin/env node
/**
 * resolve-utilities.js — the IDENTITY-PASS GATE HARNESS for the 2.1.0 codemod.
 *
 * Compiles mobile/tailwind.config.js with the repo's own tailwindcss CLI through
 * nativewind's preset over the repo's real `content` globs, then feeds the emitted CSS
 * through react-native-css-interop's cssToReactNativeRuntime at the inlineRem actually
 * set in metro.config.js — i.e. byte-for-byte the production resolution path, because
 * withCssInterop holds the options in a closure and hands them straight to this same
 * function (react-native-css-interop/dist/metro/index.js:69,76,168).
 *
 * Output: a stable, sorted JSON map  className -> { resolved RN style declarations }.
 *
 * Usage, from mobile/:
 *   node scripts/resolve-utilities.js > /tmp/before.json
 *   node scripts/resolve-utilities.js > /tmp/after.json
 *   node scripts/resolve-utilities.js --diff /tmp/before.json /tmp/after.json
 *   node scripts/resolve-utilities.js --map map.json --before /tmp/before.json --after /tmp/after.json
 *   node scripts/resolve-utilities.js --members [snapshot.json]
 *
 * Writes nothing into mobile/. The temp CSS goes to the OS temp dir and is removed.
 *
 * ── 🔴 WHY `--members` EXISTS — THE FOURTH BLINDNESS CLASS (codemod-plan §3.0.2.0) ─────
 *
 * The named gate rules in token-gate.sh SEARCH SOURCE FOR A VOCABULARY THEY WERE TOLD
 * ABOUT. A rule that lists names is only as good as its list, and two live defects proved
 * it — with two DIFFERENT root causes, neither reachable by any grep:
 *
 *   · `orange`  — a REAL Tailwind ramp colour that no-legacy-tokens' pattern simply
 *                 OMITTED. profile.tsx's streak badge was counted by nothing, survived
 *                 every batch, and would have stopped resolving the instant S1 deleted
 *                 the defaults.
 *   · `error`   — a token that NEVER EXISTED AT ALL. It resolved to nothing on a live
 *                 banner in birth-data.tsx. No vocabulary list can contain a name nobody
 *                 ever coined.
 *
 * Both were found the same way and only that way: by comparing every className the SOURCE
 * actually writes against the rule set the CONFIG actually RESOLVES. `--diff` sees a class
 * whose VALUE moved; only `--members` sees a class that resolves to NOTHING because nobody
 * enumerated it. Run ad hoc, it will not be run again — hence a mode, not a one-off script.
 *
 * 🔴 RUN IT ON EVERY BATCH THAT EDITS tailwind.config.js OR theme.js. Pass 2a's S2 is the
 *    single largest change to what resolves in the whole codemod: it strips the `text-`
 *    prefix from all 12 ramp keys at the Tailwind boundary.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MOBILE = process.cwd();

function readInlineRem() {
  const src = fs.readFileSync(path.join(MOBILE, 'metro.config.js'), 'utf8');
  const m = src.match(/inlineRem\s*:\s*(false|\d+(?:\.\d+)?)/);
  if (!m) return 14; // nativewind's own default — nativewind/dist/metro/index.js:14
  return m[1] === 'false' ? false : Number(m[1]);
}

function compileCss() {
  const out = path.join(os.tmpdir(), `revelia-gate-${process.pid}.css`);
  const win = process.platform === 'win32';
  const bin = path.join(MOBILE, 'node_modules', '.bin', win ? 'tailwindcss.cmd' : 'tailwindcss');
  // 🔴 QUOTE THE PATHS ON WINDOWS. `shell: win` is required (Node >=20.12 refuses to
  //    execFileSync a .cmd without a shell), but a shell also RE-PARSES the command string — so an
  //    unquoted path breaks on a space, and cmd.exe additionally treats ( ) as grouping syntax.
  //    Measured: a checkout under a directory named with a space AND parentheses made this throw
  //    "Command failed" with no stderr, which reads as a tailwind failure rather than a quoting
  //    one. That silently disables the ONE instrument that can see a rule appear from nowhere
  //    (O-69), on the platform where nothing else would report it. Quoting is a no-op on a clean
  //    path, so this costs nothing and removes a whole class of environment-dependent blindness.
  const q = (s) => (win ? `"${s}"` : s);
  execFileSync(q(bin), ['-i', './global.css', '-o', q(out)], {
    cwd: MOBILE, stdio: ['ignore', 'ignore', 'ignore'], shell: win,
  });
  const css = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(out);
  return css;
}

/**
 * A rule is  { n: [ { d: [ group, ... ] } ] }.  A `group` is EITHER a list of
 * declarations OR itself a single tuple declaration `[valueDescriptor, "propName"]`
 * — told apart by whether its last element is a string. A declaration is either a
 * plain `{prop: value}` object (all the numeric families) or that tuple form (every
 * colour family, whose value stays an unevaluated rgba/var descriptor).
 */
function flatten(rule) {
  const acc = {};
  const groups = (rule?.n ?? []).flatMap((n) => n.d ?? []);
  for (const group of groups) {
    const isTuple = Array.isArray(group) && typeof group[group.length - 1] === 'string';
    for (const decl of isTuple ? [group] : (Array.isArray(group) ? group : [group])) {
      if (Array.isArray(decl)) {
        const prop = decl[decl.length - 1];
        if (typeof prop === 'string') acc[prop] = decl[0];
      } else if (decl && typeof decl === 'object') {
        Object.assign(acc, decl);
      }
    }
  }
  return acc;
}

function resolveAll() {
  const inlineRem = readInlineRem();
  const { cssToReactNativeRuntime } = require(
    path.join(MOBILE, 'node_modules', 'react-native-css-interop', 'dist', 'css-to-rn')
  );
  const rt = cssToReactNativeRuntime(compileCss(), { inlineRem });
  const map = {};
  for (const [cls, rule] of Object.entries(rt.rules ?? {})) map[cls] = flatten(rule);
  process.stderr.write(`inlineRem=${inlineRem}  rules=${Object.keys(map).length}\n`);
  return map;
}

function stable(o) {
  const out = {};
  for (const k of Object.keys(o).sort()) out[k] = o[k];
  return JSON.stringify(out, null, 2);   // NOT (o, keys.sort(), 2) — see the note above
}

// ─────────────────────────────────────────────────────────────────────────────────────
// --members: the SOURCE side. Everything below reads .tsx; nothing above it does.
// ─────────────────────────────────────────────────────────────────────────────────────

/** The config's own `content` globs, in the only form this repo uses. */
const CONTENT_DIRS = ['app', 'components'];
const SRC_EXT = /\.(js|jsx|ts|tsx)$/;
/** Marks where a `${…}` interpolation sat, so a partial token is never silently counted. */
const INTERP = '\u0000';

function walkSources(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSources(p, out);
    else if (SRC_EXT.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * Pull every `className=` VALUE out of a file as a raw expression string.
 * 🔴 Brace matching is QUOTE-AWARE and therefore balanced: `className={cond ? 'a' : 'b'}`
 * and a nested object/template both terminate correctly. A naive indexOf('}') truncates
 * the first ternary it meets and silently loses every class after it in that attribute —
 * which is exactly the under-reporting this mode exists to prevent.
 */
function classNameExprs(src) {
  const out = [];
  const re = /className\s*=\s*/g;
  let m;
  while ((m = re.exec(src))) {
    const at = m.index + m[0].length;
    const line = src.slice(0, m.index).split('\n').length;
    const c = src[at];
    if (c === '"' || c === "'") {
      const end = src.indexOf(c, at + 1);
      if (end === -1) continue;
      out.push({ expr: src.slice(at, end + 1), line });
      re.lastIndex = end + 1;
    } else if (c === '{') {
      let i = at + 1, depth = 1, q = null;
      while (i < src.length && depth > 0) {
        const ch = src[i];
        if (q) {
          if (ch === '\\') i++;
          else if (ch === q) q = null;
        } else if (ch === '"' || ch === "'" || ch === '`') q = ch;
        else if (ch === '{') depth++;
        else if (ch === '}') depth--;
        i++;
      }
      out.push({ expr: src.slice(at + 1, i - 1), line });
      re.lastIndex = i;
    }
  }
  return out;
}

/**
 * 🔴 A COMPARISON OPERAND IS NOT A CLASS — and treating it as one DECOMMISSIONS this mode.
 *
 * Recursing into `${…}` is what makes the check complete, and it is also what drags in
 * every literal on the CONDITION side of the conditional it recursed into:
 *     `${billingPeriod === 'annual' ? 'bg-accent' : ''}`
 *      └─ 'annual' is a VALUE BEING COMPARED. 'bg-accent' is the class.
 *
 * Measured on the first run: 7 of 10 "unresolved classes" were operands of this exact
 * shape — `'monthly'`, `'annual'`, `'premium'`, `'premium_plus'`, `'left'`, `'right'`,
 * `'DELETE'`. That is a 70% false-positive rate, and §3.0.2.0 names OVER-finding as the
 * MORE INSIDIOUS failure direction precisely because a rule that cries wolf gets ignored,
 * and an ignored rule is a disabled rule. So the operands are removed before harvesting.
 *
 * 🔴 THE ALTERNATION IS ORDERED MOST-SPECIFIC-FIRST (P-2, and the same invariant as
 *    no-bare-scrim's): `===` must precede `==` and `!==` must precede `!=`, or the longer
 *    operator is matched as the shorter one plus a stray `=` and the operand survives.
 *
 * It cannot delete a real class: a class string is never an operand of an equality
 * operator. Verified in both directions against the pre-S2 tree — see --members' own
 * assertion in the pass-2a commit body.
 */
const CMP_RIGHT = /(===|!==|==|!=)\s*(['"])(?:\\.|(?!\2)[^\\])*\2/g;
const CMP_LEFT = /(['"])(?:\\.|(?!\1)[^\\])*\1\s*(===|!==|==|!=)/g;
const dropComparisonOperands = (s) =>
  s.replace(CMP_RIGHT, (m, op) => op).replace(CMP_LEFT, (m, q, op) => op);

/**
 * Harvest every string literal in an expression, at ANY nesting depth, RECURSING INTO
 * `${…}` interpolations — because `` `${big ? 'text-lg' : 'text-sm'}` `` hides two real
 * classes inside one. A literal-text run adjacent to an interpolation keeps an INTERP
 * marker so `text-${size}` is reported as interpolated rather than counted as `text-`.
 */
function harvest(expr, out = []) {
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === '"' || c === "'") {
      let j = i + 1, buf = '';
      while (j < expr.length && expr[j] !== c) {
        if (expr[j] === '\\') { buf += expr[j + 1] ?? ''; j += 2; } else { buf += expr[j]; j++; }
      }
      out.push(buf); i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, buf = '';
      while (j < expr.length && expr[j] !== '`') {
        if (expr[j] === '\\') { buf += expr[j + 1] ?? ''; j += 2; continue; }
        if (expr[j] === '$' && expr[j + 1] === '{') {
          let d = 1, k = j + 2; const start = k;
          while (k < expr.length && d > 0) {
            if (expr[k] === '{') d++; else if (expr[k] === '}') d--;
            k++;
          }
          harvest(dropComparisonOperands(expr.slice(start, k - 1)), out);
          buf += INTERP; j = k; continue;
        }
        buf += expr[j]; j++;
      }
      out.push(buf); i = j + 1; continue;
    }
    i++;
  }
  return out;
}

function members(snapshotPath) {
  const resolved = snapshotPath
    ? JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
    : resolveAll();
  const known = new Set(Object.keys(resolved));

  const files = CONTENT_DIRS.flatMap((d) =>
    fs.existsSync(path.join(MOBILE, d)) ? walkSources(path.join(MOBILE, d)) : []);

  const unresolved = new Map();   // class -> [ "file:line", ... ]
  const interpolated = new Map(); // fragment -> [ "file:line", ... ]
  let seen = 0, ok = 0;

  for (const file of files) {
    const rel = path.relative(MOBILE, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    for (const { expr, line } of classNameExprs(src)) {
      // A brace-form className is itself an expression, so its own top level can carry a
      // comparison — `className={x === 'left' ? 'a' : 'b'}` — not only its interpolations.
      for (const lit of harvest(dropComparisonOperands(expr))) {
        for (const tok of lit.split(/\s+/)) {
          if (!tok) continue;
          seen++;
          const where = `${rel}:${line}`;
          if (tok.includes(INTERP)) {
            const label = tok.split(INTERP).join('${…}');
            (interpolated.get(label) ?? interpolated.set(label, []).get(label)).push(where);
          } else if (known.has(tok)) {
            ok++;
          } else {
            (unresolved.get(tok) ?? unresolved.set(tok, []).get(tok)).push(where);
          }
        }
      }
    }
  }

  const byCount = (m) => [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  console.log(`MEMBERSHIP CHECK — ${files.length} source files · ${seen} class tokens · ${known.size} resolved rules`);
  console.log(`  resolved        ${ok}`);
  console.log(`  UNRESOLVED      ${[...unresolved.values()].reduce((n, v) => n + v.length, 0)}  (${unresolved.size} distinct)`);
  console.log(`  interpolated    ${[...interpolated.values()].reduce((n, v) => n + v.length, 0)}  (${interpolated.size} distinct — NOT checkable, listed so they are never silent)`);

  if (unresolved.size) {
    console.log('\n🔴 CLASSES THE SOURCE WRITES THAT THE CONFIG DOES NOT RESOLVE');
    console.log('   Each needs a NAMED REASON (documented dead code) or it is a live defect.');
    for (const [cls, at] of byCount(unresolved)) {
      console.log(`\n  ${cls}   ×${at.length}`);
      for (const w of at) console.log(`      ${w}`);
    }
  }
  if (interpolated.size) {
    console.log('\n⚠️  INTERPOLATED FRAGMENTS — a class built at runtime; membership cannot be decided');
    for (const [frag, at] of byCount(interpolated)) console.log(`  ${frag}   ×${at.length}   ${at.join(' ')}`);
  }
  console.log(`\n${unresolved.size} unresolved class(es).`);
  return unresolved.size;
}

const args = process.argv.slice(2);
const argOf = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };

if (args[0] === '--members') {
  process.exit(members(args[1] ?? null) === 0 ? 0 : 1);
}

if (args[0] === '--diff') {
  const a = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  const b = JSON.parse(fs.readFileSync(args[2], 'utf8'));
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  let n = 0;
  for (const k of keys) {
    const x = k in a ? JSON.stringify(a[k]) : '(absent)';
    const y = k in b ? JSON.stringify(b[k]) : '(absent)';
    if (x !== y) { n++; console.log(`${k}\n  BEFORE ${x}\n  AFTER  ${y}`); }
  }
  console.log(`\n${n} rule(s) moved, of ${keys.length} seen.`);
  process.exit(n === 0 ? 0 : 1);
}

if (args[0] === '--map') {
  const table = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  const a = JSON.parse(fs.readFileSync(argOf('--before'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(argOf('--after'), 'utf8'));
  let bad = 0;
  for (const [oldCls, newCls] of Object.entries(table)) {
    const x = a[oldCls], y = b[newCls];
    const ok = x && y && Object.entries(x).every(([p, v]) => JSON.stringify(y[p]) === JSON.stringify(v));
    if (!ok) {
      bad++;
      console.log(`NOT VALUE-PRESERVING  ${oldCls} -> ${newCls}`);
      console.log(`  old ${JSON.stringify(x ?? null)}\n  new ${JSON.stringify(y ?? null)}`);
    }
  }
  console.log(`\n${bad} of ${Object.keys(table).length} mapping(s) are not value-preserving.`);
  process.exit(bad === 0 ? 0 : 1);
}

console.log(stable(resolveAll()));
