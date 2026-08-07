// tailwind.config.js
//
// ╔══════════════════════════════════════════════════════════════════════════════════╗
// ║  STAGE S0 — THE BRIDGE.  codemod-plan.md §1.1.  DO NOT SKIP AHEAD TO §6.2.        ║
// ╚══════════════════════════════════════════════════════════════════════════════════╝
//
// UI-revamp-design.md §6.2 is the END STATE of this file. It **replaces** `colors`,
// `spacing`, `borderRadius` and `fontSize` rather than extending them. 🔴 The moment
// that lands, every legacy utility stops resolving: 565 retired custom names, 339
// default-ramp names, ~160 radius usages, 55 text-4xl/5xl/6xl and 45 leading-* — all
// SILENTLY DROPPED, because NativeWind discards an unresolvable utility with no warning,
// no build error and no runtime signal. The app would be visibly broken from pass 0
// through pass 4 and no gate could tell you which pass did it.
//
// So the config lands in FOUR stages, each attached to the pass that earns it:
//
//   S0  bridge          ← PASS 0. YOU ARE HERE. Purely ADDITIVE: every new token name
//                         starts working while every legacy utility keeps resolving at
//                         exactly its current value. Verified 0 rules moved.
//   S1  colour cutover  ← end of PASS 1b. `colors` extend → replace. Safe only because
//                         pass 1 just drove no-raw-hex and no-legacy-tokens to zero.
//   S2  type cutover    ← PASS 2a adds `fontSize` as a replace carrying TYPE_FREEZE
//                         (§1.4); PASS 2b removes the freeze and deletes theme.lineHeight.
//   S3  spacing+radius  ← PASS 3a moves `spacing` to replace. PASS 3b lands
//                         `borderRadius` as a replace INSIDE the same commit as all 373
//                         radius rewrites — radius CANNOT bridge (sm/md/lg/xl are legal
//                         keys in both scales with different values), and D2 already
//                         classifies it as a value pass, so there is no identity to hold.
//
// At the end of pass 3b + pass 4 this file is byte-identical to §6.2. Until then, every
// legacy key below is LOAD-BEARING. Deleting one early is the single easiest way to break
// this revamp invisibly.
const t = require('./theme');
const px = o => Object.fromEntries(
  Object.entries(o).map(([k, v]) => [k, `${v}px`]));

