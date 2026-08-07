/**
 * Shared feature-context formatter for R5 synthesis prompts (Build 27).
 *
 * R1–R4 each landed a structured feature set onto `UserInsightProfile` as DATA
 * and DEFERRED the synthesis COPY to R5. This helper renders the four now-stable
 * sets into prompt text once, so every synthesis surface (daily first, then
 * weekly / monthly / compatibility / career) weaves the SAME data identically
 * instead of each re-implementing the formatting and drifting apart:
 *   - R1 astrology: moonSign, risingSign, activeAspects[], keyTransits[]
 *   - R2 face:      faceTraits[]  (compact "<trait>: <band>")
 *   - R3 palm:      palmTraits[]  (compact "<trait>: <band>")
 *   - R4 numerology: expression / soulUrge / personality (the name trio)
 *
 * CONTRACTS (must hold for every consuming surface):
 * - EVERY field here is OPTIONAL on the profile (undefined for pre-backfill
 *   users who only have a sunSign). Each section is OMITTED when its source is
 *   absent — this never renders "undefined". A surface must still produce a full
 *   reading for a sunSign-only user, so callers must degrade gracefully when the
 *   returned string is empty.
 * - NAMES ARE READ FROM FIELDS, NEVER HARDCODED — a later S1/S3 RULES_VERSION
 *   rename of archetypes / traits flows through automatically (nothing here
 *   embeds an archetype/trait/energyType name literal).
 *
 * This helper is DATA→COPY only: it does not touch model routing, the
 * UserInsightProfile type, or buildUserInsightProfile() (all consumed unchanged).
 */

/**
 * Structural input contract for {@link buildFeatureContext} — EXACTLY the fields
 * the helper reads, no more. `UserInsightProfile` structurally satisfies this
 * (daily/weekly/monthly pass it directly), and Build-27 R5 §5 widened
 * `UserCompatibilityProfile` to satisfy it too, so the compatibility surface can
 * reuse the same formatter without being a `UserInsightProfile`. Field types
 * mirror `UserInsightProfile` (esp. `risingSign: string | null`) so both callers
 * assign structurally. This is a WIDENING of the former `UserInsightProfile`
 * param — nothing in the rendering body changed.
 */
export interface FeatureContextInput {
  name: string;
  moonSign?: string;
  risingSign?: string | null;
  activeAspects?: string[];
  keyTransits?: string[];
  faceTraits?: string[];
  palmTraits?: string[];
  expressionNumber?: number;
  soulUrgeNumber?: number;
  personalityNumber?: number;
}

function hasItems(arr: readonly unknown[] | undefined | null): arr is unknown[] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Render the four Build-27 feature sets (R1 astro extras, R2 face-trait bands,
 * R3 palm-trait bands, R4 name trio) as a self-contained markdown block ready to
 * splice into a synthesis prompt. Returns '' when the profile carries none of
 * them (e.g. a sunSign-only pre-backfill user) so the caller can splice the
 * result unconditionally without producing a dangling header.
 */
export function buildFeatureContext(profile: FeatureContextInput): string {
  const sections: string[] = [];

  // R1 — real Swiss Ephemeris chart + transit data (moon/rising are single
  // values; aspects/transits are pre-formatted human-readable summary lines).
  const astro: string[] = [];
  if (profile.moonSign) astro.push(`- **Moon Sign:** ${profile.moonSign}`);
  // risingSign is `string | null` (null when birth time/location is unknown).
  if (profile.risingSign) astro.push(`- **Rising Sign:** ${profile.risingSign}`);
  if (hasItems(profile.activeAspects)) {
    astro.push(`- **Active Natal Aspects:** ${profile.activeAspects.join('; ')}`);
  }
  if (hasItems(profile.keyTransits)) {
    astro.push(`- **Today's Key Transits:** ${profile.keyTransits.join('; ')}`);
  }
  if (astro.length) {
    sections.push(`**Astrology (computed natal chart + live transits):**\n${astro.join('\n')}`);
  }

  // R2 — compact stable face-trait band set ("<trait>: <band>").
  if (hasItems(profile.faceTraits)) {
    sections.push(`**Face Trait Bands:** ${profile.faceTraits.join(', ')}`);
  }

  // R3 — compact stable palm-trait band set ("<trait>: <band>").
  if (hasItems(profile.palmTraits)) {
    sections.push(`**Palm Trait Bands:** ${profile.palmTraits.join(', ')}`);
  }

  // R4 — the name-based numerology trio (alongside the lifePath/personal-year
  // the base profile already carries). Numbers, so guard on `!== undefined`.
  const trio: string[] = [];
  if (profile.expressionNumber !== undefined) trio.push(`Expression ${profile.expressionNumber}`);
  if (profile.soulUrgeNumber !== undefined) trio.push(`Soul Urge ${profile.soulUrgeNumber}`);
  if (profile.personalityNumber !== undefined) {
    trio.push(`Personality ${profile.personalityNumber}`);
  }
  if (trio.length) {
    sections.push(`**Name Numerology (Pythagorean name trio):** ${trio.join(', ')}`);
  }

  if (!sections.length) return '';

  return `
## DEEPER PROFILE SIGNALS

Computed from ${profile.name}'s birth chart, face, palm, and name. Only the signals available for this user are listed below, weave the relevant ones into the reading; do not fabricate or reference any that are absent.

${sections.join('\n\n')}
`;
}
