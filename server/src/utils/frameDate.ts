/**
 * Shared frame_end arithmetic (R7 §13d-2) — the SINGLE source for the UTC
 * "N whole months from an instant" month-add used by BOTH the Q&A router
 * (`qa-router.service.ts` `resolveFrame` → the relative "within N months" bound)
 * and the Timing Engine (`timing-engine.service.ts` `frameEndFrom` → a question's
 * `askedWindowMonths`). The identical arithmetic was previously duplicated
 * byte-for-byte in both files (router `addMonthsUtc` vs engine `frameEndFrom`);
 * extracting it here makes "router and engine cannot disagree on the frame bound"
 * a STRUCTURAL guarantee rather than a comment two maintainers must honour.
 *
 * Dependency-free by design (no `sweph`, no config, no Date.now) so the
 * lightweight Haiku router can import it WITHOUT pulling in the engine's
 * ephemeris/config module graph.
 */

/**
 * UTC month-add: `date` advanced by `months` whole months, keeping the same
 * day-of-month, formatted "YYYY-MM-DD". Same-day carry, NO end-of-month clamping
 * — byte-for-byte the behaviour both call sites had before extraction (a "day 31
 * + 1 month" input rolls forward the same way it did in each original copy). UTC
 * throughout so the bound is timezone-stable.
 */
export function addUtcMonths(date: Date, months: number): string {
  const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const day = date.getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
