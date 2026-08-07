/**
 * Pythagorean numerology letter-to-number mapping and name calculations
 */

import { reduceToSingleDigit, isMasterNumber } from './numerology';

const LETTER_VALUES: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

// Y is ALWAYS a vowel, standardized project-wide (Sid, 2026-07-16 — D1). This is
// the SINGLE classification source: Soul Urge sums the vowels (now incl. Y),
// Personality sums the consonants (now excl. Y). Y's LETTER VALUE stays 7
// (LETTER_VALUES above) — only its vowel/consonant classification changes, so
// Expression (all letters) is unaffected. Changing this is a NUMEROLOGY_VERSION
// bump (see numerology.ts) — done: 1.0.0 → 2.0.0.
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

/**
 * Get numerology value of a single letter
 */
function letterValue(letter: string): number {
  return LETTER_VALUES[letter.toLowerCase()] || 0;
}

/**
 * Calculate Expression Number (sum of ALL letters in full name)
 */
export function calculateExpressionNumber(fullName: string): number {
  const letters = fullName.replace(/[^a-zA-Z]/g, '');
  const sum = letters.split('').reduce((total, letter) => total + letterValue(letter), 0);
  return reduceToSingleDigit(sum);
}

/**
 * Calculate Soul Urge Number (sum of VOWELS only)
 * Y is always treated as a vowel (D1, project-wide — see VOWELS above)
 */
export function calculateSoulUrgeNumber(fullName: string): number {
  const letters = fullName.replace(/[^a-zA-Z]/g, '');
  const sum = letters.split('').reduce((total, letter) => {
    if (VOWELS.has(letter.toLowerCase())) {
      return total + letterValue(letter);
    }
    return total;
  }, 0);
  return reduceToSingleDigit(sum);
}

/**
 * Calculate Personality Number (sum of CONSONANTS only)
 */
export function calculatePersonalityNumber(fullName: string): number {
  const letters = fullName.replace(/[^a-zA-Z]/g, '');
  const sum = letters.split('').reduce((total, letter) => {
    if (!VOWELS.has(letter.toLowerCase())) {
      return total + letterValue(letter);
    }
    return total;
  }, 0);
  return reduceToSingleDigit(sum);
}

/**
 * Compute the full name-based number set from one name string — the ONE
 * definition of "the set" shared by every persist path (name-destiny persist,
 * profile-name hook, backfill), so call sites can't drift on which three
 * functions constitute it.
 */
export function computeNameNumbers(fullName: string): {
  expressionNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;
} {
  return {
    expressionNumber: calculateExpressionNumber(fullName),
    soulUrgeNumber: calculateSoulUrgeNumber(fullName),
    personalityNumber: calculatePersonalityNumber(fullName),
  };
}

// ---------------------------------------------------------------------------
// R9 Personalized Cosmic Report — report-specific name-based numerology fields.
//
// PURE, ADDITIVE, and COMPUTE-FOR-INJECT ONLY (see numerology.ts header): these
// feed the report payload and are NOT persisted, so they add NO schema field
// and do NOT change NUMEROLOGY_VERSION (they don't touch the stored Pythagorean
// trio). Tables are verbatim from the committed generation prompt §4, never
// from memory. Reducers reuse reduceToSingleDigit (single source).
// ---------------------------------------------------------------------------

/**
 * Chaldean letter values (prompt §4) — a DISTINCT table from Pythagorean, and
 * NOT vowel-split. No letter maps to 9. Used for the report's Chaldean compound
 * field only; the Pythagorean trio above is unaffected.
 */
const CHALDEAN_LETTER_VALUES: Record<string, number> = {
  a: 1, i: 1, j: 1, q: 1, y: 1,
  b: 2, k: 2, r: 2,
  c: 3, g: 3, l: 3, s: 3,
  d: 4, m: 4, t: 4,
  e: 5, h: 5, n: 5, x: 5,
  u: 6, v: 6, w: 6,
  o: 7, z: 7,
  f: 8, p: 8,
};

function chaldeanLetterValue(letter: string): number {
  return CHALDEAN_LETTER_VALUES[letter.toLowerCase()] || 0;
}

export interface NameCompound {
  /** raw letter-sum before reduction (the "compound") */
  compound: number;
  /** master-preserving reduction of `compound` */
  reduced: number;
  /** true when the compound OR its reduction is a master (11/22/33) */
  isMaster: boolean;
}

/**
 * Chaldean compound of a name segment (full name, or first name, etc.):
 * full-letter sum on the Chaldean table, plus its reduction. Compute the
 * numbers ONLY — never fear-framed compound-number lore (prompt §4). The model
 * supplies classical meaning; the engine supplies the arithmetic + master flag.
 */
export function computeChaldeanCompound(name: string): NameCompound {
  const letters = name.replace(/[^a-zA-Z]/g, '');
  const compound = letters.split('').reduce((total, l) => total + chaldeanLetterValue(l), 0);
  const reduced = reduceToSingleDigit(compound);
  return { compound, reduced, isMaster: isMasterNumber(compound) || isMasterNumber(reduced) };
}

