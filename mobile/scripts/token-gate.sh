#!/usr/bin/env bash
# Token gate — the completeness proof. NativeWind DROPS an unknown utility silently, so an
# absent token is invisible at build time and a wrong-valued one is invisible until someone
# looks at the screen. Rules are named, NEVER numbered (the numbering churned across design
# turns and one authored "rule" held three greps). See UI-revamp-design.md §7.
#
# PORTED TO `grep -rEn`: UI-revamp-design.md §7.2 is written entirely in `rg`, and `rg` is
# NOT on PATH in this environment (verified). Every rule below reproduces the design's
# baseline exactly — see codemod-plan.md §0.2. `rg` stays an optional accelerator.
#
# FAILURES ACCUMULATE. The authored version exits on the first hit, which turns a 500-site
# sweep into 500 sequential runs. This one reports every rule's count in one pass.
#
# ── 🔴 THIS GATE IS ADVISORY BY CONSTRUCTION. READ codemod-plan.md §4.1. ──────────────
#    There is no CI, no test runner, and before pass 0 there were no git hooks at all.
#    `.githooks/pre-push` now runs this, but `core.hooksPath` is per-clone (NOT carried by
#    a clone) and a pre-push hook dies to `--no-verify`. So THE GATE RUNS ONLY WHEN SOMEONE
#    RUNS IT, and every identity claim in the codemod plan rests on a check nobody is
#    forced to run. Stated plainly rather than left implied.
#
# Usage, from mobile/:
#   npm run gate              # counts per rule
#   GATE_VERBOSE=1 npm run gate   # counts + every file:line hit, to drive a count to zero
#
# 🔴 COUNTS ARE **MATCHES**, NOT LINES — `grep -Eoh`, not `grep -c`. This is not cosmetic:
#    §0.2's baselines are match counts, and a line holding two literals is two edit sites.
#    Counting lines under-reports hex by 22 (405 vs 427), custom tokens by 13 (552 vs 565)
#    and `[wh]-30` by half (2 lines, 4 classes). Every baseline below reproduces §0.2
#    exactly on matches and NONE of them do on lines. Do not "simplify" this to grep -c.
#
# ── PASS-0 BASELINES (measured 2026-07-30 on this tree; all ten reproduce §0.2 EXACTLY) ──
#   rule                      $SRC   app+components   §0.2 baseline
#   no-raw-hex/hex             427   404              404 raw, +23 in lib/colors.ts = 427 ✅
#                                                     (401 real literals: −3 HTML entities)
#   no-raw-hex/rgba            118   117              117 ✅  (+1 in lib/colors.ts)
#   no-raw-hex/keywords         81    81               81 ✅  (80 `white`, 1 `black`)
#   no-legacy-tokens/ramp      339   339              339 ✅
#   no-legacy-tokens/custom    565   565              565 ✅  (white 299 · card 64 +
#                                                     background 44 · gold 70 · primary* 66 ·
#                                                     pink 14 · black 8)
#   no-legacy-tokens/pre-empt    0     0                0 ✅  (pre-emptive — names not in use yet)
#   no-legacy-radii            179   179              "106 + 73" ✅ — and the arithmetic is:
#                                                     rounded-full 82 + rounded-3xl 4 +
#                                                     bare rounded 4 + borderRadius 99|999|100 16
#                                                     = 106, plus rounded-2xl 73 = 179.
#                                                     ⚠️ §0.2's third column enumerates only FOUR
#                                                     of the five sub-patterns (it omits the 16
#                                                     pill spellings), which is why that column
#                                                     appears to sum to 163. The 179 total is right.
#   no-fontweight/className    328   328              328 ✅
#   no-fontweight/inline       173   173              173 ✅
#   no-numeric-fontsize        346   346              346 ✅
#   no-leading-utilities        45    45               45 ✅
#   dead-classes/space-[xy]      2     2                2 ✅  (login.tsx, signup.tsx — D4)
#   dead-classes/[wh]-30         4     4                4 ✅  (profile.tsx, 2 lines × 2 classes)
#   grep-blind radii (C-k)      49    49               49 ✅  NOT A RULE — rounded-xl 48 +
#                                                     rounded-lg 1. See the C-k note below.
set -uo pipefail
fail=0

SRC="app components lib store services hooks utils types"
INC="--include=*.ts --include=*.tsx"

# G <rule-name> <regex> — count MATCHES, report, accumulate. theme.js is excluded on
# principle (it is the one file that legitimately holds every raw literal); note it also
# sits at mobile/ root, OUTSIDE $SRC, so the exclusion is belt-and-braces. Same theme.d.ts.
# G <rule-name> <regex> [discard-regex]
#
# The optional THIRD argument is a DISCARD filter, added in pass 1b for no-bare-scrim.
# Some invariants have a legal spelling that shares a substring with the illegal one —
# `t.alpha(t.color.scrim, 60)` is correct, a bare `t.color.scrim` is an opaque black
# overlay. A single regex cannot express "matches X but not when X sits inside Y" in
# portable ERE (no lookbehind), so the rule regex matches the LEGAL form FIRST via
# alternation (grep is leftmost-longest, so it is consumed whole) and this filter then
# drops it. 🔴 The alternation ordering is load-bearing — see no-bare-scrim's comment.
G() {
  local name="$1" re="$2" discard="${3:-}" n
  if [ -n "$discard" ]; then
    n=$(grep -rEoh $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null | grep -Ev "$discard" | grep -c . || true)
  else
    n=$(grep -rEoh $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null | grep -c . || true)
  fi
  printf '  %-28s %5d\n' "$name" "$n"
  if [ "$n" -ne 0 ]; then
    [ -n "${GATE_VERBOSE:-}" ] && \
      grep -rEn $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null || true
    fail=1
  fi
}

# S <label> <regex> — REPORT-ONLY sub-count. Never touches `fail`. Exists so a composite
# rule's baseline arithmetic is readable at a glance instead of being one opaque total.
#
# 🔴 READ `SA()` BELOW BEFORE ADDING AN `S()`. THE QUESTION IS NEVER "IS THERE A CHECK?" — IT IS
#    "DOES IT FAIL?" (`O-105`, owner-ruled 2026-08-04). Every `S()` line looks exactly like a `G()`
#    line in terminal output and in a commit body, and neither the terminal nor the commit says
#    which of them can block. That is not a cosmetic problem: TWO PRESERVE-BLINDLY INVARIANT ROWS
#    (X11's and X12's derived radii) WERE BELIEVED COVERED BY `S "excepted: DERIVED"` FOR A WHOLE
#    PHASE, and it never touched `fail`. Use `S()` ONLY for a number that is genuinely a watchlist,
#    and put it in the register at the bottom of this file when you do.
S() {
  printf '    · %-24s %5d\n' "$1" \
    "$(grep -rEoh $INC --exclude=theme.js --exclude=theme.d.ts "$2" $SRC 2>/dev/null | grep -c . || true)"
}

# SA <label> <regex> <exact|max> <n> — A SUB-COUNT THAT ASSERTS. Same output shape as `S()` plus the
# contract it is held to, and it DOES touch `fail`.
#
# 🔴 THE SHAPE IS A DELIBERATE CHOICE PER NUMBER, and `O-67` already ruled on how to pick:
#    `exact` for an INVARIANT (a set whose members are enumerated in this file — a rise is a new
#    unaudited member and a FALL is a member fixed without the count being moved, and an unmoved
#    count is how a counter stops meaning anything); `max` for a RESIDUE that is only ever supposed
#    to shrink. An `exact` on a number that legitimately moves both ways cries wolf on correct work,
#    which is how `no-white-on-accent` was demoted — do not reach for it by default.
SA() {
  local name="$1" re="$2" mode="$3" want="$4" n mark=''
  n=$(grep -rEoh $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null | grep -c . || true)
  if [ "$mode" = exact ] && [ "$n" -ne "$want" ]; then mark='   🔴'; fail=1; fi
  if [ "$mode" = max ]   && [ "$n" -gt "$want" ]; then mark='   🔴'; fail=1; fi
  printf '    · %-24s %5d   (%s %s)%s\n' "$name" "$n" "$mode" "$want" "$mark"
}

# ── 🟢 `GP()` — THE PENDING-PASS COUNTER — IS DELETED. IT HAS NO CALLERS. ─────────────────────────
#
# It existed for exactly two passes. GATE_STRICT went DEFAULT-ON at pass 5, and pass 5 was NO LONGER
# THE LAST PASS: the owner's reorder ran 2a -> 2b -> 4 -> 5 -> 3a -> 3b, so §3.7's and §4.6's "after
# pass 5 every count is 0" had been written under an ordering that no longer held. Two decreasing
# counters were still mid-flight, owed by passes that had not run — 177 legacy radii (3b) and 6 dead
# spacing classes (3a). O-36.
#
# 🔴 THERE WERE THREE OPTIONS AND TWO OF THEM WERE WRONG. Recorded because the same choice will
#    present itself again the next time a precondition outlives its ordering:
#    (a) block on them  -> EVERY PUSH FAILS until 3b lands. §4.6's "a lockout, not a gate", and a
#        lockout is defeated with --no-verify on day one and then never re-armed.
#    (b) fold them into the named floors -> a TRANSIENT residue laundered into a PERMANENT one.
#        §4.6: "none of them may be closed by widening an exception — that is how a floor turns
#        into a leak." A floor with no owner and no removal condition never gets removed.
#    (c) 🟢 name them, attribute them to the owing pass, PRINT them every run, do not block.
#
# (c) shipped, and R-3 then supplied the half that made it terminate: an EXPIRY. Each entry named
# the pass that cleared it, and when that pass landed the entry had to VANISH — converted back to a
# blocking G(), not merely observed to read 0. A PENDING entry that survives its own pass is a
# FINDING, not a residue: either the pass did not do what it claimed, or a transient residue has
# quietly become permanent. Both entries expired on schedule — the two dead-class counters at pass
# 3a, `dead-spellings` at pass 3b — so the function is gone and `pending` with it.
#
# 🔴 DO NOT RE-INTRODUCE IT WITHOUT AN EXPIRY. A fifth counter category whose entries have no named
#    debtor and no removal condition is precisely the leak (b) describes. Owner action P35: CLOSED.

