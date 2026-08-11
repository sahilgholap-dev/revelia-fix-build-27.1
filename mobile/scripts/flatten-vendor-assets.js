#!/usr/bin/env node
/**
 * flatten-vendor-assets.js — moves vendored assets off a `node_modules` path.
 *
 * 🔴 WHY THIS EXISTS. Cloudflare Pages SILENTLY REFUSES TO UPLOAD ANY FILE UNDER
 * A `node_modules` DIRECTORY. Expo's web export writes every vendored asset to a
 * path mirroring its source, so `@expo/vector-icons`' fonts and the
 * react-navigation / expo-router images all land under
 * `dist/assets/node_modules/…` — and none of them reach the CDN.
 *
 * 🔴 AND THE SYMPTOM POINTS AWAY FROM THE CAUSE. The request does not 404:
 * `public/_redirects` rewrites `/*` to index.html with a **200**, so the browser
 * asks for a TTF and is handed HTML, fails to parse it, and renders nothing.
 * Measured against the deployed site 2026-08-11 — the icon font came back
 * `text/html` at 4037 bytes while an app font on the same origin, differing only
 * in that it sits under `assets/assets/fonts/`, came back `font/ttf` at 51384.
 * Every local signal is green: the export succeeds, the files are in dist/, the
 * dev server serves them off disk, and Android bundles them natively.
 *
 * So: relocate the directory, then rewrite the references. Both halves are
 * required — a moved file with a stale reference is just as dead, and reads as
 * present because the file exists.
 *
 * Idempotent: safe to re-run against an already-flattened dist/.
 *
 * Chained between `expo export` and `verify-export.js`, whose assertion 6 is
 * what stops this silently regressing.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const FROM_DIR = path.join(DIST, 'assets', 'node_modules');
const TO_DIR = path.join(DIST, 'assets', 'vendor');
const FROM_REF = '/assets/node_modules/';
const TO_REF = '/assets/vendor/';
const REWRITABLE = /\.(js|css|html|json)$/;

if (!fs.existsSync(DIST)) {
  console.error('flatten-vendor-assets: dist/ not found — run the export first.');
  process.exit(1);
}

let moved = 0;

if (fs.existsSync(FROM_DIR)) {
  // A previous partial run could leave both present; merging is not worth
  // supporting, and silently overwriting would hide it. Fail loudly instead.
  if (fs.existsSync(TO_DIR)) {
    console.error(
      'flatten-vendor-assets: both assets/node_modules and assets/vendor exist.\n' +
        '  Delete dist/ and re-export — a merged state is not something this script guesses at.'
    );
    process.exit(1);
  }
  const count = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => {
      return n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1);
    }, 0);
  moved = count(FROM_DIR);
  fs.renameSync(FROM_DIR, TO_DIR);
}

let rewritten = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
      continue;
    }
    if (!REWRITABLE.test(e.name)) continue;
    const before = fs.readFileSync(p, 'utf8');
    if (!before.includes(FROM_REF)) continue;
    fs.writeFileSync(p, before.split(FROM_REF).join(TO_REF));
    rewritten += 1;
  }
};
walk(DIST);

console.log('── flatten-vendor-assets ──');
console.log(`  files relocated               ${moved}`);
console.log(`  files rewritten               ${rewritten}`);

// Nothing to do is legitimate on a re-run, but on a fresh export it means the
// export stopped emitting that path — which would make this script dead code
// nobody notices. Say so rather than printing two zeroes and exiting green.
if (moved === 0 && rewritten === 0) {
  console.log('  (nothing to do — already flattened, or the export changed shape)');
}