/**
 * Pythagorean all-letters compound of a name segment — the Expression-style sum
 * for ONE name component (first name, surname, middle). Y-INVARIANT (every
 * letter counted; no vowel/consonant split), so it is independent of the D1
 * Y-rule. DISTINCT from computeChaldeanCompound (different table): e.g. surname
 * ADAMS = 11 Pythagorean (master) but 13 -> 4 Chaldean. Surfaced (with the
 * master flag) so the model never has to do arithmetic to spot a master
 * compound; whether any component compound is presented is model discretion
 * (prompt §4 fixes only the Chaldean compounds — see this session's finding).
 */
export function computePythagoreanCompound(name: string): NameCompound {
  const letters = name.replace(/[^a-zA-Z]/g, '');
  const compound = letters.split('').reduce((total, l) => total + letterValue(l), 0);
  const reduced = reduceToSingleDigit(compound);
  return { compound, reduced, isMaster: isMasterNumber(compound) || isMasterNumber(reduced) };
}

/**
 * R9 report — per-letter value breakdown for `NUMEROLOGY_JSON.letter_values`
 * (prompt §3 schema). SINGLE SOURCE of the two letter tables: the report shows
 * its arithmetic as reproducible from THIS breakdown (prompt §4 "reproducible
 * from the injected letter-value breakdown"), so the builder must NOT re-derive
 * the maps inline (finding-C single-source principle). Compute-for-inject only.
 */
export function pythagoreanLetterValues(name: string): Array<[string, number]> {
  return name
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .split('')
    .map((l) => [l, letterValue(l)] as [string, number]);
}

export function chaldeanLetterValues(name: string): Array<[string, number]> {
  return name
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .split('')
    .map((l) => [l, chaldeanLetterValue(l)] as [string, number]);
}

/**
 * R9 report — the Pythagorean trio WITH compound (pre-reduction) totals, for the
 * `NUMEROLOGY_JSON` expression/soul_urge/personality blocks (prompt §3 schema
 * needs {compound, reduced, isMaster}; the `calculate*Number` fns above expose
 * the reduced value only). Uses the SAME private `VOWELS` set (Y-as-vowel, D1)
 * and `LETTER_VALUES` as those fns — one classification source, so the reduced
 * values are byte-identical to `computeNameNumbers` (proven in the offline
 * harness). Expression = all letters; Soul Urge = vowels; Personality =
 * consonants. Compute-for-inject only (no persistence, no NUMEROLOGY_VERSION
 * change — like the 2b fields).
 */
export function computePythagoreanTrioDetail(fullName: string): {
  expression: NameCompound;
  soulUrge: NameCompound;
  personality: NameCompound;
} {
  const letters = fullName.replace(/[^a-zA-Z]/g, '').split('');
  const detail = (include: (letter: string) => boolean): NameCompound => {
    const compound = letters.reduce(
      (total, l) => (include(l) ? total + letterValue(l) : total),
      0
    );
    const reduced = reduceToSingleDigit(compound);
    return { compound, reduced, isMaster: isMasterNumber(compound) || isMasterNumber(reduced) };
  };
  return {
    expression: detail(() => true),
    soulUrge: detail((l) => VOWELS.has(l.toLowerCase())),
    personality: detail((l) => !VOWELS.has(l.toLowerCase())),
  };
}

export type NameCompletenessLevel = 'high' | 'medium' | 'low';

export interface NameCompletenessResult {
  level: NameCompletenessLevel;
  warnings: string[];
}

/**
 * Heuristic check on whether a submitted name appears to be a full birth
 * name (high), partial/informal (medium), or clearly incomplete (low).
 *
 * Never blocks submission — controller decides what to do with the
 * result. Used to (a) calibrate Claude's confidence in the Name Destiny
 * prompt and (b) surface a mild educational disclaimer in mobile when
 * level !== 'high'.
 */
export function assessNameCompleteness(
  firstName: string,
  middleName: string | null,
  lastName: string
): NameCompletenessResult {
  const warnings: string[] = [];
  const f = (firstName || '').trim();
  const m = (middleName || '').trim();
  const l = (lastName || '').trim();

  if (f.length < 2 || l.length < 2) {
    return { level: 'low', warnings: ['Name appears incomplete.'] };
  }

  if (l.length === 1 || l.endsWith('.')) {
    warnings.push('Last name appears to be an initial; full surname recommended.');
  }
  if (f.length < 3 && !m) {
    warnings.push('Name appears informal; full birth name recommended.');
  }
  if ((f + m + l).length < 8) {
    warnings.push('Total name length is short; verify this is your full birth name.');
  }

  if (warnings.length === 0) return { level: 'high', warnings: [] };
  if (warnings.length === 1) return { level: 'medium', warnings };
  return { level: 'low', warnings };
}
