#!/usr/bin/env node
/**
 * primitive-adoption-check.js — THE 20TH NAMED RULE. THE ARRIVAL GATE FOR THE PRIMITIVES PHASE.
 *
 * ── 🔴 WHY IT EXISTS, AND WHY IT IS DELIVERABLE ZERO ───────────────────────────────────
 *
 * primitives-plan.md §0.1: every gate in the codemod was built around ONE claim — prove
 * nothing moved. `resolve-utilities.js --diff` returning `0 rule(s) moved` was the strongest
 * sentence the programme could say. 🔴 NOT ONE ITEM IN THE PRIMITIVES PHASE CAN MAKE THAT
 * CLAIM. Every component here changes by design, so an identity assertion over this work is
 * either vacuously true or false.
 *
 * Where the codemod asked "did anything move that should not have?", this phase asks
 * "DID THE RIGHT THING ARRIVE AT EVERY SITE THAT NEEDS IT?" — and nothing in the tree could
 * ask that question until this file existed.
 *
 * 🔴 THE BASE RATE FOR AN ARRIVAL GATE IN THIS PROJECT IS 100%. Four have been written and all
 *    four caught a live defect on their FIRST run: p23-optin-check (41 of 179 sites needed the
 *    prop at the JSX boundary, not in the style object) · family-arrival-check (9 sites with a
 *    Figtree face on a Literata step) · its className half (the display family had ZERO call
 *    sites and nobody had ever seen the serif) · alpha-callsite-check (a value-shaped guard
 *    would have silently STOPPED throwing on three tokens). Writing the gate AFTER the
 *    components means writing it against code you have already convinced yourself is correct,
 *    which is the one condition under which it finds nothing.
 *
 * ── WHAT IT ASSERTS, per primitive, driven by the CONTRACTS table below ────────────────
 *
 *   1. ADOPTION      every file that MUST render <P> does
 *   2. UNDECLARED    a file that renders <P> and is not in the contract is a FINDING, not noise
 *   3. FORBIDDEN     a file that must NEVER render <P> does not
 *   4. LEGACY        the superseded element it replaces is absent tree-wide  (the ONE decreasing
 *                    counter this phase gets — an adoption count alone reads "complete" while the
 *                    old form is still live at a third of the sites)
 *   5. PROPS         prop-VALUE contracts on each element    (see the class-5 note below)
 *   6. FAMILY        every <Text> inside P's own file names a face          (absence A)
 *   7. OPT-IN        every reading-copy <Text> inside P's own file can scale (absence B)
 *   8. TOKENS        a colour token's call-site census is where it is meant to be (absence C)
 *   9. LITERALS      an X-invariant's literal survives inside P's own file  (item 2, X3)
 *
 * ── 🔴 THREE PROPERTIES, EACH LEARNED THE HARD WAY ─────────────────────────────────────
 *
 * 1. 🔴 IT READS JSX ELEMENT NAMES AND PROP VALUES — not classNames, and not style objects.
 *    codemod-plan §3.0.2 class 5 is "the property the rule keys on is not where the value
 *    lives", and this phase gives it a NEW SHAPE: a PROP IS NEITHER A CLASS NOR A STYLE. A lock
 *    shell that takes its whole visual contract from a numeric density prop is invisible to
 *    every other rule in this tree. Seventeen of the nineteen existing rules search source text
 *    for a spelling; two invoke a mechanism; NONE of them can see an attribute.
 *
 * 2. 🔴 IT PAIRS BY BRACE BALANCE, NEVER BY A LINE WINDOW. Three separate findings in this
 *    programme came from line windows — pass 4's step-and-face-on-different-lines defect, 2b's
 *    spacer false positive, and the derived radii hiding across lines. A JSX element with six
 *    props spans six lines routinely, and an opening tag can carry a nested object, a template
 *    literal and a ternary. `openingTag()` below walks strings, comments and brace depth.
 *
 * 3. 🔴 IT WAS RE-VALIDATED IN BOTH DIRECTIONS BEFORE IT WAS ALLOWED TO BLOCK (§3.0.2.0 step 3),
 *    and the OVER-finding direction is the insidious one: a rule that cries wolf is
 *    decommissioned by its own output, which is exactly how no-white-on-accent became
 *    report-only. On the tree as it stood at item 0 it returned EXACTLY the known set —
 *    equality, not "at least" — and every injected defect was caught singly.
 *
 * ── ⚠️ THE EXCEPTION MECHANISM SHIPS WITH THE FIRST ASSERTION (pass 3a's R-1, binding here) ──
 *
 * family-arrival-check could not demand a face until the GLYPH marker existed, because without
 * it the rule OVER-found on two correct sites. So a file that legitimately does not adopt a
 * primitive says so AT THE SITE, never in a list in this script (§0.1 — a file:line list rots):
 *
 *     {  ADOPTION-EXEMPT(SectionCard): combined.tsx's copy is {title, icon, children} with
 *        no locked branch — a different component wearing the same name (§3.3 M-2).  }
 *
 * ...written as a JSX or block comment. Counted SEPARATELY, printed EVERY run, NEVER summed
 * with the live count — an exception that does not report itself is how a rule gets disarmed.
 *
 * Usage, from mobile/:   node scripts/primitive-adoption-check.js [--verbose]
 */
const fs = require('fs');
const path = require('path');
// 🔴 `O-91` — the quote-and-comment-safe walker, extracted because the same five-line bug was
//    copy-pasted into THREE scanners. See that module's header for the measurement.
const { skipQuoted, commentEnd, stripComments } = require('./lib/source-scan');

const ROOTS = ['app', 'components'];

// 🔴 A SECOND, WIDER ROOT SET — AND THE ASYMMETRY IS BLINDNESS CLASS 8 ANSWERED, NOT AN OVERSIGHT.
//    codemod-plan §3.0.2 class 8 (`M-5` / `O-45`) is SEARCH-ROOT completeness: a file outside the
//    roots is invisible to every content-based tool at once, and the instance that opened the class
//    was a whole file holding 39 retired tokens that only `tsc` could see.
//    Item 17 walks straight into it. The paywall helper lives in `lib/`, which the two roots above
//    do not cover, and the form it replaces could survive in `lib/`, `store/`, `hooks/`, `utils/` or
//    `services/` with this gate reading green — `hooks/usePaywall.ts` held TWO of those calls until
//    this commit deleted it, and no rule in this file could see either.
// ⚠️ THE PRIMITIVE CONTRACTS DELIBERATELY KEEP THE NARROW ROOTS. A JSX element outside app/ and
//    components/ is not a screen or a component, so widening them would count nothing and would
//    silently change every adoption number in this file. Two questions, two root sets, stated.
const WIDE_ROOTS = ['app', 'components', 'lib', 'store', 'hooks', 'utils', 'services', 'types'];
const VERBOSE = process.argv.includes('--verbose');

// The ramp steps that opt back IN to scaling (P23). 🔴 EIGHT FROM 2026-08-03, NOT FIVE: the three
// display steps joined by owner ruling (`P42` / `O-50`), because the freeze was an inherited
// principle that does not apply here — pass 5 measured that NOT ONE fixed-height container in the
// app holds a display step, while the freeze was collapsing the hierarchy at the 1.3 cap (`O-58`).
// ⚠️ HARDCODED, AND ONE OF THREE PLACES: theme.js's `scales` flag and scripts/p23-optin-check.js
//    hold the same contract. Nothing here derives from that table, so all three move together or
//    two gates enforce a shape the ramp no longer has.
const SCALES = new Set(['text-sm', 'text-xs', 'text-base', 'text-lg', 'quote',
                        'display-lg', 'display-md', 'display-sm']);

// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE CONTRACTS. One entry per primitive with an adoption contract.
//
//  🔴 ADD AN ENTRY IN THE COMMIT THAT LANDS THE PRIMITIVE, NEVER BEFORE AND NEVER AFTER.
//     Before  -> a contract nothing satisfies, which is a pending counter with no debtor
//                (the deleted GP() lesson in token-gate.sh, one file over).
//     After   -> the component is written against a gate that cannot see it, i.e. no gate.
//
//  Fields:
//    file        the primitive's own module — checked by FAMILY and OPT-IN, never an adopter
//    expected    every file that MUST render it. THIS LIST IS THE ENUMERATION (class 4): the
//                rule is only ever as good as it. A new adopter must be ADDED here deliberately.
//    forbidden   files that must NEVER render it, each with the reason printed on failure
//    legacy      element names it supersedes — asserted ABSENT tree-wide
//    propRules   prop-VALUE contracts, evaluated on the brace-balanced opening tag.
//                `requires` = prop A implies prop B.  `forbid` = prop A's VALUE must not match.
//    textFamily  assert every <Text> in `file` names a face      (absence A)
//    textOptIn   assert every reading-copy <Text> in `file` scales (absence B)
//    literals    🆕 regexes that MUST still match `file`. THE X1-X20 CARRY, made mechanical.
//                🔴 primitives-plan §2.4 is explicit that this proves the guard SURVIVES THE DIFF
//                   and nothing more — it does not prove the guard WORKS and it never could,
//                   because the behaviour it guards is iOS-production-only and iOS is paused.
//                   Do not let a green line here read as verification. It is a diff alarm.
// ══════════════════════════════════════════════════════════════════════════════════════════
const CONTRACTS = [
  {
    name: 'ScreenContainer',
    file: 'components/ui/ScreenContainer.tsx',
    // Measured 2026-08-03 against the tree at 8d97b0c. 25 of 32 screens — UI-audit §3.5 rank 1.
    expected: [
      'app/(auth)/forgot-password.tsx',
      'app/(auth)/login.tsx',
      'app/(auth)/reset-password.tsx',
      'app/(auth)/signup.tsx',
      'app/(auth)/verify-code.tsx',
      'app/(auth)/verify-email.tsx',
      'app/(capture)/birth-data.tsx',
      'app/(main)/astrology/daily.tsx',
      'app/(main)/astrology/index.tsx',
      'app/(main)/astrology/monthly.tsx',
      'app/(main)/astrology/weekly.tsx',
      'app/(main)/compatibility/[id].tsx',
      'app/(main)/compatibility/history.tsx',
      'app/(main)/compatibility/index.tsx',
      'app/(main)/home.tsx',
      'app/(main)/numerology/index.tsx',
      'app/(main)/numerology/name-destiny.tsx',
      'app/(main)/profile.tsx',
      'app/(main)/readings/career-destiny.tsx',
      'app/(main)/readings/combined.tsx',
      'app/(main)/readings/cosmic-report.tsx',
      'app/(main)/readings/cosmic-report-history.tsx',
      'app/(main)/readings/face.tsx',
      'app/(main)/readings/index.tsx',
      'app/(main)/readings/palm.tsx',
    ],
    // 🔴 THE FORBIDDEN LIST IS THE HIGH-VALUE HALF OF THIS CONTRACT, and no other instrument in
    //    the tree can see any of it. Three of the four entries are TEXTURE EXCLUSIONS: from item
    //    1 onward this primitive carries the grain layer, so a screen that adopts it INHERITS
    //    the texture silently. Design §4.6 excludes exactly these three, and the exclusion is a
    //    product decision that would be reversed by a refactor nobody would think to question.
    forbidden: [
      ['app/(auth)/welcome.tsx',
        'X2 — welcome.tsx hand-rolls the pinned structure and DELIBERATELY does not use this ' +
        'primitive. UI-audit §5.1 X2: do not "unify" it. Its texture mount is its own (mount ii).'],
      ['app/(main)/readings/qa.tsx',
        'design §4.6 — the chat is a reading surface, not a poster: NO texture at any safety ' +
        'state. Adopting this primitive would grain it silently.'],
      ['app/(capture)/face-capture.tsx',
        'design §4.6 — texture over a live camera preview is just noise.'],
      ['app/(capture)/palm-capture.tsx',
        'design §4.6 — texture over a live camera preview is just noise.'],
    ],
    legacy: [],
    literals: [
      [/\{ridge \? <RidgeFieldLayer \/> : null\}/,
        '🔴 THE RIDGE MUST STAY CONDITIONAL, AND THIS PRIMITIVE IS WHY. It is rendered by 25 screens, ' +
        'so a ridge painted here unconditionally is not a smaller version of §0.0 rule 5\'s descope ' +
        '(funnel screens and Home only) — it is the descope DELETED, on 25 screens at once, with ' +
        'nothing else in the tree able to see it. Exactly ONE screen passes the prop today. Added ' +
        'because an item-19 re-validation case measured this as invisible to every instrument.'],
    ],
    literalCounts: [
      [/\{ridge \? <RidgeFieldLayer \/> : null\}/, 2,
        'BOTH return branches — the gradient one and the plain one. They are two copies of one ' +
        'decision, which is the shape five of this phase\'s findings had, so the count is the ' +
        'assertion: a fall to 1 is the two branches diverging on whether a screen gets a ridge.'],
      // 🔴 THE §5.4 ENTRANCE, ASSERTED IN THREE PARTS BECAUSE IT CAN FAIL IN THREE DIFFERENT WAYS AND
      //    TWO OF THEM ARE SILENT. Added with the entrance itself (motion item 2).
      [/const AnimatedSafeAreaView = Animated\.createAnimatedComponent\(SafeAreaView\)/, 1,
        '🔴 THE NO-NEW-NODE MECHANISM. The entrance rides on the safe area\'s existing style array ' +
        'precisely so that no node enters X1\'s flex-propagation chain and so that the six auth ' +
        'screens passing `justifyContent: center` in contentContainerStyle keep centring their own ' +
        'children. A refactor that "simplifies" this into a wrapper View is a layout change on 25 ' +
        'screens that Android renders identically — the class §5.4 closed iOS verification for.'],
      [/<AnimatedSafeAreaView/, 1,
        'DECLARED IS NOT RENDERED. The animated component could survive as a dead const while the ' +
        'JSX reverted to the plain element, and the app would render exactly as it does today minus ' +
        'the entrance — no error, no warning, nothing any other instrument in the tree can see.'],
      [/const entrance = useEntrance\(\)/, 1,
        'AND THE STYLE COULD BE PRESENT WITH THE HOOK GONE, or vice versa. This is the third leg: ' +
        'the hook is CALLED here. `motion-arrival-check.js` asserts the other end — that every ' +
        'helper exported from lib/motion.ts has a call site outside it — so the two rules together ' +
        'close the loop from both directions.'],
    ],
    propRules: [
      // 🔴 §17.1, AND THIS IS THE CLASS-5 CHECK MADE LIVE. The one-hero-per-screen rule is
      //    enforced by the TYPE OF A SLOT rather than by review (§17.4): a screen that wants a
      //    second hero has nowhere to put it. §17.1's other half is that the hero pairs with an
      //    eyebrow as its immediate neighbour and THAT ADJACENCY IS THE CONTRAST — 30/34 against
      //    11/14 with no mid step between them. A hero shipped without its eyebrow is not a
      //    smaller hero, it is the rule's mechanism deleted.
      //    tsc enforces this too, via a union on the props. This catches what tsc cannot: a
      //    spread, an `as any`, or a JS call site.
      { prop: 'hero', requires: 'heroOverline',
        why: '§17.1 — the hero pairs with its eyebrow, and that adjacency IS the contrast' },
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // 🔴 THE TEXTURE LAYER (item 1). ITS CONTRACT IS ALMOST ENTIRELY A *FORBIDDEN* LIST, AND
    //    THAT IS THE POINT: it mounts at exactly three places, design §4.6 names three more where
    //    it must never mount, and every one of those six facts lives only in prose today. Nothing
    //    else in the tree can see a fourth mount arriving, and a fourth mount is not a visible
    //    bug — it is the same texture at twice the density on the screens a new user sees first.
    name: 'GrainLayer',
    file: 'components/ui/GrainLayer.tsx',
    expected: [
      'components/ui/ScreenContainer.tsx',   // mount i  — 25 of 32 screens inherit it
      'app/(auth)/welcome.tsx',              // mount ii — inside its own X2 wrapper
      'app/(paywall)/index.tsx',             // mount iii — the one large saturated field
    ],
    forbidden: [
      ['app/(auth)/_layout.tsx',
        'design §4.6 lists this as a fourth mount and Appendix A(b) finding I-1 REFUTES it by ' +
        'measurement: all six non-welcome (auth) screens already inherit mount i, so a layout ' +
        'mount lays a SECOND copy over the whole first-run funnel — twice the specified density.'],
      ['app/(main)/readings/qa.tsx',
        'design §4.6 — the chat is a reading surface, not a poster. Excluded at EVERY safety state.'],
      ['app/(capture)/face-capture.tsx',
        'design §4.6 — over a live camera preview this is just noise.'],
      ['app/(capture)/palm-capture.tsx',
        'design §4.6 — over a live camera preview this is just noise.'],
    ],
    legacy: [],
    propRules: [],
    // No text nodes by construction, and it must stay that way — see its own module header.
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 2 · Button ═════════════════════════════════════════════════════════════════
    // 🔴 THE MEASURED SCOPE IS 25 FILES AND 54 CALL SITES. §3.1 says "19 · 59%" and design §9
    //    says "reach 19"; neither is a file count OR a site count of anything in the tree —
    //    it is the 19-of-32 SCREEN share, and it excludes every component adopter. That is
    //    codemod-plan §3.0.2 class 7 again (a document's inference is not verified by being
    //    written), and primitives-plan §0.2 makes measuring it a requirement rather than a
    //    courtesy. Measured 2026-08-03 at 8d443f6.
    //
    // 🔴 WHAT THIS CONTRACT IS ACTUALLY FOR, because an adoption list for Button is NOT the same
    //    instrument it is for ScreenContainer. ScreenContainer's list answers "did the migration
    //    reach every screen?" — a one-time question. Button's answers a STANDING one: a screen
    //    that hand-rolls a TouchableOpacity where it used to render the primitive drops X3's
    //    fixed height, the pill, the on-accent pairing and the a11y contract IN ONE EDIT, and
    //    every one of those losses is undetectable on Android. The list is an anti-regression floor.
    name: 'Button',
    file: 'components/ui/Button.tsx',
    expected: [
      'app/(auth)/forgot-password.tsx',
      'app/(auth)/login.tsx',
      'app/(auth)/reset-password.tsx',
      'app/(auth)/signup.tsx',
      'app/(auth)/verify-code.tsx',
      'app/(auth)/welcome.tsx',
      'app/(capture)/birth-data.tsx',
      'app/(main)/astrology/daily.tsx',
      'app/(main)/astrology/monthly.tsx',
      'app/(main)/astrology/weekly.tsx',
      'app/(main)/compatibility/[id].tsx',
      'app/(main)/compatibility/index.tsx',
      'app/(main)/numerology/index.tsx',
      'app/(main)/profile.tsx',
      'app/(main)/readings/cosmic-report.tsx',
      'components/account/ChangePasswordModal.tsx',
      'components/account/DeleteAccountModal.tsx',
      // 🔴 MOVED AT ITEM 15, NOT LOST. LogoutConfirmModal delegates to `Sheet`, which renders
      //    the two controls itself — so the adopter is now the PRIMITIVE, one level down. The
      //    gate reported this as one MISSING plus one UNDECLARED, which is exactly the pair of
      //    findings a delegation should produce; a contract that only counted files would have
      //    read 27/27/0 through the whole migration.
      'components/ui/Sheet.tsx',
      'components/account/UpdateNameModal.tsx',
      'components/common/EmptyState.tsx',
      'components/common/ErrorView.tsx',
      'components/common/NotificationPrompt.tsx',
      'components/insights/ContinuityCard.tsx',
      'components/insights/DailyInsightCard.tsx',
      'components/profile/SunSignReveal.tsx',
      // 🆕 DECLARED AT ITEM 7 (assertion 2: an unexpected adopter is a FINDING, so a new one is
      //    added here deliberately). GeneratingReading's recovery pair was hand-rolled with the
      //    plain foreground on an accent fill — a latent A5 failure the primitive fixes BY
      //    DERIVING THE PAIRING ONCE, which is this module's own standing argument.
      'components/readings/GeneratingReading.tsx',
      // 🆕 DECLARED AT ITEM 13. LockShell's CTA and its secondary action are both this primitive,
      //    which is what moved SectionCard's A5 literal onto THIS module (see `literals` below):
      //    the unlock control's on-fill pairing is now derived here, once, for every lock in the
      //    app instead of in a style rule per treatment.
      'components/ui/LockShell.tsx',
    ],
    // 🔴 THE TWO CAMERA SCREENS ARE THE ONLY REAL "MUST NOT", and the reason is not style.
    //    Their controls are a shutter and a gallery affordance: circular, icon-only, sized to the
    //    viewfinder, with no title. This primitive REQUIRES a title and pins a rectangular height
    //    from a three-value lookup, so adopting it there would either force an empty label onto a
    //    shutter or force the shutter off its own geometry. pass 3b's per-site review put those
    //    controls on the pill step BY THEIR OWN style objects, which is the correct outcome —
    //    the shape is shared, the component is not.
    forbidden: [
      ['app/(capture)/face-capture.tsx',
        'the shutter and gallery controls are icon-only circles sized to the viewfinder; this ' +
        'primitive requires a title and pins a rectangular height (X3). Shape shared, component not.'],
      ['app/(capture)/palm-capture.tsx',
        'same — and palm-capture additionally branches its stepper 1-vs-2 hands (UI-audit §5.6).'],
    ],
    legacy: [],
    propRules: [
      // 🔴 THE ONE WAY X3 CAN BE DEFEATED FROM OUTSIDE THE MODULE, and it is class 5 exactly:
      //    the property the rule keys on is not where the value lives. `style` is spread AFTER
      //    the primitive's own height, so a call site passing `style={{ height: … }}` WINS —
      //    silently, with tsc's blessing, and with no visible effect on Android. Nothing that
      //    greps Button.tsx can see it, because the offending text is in another file.
      //    Measured at this commit: 0 of 54 call sites do it. That is a PERMANENT INVARIANT at 0
      //    (codemod-plan §3.0.2 class 2), so it carries that class's whole hazard — nothing
      //    counts down beside it, and a call site that instead passes a StyleSheet REFERENCE
      //    holding a height is out of reach of this check. Re-validate it, do not trust it.
      { prop: 'style', forbid: /\bheight\s*:/,
        why: 'X3 — `style` is spread last, so a call-site height overrides the fixed 48/56/64 ' +
             'and re-opens the iOS-production collapse this primitive exists to prevent' },
    ],
    // 🔴 X3's FOUR LITERALS. §3.1's item-2 gate names exactly these: the three heights plus the
    //    gradient's 100%/100%. Asserted here rather than in a shell grep so the failure message
    //    can carry the reason — a bare grep returning 0 tells a future reader nothing about why
    //    a number they are about to delete matters.
    literals: [
      [/\bsm:\s*48\b/, 'X3 — the sm height. iOS prod collapses a padding-sized gradient button.'],
      [/\bmd:\s*56\b/, 'X3 — the md height. Also the height DeleteAccountModal\'s X20 pair matches.'],
      [/\blg:\s*64\b/, 'X3 — the lg height.'],
      [/width:\s*'100%'/, "X3's second half — the gradient fills its explicitly-sized parent."],
      [/height:\s*'100%'/, "X3's second half — never padding-only sizing on the gradient."],
      // 🔴 THE A5 PAIRING, MOVED HERE AT ITEM 13 IN THE COMMIT THAT DELETED IT FROM SectionCard.
      //    Item 4 pinned it on SectionCard because that file had become the only site deriving
      //    the unlock CTA's colour. Item 13 routes every lock CTA through this primitive, so the
      //    only site is now this one — and it is ALSO the primary button of the whole app, i.e.
      //    the single highest-traffic on-fill pairing in the codebase, which nothing asserted.
      //    R-4 is permanent for the same reason: that pairing has been a contrast defect three
      //    times in this repo and every recurrence came from re-deriving the colour AT A SITE.
      [/onFillLabel\s*=\s*isDisabled\s*\?\s*t\.color\['fg-disabled'\]\s*:\s*t\.color\['on-accent'\]/,
        'A5 / R-4 — a filled control (primary or danger) has exactly one legal label colour, and ' +
        'it is derived here for all of its call sites. The disabled half pairs with opacity 1 ' +
        '(V-6): the FILL stays at full strength and only the LABEL reads as unavailable.'],
      // 🔴 §5.4's PRESS FEEDBACK — motion item 3. Three legs, because it has three silent failure
      //    modes and the middle one is the nastiest: the built-in fade coming back.
      [/const AnimatedTouchable = Animated\.createAnimatedComponent\(TouchableOpacity\)/,
        '🔴 THE NO-NEW-NODE MECHANISM, and on this component it is X3 rather than convenience. The ' +
        'press style is APPENDED to the touchable\'s existing style array; a wrapper around a ' +
        'fixed-height control is the edit that renders identically on Android and collapses in iOS ' +
        'production, which is the class §5.4 closed the verification programme for.'],
      [/activeOpacity=\{1\}/,
        '🔴 §5.4: "No `activeOpacity` guesswork." Back at 0.8 this composes TWO opacity curves on ' +
        'one gesture — the platform\'s untimed fade over the token\'s 90ms — and the result is ' +
        'neither value. ⚠️ THE FAILURE IS INVISIBLE: the button still dims on press, just not by the ' +
        'specified amount or over the specified duration, so no reviewer would ever file it.'],
      [/onPressIn=\{press\.onPressIn\}/,
        'AND THE STYLE COULD BE PRESENT WITH NOTHING DRIVING IT. `motion-arrival-check.js` asserts ' +
        'the other end — that `usePress` has a call site outside lib/motion.ts — so the two rules ' +
        'close the loop from both directions.'],
      // 🔴 R-1 (owner, 2026-08-04) — THE DESTRUCTIVE VARIANT KEEPS THE HEAVIER HAPTIC, and this is
      //    the assertion that makes the exception survive rather than be remembered.
      [/variant === 'danger'\s*\?\s*Haptics\.ImpactFeedbackStyle\.Medium/,
        '🔴 HAPTIC WEIGHT IS A SIGNAL, NOT A STYLE. §5.4 specifies `Light` on press-in and this ' +
        'control adopted it; `danger` is its ONE documented exception, because a heavier tap on an ' +
        'irreversible action is a deliberate cue. ⚠️ IT LOOKS LIKE DEAD CODE AND THAT IS WHY IT IS ' +
        'ASSERTED: `variant="danger"` has ZERO call sites today, every destructive control in the ' +
        'tree is still hand-rolled, and primitives-plan §2.2 anticipates the absorption BY NAME — ' +
        '"if §9\'s Button/Sheet absorb these two hand-rolled buttons, X3 takes over and X20 ' +
        'retires." On that day the destructive action inherits this line silently. A reader who ' +
        'flattens the ternary "because both branches are the same idea" removes weight from the ' +
        'most consequential control in the app, and nothing else in the tree could see it.'],
    ],
    textFamily: true,
    textOptIn: false,   // 🔴 DELIBERATE, and it is the ONE place this flag is off for a live
                        //    reason rather than a pending one: design §3.6 freezes X3 BY NUMBER.
                        //    A Button label must not reflow a fixed-height box. See TEXT_STEP's
                        //    header. `p23-optin-check` stays at MISSING 0 alongside this.
  },
  {
    // ═══ §9 ITEM 3 · Card ═══════════════════════════════════════════════════════════════════
    // 13 files, 43 call sites, measured 2026-08-03. 🟢 §3.1's "13 · 41%" is a FILE count and it
    // is correct — the first §9 scope claim in this phase that measured out unchanged. Recorded
    // because a document being right is evidence too, and class 7's rule is "measure it", not
    // "assume it is wrong".
    name: 'Card',
    file: 'components/ui/Card.tsx',
    expected: [
      'app/(capture)/birth-data.tsx',
      'app/(main)/home.tsx',
      'app/(main)/numerology/index.tsx',
      'app/(main)/numerology/name-destiny.tsx',
      'app/(main)/profile.tsx',
      'app/(main)/readings/career-destiny.tsx',
      'components/account/ChangePasswordModal.tsx',
      'components/account/DeleteAccountModal.tsx',
      // 🔴 LogoutConfirmModal LEFT THIS LIST AT ITEM 15 and its absence is deliberate: it is now a
      //    `Sheet`, and a sheet IS a surface — wrapping a card inside one would be two grounds for
      //    one object, which is the nested-corner problem `O-40` ruled on at item 3. The removal is
      //    recorded here rather than exempted at the site, because the site no longer has anything
      //    to hang an exemption on: the file is 50 lines and renders exactly one element.
      'components/account/UpdateNameModal.tsx',
      'components/insights/LifeAreaCard.tsx',
      'components/insights/MonthlyKeyDateCard.tsx',
      'components/insights/WeeklyDayCard.tsx',
    ],
    forbidden: [],
    legacy: [],
    // 🔴 THE ONE PROP CONTRACT THAT MATTERS HERE, AND IT IS O-40 COLLISION 3 MADE MECHANICAL.
    //    A call site may pass `className`, and the corner it names WINS over the component's —
    //    NativeWind resolves the last-written utility of a property. So a call site writing its
    //    own corner silently re-opens the exact defect O-40 was ruled to close: a card at the
    //    same step as the panels nested inside it. tsc cannot see it (it is a string), and no
    //    grep over Card.tsx can see it (the text is in another file). Measured: 0 of 43.
    propRules: [
      { prop: 'className', forbid: /\brounded-(sm|md|lg|xl|pill|none|full)\b/,
        why: 'O-40 — a card is the lg step 20 BY ROLE, and a panel nested in it takes 14. A ' +
             'call-site corner overrides the component and puts parent and child at the same one' },
    ],
    // 🔴 THE ONLY DECREASING ASSERTION THIS ITEM GETS, AND IT IS AN ABSENCE, SO IT IS EXPRESSED
    //    AS A LITERAL THAT MUST *NOT* MATCH. The elevation utility and the retired translucent
    //    fill are both gone from this module and neither has another call site anywhere, so both
    //    resolved rules vanished with them. Nothing else in the tree would ever notice one coming
    //    back — it would render as a soft shadow on 43 cards and read as a style choice.
    absent: [
      [/shadow-/, 'design §4.5 — the system is ZERO-ELEVATION. Depth is the surface ladder, ' +
                  'never a shadow. The only legal elevation left in the codebase is X19\'s, ' +
                  'and that one is a stacking fix on the paywall close button.'],
      [/translucent/, 'the S1 carry, measured at ZERO call sites and deleted in item 3. A ' +
                      'second unused option beside a live one is how the old palette survived.'],
    ],
    literals: [
      [/\brounded-lg\b/, 'O-40 — a Card is the lg step 20 by ROLE. At 14 it collides with every ' +
                         'panel nested inside it, which is the collision that decided the ruling.'],
      // 🔴 §5.4's CARD ENTRANCE — motion item 4. Two legs, and the second is the one a refactor eats.
      [/enabled: index !== undefined/,
        '🔴 THE ENTRANCE IS OPT-IN AND THE FLAG IS WHY. A card inside a `ScreenContainer` ALREADY ' +
        'rises with the screen entrance; a second one at delay 0 ADDS the two translateY curves to ' +
        '16dp, and §5.3 rule 3\'s limit is 8. ⚠️ "Simplifying" this to an unconditional entrance is ' +
        'the exact refactor that breaks it, it renders as a slightly bigger rise on 43 cards, and ' +
        'nothing else in the tree measures a compound transform.'],
      [/staggerFor\(index \?\? 0\)/,
        'AND THE STAGGER COMES FROM THE HELPER, NOT FROM ARITHMETIC HERE. `staggerFor` owns the cap ' +
        'at 5 (§5.4: "item 6+ appears with the 5th"), so a site multiplying its own index would ' +
        'uncap it — and an uncapped 12-row list lands its last row 480ms late, which reads as ' +
        'LOADING rather than as arriving.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 4 · SectionCard ════════════════════════════════════════════════════════════
    // 🔴 R-2 RECONCILES PER PATTERN, NOT BY TOTAL (codemod-plan §0 / §3.0.2.2.2). Before: 38
    //    <SectionCard> across FIVE files. After: 29 <SectionCard> across FOUR + 9
    //    <IconSectionCard> in combined.tsx = 38. A total that reconciles by accident is exactly
    //    what P-2 has caught four times; two named patterns summing to the old total is not.
    name: 'SectionCard',
    file: 'components/ui/SectionCard.tsx',
    expected: [
      'app/(main)/astrology/index.tsx',
      'app/(main)/compatibility/[id].tsx',
      'app/(main)/readings/face.tsx',
      'app/(main)/readings/palm.tsx',
    ],
    // 🔴 M-2 MADE ENFORCEABLE. combined.tsx's copy was never a merge candidate — {title, icon,
    //    children}, no lock branch, no horizontal margin, its own header rule — and while it
    //    shared the NAME, this gate could not tell an adopter from a look-alike, because it
    //    keys on the JSX element name by design (a prop is neither a class nor a style, and an
    //    element name is the only thing that survives both). Item 4 renamed it at its site; this
    //    entry is what stops the collision coming back.
    forbidden: [
      ['app/(main)/readings/combined.tsx',
        '§3.3 M-2 — this file\'s section wrapper is a DIFFERENT COMPONENT that shared the name: ' +
        '{title, icon, children}, no lock branch, its own header rule. It is IconSectionCard, ' +
        'and it must stay distinct or this gate goes blind to the difference.'],
    ],
    legacy: [],
    propRules: [],
    // 🔴 THE DECREASING COUNTER — assertion 3, and this item is the only one of the three in this
    //    session that gets a real one. An adoption count of 29/29 reads COMPLETE while a local
    //    definition is still live at a third of the sites; §1.3's whole point. Each name below
    //    was measured at 0 outside the primitive at 2026-08-03, having been 4 or 5 before it.
    treeAbsent: [
      [/function SectionCard\s*\(/, 'a local re-definition. FIVE existed; the extraction is the item.'],
      [/\bunlockButton\b/, 'the duplicated unlock CTA style rule — 4 copies, now one, inside the primitive.'],
      [/\blockedContent\b/, 'the duplicated lock-panel style rule — 4 copies.'],
      [/\blockedText\b/, 'the duplicated lock-copy style rule — 4 copies.'],
    ],
    literals: [
      // ⚠️ THE A5 LITERAL THAT WAS HERE MOVED TO Button's CONTRACT AT ITEM 13, in the same commit
      //    that deleted the style rule it asserted. Item 4 pinned the unlock CTA's on-fill pairing
      //    here because this file had become the only site deriving it; item 13 routes every lock
      //    CTA through the Button primitive, so the only site moved. 🔴 AN INVARIANT THAT CHANGES
      //    OWNER MUST CHANGE OWNER IN ONE EDIT — a gap of even one commit is how one gets lost,
      //    and this one had already been lost once (three of four copies, `O-44`b).
      [/borderRadius:\s*t\.radius\.lg/,
        'O-40 — a SectionCard is the lg step 20 by ROLE. All five copies were at 14.'],
      // 🆕 ITEM 13 — THE DELEGATION, ASSERTED. The locked state IS a density-2 shell, and if this
      //    line were ever replaced by a local lock branch the adoption count would still read
      //    29/29 and every other rule in the tree would stay green. It is the fourth lock
      //    treatment arriving, which is exactly what this item existed to prevent.
      [/if\s*\(locked\)\s*return\s*<LockShell density=\{2\}/,
        'item 13 / §4.1 — the locked section state delegates to density 2 rather than rebuilding ' +
        'it. Nesting was rejected on a measurement: this box and the shell\'s box are the same ' +
        'box, so wrapping would double it and break §4\'s share-the-box invariant.'],
    ],
    // 🔴 THE FOUR DELETED LOCK RULES, NOW ASSERTED ABSENT FROM THIS MODULE TOO — which converts
    //    item 4's decreasing counter into a permanent floor. `treeAbsent` below only ever looked
    //    OUTSIDE this file, so until item 13 deleted them these names lived on here legitimately.
    //    They must not come back: a local lock branch beside a delegating one is the fifth copy.
    absent: [
      [/\bunlockButton\b/, 'the unlock control — it is the Button primitive inside the shell now.'],
      [/\blockedContent\b/, 'the lock panel — density 2 is the panel.'],
      [/\blockedText\b/, 'the lock copy — it named a TIER, an R1 violation and a fifth C-5 literal.'],
      [/router\.push/,
        'this file\'s ad-hoc paywall navigation. It was one of `O-41`\'s origins and it collapsed ' +
        'into the shell, so item 17\'s expected set drops again — re-measure, never inherit.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 5 · Input ══════════════════════════════════════════════════════════════════
    // 7 files, 15 call sites (measured 2026-08-03). §3.1 and design §9 row 5 both say "9 · 28%",
    // which is neither — it is the SCREEN share, class 7 for the third time in this phase.
    //
    // 🔴 AND THE PRE-FLIGHT FOUND THE REAL SHAPE OF THIS ITEM: SIX MORE FILES HAND-ROLL A FIELD,
    //    ELEVEN SITES, AND THEY DIVERGE IN EVERY PROPERTY THIS PRIMITIVE PINS. Measured:
    //      · name-destiny  3 fields · ground is the CANVAS, no fixed height, labels a step down
    //      · ChangePassword 3 fields · THREE separate copies of the reveal control
    //      · UpdateName    1 field  · its hint sits on the sub-AA placeholder role
    //      · DeleteAccount 1 field  · ground is the canvas again
    //      · verify-email  6 boxes  · a different control entirely (below)
    //      · qa.tsx        1 field  · structure-frozen (below)
    //    Four of those SHOULD adopt and are marked at the site rather than listed here, so the
    //    residue reports itself every run instead of living in a document nobody re-reads (§1.4).
    //
    // 🟢 AND ONE DIVERGENCE IS EVIDENCE RATHER THAN DEBT: the two hand-rolled fields that
    //    ALREADY signal a field state with an edge — verify-email's filled digit and qa.tsx's
    //    non-empty composer — BOTH use the accent role, and NEITHER uses the strong neutral.
    //    Two independent authors reached the role answer design §2 row 12 does not.
    name: 'Input',
    file: 'components/ui/Input.tsx',
    expected: [
      'app/(auth)/forgot-password.tsx',
      'app/(auth)/login.tsx',
      'app/(auth)/reset-password.tsx',
      'app/(auth)/signup.tsx',
      'app/(auth)/verify-code.tsx',
      'app/(capture)/birth-data.tsx',
      'app/(main)/compatibility/index.tsx',
      // 🔴 THE FOUR DEFERRED ADOPTERS. Each carries ADOPTION-EXEMPT(Input) AT THE SITE with its
      //    owner, so they print as exempt every run and are never summed with the live count.
      //    Deleting the marker is how one graduates — there is no list here to forget to update.
      'app/(main)/numerology/name-destiny.tsx',
      'components/account/ChangePasswordModal.tsx',
      'components/account/UpdateNameModal.tsx',
      'components/account/DeleteAccountModal.tsx',
    ],
    forbidden: [
      ['app/(main)/readings/qa.tsx',
        'D8 RESTYLE-ONLY / STRUCTURE-FROZEN, and adopting this primitive changes the JSX ELEMENT ' +
        '- the same reason the Txt wrapper was dropped (R-A). It is also a multiline composer ' +
        'growing 44 to 120, which is the one thing a pinned-height frame cannot be.'],
      ['app/(auth)/verify-email.tsx',
        'the six-box code entry is a DIFFERENT CONTROL: six elements for ONE value, 48 wide, no ' +
        'per-box name, and a per-box label would be nonsense. Shape shared, component not - the ' +
        'same ruling the two camera shutters got one contract up.'],
    ],
    legacy: [],
    propRules: [
      // 🔴 CLASS 5, AND IT LANDS DIFFERENTLY HERE THAN IT DOES ON Button. There, `style` and the
      //    pinned height are the same element. Here the height is on the FRAME and `style`
      //    reaches the FIELD INSIDE IT, so a call-site height does not override the frame - it
      //    disagrees with it, and the field is then clipped by its own parent. Measured 0 of 15.
      { prop: 'style', forbid: /\bheight\s*:/,
        why: 'the pinned 56 lives on the frame; a height passed here lands on the field inside ' +
             'it, so the two disagree and the field is clipped rather than resized' },
      // The ground and the corner are the design contract for this component. A call-site class
      // reaches the field, paints over the frame's fill and leaves the frame's edge orphaned.
      { prop: 'className', forbid: /\bbg-|\brounded-/,
        why: 'the fill and the corner are the frame\'s, and this prop reaches the field inside ' +
             'it - a ground written here paints over the frame and orphans its edge' },
    ],
    literals: [
      // 🔴 THE HIGHEST-VALUE ASSERTION IN THIS CONTRACT, AND IT IS ONE CHARACTER WIDE. Making the
      //    label optional again re-opens the sub-AA placeholder defect at every call site at once,
      //    silently, with tsc and every grep in the tree reading green - the placeholder still
      //    renders, it just becomes the only name the field has. Four of the fifteen sites were
      //    exactly that shape before this item.
      [/\blabel:\s*string;/,
        'design §2 row 9 - the placeholder role is sub-AA (2.73:1 on THIS component\'s own fill, ' +
        'the last column, not the 3.30:1 headline). A required label is the whole safety argument.'],
      // 🔴 §5.4's ERROR ROW — motion item 8, on the app's most frequent error surface.
      [/useErrorEntrance\(error\)/,
        '🔴 §5.4 — `dur-base` 220, opacity plus a 4dp rise, and NO SHAKE: "an error that jitters ' +
        'reads as a crash." ⚠️ THE ARGUMENT IS THE MESSAGE, NOT A BOOLEAN, AND THAT IS THE WHOLE ' +
        'DISTINCTION: a field can fail twice with two different messages and the second must animate ' +
        'too. Passing `!!error` would animate the first failure and silently swallow every ' +
        'subsequent one, which is exactly the case a user hits while correcting a form.'],
      [/accessibilityLiveRegion="polite"/,
        '🔴 AND THE ANIMATION DOES NOT REPLACE IT. The live region is the half a screen reader ' +
        'hears; the rise is the half a sighted user sees. A refactor that "moves the announcement ' +
        'into the animation" removes the only signal a non-visual user gets.'],
      [/FIELD_HEIGHT = 56\b/,
        'design §9 row 5 - the field is 56. Written as a constant rather than a size class ' +
        'because that class resolves through the MIGRATION-ONLY spacing keys (theme.js C-b, O-39).'],
      [/\brounded-md\b/, 'design §9 row 5 - the field is the md corner step 14, one below a Card.'],
      [/\bbg-surface-overlay\b/, 'design §2 row 4 names the overlay step as the Input fill.'],
      [/'border-2 border-accent'/,
        'THE FOCUS STATE, and it is a ROLE ruling with numbers behind it: the strong neutral edge ' +
        'differs from the resting edge by 1.33:1, so as a state indicator it is absent rather ' +
        'than weak. An edge that SIGNALS is the accent role; an edge that SEPARATES is neutral. ' +
        '🔴 THE WIDTH IS PART OF THE SAME ASSERTION AND IS NOT COSMETIC: once the resting edge ' +
        'rose to the 3:1 boundary floor, resting-vs-focused fell from 5.01 to 1.79 because only ' +
        'one end of the pair moved. The doubled stroke is what carries the state, so the two ' +
        'halves are asserted as ONE literal — dropping either one re-opens the state defect while ' +
        'every ratio in the file still reads legal on its own.'],
      [/'border border-border-control'/,
        'THE RESTING BOUNDARY (O-87 / P62). The subtle neutral reads 1.20:1 on this component\'s ' +
        'own fill, and the fill is 1.08:1 off the card behind it, so an unfocused field had no ' +
        'identifiable boundary at all — 1.4.11 wants 3:1 for a component boundary and this is ' +
        'the role that carries it, at 3.37:1 here. Asserted WITH its 1px width for the same ' +
        'reason the focus literal carries its 2px: the pair is the state.'],
    ],
    absent: [
      [/\blabel\?\s*:/,
        'the optional label. See the literal above - this is the same assertion from the other ' +
        'side, because a `?` can arrive without the typed line ever being deleted.'],
      [/border-border-strong/,
        'design §2 row 12 actively invites this token onto the focused field and it MUST NOT ' +
        'come back: at 1.33:1 against the resting edge it is not a visible state. This is a ' +
        'permanent invariant at 0 whose PRESSURE IS DOCUMENTED IN A SHIPPED DESIGN ROW, which is ' +
        'the one case where a class-2 rule sitting at 0 forever is clearly worth its keep.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 12 · the loading system ════════════════════════════════════════════════════
    // 🔴 THE ONLY CONTRACT IN THIS FILE WITH A REAL `legacy` ENTRY, AND THAT IS THE POINT.
    //    §0.2 says class 1 — the decreasing counter, the class that cannot be blinded — is the
    //    class this phase barely gets to use. Item 12 gets one: LoadingView was a SECOND
    //    implementation of the SCREEN density, and an adoption count of 7/7 would have read
    //    COMPLETE with it still live at four of them. Its element must be absent tree-wide.
    //
    // ⚠️ WHAT IS **NOT** ASSERTED HERE, deliberately: "never two densities at once on one screen".
    //    That invariant is about SIMULTANEITY. Nine files mount more than one indicator and eight
    //    are mutually-exclusive branches that never co-render, so any static count over-finds on
    //    eight of nine — the disarming direction. It stays prose in the module, beside the one real
    //    instance (the splash's zero-opacity sibling, owned by P18a).
    name: 'LoadingSpinner',
    file: 'components/ui/LoadingSpinner.tsx',
    expected: [
      'app/index.tsx',
      'app/(main)/astrology/daily.tsx',
      'app/(main)/astrology/weekly.tsx',
      // the four migrated from LoadingView at item 12
      'app/(main)/compatibility/history.tsx',
      'app/(main)/compatibility/[id].tsx',
      'app/(main)/readings/face.tsx',
      'app/(main)/readings/palm.tsx',
      // 🔴 THREE MORE, AND THEY FALSIFY THIS MODULE'S OWN HEADER CLAIM. It says "THIS IS NOW THE
      //    ONLY SCREEN-DENSITY LOADING SURFACE IN THE APP, and making that true was the item."
      //    That was measured against `LoadingView`, the other COMPONENT — never against the
      //    HAND-ROLLED form, which is an indicator centred in a full-height box inside the screen
      //    wrapper. Three screens still had it, and all three were UNLABELLED, so a screen reader
      //    on any of them announced nothing at all. One was reported; the other two are the same
      //    branch byte for byte and were not.
      //    ⚠️ Class 3 (SET completeness) doing exactly its job: every migrated batch was correct
      //       and a whole population was invisible because the census keyed on a component name.
      'app/(main)/readings/career-destiny.tsx',
      'app/(main)/numerology/name-destiny.tsx',
      'app/(main)/readings/cosmic-report-history.tsx',
    ],
    forbidden: [],
    legacy: ['LoadingView'],
    propRules: [],
    literals: [
      [/accessibilityRole="progressbar"/,
        'design §9 row 12 — a loading surface with no role announces a bare string, or nothing at ' +
        'all when it has no message. Neither of the two components this replaced had one.'],
      [/accessibilityLabel=/, 'design §9 row 12 — the role needs a name to announce.'],
    ],
    absent: [
      [/accessibilityValue/,
        'the role is INDETERMINATE. A progress role carrying a value claims a completion figure ' +
        'this surface does not have — unlike GeneratingReading, which has a real curve to report.'],
      [/LinearGradient/,
        'a dead import lived here and is why UI-audit §8 counts this module among the twenty-one ' +
        'users of that library. It was never rendered; it must not come back as one.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 11 · AffirmationCard ═══════════════════════════════════════════════════════
    // 4 files, 5 call sites. design §9 row 11 says the reach is "Home"; Home does not render it.
    //
    // ⚠️ ITEMS 9 AND 10 (ShareCard, ShareableQuote) ARE **NOT** IN THIS BATCH and have no contract
    //    yet, deliberately: §3.1 gates them on `P38` check 1 (does view-shot capture SVG on
    //    Android), §6.3 says the answer must arrive BEFORE the item is built, and §3.1's sequencing
    //    note calls building a plate into a share card and then discovering it cannot be captured
    //    "the one ordering mistake that wastes a whole item". AffirmationCard is the third member
    //    of that group and is NOT a capture target, so it is buildable now and was built now.
    name: 'AffirmationCard',
    file: 'components/readings/AffirmationCard.tsx',
    expected: [
      'app/(main)/astrology/daily.tsx',
      'app/(main)/astrology/monthly.tsx',
      'app/(main)/astrology/weekly.tsx',
      'app/(main)/readings/face.tsx',
    ],
    forbidden: [],
    legacy: [],
    propRules: [],
    literals: [
      [/\bbg-accent-2-muted\b/,
        'design §2 row 16 + §9 row 11 — the secondary-accent wash has exactly two jobs and one of ' +
        'them is THE QUOTE-CARD GROUND. It replaced an amber gradient; §2 keeps one gradient in ' +
        'the whole system and it is the primary Button\'s.'],
      [/\btext-quote\b/, 'design §9 row 11 — the ramp\'s quotation step, which is the one italic face.'],
      [/\bfont-quote\b/,
        'A SIZE UTILITY CARRIES NO FAMILY, so on the className path this is what actually makes the ' +
        'italic face arrive. Without it the step renders in the body face and the gate that catches ' +
        'a WRONG face cannot catch an ABSENT one.'],
      // 🔴 THE LOOKAHEAD IS NOT TIDINESS. `\bbg-accent\b` MATCHES `bg-accent-2` — a word boundary
      //    sits happily before a hyphen, so an assertion on the SHORTEST name in a token family
      //    silently accepts every longer sibling too. Measured: injecting the secondary accent here
      //    left this rule GREEN, and the injection was a deliberate O-17 violation. The porous names
      //    in this palette are exactly the short ones most likely to be asserted — the plain accent,
      //    surface, foreground and body families. Anchor on a non-token character, never on a bare
      //    boundary. ⚠️ `no-white-on-accent`'s className half has the same shape; see the commit body.
      [/\bbg-accent(?![\w-])/,
        '🔴 O-17 / §16.1 — the copy control TRIGGERS AN ACTION, so its fill is the PRIMARY accent. ' +
        'The secondary accent grounds the card because a wash is not a label. Two accents on one ' +
        'card, each in the only role it is allowed to hold, and swapping either breaks the ruling.'],
      [/\btext-on-accent\b/,
        'A5 — the copy control is an accent FILL, so its label has exactly one legal colour. This ' +
        'one was already right; it is pinned because five others in this session were not.'],
      [/accessibilityHint="Copies the affirmation"/,
        'design §9 row 11 specifies this string. The visible label says what the control is called, ' +
        'not what pressing it does to the text above it.'],
    ],
    absent: [
      [/LinearGradient/,
        'design §2 — the system keeps ONE gradient (the primary Button\'s) and this card\'s became ' +
        'a wash. A gradient returning here would read as a style choice, not as a regression.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 8 · EmptyState ═════════════════════════════════════════════════════════════
    // 4 files, 4 call sites — design §9 row 8's "4" measured out unchanged.
    //
    // 🔴 THE FORBIDDEN ENTRY IS THE HALF THAT MATTERS, and it is the reason item 8 exists at all:
    //    qa.tsx held a LOCAL const of the same name. It was never an adopter — a local function is
    //    not a JSX element, so this gate could not have counted it either way — but the collision
    //    meant importing the shared component into that file would have been silently shadowed,
    //    and every human grep counted the screen as an adopter of something it has never rendered.
    //    Renamed at item 8; this entry is what stops it coming back.
    name: 'EmptyState',
    file: 'components/common/EmptyState.tsx',
    expected: [
      'app/(main)/compatibility/history.tsx',
      'app/(main)/readings/face.tsx',
      'app/(main)/readings/index.tsx',
      'app/(main)/readings/palm.tsx',
    ],
    forbidden: [
      ['app/(main)/readings/qa.tsx',
        'its opening panel is a DIFFERENT COMPONENT that shared this name: an icon well, a lede ' +
        'and six suggestion chips, against a centred full-screen surface with one action. It is ' +
        'ChatEmptyState now. 🔴 AND IT CARRIES A SAFETY INVARIANT (audit §9 Q3, HARD): the chips ' +
        'are suppressed in crisis mode by LAYOUT ACCIDENT, with no explicit gate, so this must ' +
        'stay a separate thing that nobody refactors casually.'],
    ],
    legacy: [],
    propRules: [],
    literals: [
      [/\btext-display-sm\b/,
        'design §9 row 8 + P42/O-50 (owner-ruled) — the title takes the small display step. 🟢 The ' +
        'cost item 8 measured (at the 1.3 cap this step and the body step were half a pixel apart ' +
        'and the body\'s line height OVERTOOK the title\'s) is PAID OFF: P42 unfroze the display ' +
        'steps at the same cap, so the ratio is scale-invariant and O-58/P47 close. The module ' +
        'header keeps the table, because the collapse is the evidence the ruling rests on.'],
      [/\bfont-display\b/,
        'A SIZE UTILITY CARRIES NO FAMILY. On the className path the family written at the site IS ' +
        'the rendered face, so a display step without this renders in the body face — O-35, which ' +
        'was live across 23 of 25 sites and which no removal gate could ever see.'],
      [/\btext-sm\b/,
        'the description had a colour and an alignment and NO SIZE AT ALL, so it rendered at the ' +
        'platform default of 14 — off the ramp, between two steps. A rule can see a size that is ' +
        'wrong; none of them can see one that is ABSENT.'],
      [/actionTitle\?: string;/,
        'ONE action pair, never two. A second action needs a NEW PROP, which shows up in a diff.'],
      // ⚠️ THE GLYPH MARKER IS DELIBERATELY *NOT* ASSERTED HERE, and the reason is a genuine
      //    interaction between two halves of this file. `literals` reads the module with COMMENTS
      //    BLANKED (item 6's fix for a guard a paragraph could satisfy), and a marker IS a comment
      //    — so asserting one here can only ever report it GONE. Markers belong to the text-level
      //    checks, and this one is already printed and counted by the FACE half every run, which
      //    is where an exception is supposed to report itself.
    ],
    absent: [
      // Code-shaped on purpose: a bare word would fire on any sentence discussing it, and this
      // half is text-level by design. A prop DECLARATION or a destructure is the actual hazard.
      [/children\s*[?:]/,
        'a children slot is how a second action arrives without a new prop — the one route around ' +
        '"one action maximum" that the prop-shape argument does not close.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 7 · GeneratingReading ══════════════════════════════════════════════════════
    // 5 files, 5 call sites — 🟢 §3.1's "5 · 16%" measured out UNCHANGED, the second scope claim
    // in this phase that did.
    //
    // 🔴 THIS CONTRACT IS ALMOST ENTIRELY AN X17 + ASYMPTOTE CARRY, AND BOTH ARE INVISIBLE ON
    //    ANDROID. X17's three literals here look like dead code on the only platform anyone can
    //    build for, and the four asymptote legs are a PRODUCT decision (the bar must never claim
    //    completion) that reads as an unfinished animation. Nothing else in the tree can see
    //    either. §2.4: this proves they SURVIVED A DIFF, never that they work.
    name: 'GeneratingReading',
    file: 'components/readings/GeneratingReading.tsx',
    expected: [
      'app/(capture)/face-capture.tsx',
      'app/(capture)/palm-capture.tsx',
      'app/(main)/astrology/monthly.tsx',
      'app/(main)/readings/face.tsx',
      'app/(main)/readings/palm.tsx',
    ],
    forbidden: [],
    legacy: [],
    propRules: [],
    literals: [
      [/minWidth: 220/,
        'X17 (c542b20) — the recovery control\'s lower width bound. It is a CALL-SITE style on the ' +
        'primitive now, deliberately, so the literal stays in this file where the guard belongs.'],
      [/maxWidth: 320/, 'X17 — the progress bar\'s upper width bound.'],
      [/height: 8/, 'X17 — the progress bar\'s explicit height. Not padding, not flex.'],
      [/minHeight: 58/,
        'X17, RAISED FROM 44 IN PASS 2b AND THE RAISE RIDES WITH THE SCALING OPT-IN. 44 reserved ' +
        'exactly two lines of 16/22; at the 1.3 cap two lines are 57.2, so the one-vs-two-line ' +
        'jump the guard exists to prevent came straight back. ceil(44 x 1.3) = 58. A FALL back to ' +
        '44 is a finding, not a cleanup.'],
      // 🔴 THE FOUR LEGS OF THE 0.97 ASYMPTOTE. Asserted as four separate literals rather than one
      //    pattern so a failure names WHICH leg went, and so deleting the last one — the only one
      //    whose value is a product decision rather than a curve shape — cannot hide inside a
      //    reformatting diff.
      [/withTiming\(0\.35/, 'asymptote leg 1 of 4 — 12s, the upload and early server work.'],
      [/withTiming\(0\.65/, 'asymptote leg 2 of 4 — 25s, deep analysis.'],
      [/withTiming\(0\.88/, 'asymptote leg 3 of 4 — 45s, generation in progress.'],
      [/withTiming\(0\.97/,
        '🔴 THE ASYMPTOTE ITSELF. The bar plateaus at 0.97 and NEVER reaches 1.0 until the server ' +
        'answers. A bar that completes and then waits reads as a hang, on the one screen where ' +
        'waiting IS the activity. "About a minute" is a range, never a countdown.'],
      [/accessibilityRole="progressbar"/,
        'design §9 row 7 — the progress role with a real value, on the TRACK. This is the ' +
        'component a11y contract, not the label sweep §0.0 rule 5 descoped.'],
      // 🔴 §5.5 LAYER TWO, THE AURA BREATHE — motion item 6. Three legs, and the third is the one
      //    that would silently turn a liveness signal into a dimmed screen.
      [/useAmbient\(0\.5, 1\)/,
        '🔴 §5.5: "opacity 0.5 <-> 1.0 ONLY — no scale, no rotation, no reflow." The RANGE is the ' +
        'spec, and both ends matter: a wider low end reads as the screen browning out, and a range ' +
        'that does not reach 1.0 permanently dims the brightest surface in the app. ⚠️ `useAmbient` ' +
        'also carries R-4\'s reduced-motion branch, so this call is the one thing standing between a ' +
        'vestibular-sensitive user and a screen parked at 50% for sixty seconds.'],
      [/<AnimatedAura/,
        'DECLARED IS NOT RENDERED — the third time this leg has been needed in this phase. The ' +
        'animated component could survive as a dead const while the JSX reverted to a plain ' +
        'LinearGradient, and the screen would render exactly as it does today minus the liveness.'],
      [/StyleSheet\.absoluteFill, auraStyle/,
        '🔴 THE PINNED-AND-INERT MECHANISM, AND IT IS WHY THE BREATHE IS POSSIBLE AT ALL. The wash ' +
        'used to BE the flex parent and carried the opaque ground on the same element, so animating ' +
        'its opacity would have faded THE GROUND TOO — the whole screen dimming on a 2.6s cycle. ' +
        'Grounding it separately and pinning the wash is `ScreenContainer`\'s grain-layer pattern, ' +
        'and it makes this a SWAP rather than an INSERTION into the flex chain (`O-110`).'],
      [/accessibilityValue=/, 'design §9 row 7 — a progress role with no value announces nothing.'],
    ],
    // 🆕 P71 — THE GROUND, AS A COUNT, BECAUSE THIS SCREEN HAS TWO RETURN BRANCHES AND THEY ARE ONE
    //    DECISION. Five of this phase's findings had exactly that shape, and this component has
    //    already produced one of them (a plate in one branch and a pictograph in the other).
    // 🔴 AND BECAUSE A FIX WITH NO NUMBER IS A PREDICTION, which is this session's whole subject.
    // 🔴 NOTHING ELSE IN THE TREE CAN SEE THIS GROUND, and the reason is worth keeping: the A5 pair
    //    rule resolves a FILL DECLARATION against an accent token, and a full-bleed slab names its
    //    accent inside a gradient's stop ARRAY instead — there is no fill declaration anywhere on
    //    the element. So the brightest surface in the app was invisible to the one instrument built
    //    to find accent grounds. ⚠️ The banned spelling is deliberately NOT written in this comment:
    //    the `absent` half below reads TEXT-LEVEL on purpose (`O-68`), so quoting it here would trip
    //    the rule on the paragraph explaining it. Instance N of "a comment is source".
    literalCounts: [
      [/t\.color\['accent-muted'\], t\.alpha\(t\.color\.accent, 0\), t\.alpha\(t\.color\.accent, 0\)/, 2,
        'design §2 row 14 and the aura row — the 14% stop fading to the SAME HUE at zero, in BOTH ' +
        'branches. A FALL to 1 is the two branches diverging on how bright a 60-second wait is; a ' +
        'fall to 0 is the full-strength slab back at 21.3x the specified luminance. 🔴 THE WHOLE ' +
        'STOP LIST IS ONE PATTERN ON PURPOSE: fading to the GROUND instead of to a transparent same-' +
        'hue stop reads as an equivalent edit and is not — it makes the ramp alpha-model-dependent ' +
        'and bulges brighter than stop 1 on one of the two models.'],
      [/backgroundColor: t\.color\.bg/, 2,
        'the ground the translucent stop composites over, in BOTH branches. Without it the aura stop ' +
        'lands on whatever the navigator paints, which is not a decision anyone made. This is the ' +
        'half a reviewer would delete as redundant — the gradient looks like it covers the screen.'],
    ],
    absent: [
      [/colors=\{\[t\.color\.accent,/,
        'P71 — the full-bleed FULL-STRENGTH accent slab. It shipped on five capture flows and was ' +
        'held for 60+ seconds each. The design specifies the aura stop for this surface and always ' +
        'did; this spelling is the one that must never come back.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 13 · LockShell ═════════════════════════════════════════════════════════════
    // 🔴 THE MOST EXPENSIVE ITEM IN THE PHASE AND THE ONE WHOSE SCOPE MOVED MOST. design §9 row
    //    13 says "replaces 3 treatments on 11 sites"; `O-42` corrected that to 28 sites because
    //    the "3" was a FILE count read as a SITE count. Measured again at this commit — 11 files,
    //    36 call sites, so the number has now moved TWICE:
    //
    //      d1  3 sites   astrology/weekly · numerology/name-destiny · readings/career-destiny
    //      d2 29 sites   25 sections + 3 banners + SectionCard's delegating locked state
    //      d3  4 sites   the four card lock overlays (3 live, 1 unreachable by `O-60` ruling)
    //
    // 🔴 AND THE `legacy` ENTRIES ARE THE POINT OF THIS CONTRACT. This is the second item in the
    //    phase to get a real decreasing counter (§0.2 class 1, the class that cannot be blinded):
    //    an adoption count of 36/36 reads COMPLETE while either superseded element is still live
    //    at a single site, and one of them lived in THREE files with SEVEN, NINE and NINE uses.
    name: 'LockShell',
    file: 'components/ui/LockShell.tsx',
    expected: [
      'app/(main)/astrology/monthly.tsx',
      'app/(main)/astrology/weekly.tsx',
      'app/(main)/numerology/name-destiny.tsx',
      'app/(main)/readings/career-destiny.tsx',
      'app/(main)/readings/face.tsx',
      'app/(main)/readings/palm.tsx',
      'components/ui/SectionCard.tsx',
      'components/readings/AffirmationCard.tsx',
      'components/readings/GrowthCard.tsx',
      'components/readings/PalmLineCard.tsx',
      'components/readings/ScoreCard.tsx',
    ],
    // 🔴 THE TWO SURFACES THAT MUST NEVER GATE THEMSELVES IN-PLACE, and neither reason is style.
    forbidden: [
      ['app/(main)/readings/combined.tsx',
        '§4.1 lists this screen\'s early-return lock as a d1 site and the PRE-FLIGHT REFUTES IT ' +
        'BY MEASUREMENT: this screen skips loadAllData() entirely for an unentitled user, so ' +
        'there is no content behind the veil — d1 would be a WALL, which §4.1 explicitly says d1 ' +
        'must not be. It stays a router.replace to the paywall and is `O-41`\'s one replace site, ' +
        'which item 17 must handle rather than convert (converting it changes the back stack).'],
      ['app/(main)/readings/qa.tsx',
        'D8 RESTYLE-ONLY / STRUCTURE-FROZEN, and a crisis-mode safety guarantee rides on that ' +
        'screen\'s layout (audit §9 Q3, HARD). Its own gate is a composer state, not a section.'],
    ],
    legacy: ['LockedSection', 'LockedBanner'],
    // 🔴 R-2 MADE MECHANICAL — see the runner's note. These three numbers are the migration, and
    //    the file list alone could not see any of them move.
    siteCounts: [
      [/density=\{1\}/, 3, 'the full-screen gates: weekly\'s self-gate and O-27\'s two dead ends. ' +
        'A fall here is a screen going back to a raw server error with no upgrade path.'],
      [/density=\{2\}/, 29, '25 locked sections + 3 banners + SectionCard\'s delegating state. This ' +
        'is where the blindness bit: 25 of these live 7/9/9 in three files.'],
      [/density=\{3\}/, 4, 'the four card lock overlays. One (AffirmationCard) is unreachable by ' +
        'the `O-60` ruling and is still counted — it renders the shared treatment either way.'],
    ],
    propRules: [
      // 🔴 CLASS 5 IN ITS PUREST FORM — THE WHOLE VISUAL CONTRACT IS IN ONE NUMERIC PROP, which
      //    is the shape §0.2 says no className grep and no style grep can read. tsc enforces the
      //    per-density prop shapes through the discriminated union; this catches what tsc cannot:
      //    a spread, an `as any`, or a JS call site.
      { prop: 'secondaryTitle', requires: 'onSecondary',
        why: 'the O-27 guarantee — a full-screen gate ALWAYS has an exit. The two destiny screens ' +
             'shipped with none: a raw server tier slug in the danger role and no way forward' },
      // A teaser is d2's and d2's alone. On d3 it would defeat the one property d3 exists for —
      // a locked row matching an unlocked one — and R-B's teaser-through ruling is about d2's 25.
      { prop: 'teaser', forbid: /density=\{(?:1|3)\}/,
        why: '§4.1 — d3 carries NO body copy (the row is the affordance) and d1 takes `body`' },
    ],
    literals: [
      [/const PLATE = 28/,
        '§4.1 d3 — the 28dp plate slot is the ONE dimension this component pins, and it is what ' +
        'makes a locked row the same height as an unlocked one. A row sized to its own content ' +
        'reflows the list it sits in, which is the property d3 exists for.'],
      [/backgroundColor: t\.color\.locked/,
        '🔴 ABSENCE C — the LAST held-value collision in the system, resolved by ROLE. design §2 ' +
        'row 5 names this token the lock-plate fill. Measured: the plate reads 1.15:1 above the ' +
        'raised step it grounds on, which is the LARGEST step in the whole surface ladder (the ' +
        'others are 1.05 and 1.06), and grounding it in the raised step instead would make it ' +
        '1.00:1 — invisible, permanently, and invisible to every gate as well.'],
      [/<BlurView intensity=\{20\}/,
        '§4.1/§4.2 — d1 is the ONLY place in the system that veils anything, and this element is ' +
        'the treatment. ⚠️ On Android the installed expo-blur defaults experimentalBlurMethod to ' +
        '\'none\', so what renders is a flat white tint at 8.6%, NOT a blur. iOS renders the real ' +
        'material. Do not delete it as dead on the strength of an Android screenshot.'],
    ],
    absent: [
      [/tier\s*[?:]/,
        '🔴 THE TIER PROP AND ITS BADGE. `LockedSection` selected a hardcoded tier NAME client-side ' +
        'and rendered it in user-facing copy — an R1 violation, and one of the last three the ' +
        'audit missed. The CTA is tier-neutral by ruling (C-5): the price comes from RevenueCat ' +
        'and the entitlement comes from the server, so the client may not name either.'],
      [/\bicon\s*[?:]/,
        'the section icon prop, measured at ZERO call sites across all 25 before the merge. A ' +
        'zero-call-site option is a defect by the standing rule, and this one had no branch worth ' +
        'keeping — unlike `O-56`/`O-60`, where something real was inside.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEMS 9-10 + THE THIRD SURFACE · the SHARE FAMILY ════════════════════════════════
    //
    // 🔴 THREE NEAR-IDENTICAL COMPONENTS, WHICH BY THE STANDING PRE-FLIGHT RULE MADE THIS THE
    //    HIGHEST-RISK ITEM IN THE BATCH — and the diff paid for the fifth time. What it found was
    //    a class the A5 pair rule is STRUCTURALLY UNABLE TO SEE, so it is worth stating once here
    //    rather than three times in three module headers:
    //
    //      A GRADIENT GROUND IS A FUNCTION OF POSITION, NOT A PROPERTY OF A STYLE RULE.
    //
    //    The A5 pair rule resolves a fill style rule to a label style rule through the style graph;
    //    that join is what made distance irrelevant and what made it blocking at item 7. A
    //    two-colour `colors={[…]}` array is not a fill style rule, and WHICH of its two ends
    //    applies to a given text node depends on that node's vertical offset — which no static
    //    analysis can know. Two of these three cards ran accent-to-canvas, where the on-fill role
    //    (6.86:1 -> 1.06:1) and the plain role (2.31:1 -> 16.84:1) CROSS, leaving a band about a
    //    third of the way down in which NO token in the palette clears AA.
    //
    // 🔴 SO THE CONTRACT BELOW IS SHAPED AROUND THE SUBTRACTION RATHER THAN AROUND A RECOLOUR:
    //    design §2's aura row already retires every gradient slab in the system except the primary
    //    control's fill, so the fix is the ruling that existed all along. `treeAbsent` holds it.
    //
    // ⚠️ AND THE OTHER HALF OF THIS CONTRACT IS A CAPTURE CONTRACT, WHICH IS UNIQUE IN THE TREE.
    //    These surfaces are snapshotted by view-shot and the PNG leaves the app, so two structural
    //    properties are load-bearing in a way no other component's are — and BOTH are invisible on
    //    screen, which is exactly the profile of a property a restyle deletes. See the literals.
    name: 'ShareCard',
    file: 'components/ShareCard.tsx',
    // Measured 2026-08-03 at 161b389. 4 files, 4 call sites — and only ONE of the four passes
    // `numbers` or `onShared`, which is why neither is asserted as a site count.
    expected: [
      'app/(main)/numerology/name-destiny.tsx',
      'app/(main)/readings/career-destiny.tsx',
      'app/(main)/readings/combined.tsx',
      'app/(main)/readings/face.tsx',
    ],
    forbidden: [
      ['app/(main)/readings/qa.tsx',
        'design §14.5/§4.6 — the crisis surface carries nothing decorative at ANY safety state, ' +
        'and it is D8 structure-frozen besides.'],
    ],
    legacy: [],
    propRules: [],
    literals: [
      [/collapsable=\{false\}/,
        '🔴 THE CAPTURE PRECONDITION. Without it Android may flatten the wrapper View out of the ' +
        'native hierarchy and view-shot has no view to snapshot. It affects NOTHING on screen, ' +
        'renders identically, and its loss surfaces only as an export that silently stops working ' +
        '— on the one surface in the app whose output leaves the app.'],
      [/backgroundColor: t\.color\.surface/,
        'ONE OPAQUE STEP, and both words are the assertion. `one` is what gives every foreground a ' +
        'single published contrast figure instead of a range that crosses AA halfway down the card. ' +
        '`opaque` is what keeps the exported PNG free of an alpha channel — which the retired slab ' +
        'delivered only BY ACCIDENT, because it happened to be two solid values.'],
    ],
    absent: [
      [/\bcolor\?: string/,
        '🔴 A FREE-STRING COLOUR PROP ON A TOKEN-GATED COMPONENT. All three call sites passed the ' +
        'accent this component already defaulted to (ruling `O-24` — one colour), so the option ' +
        'bought nothing and cost an ingress: a literal handed in from a screen is resolved inside ' +
        'this module, where no colour rule in the tree is looking for it.'],
    ],
    // 🔴 THE ONE DECREASING COUNTER THIS ITEM GETS, and it is tree-wide on purpose: the retired
    //    slab is not an element this component owns, it is an IDIOM three sibling files shared.
    //    Scoped to the share family by path, because §2 keeps the primary control's fill and 19
    //    other slabs are the screens phase's work, not this item's.
    treeAbsent: [
      [/<LinearGradient/,
        'IN THE SHARE FAMILY ONLY — see the header. Any of the three surfaces growing a gradient ' +
        'back re-creates a ground whose contrast depends on layout, which is the one class the A5 ' +
        'pair rule cannot resolve. (The screens phase owns the other 19 slabs; the primary ' +
        'control\'s fill is X3 and is KEPT.)',
        ['components/ShareCard.tsx', 'components/readings/ShareableQuote.tsx',
          'components/compatibility/CompatibilityShareCard.tsx']],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    name: 'ShareableQuote',
    file: 'components/readings/ShareableQuote.tsx',
    // 🔴 5 call sites in 4 files — `astrology/daily` renders it TWICE, in the new-format and
    //    legacy-format branches, which is why the site count is asserted and the file list is not
    //    enough. Every one of those 5 rendered SUB-AA copy before this item; see the module header.
    expected: [
      'app/(main)/astrology/daily.tsx',
      'app/(main)/astrology/monthly.tsx',
      'app/(main)/astrology/weekly.tsx',
      'app/(main)/readings/palm.tsx',
    ],
    forbidden: [],
    legacy: [],
    siteCounts: [
      [/<ShareableQuote/, 5,
        'design §9 row 10 is silent on reach; measured at 5 across 4 files, because daily.tsx ' +
        'renders one per payload-format branch. A file list reads 4/4/0 complete while one of ' +
        'daily\'s two branches loses its share surface entirely.'],
    ],
    propRules: [],
    literals: [
      [/collapsable=\{false\}/,
        'the capture precondition — see ShareCard\'s copy of this assertion.'],
      [/className="bg-bg rounded-xl overflow-hidden"/,
        '🔴 THE OPAQUE CAPTURE BASE, AND IT IS NEW AT THIS ITEM. The quote-card ground design §2 ' +
        'row 16 names for this surface is a translucent WASH, so unlike the slab it replaces it ' +
        'cannot make the exported PNG opaque by itself. Delete this and the capture can carry an ' +
        'alpha channel that a feed composites against white — invisible in the app, visible only ' +
        'in someone else\'s timeline.'],
      [/text-quote font-quote/,
        'design §9 row 10 specifies the quotation step, and a size utility carries no family, so ' +
        'the face must be named beside it. This component is NAMED for quotes and was rendering a ' +
        'body step in the body face.'],
    ],
    absent: [
      [/text-on-accent text-xl/,
        '🔴 THE WORST REACHABLE TEXT IN THE PROGRAMME, at 5 call sites: the on-fill role on a ' +
        'ground that is only an accent fill at its very top edge. 3.87:1 where the quote started ' +
        'and 1.42:1 where it ended. The on-fill role is correct on this card in exactly one place ' +
        '— the subject pill, which has a real fill.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // 🔴 THE THIRD SHARE SURFACE, AND NOTHING SCHEDULES IT — design §14.6 names it beside the
    //    other two when it widens W1; design §9's component list and this plan's item table both
    //    omit it. It is contracted here so it can never again be the surface no instrument knows
    //    about. 🟢 AND THE PRE-FLIGHT INVERTED: this unscheduled copy held the two properties its
    //    two scheduled siblings got WRONG (a wash ground, and the quotation face on a quotation).
    name: 'CompatibilityShareCard',
    file: 'components/compatibility/CompatibilityShareCard.tsx',
    expected: ['app/(main)/compatibility/[id].tsx'],
    forbidden: [],
    legacy: [],
    propRules: [],
    literals: [
      [/className="bg-surface p-6"/,
        'the flattened ground — one opaque surface step, which is the step its three-stop ramp ' +
        'already spent most of its height on (the label role moves 5.36 -> 5.11, the plain role ' +
        '16.84 -> 16.04). The value of the change is not contrast, it is that all THREE share ' +
        'surfaces now ground the same way, so the next reader cannot copy the wrong one.'],
    ],
    absent: [
      [/text-fg-placeholder/,
        '🔴 THE ROLE-vs-ROLE CLASS. design §2 row 9 contracts the placeholder role to the `Input` ' +
        'placeholder ALONE — it is the one deliberately sub-AA foreground in the palette, and a ' +
        'required label is what makes it safe there. Here it was carrying the brand watermark at ' +
        '3.15:1 on an exported image. It is one of the census\'s 17 and the census drops by one.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 18 · the five PLATES ════════════════════════════════════════════════════════
    //
    // 🔴 ONE MOUNT. THAT IS THE ITEM'S MOST USEFUL OUTPUT AND IT IS WHY THIS CONTRACT IS SHORT.
    //    §0.0 rule 5's descope mounts plates on the funnel screens and Home only. Intersecting that
    //    with §14.5's may-list, surface by surface, leaves exactly ONE new mount — `orbits` on the
    //    capture wait — because every other named surface (the daily astrology header, the
    //    Ask-the-stars card, EmptyState, the monthly reading) is outside the funnel, and the share
    //    cards are banned from all SVG by W1 regardless of any mount map.
    //
    // 🔴 AND THE FIFTH NAME COLLISION OF THE PHASE LIVED HERE. `LockShell` defined a LOCAL function
    //    called `Plate` — its 28dp lock badge — with two call sites. This contract keys on the JSX
    //    element name, so before that local was renamed it counted LockShell as TWO false adopters
    //    of a component that file does not import. The local is now `LockPlate`, which is also the
    //    design's own words for it ("lock-plate fill", §2 row 5).
    name: 'Plate',
    file: 'components/ui/Plate.tsx',
    expected: [
      'components/readings/GeneratingReading.tsx',
      // 🆕 DECLARED AT THE FUNNEL PHASE'S SCREEN 6 — design §10.1.0's MECHANISM 2, which is part of
      //    Home's adopted treatment rather than part of the mount sweep: "one plate inside the
      //    insight hero, right-aligned beside the score", at the width the mechanism names.
      // 🔴 IT IS HOME'S ONLY PLATE AND HOME SPENDS NO OTHER §14 BUDGET. §14.5 bans two plates in one
      //    viewport and §15.2's per-screen budget is one ridge, one arc, one plate; Home already
      //    spends the ridge and the arc, so this is the third and last. A SECOND mount on this
      //    screen is a finding, not an improvement.
      // ⚠️ It is several sections above Home's disclaimer, which §14.5 also requires: a plate beside
      //    a compliance string makes the string read as decoration.
      'components/insights/DailyInsightCard.tsx',
      // ═══ 🆕 THE MOUNT MAP — R-1 REVERSED DESCOPE 3, AND §14.3's OWN SUB-HEADINGS ARE THE MAP ════
      //
      // Descope 3 said "plates mount on the funnel screens and Home only". Intersected with the
      // funnel that left exactly ONE mount, which effectively deleted the plate system — all five
      // plates were BUILT AND GATED and four were unmounted. The cost was in BUILDING them; a mount
      // is one line. R-1: mount every plate at every surface §14.3 names.
      // 🔴 AND "EVERY SURFACE §14.3 NAMES" IS LITERAL: each of §14.3's five sub-headings names its
      //    plate's surfaces after the ratio. Reading them turns a designer question into a
      //    transcription, which is why no mount below was chosen by taste.
      //
      //   lunar         insight hero (Home) · daily astrology header        both mounted
      //   constellation Ask the stars card · EmptyState                     one mounted, one 🔴 DROPPED
      //                 ^ a VERBATIM CITATION of §14.3.2's heading, never app copy. The feature was
      //                   renamed "AI Astrologer" on 2026-08-05 (PM); the design heading did not move.
      // 🔴 `constellation`'s FIRST NAMED SURFACE IS DROPPED, NOT PENDING — 2026-08-04, `P65` CLOSED.
      //    The Ask-the-stars card's ground is an ACCENT FILL and no legal tint clears 1.42:1 there,
      //    so the mount is registered in `forbidden` below with the reason. It is the one entry in
      //    that list whose reason is VISIBILITY rather than product policy, and the enumeration
      //    above would otherwise read as five plates with an unexplained hole.
      //   orbits        astrology hub · GeneratingReading                   both mounted
      //   tide          monthly reading · share cards (post-W1)             one mounted, one blocked
      //   comet         success states · streak record · LockShell d1       🔴 ZERO LEGAL SURFACES
      //
      // 🔴 `comet` STAYS DROPPED, AND IT IS NOW MEASURED RATHER THAN INHERITED (`P56`). All three of
      //    its named surfaces are unavailable: LockShell d1's panel is gated on `P38` check 4, which
      //    has not run; the streak record shares Home's viewport with the insight hero's plate, and
      //    §14.5 bans two plates in one viewport; and "success states" names no component, so
      //    choosing one would be inventing a design assignment (§0.0 rule 2).
      // 🔴 THE PAYWALL HEADER IS ON §14.5's MAY LIST AND TAKES NO PLATE — owner ruling R-3. §14.5
      //    permits several surfaces, so choosing one is inventing an assignment, and it is the
      //    highest-conversion screen in the app. Design debt, not a gap.
      // 🔴 THE SHARE FAMILY TAKES NO SVG AT ALL — §14.6/W1, ruled by the owner as the flat fallback.
      //    So `tide`'s second home and the whole carry matrix's share row are POST-RELEASE.
      'app/(main)/astrology/index.tsx',
      'app/(main)/astrology/daily.tsx',
      'app/(main)/astrology/monthly.tsx',
      // The section-level empty state — §14.5's own second MAY entry, and §9 row 8 pairs the plate
      // with top padding as ONE decision. Item 8 deferred both to item 18; item 18's descope left
      // them unpaid, so this is where that debt is settled. Four call sites inherit it from the
      // component, which is also what stops any of them re-adding a pictograph.
      'components/common/EmptyState.tsx',
    ],
    // 🔴 THREE SITES ACROSS TWO FILES, SO THE FILE LIST CANNOT SEE ONE OF THEM GO — `O-67` again.
    //    The wait screen renders the plate in its live branch AND in its unreachable error branch,
    //    and both are deliberate: leaving one branch with the retired pictograph and the other with
    //    the plate is exactly the divergence that has produced five findings in this phase, and an
    //    unreachable branch is where nobody looks. Home's hero is the third.
    siteCounts: [
      [/<Plate\b/, 7, 'the wait screen\'s live state AND its unreachable error state (two sites in ' +
        'ONE file, which is why a file list alone cannot see one of them go — O-67), Home\'s insight ' +
        'hero, the astrology hub, the daily header, the monthly header, and the empty-state ' +
        'component. A FALL is a mount lost — most likely the wait screen\'s two branches diverging ' +
        'again, which is the shape that has produced five findings in this phase. A RISE is a mount ' +
        'nobody recorded, and §14.5 bans two plates in one viewport, so a rise is also the most ' +
        'likely way that ban gets broken.'],
    ],
    // 🔴 §14.5's MUST-NOT list, and every entry is a product rule rather than a style preference.
    forbidden: [
      ['app/(main)/readings/qa.tsx',
        '🔴 §14.5 — the crisis surface carries ZERO of everything in §14-§15, at EVERY safety state ' +
        'and not just the crisis one. That ban is BROADER than §4.6\'s texture exclusion, and the ' +
        'screen is D8 structure-frozen besides.'],
      ['app/(capture)/face-capture.tsx',
        '§14.5 — nothing decorative over a live camera preview.'],
      ['app/(capture)/palm-capture.tsx',
        '§14.5 — nothing decorative over a live camera preview.'],
      ['components/ShareCard.tsx',
        '🔴 W1 / §14.6 — the share surfaces render ZERO react-native-svg nodes until view-shot ' +
        'capture of SVG is verified on Android, and the owner RULED the flat fallback rather than ' +
        'waiting for the check. The plate there is a POST-RELEASE upgrade (`P51`), purely additive.'],
      ['components/readings/ShareableQuote.tsx',
        'W1 / §14.6 — as above. This is the surface the tide plate is actually spec\'d for.'],
      ['components/compatibility/CompatibilityShareCard.tsx',
        'W1 / §14.6 names this third surface explicitly. Same ban.'],
      ['app/(main)/readings/index.tsx',
        '🔴 §14.3.2 NAMES THIS SURFACE — "Ask the stars card" — AND THE MOUNT IS DROPPED, 2026-08-04 ' +
        '(`O-86` / `P65`, CLOSED). ' +
        '🔴 BUT READ THIS FIRST, 2026-08-05: **THE MEASUREMENT BELOW IS SUPERSEDED AND THE RULING NOW ' +
        'RESTS ON SOMETHING ELSE.** The reasoning was entirely about this card\'s ACCENT FILL, and ' +
        'that fill is gone — all seven cards on this screen were restored to the card ground, because ' +
        'seven full-bleed accent cards was a design regression that passed every gate (A5 and A6 ' +
        'enforce CONTRAST, not DESIGN INTENT). On the card role the three legal tints measure ' +
        '5.11 / 9.89 / 3.87 — the surface steps §14.2 chose the allow-list FOR — so "nobody can see ' +
        'it" is no longer true here. ' +
        '🟢 THE MOUNT STAYS DROPPED ON A DIFFERENT AND NARROWER BASIS: re-mounting is now a DESIGN ' +
        'ADDITION rather than the reversal of a visibility finding, §0.0 rule 1 takes the smaller ' +
        'change, and §14.5\'s one-plate-per-viewport is satisfied here only trivially (the empty-state ' +
        'plate sits behind an early return). **It is an owner/designer call, and it is registered as ' +
        'one rather than left reading as a measurement.** ' +
        '⚠️ THE SUPERSEDED MEASUREMENT IS KEPT VERBATIM BELOW, not deleted: it is the reason the ' +
        'entry exists, and a ruling whose basis is quietly swapped is how a decision becomes folklore. ' +
        'As measured on the ACCENT FILL that no longer exists: all three legal tints were ' +
        '1.42 / 1.36 / 1.15, and the component draws its accent NODES internally so a node landed at ' +
        '1.00:1 — invisible. ' +
        '🟢 AND THE RESOLUTION IS A RECLASSIFICATION, NOT A HUNT FOR A TINT. WCAG exempts purely ' +
        'DECORATIVE graphics from contrast entirely and a plate carries no information (§14.5, and ' +
        'it is hidden from the accessibility tree), so §14.2\'s floor here is a VISIBILITY standard ' +
        'rather than a compliance one — the same reading owner ruling R4 applied to `tide` at ' +
        '~2.0:1 (`O-20`). That inverts the question: this is not "which tint is legal" but "can ' +
        'anyone SEE it", and at 1.15-1.42 nobody can. A plate nobody can see still costs binary ' +
        'weight and a render. ' +
        '🔴 WIDENING THE ALLOW-LIST WAS THE WRONG FIX AND STAYS REFUSED: an on-fill tint makes a ' +
        'plate mountable on EVERY accent fill in the app, which §14.2\'s stroke-floor argument never ' +
        'sanctioned, and §0.0 rule 2 forbids inventing the value. ' +
        '⚠️ THIS ENTRY IS WHAT KEEPS THE DROP FROM READING AS AN OVERSIGHT. §14.3.2\'s heading still ' +
        'names the surface, so without a registered NO-PLATE ruling the next reader finds an ' +
        'unmounted named surface and mounts it.'],
      ['app/(paywall)/index.tsx',
        '⚠️ NOT A BAN — A REGISTERED GAP, kept here so it cannot be closed by accident. §14.5 says ' +
        'the paywall header MAY carry a plate and it IS the funnel\'s last screen, but §14.3 assigns ' +
        'each of the five to named surfaces and this is not among them. Choosing one would be ' +
        'inventing a design assignment (§0.0 rule 2). It needs a designer, not a session.'],
      ['components/subscription/FeatureComparisonTable.tsx',
        '§14.5 — never inside package cards; the commerce objects stay pure.'],
      ['components/common/EntertainmentDisclaimer.tsx',
        '🔴 §14.5 — never adjacent to a disclaimer. This one protects X8/X9\'s compliance strings ' +
        'from reading as decoration, which is a legal concern rather than a visual one.'],
    ],
    legacy: [],
    propRules: [],
    literals: [
      [/accessibilityElementsHidden/,
        '🔴 §14.1.1 / owner ruling R4, HALF ONE OF TWO — iOS. A plate carries no information, so it ' +
        'must leave the accessibility tree entirely rather than inject anonymous nodes across every ' +
        'hub and hero. Its absence is invisible unless someone runs a screen reader, and nothing in ' +
        'this repo\'s verification stack does.'],
      [/importantForAccessibility="no-hide-descendants"/,
        '🔴 HALF TWO — Android. Both props are required; they are platform-specific and NEITHER ' +
        'covers the other, so shipping one leaves the other platform announcing the plates.'],
      [/preserveAspectRatio="xMidYMid meet"/,
        '§14.4 — A PLATE NEVER STRETCHES. With the fixed box this is also what makes every plate ' +
        'removable without reflow, which is what makes each §14.5 ruling a variant rather than a ' +
        'redesign.'],
      // 🔴 §18.1 ROW 1's PLATE ENTRY — motion item 7. Two legs, and the second is the one that would
      //    turn a sequenced arrival back into a parallel one.
      [/const entrance = usePlateEntrance\(\)/,
        '🔴 §18.1 row 1 — OPACITY ONLY, `dur-slow` 420, and SEQUENCED AFTER the host card lands. ' +
        '⚠️ THE DELAY LIVES IN THE HOOK ON PURPOSE, derived from the card entrance\'s own duration, so ' +
        'retiming the card cannot desynchronise the plate. Inlining a number here would drift the ' +
        'moment `dur-moderate` moved — and it would drift SILENTLY, as the two simply start ' +
        'overlapping again. §18.1: "two things arriving at once reads as jitter."'],
      // ⚠️ NO `$` ANCHOR: every .tsx here is CRLF, so an end-of-line anchor never matches (the same
      //    class as `inject-harness.sh` defect 3).
      //
      // 🔴 THIS ENTRY IS THE INVERSE OF WHAT IT SAID UNTIL 2026-08-05, AND THE OLD VERSION ASSERTED
      //    THE DEFECT. It required `<AnimatedSvg`, i.e. the animated style ON the `<Svg>` root — which
      //    is precisely the form that made every plate in the app INVISIBLE on the cut-3 device.
      //    `react-native-svg@15.11.2`'s `Svg.render()` CLONES the incoming `style` onto its inner
      //    `<G>` (`const gStyle = Object.assign({}, StyleSheet.flatten(style))`), a separate host
      //    node reanimated never owns, so an opacity-0 entrance freezes the whole drawing at group
      //    opacity 0 for the life of the mount. Full mechanism in the module header.
      // ⚠️ SO IT IS ALSO AN `O-67` INSTANCE WEARING A THIRD FACE: the assertion was green, exact and
      //    pointed at the wrong element. A gate can only pin the form you believed was correct.
      [/<Animated\.View/,
        '🔴 THE ENTRANCE RIDES A FIRST-PARTY `Animated.View` WRAPPER, NEVER THE `<Svg>` ROOT — see ' +
        'the module header for the measured `gStyle`-clone mechanism, and `motion-arrival-check.js` ' +
        'rule 10 for the general form of the ban. ⚠️ DECLARED IS NOT RENDERED, which is why this keys ' +
        'on the JSX and not on an import: the wrapper could be dropped and every plate would simply ' +
        'be PRESENT with no other gate able to see the difference.'],
      // 🔴 THE STROKE FLOOR MOVED TO A *COUNT* BECAUSE A RE-VALIDATION CASE ESCAPED — the X20
      //    lesson repeating one item later. The literal appears TEN times, so changing ONE stroke
      //    left a presence assertion green. See `literalCounts` below.
      [/opacity=\{0\.45\}/,
        '⚠️ §14.3.7 (ii) — the tide plate\'s recessed strokes breach §14.2\'s contrast floor as drawn ' +
        '(~3.2:1 and ~2.0:1). It is the ONLY specimen that does, and §14.3.7 records it as a designer ' +
        'judgement rather than a WCAG failure because a plate is decorative and hidden from the tree. ' +
        'Preserved EXACTLY. Raising them to ~0.85/~0.7 is the other reading and it is not a session\'s ' +
        'call — asserted so that "fixing" it has to be a deliberate act.'],
    ],
    literalCounts: [
      [/strokeWidth=\{STROKE\}/, 10,
        '§14.2\'s floor through one constant so the five plates cannot drift apart — lunar 2, ' +
        'constellation 1, orbits 3, tide 3, comet 1. A FALL means one plate now strokes at a ' +
        'different width than the other four, which is the drift the shared constant exists to ' +
        'prevent and which a presence check could not see.'],
    ],
    absent: [
      [/#[0-9A-Fa-f]{6}/,
        '🔴 §14.3.6 — the three literals in the verbatim markup are TOKENS and the substitution is ' +
        'NOT OPTIONAL: a plate containing raw hex fails `no-raw-hex`. The host colour is the tint ' +
        'prop; the two node colours are the primary and secondary accents.'],
      [/createAnimatedComponent/,
        '🔴 THE PAIRING THAT SHIPPED CUT 3 AND MADE EVERY PLATE INVISIBLE. `createAnimatedComponent` ' +
        'over ANY `react-native-svg` element must never carry a `style`, because that library clones ' +
        'the style onto a second host node reanimated does not own. This file has no legal use for ' +
        'the helper at all now — the entrance is a first-party `Animated.View`. The tree-wide half of ' +
        'this ban is `motion-arrival-check.js` rule 10.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 19 · the four SHAPE PRIMITIVES ═══════════════════════════════════════════════
    //
    // 🔴 ONE MODULE, FOUR EXPORTS, AND THE CONTRACT KEYS ON `RidgeField` — the one whose mount is
    //    the most dangerous, because it is rendered from inside `ScreenContainer` and that primitive
    //    is on 25 screens. The prop is opt-in and exactly ONE screen passes it; a ridge painted
    //    unconditionally would not be a smaller descope, it would be the descope deleted.
    name: 'RidgeField',
    file: 'components/ui/ShapePrimitives.tsx',
    expected: ['components/ui/ScreenContainer.tsx'],
    forbidden: [
      ['app/(main)/readings/qa.tsx',
        '🔴 §14.5 via §15.2 — the crisis surface carries ZERO of §14-§15 at every state, and it ' +
        'animates nothing.'],
      ['app/(capture)/face-capture.tsx', '§14.5 — nothing decorative over a live camera.'],
      ['app/(capture)/palm-capture.tsx', '§14.5 — nothing decorative over a live camera.'],
    ],
    legacy: [],
    propRules: [],
    literals: [
      [/accessibilityElementsHidden: true/,
        '🔴 §14.1.1 scopes its ruling to plates and says of these four: "apply it there too, in the ' +
        'primitives phase, RATHER THAN ASSUMING THIS RULE REACHES THEM." So it is asserted here as ' +
        'well as on the plates — same property, separate component family.'],
      [/importantForAccessibility: 'no-hide-descendants'/,
        'the Android half. Both, always.'],
      [/const BLEED = 20/,
        '🔴 §15.3 point 3 IS A CONSTRAINT, NOT A DETAIL. The reference ridge runs x = -20 -> 380 ' +
        'inside a 360-wide box specifically so the curve has NO VISIBLE ENDPOINTS. A ridge clipped ' +
        'to 0 -> w shows two stubs at the screen edges — which is what "keep that when ' +
        'parameterising" means, and it is the kind of thing a cleanup deletes as a magic number.'],
      [/0\.55/,
        '§15.1\'s crest, fixed at 55%. §15.3 point 2 checks the generated path against the drawn ' +
        'instance and the crest lands at 55.6% of 360 — a faithful generalisation of the comp, which ' +
        'is the only ground on which a generator may replace a drawing.'],
      [/'accent-muted' : 'accent-2-muted'/,
        '§15.1 — the blob is the ONLY fill-not-stroke primitive and it fills a WASH, never a solid. ' +
        'It replaces the radial aura INSIDE cards; the full-bleed screen auras are untouched.'],
      // ── 🔴 THE ONE-SHOT DRAW-IN — owner-requested 2026-08-06, design §18. Four assertions, and
      //    each one is a different way the same feature goes silently dead.
      [/const AnimatedPath = Animated\.createAnimatedComponent\(Path\)/,
        '🔴 THE CARRIER. A `react-native-svg` node may carry `animatedProps` and MUST NOT carry a ' +
        '`style` — that library clones `style` onto a second host node reanimated does not own, ' +
        'which is what shipped every plate in the app invisible at cut 3. This wrapper is declared ' +
        'in `motion-arrival-check.js`\'s LEG B WRAPPERS table with its channel stated.'],
      [/<AnimatedPath/,
        '🔴 DECLARED IS NOT RENDERED — the fifth time this leg has been needed in this phase. The ' +
        'wrapper above can exist, the hook can be called, and the JSX can still be the plain ' +
        'element: the line draws instantly and nothing else in the stack can see it.'],
      [/animatedProps=\{draw\}/,
        'the channel actually ATTACHED at the call site. A hook whose return value is computed and ' +
        'then dropped is the same defect one level in — `tsc` is clean either way, because the prop ' +
        'is optional.'],
      [/strokeDashoffset=\{len\}/,
        '🔴 THE UNDRAWN FIRST FRAME. The static offset must equal the dash period, or the stroke is ' +
        'fully painted for the frame before reanimated attaches and the draw reads as a flicker. ' +
        'Same reason `CompatibilityScoreRing` sets its own static offset beside its dash array.'],
      [/return Math\.ceil\(total\)/,
        '🔴 THE ROUNDING DIRECTION, AND IT IS NOT COSMETIC. The dash period must be at least the ' +
        'path length or the start state is not fully hidden — a shorter period leaves a visible ' +
        'stub at the start of the curve for the whole wait. Rounding DOWN is a visible defect; ' +
        'rounding up costs a few milliseconds of nothing at the end of the sweep.'],
    ],
    absent: [
      // 🔴 THE OWNER RULED AGAINST A PERPETUAL LOOP ON THIS FAMILY, on battery and low-end-Android
      //    grounds, AFTER FIRST ASKING FOR ONE (design §18). That makes "add a slow drift here" the
      //    single most likely well-meant regression in this file, and the only instrument that could
      //    ever see it is an absence. ⚠️ Text-level, like every `absent` — this module's prose says
      //    "a perpetual loop" and names NEITHER the repeat primitive nor the ambient hook, so the
      //    rule cannot be satisfied by the paragraph forbidding the thing (`O-68` direction 2).
      [/withRepeat/,
        '🔴 NO PERPETUAL LOOP IN THE SHAPE PRIMITIVES. Owner ruling 2026-08-06: ambient drift was ' +
        'REQUESTED, then DECLINED on battery grounds, and the one-shot draw-in is what replaced it. ' +
        '`dur-ambient` is reserved for the one surface that communicates ongoing work (§5.5\'s wait ' +
        'screen) — the same rule that declined the skeleton shimmer. A drifting hairline ' +
        'communicates nothing and keeps the UI thread awake for as long as the screen is open.'],
      [/useAmbient/,
        'the same ruling, reached through the module\'s own loop helper rather than the renderer\'s ' +
        'primitive. Both spellings, because closing one and leaving the other is how a ban becomes ' +
        'a speed bump.'],
      [/Math\.random/,
        '🔴 THE SEED MUST BE DETERMINISTIC OR THE BLOB RESHAPES ON EVERY RENDER. §15.1 scopes the ' +
        'seed PER SCREEN, and "deterministic per user" was a prompt suggestion the owner did NOT ' +
        'take — so per-user seeding must not arrive either.'],
      [/stroke=\{[^}]*\}\s*[^>]*fill=\{t\.color\['accent-muted'\]/,
        '§15.1 — the blob takes NO STROKE. The wash is the whole object.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ BackButton — THE WAY BACK, CONTRACTED AS A CLASS ════════════════════════════════════
    //
    // 🔴 THE ADOPTER LIST IS THE NAVIGATION GRAPH, NOT A REVIEWER'S TWO SCREENSHOTS. Every
    //    `push`/`replace`/`navigate` edge in `app/` + `components/`, counted per destination:
    //    five destinations are reachable from more than one entry point and carried NO way back.
    //    Two were reported; the other three are the same defect nobody happened to open. The six
    //    tab roots are also multi-entry and correctly carry nothing — a tab root is not pushed.
    //
    // 🔴 THE `absent` ROW BELOW IS THE ONE THAT KEEPS THIS HONEST, and it is aimed at the exact
    //    "fix" a later reader will reach for. The component renders NOTHING when there is nothing
    //    beneath it, because three of the five adopters are reached BOTH by push and by replace —
    //    the onboarding path replaces into the birth-data screen, the capture screens replace into
    //    the two reading screens, and sign-out replaces into the sign-in screen. Re-adding a bare
    //    unguarded call at any adopter puts a dead control on the first screen a new install sees.
    //
    // ⚠️ SEVEN FURTHER SCREENS HAVE A HAND-ROLLED COPY OF THIS IDIOM AND ARE NOT MIGRATED HERE.
    //    Two of them are structure-frozen by ruling and a component swap is exactly what that
    //    forbids; the other five are push-only, so they are correct as they stand and moving them
    //    would be a diff with no defect behind it. Named, so the residue is a decision.
    // ═══ LockSlot · the gated-card lock affordance ═══════════════════════════════════════════
    //
    // 🔴 IT IS HERE BECAUSE OF WHAT NOTHING ELSE COULD SEE. The tier-badge treatment this replaces
    //    was retired from the readings hub and from Home, and it SURVIVED on the numerology hub's
    //    Name Destiny tile for two more sessions — the same destination, the same entitlement, a
    //    second rendering. Every gate passed the whole time, and correctly: the badge's contrast was
    //    fine, so `A5` and `A6` had nothing to say, and the replacement lived as a LOCAL function
    //    inside one screen, which no adoption count can reach. **The gates enforce CONTRAST; this
    //    row is what enforces the INTENT.**
    // ⚠️ THE EXPECTED LIST IS THE POINT, not the file's existence. A third gated card hand-rolling
    //    its own marker is exactly the shape that produced this, and a residue line is the only
    //    instrument that would print it.
    name: 'LockSlot',
    file: 'components/ui/LockSlot.tsx',
    expected: [
      'app/(main)/readings/index.tsx',
      'app/(main)/numerology/index.tsx',
    ],
    forbidden: [],
    legacy: [],
    propRules: [],
    literals: [
      [/name="lock-closed" size=\{20\}/,
        '§9.2 names the lock glyph and its size. An emoji or a text glyph here is the class §9.2 ' +
        'retired system-wide — the same character is a different picture per OEM.'],
      [/color=\{t\.color\['fg-muted'\]\}/,
        '🔴 THE MUTED ROLE, NOT THE ACCENT. §2 row 8 is labels · meta · locked-row subtitle; this ' +
        'is a STATE indicator, not an action. The accent in these cards belongs to the CTA and the ' +
        'category icon, and a third accent in one card is the treatment this component removes.'],
      [/accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/,
        'the locked state is already carried in text by each card\'s own CTA, so a bare icon ' +
        'announcing itself would be a second, worse announcement. Decorative is the correct call ' +
        'and it is NOT a shortcut around the CUT label sweep (P78).'],
    ],
    // 🔴 A TEXT-LEVEL ABSENCE, AND THE ASYMMETRY IS DELIBERATE (`O-68`): a comment naming the retired
    //    literal fails LOUDLY and is a reason to reword the comment, which is why the header above
    //    calls it "the tier-badge treatment" and never spells it.
    absent: [],
    textFamily: false,
    textOptIn: false,
  },
  {
    name: 'BackButton',
    file: 'components/ui/BackButton.tsx',
    expected: [
      'app/(auth)/login.tsx',
      'app/(auth)/signup.tsx',
      'app/(capture)/birth-data.tsx',
      'app/(main)/readings/face.tsx',
      'app/(main)/readings/palm.tsx',
    ],
    forbidden: [],
    legacy: [],
    propRules: [],
    literals: [
      [/if \(!router\.canGoBack\(\)\) return null;/,
        '🔴 THE GUARD IS THE COMPONENT. Without it this is five copies of a four-line idiom and ' +
        'three of the five adopters get a control that does nothing when pressed.'],
      [/accessibilityLabel="Go back"/,
        'an icon has no accessible name and there is no visible text to borrow one from.'],
      [/hitSlop=\{\{ top: 12, bottom: 12, left: 12, right: 12 \}\}/,
        'the 48dp tap floor bought where nothing lays out: the glyph is 24, so 24 + 12 + 12. ' +
        'Padding would move the rows this sits in; every adopter already has its own spacing.'],
    ],
    absent: [],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 15 · Sheet ══════════════════════════════════════════════════════════════════
    //
    // 🔴 TWO ADOPTERS, NOT THE FOUR design §9 ROW 15 NAMES, AND THE DIFFERENCE IS MEASURED RATHER
    //    THAN CHOSEN. That row scopes this to "4 account modals + pickers + info". Four of the five
    //    account modals are FULL-SCREEN PAGE SHEETS — header, safe-area frame, the canvas as ground,
    //    multi-field forms inside (three password fields in one of them). They are not sheets, and
    //    converting one is a screens-phase restructure that would ALSO import §2.1's prohibition
    //    into a file where the danger role is currently legal: their errors render on the canvas at
    //    5.17:1 and would become 4.28:1 the moment the ground changed. Class 7, again.
    //
    // 🟢 THE TWO REAL ADOPTERS ARE THE TWO SURFACES THAT ALREADY HAD THIS SHAPE — the logout
    //    confirm, and the astrology hub's assumed-time note, which is the one §3.1 sequences this
    //    item before the hub's screens work FOR: it hand-rolled a sheet out of seven StyleSheet
    //    rules, and `treeAbsent` below is the decreasing counter that proves they are gone.
    name: 'Sheet',
    file: 'components/ui/Sheet.tsx',
    expected: [
      'app/(main)/astrology/index.tsx',
      'components/account/LogoutConfirmModal.tsx',
    ],
    // 🔴 THE FORBIDDEN LIST IS THE HIGH-VALUE HALF HERE, AND NEITHER ENTRY IS ABOUT STYLE.
    forbidden: [
      ['app/(paywall)/index.tsx',
        '🔴 §3.1 item 15 — NOT THE PAYWALL. RevenueCat runs on the legacy old-arch interop bridge, ' +
        'so there is no frame-synchronised animation tied to a purchase callback; and X19 pins that ' +
        'screen\'s stacking with BOTH zIndex 50 and the codebase\'s only `elevation`, which a sheet ' +
        'would sit inside and fight. It is the highest-revenue surface in the app.'],
      ['app/(main)/readings/qa.tsx',
        '🔴 NOT THE CRISIS SURFACE. D8 restyle-only / structure-frozen, and a crisis-mode safety ' +
        'guarantee rides on that screen\'s layout (audit §9 Q3, HARD). §14.5 excludes it from ' +
        'everything decorative at EVERY safety state, not just the crisis one.'],
    ],
    legacy: [],
    propRules: [
      // The dismiss handler is not optional and tsc enforces it; this catches a spread or an `as
      // any` past the union. A sheet whose scrim is its labelled dismiss button and which has no
      // handler to call is a modal with no exit — and the gesture that would normally save the
      // user does not exist in this build.
      { prop: 'visible', requires: 'onDismiss',
        why: 'a presented sheet must have an exit; there is no drag gesture in this build to fall ' +
             'back on, so the scrim and the cancel action are the ONLY ways out' },
    ],
    literals: [
      [/backgroundColor: t\.color\['surface-overlay'\]/,
        'design §9 row 15 — this is the ONLY component in the system grounded on the overlay step, ' +
        'which is why §2.1\'s prohibition lands here and only here.'],
      [/borderTopLeftRadius: t\.radius\.xl/,
        'TOP CORNERS ONLY (design §9 row 15). Four rounded corners make it a floating card, and the ' +
        'bottom two are clipped off-screen anyway.'],
      [/t\.alpha\(t\.color\.scrim, 60\)/,
        'the scrim at 60%, in its ONE legal spelling. A bare reference to this token is an OPAQUE ' +
        'overlay — that is what `no-bare-scrim` is a permanent invariant at 0 for — and 60 is on ' +
        'the 5-step opacity scale alpha() requires.'],
      [/accessibilityLabel="Dismiss"/,
        'design §9 row 15 — THE SCRIM IS A LABELLED DISMISS BUTTON, not a bare touchable. A tap ' +
        'target that closes a modal and announces nothing is the reason the spec says so.'],
      [/accessibilityViewIsModal/,
        'design §9 row 15 — the sheet subtree is modal to assistive tech.'],
      [/setAccessibilityFocus/,
        'design §9 row 15 — focus moves to the title on present. There is no declarative prop for ' +
        'this on either platform, so its absence is invisible unless someone runs a screen reader.'],
      [/paddingBottom: 24 \+ insets\.bottom/,
        '🔴 ANCHORED TO THE SCREEN EDGE. Every card floats inside a padded scroll view; this one sits ' +
        'UNDER the home indicator and the Android system row unless it pays for them itself. ' +
        'Dropping the inset puts the cancel action beneath the system bar — which on Android is the ' +
        'class of defect Build 22 had to fix five times. ⚠️ THIS ENTRY USED TO CLAIM IT WAS THE ONLY ' +
        'SUCH SURFACE IN THE APP AND THAT WAS NEVER TRUE: the tab bar and seven capture-screen ' +
        'anchors are too. The claim went unchallenged until a founder report from a 3-button device ' +
        'found the class — `A7 window edge · bottom clearance` at the end of this file is its home, ' +
        'and this expression is the pattern the other eight now follow.'],
    ],
    absent: [
      [/text-danger|t\.color\.danger/,
        '🔴 DESIGN §2.1, THE ONLY SURFACE-ROLE PROHIBITION IN THE SYSTEM: the danger role is banned ' +
        'as text on the overlay step at any size and any weight (4.28:1, below AA). This component ' +
        'is the only one grounded there, so the ban is enforceable as a single-file assertion — ' +
        'which is exactly what §3.1\'s gate for this row asks for.'],
      [/fg-muted/,
        '🔴 AND THE MUTED ROLE IS UNSAFE HERE TOO, 4.44:1 — seven hundredths above the value the ' +
        'line above prohibits (`O-66`). §2 publishes that role at 5.36/5.11/4.81/4.43 across the ' +
        'four surface steps and this component sits on the LAST one, so the figure a reader is most ' +
        'likely to quote is the one that does not apply. Body copy takes the reading role.'],
    ],
    treeAbsent: [
      [/styles\.assumedNote/,
        '🔴 THE SEVEN HAND-ROLLED SHEET RULES — backdrop, card, title, body, CTA, CTA label and ' +
        'dismiss. §3.1\'s gate for this item names them, and they were the astrology hub\'s ENTIRE ' +
        'StyleSheet: the file now declares no styles at all. This is the one decreasing counter ' +
        'this item gets, and an adoption count of 2/2/0 reads complete without it.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
  {
    // ═══ §9 ITEM 15's OTHER HALF · DeleteAccountModal, AND X20 STOPS BEING PROSE ══════════════
    //
    // 🔴 THIS ENTRY EXISTS BECAUSE THE OWNER'S INSTRUCTION FOR THIS ITEM WAS "PIN THE PAIRING
    //    PERMANENTLY", AND IN THIS PROJECT THAT MEANS ONE THING: MOVE IT OUT OF PROSE. design §2.1's
    //    R-4 block says of this exact site that "this paragraph and the in-file comment are the
    //    entire control" — and CLAUDE.md's superseded A5 ruling proves where that ends up. Prose does
    //    not control anything. The button has been a contrast defect THREE times, each quieter than
    //    the last: 4.83:1 on main (passing AA by accident), 3.76:1 after 1b's mechanical remap,
    //    3.26:1 after the flip. Every occurrence came from deriving the colours at the site.
    //
    // 🔴 IT IS NOT ABSORBED BY `Sheet`, AND THE REASON IS MEASURED. §2.2 phrases the absorption as
    //    conditional. This is a FOUR-STEP flow — warning, confirmation, processing, complete — with
    //    two of those steps needing full-screen space, and it renders the danger role EIGHT times as
    //    bullets and wash copy. That is legal today at 4.92:1 because its ground is a card on the
    //    canvas; on `Sheet`'s overlay ground every one of those becomes §2.1's 4.28:1 prohibition.
    //    So migrating it would CREATE eight violations of the rule this item exists to enforce.
    //    X20 therefore stays live, X3 does not take over, and both fixed heights remain.
    name: 'DeleteAccountModal',
    file: 'components/account/DeleteAccountModal.tsx',
    expected: ['app/(main)/profile.tsx'],
    forbidden: [],
    legacy: [],
    propRules: [],
    literalCounts: [
      [/height: 56/, 2,
        '🔴 X20 — BOTH hand-rolled destructive controls, and the count is the assertion because the ' +
        'two are spelled IDENTICALLY. A presence check passes with one of them deleted. X20 is the ' +
        'only fixed-height-plus-className-typed pair among 71 fixed-height sites in the tree.'],
    ],
    literals: [
      [/'bg-danger' : 'bg-surface-raised'/,
        '🔴 THE DISARMED GROUND, AND IT IS WHY THE PRIMITIVE COULD NOT ABSORB THIS BUTTON. V-6 gives ' +
        '`Button` ONE disabled model — the fill stays at full strength and only the label recedes. ' +
        'This control swaps the GROUND instead. Absorbing it without teaching the primitive a second ' +
        'model would render a full-strength red "Delete My Account" that is NOT ARMED, on the app\'s ' +
        'most destructive flow: a worse affordance than today\'s.'],
      [/'text-on-accent' : 'text-fg-disabled'/,
        '🔴 THE LABEL PAIR, BOTH HALVES IN ONE ASSERTION SO NEITHER CAN MOVE ALONE. Armed is a ' +
        'danger FILL, whose only legal foreground is the on-fill role; disarmed is a raised-surface ' +
        'ground, whose label is the disabled role per §2 row 10. The 3.26:1 defect was this ternary ' +
        'reading the PLAIN role on the armed half.'],
      [/className="bg-danger rounded-pill items-center justify-center"/,
        'the FIRST destructive control (Continue). It is the half that was already correct when the ' +
        'ledger recorded both as correct, which is how the second one\'s 3.26:1 survived review.'],
    ],
    absent: [
      [/text-fg text-base font-body-semi/,
        '🔴 THE EXACT SHAPE OF THE THIRD DEFECT: the plain foreground as a destructive label. On a ' +
        'danger fill it measures 3.26:1 post-flip, and it is a 16px semibold label so 4.5:1 is the ' +
        'floor. `no-white-on-accent` cannot see this site and never could — the fill is an ' +
        'interpolated ternary inside a template className and the label is a separate element.'],
    ],
    textFamily: false,
    textOptIn: false,
  },
  {
    // ═══ §9 ITEM 14 · THE TAB BAR ════════════════════════════════════════════════════════════
    //
    // 🔴 THIS CONTRACT HAS NO ADOPTION LIST AND THAT IS THE HONEST SHAPE, NOT A GAP. The tab bar
    //    is a CONFIGURATION BLOCK with exactly one instance and zero call sites — there is nothing
    //    for an `expected` list to enumerate. Every other entry in this file answers "did the
    //    primitive arrive everywhere it should?"; this one answers "did X18 survive, and did the
    //    two designed states arrive?", so it is literals all the way down. Writing an empty
    //    adoption line rather than omitting the entry is deliberate: the alternative is a component
    //    with no gate at all, which is how the phase's other blind spots started.
    //
    // 🔴 AND IT IS THE HIGHEST-CONSEQUENCE LITERAL SET IN THE PHASE AFTER X1. The three numbers
    //    below are coupled to `useBottomInsetPadding` on FIVE screens, one of which (Compatibility)
    //    had content unreachable behind the bar before Build 22 fixed it. On Android a change here
    //    does not crash and does not look broken in a screenshot of the bar itself — it silently
    //    re-clips the bottom of five scroll views.
    name: 'Tabs',
    file: 'app/(main)/_layout.tsx',
    expected: [],
    forbidden: [],
    legacy: [],
    propRules: [],
    literals: [
      [/height: 85/,
        '🔴 X18 — the bar height. The clipping screens derive their bottom padding from it and ' +
        '§3.1\'s gate for this row requires re-verifying them on a device if it moves.'],
      [/paddingBottom: 24/,
        '🔴 X18 — the safe-area allowance. Design I-6 settled the pairing (turn 4\'s comp said 12, ' +
        'X18 says 8, and X18 wins on precedence).'],
      // 🔴 THE TWO SYSTEM-EDGE TERMS — 2026-08-05, from a founder report on 3-button navigation.
      //    A numeric height in this style object short-circuits the navigator's own inset term, and
      //    this object is LAST in its style array so a bare padding replaces the inset-derived one.
      //    Both literals above stayed green while the six labels rendered inside the system row.
      // ⚠️ BOTH CARRY THEIR TRAILING COMMA, AND THAT IS NOT COSMETIC. `Sheet`'s contract above
      //    asserts the byte-identical expression `paddingBottom: 24 + insets.bottom`, so the
      //    undelimited form appears twice in this file and `invariant-register-check.js`'s X18
      //    cross-reference — which counts a SUBSTRING — read 2 and reported a defect that did not
      //    exist. The comma is what makes each probe name one entry. It is also the more precise
      //    assertion: a declaration in a style object rather than an expression anywhere.
      [/height: 85 \+ insets\.bottom,/,
        '🔴 X18 — the bar takes the real system inset. Deleting this term does not change the bar on ' +
        'a device whose window ends above the system row; it puts the labels back underneath it on ' +
        'every device whose window does not.'],
      [/paddingBottom: 24 \+ insets\.bottom,/,
        '🔴 X18 — the labels clear the system row. Same term, the other half: the height makes ROOM ' +
        'and the padding is what actually moves the content up into it. One without the other is a ' +
        'taller bar with the labels still underneath, or a clipped bar.'],
      [/paddingTop: 8/,
        '🔴 X18 — the top inset. Band = 85 - 24 - 8 = 53, and the label step\'s safety argument is ' +
        'computed against exactly that number.'],
      // 🔴 §5.4's TAB-SWITCH ROW — AND IT INVERTED ON 2026-08-06. Two PRESENCE assertions used to
      //    sit here, pinning the scene cross-fade's spec and its interpolator on the argument that
      //    losing either "silently restores the navigator's default". The owner reverted the whole
      //    transition to a CUT on the strength of a device pass, so both assertions moved to
      //    `absent` below — same two patterns, opposite direction. Recorded rather than deleted
      //    because a row that simply vanishes reads as an assertion nobody thought about.
      // 🔴 AND THE BACKGROUND IS THE HALF THAT WAS NEVER ASSERTED AT ALL. Every stack in this app
      //    names the brand ground; this navigator named nothing, and a bottom-tabs scene is painted
      //    by `@react-navigation/elements`' `Background`, i.e. `useTheme().colors.background` —
      //    which Expo Router leaves at react-navigation's LIGHT default (`rgb(242,242,242)`). While
      //    the cross-fade drove the scene's element opacity, that near-white fill was IN the fade:
      //    the "white flash" was literally the navigation theme, twice, through itself.
      [/sceneStyle: \{ backgroundColor: t\.color\.bg \}/,
        '🔴 THE ONLY PLACE THIS NAVIGATOR\'S SCENE GROUND CAN BE NAMED. Deleting it restores ' +
        'react-navigation\'s LIGHT default theme background under all six tab scenes. Today that is ' +
        'invisible, because nothing puts a scene below alpha 1 — which is exactly why it must be ' +
        'asserted: the next scene-level effect would re-open the flash with no diff to point at.'],
      [/focused \? 'home' : 'home-outline'/,
        '🔴 THE ACTIVE/INACTIVE PAIR, AND THE MECHANISM — ⚠️ WITH ONE CORRECTION MEASURED AT MOTION ' +
        'ITEM 5. The installed navigator renders the icon TWICE, once per focus state, and passing ' +
        'the same glyph to both wastes half of it and leaves the state distinction carried by COLOUR ' +
        'ALONE. 🔴 But it does NOT cross-fade them: `BottomTabItem.tsx:295-296` sets the two ' +
        'opacities to `focused ? 1 : 0` as a plain style, with no Animated anywhere in that file. ' +
        'The swap is INSTANT and the navigator exposes nothing that changes it. One pair is asserted ' +
        'rather than all six: it is the mechanism that can regress, not the glyph list.'],
      [/'sparkles' : 'sparkles-outline'/,
        'design §9.2\'s name for Readings. Asserted because it is one of the TWO names this item ' +
        'changed, so a revert would otherwise be silent.'],
      [/'planet' : 'planet-outline'/,
        'design §9.2\'s name for Astrology — the other changed name.'],
    ],
    absent: [
      // 🔴 THE CUT, HELD. Owner ruling 2026-08-06 after a device pass; design §5.4 records the row
      //    as unmeetable. A cross-fade between two OPAQUE FULL-SCREEN scenes is a DOUBLE EXPOSURE —
      //    the technique works for images, where one picture replaces another, and cannot work for
      //    two text layouts, because during the overlap the user reads both.
      // ⚠️ BOTH KEYS, AND THE ASYMMETRY IS WHY. `hasAnimation()` in bottom-tabs 7.16.1 reads the
      //    SPEC when no animation name is set, so re-adding the spec ALONE re-opens the 220ms window
      //    with no fade in it: the outgoing scene interpolates to its detached state instead of
      //    going there at once, and the two scenes overlap again. Half a revert is the worse state.
      // ⚠️ TEXT-LEVEL, LIKE EVERY `absent` (`O-68`): the layout file's own paragraph explaining the
      //    cut deliberately says "the transition spec" and "the scene interpolator" in prose and
      //    spells NEITHER identifier. That direction fails loudly and is a reason to reword a
      //    comment — never to weaken the rule.
      [/transitionSpec/,
        '🔴 THE TAB SCENE TRANSITION IS A CUT. Re-adding a spec here re-opens the window in which ' +
        'two full-screen text layouts are composited at partial alpha — reported from a device as a ' +
        'white flash, and it is a double exposure. No duration fixes it: 220ms was already short, ' +
        'and shortening it only makes the smear briefer.'],
      [/sceneStyleInterpolator/,
        '🔴 THE OTHER HALF. An interpolator here is what actually puts a scene below alpha 1. The ' +
        'fade preset produced the ghosting; the shift preset would translate the scene by SCREEN ' +
        'WIDTH, against §5.3 rule 3\'s 8dp cap. There is no legal value for this key on this bar.'],
      [/tabBarAllowFontScaling/,
        'the label follows the APP-WIDE freeze in lib/textDefaults.ts, which reaches React ' +
        'Navigation\'s own <Text>. That is where design §3.6\'s "tab labels freeze" lands; setting ' +
        'it here too would give one invariant two homes, and the headroom at the 1.3 cap is only ' +
        '~5.2px, so a disagreement between the two would show up as clipped labels.'],
      [/size=\{24\}/,
        '🔴 THE SPEC\'S 24 IS NOT THE PLATFORM\'S SIZE AND PINNING IT DELETES A SMALL-SCREEN ' +
        'ADAPTATION. bottom-tabs 7.16.1 passes 25 on a regular bar and 18 on a compact one; 24 is ' +
        'its `material` variant, which this bar is not. Hardcoding the spec number would look like ' +
        'honouring the design while removing the behaviour that protects the case with the least ' +
        'vertical headroom.'],
    ],
    // No text nodes today. Left ON so that if one ever arrives it is checked, rather than the file
    // being permanently outside the face and scaling checks.
    textFamily: true,
    textOptIn: true,
  },
  {
    name: 'EntertainmentDisclaimer',
    file: 'components/common/EntertainmentDisclaimer.tsx',
    // 🔴 X8 — PRESENCE IS HARD, THE CONTAINER IS SOFT. UI-audit §5.1: this is a compliance
    //    surface and it must stay present on every reading-output screen. Measured 2026-08-03:
    //    exactly the seven X8 names. §2.2 row 6 permits the design to ADD Home and the astrology
    //    hub — additive, allowed, and an addition must be DECLARED here rather than arriving as
    //    an undeclared adopter.
    // 🟢 textFamily / textOptIn ARE ON FROM ITEM 6 (2026-08-03). They were off while this module
    //    was pre-revamp code, because turning them on then would have OVER-found on code no pass
    //    had reached — the disarming direction. Item 6 restyled it, so they are on now.
    expected: [
      'app/(main)/astrology/daily.tsx',
      'app/(main)/astrology/monthly.tsx',
      'app/(main)/astrology/weekly.tsx',
      'app/(main)/compatibility/[id].tsx',
      'app/(main)/readings/combined.tsx',
      'app/(main)/readings/face.tsx',
      'app/(main)/readings/palm.tsx',
      // 🆕 DECLARED AT THE FUNNEL PHASE'S SCREEN 6 — `P49` / owner ruling R-2, and it closes a
      //    COMPLIANCE gap rather than adding a design element. Home renders LLM output (the daily
      //    insight, its headline, its Do/Avoid pair, three category summaries) and carried NO
      //    disclaimer at all, while the seven screens above carry one. It qualifies on the same
      //    grounds as those seven, and it is the app's highest-traffic surface.
      // 🔴 THE COUNT GOING 7 -> 8 IS THE ARRIVAL CHECK, and the gate FOUND this mount as an
      //    UNDECLARED ADOPTER on its first run after the edit — assertion 2 doing exactly its job:
      //    an addition has to be a deliberate act recorded here, never a number that moved.
      // 🟢 It renders the COMPONENT, so the number of divergent disclaimer strings in the app does
      //    not rise. That matters: audit Q3 asks the owner whether the six existing spellings should
      //    be consolidated, and authoring a seventh would have pre-empted a legal call.
      'app/(main)/home.tsx',
    ],
    forbidden: [],
    legacy: [],
    propRules: [],
    // 🔴 THE COMPLIANCE CONTRACT, ASSERTED IN BOTH DIRECTIONS — item 6. This is the only place in
    //    the tree where an a11y property is a LEGAL requirement rather than a quality one, and
    //    both halves of it are invisible to every other instrument: a node hidden from the
    //    accessibility tree renders pixel-identically, so nothing but an explicit assertion can
    //    tell the difference. §0.0 rule 5 cut the a11y LABEL sweep from this release; it did not
    //    and could not cut this, because X8 is a compliance invariant, not a polish item.
    literals: [
      [/accessibilityRole="text"/,
        'X8 / design §9 row 6 — a screen reader must REACH a legal notice. This was ABSENT until ' +
        'item 6, so the rule is an arrival as well as a floor.'],
      [/\ballowFontScaling\b/,
        'the notice is on a step that scales BY CONTRACT, but a size class cannot carry a prop ' +
        '(C-P4-5), so it was frozen at 13px for exactly the users a legibility rule is written ' +
        'for. design §4.2\'s requirement for this surface is the phrase "not 8pt grey".'],
      [/\btext-fg-muted\b/,
        'design §2 row 8 names `disclaimer` in the muted role\'s own list at 5.36:1. It shipped ' +
        'on the placeholder role at 3.30:1 — sub-AA, on a legal notice. Four of the six ' +
        'disclaimer strings in this app had it wrong and only two had it right.'],
    ],
    absent: [
      [/importantForAccessibility="no"/,
        '🔴 X8 — hiding a compliance notice from the accessibility tree is a silent regression ' +
        'that renders identically. It has never been here and it must never arrive.'],
      [/\btext-center\b/,
        'design §9 row 6 is explicit: LEFT-ALIGNED, NOT CENTRED. Centring a 196-character ' +
        'paragraph is what made this read as decoration rather than as a notice.'],
    ],
    textFamily: true,
    textOptIn: true,
  },
];

// ══════════════════════════════════════════════════════════════════════════════════════════
//  ABSENCE C — the TOKEN CENSUS. primitives-plan §1.2 C.
//
//  🔴 `locked` vs `surface-raised` is the LAST held-value collision in the system and the codemod
//     left it open on a stated ordering argument: both were held at one value through passes 1-4,
//     `locked` measured ZERO call sites at every measurement, and its FIRST call site is created
//     in this phase — after the flip, when the two are visibly a step apart. The flip made this
//     answerable BY LOOKING, for the first time.
//
//  🔴 A CENSUS, NOT A BAN. `expect: 0` here is a BASELINE assertion with a named owner: it must
//     stay 0 until LockShell (item 13) grounds its plate, and then it must go NONZERO in the same
//     commit that flips this entry. A zero that survives item 13 means the plate grounded on the
//     wrong token, which no other gate in the tree could ever see.
// ══════════════════════════════════════════════════════════════════════════════════════════
//  🆕 AND A SECOND CENSUS SHAPE, ADDED AT ITEM 5: `exact` + a custom `re`.
//
//  🔴 THE ROLE-vs-ROLE CLASS, WHICH IS `O-26` ONE TOKEN OVER. `O-26` is 13 sites where a token
//     whose NAME DECLARES A ROLE (the subtle edge) is used in the wrong DIMENSION. This is the
//     same failure with the wrong ROLE instead: design §2 row 9 gives the placeholder role to the
//     `Input` placeholder AND NOTHING ELSE, because it is the only sub-AA foreground in the
//     palette. Measured at item 5: 21 sites spell it as a live FOREGROUND, and the pieces of
//     copy riding it include a password rule, a naming instruction and — worst — the compliance
//     disclaimer, which is X8/X9 and is a legal notice.
//
//  🔴 EVERY OTHER GATE IN THE TREE PASSES ON ALL 21. The name is legal, so `no-legacy-tokens` is
//     clean; it is not `white`, so `no-white-on-accent` is blind; there is no hex, no weight and
//     no numeric size. `tsc` cannot have an opinion about a colour role. This census is the only
//     instrument that can see the class at all.
//
//  🟢 SO IT IS EXPRESSED AS AN EXACT COUNT, WHICH MAKES IT THE DECREASING COUNTER §0.2 SAYS THIS
//     PHASE BARELY GETS. It moves only when someone deliberately changes it AND edits the number
//     in the same commit; a rise and a fall both fail, so neither can happen quietly.
const TOKENS = [
  // ═══ 🆕 X17's SEVEN ICON WELLS — AN INVARIANT COUNT, NOT A TOKEN ═════════════════════════════
  //
  // 🔴 THIS EXISTS BECAUSE THE INVARIANT WAS ALREADY BROKEN IN THE TREE AND NOTHING SAW IT.
  //    `main` carries the clipping override on all SEVEN of this file's 56x56 wells. `611674b`
  //    dropped ONE of them while converting that card's pictograph to a glyph — an unrelated
  //    change, in an unrelated commit, with no gate pointed at it. It was found by counting the
  //    property across `main` / HEAD / the working tree, which is not something anyone does
  //    routinely. So the count becomes an assertion.
  //
  // ⚠️ WHY IT IS SO EASY TO DROP: the declaration reads as a no-op because it IS the web default.
  //    It is NOT React Native's default on Android, where the wells hold glyphs that overrun their
  //    box. `UI-audit` §5.1's X17 row says exactly this and calls the risk "very likely" — and it
  //    still happened, which is the argument for a number over a paragraph.
  //
  // ⚠️ `exact`, NOT a floor, and NOT `nonzero`. Six of seven passes a floor and passes `nonzero`;
  //    six of seven is the defect. A RISE also fails, because an eighth well is a card nobody
  //    recorded. Its own site comment deliberately does NOT spell the declaration — this census
  //    reads raw source and would otherwise count its own documentation (`O-68` direction 3).
  // 🔴 TWO ENTRIES, ONE PER X17 FILE, AND SPLITTING THEM IS THE POINT. A tree-wide count of this
  //    declaration is 11 — the nine X17 guards plus two legitimate primitives-phase sites — and a
  //    single total lets a FALL in the hub be cancelled by a RISE anywhere else. Scoped, it cannot.
  {
    token: 'X17 wells · readings hub',
    files: ['app/(main)/readings/index.tsx'],
    re: "overflow:\\s*'visible'",
    exact: 7,
    owner: 'UI-audit §5.1 X17 — seven iOS-production clipping guards, PRESERVE-BLINDLY',
    why: 'X17. A FALL is a well that lost its clipping override — invisible on every device this ' +
         'project can build, and a cropped glyph on iOS. A RISE is an unrecorded eighth card.',
  },
  {
    token: 'X17 wells · the sun-sign reveal',
    files: ['components/profile/SunSignReveal.tsx'],
    re: "overflow:\\s*'visible'",
    exact: 2,
    owner: 'UI-audit §5.1 X17 — the 110x110 well and its glyph, from commit c542b20',
    why: 'X17, the other half. Same declaration, same invisibility on Android, different file.',
  },
  // 🟢 FLIPPED AT ITEM 13, IN THE COMMIT THAT CREATED THE CALL SITE. It was `expect: 0` with a
  //    named debtor from item 0 onward; a zero surviving item 13 would have meant the plate
  //    grounded on the wrong token, which no other gate in the tree could ever have seen.
  //    ⚠️ IT IS `exact: 1` DELIBERATELY, NOT `nonzero`. This token has exactly one legal home —
  //    the lock plate — so a SECOND site is the role-vs-role class arriving (the same shape as
  //    the placeholder census below), and `nonzero` cannot see that. A fall to 0 fails too.
  { token: 'locked', exact: 1,
    owner: 'item 13 · LockShell — the lock plate, and it is the ONLY legal home for this token',
    why: 'the last held-value collision; the plate is its first and only call site' },
  {
    token: 'fg-placeholder',
    // FOREGROUND spellings ONLY. `placeholderTextColor=` is the role's one legal home and is
    // deliberately not matched — the capital C in that prop name is what excludes it, along with
    // every `borderColor:` / `backgroundColor:`, so the pattern needs no negative lookbehind.
    re: "\\btext-fg-placeholder\\b|color:\\s*t\\.color\\['fg-placeholder'\\]",
    // 21 at item 5 · 17 at item 6, which took ALL FOUR disclaimer renderings that were on this
    // role: the shared component, profile's hand-shortened variant, and the report screen's two
    // fine-print lines. 🟢 16 at items 9-10, which took the compatibility share card's WATERMARK —
    // this role, at 3.15:1, baked into an image that leaves the app. 14 of the remaining 16 are
    // misuse; 2 are legitimate.
    //
    // 🔴 AND THIS NUMBER CAUGHT SOMETHING ABOUT THE *METHOD* AT THIS ITEM, WHICH IS WORTH KEEPING:
    //    the items' defect-injection run was executed against a baseline this census had ALREADY
    //    turned red (the fix landed before the number moved), so every case after it "CAUGHT" a
    //    defect that was really the stale count. An injection harness that reads an EXIT CODE and
    //    not a REASON proves nothing — the same half-measure as a count that is printed but never
    //    asserted (`O-67`). The harness now asserts a green baseline before each case and greps the
    //    output for the specific finding it expects.
    // ═══ 🟢 SWEPT AT THE FUNNEL PHASE — `P44`, OWNER RULING R-4, AND IT WAS ONE COMMIT ═════════
    //
    // 16 -> 2. All fourteen misuses moved to the META role in a single commit, which is what R-4
    // ruled: "do the 15-site sweep in this phase, as ONE commit ... Not piecemeal." ⚠️ THE RULING'S
    // OWN NUMBERS WERE ONE STALE — it says 15 of 17, measured before items 9-10 took the share
    // card's watermark. The live figures at sweep time were 16 total, 14 misuse, 2 legitimate, and
    // this census is where they were read from rather than from the ruling.
    //
    // 🔴 WHY EVERY ONE OF THE FOURTEEN WAS A LIVE AA FAILURE, AND NOT A STYLE PREFERENCE. Measured
    //    across all four surface steps, this role NEVER clears AA anywhere:
    //
    //        canvas  surface  raised  overlay        (AA needs 4.50)
    //          3.30     3.15    2.96     2.73
    //
    //    So it is not "sub-AA on the overlay step" — it is sub-AA on every ground in the system, by
    //    design, because §2 row 9 contracts it to the `Input` placeholder ALONE, where a REQUIRED
    //    label makes it safe by construction (that is why item 5 typed `label` with no default and
    //    verified a placeholder-only field does not compile).
    //
    // 🔴 AND THE TARGET ROLE WAS CHOSEN BY MEASUREMENT, NOT BY BEING THE NEXT ONE UP. The meta role
    //    reads 5.36 / 5.11 / 4.81 / 4.44 across the same four steps — so it is legal on three of
    //    them and SUB-AA on the overlay step (O-66's figure). Every one of the fourteen grounds was
    //    checked against that boundary before the edit; none of them sits on the overlay step, so
    //    the meta role is legal at all fourteen. On an overlay-grounded site the answer would have
    //    had to be the label role instead, and "move it to the next role up" would have been wrong.
    //
    // What the fourteen were: a user's OWN NAME under a profile row · the assistant attribution on
    // every Q&A message · three empty-state instructions in the numerology hub · the three column
    // labels that give three numerology numerals their meaning · two report-screen notices about
    // retention and cost · the "or continue with" divider on BOTH auth screens · and two form hints,
    // one of them the minimum-password-length rule.
    // ⚠️ TWO OF THOSE FOURTEEN SAT IN FILES THAT ARE RESTYLE-ONLY AND STRUCTURE-FROZEN (the Q&A
    //    screen and the report screen). A COLOUR IS A RESTYLE, so they are in scope — and the Q&A one
    //    is not one of Q1's eight independently-gated suppression surfaces, so nothing about the
    //    crisis guarantee is touched.
    // 🔴 ONE OF THEM WAS AN ORPHANED DEBT: `ChangePasswordModal`'s ADOPTION-EXEMPT note deferred
    //    "its sub-AA hint" to item 15, and item 15 then MEASURED that these four account modals are
    //    full-screen forms and must NOT become sheets. So the debtor retired without the debt being
    //    paid, and the exemption comment was the only record of it. That is the same failure shape as
    //    a stale registrar — a pointer that outlives the thing it points at.
    exact: 2,
    owner: 'CLOSED · both survivors are LEGITIMATE — birth-data\'s date and time pseudo-fields, ' +
           'where the role genuinely IS a placeholder and the question above each field carries ' +
           'the meaning. A RISE is the role escaping its contract again',
    why: 'design §2 row 9 — the one deliberately sub-AA foreground in the palette, contracted to ' +
         'the Input placeholder alone, and it had been carrying information users need at 14 sites',
  },
  // ══════════════════════════════════════════════════════════════════════════════════════════
  //  🆕 THE CONTROL-BOUNDARY ROLE — two entries, and they are the SAME assertion from both ends.
  //
  //  🔴 WHY A CENSUS AND NOT PROSE. This role exists because no other border token can legally
  //     delimit a control: 1.16 / 1.51 against 1.4.11's 3:1 for a component boundary or state
  //     (`O-83`, `O-87`; `P61`, `P62`). The distinction it encodes — a CONTROL boundary carries a
  //     control's identity or its state, a STRUCTURAL border separates content — is invisible to
  //     every other instrument in the tree. Every spelling on both sides of it is a legal token
  //     name, so `no-legacy-tokens` is clean, there is no hex, no weight, no numeric size, and
  //     `tsc` cannot have an opinion about which role a border plays. The design row says it in
  //     prose, and prose does not control anything — that ruling is already on record for the
  //     accent-fill pairing, which spent a whole phase report-only for exactly this reason.
  //
  //  ⚠️ AND THE PAIR IS DELIBERATE. The first entry alone would let the role arrive and never
  //     notice the old error coming back at a NEW site; the second alone would keep the old error
  //     out and never notice the role quietly reverting to a structural neutral. Arrival and
  //     removal are two different classes and one number cannot hold both.
  {
    token: 'border-control',
    // 🔴 `exact`, NOT `nonzero`, and the choice is O-67's: an exact count on an INVARIANT, a floor
    //    on a DISCOVERY number that legitimately moves both ways. This is an invariant — the set of
    //    controls in the app is a decision, not a measurement. A FALL means a control lost its
    //    boundary; a RISE is either a genuinely new control (in which case move the number in the
    //    same commit, which is the forcing function) or a structural border helping itself to a
    //    control role, which is the distinction escaping. `nonzero` would see neither, and would
    //    additionally be satisfiable by the paragraph describing it (O-68's third direction: this
    //    census reads RAW source, so every comment at all seventeen sites names the role in PROSE and
    //    never in a spelling this pattern can count — that is not a style choice, it is the reason
    //    the count means anything).
    // ⚠️ 16 -> 17 WITH THE WEB DATE/TIME FIELD (components/ui/DateTimeField.web.tsx), and this is
    //    the forcing function above working as designed rather than an exception to it. The new
    //    site is a genuinely new CONTROL — a real <input> rendered on web, where the native build
    //    shows the platform picker — so it is the first of the two rise-cases, not the second. It
    //    is worth recording WHY a web-only file lands in a census at all: this scan reads source
    //    text, and a .web sibling is source. Every future platform fork that draws a control will
    //    move this number the same way, and each one has to say so here.
    exact: 17,
    owner: 'CLOSED at 17 across 9 files · the field primitive (1) · signup\'s consent checkbox (1) ' +
           '· birth-data\'s two pseudo-fields + handedness pair (4) · both paywall plan cards (2) ' +
           '· verify-email\'s six-box code entry (1) · name-destiny\'s three hand-rolled fields (3) ' +
           '· the Q&A composer + Deep-Insight toggle (2) · compatibility\'s two chip rows (2) ' +
           '· the web date/time field (1). ' +
           'A RISE without this number moving is a structural border taking a control role',
    why: 'design §2 — the control-boundary role, added because neither neutral edge clears WCAG ' +
         '1.4.11\'s 3:1 for a component boundary (1.16 / 1.51) and the surface steps are 1.08 ' +
         'apart so a fill cannot carry it either',
  },
  {
    // 🔴 THE ROLE-DIMENSION ERROR, ASSERTED AT 0 TREE-WIDE. `O-39` named it for a DIMENSION (a
    //    spacing token doing a size's job); this is the same failure in the ROLE axis, and it had
    //    five live instances because the meta foreground was the nearest CONTRAST-LEGAL value a
    //    session could reach for while §2 named no control-boundary role at all. It is legal to
    //    every gate: the name resolves, the ratio passes, and nothing in the tree knows that a
    //    foreground token has no business being a stroke.
    // ⚠️ IT IS DELIBERATELY THE WHOLE FOREGROUND FAMILY, not just the one role that was misused.
    //    Widening while it is free is §3.0.2.0's rule; the narrow version would sit at 0 forever
    //    and be blind to the next session reaching one role over. Measured 0 immediately after
    //    the five sites moved, so this is a class-2 permanent invariant with a documented pressure
    //    source — the same justification the field primitive's own absent-assertion carries.
    token: 'fg-* as a border',
    re: 'border-fg-[a-z]|border[A-Za-z]*Color:[^\\n;]*t\\.color\\[[\'"]fg-',
    exact: 0,
    owner: 'PERMANENT INVARIANT · was 5 (signup\'s consent checkbox, birth-data\'s handedness ' +
           'pair, both paywall plan cards) and is 0 from 2026-08-04. A foreground role is never ' +
           'a stroke — the control-boundary role above is what those five wanted',
    why: 'O-39 in the ROLE axis — a text token doing a border\'s job. Contrast-legal and role-' +
         'wrong, which is why every other instrument in the tree passes it',
  },
  {
    // ══════════════════════════════════════════════════════════════════════════════════════════
    // 🔴 THE STATE-BORDER INVERSION (`O-93`, 2026-08-04). A STATE INDICATOR MUST NEVER BE LESS
    //    PROMINENT THAN THE RESTING STATE IT REPLACES — and the previous item CREATED that defect
    //    by doing something correct: raising sixteen resting edges to the 1.4.11 floor without
    //    touching the signalling colours they pair with.
    //
    // 🔴 MEASURED PROMINENCE (each state against its OWN ground), across all 13 state pairs those
    //    16 boundaries form: TWELVE gained and ONE inverted. The Q&A Deep-Insight toggle's ON edge
    //    was an accent WASH at 1.25:1 against a resting edge now at 3.65:1 — switching the control
    //    ON made its outline 2.92x FAINTER.
    //
    // 🔴 AND THE SHARP PART: THAT SITE WAS IN THE GROUP WHERE SEPARATION *ROSE* (1.04 -> 2.92).
    //    SEPARATION AND ORDERING ARE INDEPENDENT DIAGNOSTICS. A check on the separation between two
    //    states cannot see an inversion at all — it measures the same number either way round — so
    //    the four sites whose separation FELL were all fine and the one flagged healthiest was the
    //    broken one. Anything that checks state pairs must compare PROMINENCE, not distance.
    //
    // ⚠️ WHAT THIS ASSERTION IS, AND HONESTLY WHAT IT IS NOT. Full prominence needs each edge's
    //    GROUND, i.e. the style graph — that is the A5 pair rule's machinery and extending it is a
    //    separate job. This is the SYNTACTIC invariant that catches the class's actual mechanism,
    //    and it needs no ground: the signalling half of a border STATE TERNARY must be a full
    //    accent-family token, never a WASH and never an `alpha()` reduction. A wash cannot clear
    //    3:1 as a stroke on ANY ground in this palette, so no ground is required to rule on it.
    // 🟢 THE TERNARY IS WHAT MAKES IT SAFE FROM OVER-FINDING, which is the direction that
    //    decommissions a rule. A wash as a STATIC decorative border is legitimate and there are
    //    eight of them (the daily banners, three report frames, a career callout, two combined
    //    rules, the LockShell veil edge) — none is a state pair, and none is in a ternary. The
    //    tree holds 10 border state ternaries; this pattern matched exactly 1 and now matches 0.
    token: 'a WASH signalling a border STATE',
    re: 'border[A-Za-z]*Color:\\s*[^?\\n]*\\?[^\\n]*(?:t\\.color\\[[\'"][a-z0-9-]+-muted[\'"]\\]|t\\.alpha\\()' +
        '|\\?[^\'"\\n]*[\'"][^\'"\\n]*\\bborder-(?:accent|accent-2)-muted\\b',
    exact: 0,
    owner: 'PERMANENT INVARIANT · was 1 (the Q&A Deep-Insight toggle, created by the previous ' +
           'item and inverted at 2.92x) and is 0 from 2026-08-04. A wash is a FILL role; the ' +
           'signalling half of a state pair is the plain accent',
    why: 'O-93 — a state indicator must never be less prominent than the resting state it ' +
         'replaces, and a wash used as a stroke cannot clear 3:1 on any ground in this palette',
  },
];

// ══════════════════════════════════════════════════════════════════════════════════════════
//  ABSENCE D — 🔴 THE A5 PAIR. Added at item 7, and it is the join no other rule can make.
//
//  ── WHY IT EXISTS: FIVE LIVE AA FAILURES IN ONE SESSION, ALL INVISIBLE TO EVERYTHING ─────
//
//  `on-accent` is the only legal foreground on an accent / warning / success / danger FILL.
//  CLAUDE.md carries that rule in prose and says why it cannot be a grep: `no-white-on-accent`
//  is PERMANENTLY REPORT-ONLY because proximity is not nesting, and it documents itself as
//  unable to see a fill and a label that live in different style rules joined only at a JSX
//  call site. Item 4 found one such pair by merging four files by hand. Item 7's pre-flight
//  found FIVE MORE, and the distances were 7, 9 and 21 lines against a four-line window:
//
//    face-capture + palm-capture  primaryButtonText  on 2 accent fills   8 sites, REACHABLE
//    face-capture + palm-capture  errorText          on a danger fill    3 sites, REACHABLE
//    CaptureInfoModal             ctaText            on an accent fill   1 site,  REACHABLE
//    LockedSection                bannerButtonText   on an accent fill   3 sites, REACHABLE
//    GeneratingReading            the retry label    on an accent fill   latent
//
//  🔴 AND THE SHAPE OF IT IS THE ARGUMENT FOR THIS RULE: face-capture.tsx contained BOTH a
//     broken pair AND a correct one — `uncertainBtnPrimaryText` uses the on-accent role and
//     carries a comment explaining the very rule that `primaryButtonText`, twenty lines away,
//     was breaking. Prose in the file did not stop it. Prose in CLAUDE.md did not stop it.
//
//  ── 🔴 HOW IT DIFFERS FROM `no-white-on-accent`, WHICH IS WHY IT CAN BLOCK ────────────────
//
//  That rule searches SOURCE TEXT within a line window. This one resolves the STYLE GRAPH:
//    1. find every StyleSheet rule whose body sets a FILL to an accent-family token;
//    2. find every JSX element that consumes one;
//    3. walk that element's SUBTREE BY TAG DEPTH — never a line window — for text nodes;
//    4. resolve each text node's own style rule and read its `color`.
//  Distance becomes irrelevant, so the failure mode that made the old rule report-only is gone.
//
//  ⚠️ SELF-CLOSING ELEMENTS HAVE NO SUBTREE, and that is load-bearing rather than an
//     optimisation: it is what removes the ONE false positive the first draft produced (a 6x6
//     accent dot whose sibling happened to be the instruction text). The over-finding direction
//     is the insidious one — §1.3 property 3 — so it is closed structurally, not by exception.
//
//  ⚠️ IT IS A STYLE-RULE CHECK ONLY. An inline `style={{ backgroundColor: … }}` with an inline
//     label colour is what the old rule's window already covers, and doing both here would
//     duplicate its 22 reviewed hits. Two instruments, two shapes, neither widened to cover the
//     other's ground.
// ══════════════════════════════════════════════════════════════════════════════════════════
const A5_FILL = /background(?:Color)?:\s*t\.color(?:\.(?:accent|danger|warning|success)\b|\[\s*["'](?:accent|danger|warning|success)["']\s*\])/;
const A5_LEGAL = /color:\s*t\.color\[\s*["']on-accent["']\s*\]/;
const A5_ANY_COLOR = /(?:^|[\s,{])color:\s*/m;

// ── the scanner ───────────────────────────────────────────────────────────────────────────

function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p.split(path.sep).join('/'));
  }
  return acc;
}
const FILES = ROOTS.reduce((a, r) => walk(r, a), []);
const SRC = new Map(FILES.map(f => [f, fs.readFileSync(f, 'utf8')]));
const WIDE_FILES = WIDE_ROOTS.reduce((a, r) => (fs.existsSync(r) ? walk(r, a) : a), []);
const WIDE_SRC = new Map(WIDE_FILES.map(f => [f, fs.readFileSync(f, 'utf8')]));

/**
 * The full opening tag beginning at `start`, by BRACE BALANCE — never a line window.
 * Walks strings, line comments and block comments so that a `>` inside any of them, or inside
 * a nested prop object, does not terminate the tag early.
 */
function openingTag(src, start) {
  let i = start, depth = 0;
  while (i < src.length) {
    const c = src[i];
    const ce = commentEnd(src, i);
    if (ce >= 0) { i = ce; continue; }
    // 🔴 `O-91` VIA `scripts/lib/source-scan.js`. An unbounded quote skip meant one apostrophe in
    //    a comment inside an opening tag swallowed the `>` that ends it — and `elements()`, which
    //    every adoption count and every text-node census is built on, then read the wrong span.
    const qe = skipQuoted(src, i);
    if (qe >= 0) { i = qe; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return src.slice(start, i + 1);
    i++;
  }
  return null;
}

/**
 * Every JSX element named `name` in `src`.
 * 🔴 The lookahead is load-bearing, not tidiness: without it `React.FC<ScreenContainerProps>`
 *    scores as a call site, and a plain `grep -l` for the element name DOES report the
 *    primitive's own module as its own adopter. Measured — that is a real 26-vs-25.
 */
/**
 * 🔴 A TYPE ARGUMENT IS NOT A JSX ELEMENT, and this cost a false positive on the first primitive
 *    that needed a typed ref. `useRef<Text>(null)` matched `<Text` and was reported as a text node
 *    naming no face — so the gate demanded a font family from a TYPE. `RefObject<View>`,
 *    `Array<Card>` and every generic in the tree are the same shape.
 *
 * 🟢 THE DISCRIMINATOR IS ONE CHARACTER AND IT NEEDS NO PARSER: in JSX, `<` is NEVER immediately
 *    preceded by an identifier character — it follows `(`, `{`, `>`, `return`, or line whitespace.
 *    In a type-argument list it ALWAYS is, because the thing before it is the generic's name.
 *
 * ⚠️ THIS IS THE OVER-FINDING DIRECTION, which §1.3 property 3 names as the insidious one: a rule
 *    that cries wolf gets decommissioned by its own output, and that is literally how
 *    `no-white-on-accent` became report-only. Fixed rather than worked around at the call site —
 *    renaming the ref's type would have hidden the defect for the next person instead.
 */
function elements(src, name) {
  const out = [];
  const re = new RegExp('<' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s/>])', 'g');
  let m;
  while ((m = re.exec(src))) {
    if (m.index > 0 && /[A-Za-z0-9_$]/.test(src[m.index - 1])) continue;   // a generic, not a tag
    const tag = openingTag(src, m.index);
    if (tag) out.push({ index: m.index, tag, line: src.slice(0, m.index).split(/\r?\n/).length });
  }
  return out;
}

const hasProp = (tag, prop) => new RegExp('[\\s{]' + prop + '\\s*=').test(tag);

/**
 * 🔴 THE FAMILY MAY LIVE ONE HOP AWAY, IN THE FILE'S OWN StyleSheet — codemod-plan §3.0.2
 *    class 5 yet again ("the property the rule keys on is not where the value lives"), and
 *    SectionCard (item 4) is the FIRST primitive to hit it. A tag reading `style={styles.x}`
 *    names no face IN THE TAG while `styles.x` names one four lines away, so the tag-only
 *    check OVER-FINDS — and §1.3 property 3 is explicit that over-finding is the insidious
 *    direction, because a rule that cries wolf is decommissioned by its own output. That is
 *    literally how `no-white-on-accent` became report-only.
 * ⚠️ ONE HOP ONLY, and deliberately: a spread of another rule, a style built by a helper, or
 *    a rule imported from another module is NOT followed. Those return false and are reported,
 *    which is the safe direction — a primitive is written NOW and can simply be explicit.
 */
function styleRefsCarryFamily(src, tag) {
  const names = [...tag.matchAll(/styles\.([A-Za-z0-9_$]+)/g)].map(m => m[1]);
  if (!names.length) return false;
  return names.some(n => {
    const m = src.match(new RegExp('\\b' + n + ':\\s*\\{'));
    if (!m) return false;
    const start = m.index + m[0].length;
    let depth = 1, i = start;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(start, i);
    return /fontFamily/.test(body) || /t\.family/.test(body);
  });
}

/**
 * Source with every comment blanked to spaces, newlines kept. Strings are copied through, so a
 * class name or a token spelling inside a real string literal still counts.
 *
 * ── 🔴 WHY THIS EXISTS, AND IT IS THE MOST IMPORTANT FIVE LINES IN THIS FILE ─────────────────
 *
 * "A COMMENT IS SOURCE" CUTS BOTH WAYS, AND THE TWO DIRECTIONS HAVE OPPOSITE SAFETY PROPERTIES.
 * Ten instances of the hazard were on record before item 6 and every one of them was the SAME
 * direction: prose ADDED something — a Tailwind rule, a grep hit, a forbidden spelling — so a
 * rule FAILED. Loud, safe, self-correcting: someone rewords a sentence and moves on.
 *
 * 🔴 ITEM 6 FOUND THE OTHER DIRECTION, AND IT SILENTLY OPENS A GUARD. The PRESENCE half below
 *    asserts that an invariant's literal is still in the primitive's own module. If the module's
 *    header COMMENT happens to spell that literal — and a header comment explaining an invariant
 *    is exactly the place where it would — then the assertion is satisfied BY THE PARAGRAPH
 *    DESCRIBING IT, forever, no matter what the code does. Measured at item 6: deleting
 *    `accessibilityRole` from the disclaimer's JSX left the gate exiting 0, because the comment
 *    above it named the prop.
 *
 * 🔴 THAT IS THE FAILURE MODE `alpha-callsite-check.js` WAS WRITTEN TO PREVENT, arriving through
 *    a different door: a guard that silently opens is worse than one that loudly closes. An
 *    over-firing rule gets reworded; a rule satisfied by its own documentation gets trusted.
 *
 * ⚠️ SO THE ASYMMETRY IS DELIBERATE AND MUST BE PRESERVED: `literals` (presence) reads CODE ONLY.
 *    `absent` and `treeAbsent` (removal) stay TEXT-LEVEL, because there the prose direction fails
 *    loudly, and a comment naming a retired thing genuinely is a reason to reword the comment.
 *    Do not "make them consistent" — they are inconsistent on purpose.
 */
// 🔴 EXTRACTED TO `scripts/lib/source-scan.js` — `O-91`. This function is what makes O-54 /
//    O-68 direction 2 work (the `literals` half reads each module with COMMENTS BLANKED), and it
//    carried the same unbounded quote skip as the other two scanners: one prose apostrophe copied
//    a large region through VERBATIM, `//` markers included, so those comments were never blanked
//    and a presence assertion became satisfiable by prose again — O-68's guard re-opened by
//    O-91's mechanism. LATENT here rather than live: no number moved when it was fixed, which is
//    the worst distribution for a bug — live in one copy, latent in two.

function exemptReason(src, name) {
  const m = src.match(new RegExp('ADOPTION-EXEMPT\\(' + name + '\\)\\s*:?\\s*([^\\n*}]*)'));
  return m ? (m[1].trim() || '(no reason given)') : null;
}

// ── the run ───────────────────────────────────────────────────────────────────────────────

let violations = 0;
const say = s => { console.log(s); };

for (const c of CONTRACTS) {
  const expected = new Set(c.expected);
  const forbidden = new Map(c.forbidden);
  const actual = [];
  // 🔴 R-2 (codemod-plan §0): assert a PER-PATTERN count, not only a total. A file list answers
  //    "which files adopted"; it cannot see 9 call sites in one file becoming 8. P-2 has fired
  //    four times in this programme on exactly that gap.
  let sites = 0;
  for (const f of FILES) {
    if (f === c.file) continue;                       // a primitive is never its own adopter
    const n = elements(SRC.get(f), c.name).length;
    if (n) { actual.push(f); sites += n; }
  }
  const actualSet = new Set(actual);

  const missing = [], exempt = [], undeclared = [], trespass = [];
  for (const f of expected) {
    if (actualSet.has(f)) continue;
    const why = SRC.has(f) ? exemptReason(SRC.get(f), c.name) : null;
    if (why) exempt.push([f, why]); else missing.push(f);
  }
  for (const f of actual) {
    if (forbidden.has(f)) trespass.push([f, forbidden.get(f)]);
    else if (!expected.has(f)) undeclared.push(f);
  }

  const residue = missing.length + undeclared.length + trespass.length;
  say(`  ${(c.name + ' · adoption').padEnd(38)} ${String(expected.size).padStart(4)} expected, ` +
      `${String(actual.length).padStart(4)} actual, ${String(residue).padStart(3)} residue` +
      `   (${sites} call sites)` + (residue ? '   🔴' : ''));
  if (exempt.length) {
    say(`    · ${'ADOPTION-EXEMPT'.padEnd(24)} ${String(exempt.length).padStart(5)}   (named at the site, never summed)`);
    exempt.forEach(([f, w]) => say(`        ${f} — ${w}`));
  }
  missing.forEach(f => {
    say(`    🔴 MISSING     ${f} is contracted to render <${c.name}> and does not.`);
    say(`                   Either restore it, or mark the site ADOPTION-EXEMPT(${c.name}) with a reason.`);
    violations++;
  });
  undeclared.forEach(f => {
    say(`    🔴 UNDECLARED  ${f} renders <${c.name}> and is not in the contract.`);
    say(`                   An unexpected adopter is a FINDING, not noise (§1.3 assertion 2): add it`);
    say(`                   to the expected list deliberately, or remove the element.`);
    violations++;
  });
  trespass.forEach(([f, why]) => {
    say(`    🔴 FORBIDDEN   ${f} renders <${c.name}> and MUST NOT.`);
    say(`                   ${why}`);
    violations++;
  });
  if (VERBOSE) actual.filter(f => expected.has(f)).forEach(f => say(`       ok ${f}`));

  // ── 3b · 🆕 PER-PATTERN SITE COUNTS — R-2, AND IT WAS ADDED BECAUSE AN INJECTION ESCAPED ──
  //    🔴 THE FILE LIST IS BLIND TO A SITE DISAPPEARING INSIDE AN ADOPTING FILE, and item 13's
  //       re-validation proved it: breaking ONE of palm.tsx's TEN call sites left this contract
  //       reading 11 expected / 11 actual / 0 residue, because the file still rendered nine more.
  //       codemod-plan §0's R-2 has said "assert a PER-PATTERN count, before and after" since the
  //       first pass and P-2 has fired on that gap four times; the count was PRINTED here from
  //       item 0 onward and never ASSERTED, which is the same class of half-measure.
  //    🔴 IT MATTERS MOST ON EXACTLY THIS PRIMITIVE. 29 of its 36 sites are 7, 9 and 9 inside
  //       three files, and a lost lock does not look like a bug — the free user simply sees
  //       nothing where a locked section was, which reads as content that was never generated.
  //    ⚠️ PER PATTERN, NOT PER TOTAL, and the pattern here is the DENSITY: a total reconciles by
  //       accident (one lost in one file, one gained in another) and three named counts cannot.
  //       The sum is asserted too, which is what catches a tag carrying no density at all.
  if (c.siteCounts) {
    const tags = [];
    for (const f of FILES) {
      if (f === c.file) continue;
      for (const e of elements(SRC.get(f), c.name)) tags.push({ f, ...e });
    }
    let sum = 0;
    for (const [re, want, why] of c.siteCounts) {
      const hits = tags.filter(x => re.test(x.tag));
      sum += want;
      const ok = hits.length === want;
      say(`    · ${('sites ' + re.source).padEnd(24)} ${String(hits.length).padStart(5)}, expected ${want}` +
          (ok ? '' : '   🔴'));
      if (!ok) {
        say(`                   ${why}`);
        say(`                   A FALL is a lost site inside a file that still adopts; a RISE is a`);
        say(`                   new one nobody recorded. Both fail, so neither can happen quietly.`);
        hits.slice(0, 3).forEach(h => say(`                   e.g. ${h.f}:${h.line}`));
        violations++;
      }
    }
    const ok = sites === sum;
    say(`    · ${'sites · all patterns'.padEnd(24)} ${String(sites).padStart(5)}, expected ${sum}` +
        (ok ? '' : '   🔴'));
    if (!ok) {
      say(`    🔴 The named patterns do not account for every call site of <${c.name}>.`);
      say(`       A tag matching none of them is a call site with no declared shape — a spread or`);
      say(`       an \`as any\` past the union, which is precisely what tsc cannot see.`);
      violations++;
    }
  }

  // ── 4 · LEGACY — the one decreasing counter this phase gets ──────────────────────────────
  if (c.legacy.length) {
    for (const legacy of c.legacy) {
      const hits = [];
      for (const f of FILES) {
        if (f.endsWith('/' + legacy + '.tsx')) continue;    // its own module, deleted separately
        for (const e of elements(SRC.get(f), legacy)) hits.push(`${f}:${e.line}`);
      }
      say(`    · ${('legacy <' + legacy + '>').padEnd(24)} ${String(hits.length).padStart(5)}   🔴 must be 0`);
      if (hits.length) {
        say(`        An adoption count alone reads COMPLETE while the superseded form is still live.`);
        hits.forEach(h => say(`        ${h}`));
        violations++;
      }
    }
  }

  // ── 5 · PROPS — class 5 in its new shape: a prop is not a class and not a style ─────────
  if (c.propRules.length) {
    let checked = 0, bad = 0;
    for (const f of FILES) {
      for (const e of elements(SRC.get(f), c.name)) {
        for (const r of c.propRules) {
          if (!hasProp(e.tag, r.prop)) continue;
          checked++;
          if (r.requires && !hasProp(e.tag, r.requires)) {
            say(`    🔴 PROP        ${f}:${e.line}  <${c.name} ${r.prop}=…> carries no '${r.requires}'.`);
            say(`                   ${r.why}`);
            bad++; violations++;
          }
          // 🆕 the FORBIDDEN-VALUE half. `requires` catches an absence inside the tag; this
          //    catches a PRESENCE inside one prop's value, which is the shape X3 needs.
          if (r.forbid && r.forbid.test(e.tag)) {
            say(`    🔴 PROP        ${f}:${e.line}  <${c.name} ${r.prop}=…> carries a forbidden value.`);
            say(`                   ${r.why}`);
            bad++; violations++;
          }
        }
      }
    }
    say(`    · ${'prop contracts'.padEnd(24)} ${String(checked).padStart(5)} checked, ${bad} violating`);
  }

  // ── 9 · LITERALS — the X1-X20 carry, asserted PRESENT in the primitive's own module ───────
  //    🔴 THIS IS A SURVIVAL CHECK, NOT A CORRECTNESS ONE (primitives-plan §2.4). It proves the
  //       guard survived the diff. It cannot prove the guard works, because what it guards is an
  //       iOS-PRODUCTION behaviour and codemod-plan §5.4 closed iOS verification permanently.
  //       An Android build, an emulator, a screenshot and a green gate are all NOT evidence here.
  if (c.literals && c.literals.length) {
    let gone = 0;
    // 🔴 CODE ONLY — see stripComments()'s header. A comment must never be able to satisfy this.
    const src = SRC.has(c.file) ? stripComments(SRC.get(c.file)) : undefined;
    for (const [re, why] of c.literals) {
      if (src !== undefined && re.test(src)) continue;
      say(`    🔴 LITERAL     ${c.file}  ${re} is GONE.`);
      say(`                   ${why}`);
      say(`                   On Android this deletion changes NOTHING VISIBLE. That is the hazard.`);
      gone++; violations++;
    }
    say(`    · ${'invariant literals'.padEnd(24)} ${String(c.literals.length).padStart(5)} asserted, ${gone} missing`);
  }

  // ── 9a · 🆕 LITERAL *COUNTS* — R-2 applied to literals, added at item 15 ──────────────────
  //    🔴 `literals` ABOVE IS PRESENCE-ONLY, AND FOR X20 THAT IS NOT ENOUGH. X20 is TWO
  //       `height: 56` declarations on two different hand-rolled destructive controls, spelled
  //       identically — so a presence assertion still passes with ONE of them deleted, and the
  //       surviving one makes the gate read green. That is `O-67`'s class one field over: R-2 has
  //       said "assert a PER-PATTERN count, before and after" since the first pass, and a literal
  //       is a pattern.
  //    ⚠️ A RISE FAILS TOO. A third site spelling the same fixed height is a third hand-rolled
  //       control, which is the thing the primitive exists to stop.
  //    🔴 CODE ONLY, same as `literals` — a comment quoting the number must not be able to count.
  if (c.literalCounts && c.literalCounts.length) {
    const src = SRC.has(c.file) ? stripComments(SRC.get(c.file)) : '';
    for (const [re, want, why] of c.literalCounts) {
      const n = (src.match(new RegExp(re.source, 'g')) || []).length;
      const ok = n === want;
      say(`    · ${('literal ' + re.source).padEnd(24)} ${String(n).padStart(5)}, expected ${want}` +
          (ok ? '' : '   🔴'));
      if (!ok) {
        say(`                   ${why}`);
        say(`                   A FALL is one of an identical pair deleted while the other keeps the`);
        say(`                   presence check green; a RISE is a new hand-rolled copy. Both fail.`);
        violations++;
      }
    }
  }

  // ── 9b · ABSENT — the same field inverted. A REMOVAL that must stay removed. ───────────────
  //    🔴 codemod-plan §3.0.2 class 6, and it is why this half exists at all: an adoption count
  //       and a literal check both read the same on a file that has quietly grown the thing back.
  //       Class 2's hazard applies in full — these sit at 0 with nothing counting down beside
  //       them, so the only protection is that the regex still describes the right thing.
  if (c.absent && c.absent.length) {
    let back = 0;
    const src = SRC.get(c.file);
    for (const [re, why] of c.absent) {
      if (src === undefined || !re.test(src)) continue;
      say(`    🔴 RETURNED    ${c.file}  ${re} is BACK.`);
      say(`                   ${why}`);
      back++; violations++;
    }
    say(`    · ${'removals held'.padEnd(24)} ${String(c.absent.length).padStart(5)} asserted, ${back} returned`);
  }

  // ── 9c · TREE-ABSENT — the same assertion, over every file EXCEPT the primitive's own ─────
  //    🔴 THIS IS ASSERTION 3 (§1.3) FOR AN EXTRACTION, and it is the only DECREASING counter
  //       this phase gets. `legacy` covers a superseded ELEMENT; an extraction supersedes a
  //       local FUNCTION DEFINITION and a set of duplicated STYLE-RULE NAMES, and neither is a
  //       JSX element. An adoption count of N/N reads COMPLETE while a local copy is still live
  //       at a third of the sites — that is the sentence §1.3 assertion 3 exists for.
  //    🆕 AN OPTIONAL THIRD ELEMENT SCOPES IT TO A NAMED FILE SET — added at items 9-10, and the
  //       scoping is the assertion rather than a convenience. The retired idiom there is a GRADIENT
  //       SLAB, and design §2 retires 21 of them while KEEPING one (the primary control's fill,
  //       which is X3) and leaving 19 to the screens phase. A tree-wide ban would therefore be
  //       false today and would have to be deleted the moment it was written, which is how a rule
  //       gets decommissioned by its own output (§1.3 property 3, the `no-white-on-accent` lesson).
  //    ⚠️ WHEN SCOPED, THE PRIMITIVE'S OWN MODULE IS *INCLUDED*. Unscoped, this field asks "did a
  //       local copy survive the extraction?", so the primitive is skipped because that is where
  //       the thing now legitimately lives. Scoped, it asks "is this idiom gone from this FAMILY?",
  //       and the primitive's own module is the first member of the family. Skipping it there would
  //       exempt exactly the file most likely to grow the idiom back.
  if (c.treeAbsent && c.treeAbsent.length) {
    let live = 0;
    for (const [re, why, scope] of c.treeAbsent) {
      const hits = [];
      for (const f of (scope || FILES)) {
        if (!scope && f === c.file) continue;           // the primitive is where it now lives
        const src = SRC.get(f);
        if (src === undefined) {
          say(`    🔴 SCOPE       ${re} names ${f}, which is not in the scanned tree.`);
          live++; violations++;
          continue;
        }
        let m; const g = new RegExp(re.source, 'g');
        while ((m = g.exec(src))) hits.push(`${f}:${src.slice(0, m.index).split(/\r?\n/).length}`);
      }
      if (!hits.length) continue;
      // 🔴 THE MESSAGE NAMES ITS OWN SCOPE. A line reading "tree-wide" under a rule that searched
      //    three files is the same half-truth as a count that is printed but never asserted.
      say(`    🔴 SURVIVES    ${re} is still live at ${hits.length} site(s) ` +
          (scope ? `within the ${scope.length}-file scope.` : 'outside the primitive.'));
      say(`                   ${why}`);
      hits.slice(0, 8).forEach(h => say(`                   ${h}`));
      live++; violations++;
    }
    const scoped = c.treeAbsent.filter(e => e[2]).length;
    say(`    · ${'legacy forms absent'.padEnd(24)} ${String(c.treeAbsent.length).padStart(5)} asserted, ${live} surviving` +
        `   (${c.treeAbsent.length - scoped} tree-wide, ${scoped} scoped)`);
  }

  // ── 6/7 · the primitive's OWN module: absence A (a face) and absence B (the scaling prop) ─
  //
  // 🔴 CODE ONLY, AND THIS WAS A LIVE DEFECT IN THIS CHECK UNTIL ITEM 14 FOUND IT. `elements()`
  //    scans raw text for an opening tag, so a COMMENT that mentions the text element — and a
  //    module header explaining what happens to text nodes is exactly where it would — was counted
  //    as a text node. Measured: the tab bar's header says the app-wide freeze reaches React
  //    Navigation's own text element, and this census reported `1 checked, 1 faceless` for a file
  //    containing no text node at all.
  //
  // 🔴 IT IS `O-54`'s RULING ARRIVING AT A THIRD DOOR, AND ITS DANGEROUS DIRECTION IS THE COUNT.
  //    The FACELESS direction fails loudly, so prose that names a bare tag is self-correcting. But
  //    prose naming a tag that ALREADY CARRIES A FACE — `<Text className="font-body">` in an
  //    example — passes the check and silently inflates `checked`, which is "a comment moves a
  //    census" (the third way the hazard cuts) inside the one number that says how much of a
  //    primitive was inspected. A number that can be raised by documentation is not a measurement.
  //
  // 🔴 BUT BLANKING THE WHOLE CENSUS WAS *ALSO* WRONG, AND THE FIRST ATTEMPT AT THIS FIX PROVED IT
  //    BY BREAKING THREE PASSING PRIMITIVES. The GLYPH exception is an IN-FILE MARKER, which means
  //    it IS a comment — so reading code-only deleted the exception mechanism and reported three
  //    legitimately-excepted pictographs (EmptyState's, and the wait screen's two) as faceless.
  //    That is CLAUDE.md's own stated corollary arriving from the opposite side: *a presence
  //    assertion can never assert an in-file marker, because a marker is a comment.*
  //
  // 🟢 SO THE SPLIT IS PER-FIELD, AND IT IS THE ONLY CORRECT SHAPE:
  //      ENUMERATION  -> stripped   (prose must not be able to invent a node)
  //      FACE / STEP  -> stripped   (a presence assertion must read code — `O-54`)
  //      GLYPH MARKER -> RAW        (the marker is a comment BY CONSTRUCTION)
  //    stripComments is length- and newline-preserving, so the raw tag is the same byte span at the
  //    same offset; line numbers stay accurate and a tag inside a real string still counts, which is
  //    correct because that one can render.
  if (c.textFamily || c.textOptIn) {
    const rawSrc = SRC.get(c.file);
    const src = rawSrc === undefined ? undefined : stripComments(rawSrc);
    if (src === undefined) {
      say(`    🔴 ${c.file} does not exist — the contract names a module that is not in the tree.`);
      violations++;
    } else {
      let nodes = 0, noFace = 0, noScale = 0, glyphs = 0;
      // 🔴 WIDENED AT ITEM 7 — `<Animated.Text>` IS A TEXT NODE AND THIS CHECK COULD NOT SEE IT.
      //    The element-name pattern anchored on `<Text`, so a Reanimated text node was invisible to
      //    both the FACE and the OPT-IN half. Measured tree-wide: 2 nodes, and one of them is the
      //    rotating status message on the 60-second wait screen — i.e. the single text node a user
      //    stares at longest in this app was outside the only check that can see a missing face.
      //    Both currently pass; that is the point. Widen while it is free, not after it bites
      //    (§3.0.2.0's widen-and-revalidate step, and class 2's whole hazard).
      const textNodes = [...elements(src, 'Text'), ...elements(src, 'Animated.Text')];
      for (const e of textNodes) {
        const tag = e.tag;
        // The SAME span, comments intact — used for the marker and for nothing else.
        const rawTag = rawSrc.slice(e.index, e.index + tag.length);
        // ⚠️ THE GLYPH EXCEPTION, per §1.2 A, and it is an IN-FILE MARKER rather than a widened
        //    rule: a pictograph's step is a DIMENSION, and the face that renders it is the
        //    platform emoji font either way. Counted and printed SEPARATELY, never summed — the
        //    same discipline family-arrival-check's own GLYPH marker follows. §4.6: a floor must
        //    never be closed by widening an exception.
        if (/GLYPH/.test(rawTag)) { glyphs++; continue; }
        nodes++;   // counted AFTER the exception, so `checked` and `excepted` never overlap
        const face = /\bfont-(display|quote|body-bold|body-semi|body)\b/.test(tag) ||
                     /t\.txt\(/.test(tag) || /t\.family/.test(tag) ||
                     styleRefsCarryFamily(src, tag);
        if (c.textFamily && !face) {
          say(`    🔴 FACE        ${c.file}:${e.line}  a text node in a primitive names no face.`);
          say(`                   A size utility carries none, so this renders in the global default.`);
          say(`                   A primitive is written NOW: it is fixed, never excepted (§1.2 A).`);
          noFace++; violations++;
        }
        if (c.textOptIn) {
          const step = (tag.match(/t\.txt\(\s*['"]([a-z0-9-]+)['"]/) ||
                        tag.match(/t\.type\[\s*['"]([a-z0-9-]+)['"]/) ||
                        tag.match(/\btext-(sm|xs|base|lg)\b/) || [])[1];
          const named = step && (SCALES.has(step) || SCALES.has('text-' + step));
          const carried = /\{\s*\.\.\.t\.txt\(/.test(tag) || /allowFontScaling/.test(tag);
          if (named && !carried) {
            say(`    🔴 OPT-IN      ${c.file}:${e.line}  reading copy in a primitive cannot scale.`);
            say(`                   The scaling props are <Text> PROPS and cannot live in a style`);
            say(`                   object. A primitive is a SHARED consumer — one missed edit`);
            say(`                   freezes text at every call site at once (§1.2 B).`);
            noScale++; violations++;
          }
        }
      }
      say(`    · ${'own text nodes'.padEnd(24)} ${String(nodes).padStart(5)} checked, ` +
          `${noFace} faceless, ${noScale} frozen`);
      if (glyphs) {
        say(`    · ${'excepted: GLYPH'.padEnd(24)} ${String(glyphs).padStart(5)}   ` +
            `(a pictograph's step is a DIMENSION — never summed with the live count)`);
      }
    }
  }
}

// ── 10 · ABSENCE D — the A5 PAIR, resolved through the style graph ────────────────────────

/** Every `  name: { … }` rule in a file, with its body and line. */
function styleRules(src) {
  const out = new Map();
  const re = /(^|[\s,{])([A-Za-z_$][\w$]*)\s*:\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    let i = open + 1, d = 1;
    while (i < src.length && d > 0) { const ch = src[i]; if (ch === '{') d++; else if (ch === '}') d--; i++; }
    if (!out.has(m[2])) {
      out.set(m[2], { body: src.slice(open, i), line: src.slice(0, m.index).split(/\r?\n/).length });
    }
  }
  return out;
}

/**
 * The subtree of the element whose opening tag starts at `start`, BY TAG DEPTH.
 * Returns '' for a self-closing element — see the header: that is what keeps a SIBLING from
 * being mistaken for a child, and it is the whole reason this rule can block rather than report.
 */
function subtree(src, start, tag) {
  const open = openingTag(src, start);
  if (open === null || /\/>\s*$/.test(open)) return '';
  let i = start + open.length, depth = 1;
  const o = new RegExp('<' + tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s/>])', 'g');
  const c = new RegExp('</' + tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*>', 'g');
  while (i < src.length && depth > 0) {
    o.lastIndex = i; c.lastIndex = i;
    const no = o.exec(src), nc = c.exec(src);
    if (!nc) break;
    if (no && no.index < nc.index) {
      const t2 = openingTag(src, no.index);
      i = no.index + (t2 ? t2.length : 1);
      if (t2 && !/\/>\s*$/.test(t2)) depth++;
    } else {
      depth--; i = nc.index + nc[0].length;
    }
  }
  return src.slice(start, i);
}

{
  let pairs = 0, bad = 0, exempt = 0;
  for (const f of FILES) {
    const src = SRC.get(f);
    if (!/StyleSheet\.create/.test(src)) continue;
    const R = styleRules(src);
    const fills = [...R].filter(([, v]) => A5_FILL.test(v.body)).map(([k]) => k);
    if (!fills.length) continue;
    const exemptHere = /A5-PAIR-EXEMPT/.test(src);
    for (const fill of fills) {
      const use = new RegExp('styles\\.' + fill + '\\b', 'g');
      let u;
      while ((u = use.exec(src))) {
        const tagStart = src.lastIndexOf('<', u.index);
        if (tagStart < 0) continue;
        const name = (src.slice(tagStart).match(/^<([A-Za-z][\w.]*)/) || [, ''])[1];
        if (!name) continue;
        const sub = subtree(src, tagStart, name);
        if (!sub) continue;
        for (const e of [...elements(sub, 'Text'), ...elements(sub, 'Animated.Text')]) {
          for (const ref of [...e.tag.matchAll(/styles\.([A-Za-z0-9_$]+)/g)].map(x => x[1])) {
            const r = R.get(ref);
            if (!r || !A5_ANY_COLOR.test(r.body)) continue;
            pairs++;
            if (A5_LEGAL.test(r.body)) continue;
            if (exemptHere) { exempt++; continue; }
            const line = src.slice(0, tagStart).split(/\r?\n/).length;
            say(`  🔴 A5 PAIR     ${f}:${line}  <${name} style={styles.${fill}}> is an accent-family FILL,`);
            say(`                 and the text inside it takes its colour from styles.${ref} (:${r.line}),`);
            say(`                 which is not the on-accent role. White on the held accent measured`);
            say(`                 2.15:1 and the plain foreground on it measures about 2.31:1 — a`);
            say(`                 failure at EVERY size. no-white-on-accent cannot see this pair:`);
            say(`                 the fill and the label are separate style rules joined only here.`);
            bad++; violations++;
          }
        }
      }
    }
  }
  say(`  ${'A5 pair · fill x label'.padEnd(38)} ${String(pairs).padStart(4)} pairs resolved, ` +
      `${bad} violating` + (bad ? '   🔴' : ''));
  if (exempt) {
    say(`    · ${'A5-PAIR-EXEMPT'.padEnd(24)} ${String(exempt).padStart(5)}   (named in the file, never summed)`);
  }
  // ── 🆕 A FLOOR ON THE *RESOLVER*, added at item 15 — and it is rule C applied to this counter ──
  //    🔴 `0 violating` IS ONLY MEANINGFUL IF THE RESOLVER FOUND ANYTHING TO CHECK. This rule walks
  //       a style graph in four stages (fill rules -> consuming elements -> subtree by tag depth ->
  //       each text node's own colour), and any one of those stages breaking returns ZERO PAIRS —
  //       which prints as `0 pairs resolved, 0 violating` and reads as a pass. That is the
  //       silently-opening guard `alpha-callsite-check.js` exists to prevent, arriving here.
  //    ⚠️ IT IS A FLOOR AND NOT AN EXACT COUNT, DELIBERATELY. The pair count is a DISCOVERY number:
  //       it falls when a fill legitimately moves into a primitive (it went 17 -> 16 at this item,
  //       because migrating the astrology hub's hand-rolled sheet moved its accent CTA pair into
  //       `Button`) and it rises whenever a new accent surface is written. An exact assertion would
  //       fail on correct work, i.e. cry wolf — and that is how `no-white-on-accent` was demoted.
  //       The failure mode worth blocking is the resolver going blind, and only zero shows that.
  if (pairs === 0) {
    say(`    🔴 THE A5 PAIR RESOLVER FOUND NO PAIRS AT ALL, which is not a clean result — it is the`);
    say(`       rule reporting that it can no longer see the class it was written for. Something in`);
    say(`       the four-stage walk (fill rules -> elements -> subtree -> label colour) broke, and`);
    say(`       "0 violating" beside it is vacuous. This app has accent fills; find them.`);
    violations++;
  }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
//  🆕 10a · ABSENCE E — 🔴 THE A6 GRADIENT SPAN. Added at the motion phase's item 0 (`P77`).
//
//  ── WHY IT EXISTS: `O-73` CLOSED A CLASS AS UNRESOLVABLE AND THAT RULING WAS TOO STRONG ───
//
//  `O-73` concluded: "a gradient ground is a function of POSITION, not a property of a style
//  rule — treat any gradient ground as unresolvable." That was right for an UNCONSTRAINED
//  gradient, and it is what made the share-card slabs a subtraction rather than a measurement.
//  🔴 BUT IT LEFT THE ONE GRADIENT THE DESIGN KEEPS BY NAME — X3's primary Button fill, on 60
//     call sites — permanently outside every instrument, and it was live sub-AA:
//
//      stops 100 / 85 / 70, all one hue, the last two TRANSLUCENT
//      composited over the canvas step the third stop reached luminance 0.173 = 3.85:1
//      the ramp CROSSED 4.5:1 at 74.7% of the diagonal
//      -> the last 25.3% of the app's primary control was sub-AA for its own label
//
//  🔴 THE STRONGER RULE, AND IT CONVERTS THE CLASS FROM UNRESOLVABLE TO SOLVABLE:
//     **A GRADIENT FILL'S RANGE MUST BE CONSTRAINED SO ITS ENTIRE SPAN CLEARS AA AGAINST THE
//     FOREGROUND THAT SITS ON IT.** Position-dependence is only fatal when the range is free.
//     Clamp the range and the position stops mattering — every point is legal by construction.
//     Unlike the position-dependent pairing that defeated the A5 pair rule, that IS mechanically
//     checkable, because the stop list is a literal and the span between two stops is a segment.
//
//  ── WHAT IT DOES, AND IT IS A MEASUREMENT RATHER THAN A TAXONOMY ──────────────────────────
//
//    1. parse every <LinearGradient>'s `colors={[…]}` into resolved RGBA stops, CODE-ONLY;
//    2. walk its subtree BY TAG DEPTH for text nodes — the A5 machinery, reused, not widened;
//    3. TRUNCATE that subtree at any descendant declaring an OPAQUE fill of its own, because
//       below such a descendant the gradient is not the ground at all;
//    4. resolve each surviving text node's colour;
//    5. SAMPLE the composited span and assert the MINIMUM ratio clears 4.5:1.
//
//  🔴 THERE IS NO "FILL vs WASH" CLASSIFICATION HERE, DELIBERATELY. Every earlier attempt at
//     this class needed one (`no-white-on-accent` had to exclude washes by pattern at pass 1b),
//     and a threshold on "how translucent is a wash" would be an invented design value — §0.0
//     rule 2. The MEASUREMENT already answers it: a 30%-accent wash with the plain foreground on
//     it composites to a light-on-dark pair that clears easily, and the same wash with the on-fill
//     role on it does not. Nothing has to be declared, because nothing has to be classified.
//
//  ⚠️ FOUR PROPERTIES THAT ARE LOAD-BEARING, NOT OPTIMISATIONS:
//
//   · 🔴 IT SAMPLES THE SPAN, NEVER ONLY THE STOPS. Relative luminance is a CONVEX function of a
//     gamma-space channel, so along a segment between two colours it lies BELOW the interpolation
//     of the endpoints' luminances — i.e. a two-hue ramp can dip DARKER THAN EITHER END in the
//     middle. Measured on a red-to-blue segment the midpoint sits below the darker endpoint. A
//     stops-only check is therefore unsound in general, and it is only sufficient for a ONE-HUE
//     alpha ramp (where a constant colour times a linear alpha is linear). Button is one-hue;
//     StreakBadge's accent-to-danger is not.
//   · 🔴 IT EVALUATES BOTH INTERPOLATION MODELS AND TAKES THE WORSE — `O-103` exactly. A
//     translucent ramp renders differently premultiplied vs straight-alpha, and P71 measured a
//     straight-alpha bulge PAST a stop's own value. Sampling one model would make the verdict a
//     property of the renderer rather than of the design.
//   · 🔴 A TRANSLUCENT STOP HAS NO SINGLE GROUND, so it is composited over EVERY opaque surface
//     step and the WORST result is the verdict. That is the honest bound and it is what makes the
//     answer independent of where the control is mounted (X3's Button is on 60 sites).
//   · ⚠️ TEXT NODES ONLY. A pictograph or an Ionicon on a fill is non-text contrast (3:1), a
//     different threshold and a different judgement; conflating them would make this rule
//     over-find, which is the direction that decommissions a rule.
//
//  🔴 THE ONE DECLARATION IT NEEDS, AND WHY IT CANNOT BE AVOIDED: Button's label colour is
//     COMPUTED (`labelColor`, a ternary over the disabled state), so no scanner resolves it — and
//     Button is the site this rule exists for. So a text node whose colour is UNRESOLVABLE inside
//     a gradient must declare its role IN THE GRADIENT'S OWN OPENING TAG:
//
//         {/* GRADIENT-FG(on-accent) */}
//
//     ⚠️ AND NOTE THE ASYMMETRY WITH `O-68` DIRECTION 2, because it is the whole reason a comment
//        is admissible here: a marker cannot SILENTLY SATISFY anything. Its ABSENCE fails, its
//        presence only supplies a role that is then MEASURED, and a wrong role produces a wrong
//        measurement rather than a green pass. The stop list and every resolvable label colour are
//        read from the CODE-ONLY projection; only the marker is read from raw source.
// ══════════════════════════════════════════════════════════════════════════════════════════
const A6_PALETTE = require('../theme.js').color;
const A6_GROUNDS = ['bg', 'surface', 'surface-raised', 'surface-overlay', 'locked'];
const A6_TOK = "t\\.color(?:\\.([A-Za-z0-9_$]+)|\\[\\s*['\"]([a-z0-9-]+)['\"]\\s*\\])";
const A6_AA = 4.5;

/** `#RRGGBB` or `rgba(r,g,b,a)` -> {r,g,b,a}; null for anything else. */
function a6parse(v) {
  let m;
  if ((m = /^#([0-9a-fA-F]{6})$/.exec(v))) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v))) {
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  return null;
}

const a6lin = c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const a6lum = c => 0.2126 * a6lin(c.r) + 0.7152 * a6lin(c.g) + 0.0722 * a6lin(c.b);
const a6ratio = (x, y) => {
  const l1 = a6lum(x), l2 = a6lum(y);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
/** `src` composited over an OPAQUE `dst`. */
const a6over = (s, d) => ({ r: s.a * s.r + (1 - s.a) * d.r, g: s.a * s.g + (1 - s.a) * d.g, b: s.a * s.b + (1 - s.a) * d.b, a: 1 });

/** One colour expression from a stop array, or null when it does not resolve. */
function a6colour(expr) {
  let m;
  if ((m = new RegExp('^t\\.alpha\\(\\s*' + A6_TOK + '\\s*,\\s*(\\d+)\\s*\\)$').exec(expr))) {
    const base = a6parse(A6_PALETTE[m[1] || m[2]] || '');
    return base ? { ...base, a: +m[3] / 100, role: m[1] || m[2] } : null;
  }
  if ((m = new RegExp('^' + A6_TOK + '$').exec(expr))) {
    const role = m[1] || m[2];
    const base = a6parse(A6_PALETTE[role] || '');
    return base ? { ...base, role } : null;
  }
  if (/^['"`]transparent['"`]$/.test(expr)) return { r: 0, g: 0, b: 0, a: 0, role: 'transparent' };
  if ((m = /^['"`](#[0-9a-fA-F]{6}|rgba?\([^)]*\))['"`]$/.exec(expr))) {
    const c = a6parse(m[1]);
    return c ? { ...c, role: 'raw' } : null;
  }
  return null;
}

/** The `{…}` value of `prop` inside an opening tag, by brace balance. */
function a6prop(tag, prop) {
  const m = new RegExp('[\\s{]' + prop + '\\s*=\\s*\\{').exec(tag);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  let i = open + 1, d = 1;
  while (i < tag.length && d > 0) {
    const q = skipQuoted(tag, i);
    if (q >= 0) { i = q; continue; }
    if (tag[i] === '{') d++; else if (tag[i] === '}') d--;
    i++;
  }
  return d === 0 ? tag.slice(open + 1, i - 1) : null;
}

/** Top-level items of an `[a, b, c]` literal, or null when the text is not one. */
function a6items(txt) {
  const s = txt.trim();
  if (!s.startsWith('[') || !s.endsWith(']')) return null;
  const body = s.slice(1, -1);
  const out = [];
  let d = 0, cur = '';
  for (let i = 0; i < body.length; i++) {
    const q = skipQuoted(body, i);
    if (q >= 0) { cur += body.slice(i, q); i = q - 1; continue; }
    const c = body[i];
    if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) d--;
    if (c === ',' && d === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.length ? out : null;
}

/** A stop list interpolated at `u` in [0,1] under one of the two alpha models. */
function a6at(stops, u, premultiplied) {
  const n = stops.length - 1;
  const seg = Math.min(Math.floor(u * n), n - 1);
  const lu = u * n - seg;
  const A = stops[seg], B = stops[seg + 1];
  const a = A.a + (B.a - A.a) * lu;
  if (!premultiplied) {
    return { r: A.r + (B.r - A.r) * lu, g: A.g + (B.g - A.g) * lu, b: A.b + (B.b - A.b) * lu, a };
  }
  const p = k => (A[k] * A.a) + (B[k] * B.a - A[k] * A.a) * lu;
  return a === 0 ? { r: 0, g: 0, b: 0, a: 0 } : { r: p('r') / a, g: p('g') / a, b: p('b') / a, a };
}

/**
 * The worst contrast anywhere along `stops` for foreground `fg`, per opaque ground.
 *
 * 🔴 THE VERDICT IS THE **BEST GROUND'S** WORST POINT, AND THAT CHOICE IS THE RULE'S SURVIVAL.
 *    A translucent stop has no single ground — the element could be mounted on any of the five
 *    opaque steps — so the first draft swept them and took the worst overall. Measured, that
 *    invented grounds that do not exist (10% accent over the `locked` step, under a PAGE
 *    background gradient that sits on nothing but the canvas) and produced **eleven false
 *    positives on correct code**, every one of them a page or card wash with a legal foreground.
 *    Over-finding is the direction that decommissions a rule — it is literally how
 *    `no-white-on-accent` fell — so the failure condition is the STRONGEST claim available:
 *    **sub-AA no matter what it sits on.** Both real defects in the tree fail it (Button's old
 *    third stop reads 3.85 on the canvas and 4.25 on the lightest step; BiometricConsent's 60%
 *    stop reads 3.11 and 3.46), and no wash does.
 *  ⚠️ The cost is stated rather than hidden: a pair that fails on SOME grounds and not others is
 *     printed as `ground-sensitive` and never summed with the violations. That residue is exactly
 *     `O-73`'s irreducible half — where the element is mounted decides — and it belongs in the
 *     output rather than in a paragraph.
 */
function a6worst(stops, fg, pinned, veils) {
  const per = [];
  for (const gName of pinned ? [pinned] : A6_GROUNDS) {
    let gnd = a6parse(A6_PALETTE[gName]);
    if (!gnd || gnd.a !== 1) continue;
    let min = Infinity, at = 0;
    for (const pre of [false, true]) {
      for (let i = 0; i <= 400; i++) {
        const u = i / 400;
        let bandGround = a6over(a6at(stops, u, pre), gnd);
        // 🔴 EVERY TRANSLUCENT FILL ON THE PATH FROM THE GRADIENT TO THE LABEL IS COMPOSED IN,
        //    OUTERMOST FIRST. Ignoring them is not the safe direction: numerology's Name-Destiny
        //    CTA puts its label on a 20% light veil OVER the accent tile, and the true ratio there
        //    is 1.93:1 — WORSE than the 2.31:1 the gradient alone would predict. So a veil can
        //    make a pair better or worse, and only composing decides which.
        for (const v of veils) bandGround = a6over(v, bandGround);
        const label = a6over(fg, bandGround);
        const r = a6ratio(label, bandGround);
        if (r < min) { min = r; at = u; }
      }
    }
    per.push({ ground: gName, min, at });
  }
  const best = per.reduce((a, b) => (b.min > a.min ? b : a));
  return { ...best, per, everyGround: per.every(p => p.min < A6_AA), anyGround: per.some(p => p.min < A6_AA) };
}

/**
 * 🔴 `Animated.createAnimatedComponent(X)` RENAMES AN ELEMENT, AND A RULE THAT ENUMERATES ELEMENT
 *    NAMES GOES BLIND TO IT. Added after the motion phase's item 6 did that to THIS rule.
 *
 * The aura on the 60-second wait screen became `<AnimatedAura>` so its opacity could breathe.
 * `elements(code, 'LinearGradient')` cannot see that name, so the largest accent ground on that screen
 * left this rule's population without a word: **`gradients read` fell 25 -> 24 and everything still
 * printed `0 violating`.** The A6 floor only fires at ZERO, so one gradient vanishing was invisible.
 *
 * 🔴 IT IS BLINDNESS CLASS 4 — ENUMERATION COMPLETENESS — ARRIVING SOMEWHERE NEW, AND THE PHASE DID IT
 *    TO ITSELF. The population was correct when the rule was written, and four items later the same
 *    phase changed it while following the no-new-node discipline this same phase established. Neither
 *    decision was wrong; what was missing was the join between them.
 * 🟢 So the alias is RESOLVED rather than listed, and `parsed == present` is asserted for gradient
 *    elements (`O-91`) so the next alias cannot silently shrink the population either.
 */
function animatedAliases(code) {
  const map = new Map();
  const re = /const\s+([A-Za-z_$][\w$]*)\s*=\s*Animated\.createAnimatedComponent\(\s*([A-Za-z_$][\w$.]*)\s*\)/g;
  let m;
  while ((m = re.exec(code))) map.set(m[1], m[2]);
  return map;
}

{
  let grads = 0, unparsed = 0, checked = 0, bad = 0, declared = 0, unresolved = 0, inherited = 0;
  let regrounded = 0, declaredNone = 0, gradPresent = 0;
  const sensitive = [];
  for (const f of FILES) {
    const raw = SRC.get(f);
    const aliasMap = animatedAliases(stripComments(raw));
    const gradNames = ['LinearGradient', ...[...aliasMap]
      .filter(([, target]) => target === 'LinearGradient').map(([alias]) => alias)];
    /* 🔴 THE PRESENCE SIDE DOES **NOT** READ `gradNames`, AND THE FIRST DRAFT DID — WHICH MADE THE
       ASSERTION HOLD BY CONSTRUCTION. `O-101` verbatim, in a new place: an invariant that derives BOTH
       of its sides from the same value cannot be evidence about that value. A defect injection proved
       it — breaking `gradNames`' first entry hid the gradient from the WALK and from the COUNT at once,
       so `walked N of M` stayed equal and the case reported MISSED against a rule that was genuinely
       blind. 🟢 So presence is counted from the LITERAL imported name, which the `expo-linear-gradient`
       import fixes, plus the aliases — independent of whatever list the walk happens to hold. */
    const present = ['LinearGradient', ...gradNames.slice(1)].reduce((n, g) =>
      n + (raw.match(new RegExp('<' + g.replace(/\./g, '\\.') + '(?=[\\s/>])', 'g')) || []).length, 0);
    gradPresent += present;
    if (!present) continue;
    // 🔴 THE ASSERTION HALF READS CODE ONLY (`O-68` direction 2). The marker half, and only the
    //    marker half, reads raw source — a marker IS a comment and cannot be anything else.
    const code = stripComments(raw);
    const R = styleRules(code);
    for (const e of gradNames.flatMap(n => elements(code, n))) {
      grads++;
      const eName = (code.slice(e.index).match(/^<([A-Za-z][\w.]*)/) || [, 'LinearGradient'])[1];
      let arr = a6prop(e.tag, 'colors');
      // ⚠️ ONE INDIRECTION IS FOLLOWED, AND ONLY ONE: a `?? IDENT` fallback onto a module-level
      //    array literal. ScreenContainer's page gradient is written that way, and it is the ground
      //    for 25 of 32 screens — leaving it unparsed would have exempted the single largest surface
      //    in the app from this rule. ⚠️ The caller-supplied half (`gradientColors`, a prop) is
      //    genuinely outside static reach; measured 2026-08-04, NO caller passes it, so the default
      //    IS the ground everywhere. A caller that starts passing one is a finding, not a gap.
      const ind = arr && /^\s*(?:[A-Za-z_$][\w$.]*\s*\?\?\s*)?([A-Z][A-Z0-9_]*)\s*$/.exec(arr);
      if (ind) {
        const decl = new RegExp('\\b(?:const|let)\\s+' + ind[1] + '\\b[^=]*=\\s*(\\[[^;]*?\\])\\s*;').exec(code);
        if (decl) arr = decl[1];
      }
      const items = arr && a6items(arr);
      const stops = items && items.map(a6colour);
      // 🔴 `O-91` — PARSED MUST EQUAL PRESENT, AND A SHORTFALL BLOCKS RATHER THAN PRINTING.
      //    family-arrival-check printed "113 checked" while silently dropping 15 sites, and the
      //    first response was to publish the gap as a report-only counter. That was the wrong
      //    move twice over. An element this rule cannot parse is a HOLE, so it fails here.
      if (!stops || stops.some(s => !s)) {
        // ScreenContainer's page gradient takes its stop list as a PROP with a module default,
        // which is a named, printed exception rather than a silent skip.
        const why = arr === null ? 'no literal colors= prop'
                  : !items ? 'colors= is not a literal array'
                  : 'a stop expression does not resolve to a palette colour';
        say(`  🔴 A6 UNPARSED  ${f}:${e.line}  <LinearGradient> — ${why}.`);
        say(`                 A gradient this rule cannot read is a gradient it cannot check, and`);
        say(`                 an unchecked gradient printed as a clean count is O-67 exactly. Give`);
        say(`                 the element a literal stop list, or resolve the indirection here.`);
        unparsed++; violations++; continue;
      }
      // Step 3 — TRUNCATE at any descendant that declares an OPAQUE fill of its own. Below such
      // a descendant the gradient is simply not the ground, so a text node there is not a pair.
      // 🔴 STRUCTURAL, NOT AN EXCEPTION LIST: GrowthCard wraps its whole body in an opaque
      //    surface step inside a 2px gradient ring, and without this it would report two false
      //    pairs. Over-finding is the direction that decommissions a rule.
      /* 🔴 A SELF-CLOSING GRADIENT IS NOT ONE TO SKIP — IT IS ONE THAT MUST DECLARE. Found at motion
         item 6: the wait screen's aura became a PINNED, ABSOLUTE SIBLING so its opacity could breathe,
         which made it self-closing. It had previously been the PARENT of the whole screen, so its
         subtree held every text node there and those were MEASURED pairs. As a sibling it has none,
         and the first draft of this line `continue`d — so the pair count fell 74 -> 72 and the largest
         ground on that screen stopped being checked, SILENTLY.
         ⚠️ AND THE RULE CANNOT RESOLVE IT STRUCTURALLY: an absolute sibling covering its parent IS the
            ground for its siblings' text, but joining those two statically means resolving z-order and
            geometry — `O-73`'s territory, and the over-finding direction. So it falls through to the
            DECLARATION path: the same discharge `ScreenContainer`'s page gradient uses, for the same
            reason. A full-bleed ground whose foregrounds are out of static reach NAMES the role it must
            keep legal, and the rule then measures the span against that role. */
      const sub0 = subtree(code, e.index, eName);
      let sub = sub0 || '';
      // 🔴 THE GRADIENT'S OWN GROUND, WHEN IT DECLARES ONE. `O-103`'s discharge put an OPAQUE
      //    `backgroundColor` on the same element as a translucent ramp, so that ground is a fact
      //    about the element rather than a guess — and reading it collapses the five-ground sweep
      //    to one real answer, which is the whole difference between a measurement and a bound.
      const own = new RegExp('backgroundColor:\\s*' + A6_TOK).exec(e.tag);
      const ownGround = own && (() => {
        const role = own[1] || own[2];
        const c = a6parse(A6_PALETTE[role] || '');
        return c && c.a === 1 ? role : null;
      })();
      // Every fill-declaring descendant, with its subtree RANGE, so a label's own path can be
      // reconstructed without a parser. An opaque fill RE-GROUNDS everything below it (the
      // gradient is simply not the ground there); a translucent one VEILS it.
      const FILL = new RegExp('\\bbg-([a-z0-9-]+)(?:/(\\d+))?\\b|backgroundColor:\\s*' + A6_TOK, 'g');
      const layers = [];
      /* ⚠️ THE ANIMATED ALIASES ARE WALKED TOO. Item 2 made the safe area animated, item 3 the
         touchable and item 4 the card's View — each under a NEW element name — so an enumeration of
         the plain names alone would stop seeing every fill this phase touched. */
      const pathNames = ['View', 'Animated.View', 'SafeAreaView', 'TouchableOpacity',
                         'LinearGradient', ...aliasMap.keys()];
      for (const d of pathNames.flatMap(n => elements(sub, n))) {
        if (d.index === 0) continue;
        const name = d.tag.slice(1).match(/^[A-Za-z][\w.]*/)[0];
        const inner = subtree(sub, d.index, name);
        const range = [d.index, d.index + (inner ? inner.length : d.tag.length)];
        // 🔴 A NESTED GRADIENT IS ITS OWN GROUND and is measured on its own pass. Without this the
        //    page wash in BiometricConsent "carried" the consent button's on-fill label 30% of the
        //    way down itself and reported 1.00:1 — a false positive so extreme it read as a broken
        //    rule, which it was.
        if (name === 'LinearGradient' || aliasMap.get(name) === 'LinearGradient') {
          layers.push({ range, reground: true }); continue;
        }
        let m2; FILL.lastIndex = 0;
        while ((m2 = FILL.exec(d.tag))) {
          const role = m2[1] || m2[3] || m2[4];
          const c = a6parse(A6_PALETTE[role] || '');
          if (!c) continue;
          const a = m2[2] !== undefined ? +m2[2] / 100 : c.a;
          if (a === 1) layers.push({ range, reground: true });
          else if (a > 0) layers.push({ range, veil: { ...c, a } });
          break;
        }
      }
      const marker = (/GRADIENT-FG\(\s*([a-z0-9-]+)\s*\)/.exec(raw.slice(e.index, e.index + e.tag.length)) || [])[1];
      let measuredHere = 0;
      const textNames = ['Text', 'Animated.Text',
        ...[...aliasMap].filter(([, tgt]) => tgt === 'Text').map(([a]) => a)];
      for (const tn of textNames.flatMap(n => elements(sub, n))) {
        const tnLine = code.slice(0, e.index + tn.index).split(/\r?\n/).length;
        const path = layers.filter(l => tn.index > l.range[0] && tn.index < l.range[1])
                           .sort((a, b) => a.range[0] - b.range[0]);
        if (path.some(l => l.reground)) { regrounded++; continue; }
        const veils = path.map(l => l.veil);
        // the label's own colour: className, then an inline `color:`, then one StyleSheet hop
        let fg = null, how = '';
        // ⚠️ EVERY `text-*` CANDIDATE IS TRIED, NOT THE FIRST ONE. A className carries a SIZE
        //    utility and a colour utility in the same string (`text-on-accent text-sm`), and which
        //    comes first is authorial. Only the candidate that names a palette role is a colour.
        const m3 = [...tn.tag.matchAll(/\btext-([a-z][a-z0-9-]*?)(?:\/(\d+))?(?=["'\s]|$)/g)]
          .find(x => A6_PALETTE[x[1]]);
        if (m3) {
          const c = a6parse(A6_PALETTE[m3[1]]);
          if (c) { fg = { ...c, a: m3[2] === undefined ? c.a : +m3[2] / 100, role: m3[1] }; how = `text-${m3[1]}`; }
        }
        if (!fg) {
          const inline = new RegExp('\\bcolor:\\s*' + A6_TOK).exec(tn.tag);
          if (inline) {
            const role = inline[1] || inline[2];
            const c = a6parse(A6_PALETTE[role] || '');
            if (c) { fg = { ...c, role }; how = `color: ${role}`; }
          }
        }
        if (!fg) {
          for (const ref of [...tn.tag.matchAll(/styles\.([A-Za-z0-9_$]+)/g)].map(x => x[1])) {
            const r = R.get(ref);
            const hit = r && new RegExp('\\bcolor:\\s*' + A6_TOK).exec(r.body);
            if (!hit) continue;
            const role = hit[1] || hit[2];
            const c = a6parse(A6_PALETTE[role] || '');
            if (c) { fg = { ...c, role }; how = `styles.${ref} -> ${role}`; break; }
          }
        }
        if (!fg && marker) {
          const c = a6parse(A6_PALETTE[marker] || '');
          if (c) { fg = { ...c, role: marker }; how = `GRADIENT-FG(${marker})`; declared++; }
        }
        // ⚠️ A TEXT NODE THAT DECLARES NO COLOUR AT ALL IS NOT A FOREGROUND THIS RULE OWNS — it
        //    INHERITS, and in this tree those nodes are pictographs: an emoji renders in its own
        //    colours and its contrast is a non-text question at a different threshold. The first
        //    draft treated "no colour found" as undeclared and produced 6 findings, all benign,
        //    five of them emoji. So UNDECLARED now means something much narrower and much more
        //    useful: **a colour IS declared here and this rule cannot resolve it.**
        const declaresColour = /\bcolor:/.test(tn.tag)
          || [...tn.tag.matchAll(/styles\.([A-Za-z0-9_$]+)/g)].some(x => /\bcolor:/.test((R.get(x[1]) || {}).body || ''))
          || /\btext-[a-z]/.test(tn.tag);
        if (!fg && !declaresColour) { inherited++; continue; }
        if (!fg) {
          say(`  🔴 A6 UNDECLARED ${f}:${tnLine}  a <Text> inside a <LinearGradient> (:${e.line}) DECLARES a`);
          say(`                 colour this rule cannot resolve — computed at the site, or one hop too`);
          say(`                 far. That is exactly Button's shape, and Button is why this rule exists.`);
          say(`                 Declare the role in the gradient's OWN opening tag:  GRADIENT-FG(<role>)`);
          unresolved++; violations++; continue;
        }
        checked++; measuredHere++;
        const w = a6worst(stops, fg, ownGround, veils);
        if (w.anyGround && !w.everyGround) {
          sensitive.push(`${f}:${e.line} ${how} — ${w.per.map(p => p.min.toFixed(2)).join(' / ')} across ` +
                         `${A6_GROUNDS.join(' / ')}`);
        }
        if (!w.everyGround) continue;
        say(`  🔴 A6 SPAN      ${f}:${e.line}  the gradient's span goes SUB-AA for the label it carries,`);
        say(`                 ON EVERY OPAQUE GROUND IN THE PALETTE.`);
        say(`                 stops   ${items.join(' , ')}`);
        say(`                 label   ${how}   (${f}:${tnLine})`);
        say(`                 worst   ${w.min.toFixed(2)}:1 at ${(w.at * 100).toFixed(1)}% of the span even over the ` +
            `LIGHTEST usable ground ('${w.ground}')`);
        say(`                 A GRADIENT FILL'S RANGE MUST BE CONSTRAINED SO ITS ENTIRE SPAN CLEARS AA.`);
        say(`                 Clamp the stop that fails — do not recolour the label (A5 leaves exactly`);
        say(`                 one legal one) and do not flatten the fill unless the design rules it.`);
        bad++; violations++;
      }
      // 🔴 THE ENUMERATION HALF, AND IT IS THE ONE THAT WOULD HAVE MADE THIS RULE MISS `P77`.
      //    X3's Button renders `{body}` — a VARIABLE holding either a <Text> or a spinner — inside
      //    its gradient, so the gradient's subtree contains NO text element at all and this rule
      //    measured ZERO pairs on the single site it was written for. It read green. That is the
      //    `O-91` shape at its worst: not an unparsed input, but a genuine element the walk simply
      //    has nothing to say about.
      //    So a gradient that measures NO pairs must SAY SO, in its own opening tag, with the role
      //    its content carries or the word `none`. Silence stops being a legal state — the same
      //    move `O-100`'s roll call made for the invariant register.
      if (measuredHere === 0) {
        if (!marker) {
          say(`  🔴 A6 SILENT    ${f}:${e.line}  this <LinearGradient> resolved NO label at all, and`);
          say(`                 silence is not a pass — X3's Button is exactly this shape (its content`);
          say(`                 is a variable) and it is the site this rule exists for. Declare, in`);
          say(`                 this element's OWN opening tag, either the role its content carries or`);
          say(`                 GRADIENT-FG(none) with the reason it carries no text.`);
          unresolved++; violations++;
        } else if (marker === 'none') {
          declaredNone++;
        } else {
          // A declared role with no text node found: measure it anyway. A declaration that is never
          // used is a declaration nobody checks.
          const c = a6parse(A6_PALETTE[marker] || '');
          if (!c) {
            say(`  🔴 A6 BAD ROLE  ${f}:${e.line}  GRADIENT-FG(${marker}) names no palette role.`);
            unresolved++; violations++;
          } else {
            declared++; checked++;
            const w = a6worst(stops, { ...c, role: marker }, ownGround, []);
            if (w.anyGround && !w.everyGround) {
              sensitive.push(`${f}:${e.line} GRADIENT-FG(${marker}) — ${w.per.map(p => p.min.toFixed(2)).join(' / ')} ` +
                             `across ${A6_GROUNDS.join(' / ')}`);
            }
            if (w.everyGround) {
              say(`  🔴 A6 SPAN      ${f}:${e.line}  the gradient's span goes SUB-AA for its DECLARED`);
              say(`                 foreground, on every opaque ground in the palette.`);
              say(`                 stops   ${items.join(' , ')}`);
              say(`                 label   GRADIENT-FG(${marker})`);
              say(`                 worst   ${w.min.toFixed(2)}:1 at ${(w.at * 100).toFixed(1)}% of the span even over ` +
                  `the LIGHTEST usable ground ('${w.ground}')`);
              say(`                 A GRADIENT FILL'S RANGE MUST BE CONSTRAINED SO ITS ENTIRE SPAN CLEARS AA.`);
              bad++; violations++;
            }
          }
        }
      }
    }
  }
  say(`  ${'A6 gradient · span x label'.padEnd(38)} ${String(checked).padStart(4)} pairs measured, ` +
      `${bad} violating` + (bad ? '   🔴' : ''));
  say(`    · ${'gradients read'.padEnd(24)} ${String(grads).padStart(5)}   ` +
      `${unparsed} unparsed, ${unresolved} undeclared   (both must be 0 — O-91)`);
  // 🔴 `O-91` ON THE POPULATION ITSELF, ADDED AFTER ITEM 6 SHRANK IT SILENTLY. Every rule above asks
  //    whether a gradient PASSES; this one asks whether the rule SAW it. `grads` counts what the walk
  //    enumerated and `gradPresent` counts the raw `<Gradient` tags including resolved aliases, so an
  //    element renamed out of the walk's reach fails HERE instead of quietly leaving the population.
  //    ⚠️ It is not the same as the ZERO floor below: the floor catches the walk breaking entirely,
  //       and this catches it losing ONE — which is what actually happened, and which printed clean.
  say(`    · ${'population · walked'.padEnd(24)} ${String(grads).padStart(5)}   of ` +
      `${gradPresent} present in source` + (grads === gradPresent ? '' : '   🔴'));
  if (grads !== gradPresent) {
    say('    🔴 A GRADIENT ELEMENT EXISTS IN SOURCE THAT THIS WALK DID NOT ENUMERATE. The likeliest');
    say('       cause is a new `Animated.createAnimatedComponent(...)` alias, or a gradient imported');
    say('       under a different local name — both rename the ELEMENT, and this rule keys on element');
    say('       names. `animatedAliases()` resolves the first form; anything else needs adding there.');
    violations++;
  }
  say(`    · ${'inherited (no colour)'.padEnd(24)} ${String(inherited).padStart(5)}   ` +
      `(pictographs — a non-text threshold, deliberately not this rule's)`);
  say(`    · ${'re-grounded below a fill'.padEnd(24)} ${String(regrounded).padStart(5)}   ` +
      `(an OPAQUE fill or a nested gradient on the path — not this gradient's ground)`);
  if (declared) {
    say(`    · ${'GRADIENT-FG declared'.padEnd(24)} ${String(declared).padStart(5)}   ` +
        `(a computed label colour; the role is declared, then MEASURED)`);
  }
  // 🔴 THE `O-73` RESIDUE, PRINTED RATHER THAN FILED. These pairs are legal on some opaque grounds
  //    and not on others, so the verdict genuinely depends on where the element is mounted — which
  //    is the irreducible half of "a gradient ground is a function of position". They do NOT block
  //    (that would be the over-finding direction), and they are NEVER summed with the violations.
  say(`    · ${'GRADIENT-FG(none)'.padEnd(24)} ${String(declaredNone).padStart(5)}   ` +
      `(a declared decision that the gradient carries no text — never a silence)`);
  say(`    · ${'ground-sensitive'.padEnd(24)} ${String(sensitive.length).padStart(5)}   ` +
      `(O-73's residue: legal on some opaque grounds, not all — READ these)`);
  sensitive.forEach(s => say(`       ${s}`));
  // 🔴 A FLOOR ON THE RESOLVER, the same shape and the same reason as the A5 pair rule's. Six
  //    stages have to work for a pair to be measured, and any one of them breaking returns ZERO —
  //    which prints as "0 pairs measured, 0 violating" and reads as a pass. It is a FLOOR rather
  //    than an exact count because the pair count is a DISCOVERY number that moves with correct
  //    work (a gradient retired to `aura` removes pairs, a new accent surface adds them), and an
  //    exact assertion on a discovery number cries wolf — which is how no-white-on-accent fell.
  if (checked === 0) {
    say(`    🔴 THE A6 RESOLVER MEASURED NO PAIRS AT ALL. This app renders text directly on gradient`);
    say(`       fills; a zero here is the rule reporting that it can no longer see the class it was`);
    say(`       written for, and "0 violating" beside it is vacuous.`);
    violations++;
  }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
//  🆕 11 · THE HELPER CENSUS — §9 item 17, and it is a CONTRACT SHAPE THIS FILE DID NOT HAVE.
//
//  🔴 EVERY OTHER ASSERTION HERE KEYS ON A JSX ELEMENT NAME, ON THE STATED GROUND THAT AN ELEMENT
//     NAME IS THE ONE THING THAT SURVIVES BOTH A CLASS AND A STYLE. `openPaywall` is a FUNCTION, so
//     it has no element name, and the thing it replaces — a navigation call — has none either.
//     Nothing in the tree could assert item 17 arrived.
//
//  It gets the same four assertions a primitive contract gets, one shape over:
//    1. ADOPTION    every file that must call the helper does
//    2. UNDECLARED  a file calling it that is not in the contract is a FINDING
//    3. SITES       an EXACT total — a fall is a lost origin, a rise is an unrecorded one
//    4. LEGACY      the ad-hoc form is absent across the WIDE roots (class 8, see WIDE_ROOTS)
//
//  🔴 ASSERTION 4 IS THE ONE THAT MATTERS AND IT IS THIS PHASE'S THIRD REAL DECREASING COUNTER
//     (§0.2 class 1): 22 -> 19 -> 15 -> 0. An adoption count of 10/10 reads COMPLETE while a
//     fifteenth origin is still pushing the route by hand, and the surface it lands on is the
//     highest-revenue one in the app.
// ══════════════════════════════════════════════════════════════════════════════════════════
const HELPERS = [
  {
    name: 'openPaywall',
    module: 'lib/paywall.ts',
    // Measured 2026-08-03 at the commit after item 13. `O-41` said 22 sites in 16 files; item 4
    // collapsed 4 and item 13 collapsed 6 more, so the number has moved TWICE since it was taken.
    callers: [
      'app/(main)/astrology/daily.tsx',
      'app/(main)/astrology/monthly.tsx',
      'app/(main)/compatibility/index.tsx',
      'app/(main)/numerology/index.tsx',
      'app/(main)/profile.tsx',
      'app/(main)/readings/combined.tsx',
      'app/(main)/readings/cosmic-report.tsx',
      'app/(main)/readings/index.tsx',
      'app/(main)/readings/qa.tsx',
      'components/ui/LockShell.tsx',
    ],
    sites: 15,
    // 🔴 THE LEGACY FORM. It matches a navigation call whose argument mentions the route group, so
    //    the helper's own module is NOT excluded and needs no exclusion — its calls pass a named
    //    constant. An exclusion is a hole; not needing one is strictly better.
    legacy: /router\.(?:push|replace|navigate)\(\s*['"`][^'"`]*\(paywall\)/,
    legacyWhy:
      'an ad-hoc navigation to the paywall route group. It carried FOUR different spellings of ' +
      'one route across 15 sites, each cast past the type system, and one of them was a REPLACE ' +
      'rather than a push — which is why a push-only helper would have been worse than none.',
    // ⚠️ ONE FILE MUST NEVER CALL IT, and it is not a style ruling: the auth root layout decides
    //    which group the user belongs in and a helper call there would fight the redirect it owns.
    forbidden: [
      ['app/_layout.tsx',
        'this file OWNS group routing (it reads segments to decide where the user belongs). A ' +
        'paywall push from inside that decision races the redirect it is part of.'],
    ],
  },
];

for (const h of HELPERS) {
  const callRe = new RegExp('\\b' + h.name + '\\s*\\(', 'g');
  const declared = new Set(h.callers);
  const forbidden = new Map(h.forbidden || []);
  const seen = [];
  let sites = 0;
  for (const f of WIDE_FILES) {
    if (f === h.module) continue;                      // the helper is never its own caller
    // 🔴 CODE ONLY. A header comment naming the helper is not a call site, and item 13 measured
    //    that hazard in its own census: prose MOVING A COUNT is the third direction of "a comment
    //    is source", and it is the one an inexact assertion cannot see.
    const src = stripComments(WIDE_SRC.get(f));
    const n = (src.match(callRe) || []).length;
    if (n) { seen.push(f); sites += n; }
  }
  const missing = h.callers.filter(f => !seen.includes(f));
  const undeclared = seen.filter(f => !declared.has(f) && !forbidden.has(f));
  const trespass = seen.filter(f => forbidden.has(f));
  const residue = missing.length + undeclared.length + trespass.length;
  say(`  ${(h.name + '() · adoption').padEnd(38)} ${String(declared.size).padStart(4)} expected, ` +
      `${String(seen.length).padStart(4)} actual, ${String(residue).padStart(3)} residue` +
      `   (${sites} call sites)` + (residue ? '   🔴' : ''));
  missing.forEach(f => {
    say(`    🔴 MISSING     ${f} is contracted to call ${h.name}() and does not.`);
    violations++;
  });
  undeclared.forEach(f => {
    say(`    🔴 UNDECLARED  ${f} calls ${h.name}() and is not in the contract.`);
    violations++;
  });
  trespass.forEach(f => {
    say(`    🔴 FORBIDDEN   ${f} calls ${h.name}() and MUST NOT.  ${forbidden.get(f)}`);
    violations++;
  });
  const sitesOk = sites === h.sites;
  say(`    · ${'call sites (exact)'.padEnd(24)} ${String(sites).padStart(5)}, expected ${h.sites}` +
      (sitesOk ? '' : '   🔴'));
  if (!sitesOk) {
    say(`    🔴 A FALL is an origin that stopped reaching the paywall — silent, and on the highest-`);
    say(`       revenue surface in the app. A RISE is a new origin nobody recorded a source for.`);
    violations++;
  }
  const stray = [];
  for (const f of WIDE_FILES) {
    const src = WIDE_SRC.get(f);
    const g = new RegExp(h.legacy.source, 'g');
    let m;
    while ((m = g.exec(src))) stray.push(`${f}:${src.slice(0, m.index).split(/\r?\n/).length}`);
  }
  say(`    · ${'legacy ad-hoc nav'.padEnd(24)} ${String(stray.length).padStart(5)}   🔴 must be 0` +
      `   (was 22 -> 19 -> 15; the ONE decreasing counter this item gets)`);
  if (stray.length) {
    say(`       ${h.legacyWhy}`);
    stray.forEach(s => say(`       ${s}`));
    violations++;
  }
  say(`    · ${'search roots'.padEnd(24)} ${String(WIDE_FILES.length).padStart(5)} files across ` +
      `${WIDE_ROOTS.length} roots   (class 8 — the narrow two would not see lib/ or hooks/)`);
}

// ── 8 · the TOKEN CENSUS (absence C) ──────────────────────────────────────────────────────
for (const t of TOKENS) {
  const re = new RegExp(
    t.re !== undefined ? t.re : (
      't\\.color\\.' + t.token + '\\b|' +
      't\\.color\\[\\s*[\'"]' + t.token + '[\'"]\\s*\\]|' +
      '\\b(?:bg|text|border)-' + t.token + '\\b'), 'g');
  const hits = [];
  for (const f of FILES) {
    // 🔴 `files` SCOPES A CENSUS TO ITS OWN POPULATION, and it exists because a tree-wide total
    //    RECONCILES BY ACCIDENT — one lost here, one gained there, and the number never moves.
    //    That is the same argument `siteCounts` makes for counting per pattern rather than per
    //    total, applied to the axis a token census actually spans. An unscoped census stays
    //    unscoped; nothing about the default changes.
    if (t.files && !t.files.includes(f)) continue;
    const src = SRC.get(f);
    let m; re.lastIndex = 0;
    while ((m = re.exec(src))) hits.push(`${f}:${src.slice(0, m.index).split(/\r?\n/).length}`);
  }
  // 🔴 `exact` fails in BOTH directions, deliberately. A rise is a new instance of the class; a
  //    FALL is a site that was fixed without the number being moved, and an unmoved number is how
  //    a counter stops meaning anything (O-29 / §2.3 make the same argument for their floors).
  const exact = t.exact !== undefined;
  const ok = exact ? hits.length === t.exact
                   : (t.expect === 0 ? hits.length === 0 : hits.length > 0);
  say(`  ${("token census · '" + t.token + "'").padEnd(38)} ${String(hits.length).padStart(4)} call sites, ` +
      `expected ${exact ? String(t.exact) : (t.expect === 0 ? '0' : 'nonzero')}` + (ok ? '' : '   🔴'));
  say(`    · ${'owner'.padEnd(24)}   ${t.owner}`);
  if (!ok) {
    say(`    🔴 ${t.why}`);
    say(`       A wrong grounding here is invisible to every other gate in the tree and permanent.`);
    hits.slice(0, 12).forEach(h => say(`       ${h}`));
    violations++;
  } else if (VERBOSE) hits.forEach(h => say(`       ${h}`));
}

// ══════════════════════════════════════════════════════════════════════════════════════════
//  🆕 12 · `A7 window edge · bottom clearance` — THE 26TH NAMED RULE (2026-08-05)
//
//  🔴 WHY IT EXISTS, AND IT IS A FOUNDER REPORT RATHER THAN A HYPOTHESIS. On a Samsung device using
//     3-BUTTON navigation the six tab labels rendered INSIDE the system back/home/recents row, with
//     an empty band above the bar. Root cause, measured in Expo's prebuild and in the installed
//     navigator: the app config sets no edge-to-edge field, so prebuild writes the opt-out theme
//     attribute — which Android 16 IGNORES for an app targeting 36, which this app targets since
//     the compliance bump. The window then extends behind the system bars and the app owns the inset.
//
//  🔴 EVERY DISTANCE WRITTEN FROM A WINDOW EDGE IS THEREFORE A CLAIM ABOUT A NUMBER THE APP DOES NOT
//     KNOW. A 3-button row is ~48, gesture is ~24, Samsung's variants and foldables differ again —
//     so a constant is correct on the device it was written on and wrong on the next one. That is
//     exactly why the defect was invisible to the owner's device and to every gate: the app renders
//     identically, nothing throws, and `tsc` has no opinion about a number.
//
//  FOUR ASSERTIONS, and the third is the one that would have caught the original defect:
//    1. POPULATION  every absolutely-positioned rule with a NUMERIC window-edge distance is walked,
//                   and the total is EXACT — a new bottom-anchored surface must be declared here
//                   rather than arriving unchecked (class 4, ENUMERATION completeness)
//    2. DERIVED     each declared member must ADD the real inset to that literal AT ITS OWN CALL
//                   SITE, resolved BY RULE NAME and required to sit AFTER the name in the style
//                   array (last-wins, so an override before it does nothing). The literal stays a
//                   literal; the inset is added to it
//    3. HOOK SHAPE  `useBottomInsetPadding` must NOT add the inset to a bar height that already
//                   contains it. That double count was the empty band, and it is the direction a
//                   presence check cannot see: both halves looked correct on their own
//    4. PRECONDITION every caller of that hook renders `ScreenContainer`, whose safe area has
//                   already cleared the system inset. The hook's arithmetic DEPENDS on that, so a
//                   caller outside it is a gate failure rather than content sliding under the row
//
//  ⚠️ THE TAB BAR ITSELF IS NOT IN THIS POPULATION and is not asserted here. It is a configuration
//     block, not a style rule, and X18 is its home: the two derivations are literals on the `Tabs`
//     contract above and exact counts in `invariant-register-check.js`. One invariant, one home.
//  ⚠️ AND WHAT A GREEN LINE MEANS HERE IS NARROWER THAN USUAL, because this rule's subject is a
//     RUNTIME value: it proves each distance is DERIVED, never that the result clears anything. The
//     clearance itself needs the device the report came from.
// ══════════════════════════════════════════════════════════════════════════════════════════
const A7_ABS = /position:\s*'absolute'/;
const A7_EDGE = /(?:^|[\s,{])bottom:\s*(-?\d+(?:\.\d+)?)/;

//  file, style-rule name, the literal distance, why it is a WINDOW-edge distance
const A7_DECLARED = [
  ['app/(capture)/face-capture.tsx', 'bottomControls', 40,
    'the SHUTTER row. This screen has no safe area at all — the camera preview is deliberately ' +
    'full-bleed — so the lower ~8 of an 80dp shutter sat inside the system row on 3-button ' +
    'navigation: the funnel\'s primary control, partly untappable.'],
  ['app/(capture)/face-capture.tsx', 'previewActions', 40,
    'Retake / Use Photo, 56 tall at the same distance. Same screen, same absent safe area.'],
  ['app/(capture)/face-capture.tsx', 'previewPrompt', 110,
    '🔴 THE COUPLED ONE. It sits above previewActions, so it takes the SAME inset or the two ' +
    'overlap. Raising one distance and not its neighbour is how this class produces a collision ' +
    'instead of a clipped edge.'],
  ['app/(capture)/palm-capture.tsx', 'captureContainer', 40,
    'the shutter, the other capture screen. The two files are copies of one layout and diverged ' +
    'twice already during this programme; they move together.'],
  ['app/(capture)/palm-capture.tsx', 'previewActions', 40, 'Retake / Use Photo, palm side.'],
  ['components/capture/FaceGuideOverlay.tsx', 'tipsBottom', 140,
    'the tip row above the face shutter. Coupled to the shutter for the same reason as the prompt ' +
    '— the TIPS move, because the shutter is the control.'],
  ['components/capture/PalmGuideOverlay.tsx', 'tipsBottom', 150,
    'the tip row above the palm shutter.'],
];

//  file, style-rule name, why this one is NOT a window-edge distance
const A7_EXEMPT = [
  ['app/(main)/home.tsx', 'inline',
    'a decorative flourish offset behind a CARD corner, not a window edge. Its distance is measured ' +
    'from its parent and adding a system inset to it would move a graphic for no reason. ⚠️ It is ' +
    'matched as `inline` because it is written at the JSX site rather than in a StyleSheet.'],
];

//  file, regex, why — a derivation with no other home in the register
const A7_SITES = [
  ['app/(paywall)/index.tsx', /paddingBottom: insets\.bottom/,
    'the paywall carries NO safe area and its scroll content had no bottom distance at all, so ' +
    'under enforced edge-to-edge the two legal links (48dp targets) and the renewal disclosure sat ' +
    'inside the system row. ⚠️ X19 and every part of the commerce path are untouched by this term.'],
];

/**
 * Is this style rule's window-edge distance derived AT ITS OWN CALL SITE, and does the derivation
 * WIN?
 *
 * 🔴 THE FIRST DRAFT ASKED THE FILE, NOT THE RULE, AND A DEFECT INJECTION KILLED IT. It tested
 *    whether the file contained `bottom: <n> + insets.bottom` anywhere. `face-capture.tsx` has TWO
 *    rules anchored at the same distance, so deleting the shutter's derivation left the sibling's
 *    identical expression satisfying the assertion — cases 5 and 6 both read MISSED, on the one
 *    control the whole screen exists for. Same shape as `O-67`'s presence-assertion row: a literal
 *    that appears twice is satisfied by either copy.
 *
 * 🟢 SO IT RESOLVES BY NAME, AND THE `after` WINDOW IS LOAD-BEARING RATHER THAN CONVENIENT: React
 *    Native resolves a style array LAST-WINS, so an override that sits BEFORE the rule it overrides
 *    does nothing. Requiring the derivation after the name asserts precedence as well as presence.
 */
function a7derived(code, name, dist) {
  const use = new RegExp('styles\\.' + name + '\\b', 'g');
  const want = new RegExp('bottom:\\s*' + dist + '\\s*\\+\\s*insets\\.bottom');
  let m;
  while ((m = use.exec(code))) {
    const rest = code.slice(m.index, m.index + 240);
    const end = rest.indexOf(']}');
    if (want.test(end === -1 ? rest : rest.slice(0, end))) return true;
  }
  return false;
}

{
  const declared = new Map(A7_DECLARED.map(d => [d[0] + '#' + d[1], d]));
  const exempt = new Map(A7_EXEMPT.map(d => [d[0] + '#' + d[1], d]));
  let walked = 0, exempted = 0, bad = 0;
  const seen = new Set();

  for (const f of WIDE_FILES) {
    // 🔴 CODE ONLY (O-68 direction 3). A paragraph naming a distance is not a distance, and this
    //    file's own header names several of them.
    const code = stripComments(WIDE_SRC.get(f));
    const rules = styleRules(code);

    // The StyleSheet half.
    for (const [name, v] of rules) {
      if (!A7_ABS.test(v.body)) continue;
      const m = v.body.match(A7_EDGE);
      if (!m) continue;
      const key = f + '#' + name;
      seen.add(key);
      if (exempt.has(key)) { exempted++; continue; }
      walked++;
      const d = declared.get(key);
      if (!d) {
        say(`    🔴 UNDECLARED  ${f}:${v.line} · ${name} anchors ${m[1]} from the window edge and is ` +
            `not declared. Add it with its reason, or exempt it with one.`);
        bad++; violations++; continue;
      }
      if (Number(m[1]) !== d[2]) {
        say(`    🔴 MOVED       ${f}:${v.line} · ${name} is ${m[1]}, declared ${d[2]}. A distance that ` +
            `moves without this list moving is the shape that hides the whole class.`);
        bad++; violations++; continue;
      }
      const derived = a7derived(code, name, d[2]);
      const reads = /useSafeAreaInsets/.test(code);
      if (!derived || !reads) {
        say(`    🔴 CONSTANT    ${f}:${v.line} · ${name} is a bare ${d[2]} where a real inset is ` +
            `available. ${d[3]}`);
        bad++; violations++;
      }
    }

    // The inline half — a window-edge distance written at the JSX site. Only the exempt list is
    // matched here; a NEW one shows up as UNDECLARED above only if it lives in a StyleSheet, so this
    // loop is what stops the inline form from being a hole in the population.
    const inlineRe = /style=\{\{[^{}]*position:\s*'absolute'[^{}]*\}\}/g;
    let im;
    while ((im = inlineRe.exec(code))) {
      if (!A7_EDGE.test(im[0])) continue;
      const key = f + '#inline';
      seen.add(key);
      if (exempt.has(key)) { exempted++; continue; }
      walked++;
      say(`    🔴 UNDECLARED  ${f}:${code.slice(0, im.index).split(/\r?\n/).length} · an inline ` +
          `absolutely-positioned window-edge distance. Declare it or exempt it.`);
      bad++; violations++;
    }
  }

  const total = walked + exempted;
  const expectTotal = A7_DECLARED.length + A7_EXEMPT.length;
  say(`  ${'A7 window edge · bottom clearance'.padEnd(38)} ${String(walked).padStart(4)} anchors, ` +
      `${String(bad).padStart(3)} violating` + (bad ? '   🔴' : ''));
  say(`    · ${'population · walked'.padEnd(24)} ${String(total).padStart(5)} of ${expectTotal} declared` +
      (total === expectTotal ? '' : '   🔴'));
  if (total !== expectTotal) {
    say(`    🔴 A FALL is an anchor deleted or a rule renamed, so this list stops describing the tree.`);
    say(`       A RISE is a new bottom-anchored surface nobody decided about. Both are findings.`);
    violations++;
  }
  say(`    · ${'excepted: NOT AN EDGE'.padEnd(24)} ${String(exempted).padStart(5)} exact` +
      (exempted === A7_EXEMPT.length ? '' : '   🔴'));
  if (exempted !== A7_EXEMPT.length) {
    say(`    🔴 AN EXEMPTION WENT STALE. Each one names a rule that is positioned from its PARENT ` +
        `rather than from the window, and a stale exemption is how a real anchor stays unchecked:`);
    A7_EXEMPT.forEach(([file, name, why]) => {
      if (!seen.has(file + '#' + name)) say(`       gone: ${file} · ${name} — ${why}`);
    });
    violations++;
  }
  for (const [file, re, why] of A7_SITES) {
    const ok = re.test(stripComments(WIDE_SRC.get(file) || ''));
    say(`    · ${('derived · ' + file.replace(/^app\//, '')).padEnd(24)} ${ok ? '   ok' : '   🔴'}`);
    if (!ok) { say(`    🔴 ${why}`); violations++; }
  }

  // ── assertion 3 · THE HOOK'S SHAPE, IN BOTH DIRECTIONS ──────────────────────────────────
  const HOOK = 'hooks/useBottomInsetPadding.ts';
  const hookCode = stripComments(WIDE_SRC.get(HOOK) || '');
  const hookOk = /Math\.max\(0,\s*tabBarHeight - insets\.bottom\)/.test(hookCode);
  const hookDouble = /insets\.bottom \+ tabBarHeight/.test(hookCode);
  say(`    · ${'hook · no double count'.padEnd(24)} ${hookOk && !hookDouble ? '   ok' : '   🔴'}`);
  if (!hookOk || hookDouble) {
    say(`    🔴 THE BAR'S HEIGHT ALREADY CONTAINS THE SYSTEM INSET — in either branch of the ` +
        `navigator's own getTabBarHeight, and explicitly in our tabBarStyle since 2026-08-05. So does`);
    say(`       the container being padded (ScreenContainer's safe area takes ALL edges). Adding it ` +
        `again put the last row of content ~112 above the bar on a 3-button device.`);
    violations++;
  }

  // ── assertion 4 · THE HOOK'S PRECONDITION, PER CALLER ───────────────────────────────────
  const callers = [];
  for (const f of WIDE_FILES) {
    if (f === HOOK) continue;
    const code = stripComments(WIDE_SRC.get(f));
    const n = (code.match(/useBottomInsetPadding\(/g) || []).length;
    if (n) callers.push([f, n]);
  }
  const sites = callers.reduce((a, [, n]) => a + n, 0);
  const outside = callers.filter(([f]) => !/<ScreenContainer/.test(stripComments(WIDE_SRC.get(f))));
  // Measured 2026-08-05, CODE ONLY: 17 files, 18 sites — `compatibility/index.tsx` calls it twice
  // (the hub and its history list). ⚠️ Two more files NAME the hook in prose and are correctly not
  // counted; audit §7.5's "five screens" is the Build-22 original set and has been stale for a while.
  const CALLER_FILES = 17, CALLER_SITES = 18;
  say(`    · ${'hook callers'.padEnd(24)} ${String(callers.length).padStart(5)} files, ${sites} sites, ` +
      `expected ${CALLER_FILES} / ${CALLER_SITES}` +
      (callers.length === CALLER_FILES && sites === CALLER_SITES ? '' : '   🔴'));
  if (callers.length !== CALLER_FILES || sites !== CALLER_SITES) {
    say(`    🔴 A caller arrived or left without this number moving. The count is here because the ` +
        `hook's value is only correct inside the container asserted below.`);
    violations++;
  }
  say(`    · ${'callers inside container'.padEnd(24)} ${String(callers.length - outside.length).padStart(5)}` +
      ` of ${callers.length}` + (outside.length ? '   🔴' : ''));
  outside.forEach(([f]) => {
    say(`    🔴 PRECONDITION ${f} calls useBottomInsetPadding() and does not render ScreenContainer. ` +
        `The returned value assumes the system inset has ALREADY been cleared by the container.`);
    violations++;
  });
}

process.exit(violations ? 1 : 0);
