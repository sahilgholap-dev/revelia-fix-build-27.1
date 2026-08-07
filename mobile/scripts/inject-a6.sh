#!/usr/bin/env bash
# inject-a6.sh — the both-directions validation for the 24th named rule (`A6 gradient · span x label`)
# and for `O-105`'s six `SA()` conversions. Run from mobile/ on a CLEAN tree.
#
# 🔴 IT READS THE REASON, NOT THE EXIT CODE. Every case names the exact string the finding must
#    print, and `ih_case` refuses the case outright if that string already matches the GREEN baseline
#    (harness guard 2). A pattern that cannot distinguish the injected state from the baseline is not
#    an assertion — see `scripts/lib/inject-harness.sh`'s header for the six defects that taught it.
#
# ── 🔴 NO CASE IN THIS FILE SCOPES ITS INJECTION BY LINE NUMBER, AND THAT RULE WAS PAID FOR ────
#
# Four cases used `if $. == <line>` to handle multiplicity (harness defect 4: an unscoped `perl -pi`
# replaces EVERY match, so a census moves by 2 where the case expected 1). 🔴 THEN THE BUTTON PRESS
# ITEM ADDED COMMENTS TO `Button.tsx`, EVERY LINE BELOW THEM MOVED, AND CASE 14 SILENTLY STOPPED
# INJECTING ANYTHING — reported INVALID by guard 3, which is the only reason it was not a false pass.
# **A line-scoped injection is a line-numbered allow-list, and `primitives-plan` §0.1 already ruled
# on those: they rot.** Every scope here is now a CONTEXT — a string unique enough to identify the one
# site, or an insertion anchored to a unique line. It costs nothing and it cannot drift.
#
# ⚠️ AND A CASE CAN OUTLIVE ITS SUBJECT: case 26 tested a mechanism that item 3 DELETED, and reported
#    MISSED against a gate behaving correctly. See its stub below — a validation case is a claim about
#    a mechanism, so a deleted mechanism leaves a stale claim, not a regression.
#
# ── 🔴 A CASE'S ANCHOR AND ITS EXPECTATION BOTH ROT, AND TWELVE DID SO IN ONE SESSION ──────────
#
# The items-4-to-8 run returned 52 correct / 12 incorrect and ELEVEN of the twelve were this file's
# fault, in three distinct shapes. Recorded because the shapes recur and each has a cheap rule:
#
#  1 THE ANCHOR IS REFACTORED AWAY. Item 8 routed `SunSignReveal`'s hand-rolled success animation
#    through a hook, so three cases' target strings stopped existing. Guard 3 caught all three
#    ("the injection changed NOTHING") — LOUD, which is the safe direction. 🔴 A CONTEXT SCOPE ROTS
#    TOO; it just rots audibly, where a LINE scope rots silently (`O-108`).
#  2 A COUNT IN AN EXPECTATION IS A COUPLING. Three escapes asserted `74 pairs measured` and the
#    A6 population legitimately moved. ⚠️ Prefer a pattern that names the FINDING, not a total —
#    `motion arrival clean` survives a population change; `74 pairs` does not.
#  3 🔴 THE GATE PRINTS A REGEX **SOURCE**, SO ITS BACKSLASHES ARE IN THE OUTPUT. Five cases expected
#    `useAmbient\(0.5, 1\)` and the line reads `/useAmbient\(0\.5, 1\)/ is GONE.` — the escapes are
#    literal text. Match the NAME and `is GONE`, never the escaped argument list.
set -uo pipefail
source scripts/lib/inject-harness.sh

A6()  { node scripts/primitive-adoption-check.js; }
SAG() { bash scripts/token-gate.sh; }

ih_require_clean
echo
echo "── A6 · the CATCH direction ─────────────────────────────────────────────────────────────"

# 1 · the P77 defect itself, restored. The whole rule exists for this one.
ih_case "1 · P77 restored — Button's floor back to 70" A6 \
  components/ui/Button.tsx \
  's/t\.alpha\(t\.color\.accent, 80\)/t.alpha(t.color.accent, 70)/' \
  fail 'A6 SPAN.*Button|worst   3\.85:1'

# 2 · P77's second instance, restored.
ih_case "2 · the consent CTA's floor back to 60" A6 \
  components/common/BiometricConsent.tsx \
  's/t\.alpha\(t\.color\.accent, 80\)/t.alpha(t.color.accent, 60)/' \
  fail 'worst   3\.57:1'

# 3 · the DECLARATION deleted. This is the case that would have hidden P77 entirely.
ih_case "3 · Button's GRADIENT-FG marker deleted" A6 \
  components/ui/Button.tsx \
  's/GRADIENT-FG\(on-accent\)/the on-fill role/' \
  fail 'A6 SILENT.*Button\.tsx'

# 4 · a WRONG declared role. A marker must not be able to pass by being present.
ih_case "4 · Button declares the plain foreground instead" A6 \
  components/ui/Button.tsx \
  's/GRADIENT-FG\(on-accent\)/GRADIENT-FG(fg)/' \
  fail 'GRADIENT-FG\(fg\)'

# 5 · the page ground under the weakest reading role, pushed over.
ih_case "5 · DEFAULT_GRADIENT's tint raised to 25%" A6 \
  components/ui/ScreenContainer.tsx \
  's/t\.alpha\(t\.color\.accent, 10\)/t.alpha(t.color.accent, 25)/' \
  fail 'A6 SPAN.*ScreenContainer'