echo "── no-raw-hex ──"
# 🔴 TWO SCOPED SUBTRACTIONS ADDED IN PASS 5 (2026-07-31), so this rule can reach 0 and
#    GATE_STRICT can go DEFAULT-ON (§3.7's pass-5 deliverable, §4.6's named floor).
#
# 1 · THE HTML-ENTITY FORM IS NOW DISCARDED BY THE RULE INSTEAD OF BY HAND. `&#10024;` `&#10003;`
#     `&#8226;` are glyph escapes, never colours — §0.2 has ALWAYS subtracted them in prose
#     ("404 grep hits − 3 HTML entities = 401"). A rule that does its own arithmetic beats a
#     baseline with a footnote, because the footnote is what gets lost. Both numbers still print.
#     ⚠️ ALTERNATION MOST-SPECIFIC-FIRST (P-2): the entity branch starts at `&`, one character
#     EARLIER than the `#`, so grep's leftmost-longest rule consumes it whole and the discard
#     drops it. Put the bare `#` branch first and all three re-appear.
#
# 2 · 🔴 `BirthChartWheel.tsx` MAY HOLD RAW CHART LITERALS UNTIL §11.4 LANDS — and this is
#     implemented as a NAMED, PRINTED, FILE-SCOPED SUBTRACTION, **never** as
#     `--exclude=BirthChartWheel.tsx`, which §3.7 forbids outright and §3.0.2's allow-list note
#     forbids in general: a blanket exclude exempts the file PERMANENTLY and silently, so the day
#     someone adds a twelfth literal nothing says so. Here the file is still searched, its count
#     is still printed on its own line, and only the printed number is subtracted. If `excepted`
#     RISES, someone widened the residue and the output says so — the same self-reporting shape as
#     the GLYPH exception on `no-numeric-fontsize`.
#     🔴 REMOVE BOTH THIS BLOCK'S `WHEEL` LINES WHEN §11.4 SHIPS. The wheel is SCREENS-phase work
#        scheduled AFTER pass 5, which is the only reason the residue exists at all.
WHEEL="components/astrology/BirthChartWheel.tsx"
# 🔴 `O-105` — THE SUBTRACTED NUMBER IS NOW ASSERTED, AND IT HAD TO BE. `live = all - wheel`, so
#    growth in `wheel` SILENTLY LOWERS the number this rule blocks on. The comment above claimed the
#    opposite in as many words — "if `excepted` RISES, someone widened the residue and the output
#    says so" — and it did say so, to nobody, because the line was a bare `printf`. A residue that
#    can only shrink gets a CEILING (never `exact`: the wheel is §11.4's to drive to zero, and an
#    exact count would fail the pass that fixes it).
GX() {   # GX <rule> <regex> <discard> <wheel-max> — like G(), minus the named file's hits, all printed
  local name="$1" re="$2" discard="${3:-}" cap="${4:-}" all wheel live mark=''
  all=$(grep -rEoh $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null | { [ -n "$discard" ] && grep -Ev "$discard" || cat; } | grep -c . || true)
  wheel=$(grep -Eoh "$re" "$WHEEL" 2>/dev/null | { [ -n "$discard" ] && grep -Ev "$discard" || cat; } | grep -c . || true)
  live=$(( all - wheel ))
  printf '  %-28s %5d\n' "$name" "$live"
  if [ -n "$cap" ] && [ "$wheel" -gt "$cap" ]; then mark='   🔴 THE RESIDUE GREW'; fail=1; fi
  printf '    · %-24s %5d   (max %s — §11.4 residue; remove the exception when it ships)%s\n' \
    "excepted: BirthChartWheel" "$wheel" "${cap:-–}" "$mark"
  printf '    · %-24s %5d\n' "  (raw, incl. excepted)" "$all"
  if [ "$live" -ne 0 ]; then
    [ -n "${GATE_VERBOSE:-}" ] && \
      grep -rEn $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null | grep -v "$WHEEL" || true
    fail=1
  fi
}
GX "hex"                    "&#[0-9]+;|#[0-9a-fA-F]{3,8}\b" "^&#" 11
S  "  · HTML entities"      "&#[0-9]+;"
GX "rgba"                   "rgba?\([0-9]" "" 1
G "keywords"                "[Cc]olor[:=][[:space:]]*[\"']?(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink)\b"
# C-c: the SECOND token system must be GONE, not merely unused — 54 of 93 files import it,
# so left in place it keeps the old palette alive while this gate reports clean.
if [ -e lib/colors.ts ]; then echo "  lib/colors.ts                STILL EXISTS (pass 1b deletes it)"; fail=1; fi

echo "── no-legacy-tokens ──"
G "ramp"                    "(text|bg|border)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}"
G "custom"                  "\b(text|bg|border)-(gold|primary|primary-dark|primary-light|pink|background|card|card-translucent|white|black|cosmic-[a-z-]+)\b"
G "pre-empt"                "\b(text|bg|border)-(text-)?(secondary|muted|placeholder|disabled)\b"

echo "── no-legacy-radii ──"
# rounded-sm/md/lg/xl/pill are VALID in the new scale and are NOT grepped.
# Dead spellings only, incl. C-k's rounded-2xl (73) which the authored pattern omitted.
#
# 🟢 THIS WAS A `GP()` PENDING COUNTER AT 177 AND IT EXPIRED AT PASS 3b (owner ruling R-3).
#    It is a blocking `G()` again, at 0, and the conversion is the RULING rather than tidying:
#    a PENDING entry that survives the pass which OWES it is not a cleared debt, it is a
#    FINDING. The 177 were: rounded-full 80 + rounded-2xl 73 + rounded-3xl 4 + bare 4 +
#    the three numeric pill literals 16.
# 🔴 `GP()` IS NOW DELETED — it has no callers, which is the signal §4.6 said would mean the
#    revamp's counters are finally closed. Do NOT re-introduce it: a fifth counter category
#    with no owner is how a transient residue becomes a permanent leak. Owner action P35 CLOSED.
G "dead-spellings"          "rounded-3xl|rounded-2xl|rounded-full|(^|[\"' ])rounded([\"' ]|$)|borderRadius:[[:space:]]*(99|999|100)\b"
S "rounded-full"            "rounded-full"
S "rounded-2xl"             "rounded-2xl"
S "rounded-3xl"             "rounded-3xl"
S "bare rounded"            "(^|[\"' ])rounded([\"' ]|$)"
S "borderRadius 99|999|100" "borderRadius:[[:space:]]*(99|999|100)\b"
# 🔴 C-k HAD NO GATE FORM, AND THAT WAS THE POINT: rounded-xl and rounded-lg are legal in BOTH
#    scales with DIFFERENT values, so grepping them would fail on correct post-migration code.
#    Pass 3b rewrote all 49 explicitly, by ROLE, with a human reading the diff — and the
#    per-site review is what proved the CLASS-LEVEL map wrong for 18 of them (6 buttons that
#    belong on the pill step, 4 concentric/badge sites, 2 cards, plus F2's 3 badge tiles).
#    Reported forever, never a failure condition.
echo "    (C-k grep-blind — REPORT ONLY, never a failure: the two dual-scale names)"
S "rounded-xl"              "\brounded-xl\b"
S "rounded-lg"              "\brounded-lg\b"
# 🟢 the NEW-SCALE census, printed so a step with ZERO call sites is visible rather than assumed.
#    R-1's class-7 rule applied to radius: "grep the call-site count of every token the pass is
#    supposed to make arrive, and assert it is nonzero — or that the zero is a DECISION."
#    ⚠️ `rounded-xl` is legitimately 0 on the className ledger: no className site is hero-card
#    scale, and the 13 sites that DO take that step are all inline (`t.radius.xl`). That is the
#    recorded decision, not an absence — exactly the distinction `warning` needed at pass 5.
echo "    (new-scale className census — a 0 must be a recorded decision, not a surprise)"
S "rounded-sm"              "\brounded-sm\b"
S "rounded-md"              "\brounded-md\b"
S "rounded-pill"            "\brounded-pill\b"

echo "── no-numeric-radius ──"
# 🔴 THE NINETEENTH NAMED RULE, ADDED AT PASS 3b. §1.6's GATE 3b always specified it
#    ("grep borderRadius: [0-9] — expect 0") and token-gate.sh never carried it, so the INLINE
#    half of the radius surface — 158 declarations across 21 distinct values — had NO standing
#    removal gate at all. A decreasing counter driven 158 -> 0 by this pass.
#
# 🔴 IT ANCHORS ON THE VALUE EXPRESSION, NOT ON A DIGIT AFTER THE COLON, and that is O-29's
#    lesson applied before it could bite a third time. `borderRadius: 12` is easy; the two forms
#    that matter are the ones a colon-plus-digit pattern cannot see:
#      · `borderTopRightRadius: isUser ? 4 : 16`   — a numeric inside a TERNARY
#      · `borderRadius: cfg.height / 2`            — a numeric inside an EXPRESSION
#    Both exist in this tree. So the pattern is "a border-radius property whose value expression
#    contains a digit", which reaches all three forms. `t.radius.md` contains no digit, so every
#    correct post-migration spelling is invisible to it by construction.
#
# 🔴 `border[A-Za-z]*Radius` DELIBERATELY EXCLUDES `textShadowRadius` (face-capture.tsx). That is
#    a SHADOW radius, a different property family, and design §4.5 removes the whole textShadow
#    block in the screens phase. Widening this rule to `[A-Za-z]*Radius` would make a
#    screens-phase item fail a codemod gate.
#
# TWO SCOPED EXCEPTIONS, both MARKED IN-FILE and both PRINTED, per the GLYPH/ABOVE-CEILING idiom:
#   · SHAPE   (4) — TWO CLASSES, and the second was added at the funnel phase's screen 6. Both are
#                   SHAPE PARAMETERS rather than steps, which is the exception's whole test.
#                   (a) qa.tsx's chat-bubble TAIL, x2. The 4 is not a step: its whole function is
#                       being much tighter than the other three corners so the bubble points at its
#                       sender. The 8px step DOUBLES the notch and weakens the signal. Owner ruling:
#                       keep 4, take the 14px step for the other corner.
#                   (b) 🆕 DailyInsightCard's FLUSH EDGE, x2 — the two ZEROES on the right-hand
#                       corners of Home's hero, which design §10.1.0's mechanism 4(b) runs off the
#                       screen edge. 🔴 THE SCALE HAS FIVE STEPS AND NO ZERO, CORRECTLY: a squared
#                       corner is not a design step, it is the ABSENCE of one, and this edge has no
#                       corner because it has no edge. Adding a zero step to satisfy the grep would
#                       put a non-value in the scale, which is strictly worse than an audited
#                       exception. Registered here rather than left as prose, because an exception
#                       whose documentation names only its first class is a stale register — and this
#                       count is what makes the set auditable.
#   · DERIVED (3) — X11's `cfg.height / 2` and X12's `cfg.numberSize / 2` x2. Not radius steps;
#                   they are a PROTECTED DIMENSION halved, and X11 bans the padding-plus-pill
#                   restyle on that component specifically because both halves are COUPLED.
#                   PRESERVE-BLINDLY (§5.4).
# Both sets print separately and are NEVER summed, so neither can absorb growth in the other.
# ⚠️ ALTERNATION MOST-SPECIFIC-FIRST (P-2): the two marked branches precede the bare one so the
#    marked form is consumed WHOLE and then dropped by the discard filter.
G "inline-radius" "border[A-Za-z]*Radius[[:space:]]*:[^,;}]*/\* (SHAPE|DERIVED) \*/|border[A-Za-z]*Radius[[:space:]]*:[^,;}]*[0-9]" "SHAPE|DERIVED"
SA "excepted: SHAPE"        "border[A-Za-z]*Radius[[:space:]]*:[^,;}]*/\* SHAPE \*/" exact 4
SA "excepted: DERIVED"      "border[A-Za-z]*Radius[[:space:]]*:[^,;}]*/\* DERIVED \*/" exact 3
S "  (raw, incl. excepted)" "border[A-Za-z]*Radius[[:space:]]*:[^,;}]*[0-9]"

