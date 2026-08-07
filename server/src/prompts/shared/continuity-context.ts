/**
 * Continuity-context renderer (Build 27 R6 — "what shifted since your last reading").
 *
 * R6's RENDER half (the COMPUTE half is continuity.service.ts). This is the seam
 * R5 documented but never shipped (plan §1 correction): the one place a computed
 * `ContinuityDelta` is turned into a prompt block the synthesis model reads.
 * See plans/build-27/R6-continuity.md §6.
 *
 * Separation of concerns (deliberate — do NOT collapse):
 *   - continuity.service.ts  = COMPUTE  (`computeContinuityDelta` → ContinuityDelta)
 *   - continuity-context.ts   = RENDER   (this file: ContinuityDelta → prompt text)
 * This module imports ONLY the `ContinuityDelta` TYPE; it never imports or calls
 * `computeContinuityDelta`. STEP 4's wiring does the compute→render→pass chain.
 *
 * This is a PROMPT INSTRUCTION to the synthesis model, not final user-facing copy
 * — the model writes the prose from the enumerated shifts. The user-facing
 * tier-reach / teaser copy is STEP 5's (S-R6-gated) concern, not this file.
 */

import type { ContinuityDelta, DailyContinuity } from '../../types/shared';

/**
 * Render a computed continuity delta into a `## WHAT'S SHIFTED SINCE YOUR LAST
 * READING` prompt block, or `''` when nothing meaningful moved.
 *
 * FAIL-OPEN / NO-FABRICATION (non-negotiable, plan §4 #6 + §6): a `!meaningful`
 * delta returns `''` → no block at all → the reading is a normal reading. The
 * meaningfulness decision is already made in code (continuity.service's gate), so
 * the model can never be handed a "change" that did not happen.
 *
 * When meaningful, the block:
 *  (i)   states the gap warmly ("~N days ago" / "since you were last here"),
 *  (ii)  ENUMERATES only the populated shifts — an absent field is never printed
 *        as an empty section, and
 *  (iii) ends with a STRICT instruction (mirrors R5's monthly prose-never-
 *        contradict framing): weave a brief, warm note using ONLY these shifts;
 *        never invent movement/dates/placements; never overstate a slow transit.
 *
 * Convention matches feature-context.ts's `buildFeatureContext`: the returned
 * string leads and trails with a single "\n" so a caller can splice it
 * unconditionally without producing a dangling header (and, when '', add nothing).
 */
export function buildContinuityContext(delta: ContinuityDelta): string {
  if (!delta.meaningful) return '';

  // Enumerate ONLY populated shifts — never emit an empty section (plan §6 ii).
  const shifts: string[] = [];

  if (delta.newAspects.length > 0) {
    shifts.push(`- **Newly formed transits:** ${delta.newAspects.join('; ')}`);
  }
  if (delta.endedAspects.length > 0) {
    shifts.push(`- **Transits that have moved off:** ${delta.endedAspects.join('; ')}`);
  }
  if (delta.moonSignChange) {
    shifts.push(
      `- **Transiting Moon sign:** moved from ${delta.moonSignChange.from} to ${delta.moonSignChange.to}`
    );
  }
  if (delta.personalMonthChange) {
    shifts.push(
      `- **Personal Month:** rolled from ${delta.personalMonthChange.from} to ${delta.personalMonthChange.to}`
    );
  }
  if (delta.personalYearChange) {
    shifts.push(
      `- **Personal Year:** rolled from ${delta.personalYearChange.from} to ${delta.personalYearChange.to}`
    );
  }

  return `
## WHAT'S SHIFTED SINCE YOUR LAST READING

It has been ~${delta.gapDays} days since you were last here. In that window, ONLY the following have actually shifted:

${shifts.join('\n')}

Weave a brief, warm "since you were last here (~${delta.gapDays} days ago)" note using ONLY the shifts listed above. Do not invent movement, dates, or placements not listed. If a listed item is minor, mention it lightly. Never overstate the magnitude of a slow transit.
`;
}