# 6 · the worst pairing in the item, restored — and it is only visible with the veil COMPOSED.
ih_case "6 · numerology's CTA label back to the plain role" A6 \
  "app/(main)/numerology/index.tsx" \
  's/text-on-accent font-body-semi/text-fg font-body-semi/' \
  fail 'worst   1\.93:1'

# 7 · the RE-GROUNDING logic, from the other side: make GrowthCard's inner fill translucent and the
#     ring becomes a real ground for text that was legitimately exempt.
ih_case "7 · GrowthCard's opaque inner fill made translucent" A6 \
  components/readings/GrowthCard.tsx \
  's/bg-surface rounded-lg p-5/bg-surface\/50 rounded-lg p-5/' \
  fail 'A6 SPAN.*GrowthCard'

# 8 · the header wash back to 30%.
ih_case "8 · ArchetypeHeader's wash back to 30%" A6 \
  components/readings/ArchetypeHeader.tsx \
  's/t\.alpha\(t\.color\.accent, 10\)/t.alpha(t.color.accent, 30)/' \
  fail 'worst   3\.19:1|worst   4\.34:1'

# 9 · the trait chip's veil back to 20% — three stacked layers, and only composing sees it.
ih_case "9 · SunSignReveal's chip veil back to 20%" A6 \
  components/profile/SunSignReveal.tsx \
  's/bg-accent\/10 border/bg-accent\/20 border/' \
  fail 'worst   3\.85:1'

# 10 · `O-91` — PARSED MUST EQUAL PRESENT. An unreadable stop list must BLOCK, never skip.
ih_case "10 · Button's stop list replaced by an unresolvable identifier" A6 \
  components/ui/Button.tsx \
  's/colors=\{\[t\.color\.accent, t\.alpha\(t\.color\.accent, 90\), t\.alpha\(t\.color\.accent, 80\)\]\}/colors={SOME_RAMP}/' \
  fail 'A6 UNPARSED.*Button'

# 11 · the `O-103` shape re-introduced: an opaque ground stop back ON the stop list.
ih_case "11 · ErrorBoundary's opaque ground back onto the stop list" A6 \
  components/common/ErrorBoundary.tsx \
  's/colors=\{\[t\.alpha\(t\.color\.accent, 0\), t\.alpha\(t\.color\.accent, 10\)\]\}/colors={[t.color.bg, t.alpha(t.color.accent, 10)]}/' \
  fail 'worst   3\.35:1|worst   3\.23:1'

# 12 · 🔴 THE RESOLVER FLOOR — AND THE FIRST DRAFT OF THIS CASE WAS ILL-POSED, WHICH IS ITSELF THE
#      lesson. It renamed ONE element in ONE file and expected the floor to fire. But one gradient
#      vanishing is not the resolver going blind — it is a source edit, and one that would not
#      compile. The floor guards a different failure: the SIX-STAGE WALK breaking, which returns zero
#      pairs and prints as a pass. So the injection goes into the WALK, where that defect would live.
#      ⚠️ AND ITS EXPECTATION MOVED ONCE MORE, FOR A REASON WORTH KEEPING: breaking the walk's name
#         list does NOT reach zero pairs, because the aliases in that list still resolve one gradient.
#         What it DOES do is desynchronise the walked count from the present count — which is exactly
#         what the population assertion is for, and what the FLOOR alone could never have seen.
# 🔴 AND A `#` LINE INSIDE A BACKSLASH CONTINUATION IS NOT A COMMENT. The first draft of this note sat
#    between two continued lines and bash passed it as an ARGUMENT — the harness died at case 12 with
#    "$4: unbound variable" and the whole run stopped, 11 cases in. A crash is the loud failure mode,
#    but it still cost a 25-minute run: every comment in this file belongs ABOVE its `ih_case`.
ih_case "12 · the resolver blinded — the walk's element name broken" A6 \
  scripts/primitive-adoption-check.js \
  "s/const gradNames = \['LinearGradient'/const gradNames = ['LinearGradientZ'/" \
  fail 'population · walked +1 +of 25 present'

echo
echo "── A6 · the ESCAPE direction — a legal edit must NOT be flagged ──────────────────────────"

# E1 · a legal move WITHIN the clamped range.
ih_escape "E1 · Button's mid stop 90 -> 95" A6 \
  components/ui/Button.tsx \
  's/t\.alpha\(t\.color\.accent, 90\)/t.alpha(t.color.accent, 95)/' \
  '73 pairs measured, 0 violating'

# E2 · a legal reduction of a wash.
ih_escape "E2 · ArchetypeHeader's wash 10% -> 5%" A6 \
  components/readings/ArchetypeHeader.tsx \
  's/t\.alpha\(t\.color\.accent, 10\), t\.alpha\(t\.color\.accent, 0\)/t.alpha(t.color.accent, 5), t.alpha(t.color.accent, 0)/' \
  '73 pairs measured, 0 violating'

# E3 · a NEW opaque accent surface with the legal label. Adding a correct gradient must be free.
ih_escape "E3 · a new flat accent gradient with the on-fill label" A6 \
  components/readings/GrowthCard.tsx \
  's|<Text className="text-fg text-lg font-body-semi">\{title\}</Text>|<LinearGradient colors={[t.color.accent, t.color.accent]}><Text className="text-on-accent text-lg font-body-semi">{title}</Text></LinearGradient>|' \
  '74 pairs measured, 0 violating'

echo
echo "── O-105 · the six SA() conversions ──────────────────────────────────────────────────────"
echo "   ⚠️ each case runs the WHOLE gate twice (baseline + injected), so this half is slow."

