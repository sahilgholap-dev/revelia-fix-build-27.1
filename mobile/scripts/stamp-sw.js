#!/usr/bin/env node
/**
 * stamp-sw.js — rewrites the VERSION constant in public/sw.js before an export.
 *
 * 🔴 WHY THIS IS NOT OPTIONAL. VERSION is the Cache Storage key AND the thing
 * the activate handler compares against when deleting old caches. If it does
 * not change between deploys:
 *   · the old cache is never evicted, and
 *   · the previously stored shell keeps being served,
 * so returning users can sit on a stale build indefinitely while a fresh
 * visitor gets the new one. That divergence is very hard to diagnose from a bug
 * report, because the deploy itself looks fine and most testers are fresh.
 *
 * The stamp is the app version plus a UTC minute stamp, so it is human-readable
 * in DevTools > Application > Cache Storage and monotonic per deploy.
 *
 * Idempotent: run it twice in one minute and the file is byte-identical.
 */
const fs = require('fs');
const path = require('path');

const SW = path.join(__dirname, '..', 'public', 'sw.js');
const PKG = path.join(__dirname, '..', 'package.json');

const version = JSON.parse(fs.readFileSync(PKG, 'utf8')).version;
const now = new Date();
const stamp =
  now.getUTCFullYear().toString() +
  String(now.getUTCMonth() + 1).padStart(2, '0') +
  String(now.getUTCDate()).padStart(2, '0') +
  String(now.getUTCHours()).padStart(2, '0') +
  String(now.getUTCMinutes()).padStart(2, '0');

const next = `revelia-web-v${version}-${stamp}`;

const src = fs.readFileSync(SW, 'utf8');
const re = /const VERSION = '([^']*)';/;
const found = src.match(re);
if (!found) {
  console.error('stamp-sw: could not find the VERSION line in public/sw.js — refusing to guess.');
  process.exit(1);
}

if (found[1] === next) {
  console.log(`stamp-sw: already ${next}`);
  process.exit(0);
}

fs.writeFileSync(SW, src.replace(re, `const VERSION = '${next}';`));
console.log(`stamp-sw: ${found[1]} -> ${next}`);