echo "── no-fontweight ──"
# 🔴 THE §3.0.2.0 SCHEDULED RE-VALIDATION FOR PASS 4 (2026-07-31, batch E0). This rule
#    converts from a DECREASING COUNTER (~501 -> 0) into a PERMANENT INVARIANT the moment it
#    hits 0, and pass 4 introduces the replacement syntax (the five family keys, and
#    `fontFamily:`). Both halves were re-derived against the PRE-migration tree first.
#
# ✅ THE className HALF NEEDS NO WIDENING, and that was MEASURED, not assumed (design V5).
#    None of the five new family names contains a legacy weight token: the pattern requires
#    `font-` IMMEDIATELY followed by a weight word, and every new name puts a role segment in
#    between. Probe run: injecting all five post-migration spellings scores 0.
#
# 🔴 THE inline HALF WAS BLIND, AND THE BLIND SPOT WAS LIVE. The authored pattern anchors on
#    `fontWeight` + COLON, so it never saw the JSX-PROP form `fontWeight=` — which exists in
#    this tree exactly once, on the react-native-svg <Text> in the birth-chart wheel. That is
#    the same shape as O-29 one family over: THE PROPERTY THE RULE KEYS ON IS NOT THE SPELLING
#    THE VALUE ARRIVES IN. Measured on the pre-migration tree:
#        colon form   170      <- what the old pattern counted, and what §0.2's "173" became
#        equals form    1      <- NEVER counted by any figure in the plan
#        total         171
#    Widened to `[:=]`. Re-validated in BOTH directions per §3.0.2.0: it finds 171 on the
#    pre-migration tree (equality, not "at least"), and it OVER-finds nothing — there is no
#    `fontWeight ==` comparison, no type annotation and no prop named `fontWeight` anywhere
#    else in $SRC.
G "className"               "font-(thin|light|normal|medium|semibold|bold|extrabold|black)"
G "inline"                  "fontWeight[[:space:]]*[:=]"
S "  · colon form"          "fontWeight[[:space:]]*:"
S "  · JSX-prop form"       "fontWeight[[:space:]]*="

echo "── no-synthetic-italic ──"
# 🔴 THE FIFTEENTH NAMED RULE — ADDED IN PASS 4's PRE-FLIGHT (2026-07-31, batch E0), and it
#    is the EXACT SAME ARGUMENT AS `no-fontweight` ONE PROPERTY OVER. B1 bans `fontWeight`
#    because on a static face the platform either ignores it or FAKES it, differently per
#    platform. `fontStyle` with a slanted value is that same defect: the design ships exactly
#    ONE italic face (the ramp's quote step), so an italic that is asked for by STYLE rather
#    than named as a FAMILY is a synthetic oblique — a mechanical skew of an upright face.
#
#    MEASURED against the installed native code, not assumed:
#      · Android — expo-font registers each face with
#        ReactFontManager.setTypeface(key, Typeface.NORMAL, tf) (FontLoaderModule.kt:50), i.e.
#        under the NORMAL style ONLY. Asking that family for a slanted style therefore has no
#        registered face to resolve to and Android synthesises a skew.
#      · iOS — the aliased face is resolved through the swizzled fontNames(forFamilyName:)
#        (UIFont+FontFamilyAlias.swift), and a slant trait added on top is applied by CoreText.
#    Two platforms, two different fakes, no error and no warning on either. Identical failure
#    shape to the one B1 already ruled on.
#
# DECREASING COUNTER (§3.0.2.0 class 1) — baseline 20, target 0, and it CANNOT be blinded: a
# site that dodges the pattern is still a site, so the count does not fall by 20.
#   20 = 16 inline declarations + 4 className tokens. The legal post-migration spelling names
#   the FAMILY (theme's quote role / the quote family utility) and matches nothing here.
#
# 🔴 ALTERNATION ORDERED MOST-SPECIFIC-FIRST (P-2, as no-bare-scrim / no-bare-overline / the
#    GLYPH exception). The hyphenated branch exists FOR EXACTLY THE REASON no-bare-overline's
#    does: ERE has no lookbehind, so without it the rule flags ITS OWN NAME in this comment.
#    Measured — it did, on the first run. grep is leftmost-longest, so the hyphenated form is
#    consumed WHOLE at its own earlier start and then discarded.
G "synthetic-italic"        "[a-z]-italic|italic" "^[a-z]-"
# REPORT-ONLY companion. `no-synthetic-italic` matches the slanted VALUE, so it would not see
# a future `fontStyle` set to the upright value — a legal-but-pointless declaration once every
# face is named. Counted separately so it stays visible instead of becoming a new blind spot.
S "  · fontStyle decls"     "fontStyle"

echo "── no-numeric-fontsize ──"
# 346 inline, 26 fractional (NOT 28 — §1.4/§3.5's prose is wrong; this comment has always
# been right). The ramp is integers only, forever.
#
# 🔴 SCOPED EXCEPTION ADDED IN PASS 2a (owner ruling, 2026-07-31) — GLYPH SITES.
#    A pictograph's `fontSize` is a DIMENSION, not a type step. The ramp is a TYPE ramp:
#    its ceiling is display-lg 30, so an emoji at 40/44/52 has no target at all, and §5's
#    X12 (AstroNumeroBadge's 44) and X17 (SunSignReveal's 52/60, the seven readings/index
#    wells at 40/50) protect several outright — X17 says pass 2b "must not normalise" them.
#
#    🔴 THE PROOF THAT THIS IS NOT MERELY TIDINESS: at 20 and at 24 the ramp has TWO steps
#    of EQUAL SIZE (text-xl/display-sm, text-2xl/display-md). A chevron has no role that
#    picks between them, so for a glyph the mapping is not "hard", it is UNDEFINED.
#
#    🔴 IT IS KEYED ON AN IN-FILE MARKER, NOT A file:line ALLOW-LIST. §0.1 — design-derived
#    line refs drift by ~80 lines, so a line-numbered allow-list rots into a lie. The marker
#    also puts the reason where the person about to "normalise" it will read it (§5.3).
#
#    🔴 AND IT REPORTS ITSELF. An exception that silently subtracts is how a rule gets
#    disarmed (§3.0.2.0). Both numbers print, always, so the excepted set can never grow
#    unnoticed: if `excepted` climbs, someone widened it and the output says so.
#
#    Alternation is ordered MOST-SPECIFIC-FIRST (P-2, same invariant as no-bare-scrim's):
#    grep is leftmost-longest, so the marked form is consumed WHOLE and then discarded. Put
#    the bare branch first and all 60 legal glyph sites re-appear as violations.
# 🔴 SECOND SCOPED EXCEPTION ADDED IN PASS 5 — THE 7 ABOVE-CEILING SITES, NOW MARKED IN-FILE.
#    §4.6 already named this floor and ENUMERATED the 7 by file, but they carried no marker, so the
#    floor was a NUMBER IN A DOCUMENT rather than a judgement recorded at the site — the exact thing
#    §0.1 rules against (a line-numbered list rots) and §5.3 item 2 argues against (put the reason
#    where the person about to "normalise" it will read it). Pass 5 marked all 7, using the same
#    `/* … */` idiom as GLYPH, because GATE_STRICT going default-on turns this floor from a note
#    into a load-bearing subtraction and a load-bearing subtraction has to be auditable.
#
#    They sit ABOVE `display-lg` 30 — 32 ×2, 36 ×2, 40 ×2, 96 ×1 — so there is no ramp step to move
#    them to. That is a DIFFERENT reason from GLYPH's ("a pictograph's size is a dimension") and the
#    two are counted SEPARATELY and never summed, so neither can absorb growth in the other.
#    ⚠️ TWO OF THE 7 LOOK LIKE GLYPHS — combined.tsx's two decorative quote marks and
#       compatibility/index's fallbackIcon — and re-marking them GLYPH would drop this count to 4.
#       THAT WAS DELIBERATELY NOT DONE, at pass 2b and again here: reclassifying a site to improve a
#       number is §3.0.2.0's disarming move. They stay visible until someone RULES on them.
#    ⚠️ ALTERNATION MOST-SPECIFIC-FIRST (P-2), and now with TWO marked branches ahead of the bare one.
G "inline"                  "fontSize:[[:space:]]*[0-9]+(\.[0-9]+)?[[:space:]]*/\* (GLYPH|ABOVE-CEILING) \*/|fontSize:[[:space:]]*[0-9]+(\.[0-9]+)?" "GLYPH|ABOVE-CEILING"
SA "excepted: GLYPH"        "fontSize:[[:space:]]*[0-9]+(\.[0-9]+)?[[:space:]]*/\* GLYPH \*/" max 35
SA "excepted: ABOVE-CEILING" "fontSize:[[:space:]]*[0-9]+(\.[0-9]+)?[[:space:]]*/\* ABOVE-CEILING \*/" exact 6
S "  (raw, incl. excepted)" "fontSize:[[:space:]]*[0-9]+(\.[0-9]+)?"