/**
 * Render a computed continuity delta into a SHORT, FINISHED, user-facing hook
 * sentence for the free/premium daily TEASER (Build 27 R6 §9 STEP 5 — Option A,
 * zero-mobile; S-R6 default). See plans/build-27/R6-continuity.md §7 "Daily
 * teaser" + §4 decision #4.
 *
 * DISTINCT from `buildContinuityContext` above — do NOT conflate:
 *   - buildContinuityContext = a PROMPT INSTRUCTION for the synthesis model
 *     (daily-FULL / Premium Plus); the model writes the prose from it.
 *   - buildContinuityHook (this) = a SHORT, ALREADY-WRITTEN sentence shown
 *     DIRECTLY in the teaser string; no model rewrites it.
 *
 * FAIL-OPEN / NO-FABRICATION (same non-negotiable as the block): `!meaningful`
 * → '' (no hook, teaser unchanged). The meaningfulness decision is already made
 * in code (continuity.service's gate), so this never surfaces a shift that did
 * not happen — and the gate guarantees ≥1 real shift when it returns non-empty.
 *
 * HONEST by construction: the hook references ONLY that shifts occurred and the
 * rough gap / count ("a few" vs "a"). It NEVER enumerates raw aspect strings,
 * names placements, or manufactures drama — it is a teaser pull, not the reading.
 * Re-mappable copy (S-R6): the tier-reach/tone is a product call, so keep the
 * wording swappable without touching the gate.
 */
export function buildContinuityHook(delta: ContinuityDelta): string {
  if (!delta.meaningful) return '';

  // Count the DISTINCT shifts that actually moved — used ONLY to shape an honest
  // "a few" vs "a" quantifier, never to enumerate raw placements. The gate
  // guarantees this is ≥ 1 whenever `meaningful` is true.
  const shiftCount =
    delta.newAspects.length +
    delta.endedAspects.length +
    (delta.moonSignChange ? 1 : 0) +
    (delta.personalMonthChange ? 1 : 0) +
    (delta.personalYearChange ? 1 : 0);

  const influences =
    shiftCount > 1
      ? 'a few cosmic influences have'
      : 'a cosmic influence has';

  return `Since you were last here ~${delta.gapDays} days ago, ${influences} shifted — see what's realigning.`;
}

/**
 * Render a computed continuity delta into the ADDITIVE "what's shifted" CARD
 * payload (Build 27 R6 Option C) — the structured, display-only projection the
 * mobile continuity card renders. `null` when nothing meaningful moved (card
 * hidden), mirroring the fail-open / no-fabrication contract of the two builders
 * above (the gate has already decided meaningfulness).
 *
 * DISTINCT from both builders above — do NOT conflate:
 *   - buildContinuityContext = a PROMPT INSTRUCTION for the synthesis model.
 *   - buildContinuityHook     = a short finished SENTENCE shown in the teaser.
 *   - buildContinuityCard (this) = STRUCTURED, user-facing highlight LABELS for a
 *     card. Honest by construction: short non-technical labels + counts, NEVER
 *     raw aspect strings (those are for the model, not the user).
 *
 * PURE + ADDITIVE: reads only the delta, computes/persists nothing, changes no
 * generation logic, and does not touch CONTINUITY_VERSION.
 */
export function buildContinuityCard(delta: ContinuityDelta): DailyContinuity | null {
  if (!delta.meaningful) return null;

  const plural = (n: number) => (n === 1 ? '' : 's');
  const highlights: string[] = [];

  if (delta.newAspects.length > 0) {
    highlights.push(`${delta.newAspects.length} new alignment${plural(delta.newAspects.length)} forming`);
  }
  if (delta.endedAspects.length > 0) {
    highlights.push(`${delta.endedAspects.length} influence${plural(delta.endedAspects.length)} easing off`);
  }
  if (delta.moonSignChange) {
    highlights.push(`Moon moved into ${delta.moonSignChange.to}`);
  }
  if (delta.personalMonthChange) {
    highlights.push(`Personal Month ${delta.personalMonthChange.from} → ${delta.personalMonthChange.to}`);
  }
  if (delta.personalYearChange) {
    highlights.push(`Personal Year ${delta.personalYearChange.from} → ${delta.personalYearChange.to}`);
  }

  return { gapDays: delta.gapDays, highlights };
}