# 13 · 🔴 THE CASE THE WHOLE `O-105` SWEEP EXISTS FOR. X11's coupled radius, unmarked.
ih_case "13 · one /* DERIVED */ marker deleted (X11)" SAG \
  components/engagement/StreakBadge.tsx \
  's/ \/\* DERIVED \*\///' \
  fail 'excepted: DERIVED +2 +\(exact 3\)'

# 14 · the other direction on an exact set — a new unaudited member.
ih_case "14 · a fifth /* SHAPE */ marker added" SAG \
  components/ui/Button.tsx \
  "s/^const CENTRE = /const _SHAPE_PROBE = { borderRadius: 1 \/* SHAPE *\/ };\nconst CENTRE = /" \
  fail 'excepted: SHAPE +5 +\(exact 4\)'

# 15 · `exact` on the ABOVE-CEILING set. Reclassifying a GLYPH into it must fail.
ih_case "15 · a GLYPH re-marked ABOVE-CEILING" SAG \
  components/common/BiometricConsent.tsx \
  's/fontSize: 40 \/\* GLYPH \*\//fontSize: 40 \/* ABOVE-CEILING *\//' \
  fail 'excepted: ABOVE-CEILING +7 +\(exact 6\)'

# 16 · the `max` on GLYPH — a RISE must fail.
ih_case "16 · an ABOVE-CEILING re-marked GLYPH" SAG \
  "app/(auth)/verify-email.tsx" \
  's/\/\* ABOVE-CEILING \*\//\/* GLYPH *\//' \
  fail 'excepted: GLYPH +36 +\(max 35\)'

# 17 · 🔴 THE SILENT-LOWERING CASE, AND IT IS THE ONE WITH NO OTHER WITNESS. Adding a raw literal
#      to the excepted file raises BOTH `all` and `wheel`, so `live = all - wheel` never moves and
#      `hex` still prints 0. The residue assertion is the only thing that can see it.
ih_case "17 · a raw literal added inside the excepted file" SAG \
  components/astrology/BirthChartWheel.tsx \
  "s/Conjunction: '#F59E0B',/Conjunction: '#F59E0B', Trine2: '#123456',/" \
  fail 'excepted: BirthChartWheel +12 +\(max 11.*RESIDUE GREW'

# E4 · 🔴 THE ESCAPE THAT PROVES `max` WAS THE RIGHT SHAPE. A GLYPH site correctly migrated off a
#      raw literal SHRINKS the excepted set, and a shrink must be free — an `exact` here would fail
#      the very pass that fixes it, which is how a rule gets decommissioned.
# ⚠️ THE FIRST DRAFT MIGRATED THE GLYPH ONTO A DISPLAY STEP AND THE GATE CORRECTLY FAILED — a
#    pictograph's size is a DIMENSION, and the ramp's top step is not a legal target for one. That is
#    the entire content of the GLYPH exception, so the edit was not legal and the case was ill-posed.
#    The genuinely legal shrink is a DELETION: a site that stops declaring a glyph size at all.
ih_escape "E4 · a GLYPH declaration deleted (35 -> 34)" SAG \
  components/common/BiometricConsent.tsx \
  's/fontSize: 40 \/\* GLYPH \*\/,//' \
  'token gate: clean'

echo
echo "── the 25th rule · motion-arrival, BOTH directions ───────────────────────────────────────"

MOT() { node scripts/motion-arrival-check.js; }

# 18 · a raw duration, which is the class the whole gate exists for.
ih_case "18 · a raw duration re-introduced" MOT \
  components/capture/FaceGuideOverlay.tsx \
  's/duration: dur\.base, easing: curve\.standard \}, \(\) => \{/duration: 250 }, () => {/' \
  fail 'raw duration +1 +expected 0'

# 19 · an easing written at a site — the boundary, from the outside.
ih_case "19 · an inline easing at a call site" MOT \
  components/readings/ScoreCard.tsx \
  "s/import Animated from 'react-native-reanimated';/import Animated, { Easing } from 'react-native-reanimated';\nconst X = Easing.quad;/" \
  fail 'inline easing +1 +expected 0'

# 20 · 🔴 THE BOUNDARY FROM THE INSIDE — the half that is easy to forget. Empty the protected side
#      and "0 inline easing" becomes a rule guarding nothing.
# ⚠️ THE FIRST DRAFT REPLACED ONLY `Easing.bezier` AND THE FLOOR CORRECTLY DID NOT FIRE — the linear
#    curve still resolved, so the protected side was not EMPTY. It is a FLOOR, not an exact count.
ih_case "20 · the motion module stops resolving curves" MOT \
  lib/motion.ts \
  's/Easing\./EasingX./g' \
  fail 'RESOLVES NO CURVES AT ALL'

# 21 · a LAYOUT property animated — the class this gate found three live instances of.
# ⚠️ THE WORKLET LIVES IN `useFill`, NOT AT THE CALL SITE — which is the whole point of the hook. The
#    first draft injected into `ScoreCard` and correctly reported INVALID (the injection changed nothing).
ih_case "21 · the fill worklet back to animating width" MOT \
  lib/motion.ts \
  's/transform: \[\{ scaleX: p\.value \}\]/width: `${p.value * 100}%`/' \
  fail 'layout property animated +1 +expected 0'