echo "── no-variable-fontsize ──"
# 🔴 THE THIRTEENTH NAMED RULE — A NEW BLINDNESS CLASS, FOUND BY PASS 2b (2026-07-31).
#    `no-numeric-fontsize` above greps `fontSize:` followed by a DIGIT. It is therefore
#    structurally blind to `fontSize: textSize` and `fontSize: cfg.emoji` — a type size
#    indirected through a variable. Measured: 15 such sites existed, and NOT ONE has ever
#    appeared in any count in this plan — not the 346 pass-0 baseline, not 2a's 341, not
#    the 124 residual, not the 60-site glyph exception. They were never skipped; they were
#    never SEEN.
#
# 🔴 WHY THE CLASS EXISTS, because the shape will recur: all 15 live in per-size lookup
#    tables (`TEXT_SIZE`, `SIZE_CONFIG`) that MIX TYPE WITH DIMENSION —
#    `{ height: 28, paddingHorizontal: 10, emoji: 14, number: 13, label: 11 }`. At the
#    literal, the property is named `emoji`/`number`/`label`, not `fontSize`, so the value
#    reads as a dimension to a human AND is unreachable to a grep anchored on `fontSize:`.
#    They are concentrated, inevitably, in the three components §5 protects hardest:
#    Button (X3), StreakBadge (X11) and AstroNumeroBadge (X12) — exactly the files where a
#    magic number is most likely to be a load-bearing iOS guard, which is why the tables
#    were written this way in the first place.
#
# ⚠️ REPORT-ONLY, and NOT a decreasing counter. `fontSize: <expr>` is a legitimate idiom —
#    Button now reads `fontSize` from `t.txt(TEXT_STEP[size]).style` via a spread, and a
#    future primitive may legitimately compute one. The number here is a WATCHLIST, not a
#    debt: it must be READ, and each hit judged "is this a ramp step in disguise?".
#    Baseline after pass 2b: 11 — StreakBadge ×3 and AstroNumeroBadge ×8, deliberately
#    deferred (their `emoji` entries are GLYPHs, and §6.6.2 measures StreakBadge small at
#    the tightest headroom in the whole register, which needs an iOS check this repo cannot
#    run). Button's 4 were converted. If this number RISES, a new indirected type size was
#    introduced and it needs a ramp step.
# G_REPORT <name> <regex> [discard] — same alternation-then-discard shape as G(), but it
# NEVER touches `fail`. `fontSize: t.type[…]` and `fontSize: t.txt(…)` are the CORRECT
# post-migration spellings and match the broad pattern, so — most-specific-first, P-2 —
# they are consumed whole by the leading branch and dropped here.
G_REPORT() {
  local name="$1" re="$2" discard="${3:-}" n
  if [ -n "$discard" ]; then
    n=$(grep -rEoh $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null | grep -Ev "$discard" | grep -c . || true)
  else
    n=$(grep -rEoh $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null | grep -c . || true)
  fi
  printf '  %-28s %5d   (report only)\n' "$name" "$n"
  if [ -n "${GATE_VERBOSE:-}" ]; then
    grep -rEn $INC --exclude=theme.js --exclude=theme.d.ts "$re" $SRC 2>/dev/null | grep -Ev "fontSize:[[:space:]]*t\.(type|txt)" || true
  fi
}
G_REPORT "variable-fontsize"  "fontSize:[[:space:]]*t\.(type|txt)|fontSize:[[:space:]]*[A-Za-z_\$][A-Za-z0-9_\$.]*" "^fontSize:[[:space:]]*t\.(type|txt)"

echo "── no-offramp-fontsize-class ──"
# 🔴 THE TWENTY-SECOND NAMED RULE — FOUND BY THE FUNNEL-SCREENS PHASE AT SCREEN 2 (2026-08-04),
#    AND IT IS THE className HALF OF THE RAMP'S CEILING. `no-numeric-fontsize` above greps
#    `fontSize:` in an INLINE STYLE. `no-variable-fontsize` greps the indirected inline form.
#    NEITHER OF THEM, AND NOTHING ELSE IN THIS FILE, LOOKS AT A className. So an off-ramp type
#    size written as a size UTILITY is invisible to every rule here.
#
# THE MECHANISM, and it is O-28's exactly — Tailwind emits a rule BECAUSE SOMEONE WROTE IT.
# The config replaced `theme.fontSize` with the twelve-step ramp, but the DEFAULT scale's larger
# keys are still resolvable names, so the moment a source file writes one the scanner emits a
# live rule for it. Measured against the resolved set (`--members`, 199 rules):
#
#     text-4xl  ->  fontSize 36, lineHeight 40, NO letterSpacing, NO family
#     text-5xl  ->  fontSize 48, ...
#     text-6xl  ->  fontSize 60, 🔴 NO lineHeight AT ALL, NO letterSpacing, NO family
#
# 🔴 SO THE SEVERE HALF IS THE LEADING, NOT THE SIZE. O-64 was "a size that was ABSENT rendered
#    at the platform's default and a rule can see a wrong size, never an absent one." This is its
#    mirror: a size that is PRESENT and a LEADING that is absent. `no-leading-utilities` reads 0
#    and is blind, because there is no leading utility here to find — the ramp's whole premise is
#    that every step bakes its own leading, and these steps have none. At sixty points the
#    platform's computed leading is what actually decides whether the line clips.
#
# 🔴 AND FIVE INSTRUMENTS READ CLEAN ON EVERY ONE OF THESE SITES. `no-numeric-fontsize` 0 (it is
#    not an inline declaration) · `--members` 0 unresolved (they DO resolve) · `--diff` clean
#    (they have always been there, so nothing moves) · `family-arrival` 0 violating (a family IS
#    named at most of them, which is the sting: the gate written for O-35 checks that a step and
#    a family agree, and it cannot object when the SIZE is the thing off the system) · `tsc`
#    clean (a className is a string). This rule is the only instrument that can see the class.
#
# ⚠️ REPORT-ONLY, BY THE SAME RULING THAT MADE `no-white-on-accent` REPORT-ONLY — and for the
#    reason the deleted GP() block records at the top of this file: driving it to 0 needs RULINGS
#    on numerals that belong to screens the funnel phase does not open, and a blocking rule that
#    cannot reach 0 is "a lockout, not a gate" — defeated with one flag on day one and then never
#    re-armed. It must be READ, and each hit judged: pictograph, or type?
#
# ══════════════════════════════════════════════════════════════════════════════════════════
# 🔴 THE QUESTION "ARE THESE KEYS SERVING GLYPH SITES OR TYPE SITES?" IS ANSWERED — 2026-08-04.
#    ANSWER: **BOTH, AND PER KEY**, so neither branch of the question is right on its own and the
#    plan's "retire the three keys in the screens phase" note IS THE THING THAT IS WRONG.
#
#      text-4xl   36 / leading 40   9 sites   4 pictograph + 5 type   -> KEY IS PERMANENT
#      text-5xl   48 / 🔴 NO leading  1 site   0 pictograph + 1 type   -> KEY SERVES TYPE ONLY
#      text-6xl   60 / 🔴 NO leading  5 sites  4 decorative + 1 type   -> KEY IS PERMANENT
#
#    So `4xl` and `6xl` CANNOT BE RETIRED AT ALL: pictographs need them, their step is a
#    DIMENSION, and there is nothing in the ramp to move a 36- or 60-point emoji to. Deleting
#    either key would silently drop 8 pictographs to the platform default, which is O-64 exactly.
#    🔴 `5xl` IS THE ONE KEY WITH NO PICTOGRAPH AT ALL — it exists for a single numeral, so it is
#       purely a type debt and it retires when that numeral is ruled on. It is also one of the two
#       keys with NO LEADING, which is where the severe half of this rule actually lives.
#
#    ⚠️ THE SIX TRUE PICTOGRAPHS ARE DELIBERATELY LEFT UNMARKED, which keeps `marked GLYPH` at 0.
#       Marking them means rewriting six `className` string LITERALS into brace EXPRESSIONS to
#       carry the comment, i.e. a structural edit to move a REPORT-ONLY counter, and this rule's
#       own paragraph below already refuses that move for the two look-alike quotation marks. The
#       classification lives in THIS ENUMERATION, which is where §8.2 says a residue belongs.
# ══════════════════════════════════════════════════════════════════════════════════════════
#
# BASELINE 19, ENUMERATED BY CLASS SO THE NUMBER IS AUDITABLE RATHER THAN OPAQUE. 9 + 10 = 19,
# and the arithmetic is written out because a total reconciles by accident and a named reason
# per entry cannot (§8.2's residual-histogram rule). 🟢 IT READS **11** AS OF 2026-08-04:
# 8 pictograph/decorative + 3 type, and the 8 are PERMANENT.
#
#   9 · PICTOGRAPH OR DECORATIVE MARK — the size is a DIMENSION, exactly GLYPH's argument on
#       no-numeric-fontsize. ProfileHeader (a zodiac pictograph) · compatibility/[id] and
#       compatibility/index ×2 (two sparkle pictographs and a camera one) · common/EmptyState
#       (🟢 ALREADY MARKED at the site — the exception mechanism this rule inherits rather than
#       invents) · common/ErrorView (a warning pictograph) · readings/PalmTypeHeader (a passed-in
#       pictograph) · readings/AffirmationCard ×2 (two decorative quotation marks).
#       🔴 THE TWO QUOTATION MARKS ARE NOT MARKED, DELIBERATELY. no-numeric-fontsize's
#       ABOVE-CEILING block already rules on the identical pair in readings/combined.tsx: "TWO OF
#       THE 7 LOOK LIKE GLYPHS ... re-marking them GLYPH would drop this count to 4. THAT WAS
#       DELIBERATELY NOT DONE ... They stay visible until someone RULES on them." Marking this
#       pair while that pair stays visible would be the same disarming move, one property over.
#
#  10 · REAL TYPE, and every one of them is a screen title or a single value:
#       🟢 (auth)/welcome            RETIRED to the ramp's top display step, funnel screen 2.
#       ⬜ (auth)/signup             ── funnel screen 3, this phase.
#       ⬜ (capture)/birth-data      ── funnel screen 4, this phase.
#       🟢 (auth)/login · forgot-password · reset-password · verify-code — FOUR IDENTICAL SCREEN
#          TITLES in the same route group, one idiom. RETIRED 2026-08-04 (`P66`), all four in one
#          edit, onto the SAME inline spread screens 2-4 used rather than a size class — which is
#          the point: the spread carries the step's FACE, and a size utility carries no family, so
#          the className form would have left four screen titles in the body face. 36 -> 30.
#       ⬜ (main)/profile            a monogram inside a fixed 120-point disc, i.e. arguably the
#          dimension class rather than the type class. NEEDS A RULING, not an edit.
#       ⬜ compatibility/CompatibilityScoreRing   the compatibility percentage — §17.3 assigns
#          that screen's ONE display hero to exactly this numeral, and the ramp's ceiling is
#          eighteen points BELOW what it renders at today. A real design judgement.
#       ⬜ compatibility/CompatibilityShareCard   the same value on the export surface, at sixty.
#          🔴 Coupled to the one above: the two must move together or the app shows one number at
#          two sizes on two surfaces, which is the divergence extraction exists to prevent.
#
# ⚠️ THE SMALLER KEYS ARE NOT GREPPED, AND THAT IS DELIBERATE: the ramp OWNS `text-2xl` and
#    `text-2xs`, so including them would fail on correct code — the mistake §13 records against
#    the first draft of no-legacy-radii.
G_REPORT "offramp-fontsize-class" "text-(3xl|4xl|5xl|6xl|7xl|8xl|9xl)"
S "  · marked GLYPH"        "text-(3xl|4xl|5xl|6xl|7xl|8xl|9xl)[^']*'[[:space:]]*/\* GLYPH \*/"

