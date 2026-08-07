#!/usr/bin/env node
/**
 * invariant-register-check.js — THE 22ND NAMED RULE. `UI-audit.md` §5's REGISTER, MADE MECHANICAL.
 *
 * ── 🔴 WHY IT EXISTS, AND THE EVIDENCE IS ONE INVARIANT DEEP ─────────────────────────────────
 *
 * `X17` WAS BROKEN ON HEAD, AND EVERY PROTECTION THE PROJECT HAD FOR IT WAS ALREADY IN PLACE:
 *
 *   · the register documented it, in a row that names the exact property;
 *   · that row PREDICTED the exact deletion, and rated the risk "very likely";
 *   · `primitives-plan` §2.2 restated it a third time, per component.
 *
 * Six of the seven clipping overrides on the readings hub were then deleted during this very
 * phase, and it was found BY ACCIDENT while measuring something else. 🔴 SO: A DOCUMENTED
 * INVARIANT PLUS AN ACCURATE PREDICTION OF ITS VIOLATION STILL PRODUCED THE VIOLATION. And
 * because `codemod-plan` §5.4 closed iOS verification permanently, the consequence — a cropped
 * glyph on iOS production — could never have been caught on a device either.
 *
 * 🔴 THE CONCLUSION, AND IT IS THE WHOLE REASON FOR THIS FILE: **THE REGISTER IS NOT A CONTROL.**
 *    A paragraph that says "preserve this" is a prediction. A number that fails is a control.
 *    `O-97` named it; this file is the discharge.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────
 *
 *   0. ROLL CALL      every row of the register is CLAIMED by a named instrument, or is on the
 *                     RESIDUAL list with a stated reason. A row claimed by nothing FAILS. That
 *                     assertion is the one that could not have existed before X17 broke.
 *   1. COUNTS         per-file, per-pattern, EXACT, read from CODE ONLY
 *   2. ELSEWHERE      a pattern that must be 0 everywhere outside its named home(s)
 *   3. WIDE           an EXACT total across the wide roots — a boundary, in one number
 *   4. ABSENT FILES   a retired module must stay deleted
 *   5. PROOF          a row asserted by ANOTHER script: verify that assertion still EXISTS there
 *   6. ACCOUNTING     code + comments == raw, per pattern — the partition is TOTAL. It BLOCKS.
 *   7. WALKER         `O-91` — the comment walker against a known-answer fixture. It BLOCKS.
 *
 * ⚠️ 6 AND 7 ARE TWO DIFFERENT ASSERTIONS AND THE FIRST DRAFT CONFLATED THEM. A defect injection
 *    settled it: re-introducing the original `O-91` bug into the walker left assertion 6 GREEN,
 *    because the two projections are complements of each other even when both are wrong about
 *    where a comment starts. 6 proves the partition is TOTAL; only 7 proves it is in the RIGHT
 *    PLACES. A number that cannot be falsified is the exact shape this project keeps finding.
 *
 * ── 🔴 FOUR PROPERTIES, EACH ONE PAID FOR BY A PRIOR FINDING ────────────────────────────────
 *
 * 1. 🔴 **PER-FILE CENSUSES, NEVER ONE TOTAL** (`O-97`). A tree-wide count of a clipping override
 *    is 9; a fall in one file cancelled by a rise in another never moves it. Every `counts` entry
 *    names its file. The only totals here are `wide` entries, where the whole POINT is the total
 *    (a boundary — "the tree holds exactly one of these, in this file").
 *
 * 2. 🔴 **EXACT IN BOTH DIRECTIONS, NEVER A FLOOR AND NEVER `nonzero`** (`O-67`). Six of seven
 *    passes a floor. Six of seven was the defect. A RISE fails too: an eighth guard is a surface
 *    nobody recorded, and it is how a transient exception becomes permanent.
 *
 * 3. 🔴 **CODE ONLY, AND IT IS LOAD-BEARING HERE MORE THAN ANYWHERE** (`O-54` / `O-68` dir. 2).
 *    Measured while writing this file: `X19`'s two literals read **1 in code and 2 in raw** —
 *    the paywall's own header paragraph spells `zIndex` and the elevation value while explaining
 *    why they must not be removed. A text-level presence check on X19 would have been satisfied
 *    BY THAT PARAGRAPH, FOREVER, with the code deleted. The same shape holds in
 *    `ScreenContainer`, where the scroll floor reads 1 in code and 3 in raw.
 *    ⚠️ COROLLARY, from `CLAUDE.md`: a presence assertion can never assert an in-file MARKER,
 *    because a marker IS a comment. So `X11`'s derived-radius marker is NOT asserted; the
 *    expression it annotates is, which is the half that renders.
 *
 * 4. 🔴 **WHAT A GREEN LINE HERE MEANS, STATED SO NOBODY INHERITS MORE THAN IT SAYS**
 *    (`primitives-plan` §2.4): it proves the guard SURVIVED THE DIFF. It does not prove the guard
 *    WORKS and it never could — what these guards prevent is an iOS-PRODUCTION layout collapse,
 *    and iOS verification is closed. **This is a diff alarm, not verification.** An Android build,
 *    an emulator, a screenshot and a green gate are all NOT evidence about any row below.
 *
 * Usage, from mobile/:   node scripts/invariant-register-check.js [--verbose]
 */
const fs = require('fs');
const path = require('path');
const { stripComments, commentsOnly, walkerSelfTest } = require('./lib/source-scan');

const VERBOSE = process.argv.includes('--verbose');

// 🔴 THE WIDE ROOTS, NOT THE NARROW TWO — `codemod-plan` §3.0.2 class 8 (SEARCH-ROOT completeness).
//    Four of the rows below live entirely outside `app/` and `components/`: the review primitive is
//    in `lib/`, its store is in `store/`, and the share chain is in `utils/`. A checker scoped to
//    the two content roots would report those three rows as clean by never looking at them, which
//    is the one blindness class no pattern widening can reach.
const WIDE_ROOTS = ['app', 'components', 'lib', 'store', 'hooks', 'utils', 'services', 'types'];

function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p.replace(/\\/g, '/'));
  }
  return acc;
}
const FILES = WIDE_ROOTS.reduce((a, r) => (fs.existsSync(r) ? walk(r, a) : a), []);
const RAW = new Map(FILES.map(f => [f, fs.readFileSync(f, 'utf8')]));
const CODE = new Map(FILES.map(f => [f, stripComments(RAW.get(f))]));
const NOTE = new Map(FILES.map(f => [f, commentsOnly(RAW.get(f))]));