# 22 · a spring.
# ⚠️ SCOPED TO ONE LINE, because the reveal sets TWO shared values with the identical call and an
#    unscoped perl moved the count by 2 — `inject-harness.sh` defect 4's class, and it was caught by
#    the EXACT expectation rather than by reading the exit code, which was 1 either way.
# ⚠️ RETARGETED TWICE, AND BOTH TIMES BY THE SAME MECHANISM: item 8 routed `SunSignReveal`'s success
#    animation through `useSuccessEntrance`, so that file now contains no `withTiming` at all. The
#    timing lives in the module, which is where a re-introduced spring would land too.
ih_case "22 · a spring re-introduced" MOT \
  lib/motion.ts \
  's/progress\.value = withTiming\(1, \{ duration: dur\.slow, easing: curve\.enter \}\);/progress.value = withSpring(1);/' \
  fail 'spring +1 +expected 0'

# 23 · the legacy JS-thread API.
ih_case "23 · the legacy Animated API re-introduced" MOT \
  components/profile/SunSignReveal.tsx \
  "s/const revealStyle = useSuccessEntrance\(visible\);/const legacy = new Animated.Value(0); const revealStyle = useSuccessEntrance(visible);/" \
  fail 'legacy Animated API +1 +expected 0'

# 24 · 🔴 THE MARKER SET IS EXACT IN BOTH DIRECTIONS. A new SNAP marker is a new unaudited member.
ih_case "24 · a third SNAP marker added" MOT \
  components/readings/ScoreCard.tsx \
  "s/const \{ style: animatedStyle \} = useFill/const Z = { duration: 0 \/* SNAP *\/ };\n  const { style: animatedStyle } = useFill/" \
  fail 'excepted: SNAP +3 +\(exact 2\)'

# 25 · and a TIMELINE marker REMOVED — the direction that matters most, because it is the one a
#      "normalise the magic numbers" pass would take, and it lands on the 0.97 asymptote.
ih_case "25 · a TIMELINE marker stripped from the asymptote" MOT \
  components/readings/GeneratingReading.tsx \
  's/duration: 60_000 \/\* TIMELINE \*\//duration: 60_000/' \
  fail 'excepted: TIMELINE +3 +\(exact 4\)'

# 26 · ⬜ DELETED, AND THE DELETION IS THE RECORD. It read:
#        "a PENDING census row that arrives must be converted, not silently accepted (R-3)"
#      🔴 THE MECHANISM IT TESTED NO LONGER EXISTS. Motion item 3 — the button press — is the item
#      three of those PENDING rows named as their debtor, and when it landed the rows STILL read 0,
#      because the tokens are consumed by `usePress` INSIDE the motion module and a token reached
#      through a live hook is not a dead token. The debtors could never be discharged, so the markers
#      were permanently-pending counters and the census was re-scoped tree-wide with the helper rule
#      as its companion (see that rule's header for the three-way partition).
#      ⚠️ AND THE CASE OUTLIVED ITS SUBJECT BY ONE RUN, WHICH IS R-3's OWN SHAPE ONE LEVEL DOWN: it
#         reported MISSED against a gate that was behaving correctly. A validation case is a claim
#         about a mechanism, so when the mechanism is deleted the case is a stale claim, not a
#         regression. Cases 35 and E8 cover the census's new shape from both directions.

# 27 · 🔴 A HELPER WITH NO CALLERS. Three were written for this module and deleted for this reason.
ih_case "27 · an exported helper with zero call sites" MOT \
  lib/motion.ts \
  "s/export function useAmbient/export const usePressUnused = () => 0;\nexport function useAmbient/" \
  fail 'IS EXPORTED AND NEVER CALLED'

echo
echo "── motion-arrival · the ESCAPE direction ─────────────────────────────────────────────────"

# E5 · a legal retiming ONTO a token must be free.
ih_escape "E5 · a cross-fade retimed onto another legal token" MOT \
  components/capture/FaceGuideOverlay.tsx \
  's/duration: dur\.base, easing: curve\.standard \}, \(\) => \{/duration: dur.moderate, easing: curve.standard }, () => {/' \
  'motion arrival                     clean'

# E6 · a NEW animation written correctly must be free. The over-finding direction is the one that
#      decommissions a rule, and a gate that fights correct new motion will be turned off.
ih_escape "E6 · a new, correctly-tokenised animation added" MOT \
  components/readings/ScoreCard.tsx \
  "s/const \{ style: animatedStyle \} = useFill/const extra = { duration: dur.slow, easing: curve.enter };\n  const { style: animatedStyle } = useFill/" \
  'motion arrival                     clean'

echo
echo "── motion item 2 · the screen-content entrance ───────────────────────────────────────────"
echo "   ⚠️ three of these four run the adoption check, which is where the entrance is contracted."
# 🔴 EVERY EXPECTATION HERE CARRIES ITS COUNT (`… 0, expected 1`) AND NOT JUST THE LITERAL'S NAME, AND
#    THAT IS GUARD 2 EARNING ITS KEEP RATHER THAN A STYLE PREFERENCE. `primitive-adoption-check.js`
#    PRINTS every contracted literal on every run, green or red, so a pattern matching only the name
#    matches the healthy baseline too — and the harness correctly refused two such cases as INVALID
#    on the first attempt. `O-67` inside the harness: a pattern that cannot distinguish the injected
#    state from the baseline is not an assertion, no matter how specific the string looks.

# 28 · 🔴 THE ENTRANCE DELETED FROM THE JSX WHILE THE CONST SURVIVES. The app renders exactly as it
#      does today minus the entrance — no error, no warning, and nothing else in the tree can see it.
ih_case "28 · the animated safe area reverted to the plain element" A6 \
  components/ui/ScreenContainer.tsx \
  's/<AnimatedSafeAreaView/<SafeAreaView/; s/<\/AnimatedSafeAreaView>/<\/SafeAreaView>/' \
  fail 'literal <AnimatedSafeAreaView +0, expected 1'