echo "── p23-optin-completeness ──"
# 🔴 THE FOURTEENTH NAMED RULE, and the ONLY one in this file that is not a grep — because
#    the property it checks CANNOT be expressed as one (owner ruling, 2026-07-31).
#
# P23/O-13: pass 4 sets Text.defaultProps.allowFontScaling = false app-wide, and that is only
# shippable because the five `scales: true` reading-copy steps opt back IN. Pass 2b landed the
# opt-ins. 🔴 BUT THE OPT-IN IS TWO DIFFERENT EDITS DEPENDING ON WHERE THE STYLE LIVES:
#   · inline style      -> the txt() PROP SPREAD carries style AND both props. ONE edit.
#   · StyleSheet.create -> the style object carries the leading, but allowFontScaling and
#                          maxFontSizeMultiplier are <Text> PROPS and CANNOT live in a style
#                          object AT ALL. The opt-in must be added SEPARATELY, at every JSX
#                          element that consumes the style. TWO edits, in two places.
#
# 🔴 "THE INLINE HALF LOOKS FINISHED" IS THE TRAP. A style-object rewrite alone drives every
#    other counter in this file to its floor, passes tsc, passes --diff, passes --members — and
#    leaves the StyleSheet-homed reading copy SILENTLY NOT SCALING once pass 4 lands. No other
#    signal exists: the missing thing is a prop that was never there, on an element that renders
#    correctly today. Which is why the two halves are counted SEPARATELY and NEVER SUMMED — a
#    single total lets a shortfall in one be masked by the other (§3.0.2.2.2, one level down).
#
# MISSING is a DECREASING COUNTER at 0 and cannot be blinded: a consumer that dodges the
# pattern is still a consumer, so the count does not fall. Nonzero here fails the gate.
if node scripts/p23-optin-check.js; then :; else fail=1; fi

echo "── family-arrival ──"
# 🔴 THE SEVENTEENTH NAMED RULE, AND THE FIRST OF A NEW CLASS: AN **ARRIVAL** GATE.
#    Owner ruling 2026-07-31, generalised from pass 4. Every other rule in this file counts
#    REMOVALS. `no-fontweight` reaching 0 proves every legacy weight is GONE — it says nothing
#    whatsoever about whether the RIGHT FAMILY ARRIVED. Removal-counting and arrival-counting are
#    different assertions, and a gate suite made entirely of the first kind is blind to the second.
#
# 🔴 IT CAUGHT A LIVE DEFECT IN PASS 4's OWN OUTPUT ON ITS FIRST RUN — 9 sites where a Figtree
#    face had been written onto a Literata display step, because the rewriter inferred each site's
#    step from the SAME LINE and those style objects put the step spread and the weight on
#    different lines. `no-fontweight` was 0, `--diff` clean, `--members` clean, `tsc` clean.
#
# See codemod-plan §3.0.2's ARRIVAL-GATE class and §3.6's RULE R. Pairs by BRACE BALANCE, never by
# line window — a line window is exactly what could not see the defect.
if node scripts/family-arrival-check.js; then :; else fail=1; fi

echo "── alpha-callsites ──"
# 🔴 THE EIGHTEENTH NAMED RULE, added in PASS 5 (2026-07-31). The THIRD one that is not a grep,
#    and the second ARRIVAL-class rule — it asserts that a mechanism WORKS, not that a spelling
#    is gone.
#
# `theme.alpha()` throws by design on a token that already carries alpha, and pass 5 changed WHICH
# tokens those are — in BOTH directions at once:
#     border-subtle / border-strong        solid hex -> rgba()      (now caught by the value regex)
#     surface-raised / -overlay / locked   rgba()    -> solid hex   (now caught ONLY by the ROLE
#                                                                    denylist)
# 🔴 SO PASS 5 IS THE MEASUREMENT THAT JUSTIFIES §3.0.2.2.1 RETROSPECTIVELY, AND IN THE DIRECTION
#    NOBODY PREDICTED. The plan foresaw a value-only guard STARTING to throw on `border-subtle`.
#    Measured, the worse half is the opposite: a value-only guard would have STOPPED throwing on
#    surface-raised / surface-overlay / locked, because those are plain 6-digit hex now. A guard
#    that silently opens is strictly worse than one that loudly closes.
#
# 🔴 AND THE FAILURE MODE IS THE NASTIEST IN THIS REPO: 17 of the 120 call sites are inside
#    `StyleSheet.create`, i.e. MODULE SCOPE. A throw there runs at IMPORT — before React mounts,
#    before the root ErrorBoundary exists — and the app dies white. Nothing else in the four-layer
#    stack can see it: tsc types alpha() as (string, number) => string; this file's greps read
#    source text and the source is correct; `--diff` resolves classNames and every one of these is
#    an inline style. So the only possible check is to CALL them, which is what this does.
if node scripts/alpha-callsite-check.js; then :; else fail=1; fi

echo "── primitive-adoption ──"
# 🔴 THE TWENTIETH NAMED RULE, added as DELIVERABLE ZERO of the primitives phase (P36 / O-38,
#    2026-08-03). The FOURTH one that is not a grep, and the THIRD of the ARRIVAL class.
#
# 🔴 WHY IT HAD TO EXIST BEFORE THE FIRST COMPONENT WAS WRITTEN: primitives-plan.md §0.1. Every
#    gate in the codemod rested on ONE claim — prove nothing moved — and `--diff` returning
#    "0 rule(s) moved" was the strongest sentence the programme could say. NOT ONE ITEM IN THIS
#    PHASE CAN MAKE THAT CLAIM. Every component changes by design, so an identity assertion over
#    this work is either vacuously true or false. The question changes from "did anything move
#    that should not have?" to "DID THE RIGHT THING ARRIVE AT EVERY SITE THAT NEEDS IT?", and
#    nothing in this file could ask that.
#
# 🔴 AND IT READS SOMETHING NO OTHER RULE HERE CAN SEE: A JSX ELEMENT NAME AND A PROP VALUE.
#    Seventeen of the nineteen rules above search source text for a spelling; two invoke a
#    mechanism. NONE can see an attribute. codemod-plan §3.0.2 class 5 — "the property the rule
#    keys on is not where the value lives" — arrives in this phase in a new shape: A PROP IS
#    NEITHER A CLASS NOR A STYLE. A component that takes its whole visual contract from a numeric
#    prop is invisible to every removal-shaped rule ever written here.
#
# It pairs by BRACE BALANCE, never a line window (three findings in this programme came from line
# windows), and it was re-validated in BOTH directions before it was allowed to block: on the tree
# at item 0 it returned EXACTLY the known sets — 25 and 7, equality, not "at least" — and ten
# separate injected defects were each caught singly, including one whose props span four lines and
# carry a comparison operator inside a prop value.
if node scripts/primitive-adoption-check.js; then :; else fail=1; fi

echo "── invariant-register ──"
# 🔴 THE TWENTY-SECOND NAMED RULE, added 2026-08-04. It exists because a DOCUMENTED INVARIANT PLUS
#    AN ACCURATE PREDICTION OF ITS VIOLATION STILL PRODUCED THE VIOLATION (`O-97`).
#
# `X17` was broken on HEAD. Every protection the project had was already in place: the register
# documented the property, its own risk column PREDICTED that exact deletion and rated it "very
# likely", and primitives-plan §2.2 restated it a third time per component. Six of the seven
# clipping overrides were deleted anyway, during this phase, and it was found BY ACCIDENT while
# measuring something else. §5.4 having closed iOS verification permanently, the consequence could
# never have been caught on a device either.
#
# 🔴 SO THE REGISTER IS NOT A CONTROL. A paragraph saying "preserve this" is a prediction; a number
#    that fails is a control. This rule converts the register's twenty rows into 86 assertions:
#    58 per-file exact literal counts, 6 boundaries asserted to zero outside their home, 5 tree-wide
#    exact totals, 2 retired modules asserted deleted, and 15 probes that verify the rows asserted
#    in OTHER scripts still carry their assertion there.
#
# 🔴 AND ITS FIRST ASSERTION IS THE ONE THAT COULD NOT HAVE EXISTED BEFORE X17 BROKE: a ROLL CALL
#    over the whole register in which every row must be CLAIMED by an assertion or carry a stated
#    reason it cannot be. "Merely written down" stops being a legal state. Thirteen of the twenty
#    rows were in exactly that state when this was written.
#
# ⚠️ IT READS CODE ONLY, and that is load-bearing rather than tidy. Measured while writing it: X19's
#    two literals read 1 in code and 2 in RAW, because the paragraph explaining why they must not be
#    removed spells both — so a text-level presence check on the app's highest-revenue surface would
#    have been satisfied by its own documentation forever, with the code deleted (`O-68` dir. 2).
#
# ⚠️ WHAT A GREEN LINE HERE DOES NOT MEAN, per primitives-plan §2.4: it proves each guard SURVIVED
#    THE DIFF, never that it WORKS. These guards prevent an iOS-PRODUCTION collapse and iOS is
#    paused, so no Android run is evidence about any row. It is a diff alarm, and that is its ceiling.
if node scripts/invariant-register-check.js; then :; else fail=1; fi

