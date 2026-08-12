#!/usr/bin/env node
/**
 * verify-export.js — asserts the BUILT artifact in dist/ matches its sources.
 *
 * 🔴 THE DEFECT THAT FORCED IT, and it is the worst shape a build bug can take:
 * `extra.apiUrl` in app.json was repointed from production to staging, the
 * export ran and SUCCEEDED, and the bundle still contained the OLD URL. Metro's
 * cache did not invalidate on the config change. `expo config` reported the new
 * value the whole time, so every source-level check agreed with the intent while
 * the shipped file disagreed. `--clear` fixed it.
 *
 * That is a silent wrong-backend deploy: no error, no warning, and the app works
 * perfectly — against the wrong server. On a project whose own notes record that
 * the production EAS profile's API domain has never actually taken effect for
 * exactly this class of layering reason, it is worth an assertion.
 *
 * WHY IT IS SEPARATE FROM web-shell-check: that one reads `public/`, the SOURCE.
 * This one reads `dist/`, the ARTIFACT. They can disagree, and this whole script
 * exists because they did.
 *
 * Assertions:
 *   1 · the API URL baked into the bundle equals the one `expo config` resolves
 *   2 · dist/index.html carries no unsubstituted %PLACEHOLDER%
 *   3 · dist/index.html has a real <title> and an injected bundle <script>
 *   4 · the service-worker VERSION in dist matches public/ (a stale copy would
 *       keep serving the previous shell to returning users)
 *   5 · every icon the manifest names is present in dist
 *
 * Exit 0 = pass, 1 = fail. Chained after `expo export` by `npm run web:export`.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MOBILE = path.join(__dirname, '..');
const DIST = path.join(MOBILE, 'dist');
const PUBLIC = path.join(MOBILE, 'public');

const fail = [];
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m, d) => {
  fail.push(m);
  console.error(`  FAIL  ${m}\n        ${d}`);
};

if (!fs.existsSync(DIST)) {
  console.error('verify-export: dist/ not found — run the export first.');
  process.exit(1);
}

const bundleDir = path.join(DIST, '_expo', 'static', 'js', 'web');
const bundleFile = fs.existsSync(bundleDir)
  ? fs.readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'))
  : null;
const bundle = bundleFile ? fs.readFileSync(path.join(bundleDir, bundleFile), 'utf8') : '';
if (!bundle) bad('bundle present', 'no entry-*.js under dist/_expo/static/js/web');

// ── 1 · the API URL actually shipped ─────────────────────────────────────────
if (bundle) {
  let resolved = null;
  try {
    const win = process.platform === 'win32';
    // Quote on Windows: shell:true re-parses, and a path with a space or
    // parentheses otherwise breaks (the same trap resolve-utilities.js hit).
    const bin = path.join(MOBILE, 'node_modules', '.bin', win ? 'expo.cmd' : 'expo');
    const out = execFileSync(win ? `"${bin}"` : bin, ['config', '--type', 'public', '--json'], {
      cwd: MOBILE,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: win,
      maxBuffer: 20 * 1024 * 1024,
    });
    resolved = JSON.parse(out)?.extra?.apiUrl ?? null;
  } catch (e) {
    bad('resolve app config', `could not run \`expo config\`: ${e.message}`);
  }

  if (resolved) {
    // 🔴 THIS USED TO BE `bundle.includes(resolved)` AND IT COULD NOT FAIL FOR
    //    THE CASE THAT MATTERS. api.ts ends its resolution chain with a
    //    HARDCODED production URL, so that string is in EVERY bundle whatever
    //    the config says. A presence test is therefore satisfied by the
    //    fallback, and whenever the intended target is production the assertion
    //    is structurally incapable of failing.
    //
    //    Measured 2026-08-11: app.json said production, the shipped bundle's
    //    embedded config said staging, and this assertion printed
    //    "API URL baked in matches app config (…production…)" and passed. The
    //    app talked to the wrong database for a full deploy cycle.
    //
    //    A present literal is not the live literal (`O-67`). What decides
    //    behaviour is the value inside the EMBEDDED CONFIG OBJECT, because
    //    api.ts reads `extra.apiUrl` before anything else — so that is what is
    //    compared now, not whether the string appears somewhere.
    // Expo inlines the public config as a JSON STRING, so the quotes arrive
    // backslash-escaped (\"extra\":{\"apiUrl\":\"…\"). Accept both forms rather
    // than depending on which one a given Expo version emits.
    const embedded = bundle.match(/\\?"extra\\?":\s*\{\s*\\?"apiUrl\\?":\s*\\?"([^"\\]+)/);

    if (!embedded) {
      bad(
        'API URL baked in matches app config',
        'could not find the embedded "extra":{"apiUrl":…} in the bundle.\n        ' +
          'Expo changed how the public config is inlined — this assertion needs updating, ' +
          'and until it is, a stale API URL can ship unnoticed.',
      );
    } else if (embedded[1] === resolved) {
      ok(`API URL baked in matches app config (${resolved})`);
    } else {
      bad(
        'API URL baked in matches app config',
        `app config says   ${resolved}\n        ` +
          `bundle embeds     ${embedded[1]}\n        ` +
          `This is a STALE METRO CACHE — re-run with: npm run web:export:clear`,
      );
    }
  }
}

// ── 2..3 · the shipped HTML ──────────────────────────────────────────────────
const indexPath = path.join(DIST, 'index.html');
if (!fs.existsSync(indexPath)) {
  bad('dist/index.html present', 'the export produced no HTML');
} else {
  const html = fs.readFileSync(indexPath, 'utf8');
  const code = html.replace(/<!--[\s\S]*?-->/g, '');

  const ph = code.match(/%[A-Z_]+%/g);
  if (ph) bad('no placeholders in shipped HTML', `found ${[...new Set(ph)].join(', ')}`);
  else ok('no placeholders in shipped HTML');

  const title = (code.match(/<title>([^<]*)<\/title>/) || [])[1];
  if (title && !/^%|%$/.test(title)) ok(`shipped <title> = "${title}"`);
  else bad('shipped <title> is real text', `got ${JSON.stringify(title)}`);

  if (/<script[^>]+src="[^"]*entry-[^"]*\.js"/.test(code)) ok('bundle script injected');
  else bad('bundle script injected', 'the HTML references no entry bundle — the page would be blank');
}

// ── 4 · the worker that will actually be served ──────────────────────────────
const swSrc = path.join(PUBLIC, 'sw.js');
const swOut = path.join(DIST, 'sw.js');
if (fs.existsSync(swSrc) && fs.existsSync(swOut)) {
  const v = (s) => (fs.readFileSync(s, 'utf8').match(/const VERSION = '([^']+)';/) || [])[1];
  const a = v(swSrc);
  const b = v(swOut);
  if (a && a === b) ok(`service-worker VERSION shipped (${b})`);
  else bad('service-worker VERSION shipped', `public/sw.js is ${a}, dist/sw.js is ${b}`);
} else bad('sw.js copied to dist', 'missing in public/ or dist/');

// ── 5 · the icons the manifest promises ──────────────────────────────────────
const mfOut = path.join(DIST, 'manifest.json');
if (!fs.existsSync(mfOut)) {
  bad('manifest copied to dist', 'dist/manifest.json is missing — the app is not installable');
} else {
  try {
    const mf = JSON.parse(fs.readFileSync(mfOut, 'utf8'));
    let missing = 0;
    for (const icon of mf.icons || []) {
      const p = path.join(DIST, String(icon.src || '').replace(/^\//, ''));
      if (!fs.existsSync(p)) {
        bad(`icon shipped: ${icon.src}`, 'named in the manifest but absent from dist');
        missing++;
      }
    }
    if (!missing) ok(`all ${(mf.icons || []).length} manifest icons shipped`);
  } catch (e) {
    bad('dist manifest parses', e.message);
  }
}

// ── 6 · NOTHING SHIPS FROM A node_modules PATH ────────────────────────────────
//
// 🔴 THE DEFECT THAT FORCED IT, and it is this file's own class of bug one layer
// out: CLOUDFLARE PAGES SILENTLY REFUSES TO UPLOAD ANY FILE UNDER A
// `node_modules` DIRECTORY. Expo's web export writes every vendored asset to a
// path mirroring its source, so all 37 of them — every @expo/vector-icons font
// plus the react-navigation and expo-router images — landed under
// `dist/assets/node_modules/` and none of them reached the CDN.
//
// The failure is invisible from every angle that matters. The export succeeds.
// The files are present in dist/. The local server serves them, because it reads
// the disk. Android is unaffected, because the fonts are bundled natively. And
// on the deployed site the request does not even 404: `_redirects` rewrites
// `/*` to index.html with a 200, so the browser receives HTML where it asked for
// a TTF, fails to parse it, and renders nothing. Measured 2026-08-11:
// the icon font returned `text/html`, 4037 bytes, while an app font sitting in
// `assets/assets/fonts/` on the same origin returned `font/ttf`, 51384 bytes.
//
// `flatten-vendor-assets.js` relocates the directory and rewrites the
// references. This assertion is what stops it silently regressing — a rename in
// the export, a new vendored asset, or the script being dropped from the chain
// would all put files back on a path that never ships.
{
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules') offenders.push(path.relative(DIST, p));
        else walk(p);
      }
    }
  };
  walk(DIST);

  if (offenders.length) {
    bad(
      'no shipped file sits under a node_modules path',
      `${offenders.length} such director(y|ies): ${offenders.join(', ')} — ` +
        'Cloudflare Pages will not upload these. Run flatten-vendor-assets.js.'
    );
  } else {
    ok('no shipped file sits under a node_modules path');
  }

  // The directory move is only half the fix; a reference left pointing at the
  // old path is just as dead, and reads as present because the file exists.
  const refs = [];
  const scan = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) scan(p);
      else if (/\.(js|css|html|json)$/.test(e.name)) {
        if (fs.readFileSync(p, 'utf8').includes('/assets/node_modules/')) {
          refs.push(path.relative(DIST, p));
        }
      }
    }
  };
  scan(DIST);

  if (refs.length) {
    bad(
      'no shipped file references /assets/node_modules/',
      `${refs.length} file(s): ${refs.slice(0, 3).join(', ')}`
    );
  } else {
    ok('no shipped file references /assets/node_modules/');
  }
}

// ── 7 · the OneSignal service worker shipped ──────────────────────────────────
//
// 🔴 NOTHING IMPORTS THIS FILE. It is a static asset the browser fetches at
// subscription time, so a build change that drops it produces no typecheck
// error, no gate failure and no bundle warning — the first symptom is web push
// silently failing to subscribe, on a surface nobody exercises daily. That is
// the same shape as the vendored-icon defect, which shipped invisible icons for
// a full deploy cycle because every local signal was green.
{
  const oneSignalSw = path.join(DIST, 'push', 'onesignal', 'OneSignalSDKWorker.js');
  if (!fs.existsSync(oneSignalSw)) {
    bad(
      'OneSignal service worker shipped',
      'dist/push/onesignal/OneSignalSDKWorker.js is missing. Web push cannot ' +
        'subscribe without it, and nothing else in the build would notice.'
    );
  } else if (!fs.readFileSync(oneSignalSw, 'utf8').includes('OneSignalSDK.sw.js')) {
    bad(
      'OneSignal service worker shipped',
      'the file exists but does not import OneSignalSDK.sw.js — it would register ' +
        'and then do nothing, which is worse than being absent because the ' +
        'registration looks healthy.'
    );
  } else {
    ok('OneSignal service worker shipped');
  }
}

console.log('── verify-export ──');
console.log(`  failures                      ${fail.length}`);
if (fail.length) {
  console.error(`\n  verify-export: FAIL (${fail.length})`);
  process.exit(1);
}
console.log('  verify-export: PASS');
process.exit(0);
