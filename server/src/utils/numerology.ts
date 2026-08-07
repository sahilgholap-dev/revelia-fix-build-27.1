/**
 * Numerology calculation utilities
 */

/**
 * Version of the numerology arithmetic (the R2/R3 RULES_VERSION analog).
 * Stamped onto every `profile.numerology` sub-doc at compute time. Bump when
 * the algorithm changes (e.g. Y-as-vowel treatment, master-number policy)
 * and rerun the backfill deliberately — never mixed populations silently.
 */
export const NUMEROLOGY_VERSION = '2.0.0';

/**
 * Life path meanings
 */
const LIFE_PATH_MEANINGS: Record<number, string> = {
  1: 'The Leader - independence and individuality',
  2: 'The Mediator - cooperation and balance',
  3: 'The Communicator - creative expression and social interaction',
  4: 'The Builder - stability and process',
  5: 'The Freedom Seeker - change and adventure',
  6: 'The Nurturer - responsibility and care',
  7: 'The Seeker - analysis and understanding',
  8: 'The Powerhouse - achievement and abundance',
  9: 'The Humanitarian - compassion and global consciousness',
  11: 'The Intuitive - spiritual insight and inspiration',
  22: 'The Master Builder - turning dreams into reality',
  33: 'The Master Teacher - guidance and spiritual upliftment',
};

/**
 * Personal year meanings
 */
const PERSONAL_YEAR_MEANINGS: Record<number, string> = {
  1: 'Year of new beginnings and fresh starts',
  2: 'Year of partnerships and cooperation',
  3: 'Year of creativity and self-expression',
  4: 'Year of building foundations and hard work',
  5: 'Year of change and freedom',
  6: 'Year of responsibility and family',
  7: 'Year of introspection and spiritual growth',
  8: 'Year of abundance and achievement',
  9: 'Year of completion and letting go',
  11: 'Year of spiritual awakening',
  22: 'Year of manifesting dreams',
  33: 'Year of teaching and healing',
};

/**
 * Personal month meanings
 */
const PERSONAL_MONTH_MEANINGS: Record<number, string> = {
  1: 'Month of new initiatives',
  2: 'Month of patience and partnership',
  3: 'Month of creativity and joy',
  4: 'Month of organization and discipline',
  5: 'Month of change and adventure',
  6: 'Month of harmony and service',
  7: 'Month of reflection and study',
  8: 'Month of power and success',
  9: 'Month of endings and transition',
  11: 'Month of inspiration',
  22: 'Month of achievement',
  33: 'Month of compassion',
};

/**
 * Reduce number to single digit, keeping master numbers 11, 22, 33
 * @param num - Number to reduce
 * @returns Reduced number
 */
export function reduceToSingleDigit(num: number): number {
  // If already 11, 22, or 33, return as is
  if (num === 11 || num === 22 || num === 33) {
    return num;
  }

  // Otherwise reduce
  while (num > 9) {
    num = num
      .toString()
      .split('')
      .reduce((sum, digit) => sum + parseInt(digit, 10), 0);

    // Check for master numbers after each reduction
    if (num === 11 || num === 22 || num === 33) {
      break;
    }
  }

  return num;
}

/**
 * Calculate life path number from birth date
 * @param birthDate - Birth date
 * @returns Life path number (1-9, 11, 22, 33)
 */
export function getLifePathNumber(birthDate: Date): number {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1; // JavaScript months are 0-indexed
  const day = birthDate.getDate();

  // Reduce each component separately first (helps catch master numbers)
  const yearSum = reduceToSingleDigit(
    year
      .toString()
      .split('')
      .reduce((sum, d) => sum + parseInt(d, 10), 0)
  );
  const monthSum = reduceToSingleDigit(month);
  const daySum = reduceToSingleDigit(day);

  // Combine and reduce
  return reduceToSingleDigit(yearSum + monthSum + daySum);
}

/**
 * Calculate personal year
 * @param birthDate - Birth date
 * @param currentYear - Current year
 * @returns Personal year number (1-9, 11, 22, 33)
 */