echo "── motion-arrival ──"
# 🔴 THE 25TH NAMED RULE, DELIVERABLE ZERO OF THE MOTION PHASE (2026-08-04). The FIFTH one that is
#    not a grep and the FOURTH of the ARRIVAL class.
#
# 🔴 IT CAUGHT A DEFECT NO OTHER INSTRUMENT IN THIS TREE CAN SEE, and the class is new: THREE score
#    bars were animating `width` — a LAYOUT property — inside a worklet, which re-lays-out the row on
#    every frame. §18's contract bans it in as many words ("opacity and transform ONLY. ZERO layout
#    properties animated — animating layout causes reflow"), and the worst of the three sits on the
#    60-second wait screen, so a per-frame re-layout ran for a full minute on the lowest-end device.
#    NOTHING else could see it: a worklet's return value is not a className, not a StyleSheet rule and
#    not a JSX attribute, so `--diff`, `--members`, every grep in this file and `tsc` all read green.
#
# It also found the baseline the phase started from: 8 files, 45 animation sites, ZERO values from the
# design · 14 distinct raw durations against a spec that names SIX · 3 unnamed easing recipes · 2
# infinite loops with no teardown · 1 file still on the legacy JS-thread API, with a SPRING.
#
# ⚠️ IT WAS WIRED IN THE COMMIT THAT SATISFIED IT, never before — the `check-brand-assets` precedent:
#    wiring a red check turns the BASELINE red, and a red baseline invalidates every later injection
#    case (`O-67`'s record). The baseline is reported in that commit's body instead.
if node scripts/motion-arrival-check.js; then :; else fail=1; fi

echo "── brand-assets ──"
# 🔴 THE TWENTY-THIRD NAMED RULE, WIRED IN 2026-08-04 — and it is the FIRST one that looks at a
#    BINARY. Every other rule in this file, and every node check above, reads source text or
#    resolves a config. NONE of them can see a PNG, and `app.json` is outside `$SRC` and outside
#    both Tailwind content globs — so before this line the brand rasters were the one asset class
#    in the repo with NO instrument pointed at them, in a project with no CI and no test runner.
#
# 🔴 WHAT IT CAUGHT, AND IT HAD SHIPPED SINCE 2.0.0: `app.json` pointed BOTH `icon` and
#    `android.adaptiveIcon.foregroundImage` at ONE file, and those two rule sets are mutually
#    exclusive by construction — one demands OPAQUE, the other demands TRANSPARENT. The foreground
#    layer was therefore 100% opaque and filled 100% of its canvas, so every circular launcher mask
#    cropped 65.8% of the artwork. A zodiac RING is the worst possible shape for that.
#
# ⚠️ IT WAS DELIBERATELY *NOT* WIRED IN UNTIL NOW, and the script's own footer said why: it exited
#    non-zero on real defects, and wiring a red check into the gate turns the BASELINE red — which
#    is how a re-validation run becomes invalid from case N onward (`O-67`'s record). The condition
#    it named was "the SAME commit as the replacement artwork, so the assertions go green by being
#    SATISFIED, not by being weakened." `--emit` satisfied all nine in that commit. Discharged.
#
# It reads `app.json`'s own pointers, so re-pointing a key at a non-conforming file fails here
# rather than at the next store review.
if node scripts/check-brand-assets.js; then :; else fail=1; fi

echo "── text-defaults-installed ──"
# 🔴 THE SIXTEENTH NAMED RULE, AND THE SECOND ONE THAT IS NOT REALLY A GREP OVER $SRC — it is a
#    single-file existence check, like the lib/colors.ts clause above. Added in pass 4 (E0).
#
# 🔴 WHY IT HAS TO EXIST: THE MECHANISM DESIGN §3.6 SPECIFIES IS A NO-OP ON THIS STACK.
#    §3.6 (and §1.7's P23 box) both say to set `Text.defaultProps.allowFontScaling = false`
#    once at app root. MEASURED against the installed renderer: React 19.0.0 resolves
#    defaultProps for CLASS components ONLY. In react-native/Libraries/Renderer the merge lives
#    in resolveClassComponentProps(), and every one of its ten call sites is gated on
#    shouldConstruct(); updateForwardRef() passes nextProps STRAIGHT THROUGH with no merge.
#    RN 0.79.6's Text is React.forwardRef(...). So assigning defaultProps on it changes
#    NOTHING, silently — no error, no warning, no build signal.
#
# 🔴 AND IT IS LOAD-BEARING TWICE OVER, because pass 4 needs a global default for the FAMILY as
#    well as the freeze. Census over app+components: 1,118 <Text> nodes, of which 328 carry a
#    weight class (so E3 gives them a family) and 198 carry a txt() spread (so E2 does) —
#    leaving 592 with NO family at all: 410 className-with-no-family-utility, 99 style-object
#    only, 83 with no styling attribute whatsoever. Without a working global default, pass 4
#    ships an app that is HALF Figtree and HALF system font, and NOTHING in the four-layer stack
#    can see it: no-fontweight reaches 0, --diff is clean, --members is clean, tsc is clean.
#
# So both defaults live in ONE module and this check asserts it is actually WIRED. A module that
# exists but is never imported is the exact failure mode the check is for — that is how a global
# default gets "installed" and does nothing.
if grep -q "installTextDefaults" app/_layout.tsx 2>/dev/null; then
  printf '  %-28s %5s\n' "installTextDefaults" "OK"
else
  printf '  %-28s %5s\n' "installTextDefaults" "ABSENT"
  echo "      🔴 592 of 1118 <Text> nodes would have NO family, and no other rule can see it."
  fail=1
fi

echo "── no-leading-utilities ──"
# 45 usages; 37 genuinely override the ramp, 8 are pure no-ops.
# Paired config action: DELETE theme.lineHeight (pass 2b).
G "leading-*"               "\bleading-[a-z0-9]+"

echo "── no-bare-scrim ──"
# 🔴 THE EIGHTH NAMED RULE — OWNER RULING R3 (2026-07-30). Baseline 0, and it must STAY 0.
#
# `scrim` is a SOLID HEX (#000000 held, #100E0D at pass 5), so the alpha lives on the utility
# at each site. That trades a FAIL-SAFE default for a FAIL-DANGEROUS one:
#   · when scrim was rgba(0,0,0,0.6), a forgotten modifier still rendered a 60% scrim.
#   · now, a forgotten modifier renders an OPAQUE BLACK OVERLAY over the whole surface.
# Measured: bare `bg-scrim` -> rgba(0,0,0,var(--tw-bg-opacity,1)) = fully opaque.
#
# No other rule catches this — `scrim` is a legal token name, so no-legacy-tokens passes it and
# no-raw-hex never sees it. This rule is the only thing standing between a dropped `/60` and a
# black screen. Matches `scrim` NOT followed by `/`, incl. at end-of-token (bg-scrim").
#
# 🔴 WIDENED IN PASS 1b (2026-07-31) — THE SCHEDULED §3.0.2.0 RE-VALIDATION, and pass 1b would
#    have DISARMED this rule exactly as pass 1a disarmed no-white-on-accent.
#    1b gives `scrim` its first INLINE call sites. All 17 of §1.6b V-5's scrims are
#    StyleSheet/inline, so `bg-scrim/60` — a className UTILITY — does not apply to one of them;
#    they take `t.alpha(t.color.scrim, 60)` instead (owner ruling 2026-07-31, see theme.js).
#    The narrow pattern above matches `scrim` followed by `,`, so it would have reported all 17
#    LEGAL helper calls as violations. 🔴 And that is the INSIDIOUS failure direction §3.0.2.0
#    names: OVER-finding. A rule that cries wolf 17 times gets ignored, and an ignored rule is a
#    disabled rule — which is precisely how C-f was demoted to report-only.
#
#    So the pattern now recognises BOTH legal spellings and flags only what is genuinely opaque:
#      LEGAL:   bg-scrim/60 · bg-scrim/90 · t.alpha(t.color.scrim, 60)
#      FLAGGED: bg-scrim (bare) · t.color.scrim / color['scrim'] NOT inside an alpha() call
#
# 🔴 THE ALTERNATION IS ORDERED MOST-SPECIFIC-FIRST, AND THAT ORDERING IS THE RULE'S CORRECTNESS
#    (the same invariant as P-2 for replacement lists — B4's bug was this exact mistake inverted).
#    `alpha\([^)]*scrim[^)]*\)` must precede the bare `scrim` branch: grep is leftmost-longest, so
#    the helper call is consumed WHOLE at its own earlier start position and then discarded by the
#    `grep -v`. Put the bare branch first and every legal call re-appears as a false positive.
G "bare-scrim"              "alpha\([^)]*scrim[^)]*\)|scrim([^/a-zA-Z0-9-]|$)" "^alpha\("

