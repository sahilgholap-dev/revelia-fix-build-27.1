/**
 * Timing Engine fixture regression gate (R7 §14 charter STEP 0) — COMMITTED,
 * STANDING guard. The six later R7 steps extend this engine, so this is a
 * regression harness, not a one-shot probe.
 *
 * ── What is committed vs not ────────────────────────────────────────────────
 * ONLY this harness CODE is committed. It inlines NO fixture data: it reads the
 * fixtures + expected verdicts + the querent natal from the gitignored
 * confidential config (`server/config/timing/fixtures.json`, override with
 * TIMING_CONFIG_DIR) and FAILS CLOSED — if the config is absent it AUTO-SKIPS
 * (exit 0) rather than asserting, so a checkout without the trade-secret config
 * (CI, a fresh clone) neither leaks data nor spuriously fails.
 *
 * Run: `npm run test:timing` (from server/). Exit code: 0 = all pass or skipped,
 * 1 = at least one fixture regressed.
 *
 * Acceptance (v1.1 §4 gate): all seven fixture units reproduce. Non-frame
 * fixtures (FX3/FX4/FX5) assert `indication` EXACT + `confidence` ±0.05 +
 * `window.basis` where set. Frame-bounded fixtures (FX1/FX2/FX6a/FX6b) assert
 * the R17 two-part read — `frame.verdict` + `frame.directional` (+ frame
 * `window.basis` where set) EXACT + `confidence` ±0.05. FX6 → two verdict
 * objects, never averaged. ⛔ A fixture miss is an IMPLEMENTATION bug →
 * ESCALATE to the R7 home chat; do NOT retune weights (Sid's rule; v1.1 §4).
 *
 * ── v1.1.1 additions (S-R7e) ────────────────────────────────────────────────
 * 1. WINDOW DATES ARE NOW ASSERTED (`windowFrom` / `frameWindowFrom`), not just the
 *    basis. This closes the hole that let S-R7e hide: under v1.1 this gate reported
 *    17/17 GREEN while FX6b emitted a window of 2035-06 against a fixture pinned at
 *    2028-09 — the basis matched, so nothing failed. A basis-only assertion cannot
 *    tell a correct window from a fabricated one.
 * 2. A FALLBACK PROBE exercises the 30-year no-alignment fallback, which the six
 *    fixtures cannot reach (the karya house's own sign lord always surfaces at some
 *    AD gate inside 30 years once R11a's natal-functional path is on). It collapses
 *    the horizon to 1 year through the `setRuleSet` seam and asserts the engine
 *    degrades to an honest `transit_fallback` window rather than a distant boundary.
 */
import * as fs from 'fs';
import * as path from 'path';
import { NatalChartInput } from '../services/astrology.service';
import {
  runTimingEngine,
  timingConfigAvailable,
  loadRuleSet,
  setRuleSet,
  TimingQuestion,
  TimingVerdict,
} from '../services/timing-engine.service';

const CONF_DIR = process.env.TIMING_CONFIG_DIR || path.join(__dirname, '../../config/timing');
const CONF_TOL = 0.05;

function natalInputFrom(o: any): NatalChartInput {
  const [y, m, d] = o.date.split('-').map(Number);
  return {
    date: new Date(Date.UTC(y, m - 1, d)),
    time: o.time,
    timezone: o.timezone,
    lat: o.lat,
    lng: o.lng,
    timeIsAssumed: false,
  };
}

function questionFrom(fx: any): TimingQuestion {
  const q: TimingQuestion = {
    category: fx.category,
    timestamp: new Date(fx.timestamp),
    location: { lat: fx.lat, lng: fx.lng, timezone: fx.timezone },
    deadline: fx.deadline || null,
    askedWindow: fx.askedWindow || null,
    askedWindowMonths: fx.askedWindowMonths,
    compound: !!fx.compound,
    subQuestions: fx.compound ? (fx.expected as any[]).map((e) => e.subQuestion) : undefined,
    frameBounded: fx.frameBounded,
    frameSubtype: fx.frameSubtype,
  };
  // Per-sub 2.4a subtype for a compound question (each half its own frame class).
  if (fx.compound) {
    const map: Record<string, 'threshold' | 'momentum'> = {};
    for (const e of fx.expected as any[]) if (e.frameSubtype) map[e.subQuestion] = e.frameSubtype;
    q.subFrameSubtypes = map;
  }
  return q;
}

