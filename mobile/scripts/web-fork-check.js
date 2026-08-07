#!/usr/bin/env node
/**
 * web-fork-check.js — the arrival gate for the web platform-fork seam.
 *
 * WHY THIS EXISTS, and why no existing instrument can replace it.
 *
 * The web build keeps native-only packages out of the bundle by relying on
 * Metro's platform resolution: `foo.web.ts` wins over `foo.ts` when the
 * platform is web. That mechanism is INVISIBLE — nothing in the source says a
 * fork is required, and nothing fails at author time when one is missing.
 *
 * It is also unusually unforgiving here, for two reasons measured during the
 * conversion:
 *
 *  1. Several of these packages (react-native-onesignal, react-native-share,
 *     react-native-view-shot, @react-native-community/datetimepicker) ship
 *     TurboModule specs that call TurboModuleRegistry.getEnforcing AT IMPORT
 *     TIME. react-native-web does not export TurboModuleRegistry, so the read
 *     is off `undefined` and the module throws while the graph is still being
 *     evaluated.
 *
 *  2. Expo Router EAGERLY REQUIRES EVERY ROUTE FILE. So one such import in one
 *     screen does not break that screen — it white-screens the ENTIRE web app
 *     before React mounts, with an error naming only <ContextNavigator>.
 *
 * `tsc` cannot see this (both files typecheck), token-gate.sh cannot see it
 * (it greps for tokens, not module graphs), and `expo export --platform web`
 * SUCCEEDS anyway — the bundle builds fine and dies at runtime. Measured
 * during the conversion: a clean export and a white screen, same commit.
 *
 * TWO ASSERTION CLASSES:
 *
 *   class 1 · COVERAGE — a file importing a native-only package must have a
 *            .web sibling. Without it the package reaches the web bundle.
 *
 *   class 2 · EXPORT PARITY — the sibling must export every name the native
 *            file exports. This is the quiet one: Metro substitutes the whole
 *            MODULE, so a fork that forgets one export does not fail to build
 *            and does not fail to typecheck (tsc resolves the native file for
 *            the non-web target). It fails at runtime, on web only, as
 *            "X is not a function" — the exact shape of the expo-secure-store
 *            failure this seam was built to fix.
 *
 * Exit 0 = pass, 1 = fail. Wired into `npm run gate` alongside the other node
 * checks. Run from the mobile/ directory.
 */
const fs = require('fs');
const path = require('path');

/**
 * Packages that must never reach the web bundle. Keep this list additive: a
 * new native SDK belongs here on the same commit that introduces it.
 */
const NATIVE_ONLY = [
  'react-native-purchases',
  'react-native-onesignal',
  '@react-native-google-signin/google-signin',
  'react-native-share',
  'react-native-view-shot',
  'expo-secure-store',
  '@react-native-community/datetimepicker',
];

/**
 * Modules that are SAFE on web and deliberately NOT in the list above, recorded
 * so nobody "fixes" them by adding a pointless fork:
 *   expo-haptics      — ships its own web implementation (ExpoHaptics.web)
 *   expo-store-review — lib/inAppReview.ts returns early on Platform.OS !== 'android'
 *   expo-application  — lib/deviceId.ts has an else-branch returning null
 *   expo-apple-authentication — reached only through a guarded require()
 * A fork for deviceId exists anyway, for a monetisation reason its own header
 * explains. That is a deliberate exception, not a counter-example.
 */

const ROOTS = ['app', 'components', 'lib', 'store', 'utils', 'hooks', 'services'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/**
 * Strip comments so a package named in PROSE is not read as an import, and so
 * an export named in a doc-block does not satisfy the parity check. This is the
 * same hazard the repo already tracks: a comment is source to every text tool.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function exportNames(file) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const names = new Set();
  // export function foo / export async function foo / export const foo / class
  const decl = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/g;
  let m;
  while ((m = decl.exec(src))) names.add(m[1]);
  // export { a, b as c }  — the exported name is what follows "as"
  const braced = /export\s*\{([^}]*)\}/g;
  while ((m = braced.exec(src))) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\s+as\s+/).pop().trim();
      if (name && name !== 'default') names.add(name);
    }
  }
  return names;
}

function importsNativeOnly(src) {
  const clean = stripComments(src);
  return NATIVE_ONLY.filter((pkg) => {
    const esc = pkg.replace(/[.*+?^${}()|[\]\\/@-]/g, '\\$&');
    // `import type ...` is erased at compile time and is legal without a fork.
    const value = new RegExp(`import\\s+(?!type\\s)[^;]*?from\\s*['"]${esc}['"]`);
    const bare = new RegExp(`import\\s*['"]${esc}['"]`);
    const req = new RegExp(`require\\(\\s*['"]${esc}['"]\\s*\\)`);
    return value.test(clean) || bare.test(clean) || req.test(clean);
  });
}

let failures = 0;
let forksChecked = 0;
let namesChecked = 0;

const files = ROOTS.flatMap((r) => walk(r));

for (const file of files) {
  if (/\.web\.tsx?$/.test(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const hits = importsNativeOnly(src);
  if (hits.length === 0) continue;

  const sibling = file.replace(/\.(tsx?)$/, '.web.$1');
  const siblingAlt = file.replace(/\.tsx$/, '.web.tsx').replace(/\.ts$/, '.web.ts');
  const webFile = fs.existsSync(sibling)
    ? sibling
    : fs.existsSync(siblingAlt)
      ? siblingAlt
      : null;

  if (!webFile) {
    console.error(
      `  FAIL [coverage]  ${file}\n` +
        `                   imports ${hits.join(', ')} and has no .web sibling.\n` +
        `                   Without one this package reaches the web bundle.`,
    );
    failures++;
    continue;
  }

  forksChecked++;
  const nativeExports = exportNames(file);
  const webExports = exportNames(webFile);
  for (const name of nativeExports) {
    namesChecked++;
    if (!webExports.has(name)) {
      console.error(
        `  FAIL [parity]    ${webFile}\n` +
          `                   missing export "${name}" (present in ${file}).\n` +
          `                   Metro swaps the whole module: this is a web-only\n` +
          `                   runtime crash that tsc and the bundler cannot see.`,
      );
      failures++;
    }
  }
}

console.log(`── web-fork-check ──`);
console.log(`  native-only packages guarded  ${NATIVE_ONLY.length}`);
console.log(`  forked modules verified       ${forksChecked}`);
console.log(`  export names matched          ${namesChecked}`);
console.log(`  failures                      ${failures}`);

if (failures > 0) {
  console.error(`\n  web-fork-check: FAIL (${failures})`);
  process.exit(1);
}
console.log(`  web-fork-check: PASS`);
process.exit(0);
