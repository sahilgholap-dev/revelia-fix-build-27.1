// theme.js — the single authored token file, plain CJS so both Metro and
// tailwind.config.js can require() it. Tailwind consumes it by spread, so className,
// inline style and StyleSheet.create resolve to the same literals and drift is
// structurally impossible (UI-audit §2.1, §7.1).
//
// 🔴 STAYS `.js`. tailwind.config.js require()s it and Metro needs no transform.
//    Do not "modernise" it to .ts or ESM. Types live in the sibling theme.d.ts.
//
// ╔══════════════════════════════════════════════════════════════════════════════════════╗
// ║  🟢 THE FLIP HAS HAPPENED — PASS 5, 2026-07-31. `color` AND `chart` NOW CARRY VELLUM. ║
// ╚══════════════════════════════════════════════════════════════════════════════════════╝
//
// Passes 1–4 held TODAY's palette behind tomorrow's names (codemod-plan §0.3): ~4,200 sites
// moved onto semantic token names while the rendered colour stayed put, so every one of those
// diffs was reviewable as a rename. **Pass 5 was the colour flip and only the colour flip** —
// one object in one file. The old palette is one `git revert` away, and the held→Vellum table
// is codemod-plan §1.6a. The trailing comments below record what each value REPLACED.
//
// 🔴 DO NOT RE-ADD A "HELD" COLUMN OR A FLAG HERE. The hold existed to make passes 1–4
//    reviewable; there are no more passes to hold for, and a second palette in this file is the
//    `lib/colors.ts` failure mode (two live token systems) rebuilt from scratch.
//
// ⚠️ TWO THINGS THE FLIP CHANGED ABOUT THE **SHAPE** OF THESE VALUES, both load-bearing:
//   1. `border-subtle` and `border-strong` were solid hex while HELD and are `rgba()` now. Any
//      guard, gate pattern or conditional that branches on a token's VALUE rather than its ROLE
//      was correct for four passes and is wrong from here (codemod-plan §3.0.2.2.1). `alpha()`'s
//      guard was written role-shaped for exactly this and needs no change — see its comment.
//   2. 🔴 **`bg` AND `scrim` NOW HOLD THE SAME VALUE (`#100E0D`)** — a held-value collision the
//      flip CREATED, in the opposite direction from the five the ledger tracked (which were two
//      names converging while held and diverging here). It is harmless today and the reason is
//      worth writing down: the only value-keyed logic left in this file is `alpha()`'s reverse
//      lookup, which now returns `['bg','scrim']` for that value and denies neither.
//      🔴 SO IF ANYONE EVER ADDS `bg` TO `ALPHA_DENIED`, EVERY INLINE SCRIM IN THE APP STARTS
//         THROWING AT IMPORT — 17 of them live inside `StyleSheet.create`, i.e. module scope,
//         where a throw dies white before the root ErrorBoundary exists.
const color = {
  // ── surfaces ──
  bg: '#100E0D',                              // replaced #0F0A1A
  surface: '#171412',                         // replaced #1A1425
  'surface-raised': '#1E1A17',                // replaced rgba(255,255,255,0.05) — the held value
                                              //   was the MIDDLE of an absorbed 0.03–0.05 alpha
                                              //   range (§1.6b V-4); 1b resolved the range
  'surface-overlay': '#26211D',               // replaced rgba(255,255,255,0.10) — absorbed 0.08 + 0.10
  // 🔴 `locked` IS **RESERVED** AND HAS **ZERO CALL SITES**. DO NOT DELETE IT.
  //    Measured at pass 1a: lock state is expressed today as an OVERLAY + GLYPH + COPY, never
  //    as a surface colour. LockedOverlay grounds on bg-black/60 (a SCRIM); LockedSection's
  //    container is rgba(255,255,255,0.03) — the value every ordinary raised card uses; the
  //    rest are 🔒 glyphs in fg-muted. §1.6b V-6's "no old equivalent" is literal.
  //    Same three reasons to keep it as `warning` below:
  //      1. It is one of the design's 18 contracted colour roles (UI-revamp-design.md §2).
  //      2. 🔴 NO GATE CAN CATCH AN UNUSED TOKEN — `no-legacy-tokens` only sees names that ARE
  //         used. THIS COMMENT IS THE ONLY PROTECTION.
  //      3. Its call sites are CREATED in the PRIMITIVES phase, when LockShell (§9.1, three
  //         densities) is authored — NOT by any codemod pass.
  //
  //    🟢 AND THE COLLISION WITH `surface-raised` WAS ELIMINATED BY ORDERING, NOT BY ENUMERATION
  //       — 🟢 AND THAT IS NOW SPENT AND CONFIRMED, AT PASS 5. Both were held at
  //       rgba(255,255,255,0.05), so while the hold was in force the identity gate could not tell
  //       them apart. The flip has landed and **the primitives phase runs after it**, so `locked`
  //       (#2A2521) and `surface-raised` (#1E1A17) are now ALREADY VISIBLY DISTINCT: whoever
  //       grounds LockShell picks a token and can SEE the result immediately.
  //       🔴 The ambiguity existed ONLY while both sides were one value, and pass 5's static
  //          arrival verification PROVED neither side was ever written during that window —
  //          `locked` measured ZERO call sites on the eve of the flip, in every spelling.
  //       Full record: plans/build-27.1/held-collision-ledger.md C1 / ENTRY 4.
  locked: '#2A2521',                          // replaced nothing — RESERVED, see above
  // 🔴 SCRIM IS A **SOLID HEX**, NOT rgba — OWNER RULING R3 (2026-07-30), which CORRECTS the
  //    earlier P20 / §1.6b V-5 form `rgba(0,0,0,0.6)`. The alpha is ALWAYS carried by the
  //    utility modifier at the site (`bg-scrim/60`, `bg-scrim/90`), never baked into the token.
  //
  //    ⚠️ THE CONSEQUENCE, AND IT IS A FOOTGUN: a bare `bg-scrim` is FULLY OPAQUE, not 60%.
  //       There is no default alpha. Every scrim site MUST spell its modifier.
  //       Measured while held: `bg-scrim` -> rgba(0,0,0,var(--tw-bg-opacity,1)) = opaque black.
  //    🔴 AND PASS 5 MADE THAT FOOTGUN WORSE, NOT BETTER — `no-bare-scrim` is MORE valuable now.
  //       Post-flip the opaque fill is `#100E0D`, which is `bg` ITSELF (they share a value). So a
  //       forgotten modifier no longer paints an obvious black slab over the content; it paints
  //       THE CANVAS COLOUR, and the screen just looks like an empty surface someone meant to
  //       render. A total occlusion that LOOKS DELIBERATE is harder to spot than one that looks
  //       broken. `no-bare-scrim` stays a permanent invariant at 0.
  //
  //    Why solid hex wins (measured, not assumed — see §1.6b V-5's MEASUREMENT block):
  //      · while held, `bg-scrim/60` resolved to `#00000099` — **byte-identical** to the old
  //        `bg-black/60`. So the four className scrims were IDENTITY renames, not value changes.
  //        Post-flip they are `#100e0d99` / `b3` / `e6`, i.e. they moved with the token, as
  //        intended: the alpha at the site is preserved and only the base changed.
  //      · `bg-scrim` (no modifier) gains the `--tw-bg-opacity` var indirection every other
  //        solid token has, instead of the flat literal an rgba token emits.
  //    🔴 V-5's stated reason — "bg-scrim/70 cannot compose against a colour that already
  //       carries alpha" — is FALSE and was withdrawn by R3. Tailwind DOES compose a modifier
  //       onto an rgba theme colour (it REPLACES the alpha channel). The conclusion stands on
  //       the two measured grounds above, not on that claim.
  scrim: '#100E0D',                           // replaced #000000 — ⚠️ now EQUAL to `bg`; see the
                                              //   header note, and never deny `bg` in alpha().
                                              // 🔴 OWNER DECISION P20 / §1.6b V-5: ONE value,
                                              //   not three. The live 0.5 ×7 / 0.6 ×3 / 0.7 ×6
                                              //   spread is DRIFT, NOT DESIGN — the 16 rgba
                                              //   literals collapse onto `bg-scrim/60`, which is
                                              //   the only way no-raw-hex reaches zero on them.
                                              //   SunSignReveal KEEPS its near-opaque 0.90 as
                                              //   `bg-scrim/90` — do not force it to /60 (R3).

  // ── foreground ──
  fg: '#F4EFE9',                              // replaced #FFFFFF — was text-primary
  'fg-secondary': '#C6BDB2',                  // replaced #D1D5DB — was text-secondary (= gray-300)
  'fg-muted': '#8E867C',                      // replaced #9CA3AF — was text-muted (= gray-400)
  'fg-placeholder': '#6B645C',                // replaced #6B7280 — Input.tsx's gray-500
  'fg-disabled': 'rgba(244,239,233,0.38)',    // = fg @ 38%; replaced rgba(255,255,255,0.38)
                                              // 🔴 NO old equivalent (§1.6b V-6): before 1b,
                                              //   disabled was a container `opacity: 0.5` hack.
                                              //   The role was NEW at pass 1, and it pairs with
                                              //   `opacity: 1`. That swap landed in 1b.

  // ── borders ──
  // 🔴 BOTH OF THESE WERE SOLID HEX WHILE HELD AND ARE rgba() FROM PASS 5 ONWARD. That shape
  //    change is why `alpha()`'s guard had to be ROLE-shaped rather than value-shaped — see its
  //    comment, and codemod-plan §3.0.2.2.1 for the general class.
  'border-subtle': 'rgba(244,239,233,0.07)',  // = fg @ 7%; replaced #1F2937 (border-gray-800 ×60)
  'border-strong': 'rgba(244,239,233,0.16)',  // = fg @ 16%; replaced #2D2640 (lib/colors.inputBorder)
  // ── 🆕 THE CONTROL BOUNDARY — added 2026-08-04, and it CLOSES A WCAG 1.4.11 GAP THE TABLE
  //    ABOVE NEVER COVERED (`O-83` / `O-87`, owner-registered as `P61` / `P62`).
  //
  // 🔴 NEITHER NEUTRAL EDGE ABOVE CAN LEGALLY DELIMIT A CONTROL, and it is arithmetic rather
  //    than taste. 1.4.11 requires 3:1 for the visual information that identifies a UI
  //    component's BOUNDARY or its STATE. Measured across every ground in this object:
  //
  //                     bg     surface   raised   overlay   locked      (1.4.11 needs 3.00)
  //      subtle        1.16      1.17     1.20      1.20     1.21
  //      strong        1.51      1.55     1.58      1.61     1.60
  //      THIS ROLE     4.07      3.87     3.65      3.37     3.20
  //
  //    And a FILL cannot carry it instead: the surface steps are ~1.08 apart, so a field that
  //    is a step lighter than its card is not a field, it is a slightly different rectangle.
  //
  // 🔴 DERIVED AGAINST THE WORST GROUND A CONTROL CAN REACH, NOT AGAINST THE CARD STEP. A value
  //    tuned to exactly 3:1 on `surface` measures 3.14 on `bg` and 2.73 on `surface-overlay` —
  //    and the overlay step is the Input fill (§2 row 4), i.e. the ground the single most common
  //    control in the app actually sits on. That is `O-66` as a derivation rule: one published
  //    figure read as if it covered all four steps is how the muted role shipped at 4.43.
  //
  // 🔴 IT IS A NEW ROLE, NOT `fg-muted` REUSED. Five sites had reached for the meta role as the
  //    nearest specified value (5.11 on surface, so contrast-legal) and every one of them was
  //    `O-39`'s role-DIMENSION error: a FOREGROUND token doing a BORDER's job. The trade is
  //    deliberate and it is a small LOSS of contrast at those five — 5.11 → 3.87 — bought for a
  //    correct role. `primitive-adoption-check.js` asserts the meta role never returns to a
  //    border, and asserts this role's own site count exactly.
  //
  // ⚠️ SOLID HEX, NOT AN ALPHA OF `fg` LIKE ITS TWO NEIGHBOURS, AND THE SHAPE IS THE ARGUMENT.
  //    An alpha edge's contrast is a property of whatever it composites over, so the 3:1 claim
  //    would be re-derived per ground forever and would be unmeasurable over a plate, a wash or
  //    a camera feed. A solid value has ONE ratio per ground, asserted once, in the table above.
  //    It also keeps `ALPHA_DENIED` at six rather than seven — see that list's comment.
  // ⚠️ AND DO NOT PUT IT THROUGH `alpha()`. Nothing throws — it carries no alpha of its own, so
  //    the guard correctly permits it — but any reduction drops it below 3:1 and silently undoes
  //    the only reason the row exists. There is no legal partial-opacity spelling of this role.
  //
  // 🔴 SCOPE, AND IT IS THE WHOLE POINT OF A THIRD NEUTRAL: a CONTROL boundary delimits
  //    something interactive, or carries its state. A STRUCTURAL border separates content —
  //    card edges, list-row rules, section dividers, progress tracks, decorative frames — and
  //    those KEEP the two roles above, where being quiet is the job. An outline button is
  //    deliberately NOT in scope: its label identifies it, so its edge is not the identifying
  //    information, which is what keeps row 12's documented role from being emptied out.
  'border-control': '#7A7268',                // replaced nothing — a NEW role; see above

  // ── accents ──
  // 🔴 `accent` ABSORBS THREE live brand colours (§1.6b V-1): #6B21A8 (primary-dark),
  //    #F59E0B (gold) and lib/colors.primaryDark's *other* value #4C1D95. Held at the
  //    LARGEST of the three, so the ~31 purple sites turn gold **visibly inside pass 1b**
  //    — that is a reviewed change with a screenshot pass, not an identity rename.
  accent: '#D98E57',                          // replaced #F59E0B
  'accent-muted': 'rgba(217,142,87,0.14)',    // = accent @ 14%; replaced rgba(245,158,11,0.14)
  // 🔴 `accent-2` ABSORBS FOUR brand colours (OWNER DECISION P20): #C4B5FD (`primary`,
  //    §1.6b V-2), #EC4899 (`pink`, V-3), #A78BFA, plus its own #C084FC.
  //    `accent-2` MEANS **premium / brand secondary** AND NOTHING ELSE. It must not
  //    become "the generic second colour" — anything that is merely not-accent belongs
  //    in fg-secondary, fg-muted or border-strong, never here.
  'accent-2': '#B3A6D9',                      // replaced #C084FC
  'accent-2-muted': 'rgba(179,166,217,0.12)', // = accent-2 @ 12%; replaced rgba(192,132,252,0.12)
  // the accessible pairing that already exists in the repo, at (paywall)/index.tsx's
  // text-black on bg-gold. §1.6b V-7 / A5: white on held accent is 2.15:1 and fails.
  'on-accent': '#1A1512',                     // replaced #000000

  // ── status ──
  success: '#86A97B',                         // replaced #10B981
  // 🔴 `warning` IS **RESERVED** AND HAS **ZERO CALL SITES**. DO NOT DELETE IT.
  //    Measured at pass 1a (batch B3): all 99 gold sites in the app resolve to `accent`; not one
  //    carries caution / alert / expiry semantics, because genuine alerts already use `danger` red.
  //    Three reasons it stays despite being unused:
  //      1. It is one of the design's 18 contracted colour roles (UI-revamp-design.md §2) —
  //         deleting it means re-adding it, and a re-add is a token-table change, not a tidy-up.
  //      2. 🔴 NO GATE CAN CATCH AN UNUSED TOKEN. `no-legacy-tokens` only sees names that ARE
  //         used, so nothing would flag its removal. THIS COMMENT IS THE ONLY PROTECTION.
  //      3. It goes live in the SCREENS phase. Registered candidate surfaces, all currently
  //         danger-red or uncoloured: cosmic-report's `expired` state · the Q&A question-cap
  //         notice · the DI sub-cap note. Whether an expired report reads as amber is a DESIGN
  //         judgement, and the design already specced those states — so it is NOT 1b work.
  //    🟢 THE `accent` COLLISION IS SPENT. It was held IDENTICAL to `accent` (#F59E0B) through
  //       passes 1–4 and SEPARATED at pass 5: amber #D9A657 vs clay #D98E57 — two digits apart in
  //       the string and a visibly different hue on screen. Pass 5's static arrival verification
  //       re-confirmed ZERO `warning` call sites in every spelling immediately before the flip,
  //       which is what makes B3's "all 99 golds went to accent" a measured claim rather than a
  //       hope. ⚠️ THE COLLISION IS GONE, BUT THE JUDGEMENT IS NOT: the screens phase still has to
  //       decide amber-vs-clay per site, and now it can SEE the answer.
  //       See plans/build-27.1/held-collision-ledger.md C2.
  warning: '#D9A657',                         // replaced nothing — RESERVED, see above
  danger: '#C8695E',                           // replaced #EF4444
};