# 29 · the hook call removed — the style could be present with nothing driving it.
ih_case "29 · the useEntrance call removed" A6 \
  components/ui/ScreenContainer.tsx \
  's/const entrance = useEntrance\(\)/const entrance = undefined/' \
  fail 'literal const entrance = useEntrance.* 0, expected 1'

# 30 · 🔴 THE REFACTOR THIS ITEM WAS DESIGNED AROUND: "simplify" the no-new-node mechanism away. On
#      Android it renders identically; on the six auth screens it silently un-centres the funnel.
ih_case "30 · the no-new-node mechanism simplified away" A6 \
  components/ui/ScreenContainer.tsx \
  's/const AnimatedSafeAreaView = Animated\.createAnimatedComponent\(SafeAreaView\);/const AnimatedSafeAreaView = SafeAreaView;/' \
  fail 'literal const AnimatedSafeAreaView = Animated.* 0, expected 1'

# 31 · 🔴 X1's ANCHOR, WHICH THE ENTRANCE EDIT SITS DIRECTLY ON TOP OF. Reformatting the safe area's
#      style object is the most likely accidental casualty of this item, so it gets its own case.
IRC() { node scripts/invariant-register-check.js; }
ih_case "31 · the safe area's X1 floor reformatted away" IRC \
  components/ui/ScreenContainer.tsx \
  "s/\{ flex: 1, width: '100%', minHeight: SCREEN_HEIGHT \}/{ flex: 1, width: '100%', minHeight: SCREEN_HEIGHT, }/" \
  fail 'minHeight: SCREEN_HEIGHT .* 0, expected 1'

# E7 · 🔴 RETIMING THE ENTRANCE ONTO ANOTHER LEGAL TOKEN MUST BE FREE. This is the edit a designer
#      will actually ask for, and a gate that fights it is a gate that gets turned off.
ih_escape "E7 · the entrance retimed onto another legal token" MOT \
  lib/motion.ts \
  's/const fade = \(\) => withTiming\(1, \{ duration: dur\.moderate/const fade = () => withTiming(1, { duration: dur.base/' \
  'motion arrival                     clean'

echo
echo "── motion item 3 · the button press ──────────────────────────────────────────────────────"

# 32 · 🔴 THE BUILT-IN FADE COMING BACK. The nastiest of the three, because the button STILL DIMS on
#      press — just not by the specified amount or over the specified duration — so nobody files it.
ih_case "32 · activeOpacity restored to the platform fade" A6 \
  components/ui/Button.tsx \
  's/activeOpacity=\{1\}/activeOpacity={0.8}/' \
  fail 'activeOpacity.* is GONE'

# 33 · the handlers removed while the style survives.
ih_case "33 · the press handlers removed" A6 \
  components/ui/Button.tsx \
  's/onPressIn=\{press\.onPressIn\}/onPressIn={undefined}/' \
  fail 'onPressIn.* is GONE'

# 34 · 🔴 X3 — the no-new-node mechanism replaced by a wrapper, which is the refactor this item was
#      designed around and the one Android cannot show you.
ih_case "34 · the animated touchable simplified back to the plain one" A6 \
  components/ui/Button.tsx \
  's/const AnimatedTouchable = Animated\.createAnimatedComponent\(TouchableOpacity\);/const AnimatedTouchable = TouchableOpacity;/' \
  fail 'AnimatedTouchable = Animated.* is GONE'

# 35 · 🔴 THE CENSUS'S THIRD DRAFT, VALIDATED: a token referenced NOWHERE — not even inside the
#      module — must fail. This is what makes tree-wide scoping sound rather than vacuous.
ih_case "35 · a duration token referenced nowhere at all" MOT \
  lib/motion.ts \
  's/duration: dur\.instant/duration: dur.slow/' \
  fail 'dur\.instant +0 +references'

# E8 · 🔴 THE PAIR THAT PROVES DRAFT 3's PARTITION. A token consumed ONLY through a live hook is
#      reachable and must NOT be flagged — that is exactly what refuted the PENDING mechanism.
ih_escape "E8 · a token reached only through a live hook" MOT \
  lib/motion.ts \
  's/duration: dur\.quick, easing: curve\.exit/duration: dur.quick, easing: curve.exit \/* legal *\//' \
  'motion arrival                     clean'

echo
echo "── motion item 4 · the card entrance, the stagger, and R-4 ───────────────────────────────"

# 36 · 🔴 THE COMPOUNDING DEFECT. "Simplify" the opt-in away and 43 cards inherit a 16dp rise, which
#      renders as a slightly larger movement and is invisible to every other instrument.
ih_case "36 · the card entrance made unconditional" A6 \
  components/ui/Card.tsx \
  's/enabled: index !== undefined/enabled: true/' \
  fail 'enabled: index !== undefined.* is GONE'

# 37 · the cap bypassed by doing the arithmetic at the site.
ih_case "37 · the stagger arithmetic inlined, uncapping it" A6 \
  components/ui/Card.tsx \
  's/staggerFor\(index \?\? 0\)/(index ?? 0) * 40/' \
  fail 'staggerFor.* is GONE'

# 38 · 🔴 R-4's REAL PROTECTION: one keyword at one site opts a vestibular-sensitive user back into
#      motion, and nothing else in the tree can see it.
ih_case "38 · the OS reduced-motion default defeated at a call site" MOT \
  lib/motion.ts \
  's/withTiming\(1, \{ duration: dur\.slow, easing: curve\.enter \}\),/withTiming(1, { duration: dur.slow, easing: curve.enter, reduceMotion: ReduceMotion.Never }),/' \
  fail 'reduce-motion defeated +1 +expected 0'