export function getPersonalYear(birthDate: Date, currentYear: number): number {
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();

  const yearSum = reduceToSingleDigit(
    currentYear
      .toString()
      .split('')
      .reduce((sum, d) => sum + parseInt(d, 10), 0)
  );
  const monthSum = reduceToSingleDigit(month);
  const daySum = reduceToSingleDigit(day);

  return reduceToSingleDigit(yearSum + monthSum + daySum);
}

/**
 * Calculate personal month
 * @param personalYear - Personal year number
 * @param currentMonth - Current month (1-12)
 * @returns Personal month number (1-9, 11, 22, 33)
 */
export function getPersonalMonth(
  personalYear: number,
  currentMonth: number
): number {
  return reduceToSingleDigit(personalYear + currentMonth);
}

/**
 * Get life path meaning
 * @param lifePathNumber - Life path number
 * @returns Meaning description
 */
export function getLifePathMeaning(lifePathNumber: number): string {
  return LIFE_PATH_MEANINGS[lifePathNumber] || 'Unknown';
}

/**
 * Get personal year meaning
 * @param personalYear - Personal year number
 * @returns Meaning description
 */
export function getPersonalYearMeaning(personalYear: number): string {
  return PERSONAL_YEAR_MEANINGS[personalYear] || 'Unknown';
}

/**
 * Get personal month meaning
 * @param personalMonth - Personal month number
 * @returns Meaning description
 */
export function getPersonalMonthMeaning(personalMonth: number): string {
  return PERSONAL_MONTH_MEANINGS[personalMonth] || 'Unknown';
}

/**
 * Whether a number is a preserved master number.
 */
export function isMasterNumber(n: number): boolean {
  return n === 11 || n === 22 || n === 33;
}

// ---------------------------------------------------------------------------
// R9 Personalized Cosmic Report — report-specific numerology fields.
//
// PURE, ADDITIVE, and COMPUTE-FOR-INJECT ONLY. These are assembled into the
// report's numerology payload at generation time and are NOT persisted to the
// `profile.numerology` sub-doc — so they add NO schema field and do NOT change
// NUMEROLOGY_VERSION (they neither alter nor read the stored Pythagorean trio
// or Life Path). Every table/rule is taken verbatim from the committed
// generation prompt §4 (server/src/prompts/Revelia_Complete_Reading_Generation_Prompt_v1.md),
// never from memory. All reducers reuse reduceToSingleDigit (single source);
// no reducer is duplicated here.
// ---------------------------------------------------------------------------

/**
 * Vedic planet rulership by resolved single digit (prompt §4).
 */
const VEDIC_PLANET_BY_NUMBER: Record<number, string> = {
  1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury',
  6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars',
};

/**
 * Sum the decimal digits of a non-negative integer (no reduction).
 */
function sumDigits(n: number): number {
  return Math.abs(n)
    .toString()
    .split('')
    .reduce((sum, d) => sum + parseInt(d, 10), 0);
}

/**
 * Fully resolve a master number (11/22/33) to its base digit (2/4/6) for the
 * Vedic planet-map lookup ONLY. reduceToSingleDigit preserves masters for
 * display; the planet rulership is keyed by the resolved 1-9 digit — the
 * sample carries Bhagyank as "29 -> 11 -> 2 / Moon". Non-master values pass
 * through unchanged.
 */
function resolveMasterToDigit(n: number): number {
  return isMasterNumber(n) ? sumDigits(n) : n;
}

export interface LifePathDetail {
  /** sum of the three separately-reduced month/day/year components (pre-final-reduce) */
  compound: number;
  /** master-preserving reduction of `compound` — the app-wide Life Path value */
  intermediate: number;
  /** Life Path PRESERVES masters (prompt §4), so this equals `intermediate`
   *  (never resolved past a master, unlike the planet-keyed Vedic numbers) */
  reduced: number;
  isMaster: boolean;
}

