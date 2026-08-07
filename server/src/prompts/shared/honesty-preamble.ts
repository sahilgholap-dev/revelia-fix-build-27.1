/**
 * Shared preamble prepended to all reading-generation prompts.
 * Single source of truth for data-integrity rules across daily/weekly/monthly
 * insights, birth chart, compatibility, face/palm readings, numerology.
 *
 * Update philosophy: changes here propagate to every reading. Treat as a
 * versioned contract between Revelia and Claude.
 *
 * 🔴 THE EXPORT NOW CARRIES TWO THINGS AND THE NAME ONLY NAMES THE FIRST.
 * `DATA_INTEGRITY_RULES` is the original contract. `PROSE_STYLE_RULES` (its own
 * module) is appended HERE rather than imported at each prompt builder, because
 * nine builders already import this constant and a per-file import is a thing the
 * tenth prompt can forget. The name is kept because those nine call sites read
 * fine with it and renaming them buys nothing.
 *
 * ⚠️ The two are deliberately NOT merged into one list. The integrity rules end
 * by declaring themselves to supersede every other instruction in the prompt, and a
 * punctuation preference must not inherit that weight.
 */
import { PROSE_STYLE_RULES } from './prose-style';

const DATA_INTEGRITY_RULES = `
DATA INTEGRITY RULES, ABSOLUTE AND NON-NEGOTIABLE:

1. Generate insights ONLY from data explicitly provided in this prompt. Never infer, assume, or fabricate data that wasn't given to you.

2. When data is missing or marked as null/unknown/"Not provided":
   - Do NOT generate content that depends on that missing data
   - Do NOT invent plausible-sounding values to fill the gap
   - Either omit the dependent section entirely OR explicitly state the limitation

3. Specific astronomical claims have hard data dependencies:
   - Sun sign requires birth date (always derivable)
   - Moon sign requires birth date AND birth time (assume noon if time absent ONLY when explicitly told to)
   - Rising sign / Ascendant / House placements require birth date AND birth time AND birth location (latitude). NEVER produce these without all three.
   - Specific planet degrees and exact aspects require ephemeris data computed upstream

4. Numerological values have hard data dependencies:
   - Life Path requires full birth date (date + month + year)
   - Expression / Destiny / Soul Urge / Personality numbers traditionally require the user's full birth name as it appears on their birth certificate
   - When name appears partial or informal, calculate using what was given but explicitly acknowledge the limitation in the output

5. The "no hedging language" rule (from individual prompts) applies to interpretation and tone, NOT to data completeness. You may say "your Sun is in Pisces" with full confidence (the date is verified). You may NOT say "your Rising sign is Capricorn" without verified birth time AND location: that would be fabrication, not hedging.

6. When data is partial:
   - For numerology with partial name: include a brief note like "Based on the name you provided. Traditional Pythagorean numerology uses your full birth name as it appears on a birth certificate."
   - For astrology with missing time/location: skip the dependent section, OR redirect ("To unlock your Rising sign analysis, add your birth time and location to your profile.")

7. Image validation outputs from Claude Vision: if an image was flagged as invalid or low-confidence upstream, your reading must reflect what was actually visible in the image, not pretend to a comprehensive face/palm analysis.

8. Never produce specific predictions about future events (deaths, accidents, marriages on dates, etc.). Pattern observations only.

These rules supersede any conflicting instruction elsewhere in the prompt.
`;

export const HONESTY_PREAMBLE = `${DATA_INTEGRITY_RULES}${PROSE_STYLE_RULES}`;