# 39 · the loop's reduced-motion branch removed — the ONE gap the renderer's default cannot cover.
ih_case "39 · the module stops consulting the reduced-motion flag" MOT \
  lib/motion.ts \
  's/const reduced = useReducedMotion\(\);/const reduced = false;/' \
  fail 'NO LONGER CONSULTS THE REDUCED-MOTION FLAG'

# E9 · a new list surface adopting the stagger correctly must be free.
ih_escape "E9 · another list site passing its index" MOT \
  "app/(main)/readings/career-destiny.tsx" \
  's/<Card key=\{i\} index=\{i\} className="mb-3">/<Card key={i} index={i} className="mb-3" testID="x">/' \
  'motion arrival                     clean'

echo
echo "── motion item 5, REVERTED · the tab switch is a CUT ─────────────────────────────────────"
# 🔴 ALL THREE CASES IN THIS BLOCK INVERTED ON 2026-08-06, and the inversion is the record.
#    They used to assert that the scene cross-fade's spec, its interpolator and the second easing
#    family were PRESENT. The owner reverted the transition to a cut on the strength of a device pass
#    (design §5.4's second unmeetable-row box), so the same three subjects are now asserted ABSENT or
#    are gone entirely. ⚠️ A validation case is a claim about a MECHANISM, so a reverted mechanism
#    leaves a stale claim rather than a regression — this file's header already ruled on that at
#    case 26, and these are the second instance.

# 40 · 🔴 THE DOUBLE EXPOSURE, RESTORED. Re-adding the spec is the half-revert that looks harmless
#      and is not: `hasAnimation()` in bottom-tabs 7.16.1 reads the SPEC when no animation name is
#      set, so this alone re-opens the 220ms overlap window with no fade in it to explain the smear.
ih_case "40 · the tab transition spec re-added, re-opening the overlap window" A6   "app/(main)/_layout.tsx"   's/sceneStyle: \{ backgroundColor: t\.color\.bg \},/sceneStyle: { backgroundColor: t.color.bg },\n        transitionSpec: undefined,/'   fail 'transitionSpec.* is BACK'

# 41 · 🔴 THE OTHER HALF, AND IT IS THE ONE THAT ACTUALLY PUTS A SCENE BELOW ALPHA 1. Either preset
#      is illegal here now: the fade one produced the reported ghosting, and the shift one would
#      translate the scene by SCREEN WIDTH against §5.3 rule 3's 8dp cap.
ih_case "41 · the scene interpolator re-added" A6   "app/(main)/_layout.tsx"   's/sceneStyle: \{ backgroundColor: t\.color\.bg \},/sceneStyle: { backgroundColor: t.color.bg },\n        sceneStyleInterpolator: undefined,/'   fail 'sceneStyleInterpolator.* is BACK'

# 42 · 🔴 THE SCENE GROUND DELETED — the second, independent half of the same device report, and the
#      one that made the smear BRIGHT. Without it a tab scene falls back to `useTheme().colors
#      .background`, which expo-router leaves at react-navigation's LIGHT default theme. ⚠️ Today
#      this is INVISIBLE on a device, because nothing puts a scene below alpha 1 — which is exactly
#      why it needs an assertion rather than a screenshot.
ih_case "42 · the tab navigator's scene background deleted" A6   "app/(main)/_layout.tsx"   's/sceneStyle: \{ backgroundColor: t\.color\.bg \},//'   fail 'sceneStyle.* is GONE'

# 42a · 🔴 THE FLOOR THE REVERT MOVED. Removing the tab row dropped the longest container animation
#       from 220 to 200, and every alpha-only entrance in the module is judged against that number.
#       Injecting a fourth container row must fail LOUDLY rather than silently raising the bar.
ih_case "42a · a longer container animation declared, moving the floor" MOT   scripts/motion-arrival-check.js   "s/what: 'the root stack fade', ms: 150,/what: 'the root stack fade', ms: 420,/"   fail 'longest container animation +420'

echo
echo "── motion item 6 · the aura breathe ──────────────────────────────────────────────────────"

# 43 · 🔴 THE RANGE IS THE SPEC. A low end below 0.5 reads as the screen browning out; a high end
#      below 1.0 permanently dims the brightest surface in the app.
ih_case "43 · the breathe's opacity range widened off spec" A6   components/readings/GeneratingReading.tsx   's/useAmbient\(0\.5, 1\)/useAmbient(0.2, 0.8)/'   fail 'useAmbient.* is GONE'

# 44 · DECLARED IS NOT RENDERED, the third time this leg has been needed.
ih_case "44 · the animated aura reverted to a plain gradient" A6   components/readings/GeneratingReading.tsx   's/<AnimatedAura/<LinearGradient/; s/style=\{\[StyleSheet\.absoluteFill, auraStyle\]\}/style={StyleSheet.absoluteFill}/'   fail '<AnimatedAura.* is GONE'

# 45 · 🔴 THE ASYMPTOTE, WHICH THIS ITEM SITS DIRECTLY ON TOP OF. The bar must never claim completion.
ih_case "45 · the 0.97 plateau finished to 1.0" A6   components/readings/GeneratingReading.tsx   's/withTiming\(0\.97/withTiming(1.0/'   fail 'withTiming.* is GONE'

# 46 · X17's message box, which the cross-fade needs and which reads as a magic number.
ih_case "46 · X17's minHeight dropped back to 44" A6   components/readings/GeneratingReading.tsx   's/minHeight: 58/minHeight: 44/'   fail 'minHeight: 58.* is GONE'