echo "── no-bare-overline ──"
# 🔴 THE TWELFTH NAMED RULE — O-28, option (a). PERMANENT INVARIANT, baseline 0, stays 0.
#    Added in pass 2b's pre-flight (2026-07-31). It is the first rule in this file whose
#    target class is "a className that resolves CORRECTLY as far as every other tool can
#    tell, and is still wrong."
#
# THE COLLISION. Tailwind ships its own `.overline { text-decoration-line: overline }`
# utility. The ramp's 11px eyebrow step is emitted as `text-overline` (C-a prefixes the
# key at the Tailwind boundary), so `className="overline"` is NOT the eyebrow — it is
# Tailwind's decoration utility, and it GENUINELY RESOLVES. Therefore:
#   · no-legacy-tokens passes it   — `overline` is a legal Tailwind utility name.
#   · --members passes it          — it IS a member of the resolved rule set.
#   · --diff passes it             — nothing moved; the rule was always there.
#   · tsc passes it                — className is a string.
# This rule is the only instrument that can see it.
#
# ⚠️ MEASURED CORRECTION TO O-28's WORDING (pass 2b pre-flight, against the live resolved
#    set): O-28 says the bare class "draws a LINE above the text". That is the WEB
#    behaviour. On React Native it does not: RN's textDecorationLine accepts only
#    none|underline|line-through|underline line-through, so react-native-css-interop DROPS
#    the declaration and `overline` resolves to the EMPTY rule `{}`. The real failure mode
#    is therefore a SILENT NO-OP — the eyebrow renders at the inherited size with no
#    tracking and no 11px — not a stray rule. Lower harm than O-28 assumed, identical
#    detectability (i.e. none, without this rule), so the rule still earns its place.
#
# 🔴 `quote` IS DELIBERATELY NOT IN THIS RULE, AND THAT OMISSION IS THE RULING, NOT A GAP.
#    O-28 proposes catching a bare `quote` token by the same means. Measured on this tree,
#    `\bquote\b` returns 14 hits and ALL FOURTEEN ARE CORRECT CODE — a JSX prop name
#    (`quote={...}` ×7 on ShareableQuote/CompatibilityShareCard), a TS field declaration,
#    a destructured parameter and a JSX expression. §3.0.2.0 names OVER-finding as the
#    MORE INSIDIOUS failure direction: a rule that cries wolf 14 times gets ignored, and an
#    ignored rule is a disabled rule — which is exactly how C-f was demoted to report-only.
#    And the harm it would guard is nil: there is no `.quote` Tailwind utility, so a bare
#    `className="quote"` resolves to NOTHING rather than to something wrong (verified
#    absent from the resolved rule set). `overline` is the only member of this class.
#
# 🔴 ALTERNATION ORDERED MOST-SPECIFIC-FIRST (P-2, as no-bare-scrim and the GLYPH exception).
#    grep is leftmost-longest, so `t.type['overline']` and `text-overline` are each consumed
#    WHOLE at their own earlier start position and then discarded. Put the bare branch first
#    and all 5 legal theme lookups re-appear as violations.
#    LEGAL:   text-overline · t.type['overline'] · t.txt('overline') · either quote char
#    FLAGGED: a bare `overline` token anywhere else
# ⚠️ BOTH QUOTE CHARACTERS ARE MATCHED, and that is P-2, not belt-and-braces. The tree's
#    legal lookups are all single-quoted, so a `['overline']`-only branch reads clean TODAY
#    and false-positives the first time someone writes `t.type["overline"]`. Measured: with
#    the single-quote-only form, a double-quoted probe scored 1. A permanent-invariant rule
#    that fires on correct code is a decommissioned rule (§3.0.2.0's OVER-finding mode).
#
# 🔴 WIDENED WITHIN PASS 2b ITSELF, BY ITS OWN FIRST RUN — and this is §3.0.2.0's scheduled
#    re-validation catching a live OVER-find, one batch after the rule was written.
#    D4 mapped the five uppercase 10px pills onto this step, which introduced a spelling
#    that did not exist anywhere in the tree when the rule was authored: `t.txt('overline')`.
#    The rule went 0 → 8, ALL EIGHT CORRECT CODE. Eight false positives on a permanent
#    invariant is precisely how a rule gets ignored and thereby disabled. Added the
#    `t.txt(…)` branch. 🔴 THE LESSON, because it will recur: this rule's discard list must
#    grow every time a NEW LEGAL WAY TO NAME THE STEP appears. Any future accessor —
#    `t.type.overline`, a destructured `{ overline }`, a `<Txt step="overline">` in the §9
#    primitives phase — will trip it again, and the fix is always to widen the LEGAL branch,
#    never to relax the bare branch.
#
# ⚠️ THE `-overline` BRANCH EXISTS SO THE RULE CAN BE NAMED IN PROSE. Without it, writing
#    "no-bare-overline" in any comment in $SRC scores a hit — the rule flags its own name,
#    because `overline` there is preceded by a hyphen and ERE has no lookbehind. Measured:
#    it happened on the first run, in the very comment explaining the rule. A hyphenated
#    `*-overline` is never a legal Tailwind class in this config, so consuming it costs no
#    detection; a rule that cannot be discussed in a code comment is a rule that gets
#    renamed or deleted by the next person who trips it.
G "bare-overline"           "t\.(type\[|txt\()[\"']overline[\"']|[a-z]-overline|overline" "^(t\.|[a-z]-)"

echo "── no-quoted-token-call ──"
# 🔴 THE TENTH NAMED RULE (owner ruling, 2026-07-31). A NEW BLINDNESS CLASS, found by pass 1b.
#
# `backgroundColor: 't.alpha(t.color.accent, 15)'` — a token call trapped INSIDE a quoted string —
# passes THREE OF THE FOUR verification layers:
#   layer 1 `tsc`      : PASSES. backgroundColor accepts a string, so the type is satisfied.
#   layer 2 this gate  : PASSES. the rgba() literal is genuinely gone, so no-raw-hex counts it
#                        as migrated.
#   layer 3 --diff     : BLIND. it resolves className UTILITIES; an inline style is invisible to it.
#   layer 4 the screen : the colour simply never renders.
# It was caught only by the pass-1b batch-replay byte-identity diff, which is not a standing gate.
#
# Decreasing-counter shape (baseline 0, and it can never be blinded — the count cross-checks the
# pattern), cheap, and COMPLETE for the class: any t.color/t.alpha/t.txt reference that appears
# between quotes is wrong by construction, because these are values and functions, never strings.
# 🔴 THE PATTERN IS A QUOTE IMMEDIATELY BEFORE THE TOKEN, not "a token between two quotes".
#    The loose form matched 35 FALSE POSITIVES on correct code, because an unrelated quoted value
#    later on the same line (`fontWeight: '600'`) brackets the token call:
#        { color: t.color.fg, fontWeight: '600' }   <- loose pattern matches, and it is CORRECT code
#    35 false positives is a decommissioned rule (§3.0.2.0's OVER-finding mode). The real defect is
#    always the WHOLE call wrapped in quotes, so the quote sits directly against the `t.`.
G "quoted-token-call"       "[\"'][[:space:]]*t[.](alpha|color|chart|txt)"

echo "-- no-value-shape-concat --"
# 🔴 THE ELEVENTH NAMED RULE, and the SECOND half of the quoted-token-call class.
# `${token}20` CONCATENATES a two-hex-digit alpha suffix onto a token value, which assumes the
# value SHAPE is 6-digit hex. It is correct while HELD and GARBAGE after pass 5 for any token that
# becomes rgba() -- `rgba(...)20` parses to nothing and the fill silently disappears (§3.0.2.2.1).
# 🔴 THE HAZARD PROPAGATES THROUGH VARIABLES: 2 of the 16 live instances were `${config.color}20`,
#    where config.color is a map lookup. So the pattern must match ${ANYTHING}hexpair, NOT just
#    ${t.color...} -- searching for the token name alone missed a third of them.
G "value-shape-concat"      '[$][{][^}]+[}][0-9a-fA-F]{2}'

echo "── dead classes (the 9th grep, from §7.4's note) ──"
# Two live dead classes no other rule catches.
#
# 🟢 BOTH WERE `GP()` PENDING COUNTERS AND BOTH EXPIRED AT PASS 3a (owner ruling R-3, 2026-08-01).
#    They are `G()` again — hard, blocking, at 0 — and that conversion is the RULING, not tidying:
#    a PENDING entry that survives the pass which owes it is not a cleared debt, it is a FINDING
#    (either the pass did not do what it claimed, or a transient residue has quietly become
#    permanent). §4.6's PENDING box now states the expiry obligation explicitly.
#    · the sibling-combinator utility ×2 -> `gap-3` on the parent (D4, login + signup)
#    · the four dead `30`-key width/height classes DELETED (profile.tsx; the inline 120×120 sizes
#      those elements and always did)
# ⚠️ These two patterns are why NO COMMENT IN $SRC MAY SPELL EITHER CLASS OUT IN FULL. They are
#    PERMANENT INVARIANTS at 0 now, with no counter left to cross-check them (§3.0.2.0 class 2), so
#    a comment mentioning one re-opens it and the reopening looks exactly like a regression.
G "space-[xy]-"              "\bspace-[xy]-"   # can NEVER work under NativeWind 4 — sibling combinator
G "[wh]-30"                  "\b[wh]-30\b"     # Tailwind 3 has no 30 key; never resolved

# ── no-white-on-accent ── REPORT ONLY. Proximity is not nesting: measured, the ±4-line form
# returns 5 hits of which 4 are correct code, catches the paywall CTA only by accident via the
# spinner, and NEVER catches the astrology CTA (inline-ternary fill + bare `color:'white'`).
echo "── no-white-on-accent (REPORT ONLY — review each hit, never auto-fail) ──"
# 🔴 PATTERN WIDENED IN PASS 1a (2026-07-30), because 1a BLINDED THE ORIGINAL.
#    The authored inline half matched only raw hex — `backgroundColor:[^,;]*#(F59E0B|92722D)`.
#    Pass 1a rewrites those literals to `t.color.accent`, which matches NEITHER that hex pattern
#    NOR `\bbg-accent\b` (there is no `bg-` prefix on an inline style). Measured: astrology/index.tsx
#    went from 1 reported hit to 0 the moment 1a ran — not because it was fixed, but because the
#    rule stopped being able to see it. The same erosion applies to the foreground half:
#    `color: 'white'` becomes `color: t.color.fg`.
#    🔴 SO THE RULE MUST TRACK THE MIGRATION, or it silently reports "clean" as the codemod proceeds.
#    Both halves now match the legacy AND the token spelling.
# 🔴 TIGHTENED IN PASS 1b (2026-07-31) — A WASH IS NOT A FILL, and treating it as one made
#    this rule OVER-FIND, which §3.0.2.0 names as the more insidious failure direction.
#    1b introduces `t.alpha(t.color.accent, 15)` for the 72 coloured-alpha rgba sites. The
#    previous `backgroundColor:[^,;]*t\.color\.accent` matched those too, because there is no
#    comma between `backgroundColor:` and `t.color.accent` inside `t.alpha(...)`.
#    Measured: that produced exactly the 3 candidates 1a reported for 1b triage —
#    readings/combined.tsx, StrengthsList.tsx, DestinyCard.tsx — and ALL THREE ARE FALSE
#    POSITIVES: their ground is a 15% accent WASH (or plain `bg-surface`) and the accent is a
#    `borderLeftColor`, not a fill. Text on a wash inherits its GROUND's ratio (design §16.7),
#    so `fg` is legal there. `(?<!alpha\()` is unavailable in ERE, so the alpha( form is
#    excluded by requiring no `(` between `backgroundColor:` and the token.
grep -rEn -C4 $INC "\bbg-(gold|accent|warning|success|danger)\b|backgroundColor:[^,;(]*(#(F59E0B|92722D)|\bt\.color\.(accent|warning|success|danger)\b|\bt\.color\[[\"'](accent|warning|success|danger)[\"']\])" $SRC 2>/dev/null \
  | grep -E "\btext-white\b|\btext-fg\b|[Cc]olor[:=][[:space:]]*[\"']?(white|#FFF|#FFFFFF)\b|[Cc]olor[:=][[:space:]]*\{?[[:space:]]*t\.color\.fg\b|[Cc]olor[:=][[:space:]]*\{?[[:space:]]*t\.color\[[\"']fg[\"']\]" || true
