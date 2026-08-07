/**
 * Continuity service (Build 27 R6 — "what shifted since your last reading")
 *
 * R6's single-source module for the temporal-delta note: the one place the delta
 * between the user's last-engagement baseline and now is computed, and where the
 * meaningfulness (honesty) gate lives, so every surface that ever weaves
 * continuity does it identically. See plans/build-27/R6-continuity.md §6.
 *
 * STEP 2 (this file's current state) lands the pure delta engine —
 * `computeContinuityDelta` + its meaningfulness gate. It re-derives the user's
 * transit state at two dates (baseline + now) from the STABLE stored natal chart
 * via the R1 engine and diffs them. NO prompt, NO reading, NO persistence, NO
 * wiring is touched here — those are STEP 3 (the synthesis seam) and STEP 4
 * (baseline seeding/advance + persist). This module computes only; it never
 * reads a DB, calls Anthropic, or mutates anything.
 */
import {
  NatalChart,
  TransitSet,
  ContinuityDelta,
  ZodiacSign,
} from '../types/shared';
import {
  computeTransits,
  describeTransits,
} from './astrology.service';
import { getPersonalYear, getPersonalMonth } from '../utils/numerology';

/**
 * Algorithm tag stamped onto `UserProfile.continuity.continuityVersion` (mirrors
 * NUMEROLOGY_VERSION / RULES_VERSION). Bump to roll out a continuity-algorithm
 * change (orb policy, Moon handling, gate thresholds) deliberately.
 *
 * NOTE: STEP 2 stamps NOTHING with this — the version is stamped on the profile
 * at persist time in STEP 4. It lives here as the module's single knob.
 */
export const CONTINUITY_VERSION = '1.0.0';

/**
 * The low-delta honesty-gate knob (§6): a delta narrower than this many whole
 * days is never "meaningful" — the block is omitted rather than narrating a
 * near-zero shift. 3-day default; tunable in testing / A-B.
 */