# E10 · the breathe retimed onto another legal token must be free (there is only one loop token, so
#       this exercises the curve instead).
ih_escape "E10 · the ambient loop's curve changed to another named one" MOT   lib/motion.ts   's/withTiming\(to, \{ duration: dur\.ambient, easing: curve\.standard \}\)/withTiming(to, { duration: dur.ambient, easing: curve.linear })/'   'motion arrival                     clean'

echo
echo "── motion item 7 · the plate entry ───────────────────────────────────────────────────────"

# 47 · 🔴 THE SEQUENCING DELETED. Both arrive at once, which is the exact thing §18.1 rules against —
#      and on Android it just looks like a slightly busier mount.
ih_case "47 · the plate entrance removed from the primitive" A6   components/ui/Plate.tsx   's/const entrance = usePlateEntrance\(\);/const entrance = undefined;/'   fail 'usePlateEntrance.* is GONE'

# 48 · DECLARED IS NOT RENDERED, the fourth time.
ih_case "48 · the animated Svg root reverted to a plain one" A6   components/ui/Plate.tsx   's/<AnimatedSvg/<Svg/; s/<\/AnimatedSvg>/<\/Svg>/'   fail '<AnimatedSvg.* is GONE'

# 49 · 🔴 §14.4's NO-STRETCH RULE, WHICH THIS ITEM SITS ON TOP OF: the plate's root carries two
#      explicit DIMENSIONS and the standing rule is that a transform is fine and a dimension is not.
ih_case "49 · the plate's aspect-ratio lock removed" A6   components/ui/Plate.tsx   's/preserveAspectRatio="xMidYMid meet"/preserveAspectRatio="none"/'   fail 'preserveAspectRatio.* is GONE'

# E11 · a plate mounting on a NEW declared surface must be free.
ih_escape "E11 · the plate tint changed to another legal token" MOT   components/ui/Plate.tsx   "s/tint = 'fg-muted'/tint = 'fg-secondary'/"   'motion arrival                     clean'

echo
echo "── motion item 8 · success and error ─────────────────────────────────────────────────────"

# 50 · 🔴 THE MESSAGE-VS-BOOLEAN DISTINCTION, which is the whole reason the error hook has no ref
#      guard. `!!error` animates the FIRST failure and swallows every one after it — the exact case a
#      user hits while correcting a form, and the exact case nobody tests.
ih_case "50 · the error entrance keyed on a boolean instead of the message" A6   components/ui/Input.tsx   's/useErrorEntrance\(error\)/useErrorEntrance(error ? "e" : undefined)/'   fail 'useErrorEntrance.* is GONE'

# 51 · the live region removed "because the animation announces it" — it announces nothing to a
#      screen reader, and this is the only signal a non-visual user gets.
ih_case "51 · the error's live region removed" A6   components/ui/Input.tsx   's/accessibilityLiveRegion="polite"/accessibilityLiveRegion="none"/'   fail 'accessibilityLiveRegion.* is GONE'

# 52 · 🔴 §5.3's NO-OVERSHOOT RULE AS A NUMBER. A success scale that passes 1 and settles back IS a
#      bounce, whatever curve produced it — and it reads as "delightful" rather than as a defect.
ih_case "52 · the success scale allowed to overshoot 1" MOT   lib/motion.ts   's/const SUCCESS_SCALE_FROM = 0\.92;/const SUCCESS_SCALE_FROM = 1.08;/'   fail 'success scale from *GONE'

# 53 · the error's 4dp rise inlined, divorcing it from the token file.
#      🔴 THIS CASE WAS STALE AND IS REPAIRED HERE (2026-08-06). It targeted `t.motion.distance / 2`
#      and expected `error rise = half`, both of which `P97` deleted a session earlier: the entrance
#      rose to 12, 4 is not half of 12, and the assertion was rewritten to check the VALUE against
#      `theme.js` instead of the relationship. Guard 3 would have reported INVALID rather than a
#      false pass — which is the safe direction and is exactly why the anchor rot is audible.
ih_case "53 · the error rise inlined as a literal" MOT   lib/motion.ts   's/lift\.value = t\.motion\.errorRise;/lift.value = 4;/'   fail 'error rise = token *GONE'

# E12 · routing a SECOND surface through the success hook must be free.
ih_escape "E12 · the success hook consumed at another site" MOT   components/profile/SunSignReveal.tsx   's/useSuccessEntrance\(visible\)/useSuccessEntrance(visible === true)/'   'motion arrival                     clean'

echo
echo "── the §15 ONE-SHOT DRAW-IN · owner-requested 2026-08-06 ─────────────────────────────────"
# ⚠️ TWO CASES BELOW (61, 63) SCOPE THEIR INJECTION WITH A PERL **STATE FLAG** rather than a line
#    number, and the reason is this file's own rule. Both target an expression that appears TWICE in
#    `lib/motion.ts` — the derived delay, and the memoised focus effect — once in `usePlateEntrance`
#    and once in `useDrawIn`. An unscoped `perl -pi` would hit both (harness defect 4), and a line
#    scope rots silently (`O-108`). A flag armed on a line UNIQUE to the target hook is a CONTEXT
#    scope like every other case here; it just spans more than one line.

# 54 · 🔴 DECLARED IS NOT RENDERED, the FIFTH time this leg has been needed in this phase. The
#      wrapper exists, the hook is called, the JSX is the plain element — the line appears instantly
#      and every other layer reads green.
ih_case "54 · the draw-in's carrier reverted to a plain path element" A6   components/ui/ShapePrimitives.tsx   's/<AnimatedPath/<Path/'   fail 'AnimatedPath.* is GONE'

