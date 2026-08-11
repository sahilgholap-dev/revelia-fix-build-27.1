/**
 * cors-origins.check.ts — asserts the production CORS allow-list resolves correctly.
 *
 * 🔴 WHY THIS EXISTS. A wrong allow-list is invisible from the server side: the
 * request is refused by the BROWSER, so the API sees nothing, logs nothing, and
 * reports itself healthy. It surfaces as "sign-in is broken" on the client and
 * sends you looking at auth. That already cost one debugging round when the web
 * PWA went up.
 *
 * It INVOKES the real resolver rather than restating its rules — a check that
 * re-derives its subject tests the copy (CLAUDE.md, `O-115`). Every case below
 * calls `resolveProductionCorsOrigins` itself.
 *
 * Run: npm run check:cors
 */
import { productionConfig } from '../config/production';
import { resolveProductionCorsOrigins, extraOriginsFromEnv } from '../utils/cors';

const BASE = productionConfig.cors.origin;

let failures = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}\n        expected ${e}\n        actual   ${a}`);
  }
};

// ── the floor holds no matter what the variable says ──────────────────────────
check('unset leaves the hardcoded list untouched', resolveProductionCorsOrigins(BASE, undefined), [
  ...BASE,
]);
check('empty string leaves it untouched', resolveProductionCorsOrigins(BASE, ''), [...BASE]);
check('whitespace-only leaves it untouched', resolveProductionCorsOrigins(BASE, '  ,  '), [
  ...BASE,
]);

// 🔴 THE LOAD-BEARING PROPERTY: the variable can only EXTEND. If this ever
//    fails, a dashboard typo can lock the first-party apps out of the API.
const narrowed = resolveProductionCorsOrigins(BASE, 'https://example.com');
check(
  'a variable cannot remove a hardcoded origin',
  BASE.every((o) => narrowed.includes(o)),
  true
);

// ── parsing ───────────────────────────────────────────────────────────────────
check('a single origin is added', resolveProductionCorsOrigins(BASE, 'https://a.test'), [
  ...BASE,
  'https://a.test',
]);
check(
  'comma-separated origins are added, and whitespace is trimmed',
  resolveProductionCorsOrigins(BASE, ' https://a.test , https://b.test '),
  [...BASE, 'https://a.test', 'https://b.test']
);
check(
  'a trailing slash is stripped, because it would never match',
  extraOriginsFromEnv('https://a.test/'),
  ['https://a.test']
);
check('repeated trailing slashes are stripped', extraOriginsFromEnv('https://a.test///'), [
  'https://a.test',
]);
check(
  'a duplicate of a hardcoded origin does not appear twice',
  resolveProductionCorsOrigins(BASE, BASE[0]),
  [...BASE]
);
check('duplicates within the variable collapse', extraOriginsFromEnv('https://a.test,https://a.test'), [
  'https://a.test',
]);

// ── the wildcard is refused, and says so ──────────────────────────────────────
{
  const warnings: string[] = [];
  const result = resolveProductionCorsOrigins(BASE, '*', (m) => warnings.push(m));
  check('a bare * is not added to the list', result, [...BASE]);
  check('and it warns rather than failing silently', warnings.length, 1);
}
{
  const warnings: string[] = [];
  const result = extraOriginsFromEnv('https://a.test,*', (m) => warnings.push(m));
  check('a * among real origins drops only the *', result, ['https://a.test']);
  check('and still warns', warnings.length, 1);
}

console.log('── cors-origins ──');
console.log(`  failures                      ${failures}`);
if (failures) {
  console.error(`\n  cors-origins: FAIL (${failures})`);
  process.exit(1);
}
console.log('  cors-origins: PASS');
process.exit(0);
