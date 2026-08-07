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
    // The bundle embeds the public config verbatim, so the value should appear
    // as a literal. Escape it for the regex, not for JSON — Metro does not
    // re-encode a plain URL.
    if (bundle.includes(resolved)) {
      ok(`API URL baked in matches app config (${resolved})`);
    } else {
      const found = [...new Set(bundle.match(/https:\/\/[a-z0-9.-]*railway\.app\/api/g) || [])];
      bad(
        'API URL baked in matches app config',
        `app config says ${resolved}\n        ` +
          `bundle contains ${found.length ? found.join(', ') : '(no railway URL at all)'}\n        ` +
          `This is a STALE METRO CACHE — re-run with: npx expo export --platform web --clear`,
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

console.log('── verify-export ──');
console.log(`  failures                      ${fail.length}`);
if (fail.length) {
  console.error(`\n  verify-export: FAIL (${fail.length})`);
  process.exit(1);
}
console.log('  verify-export: PASS');
process.exit(0);