interface Row {
  id: string;
  sub?: string;
  field: string;
  expected: any;
  actual: any;
  ok: boolean;
}

/**
 * v1.1 assertion contract (17 rows across the 7 fixture units):
 *  - non-frame fixture (expected.indication present): indication, confidence, [window.basis]
 *  - frame-bounded fixture (expected.frameVerdict present): a composite `frame` row
 *    (frame.verdict + frame.directional [+ frame.window.basis where fixed]), confidence,
 *    [window.basis where set separately]
 */
function check(id: string, exp: any, actual: TimingVerdict, sub?: string): Row[] {
  const rows: Row[] = [];
  const confOk = actual.confidence !== null && Math.abs((actual.confidence as number) - exp.confidence) <= CONF_TOL + 1e-9;

  if (exp.frameVerdict) {
    // ── Frame-bounded: R17 two-part read ────────────────────────────────────
    const f = actual.frame;
    const verdictOk = f.verdict === exp.frameVerdict;
    const dirOk = exp.directional === undefined || f.directional === exp.directional;
    const fBasisOk = exp.frameWindowBasis === undefined || f.window?.basis === exp.frameWindowBasis;
    // v1.1.1: assert the window DATE, not just its basis. Until this row existed the
    // gate passed FX6b while the engine emitted 2035-06 for a fixture pinned at
    // 2028-09 — a green that proved only the basis. S-R7e could not have been caught.
    const fFromOk = exp.frameWindowFrom === undefined || f.window?.from === exp.frameWindowFrom;
    const composite = verdictOk && dirOk && fBasisOk && fFromOk;
    const wantParts = [
      `verdict=${exp.frameVerdict}`,
      exp.directional !== undefined ? `directional=${exp.directional}` : null,
      exp.frameWindowBasis !== undefined ? `window.basis=${exp.frameWindowBasis}` : null,
      exp.frameWindowFrom !== undefined ? `window.from=${exp.frameWindowFrom}` : null,
    ].filter(Boolean).join(' ');
    const gotParts = `verdict=${f.verdict} directional=${f.directional} window=${f.window ? `${f.window.from}/${f.window.basis}` : 'null'}`;
    rows.push({ id, sub, field: 'frame', expected: wantParts, actual: gotParts, ok: composite });
    rows.push({ id, sub, field: 'confidence', expected: exp.confidence, actual: actual.confidence, ok: confOk });
    if (exp.windowBasis) {
      rows.push({ id, sub, field: 'window.basis', expected: exp.windowBasis, actual: actual.window?.basis ?? null, ok: actual.window?.basis === exp.windowBasis });
    }
    return rows;
  }

  // ── Non-frame: plain directional read ──────────────────────────────────────
  rows.push({ id, sub, field: 'indication', expected: exp.indication, actual: actual.indication, ok: actual.indication === exp.indication });
  rows.push({ id, sub, field: 'confidence', expected: exp.confidence, actual: actual.confidence, ok: confOk });
  if (exp.windowBasis) {
    rows.push({ id, sub, field: 'window.basis', expected: exp.windowBasis, actual: actual.window?.basis ?? null, ok: actual.window?.basis === exp.windowBasis });
  }
  // v1.1.1: window DATE assertion (FX3 is now pinned to 2027-07 — see the basis note above).
  if (exp.windowFrom) {
    rows.push({ id, sub, field: 'window.from', expected: exp.windowFrom, actual: actual.window?.from ?? null, ok: actual.window?.from === exp.windowFrom });
  }
  return rows;
}