// ╔══════════════════════════════════════════════════════════════════════════════════╗
// ║  STAGE S2 — TYPE CUTOVER.  COMPLETED IN PASS 2b.  codemod-plan.md §1.1, §1.5.     ║
// ╚══════════════════════════════════════════════════════════════════════════════════╝
//
// 🟢 `TYPE_FREEZE` IS GONE (pass 2b batch D1, 2026-07-31). S2 is now COMPLETE.
//
//    Pass 2a shipped a `TYPE_FREEZE` table here that held every step's lineHeight at the
//    value the app rendered on that day, so 2a could be provably fontSize-only. That was
//    the ONLY thing separating size from leading — they ship in ONE Tailwind `fontSize`
//    object, so nothing else could (D1). Deleting it is the single edit that lands the
//    ramp's real vertical rhythm, and it is THE LARGEST VERTICAL CHANGE IN THE REVAMP.
//
// 🔴 THIS IS A VALUE PASS. DO NOT ASSERT IDENTITY ANYWHERE AGAINST IT. Measured deltas,
//    every one intended (design §6.6 D/E, codemod-plan §1.5):
//      text-sm    218 sites   GAINS lineHeight 22 where it emitted NONE   ≈ +4.4px / line
//      text-xs     91 sites   GAINS lineHeight 19 where it emitted NONE   ≈ +3.8px / line
//      text-base   91 sites   24 → 22                                            −2
//      text-lg     83 sites   28 → 24                                            −4
//      text-xl     69 sites   28 → 26                                            −2
//      text-2xl    53 sites   32 → 28                                            −4
//      display-lg  25 sites   36 → 34, tracking 0 → −0.6                         −2
//    ~309 sites get TALLER and ~321 get TIGHTER. Paragraph blocks grow while headings
//    compress — that IS the intended editorial rhythm. The gate is a human reading
//    screenshots (§1.5); there is no automated acceptance test for this and there must
//    not appear to be one.
//
// 🔴 `letterSpacing` IS NOW EMITTED ON EVERY STEP, and its absence in 2a was deliberate,
//    not an oversight. 2a omitted it because emitting `0px` where no declaration exists
//    ADDS A KEY to the resolved rule and reports five moved rules inside a pass whose
//    whole claim was that nothing moved. 2b has no identity claim to protect, so this
//    reverts to §6.2's authored form — which is also what the S3 exit condition
//    (`config == §6.2`) will eventually diff against. The five zero-tracking steps emit
//    `letterSpacing: 0`, inert at runtime (RN defaults to 0); the seven others carry the
//    ramp's real tracking, and those ARE value changes.
//
// ⚠️ `4xl` / `5xl` / `6xl` STAY FROZEN, AND THEY OUTLIVE 2b. NOT AN OMISSION.
//    A bare replace deletes them and NativeWind discards an unresolvable utility
//    silently — the 30 live `text-4xl`/`5xl`/`6xl` usages in 27 files would render at the
//    platform default with no error, no warning and no build signal. They are ABOVE THE
//    RAMP CEILING (display-lg 30 vs 36/48/60), so there is no target to move them to:
//    retiring them is a per-site VALUE decision in its own reviewed commit, and X12
//    (AstroNumeroBadge's 44) and X17 (SunSignReveal's emoji) protect several outright.
//    Consequence to state plainly: this file is NOT yet byte-identical to design §6.2,
//    and cannot be until those 30 sites retire. `3xl` is absent because 2a renamed all 25
//    of its usages to `display-lg`.
//
// ◀ C-a  Strip the ramp's `text-` prefix AT THIS BOUNDARY ONLY (design §6.4 V1).
//        Tailwind builds the utility as `text-` + key, so a key of 'text-sm' emits
//        `text-text-sm` while bare `text-sm` resolves to NOTHING — measured at 609 dead
//        className usages across the six busiest steps (`text-sm` alone is 218 in 41
//        files). theme.type stays keyed as written so txt('text-sm') and §3.3's ramp
//        table read the same; only the emitted utility name is stripped.
// 🔴 AND THE STRIPPED NAME COLLIDES ONCE: the `overline` key emits `text-overline`, while
//    Tailwind's OWN `.overline` decoration utility keeps the bare spelling. Writing
//    `className="overline"` therefore resolves — to the wrong thing — and no other
//    instrument can see it. That is O-28; `no-bare-overline` in token-gate.sh is the
//    only guard. Do NOT rename the key to dodge it: theme.js must agree with design §3.3.
const fontSize = {
  ...Object.fromEntries(Object.entries(t.type).map(([k, s]) => [
    k.replace(/^text-/, ''),
    [`${s.size}px`, {
      lineHeight: `${s.lineHeight}px`,
      letterSpacing: `${s.letterSpacing}px`,
    }],
  ])),
  // above-the-ceiling legacy, still frozen — see the block above.
  '4xl': ['36px', { lineHeight: '40px' }],
  '5xl': '48px',
  '6xl': '60px',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    // ╔════════════════════════════════════════════════════════════════════════════════╗
    // ║  STAGE S1 — COLOUR CUTOVER.  LANDED AT THE END OF PASS 1b.                      ║
    // ╚════════════════════════════════════════════════════════════════════════════════╝
    // 🔴 `colors` is a TOP-LEVEL REPLACE, not an extend. Tailwind's entire default palette
    //    and all 565 retired custom names are now GONE — nothing legacy resolves.
    //    This is safe ONLY because pass 1 just drove no-raw-hex and no-legacy-tokens to their
    //    floor and DELETED lib/colors.ts. It would have been catastrophic at pass 0: NativeWind
    //    discards an unresolvable utility with no warning, no build error and no runtime
    //    signal, so the app would have been visibly broken from pass 0 through pass 4 with no
    //    gate able to say which pass did it (§1.1).
    //    ⚠️ `spacing`, `fontSize` and `borderRadius` STAY IN `extend` — they cut over at S2/S3.
    colors: { ...t.color, chart: t.chart },          // ◀ C-g

    // ╔════════════════════════════════════════════════════════════════════════════════╗
    // ║  STAGE S2 — TYPE CUTOVER.  LANDED IN PASS 2a.                                   ║
    // ╚════════════════════════════════════════════════════════════════════════════════╝
    // 🔴 `fontSize` is now a TOP-LEVEL REPLACE. Tailwind's whole default type scale is
    //    GONE — the only keys that resolve are the 12 ramp steps (prefix-stripped) plus
    //    the three frozen above-ceiling legacy keys. Pass 2b removed TYPE_FREEZE, so each
    //    step now carries theme.type's own lineHeight and letterSpacing.
    //    ⚠️ `spacing` and `borderRadius` STAY IN `extend` — they cut over at S3.
    fontSize,

    // ╔════════════════════════════════════════════════════════════════════════════════╗
    // ║  🔴 THE `leading-*` SCALE IS DELETED.  PASS 2b, batch D2.  IRREVERSIBLE.        ║
    // ╚════════════════════════════════════════════════════════════════════════════════╝
    // 🔴 THIS EMPTY OBJECT IS THE WHOLE POINT AND IT MUST NOT BE "TIDIED AWAY".
    //    Tailwind's `theme` replace is PER KEY: omitting `lineHeight` does NOT delete the
    //    scale, it leaves Tailwind's DEFAULT one in force. Design §6.2 omits the key
    //    entirely, so §6.2 as authored would leave every `leading-*` utility resolving —
    //    measured, not inferred (leading-4/5/6/7/8 were all live in the pre-D2 snapshot).
    //    An explicit empty object is the only spelling that makes `leading-*` stop
    //    resolving. Deleting this line silently resurrects the whole scale.
    //
    //    WHY: the ramp bakes a lineHeight into all twelve steps, and a surviving
    //    `leading-*` overrides exactly the thing the ramp exists to guarantee — on the
    //    app's densest reading copy (design §6.6 E). 45 usages, all stripped from source
    //    in this same commit; `no-leading-utilities` proves the set is empty.
    //
    // 🔴 AND THE ONE THAT WILL BITE A LATER READER: D1 TURNED THE "8 NO-OPS" INTO LIVE
    //    OVERRIDES. §6.6 E records that 8 of the 45 (6 × `text-base leading-6`, 2 ×
    //    `text-lg leading-7`) restate Tailwind's own value and therefore do nothing. That
    //    was true UNTIL D1: D1 moved text-base 24→22 and text-lg 28→24, so those 8 became
    //    live +2 / +4 overrides. Post-D1 ALL 45 override, none is a no-op, and the 34
    //    text-sm/text-xs sites carrying a `leading-*` are the ONLY places where D1's
    //    vertical change did not land. D1 and D2 are two commits and ONE visual change.
    lineHeight: {},

    // ╔════════════════════════════════════════════════════════════════════════════════╗
    // ║  PASS 4 · E2 — THE FAMILY CUTOVER.  `fontFamily` extend -> TOP-LEVEL REPLACE.   ║
    // ╚════════════════════════════════════════════════════════════════════════════════╝
    // 🔴 A REPLACE, per design §6.2, and it is safe for one measured reason and no other:
    //    the only key it deletes is Tailwind's `sans`, and the utility built from it has
    //    **0 usages** — measured at pass 0 and RE-MEASURED at E2, still 0. If that ever
    //    stops being true, this becomes a silent breakage of exactly the kind §1.1 describes.
    //    The legacy `sans: ['System']` bridge entry is deleted with it; it existed only so a
    //    pre-pass-4 tree could not lose a utility, and there was never a utility to lose.
    //
    // 🔴 THE FIVE KEYS ARE THE ONLY WAY A `className`-TYPED <Text> CAN NAME A FACE, and the
    //    three namespaces stay disjoint by construction (design §3.2): colour roles are the
    //    fg/bg/border families, size steps come from `fontSize` above, families are these.
    //    Nothing here collides with anything there — design V4 measured the intersection empty.
    //
    // ⚠️ THESE UTILITIES CARRY *ONLY* THE FAMILY. They do NOT carry a size, and the size
    //    utilities do NOT carry a family — Tailwind's fontSize plugin honours only lineHeight,
    //    letterSpacing and fontWeight in its options object, so a family cannot be smuggled in
    //    there. That independence is why 410 className-typed <Text> nodes in this app end up
    //    with a SIZE and NO FAMILY, and why pass 4 needs the global default in lib/textDefaults
    //    rather than a per-utility trick. See token-gate.sh's `text-defaults-installed`.
    fontFamily: {
      display:     [t.family.display],
      quote:       [t.family.quote],
      body:        [t.family.body],
      'body-semi': [t.family['body-semi']],
      'body-bold': [t.family['body-bold']],
    },

    // ╔════════════════════════════════════════════════════════════════════════════════╗
    // ║  STAGE S3a — SPACING CUTOVER.  PASS 3a.  codemod-plan.md §1.1, §1.6.             ║
    // ╚════════════════════════════════════════════════════════════════════════════════╝
    // 🔴 `spacing` is now a TOP-LEVEL REPLACE. Tailwind's entire default spacing scale is GONE;
    //    the only keys that resolve are theme.js's 13 authoring names plus the 8 migration-only
    //    resolution keys. Measured before the move: this deletes ONLY unused default keys —
    //    `--diff` reports **0 rules moved** and `--members` **0 unresolved classes**, across all
    //    101 spacing utilities the tree writes.
    //
    // 🔴 WHY THIS IS SAFE HERE AND WAS NOT SAFE AT PASS 0 — it is one measured fact, not a
    //    judgement: post-`inlineRem: 16` every key 0–12 ALREADY resolves to the identical value
    //    this object emits (design §6.6 B: 91 of 102 utilities pixel-identical, ZERO carrying any
    //    delta), and `spaceLegacy` carries TAILWIND'S OWN numbers (key × 4dp), not each key's own
    //    number. So the replace removes possibilities, never values.
    //    ⚠️ Writing `{14:14, 20:20, 48:48}` instead would collapse every p-20/w-20/h-20 from 80px
    //       to 20px — a silent 4× shrink with no build-time signal (design §6.4 V3). The numbers in
    //       `spaceLegacy` are deliberately NOT their keys. Do not "fix" them.
    //
    // 🔴 THREE THINGS THIS REPLACE DOES NOT TOUCH, each verified rather than assumed:
    //    · `w-full`/`h-full`/`w-3/4`/`w-5/6`/`ml-auto` — they come from `theme.width`/`theme.height`,
    //      which MERGE spacing plus their own percentage and keyword keys (design V3). Untouched.
    //    · `max-w-sm`/`max-w-md` — `theme.maxWidth` is NOT replaced by design §6.2, so those two
    //      sites stay `rem`-valued and `inlineRem`-dependent PERMANENTLY. That is O-15, registered
    //      as a caveat, and it is the one family for which "the config is explicit px so inlineRem
    //      goes inert" is FALSE.
    //    · `p-[2px]` — an arbitrary value, resolved by the JIT, never from this scale.
    //
    // 🔴 `px` IS LOAD-BEARING AND IS A NAMED KEY, NOT A NUMERIC ONE. `h-px` is the "or continue
    //    with" hairline divider on BOTH auth screens (4 sites). Describe this scale as "13 numeric
    //    steps" and drop it, and all four dividers vanish silently. theme.js's `space` ships it as
    //    the thirteenth AUTHORING name (correction C-b) precisely so that cannot happen.
    //    🔴 `30` remains deliberately ABSENT: Tailwind 3 never had that key, so the four classes
    //    that used it never resolved. Pass 3a DELETED them from `profile.tsx` rather than adopting
    //    the key — adopting it would have silently changed that avatar's dimensions.
    spacing: px({ ...t.space, ...t.spaceLegacy }),

    // ╔════════════════════════════════════════════════════════════════════════════════╗
    // ║  STAGE S3b — RADIUS CUTOVER.  PASS 3b.  codemod-plan.md §1.1, §1.6.  🔴 LOSSY.   ║
    // ╚════════════════════════════════════════════════════════════════════════════════╝
    // 🔴 `borderRadius` is a TOP-LEVEL REPLACE, and it landed ATOMICALLY with all 368 site
    //    rewrites in ONE commit. That is not a preference — RADIUS CANNOT BRIDGE. `sm`, `md`,
    //    `lg` and `xl` are legal keys in the OLD scale (4/8/12/16 via rem) and in the NEW one
    //    (8/14/20/28) with DIFFERENT values, so a bridge would need a disjoint namespace and
    //    would force every one of the 373 sites to be written twice. D2 classifies radius as a
    //    VALUE pass, so there is no identity to protect: land it atomically and read the diff.
    //
    // 🔴 THIS PASS IS LOSSY AND ITS ONLY UNDO IS `git revert`. 21 inline values and 6 class
    //    spellings collapse onto 5 keys — many-to-one BY CONSTRUCTION (16 and 12 both land on
    //    the 14px key). The source no longer contains what it used to say. Do NOT plan, write
    //    down, or attempt an inverse-mapping recovery: pass 2a already proved that failure mode
    //    at a cost (+40/−71 on a four-value → two-target mapping).
    //
    // ⚠️ THERE IS NO IDENTITY GATE HERE AND THERE NEVER WAS. Radius pixel-identity was never
    //    achievable, so `--diff` is used as a DELTA LEDGER, not a pass/fail. 5 rules move; the
    //    ledger is in the commit body and it is RE-DERIVED FROM THE RULED PER-SITE VERDICTS,
    //    never from the class-level map — which was measured wrong for 18 of the 49 grep-blind
    //    sites, and would have failed on correct code.
    //
    // 🔴 `radius.md` IS 14 AND STAYS 14. `rounded-2xl` → the 14px key was byte-identical at
    //    `inlineRem: 14` and is −2 at 16. That was a COINCIDENCE, NOT A PROPERTY. Retuning
    //    `radius.md` to 16 to "buy back" those 73 sites corrupts the deliberate 8/14/20/28
    //    rhythm to satisfy a gate that never applied to this half. Ruled three times.
    //
    // ⚠️ THE PILL IS ONE SPELLING. Three competing spellings collapse into it, and design §4.4
    //    puts `Button`, chip, avatar and progress track on it — which is why 6 hand-rolled
    //    buttons and `Button.tsx`'s own 4 inline radii went to the pill step rather than to the
    //    14px key, a SHAPE change the class-level map could not have produced.
    borderRadius: px(t.radius),

    // 🔴 S0 USES `extend` THROUGHOUT — never a top-level replace. `extend` merges over
    //    Tailwind's defaults; a replace deletes them. See the stage table above.
    extend: {

      // ── `spacing` WAS HERE UNTIL S3a (pass 3a). It is now the top-level REPLACE above. ──
      //    🔴 DO NOT RE-ADD IT TO `extend`: an extend MERGES OVER Tailwind's defaults, so the
      //       whole default scale (7, 9, 10, 11, 13, 24, 28, 36, 40, 44, 52, 56, 60, 72, 80, 96 …)
      //       would come back. None of those keys is in the authoring vocabulary, and every one of
      //       them would then resolve silently — which is how a scale stops being a scale.
      //    The two NEW names it introduced (`screen-x` 24, `screen-y` 32) are what ScreenContainer
      //    OWNS, and pass 3a pointed the 6 + 2 genuine screen-gutter sites at them.

      // ── `fontSize` WAS HERE UNTIL S2. It is now the top-level REPLACE above. ────────
      //    🔴 DO NOT RE-ADD IT TO `extend`: an extend MERGES OVER Tailwind's defaults, so
      //       the whole legacy scale (text-3xl…text-9xl, and text-base/lg/xl at Tailwind's
      //       own rem values) would come back and quietly out-resolve the ramp.
      //    The two overrides that used to live here — `xs: '13px'`, `sm: '15px'` — are
      //    RETAINED KNOWINGLY inside theme.type (§3.4): text-sm=15 has 218 usages and is
      //    the highest-blast-radius step in the repo, so holding 15/13 is exactly what
      //    makes the SIZE half of this pass a literal no-op across those sites.

      // ── `fontFamily` WAS HERE UNTIL E2. It is now the top-level REPLACE above. ──────
      //    🔴 DO NOT RE-ADD IT TO `extend`: an extend MERGES OVER Tailwind's defaults, so
      //       `sans`/`serif`/`mono` would come back. `serif` in particular is the dangerous
      //       one — a stray serif utility resolving to the platform serif is precisely the
      //       "looks nearly right, is not the shipped face" failure this pass exists to close.

      // W3: one line to swap to StyleSheet.hairlineWidth
      borderWidth: { hairline: `${t.a11y.hairline}px` },

      // ── `borderRadius` NEVER LIVED HERE, and at S3b it became the top-level REPLACE above.
      //    🔴 DO NOT ADD IT TO `extend`: an extend MERGES OVER Tailwind's defaults, so the old
      //       scale's `sm`/`md`/`lg`/`xl` would come back at their rem values and out-resolve
      //       four of the five new steps — the one namespace in this config where a bridge is
      //       actively harmful rather than merely redundant.
    }
  },
  plugins: []
};