/**
 * Life Path WITH its pre-reduction compound, for the report's `NUMEROLOGY_JSON`
 * life_path block (prompt §3 schema needs {compound, intermediate, reduced,
 * isMaster}; `getLifePathNumber` exposes only the final master-preserving value).
 * Same method as `getLifePathNumber` (reduce month/day/year separately, sum,
 * reduce, masters preserved) → `intermediate` is byte-identical to
 * `getLifePathNumber` (asserted in the offline harness). Compute-for-inject only.
 */
export function getLifePathDetail(birthDate: Date): LifePathDetail {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();

  const yearSum = reduceToSingleDigit(sumDigits(year));
  const monthSum = reduceToSingleDigit(month);
  const daySum = reduceToSingleDigit(day);

  const compound = yearSum + monthSum + daySum;
  const intermediate = reduceToSingleDigit(compound);
  return { compound, intermediate, reduced: intermediate, isMaster: isMasterNumber(intermediate) };
}

export interface VedicNumber {
  /** pre-reduction sum (the day for Mulank; all DOB digits for Bhagyank) */
  compound: number;
  /** master-preserving reduction of `compound` (may itself be 11/22/33) */
  reduced: number;
  /** the master fully resolved to 1-9 (the planet-map key) */
  finalDigit: number;
  /** ruling planet by finalDigit (prompt §4 planet map) */
  planet: string;
}

/**
 * Vedic Mulank (birth-day number): the day of the month reduced, with its
 * ruling planet (prompt §4).
 */
export function getMulank(birthDate: Date): VedicNumber {
  const day = birthDate.getDate();
  const reduced = reduceToSingleDigit(day);
  const finalDigit = resolveMasterToDigit(reduced);
  return { compound: day, reduced, finalDigit, planet: VEDIC_PLANET_BY_NUMBER[finalDigit] };
}

/**
 * Vedic Bhagyank (destiny number): all DOB digits summed then reduced (masters
 * preserved en route), with its ruling planet (prompt §4).
 */
export function getBhagyank(birthDate: Date): VedicNumber {
  const compound =
    sumDigits(birthDate.getDate()) +
    sumDigits(birthDate.getMonth() + 1) +
    sumDigits(birthDate.getFullYear());
  const reduced = reduceToSingleDigit(compound);
  const finalDigit = resolveMasterToDigit(reduced);
  return { compound, reduced, finalDigit, planet: VEDIC_PLANET_BY_NUMBER[finalDigit] };
}

export interface BirthdayNumber {
  /** the day of the month, as-is (may be a compound like 23) */
  day: number;
  /** master-preserving reduction of the day */
  reduced: number;
  isMaster: boolean;
  /** true when the day is a two-digit compound (> 9) */
  isCompound: boolean;
}

/**
 * Birthday Number: the day of the month, reported as master or compound as
 * such (prompt §4).
 */
export function getBirthdayNumber(birthDate: Date): BirthdayNumber {
  const day = birthDate.getDate();
  const reduced = reduceToSingleDigit(day);
  return {
    day,
    reduced,
    isMaster: isMasterNumber(day) || isMasterNumber(reduced),
    isCompound: day > 9,
  };
}

/**
 * Maturity Number: Life Path + Expression, reduced with masters preserved
 * (prompt §4). Pass the master-preserving Life Path and Expression values; the
 * sum can itself resolve to a master (e.g. Monty: 11 + 8 = 19 -> 1).
 */
export function getMaturityNumber(lifePathNumber: number, expressionNumber: number): number {
  return reduceToSingleDigit(lifePathNumber + expressionNumber);
}

/**
 * Personal-Year series for `count` consecutive calendar years starting at
 * `startYear` (prompt §4: current + next two -> count 3). Reuses getPersonalYear
 * (the shared reduce-each-component-then-sum method, masters preserved) so the
 * series cannot diverge from the single-year value used elsewhere.
 */
export function getPersonalYearSeries(
  birthDate: Date,
  startYear: number,
  count = 3
): Array<{ year: number; value: number }> {
  const series: Array<{ year: number; value: number }> = [];
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    series.push({ year, value: getPersonalYear(birthDate, year) });
  }
  return series;
}