// ◀ C-g  its own namespace, exactly two values, BirthChartWheel.tsx ONLY (§11.4).
//        `harmonious` collapses #10B981 + #3B82F6 + Conjunction's #F59E0B;
//        `tense` collapses #EF4444 + #EC4899. Flipped with `color` at pass 5.
//        🔴 The §7.3 allow-list is "only BirthChartWheel.tsx may import theme.chart" —
//           NEVER implemented as --exclude=BirthChartWheel.tsx on no-raw-hex, which
//           would permanently exempt that file's 11 existing raw hex literals. Pass 5
//           shipped the scoped form instead; remove it when §11.4 lands.
//        🟢 C4 / C5 (success/harmonious and danger/tense) are the two collisions §7.3's
//           allow-list confined. Pass 5 measured them at ZERO code references anywhere —
//           the wheel still holds its own raw literals until §11.4 — so the allow-list held
//           VACUOUSLY, which is the strongest form it can hold. Nothing was misassignable.
const chart = { harmonious: '#7FA88F', tense: '#C08A7E' };  // replaced #10B981 / #EF4444

// ── alpha(token, pct) ── OWNER RULING 2026-07-31, pass 1b. THE ONE SPELLING for
//    "a token colour at N% opacity" in an inline style or a StyleSheet.create entry.
//
// 🔴 WHY IT HAS TO EXIST. `bg-scrim/60` is a className UTILITY, and 89 of pass 1b's
//    sites are inline — including all 17 of §1.6b V-5's scrims and one `textShadowColor`.
//    `scrim` is a SOLID hex (R3), so `backgroundColor: color.scrim` renders an OPAQUE
//    overlay, not a 60% scrim — and post-flip that opaque fill is `bg` itself, so a
//    forgotten alpha now paints the canvas colour over the content instead of black:
//    still a total occlusion, and now one that looks deliberate. Before this helper there was no way to spell an
//    inline scrim except a raw `rgba()` literal — which is exactly what `no-raw-hex` has
//    to drive to zero. Both paths now exist and both are exact:
//        className → `bg-scrim/60`        (Tailwind composes the modifier)
//        inline    → `alpha(color.scrim, 60)`
//    REJECTED alternatives, recorded so they are not re-proposed: named per-opacity
//    tokens (`scrim-50/60/70/85`, `accent-10/15/30`…) would take an 18-role table to ~43
//    rows, each needing its own pass-5 value — "64 hex literals again with names on
//    them", and it re-opens what R3 and R2 both closed; and collapsing each family onto
//    its one `-muted` token cannot close the ledger at all (V-5's scrims have no
//    `scrim-muted` to collapse onto) while forcing value changes for nothing.
//
// 1. 🔴 IT REPLACES ALPHA. IT NEVER MULTIPLIES — and it THROWS on a token that carries
//    alpha in EITHER palette. `alpha(color['border-subtle'], 60)` is meaningless under
//    either reading (60% of a 7% white? or 60% flat, discarding the 7%?), so it fails
//    loudly at the call site instead of silently resolving to one of them.
//
//    🔴 AND THE GUARD CANNOT BE VALUE-SHAPED ALONE — a value-only version was correct at
//       Vellum and INCOMPLETE WHILE HELD, which is the worst possible split. Four tokens
//       carried rgba through passes 1–4 (`surface-raised`, `surface-overlay`, `locked`,
//       `fg-disabled`) and the regex caught those. But `border-subtle` was HELD at `#1F2937`
//       and `border-strong` at `#2D2640` — solid six-digit hex — and only became
//       `rgba(244,239,233,0.07/0.16)` at PASS 5. So an `alpha(color['border-subtle'], 60)`
//       written during passes 1–4 would have worked for the entire revamp and started
//       THROWING the moment pass 5 landed: a latent failure planted four passes before it
//       fires, in the one pass whose whole claim is that it only changes values.
//       Hence the DENYLIST + reverse lookup below: it rejects by ROLE, so it behaves
//       identically before and after the flip. Measured, not assumed — the value-only
//       form was written first and let `border-subtle` through.
//
//    🟢 POST-FLIP THE DENYLIST HAS SWAPPED WHICH HALF IT IS CARRYING, AND STILL COVERS ALL SIX.
//       `border-subtle`/`border-strong` are now rgba, so the regex catches them; while
//       `surface-raised`, `surface-overlay` and `locked` became SOLID HEX and are now caught only
//       by the role lookup. The set of six is unchanged and no call site's behaviour moved —
//       which is the whole property a role-shaped guard was chosen for. Verified at pass 5 by
//       calling `alpha()` with every (token, pct) pair the source actually writes.
//
// 2. 🔴 `pct` IS AN INTEGER ON TAILWIND'S 5-STEP OPACITY SCALE — 0,5,10,…,95,100.
//    Asserted at runtime rather than left as a rule to remember. This is the SAME fact
//    that explains why `bg-success/12` never compiled: Tailwind 3.4's `theme.opacity`
//    has no `12` key, `nativewind/preset` does not override the scale, and Tailwind 3
//    does not accept a bare off-scale number as a modifier. So an off-scale alpha in the
//    source (0.03 / 0.04 / 0.08 / 0.12) must ROUND to a scale step and be FLAGGED as a
//    value change — never smuggled through as an exact literal. Keeping the two spellings
//    on one scale is what stops the className and inline paths drifting apart.
//
// 3. 🟢 THE IDENTITY PROPERTY, recorded because it is what made 1b's review burden small —
//    and 🟢 IT IS NOW SPENT, EXACTLY AS DESIGNED. Under HELD values `alpha(color.accent, 30)`
//    resolved to the identical RGBA as the `rgba(245,158,11,0.3)` literal it replaced, so every
//    site whose alpha was ALREADY on the 5-step scale migrated IDENTITY-PRESERVING at 1b with its
//    visual change DEFERRED to pass 5. Pass 5 has now cashed that deferral: all 122 alpha() call
//    sites moved value in one reviewable commit. Only the off-scale sites carried a 1b delta.
//    Assert byte-identity per site where it holds; eyeball only where it does not.
//    (The emitted string is space-free; existing literals vary in spacing. RN parses both
//    to the same value, so the assertion is on the resolved RGBA tuple, per §4.3.)
// The six roles that carry alpha in EITHER palette. Denied BY NAME so the guard is
// flip-stable: `border-subtle`/`border-strong` are solid hex while HELD and rgba at
// Vellum, so a value-only check would pass them for four passes and then throw at pass 5.
// ⚠️ THE CONTROL-BOUNDARY ROLE IS DELIBERATELY **NOT** ON THIS LIST, AND STILL MUST NOT BE
//    REDUCED. This list means "already carries alpha, so replacing it is meaningless" — that
//    role is a solid hex, so denying it here would be a misuse of the mechanism and exactly the
//    mistake the header warns about for `bg`. Its reason not to be reduced is different in kind:
//    any reduction drops it under the 3:1 floor that is the entire content of the role. Prose is
//    the control here, plus the census in `primitive-adoption-check.js`, which counts the role's
//    call sites exactly — an alpha spelling is not one of the forms it counts, so a reduction
//    shows up as a FALL rather than as a silent pass.
const ALPHA_DENIED = ['surface-raised', 'surface-overlay', 'locked', 'fg-disabled',
                      'border-subtle', 'border-strong'];

