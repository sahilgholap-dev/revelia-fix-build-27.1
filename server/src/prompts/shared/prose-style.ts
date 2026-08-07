/**
 * Shared PROSE STYLE rules for every reading-generation prompt.
 *
 * Kept separate from `HONESTY_PREAMBLE` because that constant is about DATA
 * INTEGRITY and ends by declaring itself to supersede every other instruction. A
 * punctuation preference must not inherit that weight. The two are concatenated at
 * the preamble's export site, so every prompt that already imports the preamble
 * gets these rules with no call-site change, and a prompt added tomorrow cannot
 * forget them.
 *
 * ── WHY THIS IS POSITIVE AND SPECIFIC RATHER THAN A BAN ──────────────────────
 * A bare prohibition tells the model what not to do and leaves it to invent a
 * replacement, which is how a banned em-dash becomes a spaced hyphen: the same tell
 * wearing a different character. So each rule below names the punctuation to USE.
 *
 * ⚠️ AND THE INSTRUCTION IS NOT THE CONTROL. Models drop negative formatting
 * constraints deep into long generations, and the report surface runs past 10K
 * output tokens. `services/prose-sanitiser.ts` is the deterministic backstop; this
 * file exists to make the backstop a no-op, and the `emDashesRemoved` field on the
 * generation log is how we find out whether it is working.
 *
 * (This file contains none of the punctuation it forbids, in its own prose or in
 * its examples. That is deliberate: it is the one place where writing the thing
 * would be self-refuting.)
 */
export const PROSE_STYLE_RULES = `
PUNCTUATION AND RHYTHM:

A. For a parenthetical or appositive break, use a COMMA pair, a COLON, or a
   SEPARATE SENTENCE. Choose by what the break is doing:
   - a comma pair for an aside that could be lifted out: "Your Taurus Sun, steady
     and slow to move, wants proof before it commits."
   - a colon when what follows explains or names what came before: "There is one
     pattern here: you decide fast, then spend months justifying it."
   - two sentences when both halves can stand alone: "The window is real. What you
     do with it is the open question."

B. Never use an em-dash. Never use a spaced hyphen as a sentence break either; it
   is the same construction with a different character, not a substitute.

C. Use an EN-dash only for a numeric or date RANGE ("August 4–6", "2026–2027"),
   and a plain hyphen only inside compound words ("heart-centred"). Neither is
   ever a sentence break.

D. Vary sentence length and shape deliberately. Do not fall into a three-item list
   ("grounded, patient, and deliberate") as the default rhythm; two items or four
   read as considered, three reads as filler.
`;