(async () => {
  if (!timingConfigAvailable() || !fs.existsSync(path.join(CONF_DIR, 'fixtures.json'))) {
    console.log('SKIP — Timing Engine confidential config absent (fail-closed). Nothing asserted.');
    process.exit(0);
  }

  const cfg = JSON.parse(fs.readFileSync(path.join(CONF_DIR, 'fixtures.json'), 'utf8'));
  const natalInput = natalInputFrom(cfg.natal);
  const allRows: Row[] = [];

  for (const fx of cfg.fixtures) {
    const q = questionFrom(fx);
    const result = await runTimingEngine(q, natalInput);

    if (fx.compound) {
      if (!Array.isArray(result)) {
        allRows.push({ id: fx.id, field: 'compound-shape', expected: 'array(2)', actual: 'single', ok: false });
        continue;
      }
      if (result.length !== fx.expected.length) {
        allRows.push({ id: fx.id, field: 'compound-count', expected: fx.expected.length, actual: result.length, ok: false });
      }
      for (const exp of fx.expected) {
        const v = result.find((r) => r.category === exp.subQuestion) || result[fx.expected.indexOf(exp)];
        allRows.push(...check(fx.id, exp, v, exp.subQuestion));
      }
    } else {
      if (Array.isArray(result)) {
        allRows.push({ id: fx.id, field: 'shape', expected: 'single', actual: 'array', ok: false });
        continue;
      }
      allRows.push(...check(fx.id, fx.expected, result));
    }
  }

  // ── v1.1.1 PROBE: the 30-year no-alignment fallback ────────────────────────
  // The fallback is (by design) unreachable through the six fixtures — with the
  // R11a natal-functional path on, the karya house's own sign lord always turns up
  // at some AD gate well inside 30 years. So it gets a dedicated probe: re-run FX6b
  // against a rule set whose horizon is collapsed to 1 year, via the existing
  // `setRuleSet` seam (no fixture data changes, nothing committed). It must fall
  // back to a benefic transit on the natal karya house, LABEL it `transit_fallback`,
  // and carry the honest texture — never fabricate a distant boundary.
  const probeRows: Row[] = [];
  {
    const real = loadRuleSet();
    const fx6 = cfg.fixtures.find((f: any) => f.id === 'FX6');
    try {
      const collapsed = JSON.parse(JSON.stringify(real));
      collapsed.window.noAlignmentFallbackYears = 1;
      setRuleSet(collapsed);
      const r = await runTimingEngine(questionFrom(fx6), natalInput);
      const scale = (r as TimingVerdict[]).find((v) => v.category === 'scale_metric_within_6mo')!;
      const basis = scale.window?.basis ?? null;
      const honest = scale.textures.includes('window_beyond_alignment_horizon');
      probeRows.push({
        id: 'PROBE-fallback', field: 'basis', expected: 'transit_fallback', actual: basis,
        ok: basis === 'transit_fallback',
      });
      probeRows.push({
        id: 'PROBE-fallback', field: 'honest-texture', expected: 'window_beyond_alignment_horizon',
        actual: honest ? 'present' : 'absent', ok: honest,
      });
      probeRows.push({
        id: 'PROBE-fallback', field: 'window-present', expected: 'a real transit date',
        actual: scale.window?.from ?? null, ok: !!scale.window?.from,
      });
    } finally {
      setRuleSet(real); // restore — later assertions must see the real horizon
    }
  }
  allRows.push(...probeRows);

  // Report
  let pass = 0, fail = 0;
  console.log('\n=== Timing Engine fixture regression v1.1.1 (FX1–FX6b + fallback probe) ===\n');
  for (const r of allRows) {
    const tag = r.ok ? 'PASS' : 'FAIL';
    if (r.ok) pass++; else fail++;
    const name = `${r.id}${r.sub ? `/${r.sub}` : ''}`.padEnd(28);
    console.log(`  ${tag.padEnd(5)} ${name} ${r.field.padEnd(13)} expected=${JSON.stringify(r.expected)} actual=${JSON.stringify(r.actual)}`);
  }

  // Fixture-unit rollup (FX6 counts as two: traction + scale).
  const groups = new Map<string, Row[]>();
  for (const r of allRows) {
    const k = `${r.id}${r.sub ? `/${r.sub}` : ''}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  let fPass = 0, fFail = 0;
  for (const rows of groups.values()) {
    if (rows.every((r) => r.ok)) fPass++; else fFail++;
  }

  console.log(`\n${pass}/${allRows.length} assertions passed; ${fail} failed.`);
  console.log(`Fixture units: ${fPass} PASS${fFail ? ` + ${fFail} FAIL` : ''} of ${groups.size}.`);
  if (fail > 0) {
    console.log('\n⛔ FIXTURE MISS — a fixture regressed under v1.1: per Sid\'s rule this is an implementation bug (the fixtures are the contract, v1.1 §4). ESCALATE to the R7 home chat, do NOT retune weights.');
    process.exit(1);
  }
  console.log(`\n✅ GREEN — ${fPass}/${groups.size} fixture units, ${pass}/${allRows.length} assertions, 0 xfails.`);
  process.exit(0);
})().catch((e) => {
  console.error('Timing fixture harness error:', e);
  process.exit(1);
});