function alpha(c, pct) {
  if (typeof c !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(c)) {
    throw new Error(
      `theme.alpha: expected a 6-digit hex token, got ${JSON.stringify(c)}. ` +
      'Tokens that ALREADY carry alpha (surface-raised, surface-overlay, locked, ' +
      "fg-disabled, border-subtle, border-strong) cannot be re-alpha'd — alpha() " +
      'REPLACES alpha, it never multiplies. Pick the token that means what you want.'
    );
  }
  // Reverse-lookup the role, so a denied token is rejected even in the palette where its
  // value happens to be a solid hex. A shared value is fine: `accent`/`warning` both hold
  // #F59E0B and neither is denied, so this only fires on a genuine role violation.
  const roles = Object.keys(color).filter(k => color[k] === c);
  const denied = roles.filter(k => ALPHA_DENIED.includes(k));
  if (denied.length) {
    throw new Error(
      `theme.alpha: '${denied[0]}' carries its own alpha in at least one palette and ` +
      'cannot be re-alpha\'d — alpha() REPLACES alpha, it never multiplies. It is a solid ' +
      'hex only while HELD; at pass 5 it becomes rgba(), so allowing this now would plant ' +
      'a failure that fires four passes later. Use the token as-is, or pick another role.'
    );
  }
  if (!Number.isInteger(pct) || pct < 0 || pct > 100 || pct % 5 !== 0) {
    throw new Error(
      `theme.alpha: pct must be an integer on Tailwind's 5-step opacity scale ` +
      `(0,5,10,…,95,100), got ${JSON.stringify(pct)}. An off-scale alpha has no ` +
      'className equivalent — `bg-x/12` does not compile — so it must round to a step ' +
      'and be recorded as a value change.'
    );
  }
  const r = parseInt(c.slice(1, 3), 16);
  const g = parseInt(c.slice(3, 5), 16);
  const b = parseInt(c.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${pct / 100})`;
}

// families are keyed per weight — RN cannot synthesise
// 🟢 THE FIVE FACES ARE INSTALLED (pass 4 · E1, 2026-07-31): assets/fonts/, five static TTFs,
//    455 KB, registered by `useFonts` in app/_layout.tsx under keys that are BYTE-IDENTICAL to
//    the values below. That identity is the whole contract — on the runtime path the JS key IS
//    the fontFamily namespace on both platforms, so these five strings are what the app resolves.
//    🔴 CHANGING A VALUE HERE WITHOUT CHANGING THE useFonts KEY (or the reverse) makes every
//       affected site fall back to the system font SILENTLY — no error, no warning, no build
//       signal. Grep both places together; they are one edit. See assets/fonts/README.md.
//
// 🔴 AND NOTE WHAT IS **NOT** SHIPPED: there is no Literata Regular and no Literata SemiBold.
//    `display` is Bold and `quote` is Italic, full stop. So a site whose ROLE is serif but whose
//    weight is not bold has no target, which is why every display step maps to the one Bold face
//    (pass 4 · E4) rather than trying to honour a 500/600 the ramp never contracted.
const family = {
  display:     'Literata-Bold',
  quote:       'Literata-Italic',
  body:        'Figtree-Regular',
  'body-semi': 'Figtree-SemiBold',
  'body-bold': 'Figtree-Bold',
};

// every ramp step names its family + whether it scales.
// The `text-` prefix on these keys is DELIBERATE and stays: txt('text-sm') and §3.3's
// ramp table read the same. It is stripped at the Tailwind boundary only — see C-a.
//
// 🔴 THE THREE DISPLAY lineHeights ARE 38 / 31 / 26, NOT 34 / 29 / 25 — DESIGN-DOC REVISION,
//    PASS 5 (2026-07-31), closing `O-34`. Design §3.3's published table now carries these values.
//    DO NOT "restore" the tighter numbers from an older copy of the design.
//
// WHY. Literata's ink extents, measured from the shipped `glyf` table (not from the per-em
// declaration, which is the number that made this look worse than it is): capitals reach
// +0.715 em, lowercase +0.782, deepest descenders −0.230 — and ACCENTED CAPITALS reach +0.970.
// On a two-line heading the clearance between line 1's lowest ink and line 2's tallest ink is
//
//     clearance = lineHeight − size × (ink + 0.230)
//
//   step         size  OLD lH   typical caps   accented caps   NEW lH   accented caps
//   display-lg    30     34       +5.65 ✅       🔴 −2.00       38       +2.00 ✅
//   display-md    24     29       +6.32 ✅       🟠 +0.20       31       +2.20 ✅
//   display-sm    20     25       +6.10 ✅       🟠 +1.00       26       +2.00 ✅
//
// 🔴 SO THE COLLISION WAS MEASURED, NOT HYPOTHETICAL, AND IT WAS IN THE PRIMARY MARKET.
//    Ordinary English display copy was always clear; the failure needs line 2 to begin with an
//    accented capital while line 1 ends in a descender. 12 of the 35 display sites carry UNBOUNDED
//    content (LLM-generated themes, user names, rules-table archetype and palm names) so they WILL
//    wrap, and accents arrive exactly there — the same surface as `C-P4-2`. Two caveats, one
//    exposure, seen from two directions.
//
// IT IS THE RAMP, NOT THE 20 WRAP-CAPABLE SITES. Scoping the loosening per-site is precisely the
// drift the token system exists to remove: one step, one line-height. The cost is 4/2/1px more
// leading on the app's largest type, taking display-lg's ratio 1.13 → 1.27 — still tight editorial
// leading, and still BELOW Literata's natural 1.485 line box, so the leading stays negative. That
// is fine and always was: both platforms let glyphs draw outside the box. What is not fine is ink
// hitting ink, and 34 was tighter than the face's own accent extent.
//
// 🟢 LAYOUT: re-checked at pass 5 against every fixed-height container in app+components. NOT ONE
//    holds a display step — every display site sits in a free-growing block, a `minHeight` floor
//    already exceeded by its content, or a flex header. 0 OVERFLOW, 0 TIGHT. And the box height was
//    never face-dependent anyway: 2b baked an explicit lineHeight into all twelve steps.
// ╔══════════════════════════════════════════════════════════════════════════════════════════════╗
// ║ 🔴 THE THREE DISPLAY STEPS SCALE, CAPPED AT 1.3x, EXACTLY LIKE BODY COPY.                     ║
// ║    OWNER RULING, 2026-08-03 — `P42` / `O-50`, and it also CLOSES `O-58` / `P47`.              ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════════╝
//
// 🔴 THE FREEZE WAS AN INHERITED PRINCIPLE THAT DOES NOT APPLY TO THIS APP. Display type is frozen
//    in most systems because display type USUALLY sits in a fixed-height container. Pass 5's
//    re-check settles it here by measurement and the sentence is directly below this block:
//    "0 OVERFLOW, 0 TIGHT — not one fixed-height container in the app holds a display step."
//    Every display site is a free-growing block, a minHeight floor already exceeded, or a flex
//    header. So the reason for the freeze was absent while its cost was being paid.
//
// 🔴 AND THE COST WAS `P42`'s WHOLE CONTENT. A frozen title beside scaling body copy collapses the
//    hierarchy at the cap, and item 8 measured it at FOUR specified pairings: display-sm 20/26 held
//    against text-sm scaling to 19.5/28.6, i.e. HALF A PIXEL of size apart with the BODY's line
//    height OVERTAKING the TITLE's. That is what made `O-58` read as a ramp defect. Unfreezing
//    removes it without touching a single value: both sides now scale by the same multiplier, so
//    every ratio in the ramp is SCALE-INVARIANT and the hierarchy holds at every setting.
//    🟢 `O-58` / `P47` therefore CLOSE. The ramp needed no re-tuning; it needed the freeze lifted.
//
// ── THE ONE CHECK THIS RULING NEEDED, AND IT IS ANSWERED IN THE RENDERER, NOT BY ENUMERATION ────
//
// The worry was arithmetic: display-lg 30 x 1.3 = 39 against a 38 line height, i.e. ink taller
// than its own line. 🟢 IT CANNOT HAPPEN, AND THE REASON IS MEASURED IN THE INSTALLED RN 0.79.6
// RENDERER RATHER THAN RECALLED — lineHeight SCALES BY THE SAME MULTIPLIER AS fontSize, on BOTH
// platforms:
//   · Android  ReactAndroid/.../views/text/TextAttributes.java, getEffectiveLineHeight():
//              toPixelFromSP(mLineHeight, getEffectiveMaxFontSizeMultiplier()) when scaling is on,
//              which is the very same call getEffectiveFontSize() makes for the size.
//   · iOS      Libraries/Text/RCTTextAttributes.mm:139:
//              lineHeight = _lineHeight * self.effectiveFontSizeMultiplier.
// So at the cap the pair is 39 / 49.4, not 39 / 38. The clearance formula above
// (lineHeight − size x (ink + 0.230)) is linear in the multiplier, so the ACCENTED-CAPITAL
// clearance the +2/+2.2/+2 raise was tuned for becomes +2.60 / +2.86 / +2.60 at 1.3x — strictly
// better in absolute terms and identical in proportion. There is no scale at which ink meets ink.
// ⚠️ WRAPPING DOES INCREASE, and that is fine rather than tolerated: three sites already wrap at
//    360dp (the paywall hero, the compatibility hub, SunSignReveal) and every display site scrolls
//    or grows. Wrapping was never the hazard; ink collision was, and it is closed above.
//
// 🔴 WHAT THIS DOES **NOT** UNFREEZE, and both exclusions are by ROLE rather than by step:
//    design §3.6's freeze surfaces stay frozen — X3's fixed-height Button labels, the tab labels,
//    the chat composer, and the numeral/badge tables `O-29` closed as permanently unverifiable.
//    Those are CHROME on pinned boxes; a display step is editorial type in a growing block. The
//    ramp classifies by STEP and §3.6 by ROLE, and where they disagree §3.6 still wins.
// ⚠️ AND THE className HALF IS STILL FROZEN — `C-P4-5`, unchanged. A size utility cannot carry a
//    prop, so the 25 `text-display-*` classNames do not scale no matter what this flag says. This
//    flag reaches the txt() path only. Do not read this ruling as "display type scales app-wide".
// 🔴 THE FLAG IS READ IN THREE PLACES AND THEY ARE ONE CONTRACT: txt() below, and the hardcoded
//    step sets in scripts/p23-optin-check.js and scripts/primitive-adoption-check.js. All three
//    moved in this commit. Neither script derives its set from this table, so a future change here
//    that does not touch both scripts leaves two gates believing the old shape — the same
//    one-contract-two-places hazard as the useFonts keys and the family map.
const type = {
  'display-lg':{size:30,lineHeight:38,letterSpacing:-0.6,family:'display',scales:true },
  'display-md':{size:24,lineHeight:31,letterSpacing:-0.4,family:'display',scales:true },
  'display-sm':{size:20,lineHeight:26,letterSpacing:-0.3,family:'display',scales:true },
  quote:       {size:17,lineHeight:26,letterSpacing:0,   family:'quote',  scales:true },
  'text-2xl':  {size:24,lineHeight:28,letterSpacing:-0.4,family:'body-bold',scales:false},
  'text-xl':   {size:20,lineHeight:26,letterSpacing:-0.2,family:'body-bold',scales:false},
  'text-lg':   {size:18,lineHeight:24,letterSpacing:0,   family:'body-semi',scales:true },
  'text-base': {size:16,lineHeight:22,letterSpacing:0,   family:'body-semi',scales:true },
  'text-sm':   {size:15,lineHeight:22,letterSpacing:0,   family:'body',   scales:true },
  'text-xs':   {size:13,lineHeight:19,letterSpacing:0,   family:'body',   scales:true },
  'text-2xs':  {size:12,lineHeight:16,letterSpacing:0.2, family:'body-semi',scales:false},
  overline:    {size:11,lineHeight:14,letterSpacing:1.3, family:'body-bold',scales:false},
};

// ╔══════════════════════════════════════════════════════════════════════════════════╗
// ║  `FAMILY_FREEZE` IS GONE — deleted in PASS 4 · E2 (2026-07-31), as scheduled.      ║
// ╚══════════════════════════════════════════════════════════════════════════════════╝
//
// 2b added it for exactly one reason: txt() returns fontSize + lineHeight + letterSpacing +
// **fontFamily** from a single object, so a flag was the ONLY thing that could ship the first
// three without the fourth while the five faces did not yet exist on disk. E1 installed them,
// so the flag has nothing left to protect and `txt()` below now emits `fontFamily`
// unconditionally. Same device, same lifecycle and same fate as 2a's `TYPE_FREEZE`.
//
// 🔴 WHAT THIS DELETION DOES, so it is not mistaken for a tidy-up: it is the single edit that
//    puts **198 inline-styled `<Text>` nodes** into Literata/Figtree at once — every site 2b
//    converted to a txt() spread. It is a VALUE change with no identity claim, and it is the
//    largest single-line visual change in pass 4.
//
// ⚠️ DO NOT RE-INTRODUCE A FLAG HERE to "stage" a family. There is nothing left to stage: the
//    faces are in the binary, and a family name that resolves to nothing is the failure mode the
//    flag existed to prevent, not a state worth being able to return to.

// the ONE text helper. Returns a style object AND the props.
// Decision (b): the global default is frozen, so a step
// only scales if it opts in here.
//
// 🔴 THE FIVE `scales: true` STEPS ARE THE OPT-INS THAT MAKE THE GLOBAL FREEZE SHIPPABLE
//    (OWNER DECISION P23). `quote`, `text-lg`, `text-base`, `text-sm` and `text-xs` are
//    reading copy; they must scale. 🟢 P23 IS NOW CLOSED FROM THE OTHER END TOO: the
//    conversions moved from pass 4 into pass 2b (owner scope change, 2026-07-31), so the
//    opt-ins are already in the tree by the time pass 4 sets
//    the global scaling freeze. The freeze can no longer ship alone.
//    (⚠️ NOT via Text.defaultProps — that is inert on React 19. See lib/textDefaults.ts / O-30.)
//
// 🟢 MEMOISED, and that is a CORRECTNESS-ADJACENT CHOICE, not a micro-optimisation.
//    C-i warns that `<Text {...txt('x')} style={[txt('x').style, …]} />` invokes txt()
//    TWICE PER RENDER. It also, un-memoised, produced a BRAND NEW style object on every
//    render, so the style prop's identity churned and any downstream memo comparing it
//    saw a change every frame. txt() is pure over a 12-member enum, so one frozen
//    instance per step is both cheaper and referentially stable. The double-call is now
//    free, which is what makes the spread idiom acceptable at 138 call sites without
//    introducing a `<Txt>` component mid-codemod — see the C-i note below.
const _txtCache = Object.create(null);
function txt(step){
  const hit = _txtCache[step];
  if (hit) return hit;
  const t = type[step];
  if (!t) throw new Error(
    `theme.txt: '${step}' is not a ramp step. The twelve are: ${Object.keys(type).join(', ')}.`
  );
  const style = { fontSize:t.size, lineHeight:t.lineHeight,
                  letterSpacing:t.letterSpacing,
                  fontFamily:family[t.family] };
  return (_txtCache[step] = Object.freeze({
    style: Object.freeze(style),
    allowFontScaling: t.scales,
    maxFontSizeMultiplier: t.scales ? 1.3 : 1,
  }));
}
// ◀ C-i  THE IDIOM, as settled by pass 2b's 138 JSX conversions.
//        C-i's "preferred" form is `<Txt step="text-sm" color="fg-secondary" />`. 🔴 THAT
//        COMPONENT WAS DELIBERATELY NOT BUILT IN 2b, for two independent reasons:
//          1. it is a NEW COMPONENT, and codemod-plan §2 puts primitives AFTER the
//             codemod precisely so nothing gets restyled twice; and
//          2. `<Text>` → `<Txt>` changes the JSX element, and qa.tsx and cosmic-report.tsx
//             are D8 RESTYLE-ONLY / STRUCTURE-FROZEN. A txt() conversion on an existing
//             <Text> is legal there; swapping the element is not.
//        C-i's stated objection to the spread form was the double invocation — which the
//        memoisation above removes. So 2b uses, uniformly and at render scope only:
//   used in 2b:  <Text {...t.txt('text-sm')} style={[t.txt('text-sm').style, {…}]} />
//   equivalent:  const s = t.txt('text-sm');
//                <Text {...s} style={[s.style, {color:color['fg-secondary']}]} />
//
// ╔══════════════════════════════════════════════════════════════════════════════════════════╗
// ║  🔴 THE WRAPPER COMPONENT IS **DROPPED**. OWNER RULING R-A, 2026-08-03. DO NOT BUILD IT.  ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════╝
//
// It was named in three documents (here, design §6.2, design §3.6), scheduled by no pass, and
// owned by nobody — the exact half-fact a later session resolves by BUILDING it, mid-screens-
// phase, against the two structure-frozen files, for no benefit. All three references were
// corrected in the same commit as this one, which is the half that makes the ruling stick.
//
// 🔴 THE BINDING REASON IS THAT THE ALTERNATIVE **CANNOT DELIVER WHAT IT PROMISES.** Its whole
//    stated benefit is UNIFORMITY, and qa.tsx and cosmic-report.tsx are D8 restyle-only /
//    structure-frozen: swapping the JSX element is forbidden there, and they hold 14 of the 28
//    fractional sites plus a large share of the inline-styled reading copy. So "migrate the call
//    sites" actually means "migrate most of them and keep the spread form forever in the two
//    densest files" — TWO IDIOMS FOR ONE CONCEPT, which is the drift this token system exists to
//    remove. One idiom everywhere beats a partial migration.
//    Secondary: the spread form is the shipped idiom at 213 sites, memoised and referentially
//    stable, and BOTH arrival gates already understand it — a wrapper would need them taught a
//    third shape, in the phase where class-5 blindness is already at its worst.
//
// ⚠️ The one real argument for it SURVIVES and is recorded rather than buried: a wrapper reads
//    better than a spread at 200 sites, and it could place the scaling prop automatically for
//    P23's className half. That is a genuine future win, it belongs to C-P4-5, and it is
//    available to ANY wrapper later — it does not require this one, now.
//
// 🔴 NEVER CALL txt() (OR alpha()) AT MODULE SCOPE — including inside a
//    StyleSheet.create({…}) literal, which IS module scope. A throw there runs at IMPORT,
//    before React mounts, so the root ErrorBoundary never sees it and the app dies white.
//    That is why the 51 `t.type['<step>'].size` sites living inside StyleSheet.create were
//    given `lineHeight`/`letterSpacing` as PLAIN PROPERTY READS in 2b rather than a txt()
//    spread: a property read on a mistyped key yields `undefined`, which RN ignores; a
//    function call on one throws at import. Same values, no import-time failure mode.

// ◀ C-b  `px` is the THIRTEENTH AUTHORING NAME (§4.2), not a legacy key: h-px is the
//        "or continue with" hairline on both auth screens (login.tsx:180,182 ·
//        signup.tsx:271,273). The authored block ships 12 keys and loses all four sites.
//        This also settles §4.2's open question — the inferred 13th name IS `px`.
const space  = {0:0,1:4,2:8,3:12,4:16,5:20,6:24,8:32,10:40,12:48,
                'screen-x':24,'screen-y':32, px:1};

// ◀ C-b  MIGRATION-ONLY RESOLUTION KEYS — DO NOT AUTHOR AGAINST THESE.
//        They exist so today's classes keep resolving until the outlier pass (§4.3)
//        retires their call sites with visual sign-off.
//        The values are TAILWIND'S (key × 4dp), NOT each key's own number. Writing
//        {14:14, 20:20, 48:48} would collapse every p-20/w-20/h-20 from 80px to 20px —
//        a silent 4× shrink with no build-time signal (§6.4 V3).
//        `30` is deliberately ABSENT: Tailwind 3 has no `30` key, so w-30/h-30 have
//        never resolved. profile.tsx:186,190 are sized by an adjacent inline
//        {width:120,height:120}; delete the two dead classes rather than adopt them.
//        This is the one place this file departs from the designer's trailing note,
//        which lists 30 among "every key the codebase resolves today". It does not.
const spaceLegacy = {0.5:2, 1.5:6, 14:56, 16:64, 20:80, 32:128, 48:192, 64:256};

const radius = {sm:8, md:14, lg:20, xl:28, pill:9999};
const motion = {
  duration:{instant:90,quick:140,base:220,moderate:300,slow:420,ambient:2600},
  easing:{standard:[0.32,0,0.24,1], enter:[0,0,0.22,1],
          exit:[0.4,0,1,1], linear:'linear'},
  // §5.4's TWO RISE DISTANCES, INDEPENDENT BY CONSTRUCTION (P97, 2026-08-06).
  // They were ONE token (distance:8) with the error rise written as `/2`, and that
  // coupling became a hazard the moment the entrance moved: the gate asserts the
  // EXPRESSION, so a bump here would have changed the error rise while staying green.
  // 12: §5.3 rule 3 capped every distance at 8, but 8 was specified as a COMPANION to
  //     an opacity fade that no longer exists (the two alpha curves multiplied). 12
  //     re-derives that rule's intent for a sole cue rather than inventing against it.
  //  4: §5.4's error row names 4 verbatim. It is NO LONGER half of anything, and that
  //     is the point of spelling it rather than dividing.
  entranceRise:12, errorRise:4, stagger:40, staggerCap:5,
};
const a11y = {tapMin:48, fontScaleMax:1.3, hairline:1};
module.exports = {color, chart, alpha, family, type, txt, space, spaceLegacy,
                 radius, motion, a11y};