export const MIN_GAP_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Zodiac order (matches astrology.service's SIGNS) — used only to decide whether
 * a transiting-Moon sign move is a "clean single-sign advance" (see below).
 */
const ZODIAC_ORDER: ZodiacSign[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

/**
 * Strip the parenthetical "(orb …)" from a `describeTransits` line so the SET
 * DIFF keys on the ASPECT IDENTITY ("Transiting X <aspect> natal Y") alone.
 * This is the orb-normalization guard (plan §6 step 2 + §11 risk #2): a slow
 * transit whose orb merely DRIFTS between the two dates (e.g. 1.2° → 1.8°, same
 * contact) must NOT read as a formed/ended aspect. The returned string[] on the
 * delta still carries the full human-readable line (with orb); only the diff key
 * is orb-free.
 */
function aspectIdentity(line: string): string {
  return line.replace(/\s*\(orb[^)]*\)\s*$/i, '').trim();
}

/**
 * True when `to` is exactly one zodiac sign forward of `from` — a "clean single
 * boundary" Moon move. Multi-sign jumps (large gaps, where the ~13°/day Moon has
 * cycled) and non-moves return false, so the coarse UTC-noon Moon (plan §11 risk
 * #3) only ever surfaces on an unambiguous adjacent advance.
 */
function isCleanSingleSignAdvance(from: ZodiacSign, to: ZodiacSign): boolean {
  const fi = ZODIAC_ORDER.indexOf(from);
  const ti = ZODIAC_ORDER.indexOf(to);
  if (fi < 0 || ti < 0) return false;
  return (ti - fi + 12) % 12 === 1;
}

/** Read the transiting Moon's sign out of a TransitSet's positions. */
function moonSign(transits: TransitSet): ZodiacSign | null {
  const moon = transits.positions.find((p) => p.body === 'moon');
  return moon ? moon.sign : null;
}

/**
 * Full orb-inclusive descriptor lines for a transit set, WITHOUT the default
 * top-8 truncation of `describeTransits`. Truncation is a prompt-rendering
 * concern; for the delta we diff the COMPLETE active-aspect set so an aspect
 * never reads as "ended" merely because a tighter one pushed it past the render
 * cutoff. Deterministic (orb-sorted) — a function only of the transit set.
 */
function fullTransitLines(transits: TransitSet): string[] {
  return describeTransits(transits, transits.aspectsToNatal.length);
}

/** Inputs to {@link computeContinuityDelta}. */
export interface ContinuityDeltaInput {
  /** The user's STABLE stored natal chart — the fixed reference transits move against. */
  natal: NatalChart;
  /** The last-engagement date the delta is measured FROM. */
  baselineAt: Date;
  /** "Now" — the later date the delta is measured TO. */
  now: Date;
  /** The user's birth date — needed for the fresh Personal Month / Personal Year. */
  birthDate: Date;
}

/**
 * Compute the temporal delta between the user's transit/numerology state at
 * `baselineAt` and at `now` — R6's deterministic "what shifted" engine and the
 * home of the "nothing changed" honesty gate (plan §6). PURE: a function only of
 * its inputs; reads no DB, calls no LLM, mutates nothing.
 *
 * The delta re-derives BOTH endpoints from the SAME natal chart via the exact,
 * deterministic R1 transit engine (`computeTransits` takes an arbitrary date),
 * then:
 *   - `newAspects`   = transit aspects present at `now` but not at `baselineAt`
 *   - `endedAspects` = transit aspects present at `baselineAt` but not at `now`
 *     (both keyed on orb-free aspect identity, so orb drift alone is not a change)
 *   - `moonSignChange`      — only on a clean single-sign advance AND a ≥ MIN_GAP_DAYS gap
 *   - `personalMonthChange` / `personalYearChange` — fresh from `birthDate`, on rollover
 *   - `gapDays`      = whole days baselineAt → now
 *   - `meaningful`   = gap ≥ MIN_GAP_DAYS AND at least one of the above shifts exists
 *
 * CONTRACT: the caller MUST pass a VALID natal chart. The null-natal /
 * no-birth-data FAIL-OPEN (return a normal reading with no continuity block) is
 * the reading path's concern in STEP 4 — this function does not guard for it.
 * Nothing here stamps `CONTINUITY_VERSION`; that is stamped at persist time (STEP 4).
 */
export function computeContinuityDelta(
  input: ContinuityDeltaInput
): ContinuityDelta {
  const { natal, baselineAt, now, birthDate } = input;

  const gapDays = Math.floor((now.getTime() - baselineAt.getTime()) / DAY_MS);

  // --- Transit aspect diff (the backbone) ---------------------------------
  const thenTransits = computeTransits(natal, baselineAt);
  const nowTransits = computeTransits(natal, now);
  const thenLines = fullTransitLines(thenTransits);
  const nowLines = fullTransitLines(nowTransits);

  const thenKeys = new Set(thenLines.map(aspectIdentity));
  const nowKeys = new Set(nowLines.map(aspectIdentity));

  const newAspects = nowLines.filter((l) => !thenKeys.has(aspectIdentity(l)));
  const endedAspects = thenLines.filter((l) => !nowKeys.has(aspectIdentity(l)));

  // --- Transiting-Moon sign change (guarded, coarse — §11 risk #3) --------
  let moonSignChange: ContinuityDelta['moonSignChange'];
  const moonThen = moonSign(thenTransits);
  const moonNow = moonSign(nowTransits);
  if (
    moonThen &&
    moonNow &&
    gapDays >= MIN_GAP_DAYS &&
    isCleanSingleSignAdvance(moonThen, moonNow)
  ) {
    moonSignChange = { from: moonThen, to: moonNow };
  }

  // --- Personal Month / Personal Year rollover (R4, fresh both dates) ------
  // Local getters mirror the live R4 path in insight.service (getPersonalYear
  // reads birthDate's local month/day; the "current" year/month are local too).
  const pyThen = getPersonalYear(birthDate, baselineAt.getFullYear());
  const pmThen = getPersonalMonth(pyThen, baselineAt.getMonth() + 1);
  const pyNow = getPersonalYear(birthDate, now.getFullYear());
  const pmNow = getPersonalMonth(pyNow, now.getMonth() + 1);

  const personalMonthChange =
    pmThen !== pmNow ? { from: pmThen, to: pmNow } : undefined;
  const personalYearChange =
    pyThen !== pyNow ? { from: pyThen, to: pyNow } : undefined;

  // --- Meaningfulness gate (§4 #6 — the code-level honesty decision) -------
  const meaningful =
    gapDays >= MIN_GAP_DAYS &&
    (newAspects.length > 0 ||
      endedAspects.length > 0 ||
      !!moonSignChange ||
      !!personalMonthChange ||
      !!personalYearChange);

  return {
    meaningful,
    gapDays,
    newAspects,
    endedAspects,
    ...(moonSignChange ? { moonSignChange } : {}),
    ...(personalMonthChange ? { personalMonthChange } : {}),
    ...(personalYearChange ? { personalYearChange } : {}),
  };
}
