/**
 * Deterministic punctuation clean-up for MODEL-GENERATED PROSE ONLY.
 *
 * ── WHY A POST-PROCESS AND NOT JUST AN INSTRUCTION ────────────────────────────
 * A prompt rule leaks. Models drop negative formatting constraints deep into long
 * generations, and R9's report runs 10K+ output tokens. The prompt rule
 * (`PROSE_STYLE_RULES`) reduces the rate; THIS is the control.
 *
 * ── 🔴 SCOPE. READ BEFORE ADDING A CALL SITE ─────────────────────────────────
 * This function may only ever be applied to TEXT A MODEL JUST PRODUCED. It must
 * never be applied to authored strings, and in particular never to:
 *   • R7's crisis / unsafe / off-topic strings. They are transcribed verbatim from
 *     a PM-and-owner-approved guide, model generation of crisis content is
 *     PROHIBITED, and silently rewriting one is the worst failure this module
 *     could have. They are structurally out of reach: a decline route returns the
 *     constant WITHOUT making a model call, so no decline text ever reaches a
 *     model result. That is the protection. It is NOT this module's exclusion
 *     list, because there is no exclusion list.
 *   • the mobile client's section manifest and its "what is inside" bullets. Those
 *     live in the mobile bundle and this module is server-only.
 *   • any string the copy-lock register owns.
 *
 * ── WHAT IT DOES, AND THE TWO THINGS IT DELIBERATELY DOES NOT ────────────────
 *   1. a numeric range written with an em-dash becomes an EN-dash range, which is
 *      the form the range convention already endorses. "Aug 4" to "6" stays a
 *      range instead of becoming a two-item list.
 *   2. every other em-dash, spaced or unspaced, becomes a comma plus one space.
 *   3. the artefacts that creates are then collapsed: doubled commas, a comma
 *      before sentence-ending punctuation, and a comma stranded at the start or
 *      end of a line.
 *
 * 🔴 IT DOES NOT TOUCH THE EN-DASH. "2026" to "2027" and "Aug 4" to "6" are
 * CORRECT with an en-dash and stripping them would be a regression.
 *
 * 🔴 IT DOES NOT SUBSTITUTE A HYPHEN. A spaced hyphen reads worse than the comma
 * AND is itself the same tell, so trading one for the other buys nothing. For the
 * same reason it does NOT hunt for spaced hyphens in the input: that rule has real
 * false positives (a leading list marker, a score, a range) and is not asked for.
 *
 * ── IDEMPOTENT BY CONSTRUCTION ───────────────────────────────────────────────
 * After one pass no em-dash remains, so pass two matches nothing; the collapse
 * rules only ever remove commas this module itself introduced. `sanitise(sanitise(x))
 * === sanitise(x)` for every input, and the harness asserts it on real stored prose.
 */
import { logger } from '../utils/logger';

/**
 * 🔴 CODE-DEFAULT **ON**, AND THAT IS THE OPPOSITE OF ITS TWO SIBLINGS.
 * `SYNTHESIS_FABLE_ENABLED` and `REPORT_WORKER_ENABLED` are `=== 'true'`, i.e.
 * default OFF. This one is `!== 'false'`, i.e. default ON, because it is additive
 * and idempotent and the desired steady state is on. Set the variable to the exact
 * string `false` to disable it without a code change — anything else, including
 * unset, leaves it ON.
 *
 * Env var: **`PROSE_SANITIZER_ENABLED`**.
 */
export const PROSE_SANITIZER_ENABLED =
  (process.env.PROSE_SANITIZER_ENABLED || '').trim().toLowerCase() !== 'false';

const EM_DASH = '—';
const EN_DASH = '–';

/** A numeric range written with an em-dash, either spacing. Horizontal space only,
 *  so a line break is never swallowed. */
const NUMERIC_RANGE = /(\d)[^\S\n]*—[^\S\n]*(\d)/g;

/** Every remaining em-dash plus the horizontal space hugging it. */
const ANY_EM_DASH = /[^\S\n]*—[^\S\n]*/g;

/** Two or more commas in a row, with optional space between. */
const DOUBLED_COMMA = /,(?:[^\S\n]*,)+/g;

/** A comma immediately before sentence-ending or clause punctuation. */
const COMMA_BEFORE_PUNCT = /,[^\S\n]*([.!?;:])/g;

/** A comma stranded at the start of a line. */
const LEADING_COMMA = /^[^\S\n]*,[^\S\n]*/gm;

/** A comma stranded at the end of a line. */
const TRAILING_COMMA = /,[^\S\n]*$/gm;

export interface SanitiseResult {
  text: string;
  /** How many em-dashes were consumed. 0 means the generation was already clean —
   *  which is the number that tells us whether the prompt rule is working. */
  removed: number;
  /** Of those, how many were numeric ranges converted to an en-dash rather than a
   *  comma. Broken out because it is a different edit with a different risk. */
  ranges: number;
}

/**
 * Clean model-generated prose. Returns the text plus what was removed, so a caller
 * can log the count. Never throws: on any unexpected input it returns the input
 * unchanged, because a punctuation tidy must never be able to fail a reading a user
 * has already waited for.
 */