const count = (s, re) => (s.match(new RegExp(re.source, 'g')) || []).length;

// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE REGISTER. `UI-audit.md` §5.1, one entry per row, X1 through X20, in order.
//
//  🔴 EVERY ROW MUST BE CLAIMED. An entry with no assertion and no `residual` FAILS assertion 0.
//     That is the structural fix for X17: the hole was not a wrong number, it was NO number, and
//     nothing in the tree could see the difference between "asserted" and "written down".
//
//  Fields — an entry uses whichever apply, and at least one:
//    counts       [file, /re/, n, why]     EXACT count in that file, CODE ONLY
//    elsewhere    [/re/, [homes], why]     must be 0 in every wide file that is not a home
//    wide         [/re/, n, why]           EXACT total across every wide file, CODE ONLY
//    absentFiles  [path, why]              the module stays deleted
//    proof        [script, 'substr', n, why]  the assertion lives in ANOTHER script — n exact
//    residual     'why this row, or this part of it, cannot be asserted mechanically'
// ══════════════════════════════════════════════════════════════════════════════════════════
const SC = 'components/ui/ScreenContainer.tsx';
const WELCOME = 'app/(auth)/welcome.tsx';
const ADOPT = 'scripts/primitive-adoption-check.js';

const REGISTER = [
  // ═══ X1 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X1',
    subject: "ScreenContainer's pinned structure — 25 of 32 screens inherit it",
    counts: [
      // 🔴 TWO RETURN BRANCHES, AND THE PAIR IS THE ASSERTION. The gradient branch and the plain
      //    one are two copies of one decision — the shape five of this phase's findings had — so
      //    a fall to 1 is one branch quietly losing its pinning while the other keeps a presence
      //    check green. That is `O-67` on the highest-reach component in the app.
      [SC, /top: 0,/, 2,
        'the two pinned return branches. A FALL to 1 is one branch flattened; on Android that ' +
        'renders identically and on iOS production that screen collapses to the top inset.'],
      [SC, /width: SCREEN_WIDTH/, 3,
        'the window destructuring plus BOTH pinned boxes. 1 + 2, and the composition is stated ' +
        'because a bare 3 is not readable six months from now.'],
      [SC, /height: SCREEN_HEIGHT/, 3, 'the same three sites, the other axis.'],
      [SC, /position: 'absolute'/, 3,
        'the two pinned boxes plus the ridge layer, which is pinned and inert by design. A FALL ' +
        'is either a branch unpinned or the ridge mount lost; both are findings.'],
      [SC, /minHeight: SCREEN_HEIGHT \}/, 1,
        "the safe area's floor — anchor 3 of X1's four. Spelled with its closing brace so it " +
        'cannot be satisfied by the scroll floor below, which is a different anchor.'],
      [SC, /flexGrow: 1/, 1, "the scroll content container's grow — anchor 4, first half."],
      [SC, /minHeight: SCREEN_HEIGHT - 100/, 1,
        'anchor 4, second half. 🔴 READS 1 IN CODE AND 3 IN RAW — the header paragraph names it ' +
        'twice. A text-level check here is satisfied by its own documentation.'],
      [SC, /flex: 1, width: '100%'/, 3,
        'the scroll view, the keyboard-avoiding view and the safe area. All three propagate the ' +
        "pinned box downward, which is the whole mechanism iOS production does not do for free."],
      [SC, /Dimensions\.get\('window'\)/, 1, 'the one measurement the whole structure is pinned to.'],
    ],
    residual:
      'X1 also says the OUTERMOST element is the pinned one. A count proves the declarations are ' +
      'present; it cannot prove they sit on the outermost element rather than an inner one. ' +
      'Nesting is a position, and a census cannot see position.',
  },

  // ═══ X2 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X2',
    subject: 'welcome.tsx hand-rolls the same fix and must NOT be unified onto the primitive',
    counts: [
      [WELCOME, /Dimensions\.get\('window'\)/, 1, 'its own window read — it shares nothing with the primitive.'],
      [WELCOME, /width: SCREEN_WIDTH/, 2, 'the destructuring plus its ONE pinned box.'],
      [WELCOME, /height: SCREEN_HEIGHT/, 2, 'the same two sites, the other axis.'],
      [WELCOME, /position: 'absolute'/, 1, 'exactly one pinned box — this screen has a single return.'],
      [WELCOME, /minHeight: SCREEN_HEIGHT \}/, 1, "the safe area's floor, hand-rolled."],
      [WELCOME, /minHeight: SCREEN_HEIGHT - 100/, 1, 'the scroll floor, hand-rolled.'],
      [WELCOME, /flexGrow: 1/, 1, 'the grow, hand-rolled.'],
    ],
    proof: [[ADOPT, 'X2 — welcome.tsx hand-rolls the pinned structure', 1,
      "the OTHER half of X2 — that this screen must never ADOPT the primitive — is a `forbidden` " +
      'entry on the ScreenContainer contract. This proof asserts that entry still exists, so ' +
      'deleting it there fails here. The two halves pull in opposite directions and both are needed.']],
  },

  // ═══ X3 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X3',
    subject: "Button's explicit heights 48/56/64 and the gradient's 100%/100%",
    proof: [
      [ADOPT, "\\bsm:\\s*48\\b", 1, 'the sm height, asserted as a Button contract literal.'],
      [ADOPT, "\\bmd:\\s*56\\b", 1, 'the md height.'],
      [ADOPT, "\\blg:\\s*64\\b", 1, 'the lg height.'],
      [ADOPT, "width:\\s*'100%'", 1, "the gradient's width — X3's second half."],
      [ADOPT, "height:\\s*'100%'", 1, "the gradient's height. Never padding-only sizing."],
    ],
  },

  // ═══ X4 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X4',
    subject: 'recordMeaningfulAction is the ONLY review entry point; the native prompt has one caller',
    counts: [
      ['lib/inAppReview.ts', /StoreReview\./, 2, 'the availability probe and the request. Nothing else may reach the native API.'],
      ['lib/inAppReview.ts', /hasPromptedThisSession/, 3, 'the once-per-session latch: declared, read, set.'],
      ['store/reviewStore.ts', /attemptReview\(/, 1,
        'the ONE caller of the attempt primitive, and the ladder lives beside it. A second caller ' +
        'is a second ladder, which is the lost-update race this refactor deleted.'],
    ],
    elsewhere: [
      [/\bStoreReview\b/, ['lib/inAppReview.ts'],
        'a direct native review call from anywhere else. It bypasses the Android platform gate, ' +
        'the session latch and the whole prompt ladder at once.'],
      [/\bexpo-store-review\b/, ['lib/inAppReview.ts'], 'the import, which is the same boundary one level up.'],
      // ⚠️ THE BARE NAME, NOT THE CALL FORM, AND A DEFECT INJECTION IS WHY. Written first as
      //    `attemptReview\s*\(` it required a PAREN, so a screen that merely IMPORTED the primitive
      //    passed — and an import is the whole of the edit that precedes a second call site. The
      //    two homes make the widening free: there is no legitimate third mention of any kind.
      [/\battemptReview\b/, ['lib/inAppReview.ts', 'store/reviewStore.ts'],
        'the attempt primitive is reached by the store and by nothing else — not even imported.'],
      [/completedReadingsCount|incrementCompletedReadings/, [],
        "the retired counter on readingsStore. It was one of the two sources of the duplicate " +
        'counting this refactor removed, and a reintroduction reads as a helpful addition.'],
    ],
    absentFiles: [
      ['store/reviewKeys.ts', 'retired by the refactor — its keys are now derived at the one entry point.'],
      ['hooks/useAppReview.ts', 'retired — per-screen review logic is exactly what X4 forbids.'],
    ],
    residual:
      "X4's prohibition on per-screen counters, fire-once refs and \"counted\" flags is OPEN-ENDED: " +
      'a new one can be spelled anything. The four NAMED artefacts are asserted above and the ' +
      'native boundary is closed, so a reintroduction has to invent a new spelling AND route ' +
      'around the one entry point. That is narrowed, not closed.',
  },

  // ═══ X5 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X5',
    subject: 'initReviewStore() is called exactly once, in the root layout',
    counts: [
      ['app/_layout.tsx', /initReviewStore\(/, 1,
        'the single rehydration call. Without it the count resets every cold start and the ' +
        'ladder never advances — a defect with no visible symptom whatsoever.'],
      ['store/reviewStore.ts', /initReviewStore\(/, 2,
        'its own declaration plus the idempotent self-call on an early record. Both belong to ' +
        'the module; neither is a second mount point.'],
    ],
    elsewhere: [
      [/\binitReviewStore\s*\(/, ['app/_layout.tsx', 'store/reviewStore.ts'],
        'a second init from a screen. It is idempotent so nothing breaks visibly, which is ' +
        'precisely why it would survive review.'],
    ],
  },

  // ═══ X6 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X6',
    subject: 'the share returns a BOOLEAN, callers capture it, and failOnCancel stays false',
    counts: [
      ['utils/shareReading.ts', /failOnCancel: false/, 1,
        'the Android cancel-cascade fix. Without it a dismissal REJECTS, the catch-driven ' +
        'fallback chain runs, and the user gets a second and third share sheet.'],
      ['utils/shareReading.ts', /Promise<boolean>/, 1, 'the boolean return — the other half of the same fix.'],
      ['utils/shareReading.ts', /export function isShareDismissal/, 1,
        'ONE exported dismissal test. Every per-file redefinition drifts from it.'],
    ],
    wide: [
      [/\bshareReadingCard\s*\(/, 4,
        'the declaration plus THREE call sites. This is the denominator of the gating assertion ' +
        'below and it is stated separately so the pair can be compared.'],
      [/=\s*await\s+shareReadingCard\s*\(/, 3,
        '🔴 ALL THREE CALL SITES CAPTURE THE RETURN, and the two numbers are 4 = 1 + 3. A call ' +
        'site that drops the assignment leaves the first count at 4 and moves this one to 2, so ' +
        'the divergence is the finding. That is the closest a census gets to a data-flow property.'],
    ],
    elsewhere: [
      [/function isShareDismissal/, ['utils/shareReading.ts'],
        'a per-file copy of the dismissal test. The register says import it, never redefine it.'],
    ],
    residual:
      'That each caller GATES its meaningful-action record on the captured boolean is a data-flow ' +
      'property, not a countable one. The capture is asserted; what the caller then does with it ' +
      'is read by a human. Narrowing this further would need a real dataflow pass.',
  },

  // ═══ X7 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X7',
    subject: 'the share fallback chain stays EXACTLY one deep',
    counts: [
      ['utils/shareReading.ts', /RNShare\.open/, 1, 'link 1 — the combined image+text intent.'],
      ['utils/shareReading.ts', /Sharing\.shareAsync/, 1,
        'link 2, and the LAST one. A second occurrence in this file is a third link, which is the ' +
        'cascade the fix removed.'],
      ['utils/shareReading.ts', /Share\.share\(/, 1,
        "the no-snapshot branch — a SEPARATE path, not link 3. It is counted so that a change " +
        'moving it into the chain has to move this number.'],
      ['utils/shareReading.ts', /isShareDismissal\(/, 4,
        'every arm tests for a dismissal: the two chain catches, the no-snapshot catch, and the ' +
        'declaration. A fall is an arm that treats a cancel as a failure and cascades.'],
    ],
    residual:
      'That the no-snapshot branch sits in the `else` rather than nested inside the chain\'s catch ' +
      'is a POSITION. The counts pin how many of each call exist, not where they sit — the same ' +
      "limit as X1's outermost-element clause.",
  },

  // ═══ X8 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X8',
    subject: 'the entertainment disclaimer — presence on every reading-output screen, and the STRING',
    counts: [
      // 🔴 THE STRING HALF, WHICH NOTHING ASSERTED. X8 is explicit that "presence and string are
      //    HARD; the container is SOFT", and the adoption contract only ever saw presence. A
      //    reworded compliance notice renders perfectly and passes every other rule in the tree.
      ['components/common/EntertainmentDisclaimer.tsx',
        /Revelia readings are for entertainment and self-reflection purposes only/, 1,
        'sentence 1 of the compliance string, verbatim.'],
      ['components/common/EntertainmentDisclaimer.tsx',
        /substitute for professional medical, financial/, 1, 'sentence 2, first half.'],
      ['components/common/EntertainmentDisclaimer.tsx',
        /legal, or psychological advice/, 1, 'sentence 2, second half. The four named domains are the compliance content.'],
    ],
    wide: [
      [/<EntertainmentDisclaimer/, 8,
        'the presence half, counted DIRECTLY rather than inherited from the adoption contract: ' +
        'seven audited screens plus Home, which the design added. A FALL is a reading surface ' +
        'shipping with no disclaimer, which is a compliance regression that looks like a tidier screen.'],
    ],
    proof: [[ADOPT, "name: 'EntertainmentDisclaimer'", 1,
      'the adoption contract, which additionally names WHICH files must render it. This proof ' +
      'means deleting that contract fails here rather than silently reducing coverage to a total.']],
  },

  // ═══ X9 ══════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X9',
    subject: 'the four inline disclaimer variants stay where they are — four divergent strings',
    // 🔴 DO NOT CONSOLIDATE THESE. Audit §9 Q3 asks the owner whether the divergent strings should
    //    be unified and it is UNANSWERED; consolidating a compliance string is a legal call. So the
    //    assertion is per-file and per-string, which is also what makes a silent merge fail.
    counts: [
      ['app/(main)/numerology/name-destiny.tsx', /For entertainment purposes only\. Name numerology/, 1,
        'the name-numerology variant. It carries a clause about legal name changes that no other copy has.'],
      ['app/(main)/readings/career-destiny.tsx', /For entertainment purposes only\. Career guidance/, 1,
        'the career variant. It names professional career counseling specifically.'],
      ['app/(main)/profile.tsx', /Revelia readings are for entertainment and self-reflection purposes only/, 1,
        "profile's hand-shortened rendering of the shared string."],
      ['app/(main)/readings/cosmic-report.tsx',
        /For insight and entertainment\. Not medical, legal, or financial advice\./, 2,
        'BOTH report fine-print constants hold this sentence. The count is the assertion — they ' +
        'are spelled identically, so a presence check passes with one deleted.'],
      ['app/(main)/readings/cosmic-report.tsx', /FINE_PRINT_LONG/, 2, 'the long constant: declared and rendered.'],
      ['app/(main)/readings/cosmic-report.tsx', /FINE_PRINT_SHORT/, 2, 'the short constant: declared and rendered.'],
    ],
  },

  // ═══ X10 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X10',
    subject: 'the visual styling of every surface above — colours, spacing, type, radii, layout',
    residual:
      '🟢 SOFT BY DESIGN, AND THE ONLY ROW WHERE THAT IS THE RIGHT ANSWER. X10 exists to say the ' +
      'restyle is PERMITTED. There is nothing to preserve, so there is nothing to assert, and a ' +
      'check here would block the phase it was written to enable. It is on this list so the roll ' +
      'call is dense rather than because it is a risk.',
  },

  // ═══ X11 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X11',
    subject: "StreakBadge's three heights and the radius DERIVED from them — the coupled pair",
    counts: [
      ['components/engagement/StreakBadge.tsx', /height: 28/, 1, 'the small height.'],
      ['components/engagement/StreakBadge.tsx', /height: 36/, 1, 'the medium height.'],
      ['components/engagement/StreakBadge.tsx', /height: 48/, 1, 'the large height.'],
      // 🔴 THE COUPLING IS THE INVARIANT, NOT THE TWO PROPERTIES SEPARATELY. Delete the height and
      //    the pill has nothing to halve; add a pill radius instead and Android looks perfect while
      //    an iOS collapse guard is gone. §2.3 calls this the single most likely violation in the
      //    phase, on the app's highest-traffic screen, and the reason is that it is the archetypal
      //    restyle: a padded pill with an explicit height is what anyone competent normalises.
      ['components/engagement/StreakBadge.tsx', /borderRadius: cfg\.height \/ 2/, 1,
        'the derived radius. It is asserted as the EXPRESSION, which is what renders — the marker ' +
        'beside it is a comment and a presence assertion can never assert a comment.'],
    ],
    residual:
      "§2.3's other two conditions LIVE WITH THEIR OWNERS IN `token-gate.sh` rather than here, and " +
      'ONE OF THE TWO STOPPED BEING REPORT-ONLY ON 2026-08-04 (`O-105`): the derived-radius ' +
      'exception is now asserted there as an EXACT 3, so X11 and X12\'s coupled radii do have a ' +
      'check that fails. This residual claimed for one session that they did not — which is exactly ' +
      'the stale enumeration an exact count exists to prevent, one field over. The variable-size ' +
      'count stays report-only BY RULING: promoting it would fail on correct work elsewhere in the ' +
      'tree, which is how a rule gets decommissioned by its own output.',
  },

  // ═══ X12 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X12',
    subject: "AstroNumeroBadge's three heights, its two derived radii, and the hairline divider",
    counts: [
      ['components/profile/AstroNumeroBadge.tsx', /height: 44/, 1, 'the small height.'],
      ['components/profile/AstroNumeroBadge.tsx', /height: 56/, 1, 'the medium height.'],
      ['components/profile/AstroNumeroBadge.tsx', /height: 88/, 1, 'the large height.'],
      ['components/profile/AstroNumeroBadge.tsx', /borderRadius: cfg\.numberSize \/ 2/, 2,
        'BOTH derived radii, and the count is the assertion because the two are spelled ' +
        'identically — a presence check passes with one of them replaced by a pill token.'],
      ['components/profile/AstroNumeroBadge.tsx', /width: 1, height: 32/, 1,
        'the internal divider. §10.3 ruled it RECOLOURS and KEEPS BOTH DIMENSIONS; it reads as an ' +
        'arbitrary magic number, which is exactly why it needs a number of its own.'],
    ],
  },

  // ═══ X13 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X13',
    subject: "home.tsx's four bare collapse guards — the app's highest-traffic screen",
    counts: [
      ['app/(main)/home.tsx', /height: 140/, 2,
        'the two carousel tiles. Identical spellings, so the count is the assertion.'],
      ['app/(main)/home.tsx', /minHeight: 200/, 1,
        "the key-dates card floor. 🔴 THE ONE ENTRY WITH AN OPEN OWNER DECISION: the 2.1 design " +
        'proposed removing it and the owner ruled it STAYS, pending an iOS check. If that ruling ' +
        'is ever reversed this number moves deliberately, in the commit that reverses it.'],
      ['app/(main)/home.tsx', /minHeight: 72/, 1, 'the compact row floor.'],
    ],
  },

  // ═══ X14 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X14',
    subject: "the readings hub's seven card floors",
    counts: [
      ['app/(main)/readings/index.tsx', /minHeight: 140/, 7,
        '🔴 SEVEN NEAR-IDENTICAL INLINE STYLE OBJECTS THAT LOOK EXACTLY LIKE COPY-PASTE CRUFT. ' +
        'They are the fix. This is the same file and the same seven cards whose clipping ' +
        'overrides were silently reduced to six, so it gets the same instrument.'],
    ],
  },

  // ═══ X15 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X15',
    subject: "the numerology hub's lone card floor",
    counts: [
      ['app/(main)/numerology/index.tsx', /minHeight: 140/, 1,
        'one magic number on a gradient, with no in-file explanation until this phase added one.'],
    ],
  },

  // ═══ X16 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X16',
    subject: "DailyInsightCard's inner gradient floor",
    counts: [
      ['components/insights/DailyInsightCard.tsx', /minHeight: 160/, 1,
        'the floor on the inner gradient, not on the card. The distinction matters: a collapse ' +
        'guard belongs on the flex child, and moving it to the card would look like a tidy-up.'],
    ],
  },

  // ═══ X17 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X17',
    subject: 'the nine clipping overrides and the wait screen’s four dimension literals',
    proof: [
      [ADOPT, 'X17 wells · readings hub', 1,
        'the seven-well census, split per file on purpose — a tree-wide total of this declaration ' +
        'is nine, and one total lets a fall in the hub be cancelled by a rise anywhere else.'],
      [ADOPT, 'X17 wells · the sun-sign reveal', 1, 'the other half, its own file, its own number.'],
      [ADOPT, 'minWidth: 220', 1, "the wait screen's message floor."],
      [ADOPT, 'maxWidth: 320', 1, "the progress bar's width bound."],
      [ADOPT, 'minHeight: 58', 1,
        'the message-row floor, raised from 44 in pass 2b. Without it the layout jumps on every ' +
        'message rotation, which is a visible defect on a screen held for a minute.'],
    ],
  },

  // ═══ X18 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X18',
    subject: 'the tab bar’s 85 / 24 / 8, coupled to the bottom-inset hook on five screens',
    // 🔴 EVERY PROBE HERE CARRIES ITS REGEX DELIMITERS, AND THAT IS THIS ROW'S OWN LESSON LEARNED
    //    THE HARD WAY. The first probe was the bare substring `height: 85`, which was unique in the
    //    other script for exactly as long as the bar had one assertion about its height. Adding the
    //    system-inset derivation on 2026-08-05 made it 2 and turned this row red — a cross-reference
    //    reporting a defect that did not exist, which is the ambiguity the note below already warned
    //    about, one field over. Delimited, each probe names one entry and cannot drift onto another.
    proof: [
      [ADOPT, '[/height: 85/,', 1, 'the bar height, asserted as a Tabs contract literal.'],
      [ADOPT, '[/height: 85 \\+ insets\\.bottom,/,', 1,
        'and the derivation. Two probes rather than one, because the LITERAL and the INSET TERM are ' +
        'independently deletable and the second one is what the founder\'s device report was about.'],
      [ADOPT, '[/paddingBottom: 24 \\+ insets\\.bottom,/,', 1,
        'the padding half of the same derivation. The height makes room; the padding moves the ' +
        'labels into it. Either alone is still a defect.'],
      [ADOPT, 'paddingTop: 8', 1, 'the top inset.'],
    ],
    counts: [
      // ⚠️ The safe-area allowance is asserted HERE rather than by a cross-reference, because the
      //    substring is not unique in the other script — a second component legitimately pads by
      //    the same number. A cross-reference whose substring is ambiguous is not a proof.
      ['app/(main)/_layout.tsx', /paddingBottom: 24/, 1,
        'the safe-area allowance. The visible band is 85 - 24 - 8 = 53, and changing the height ' +
        'means re-verifying the Android clipping screens that derive their padding from it.'],
      ['app/(main)/_layout.tsx', /height: 85/, 1, 'the bar height, at the site as well as in the contract.'],
      ['app/(main)/_layout.tsx', /paddingTop: 8/, 1, 'the top inset, at the site.'],
      // 🔴 THE TWO SYSTEM-EDGE TERMS — ADDED 2026-08-05, AND THEY ARE HALF OF THE INVARIANT NOW.
      //    The three literals above proved the explicit dimensions survived a diff. They cannot see
      //    the defect the founder reported from a 3-button device: under Android 16's enforced
      //    edge-to-edge the window extends behind the system navigation row, the navigator's own
      //    `+ inset` term is short-circuited by ANY numeric height in the style, and its
      //    inset-derived bottom padding is overridden by ours because ours is last in the array. So
      //    the labels rendered inside the system row. The literals were all three green throughout.
      //    A FALL here is that defect returning; the literal counts above are untouched, because a
      //    computed dimension is still an explicit one.
      ['app/(main)/_layout.tsx', /height: 85 \+ insets\.bottom,/, 1,
        'the bar grows by the real system inset. Without this the navigator never reaches its own ' +
        'inset term, because a numeric height in the style wins outright (bottom-tabs 7.16.1).'],
      ['app/(main)/_layout.tsx', /paddingBottom: 24 \+ insets\.bottom,/, 1,
        'the labels clear the system row. This style object is the LAST element of the navigator’s ' +
        'style array, so a bare 24 here silently replaces the inset-derived padding one element up.'],
    ],
  },

  // ═══ X19 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X19',
    subject: "the paywall close button's zIndex + elevation PAIR — the only exit from a modal",
    counts: [
      // 🔴 THIS ROW IS WHY `counts` READS CODE ONLY. Both literals below read 1 in code and 2 in
      //    RAW: the paragraph directly above them explains why they must not be removed, and in
      //    doing so spells both. A text-level presence check on X19 would have been satisfied by
      //    that paragraph forever, with the code deleted — `O-68` direction 2, on the app's
      //    highest-revenue surface, where the failure is that the modal cannot be closed.
      ['app/(paywall)/index.tsx', /zIndex: 50/, 1, 'half one of the pair. Alone it is not reliable on Android.'],
      ['app/(paywall)/index.tsx', /elevation: 10/, 1,
        'half two. It is a STACKING fix, not depth — and it reads as dead code to a cleanup pass ' +
        'because its shadow is invisible on a near-identical background.'],
      ['app/(paywall)/index.tsx', /position: 'absolute'/, 1,
        'the control floats OUTSIDE the scroll view. Moving it inside is the other way to make ' +
        'the only exit unreachable.'],
    ],
    wide: [
      [/\belevation:/, 1,
        '🔴 THE ONLY ELEVATION IN THE CODEBASE, ASSERTED IN BOTH DIRECTIONS AT ONCE, WHICH IS ' +
        'WHAT MAKES THIS ONE NUMBER WORTH MORE THAN THE PAIR ABOVE. A FALL is X19 deleted by a ' +
        'zero-elevation cleanup. A RISE is the design’s zero-elevation rule broken by a new ' +
        'shadow. Two different regressions, opposite directions, one count.'],
      [/\bzIndex:/, 3,
        'the three floating controls above a scroll view or a camera preview: both capture ' +
        'screens and this one. Counted so a fall here distinguishes "the pair lost its zIndex" ' +
        'from "the whole control was deleted".'],
    ],
  },

  // ═══ X20 ═════════════════════════════════════════════════════════════════════════════════
  {
    x: 'X20',
    subject: "DeleteAccountModal's two hand-rolled 56px destructive controls",
    proof: [[ADOPT, 'height: 56', 1,
      'the pair, asserted as a literal COUNT rather than a presence — the two are spelled ' +
      'identically, so a presence check stays green with one of them deleted. That is the ' +
      'defect injection that created the `literalCounts` shape in the first place.']],
  },

  // ═══ 🆕 X21 ══════════════════════════════════════════════════════════════════════════════
  //
  // 🔴 THE FIRST ROW IN THIS REGISTER THAT IS NOT ABOUT LAYOUT, AND IT IS HERE BECAUSE A PM
  //    REPORTED "this used to work" ABOUT PAID FEATURES ON AN INTERNAL ACCOUNT (2026-08-05).
  //
  // R1, the Build-27 principle, in one line: THE SERVER OWNS ENTITLEMENT AND THE CLIENT IS A
  // RENDERER. `store/subscriptionStore.ts` broke it in the one direction that is invisible —
  // `applyTierToAuthUser` wrote a RevenueCat-DERIVED tier over the server's effective tier, and a
  // complimentary grant has no RevenueCat entitlement by construction, so the derived value for a
  // comped account is a correct 'free' applied to an account the server was still serving. 15 files
  // read the field it overwrote.
  //
  // 🔴 WHY IT NEEDS A COUNT RATHER THAN THE PARAGRAPH IT ALREADY HAD: audit §5.7 is a REGISTER OF
  //    THIS EXACT CLASS — five documented client-side tier decisions — and `owner-actions.md`'s P16
  //    named this specific function, with its line numbers, TWO WEEKS BEFORE the report. It was
  //    deferred three times because confirming it needed a device. That is `O-97` verbatim: a
  //    documented invariant plus an accurate prediction of its violation still produced the
  //    violation. The three counts below are what the paragraph could not be.
  {
    x: 'X21',
    subject: 'the client never writes a tier it DERIVED — only the server may lower one (R1)',
    counts: [
      ['store/subscriptionStore.ts', /rank\(tier\) <= rank\(current\)/, 1,
        '🔴 THE GUARD. A store-derived tier may only ever UPGRADE. Deleting this line restores the ' +
        'comp-tier clobber exactly, and nothing else in the tree can see it: the app renders, every ' +
        'gate reads a legal value, and the account simply looks free.'],
      ['store/subscriptionStore.ts', /applyServerTierToAuthUser/, 2,
        'the definition plus its ONE call, from `checkSubscriptionStatus`. This is the only path ' +
        'permitted to LOWER a tier, which is what makes the guard above lossless — a cancellation ' +
        'or a lapsed grant still lands, from the server. A FALL to 1 is the downgrade path deleted, ' +
        'i.e. a user who cancels keeps their access until relaunch.'],
      ['store/subscriptionStore.ts', /subscriptionService\.getStatus\(\)/, 1,
        "the server read itself — `GET /subscription/status` returns `getEffectiveTier`, the only " +
        'value that knows about a comp grant. This function used to ask RevenueCat instead.'],
      ['store/subscriptionStore.ts', /setUser\(/, 1,
        'ONE writer, funnelled through `writeTier`. The two entry points differ only in authority, ' +
        'so a second raw write would be a second policy.'],
    ],
    elsewhere: [
      [/\bsetUser\(/, ['store/authStore.ts', 'store/subscriptionStore.ts'],
        'authStore writes SERVER-SOURCED users by construction (login / restore / getMe), and ' +
        'subscriptionStore is the one place a tier is mirrored. A third writer anywhere else is a ' +
        'third policy about who decides entitlement.'],
      [/mapCustomerInfoToTier/, ['lib/revenuecat.ts', 'store/subscriptionStore.ts'],
        '🔴 THE DERIVATION ITSELF IS CONFINED. A screen that maps CustomerInfo to a tier is a screen ' +
        'deciding entitlement, and it would be reviewed as one line of convenience. Its home is the ' +
        'wrapper that defines it plus the one store that is allowed to be optimistic with it.'],
    ],
    residual:
      "Whether RevenueCat's native SDK emits a CustomerInfo update on its INITIAL fetch is not " +
      'determinable from this repo — the JS layer is a bare NativeEventEmitter bridge. That is why ' +
      'the fix is shaped as a rank guard on the WRITE rather than as a change to the listener: it ' +
      'closes every path at once, including the two that need no listener at all (the paywall’s ' +
      'Restore button and a purchase). The unanswerable question is recorded, not relied upon.',
  },
];

// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE RUN
// ══════════════════════════════════════════════════════════════════════════════════════════
let violations = 0;
const say = s => console.log(s);
const residuals = [];

// ── 7 · THE WALKER, FIRST, BECAUSE EVERY NUMBER BELOW IS DOWNSTREAM OF IT ───────────────────
//    🔴 `O-91`. Every count in this file is read from a comment-blanked view, so if the walker is
//       wrong then so is all 58 of them — and wrong in the SILENT direction, because a comment that
//       survives into the code view SATISFIES a presence assertion. This runs before a single
//       register file is opened, and it is the only assertion here that can see a mis-placed
//       comment boundary at all (see `commentsOnly`'s header for why the accounting cannot).
{
  const bad = walkerSelfTest();
  say(`  ${'O-91 walker · known-answer fixture'.padEnd(38)} ${String(bad.length).padStart(4)} failures, expected 0` +
      (bad.length ? '   \u{1F534}' : ''));
  for (const b of bad) {
    say(`    \u{1F534} WALKER      ${b}`);
    say('                   🔴 EVERY COUNT BELOW READS A COMMENT-BLANKED VIEW OF ITS FILE, so a');
    say('                   broken walker does not make this check noisy — it makes it AGREEABLE.');
    say('                   A comment surviving into the code view satisfies a presence assertion.');
    violations++;
  }
}

// ── 0 · ROLL CALL — the assertion that could not have existed before X17 broke ──────────────
//    🔴 TWO HALVES, AND THE SECOND IS THE POINT:
//    (a) the register is DENSE: exactly X1..X20, once each, in order. The size is the contract
//        with `UI-audit.md` §5.1 — adding a row there without a decision here fails.
//    (b) EVERY ROW IS CLAIMED by at least one assertion, or carries an explicit `residual`. A row
//        that is merely written down is what X17 was, and it read identically to a checked one.
// 🔴 20 -> 21 ON 2026-08-05, AND THE BUMP IS AN EDIT TO TWO FILES BY DESIGN: `UI-audit.md` §5.1
//    carries X21's row. A number here with no row there (or the reverse) fails the roll call, which
//    is what stops "documented" and "asserted" from being the same state.
const REGISTER_SIZE = 21;
{
  const nums = REGISTER.map(e => Number(e.x.slice(1)));
  const dense = nums.length === REGISTER_SIZE && nums.every((n, i) => n === i + 1);
  say(`  ${'roll call · X1..X' + REGISTER_SIZE}`.padEnd(40) +
      `${String(nums.length).padStart(4)} rows, expected ${REGISTER_SIZE}` + (dense ? '' : '   \u{1F534}'));
  if (!dense) {
    say('    \u{1F534} THE REGISTER IS NOT DENSE. Rows must be X1..X' + REGISTER_SIZE + ', once each, in order.');
    say('       A gap means an invariant in UI-audit §5.1 has no entry here, which is the exact');
    say('       state X17 was in when it was deleted: documented, predicted, and unchecked.');
    violations++;
  }
  let claimed = 0, residualOnly = 0;
  for (const e of REGISTER) {
    const n = (e.counts || []).length + (e.elsewhere || []).length + (e.wide || []).length +
              (e.absentFiles || []).length + (e.proof || []).length;
    if (n) claimed++;
    else if (e.residual) residualOnly++;
    else {
      say(`    \u{1F534} UNCLAIMED   ${e.x} carries no assertion and no stated reason it cannot have one.`);
      say('                   Add a check, or add a `residual` saying why none is possible. Those');
      say('                   are the only two legal states — "written down" is not one of them.');
      violations++;
    }
    if (e.residual) residuals.push([e.x, e.residual]);
  }
  say(`    · ${'rows with an assertion'.padEnd(24)} ${String(claimed).padStart(5)}`);
  say(`    · ${'rows RESIDUAL only'.padEnd(24)} ${String(residualOnly).padStart(5)}   (read the block at the end)`);
}

// ── 0a · every file the register names must EXIST and be inside the wide roots ──────────────
//    🔴 A NAMED FILE THAT IS NOT SCANNED IS A ROW THAT SILENTLY PASSES — `codemod-plan` §3.0.2
//       class 8, and the reason `WIDE_ROOTS` is eight directories rather than two.
{
  const named = new Set();
  for (const e of REGISTER) for (const [f] of (e.counts || [])) named.add(f);
  const missing = [...named].filter(f => !RAW.has(f));
  say(`  ${'named files in scan scope'.padEnd(38)} ${String(named.size).padStart(4)} named, ` +
      `${String(named.size - missing.length).padStart(3)} scanned` + (missing.length ? '   \u{1F534}' : ''));
  for (const f of missing) {
    say(`    \u{1F534} OUT OF SCOPE  ${f} is named by the register but is not in the scanned set.`);
    say('                   Either it was moved/deleted, or it sits outside the wide roots — and a');
    say('                   row scoped to an unscanned file reports clean by never looking.');
    violations++;
  }
}

// ── 1 · COUNTS · 6 · ACCOUNTING ────────────────────────────────────────────────────────────
let cTotal = 0, cBad = 0, acctBad = 0;
for (const e of REGISTER) {
  for (const [f, re, want, why] of (e.counts || [])) {
    if (!RAW.has(f)) continue;                       // already reported by 0a as a violation
    cTotal++;
    const code = count(CODE.get(f), re);
    const note = count(NOTE.get(f), re);
    const raw = count(RAW.get(f), re);
    const ok = code === want;
    if (!ok) {
      say(`    \u{1F534} ${e.x.padEnd(4)} ${f}`);
      say(`         ${re.source}  ->  ${code}, expected ${want}`);
      say(`         ${why}`);
      say('         A FALL is a guard deleted; a RISE is a surface nobody recorded. Both fail, so');
      say('         neither can happen quietly. On Android neither direction changes one pixel.');
      cBad++; violations++;
    } else if (VERBOSE) {
      say(`       ok ${e.x} ${f}  ${re.source} = ${code}`);
    }
    // ⚠️ THE PARTITION IS TOTAL — a weaker claim than it looks, and deliberately stated as such.
    //    It catches a pattern that STRADDLES a comment boundary and any offset drift. It CANNOT
    //    catch a mis-placed boundary, because the two projections are complements of each other
    //    even when both are wrong; that is what the walker fixture above is for. Measured by
    //    injecting the O-91 bug: this identity stayed green and the fixture went red.
    if (code + note !== raw) {
      say(`    \u{1F534} ${e.x.padEnd(4)} ACCOUNTING BROKEN in ${f}`);
      say(`         ${re.source}:  ${code} code + ${note} comment != ${raw} raw`);
      say('         The two views of this file do not add up to it. Either this pattern straddles a');
      say('         comment boundary or an offset drifted.');
      say('         🔴 FIX THE PATTERN OR THE WALKER. Do not adjust a count to match.');
      acctBad++; violations++;
    }
  }
}
say(`  ${'per-file literal counts'.padEnd(38)} ${String(cTotal).padStart(4)} asserted, ${cBad} wrong` +
    (cBad ? '   \u{1F534}' : ''));
say(`    · ${'partition total code+cmt'.padEnd(24)} ${String(cTotal).padStart(5)} checked, ${acctBad} broken` +
    (acctBad ? '   \u{1F534}' : ''));

// ── 2 · ELSEWHERE — a boundary, expressed as zero outside its home(s) ──────────────────────
let eTotal = 0, eBad = 0;
for (const e of REGISTER) {
  for (const [re, homes, why] of (e.elsewhere || [])) {
    eTotal++;
    const stray = [];
    for (const f of FILES) {
      if (homes.includes(f)) continue;
      const n = count(CODE.get(f), re);
      if (n) stray.push(`${f}:${n}`);
    }
    if (stray.length) {
      say(`    \u{1F534} ${e.x.padEnd(4)} ${re.source} escaped its home(s)`);
      say(`         homes: ${homes.length ? homes.join(', ') : '(none — this must not exist anywhere)'}`);
      say(`         ${why}`);
      stray.forEach(s => say(`         ${s}`));
      eBad++; violations++;
    }
  }
}
say(`  ${'boundary · 0 outside its home'.padEnd(38)} ${String(eTotal).padStart(4)} asserted, ${eBad} escaped` +
    (eBad ? '   \u{1F534}' : ''));

// ── 3 · WIDE — an exact total, where the total IS the invariant ─────────────────────────────
let wTotal = 0, wBad = 0;
for (const e of REGISTER) {
  for (const [re, want, why] of (e.wide || [])) {
    wTotal++;
    let n = 0;
    const where = [];
    for (const f of FILES) {
      const k = count(CODE.get(f), re);
      if (k) { n += k; where.push(`${f}:${k}`); }
    }
    const ok = n === want;
    say(`    · ${(e.x + ' wide ' + re.source).padEnd(30)} ${String(n).padStart(4)}, expected ${want}` +
        (ok ? '' : '   \u{1F534}'));
    if (!ok) {
      say(`         ${why}`);
      where.forEach(s => say(`         ${s}`));
      wBad++; violations++;
    } else if (VERBOSE) where.forEach(s => say(`           ${s}`));
  }
}
say(`  ${'tree-wide exact totals'.padEnd(38)} ${String(wTotal).padStart(4)} asserted, ${wBad} wrong` +
    (wBad ? '   \u{1F534}' : ''));

// ── 4 · ABSENT FILES — a retired module stays deleted ──────────────────────────────────────
let aTotal = 0, aBad = 0;
for (const e of REGISTER) {
  for (const [f, why] of (e.absentFiles || [])) {
    aTotal++;
    if (fs.existsSync(f)) {
      say(`    \u{1F534} ${e.x.padEnd(4)} ${f} IS BACK.  ${why}`);
      aBad++; violations++;
    }
  }
}
say(`  ${'retired modules stay deleted'.padEnd(38)} ${String(aTotal).padStart(4)} asserted, ${aBad} returned` +
    (aBad ? '   \u{1F534}' : ''));

// ── 5 · PROOF — a row asserted by another script; verify that assertion still EXISTS ────────
//    🔴 A CROSS-REFERENCE IS NOT BUREAUCRACY HERE. Five rows are asserted in
//       `primitive-adoption-check.js` because they live inside a primitive's own module and that
//       is where its contract belongs. But an assertion in another file can be DELETED there,
//       and this register would go on claiming the row is covered. So the roll call carries a
//       pointer AND a probe: the probe fails if the foreign assertion is gone.
//    ⚠️ CODE ONLY, for the same reason as everything else: the foreign script's own prose
//       discusses these literals at length, so a raw-text probe would be satisfied by its
//       commentary rather than by its contract.
let pTotal = 0, pBad = 0;
for (const e of REGISTER) {
  for (const [script, sub, want, why] of (e.proof || [])) {
    pTotal++;
    if (!fs.existsSync(script)) {
      say(`    \u{1F534} ${e.x.padEnd(4)} the asserting script ${script} does not exist.`);
      pBad++; violations++; continue;
    }
    const code = stripComments(fs.readFileSync(script, 'utf8'));
    const n = code.split(sub).length - 1;
    if (n !== want) {
      say(`    \u{1F534} ${e.x.padEnd(4)} ${script} no longer carries its assertion`);
      say(`         looked for: ${JSON.stringify(sub)}  ->  ${n} occurrence(s), expected ${want}`);
      say(`         ${why}`);
      say('         This row is claimed as COVERED ELSEWHERE. If the other assertion is gone, the');
      say('         coverage claim is false and the register is back to being a paragraph.');
      pBad++; violations++;
    } else if (VERBOSE) {
      say(`       ok ${e.x} ${script} ${JSON.stringify(sub)} = ${n}`);
    }
  }
}
say(`  ${'cross-referenced assertions'.padEnd(38)} ${String(pTotal).padStart(4)} probed, ${pBad} missing` +
    (pBad ? '   \u{1F534}' : ''));

// ── the RESIDUAL RISK REGISTER — printed every run, never counted as coverage ───────────────
//    🔴 IT IS PRINTED RATHER THAN FILED BECAUSE A RESIDUAL RISK NOBODY READS IS AN ASSUMED-EMPTY
//       ONE, and "assumed empty" is what the whole register was until X17 broke. Short and known
//       beats short and believed.
say('');
say(`  ── residual risk · ${residuals.length} stated, mechanically unassertable ──`);
for (const [x, why] of residuals) {
  say(`  ${x}  ${why.replace(/(.{1,96})(\s|$)/g, '$1\n      ').trimEnd()}`);
}
say('');
say('  ⚠️  AND THE STANDING LIMIT ON EVERY GREEN LINE ABOVE: a count proves the guard SURVIVED');
say('     THE DIFF. It does not prove the guard WORKS. What these guards prevent is an iOS-');
say('     PRODUCTION layout collapse and iOS verification is closed permanently, so no Android');
say('     build, emulator, screenshot or green gate is evidence about any row here.');

process.exit(violations ? 1 : 0);