# 55 · the channel computed and then DROPPED. `tsc` is clean either way, because the prop is optional.
ih_case "55 · the animated channel not attached at the call site" A6   components/ui/ShapePrimitives.tsx   's/animatedProps=\{draw\}//'   fail 'animatedProps=.* is GONE'

# 56 · 🔴 THE UNDRAWN FIRST FRAME. Without the static offset the stroke is fully painted for the
#      frame before reanimated attaches, so the draw reads as a flicker rather than as a draw.
ih_case "56 · the undrawn first frame lost" A6   components/ui/ShapePrimitives.tsx   's/strokeDashoffset=\{len\}//'   fail 'strokeDashoffset=.* is GONE'

# 57 · 🔴 THE ROUNDING DIRECTION. Down is a VISIBLE defect — the dash period falls short of the path,
#      so a stub of the curve stays on screen for the whole wait. Up costs a few ms of nothing.
ih_case "57 · the path length rounded DOWN instead of up" A6   components/ui/ShapePrimitives.tsx   's/return Math\.ceil\(total\);/return Math.floor(total);/'   fail 'Math.*ceil.* is GONE'

# 58 · 🔴 THE HARD BAN, ON THE NEW CARRIER. A react-native-svg node handed a `style` is the cut-3
#      defect exactly: the library clones the style onto a second host node reanimated does not own.
ih_case "58 · a style handed to the svg draw carrier" MOT   components/ui/ShapePrimitives.tsx   's/animatedProps=\{draw\}/animatedProps={draw} style={{}}/'   fail 'IS BEING HANDED A'

# 59 · 🔴 THE HOLE RULE 6a CLOSES, AND THE WORST KEY IN IT. Morphing `d` is a JS-thread path
#      recalculation per frame — §18 bans it BY NAME for low-end Android — and rule 6 could never see
#      it, because rule 6 reads `useAnimatedStyle` and this is the other worklet channel.
ih_case "59 · the draw-in worklet driving path GEOMETRY instead of paint" MOT   lib/motion.ts   's/strokeDashoffset: offset\.value/d: offset.value/'   fail 'non-paint prop animated +1'

# 60 · 🔴 THE MOST LIKELY WELL-MEANT REGRESSION IN THIS FILE. Ambient drift was REQUESTED, then
#      DECLINED by the owner on battery grounds, and the one-shot draw is what replaced it. An
#      absence is the only instrument that can see it come back.
ih_case "60 · a perpetual loop added to the shape primitives" A6   components/ui/ShapePrimitives.tsx   's/const AnimatedPath = Animated\.createAnimatedComponent\(Path\);/const AnimatedPath = Animated.createAnimatedComponent(Path);\nconst drift = (v: number) => withRepeat(v, -1, true);/'   fail 'withRepeat.* is BACK'

# 61 · 🔴 §18.1's ORDERING, ON THE NEW HOOK — and this is the case the widened sequencing check was
#      written for. Dropping the clearance term leaves 300ms, which CLEARS the 200ms container floor,
#      so every other rule stays green while the draw starts while its host is still rising.
ih_case "61 · the draw-in's clearance term deleted, inverting the sequencing" MOT   lib/motion.ts   'if (/const offset = useSharedValue\(length\)/) { $F = 1 } if ($F && s/TRANSITION_CLEARANCE \+ dur\.moderate,/dur.moderate,/) { $F = 0 }'   fail 'useDrawIn. STARTS AT 300ms'

# 62 · 🔴 LEG D's TWO-KEYS BRANCH, WHICH HAD NO VALIDATION CASE AT ALL BEFORE THIS ITEM. A per-mount
#      guard beside focus keying wins on every visit after the first, so the focus keying becomes
#      decorative and the entrance is back to one opportunity per screen for the life of the app.
ih_case "62 · the draw-in gains a per-mount guard beside its focus keying" MOT   lib/motion.ts   's/      offset\.value = length;/      if (played.current) return; played.current = true;\n      offset.value = length;/'   fail 'CARRIES A PER-MOUNT GUARD'

# 63 · 🔴 LEG D's OTHER HALF, ALSO PREVIOUSLY UNVALIDATED, and it is §5.3 rule 2 itself: the focus
#      hook lists its callback in a dependency array, so an un-memoised callback re-subscribes on
#      EVERY RENDER and replays the entrance with it. "A list re-fetch does not re-stagger."
ih_case "63 · the draw-in's focus effect un-memoised" MOT   lib/motion.ts   'if (/const offset = useSharedValue\(length\)/) { $F = 1 } if ($F && s/useCallback\(/(/) { $F = 0 }'   fail 'FOCUS EFFECT IS NOT MEMOISED'

# E13 · the draw retimed onto another legal token must be free.
ih_escape "E13 · the draw-in retimed onto another named duration" MOT   lib/motion.ts   's/withTiming\(0, \{ duration: dur\.slow, easing: curve\.enter \}\)/withTiming(0, { duration: dur.base, easing: curve.enter })/'   'motion arrival                     clean'

# E14 · the divider drawn at the other legal tone must be free — the OVER-finding direction on a
#       primitive whose props are the whole API.
ih_escape "E14 · the arc divider drawn at the weaker tone" A6   components/ui/ShapePrimitives.tsx   "s/tone = 'strong' }: ArcDividerProps/tone = 'subtle' }: ArcDividerProps/"   'RidgeField · adoption'

ih_report
