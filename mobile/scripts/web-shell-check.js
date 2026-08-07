#!/usr/bin/env node
/**
 * web-shell-check.js — asserts the PWA shell in public/ is well formed.
 *
 * WHY IT EXISTS. Everything under public/ is copied to the deployed site
 * verbatim and is read by the BROWSER, not by the bundler — so `tsc` cannot see
 * it, Metro cannot see it, the token gate's greps are scoped to source
 * directories that exclude it, and `expo export` copies whatever is there
 * without an opinion. It is the only part of the app with no instrument on it.
 *
 * 🔴 THE BUG THAT FORCED IT: the shell shipped with the CLI's own template
 * placeholder still in place, so the browser tab read literally "%WEB_TITLE%".
 * It survived a clean tsc, a clean gate, a successful export, and a full
 * headless-browser pass that checked the manifest, the icons, the iOS meta, the
 * service worker and an offline relaunch — because every one of those asked
 * "does the app work?" and none asked "what does the tab say?".
 *
 * Assertions, all exact:
 *   1 · no %PLACEHOLDER% survives in the shell
 *   2 · exactly one non-empty <title>, and a lang attribute
 *   3 · the head tags an installable iOS PWA requires are present
 *   4 · manifest.json parses, carries the required keys, and EVERY icon it
 *       names exists on disk at the size it claims (a manifest pointing at a
 *       missing icon fails installability with no console error)
 *   5 · sw.js still refuses to cache /api, and still has a VERSION line for
 *       scripts/stamp-sw.js to rewrite
 *
 * Exit 0 = pass, 1 = fail. Run from mobile/.
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const fail = [];
const ok = (label) => console.log(`  ok    ${label}`);
const bad = (label, detail) => {
  fail.push(label);
  console.error(`  FAIL  ${label}\n        ${detail}`);
};

// ── 1..3 · the document shell ────────────────────────────────────────────────
const shellPath = path.join(PUBLIC, 'index.html');
if (!fs.existsSync(shellPath)) {
  bad('shell present', 'public/index.html is missing — the export would fall back to the CLI template');
} else {
  const html = fs.readFileSync(shellPath, 'utf8');
  // Strip comments first: this file documents the placeholder hazard by name,
  // and the prose must not be what trips the rule. (Comment-is-source.)
  const code = html.replace(/<!--[\s\S]*?-->/g, '');

  const placeholders = code.match(/%[A-Z_]+%/g);
  if (placeholders) {
    bad(
      'no template placeholders',
      `found ${[...new Set(placeholders)].join(', ')} — the "single" export injects scripts but does NOT substitute these`,
    );
  } else ok('no template placeholders');

  const titles = code.match(/<title>([^<]*)<\/title>/g) || [];
  if (titles.length !== 1) bad('exactly one <title>', `found ${titles.length}`);
  else {
    const text = titles[0].replace(/<\/?title>/g, '').trim();
    if (!text || /^%|%$/.test(text)) bad('<title> is real text', `got "${text}"`);
    else ok(`<title> = "${text}"`);
  }

  if (/<html[^>]+lang="[a-z]{2}"/.test(code)) ok('html lang set');
  else bad('html lang set', 'missing or placeholder lang attribute');

  const required = [
    ['manifest link', /<link[^>]+rel="manifest"/],
    ['apple-touch-icon', /<link[^>]+rel="apple-touch-icon"/],
    ['apple-mobile-web-app-capable', /name="apple-mobile-web-app-capable"[^>]+content="yes"/],
    ['theme-color', /name="theme-color"/],
    // Without viewport-fit=cover, safe-area insets stay 0 in standalone mode
    // and content sits under the notch and the home indicator.
    ['viewport-fit=cover', /name="viewport"[^>]*viewport-fit=cover/s],
  ];
  for (const [label, re] of required) {
    if (re.test(code)) ok(label);
    else bad(label, 'absent from public/index.html');
  }
}

// ── 4 · the manifest, and its icons on disk ──────────────────────────────────
const manifestPath = path.join(PUBLIC, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  bad('manifest present', 'public/manifest.json is missing');
} else {
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    ok('manifest parses');
  } catch (e) {
    bad('manifest parses', String(e.message));
  }

  if (manifest) {
    for (const key of ['name', 'short_name', 'start_url', 'display', 'background_color', 'theme_color']) {
      if (manifest[key]) ok(`manifest.${key}`);
      else bad(`manifest.${key}`, 'missing — required for installability');
    }
    if (manifest.display !== 'standalone') {
      bad('manifest.display', `expected "standalone", got "${manifest.display}"`);
    }

    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    if (!icons.some((i) => String(i.purpose || '').includes('maskable'))) {
      bad('maskable icon declared', 'no icon with purpose "maskable" — Android launchers crop the mark');
    } else ok('maskable icon declared');

    for (const icon of icons) {
      const rel = String(icon.src || '').replace(/^\//, '');
      const file = path.join(PUBLIC, rel);
      if (!fs.existsSync(file)) {
        bad(`icon on disk: ${icon.src}`, 'declared in the manifest but not present — installability fails silently');
        continue;
      }
      // PNG IHDR carries width/height at bytes 16..24.
      const buf = fs.readFileSync(file);
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      const claimed = String(icon.sizes || '');
      if (claimed && claimed !== `${w}x${h}`) {
        bad(`icon size: ${icon.src}`, `manifest claims ${claimed}, file is ${w}x${h}`);
      } else ok(`icon ${icon.src} ${w}x${h} ${icon.purpose || 'any'}`);
    }
  }
}

// apple-touch-icon is referenced from the HTML, not the manifest, so it needs
// its own existence check or it 404s with no visible symptom until an iOS user
// adds the app to their home screen and gets a grey tile.
const appleIcon = path.join(PUBLIC, 'icons', 'apple-touch-icon.png');
if (fs.existsSync(appleIcon)) ok('apple-touch-icon on disk');
else bad('apple-touch-icon on disk', 'public/icons/apple-touch-icon.png is missing');

// ── 5 · the service worker's standing invariants ─────────────────────────────
const swPath = path.join(PUBLIC, 'sw.js');
if (!fs.existsSync(swPath)) {
  bad('sw present', 'public/sw.js is missing');
} else {
  const sw = fs.readFileSync(swPath, 'utf8');
  const swCode = sw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  // 🔴 PERMANENT INVARIANT. Readings are personalised and auth-bearing: a
  // cached response could show one account's reading to another after a logout,
  // and a cached 402 would lock a user out of content they just paid for.
  if (/pathname\.startsWith\(\s*['"]\/api['"]\s*\)/.test(swCode)) ok('sw excludes /api from caching');
  else bad('sw excludes /api from caching', 'the /api bail-out is gone — personalised responses would be cached');

  if (/const VERSION = '[^']+';/.test(swCode)) ok('sw VERSION line present');
  else bad('sw VERSION line present', 'scripts/stamp-sw.js rewrites this exact line and would fail');

  // Guards the cache-poisoning fix: only a successful navigation may refresh
  // the stored offline shell.
  if (/resp\s*&&\s*resp\.ok/.test(swCode)) ok('sw stores only successful responses');
  else bad('sw stores only successful responses', 'a 404 could be cached AS the offline shell');
}

console.log('── web-shell-check ──');
console.log(`  failures                      ${fail.length}`);
if (fail.length) {
  console.error(`\n  web-shell-check: FAIL (${fail.length})`);
  process.exit(1);
}
console.log('  web-shell-check: PASS');
process.exit(0);