# ALLOW-LIST — contrast already correct, so do NOT re-resolve the role. 🔴 But they are NOT
# token-correct: all four are `text-black`, and `black` is in the 565-name retired ledger, so
# it STOPS RESOLVING once the defaults are deleted at S1 and no-legacy-tokens WILL fail on
# them. Pass 1 RENAMES them to `on-accent` and changes nothing else (P20 / §1.6b V-7).
# 🔴 THE SET WAS FOUR AND IS NOW THREE, AND home.tsx:305 WAS NEVER ONE OF THEM (corrected in
#   pass 0, §1.6b (a)). The fourth entry named PremiumBadge, which the primitives phase DELETED
#   as dead (audit Q12, owner ruling R-C, 2026-08-03) — so O-22's subject no longer exists and
#   O-22 is retired by removal rather than by being resolved. Recorded here rather than silently
#   dropped, because a shrinking allow-list looks identical to a forgotten one.
#   (paywall)/index.tsx · WeeklyDayCard.tsx · compatibility/index.tsx
# home.tsx:305 is a PROXIMITY FALSE POSITIVE: :305's bg-gold circle holds only an emoji (:306),
# and the text-white this grep pairs it with is a SIBLING at :309, outside the circle. It carries
# no text-black, so there is nothing to rename. Proximity is not nesting. Do NOT "fix" its contrast.
#
# KNOWN VIOLATIONS to drive out (1b): (paywall)/index.tsx CTA label + spinner ·
#   astrology/index.tsx CTA ×4 · 🆕 astrology/index.tsx styles.unlockButton/unlockButtonText
#
# 🔴 WHY THIS RULE CAN NEVER BECOME A FAILURE CONDITION — the set it cannot see is NON-EMPTY
#    AND KNOWN. astrology/index.tsx's StyleSheet holds `unlockButton {backgroundColor:'#F59E0B'}`
#    and `unlockButtonText {color:'white'}` FOUR PROPERTIES APART, in different style objects,
#    joined only at the JSX call site — and `unlockButtonText` names no accent, so NO proximity
#    window of any size pairs them. Measured 2026-07-30. Keep this rule REPORT-ONLY forever.

# (rule 5 removed — banning bare <Text style={{…}}> would force qa.tsx and cosmic-report.tsx
#  through txt(), which is the structural rewrite we deliberately excluded. Also redundant with
#  no-numeric-fontsize and blind to <Text style={styles.x}>.) ^ retained so nobody re-adds it.

echo
# ── 🔴 GATE_STRICT IS DEFAULT-ON FROM PASS 5 (§3.7's deliverable / §4.6 item 2) ─────────────────
#
# Until pass 5 this script exited nonzero BY DESIGN — counting the ~4,220 sites still to migrate was
# its whole job, so blocking on it would have failed every push for the duration of the revamp.
# That is over: every decreasing counter has either reached 0 or become a NAMED, PRINTED, SCOPED
# residue, so a nonzero `fail` now means a genuine regression and the gate has earned the right to
# block. Set `GATE_LENIENT=1` for a deliberate, single-invocation escape that LEAVES A TRACE ON THE
# COMMAND LINE — unlike `git push --no-verify`, which leaves none. That is the point of having it.
#
# 🟢 THE `pending` CATEGORY IS EMPTY AND ITS COUNTER IS GONE (pass 3b). Every decreasing counter in
#    this file now either reads 0 or is a NAMED, PRINTED, SCOPED residue with a stated reason. There
#    is no longer any class of finding this script reports without blocking on — except the FIVE
#    rules that are report-only BY RULING (no-white-on-accent, no-variable-fontsize, the className
#    lighter-than-ramp half of family-arrival, alpha-callsites' non-literal first arg, and
#    no-offramp-fontsize-class as of the funnel phase's screen 2), each of which says so at its own
#    site. See the deleted-GP() block near the top for the full reasoning.
#
# ══════════════════════════════════════════════════════════════════════════════════════════════════
# 🔴 `O-105` — THE PARAGRAPH ABOVE WAS TRUE OF RULES AND FALSE OF NUMBERS, AND THAT IS THE WHOLE
#    FINDING. Owner-ruled 2026-08-04, after the third instance of the same shape:
#
#      · `no-white-on-accent` reported for a whole phase and could not fail — known, ruled.
#      · the `A5 pair` class was documented in CLAUDE.md as unenforceable, produced NINE live AA
#        failures, and only stopped when the 21st rule was written to BLOCK on it.
#      · 🔴 `S "excepted: DERIVED"` printed `3` beside X11's and X12's coupled radii — two
#        PRESERVE-BLINDLY rows — and never touched `fail`. It was believed to be their check.
#
#    **THE QUESTION IS NEVER "IS THERE A CHECK?" — IT IS "DOES IT FAIL?"** A rule that reports but
#    cannot fail is not a control, and the register above enumerated report-only RULES while ~23
#    report-only NUMBERS printed in the identical `· label  count` shape beside them. In terminal
#    output and in a commit body an `S()` line and a `G()` line are indistinguishable.
#
# 🟢 WHAT CHANGED: `SA()` exists, and the six sub-counts that are INVARIANTS OR SHRINKING RESIDUES
#    now assert — `excepted: SHAPE` exact 4 · `excepted: DERIVED` exact 3 · `excepted: ABOVE-CEILING`
#    exact 6 · `excepted: GLYPH` max 35 · both `excepted: BirthChartWheel` residues capped, which
#    mattered most of all because `live = all − wheel`, so wheel growth LOWERED a blocking number.
#
# ⬜ THE FULL SWEEP OF WHAT REMAINS REPORT-ONLY, WITH A NAMED REASON EACH. Nothing in this file
#    prints a number that is not on one of these two lists.
#
#    RULES (5) — unchanged, each ruled, each says so at its own site:
#      1 no-white-on-accent          proximity is not nesting; the set it cannot see is non-empty
#                                    AND KNOWN. The A5 pair rule blocks on the resolvable half.
#      2 no-variable-fontsize        `fontSize: <expr>` is a legitimate idiom; a WATCHLIST, not a debt
#      3 family-arrival, className   19 sites name a lighter family deliberately; exact would cry wolf
#        rank half
#      4 alpha-callsites, non-       a non-literal first argument cannot be invoked from a scanner
#        literal first arg
#      5 no-offramp-fontsize-class   reaching 0 needs RULINGS on numerals belonging to screens this
#                                    phase does not open; a rule that cannot reach 0 is a lockout
#
#    NUMBERS (still `S()`, and each is a WATCHLIST rather than a contract):
#      · `· HTML entities`, `(raw, incl. excepted)` ×3, `· colon form`, `· JSX-prop form`
#        — ARITHMETIC on a total that ALREADY BLOCKS at 0. Asserting them would duplicate the
#          parent, and a duplicate assertion is a second thing to update, not a second control.
#      · the five `no-legacy-radii` dead-spelling sub-counts
#        — same: the parent `dead-spellings` blocks at 0, so all five are pinned to 0 by it.
#      · `rounded-xl` / `rounded-lg` (C-k)
#        — LEGAL IN BOTH SCALES with different values, so any assertion fails on correct code. This
#          is the rule that has no gate form BY CONSTRUCTION; pass 3b rewrote all 49 by hand.
#      · `rounded-sm` / `rounded-md` / `rounded-pill` (the new-scale census)
#        — a DISCOVERY census whose only contract is "a 0 must be a recorded decision". It moves
#          with every correct restyle; `exact` here is the cry-wolf shape `O-67` warns against.
#      · `· fontStyle decls`
#        — a companion watchlist for a spelling that does not exist yet (the upright value). Its
#          contract is "read it", and there is nothing to pin until the class is non-empty.
#      · `· marked GLYPH`
#        — deliberately 0: marking the six true pictographs means rewriting six className string
#          literals into brace expressions to carry a comment, i.e. a structural edit to move a
#          report-only counter. The classification lives in this file's enumeration instead.
# ══════════════════════════════════════════════════════════════════════════════════════════════════
#
# 🔴 IT WAS BRIEFLY SEVEN, AND BOTH ADDITIONS ARE NOW GONE — THE WHOLE EPISODE IS THE LESSON.
#    `O-91` found that family-arrival-check.js printed "113 checked" while silently failing to parse
#    15 of 128 inline sites. The first response was to PUBLISH the shortfall as two report-only
#    counters and argue in the module that it could not be fixed without a parser.
#    ⚠️ That was wrong twice over. It went stale within one commit (added here only afterwards,
#    which is exactly the failure this paragraph warns about), and — worse — IT MOVED A REAL DEFECT
#    INTO A NUMBER NOBODY BLOCKS ON. `O-67` says a printed count is not a checked count; publishing
#    a coverage shortfall is the same half-measure one level up, because the gate still passes while
#    coverage rots.
# 🟢 IT NEEDED NO PARSER — one line, "a quoted string must close on its own line". Unparsed went
#    4 -> 0, four real pairings became visible, and the shortfall is now an ASSERTION that blocks.
#    So both counters were deleted rather than kept, and the register is five again.
#    🔴 THE STANDING RULE: BEFORE ADDING A REPORT-ONLY COUNTER, ASK WHETHER THE THING IT MEASURES IS
#       ACTUALLY UNFIXABLE. Report-only is for a finding a rule DECLINES to block on, never for a
#       gate's own blind spot — a blind spot is a bug in the gate, and bugs get fixed.
#    🔴 THE LIST IS MAINTAINED FOR ONE REASON: "a printed count is not a checked count" (O-67), so a
#    number this script prints WITHOUT asserting has to be enumerable here. Adding a report-only
#    rule and not adding it to this line makes the exemption list itself the stale register.
if [ $fail -eq 0 ]; then
  echo 'token gate: clean'
  exit 0
fi
echo 'token gate: FAIL — a rule is over its floor. This BLOCKS from pass 5 onward.'
if [ -n "${GATE_LENIENT:-}" ]; then
  echo 'token gate: GATE_LENIENT is set — reporting instead of blocking. Say why in the commit body.' >&2
  exit 0
fi
exit 1