export function sanitiseModelProse(input: string): SanitiseResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { text: input, removed: 0, ranges: 0 };
  }
  if (!PROSE_SANITIZER_ENABLED) {
    return { text: input, removed: 0, ranges: 0 };
  }
  try {
    const before = countEmDashes(input);
    if (before === 0) return { text: input, removed: 0, ranges: 0 };

    let out = input;

    const rangeMatches = out.match(NUMERIC_RANGE);
    const ranges = rangeMatches ? rangeMatches.length : 0;
    out = out.replace(NUMERIC_RANGE, `$1${EN_DASH}$2`);

    out = out.replace(ANY_EM_DASH, ', ');

    out = out.replace(DOUBLED_COMMA, ',');
    out = out.replace(COMMA_BEFORE_PUNCT, '$1');
    out = out.replace(LEADING_COMMA, '');
    out = out.replace(TRAILING_COMMA, '');

    return { text: out, removed: before, ranges };
  } catch (err) {
    logger.warn('prose_sanitise_failed_passthrough', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { text: input, removed: 0, ranges: 0 };
  }
}

/**
 * ── THE READ BOUNDARY (`P91` option (a), owner-ruled 2026-08-06) ─────────────
 *
 * 🔴 THE GENERATION-TIME CLEAN-UP ONLY EVER TOUCHES NEW OUTPUT, AND FOUR OF THIS
 * APP'S READING SURFACES NEVER EXPIRE. Measured: ~470 permanent documents across
 * ~276 accounts — face 180 of 276, palm 167, name-destiny 13 of 14, career 20 of
 * 26, compatibility 81 of 86, plus 376 of 431 rows in the legacy collection.
 * Under natural expiry those users see the old punctuation FOREVER, and a face
 * reading is the first thing on the readings hub.
 *
 * 🟢 So the same function runs again on the way OUT. No migration, no write to
 * production reading content, and it covers HISTORY — an old compatibility a user
 * reopens is clean. `P91` weighs this against a backfill; the deciding facts are
 * that this costs about what the backfill's DRY RUN costs and that the one
 * weakness (the stored bytes stay dirty) has no live consumer: R9's PDF rebuild
 * reads `reports.interpretation`, measured 0 of 4 dirty.
 *
 * ── 🔴 WHY IT SANITISES THE **WIRE FORM** AND NOT THE OBJECT ─────────────────
 *
 * The payload handed to `res.json()` is a mix of Mongoose documents, lean objects,
 * `Date`s and plain literals. Walking THAT means walking Mongoose internals and
 * risking a `Date` rebuilt as a plain object. So the payload is first serialised
 * EXACTLY AS EXPRESS WOULD serialise it — `JSON.parse(JSON.stringify(x))`, which
 * runs the same `toJSON()` hooks — and the walk runs over the result.
 * **The thing being sanitised is the bytes the client was going to receive**, so
 * the output differs from the un-sanitised response in the em-dashes and in
 * nothing else, by construction rather than by care.
 *
 * ── 🔴 WHY THERE IS STILL NO EXCLUSION LIST, AND WHAT REPLACES ONE ───────────
 *
 * A read path touches more surfaces than a write path, so the scope note at the
 * top of this file matters MORE here, not less. It is upheld by three structural
 * facts and one asserted one — never by a list of keys:
 *   1. `sanitiseModelProse` RETURNS ITS INPUT UNCHANGED when the string carries no
 *      em-dash. So the walk can only ever alter a string that contains one.
 *   2. R7's crisis / unsafe / off-topic strings are not reachable: the QA routes
 *      are NOT installed on, and a decline route returns its constant without a
 *      model call in the first place.
 *   3. the mobile section manifest and every copy-locked string in design §6 live
 *      in the mobile bundle; this module is server-only.
 *   4. the SERVER-authored substance that DOES ride these DTOs — the physiognomy
 *      and chiromancy rules tables that `reconcileFaceSubstance` /
 *      `reconcilePalmSubstance` pin, the palm-type display names, the numerology
 *      tables — is asserted to carry ZERO em-dashes by `npm run check:prose`.
 *      Combined with (1) that is a proof the walk cannot touch them, and it is
 *      strictly stronger than an allow-list because it needs no maintenance when
 *      a field is added.
 * ⚠️ IF AN AUTHORED STRING EVER GAINS AN EM-DASH, the check fails — loudly, in
 *    CI-less terms: `npm run check:prose` goes red — rather than that string being
 *    silently rewritten on every read.
 */
export interface DeepSanitiseResult<T> {
  value: T;
  /** Em-dashes consumed across the whole payload. */
  removed: number;
  /** String leaves visited. Printed by the harness so a zero is visibly a zero. */
  strings: number;
}

export function sanitiseReadPayload<T>(payload: T): DeepSanitiseResult<T> {
  if (!PROSE_SANITIZER_ENABLED) return { value: payload, removed: 0, strings: 0 };
  try {
    const wire = JSON.parse(JSON.stringify(payload));
    let removed = 0;
    let strings = 0;
    const walk = (v: any): any => {
      if (typeof v === 'string') {
        strings++;
        const r = sanitiseModelProse(v);
        removed += r.removed;
        return r.text;
      }
      if (Array.isArray(v)) return v.map(walk);
      if (v !== null && typeof v === 'object') {
        const out: Record<string, any> = {};
        for (const k of Object.keys(v)) out[k] = walk(v[k]);
        return out;
      }
      return v;
    };
    return { value: walk(wire) as T, removed, strings };
  } catch (err) {
    /* A punctuation tidy must never be able to fail a reading the user already
       waited for — and this is the ONE place that can throw for a reason the
       per-string path cannot: a cyclic payload makes `JSON.stringify` throw. The
       original object is returned, so the response is exactly what it would have
       been without this module. */
    logger.warn('prose_read_sanitise_failed_passthrough', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { value: payload, removed: 0, strings: 0 };
  }
}

/** Count em-dashes. Exported so a harness can assert a result carries none. */
export function countEmDashes(s: string): number {
  if (typeof s !== 'string') return 0;
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === EM_DASH) n++;
  return n;
}
