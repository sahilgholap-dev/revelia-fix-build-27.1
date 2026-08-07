/**
 * Safety net date-format normalizer for AI-generated reading content.
 *
 * The monthly-reading prompt instructs Claude to output dates in standard
 * US format ("May 6, 2026"). If the model occasionally slips back to the
 * old placeholder/bracket pattern ("May 2026 [6]") or other near-formats,
 * this transform catches the most common wrong shapes and rewrites them
 * before the response reaches the client.
 *
 * Patterns handled:
 *   "May 2026 [6]"        → "May 6, 2026"
 *   "May 2026 [6-8]"      → "May 6–8, 2026"
 *   "May 2026 [any date]" → "May 2026"            (fallback when day unknown)
 *   "May [6]"             → "May 6"               (no year specified)
 *   "May 6 2026"          → "May 6, 2026"         (missing comma)
 *
 * Idempotent: running the transform on already-formatted output is a no-op.
 */

const MONTH_NAMES =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December)';

// "Month YYYY [DD]" → "Month DD, YYYY"
const BRACKET_SINGLE_DAY = new RegExp(
  `(${MONTH_NAMES})\\s+(\\d{4})\\s*\\[(\\d{1,2})\\]`,
  'g'
);

// "Month YYYY [DD-DD]" or "Month YYYY [DD–DD]" → "Month DD–DD, YYYY"
const BRACKET_DAY_RANGE = new RegExp(
  `(${MONTH_NAMES})\\s+(\\d{4})\\s*\\[(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\]`,
  'g'
);

// "Month YYYY [any date]" → "Month YYYY"
const BRACKET_PLACEHOLDER = new RegExp(
  `(${MONTH_NAMES}\\s+\\d{4})\\s*\\[[^\\]]*\\]`,
  'g'
);

// "Month [DD]" (no year) → "Month DD"
const BRACKET_NO_YEAR = new RegExp(`(${MONTH_NAMES})\\s*\\[(\\d{1,2})\\]`, 'g');

// "Month DD YYYY" (missing comma) → "Month DD, YYYY"
const MISSING_COMMA = new RegExp(
  `(${MONTH_NAMES})\\s+(\\d{1,2})\\s+(\\d{4})\\b`,
  'g'
);

/** Normalize a single date string. */
export function normalizeDateString(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return input;
  let out = input;
  // Order matters: ranges before single-day, both before placeholder fallback
  out = out.replace(BRACKET_DAY_RANGE, '$1 $3–$4, $2');
  out = out.replace(BRACKET_SINGLE_DAY, '$1 $3, $2');
  out = out.replace(BRACKET_PLACEHOLDER, '$1');
  out = out.replace(BRACKET_NO_YEAR, '$1 $2');
  out = out.replace(MISSING_COMMA, '$1 $2, $3');
  return out;
}

/**
 * Recursively normalize every string field in a parsed reading object.
 * Mutates and returns the same object for convenience.
 */
export function normalizeDatesInObject<T>(obj: T): T {
  if (obj == null) return obj;
  if (typeof obj === 'string') return normalizeDateString(obj) as unknown as T;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      (obj as any)[i] = normalizeDatesInObject(obj[i]);
    }
    return obj;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj as any)) {
      (obj as any)[key] = normalizeDatesInObject((obj as any)[key]);
    }
    return obj;
  }
  return obj;
}
