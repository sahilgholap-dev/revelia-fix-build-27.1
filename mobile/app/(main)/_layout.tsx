import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as t from '@/theme';

/**
 * ── 🔴 2026-08-05: THE BAR NOW ADDS THE SYSTEM INSET TO BOTH OF ITS OWN NUMBERS ────────────────
 *
 * FOUNDER REPORT, from a real Samsung device on 3-BUTTON navigation: the six labels are OVERLAPPED
 * by the system back/home/recents row, and there is an EMPTY BAND immediately above the bar. Not
 * reproduced on the owner's device, which uses gesture navigation.
 *
 * 🔴 CAUSE, MEASURED IN THE INSTALLED NAVIGATOR AND IN EXPO'S PREBUILD, NOT INFERRED FROM THE
 *    SYMPTOM. `@expo/prebuild-config`'s edge-to-edge plugin writes the opt-out theme attribute
 *    whenever the app config does not set the enable field — ours does not — and that attribute is
 *    HONOURED up to Android 15 and IGNORED on Android 16 for an app targeting 36, which this app
 *    does since the compliance bump. So on Android 16 the window extends behind the system bars and
 *    the app owns the inset. Two of our own numbers then clobber the navigator's handling of it:
 *
 *      1. `getTabBarHeight` (bottom-tabs 7.16.1) short-circuits: a NUMERIC height in the style wins
 *         and its own `+ inset` term is never reached. So the bar stayed the same size while the
 *         window grew, and the labels — which sit at the BOTTOM of the icon-plus-label column — were
 *         the part that ended up inside the system row.
 *      2. the navigator sets its own bottom padding FROM the inset, one array element before this
 *         style object. Ours is last, so it won. A 3-button row is ~48 and gesture is ~24, which is
 *         exactly why the same build reads correct on one device and broken on the other.
 *
 * 🟢 THE FIX IS ADDITIVE AND IT IS AN ARITHMETIC NO-OP WHEREVER THE OLD NUMBERS WERE RIGHT. Both
 *    terms take `+ insets.bottom`, so the VISIBLE BAND is unchanged in every environment (both ends
 *    of the subtraction move by the same amount) and on every device where the system row does not
 *    overlay the window the inset is 0 and this file renders byte-identically to before.
 *
 * 🔴 X18 IS HONOURED, AND THIS IS THE READING, STATED SO IT CAN BE CHECKED. The register's X11–X18
 *    block exists because an EXPLICIT DIMENSION is what iOS production needs — "padding-only sizing
 *    collapsed the badge to a thin ribbon". A computed dimension is still an explicit one, the three
 *    literals are still literally here, and `invariant-register-check.js`'s three exact counts on
 *    this file still read 1 / 1 / 1. What the register attaches to a CHANGE of the height is a
 *    procedure, not a prohibition — audit §7.5 and primitives-plan §2.2 both say "changing the
 *    height means RE-VERIFYING the five Android clipping screens" — and that re-verification is
 *    owed. It is registered as an owner action rather than claimed.
 * ⚠️ The same idiom already ships: `components/ui/Sheet.tsx` pads by its literal plus this inset.
 *    This is that pattern arriving at the one surface that could not be reached without a hook.
 *
 * THE TAB BAR — §9 item 14. 🔴 X18, AND THE HEIGHT DID NOT MOVE IN THE ITEM-14 COMMIT.
 *
 * That was the load-bearing sentence of the whole item. X18's three numbers are coupled to
 * `useBottomInsetPadding`, and Compatibility's adoption was a FUNCTIONAL blocker rather than a
 * cosmetic one — content unreachable behind the bar. §3.1's gate for this row says that if the
 * height changes, the clipping screens need re-verifying on an Android device. It did not change
 * then, which is why that item was cheap; it changes now, and the box above says what that costs.
 * 🔴 AND THE COUPLED CONSUMER MOVED IN THE SAME COMMIT, BECAUSE IT HAD THE MIRROR-IMAGE DEFECT:
 *    the hook was adding the inset to a bar height that ALREADY contained it. That double count is
 *    the empty band in the report. See `hooks/useBottomInsetPadding.ts`.
 *
 * ── WHAT WAS ALREADY DONE, AND BY WHOM, SO IT IS NOT "FIXED" AGAIN ────────────────────────────
 *
 * Pass 1b took the fill, the top hairline and both tint roles onto tokens; pass 2b/D5 took the
 * label onto the ramp's `text-2xs` step and settled WHY it is not the eyebrow step (design §6.6.2
 * rules this exact case by name: the eyebrow is uppercase-only and these labels are Title Case).
 * So this item is the two designed states that were never built.
 *
 * ── 🔴 THE FINDING: `renderIcon` IS CALLED TWICE AND THE `focused` FLAG WAS THROWN AWAY ────────
 *
 * Measured in the installed @react-navigation/bottom-tabs 7.16.1, not recalled — `TabBarIcon.tsx`
 * renders the icon TWICE, stacked, once with `focused: true` at the active tint and once with
 * `focused: false` at the inactive tint, and cross-fades them by opacity. The app was passing the
 * SAME FILLED GLYPH to both calls, so half of a mechanism the navigator was already paying for
 * rendered nothing. design §9.2 specifies outline/filled PAIRS for all six tabs; taking them costs
 * one destructured prop.
 *
 * ⚠️ THIS WAS NOT MOTION AND DID NOT BREACH §0.0 RULE 5 (which is retired now — motion is back IN).
 *    What that item changed was WHICH GLYPH each of the two existing copies draws.
 * 🔴 BUT ITS PARENTHETICAL WAS WRONG, AND THE MOTION PHASE MEASURED IT: this paragraph used to say
 *    "the opacity cross-fade already runs today — it is how the two tint colours are blended."
 *    **There is no cross-fade.** `views/BottomTabItem.tsx:295-296` sets `activeOpacity = focused ? 1
 *    : 0` as a PLAIN style, with no `Animated`, no interpolation and no timing anywhere in the file.
 *    The two copies swap INSTANTLY. The structure is a cross-fade; the behaviour is a cut — and the
 *    navigator exposes nothing that changes it. Blindness class 7, in our own document: an inference
 *    is not verified by being written down.
 * 🔴 AND AS OF 2026-08-06 THE SCENE IS A CUT TOO, BY OWNER RULING — so the bar and the scene now
 *    agree. The `screenOptions` block below carries the whole argument and the measurement; design
 *    §5.4 records BOTH halves of that row as unmeetable.
 * 🟢 It also stops the active/inactive distinction from being carried by COLOUR ALONE, which is a
 *    real accessibility gain and the only one this item has to give.
 *
 * ── 🔴 AND X18's DOCUMENTED BAND ARITHMETIC WAS OFF BY ONE, MEASURED AT THE SOURCE ─────────────
 *
 * The D5 comment this file used to carry computed the vertical budget as "icon 24 + marginTop 2 +
 * lineHeight 16 = 42, so headroom 11". The 24 is design §9.2's spec number and it is NOT what the
 * navigator passes. In 7.16.1 the size comes from `TabBarIcon`'s own constants and depends on the
 * bar variant, which defaults to `uikit`:
 *
 *      regular  ICON_SIZE_ROUND          25      <- what a phone in portrait actually renders
 *      compact  ICON_SIZE_ROUND_COMPACT  18
 *      material ICON_SIZE_MATERIAL       24      <- the spec's number, and this bar is not it
 *
 * So the real band is 85 − 24 − 8 = 53 against content 25 + 2 + 16 = 43 — 🟠 HEADROOM 10, not 11,
 * and ≈5.2px at the 1.3 font-scale cap rather than ≈6.2. Still safe, tighter than recorded, and
 * the correction matters because that number is the argument for the label step being safe at all.
 *
 * 🔴 THE SIZE STAYS THE NAVIGATOR'S AND IS NOT PINNED TO THE SPEC'S 24. Hardcoding 24 would look
 *    like honouring the design and would in fact DELETE the compact adaptation — the navigator
 *    drops to 18 on a short bar, which is exactly the case with the least headroom. A spec number
 *    written from a canvas does not outrank a platform behaviour that protects a small screen
 *    (§0.0 rule 1). The divergence is registered instead.
 *
 * ⚠️ Do NOT set a per-bar font-scaling flag here. The label follows the app-wide freeze in
 *    lib/textDefaults.ts, which reaches React Navigation's own <Text> — that is where design §3.6's
 *    "tab labels freeze" actually lands, and pre-empting it here would give it two homes.
 */
/**
 * A RE-TAP ON THE ACTIVE TAB POPS THAT TAB'S STACK TO ITS ROOT.
 *
 * 🔴 IT IS NOT A FLAG, AND "it may only need enabling" IS THE THING TO CORRECT. Measured in the
 *    installed @react-navigation/bottom-tabs 7.16.1, `views/BottomTabBar.js`'s own `onPress`:
 *
 *        const event = navigation.emit({ type: 'tabPress', target: route.key, ... });
 *        if (!focused && !event.defaultPrevented) { navigation.dispatch(...navigate(route)) }
 *
 *    The guard is `!focused`. Pressing the tab you are already on emits the event and then does
 *    NOTHING — by construction, in every version of this navigator. There is no option to flip;
 *    the event exists precisely so an app supplies the behaviour, and this is that.
 *
 * Four of the six tabs own a nested stack (`readings`, `astrology`, `numerology`, `compatibility`);
 * `home` and `profile` are single screens. The listener needs no per-tab knowledge of that — a tab
 * with no nested navigator has no `route.state`, so the second guard returns early and the press
 * stays inert exactly as it is today.
 *
 * 🔴 THREE GUARDS, AND EACH ONE PREVENTS A DIFFERENT WRONG BEHAVIOUR:
 *   1. not the active tab      -> return. SWITCHING to a tab must preserve where you were in it;
 *                                 popping there would be a second, unasked-for change.
 *   2. no nested navigator     -> return. Nothing to pop.
 *   3. that stack is at index 0 -> return, WITHOUT preventing the default, so a re-tap at the root
 *                                 keeps whatever the navigator would otherwise do.
 *
 * ⚠️ The action is written as its literal shape rather than imported. `@react-navigation/native`
 *    is a TRANSITIVE dependency of the router, not a direct one, and audit finding I-4 is standing
 *    guidance against reaching into one. `StackActions.popToTop()` returns exactly this object —
 *    verified in the installed `@react-navigation/routers`, which both produces it at `:34` and
 *    consumes it at `:356`. No new import, no new dependency edge.
 *
 * ⚠️ X18 IS UNTOUCHED. This adds a `listeners` prop; the bar's three pinned numbers, the five
 *    screens whose bottom padding derives from them, and every tint and label style are unchanged.
 */
const popToRootOnRetap = ({ navigation, route }: { navigation: any; route: any }) => ({
  tabPress: (e: { preventDefault: () => void }) => {
    const state = navigation.getState();
    if (state?.routes?.[state.index]?.key !== route.key) return;   // guard 1 — switching, not re-tapping
    const nested = route.state;
    if (!nested?.key) return;                                      // guard 2 — no stack under this tab
    if (nested.index === 0) return;                                // guard 3 — already at its root
    e.preventDefault();
    navigation.dispatch({ type: 'POP_TO_TOP', target: nested.key });
  },
});

export default function MainLayout() {
  /* The root provider is mounted in `app/_layout.tsx`, well above this layout, so this reads the
     real per-device value on every platform and navigation mode. NEVER a per-device constant: 3-button,
     gesture, Samsung's variants and foldables all differ, so any number written here is wrong somewhere. */
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        /* ── 🔴 §5.4's TAB-SWITCH ROW IS A **CUT**. OWNER-RULED 2026-08-06, ON A DEVICE. ─────────
           ⚠️ THIS IS A REVERT OF MOTION ITEM 5, AND THE HALF-ROW IT USED TO SATISFY IS NOW
              RECORDED IN design §5.4 AS A SPEC ROW THAT CANNOT BE MET. Read it there before
              re-adding anything here — this is a ruling, not an unfinished job.

           🔴 THE DEFECT, FROM THE DEVICE: entering Home from Readings, the PREVIOUS screen's copy
              was legible THROUGH the new one — two different text layouts composited at partial
              alpha, with the bar still showing the old tab active. It read as a bright hazy smear
              and was reported as a white flash.
           🔴 IT IS A DOUBLE EXPOSURE, AND NO DURATION FIXES IT. Cross-fading two OPAQUE FULL-SCREEN
              scenes works for IMAGES, where one picture replaces another; between two text layouts
              the user READS BOTH for the length of the overlap. 220ms was already short, and
              shortening it only makes the smear briefer. So the window is removed rather than
              retimed. Before item 5 the switch was a CUT (UI-audit §4.3) and no such window
              existed — this restores that.
           🟢 AND IT NOW AGREES WITH THE BAR INSTEAD OF DISAGREEING WITH IT. The icon/label swap in
              this navigator is already an instantaneous cut (see the header: `BottomTabItem.tsx`
              sets the two opacities as a plain style, no `Animated` in the file) and X18 forbids
              the only fix for that. Scene and bar were animating on two different models; they no
              longer are.

           🔴 WHAT THE NAVIGATOR DOES NOW, MEASURED IN THE INSTALLED 7.16.1 RATHER THAN ASSUMED —
              `views/BottomTabView.tsx`. With neither key set, `animation` defaults to `'none'`, so
              the preset supplies `{ animation: 'timing', config: { duration: 0 } }` and no scene
              interpolator at all; `hasAnimation()` returns false, so the outgoing scene goes
              straight to the detached activity state instead of interpolating there. Nothing is
              below alpha 1 at any point. ⚠️ NOTE THE ASYMMETRY THAT MAKES A PARTIAL REVERT WRONG:
              `hasAnimation()` reads the SPEC when no animation name is set, so leaving the spec
              behind would keep the 220ms window open with no fade in it — the scenes would still
              overlap. Both keys go, or neither.

           🔴 `sceneStyle` IS THE OTHER HALF OF THE SAME DEFECT AND IT IS NOT COSMETIC. Every other
              navigator in this app names the brand ground (`contentStyle` on all six stacks); this
              one named nothing, and a bottom-tabs scene is painted by
              `@react-navigation/elements`' `Background`, which fills `useTheme().colors.background`.
              Expo Router's container defaults that theme to react-navigation's LIGHT one
              (`fork/NavigationContainer.js`: `theme = DefaultTheme`, whose background is a very
              light grey — the value is NOT spelled here, because a colour literal in a comment is
              counted by `no-raw-hex`, which is the hazard CLAUDE.md names as the biggest such
              ledger and it fired on the first draft of this very paragraph), and the element
              opacity the cross-fade drove included that fill — so the "flash" was a near-white
              layer, twice, fading through itself. The cut closes the window; this
              closes the colour. ⚠️ KEEP IT even though nothing animates the scene any more: it is
              the only place in this navigator where the palette's ground can be named, and the next
              scene-level effect would re-open the same hazard silently.
           ⚠️ WITHIN-GROUP PUSHES ARE UNCHANGED AND THAT IS THE RULING, not an omission. §5.4
              row 1: "Nothing of ours — native timing, no custom bezier, no `animationDuration`."
              The rise those screens get is the CONTENT entrance in `ScreenContainer`. */
        sceneStyle: { backgroundColor: t.color.bg },
        tabBarStyle: {
          backgroundColor: t.color.surface,
          borderTopColor: t.color['border-subtle'],
          borderTopWidth: 1,
          // 🔴 X18 — these three are PRESERVE-BLINDLY and are asserted by the adoption gate.
          //    See the header: the clipping screens' bottom padding is derived from them.
          // 🔴 AND THE TWO SYSTEM-EDGE TERMS ARE NOT DECORATION. Delete either one and the labels go
          //    back under the system row on 3-button navigation. The literals stay literals; the
          //    inset is added to them. The band between them is unchanged in every environment.
          height: 85 + insets.bottom,
          paddingBottom: 24 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: t.color.accent,
        tabBarInactiveTintColor: t.color['fg-muted'],
        // 🔴 D5 · X18. The label was a raw numeric 11 — one of the nine ROLE-MISFIT
        //    sites. (Spelled that way on purpose: writing the literal declaration here
        //    would make this comment count itself in `no-numeric-fontsize`, which is a
        //    grep over source and cannot tell a comment from code.)
        //    `t.type['overline']` 11 is the only size-exact step for it, and it is
        //    UPPERCASE-ONLY (§3.3) while these labels are Title Case. Design §6.6.2 rules
        //    this precise case by name — "Tab bar 85 | label 11 | **text-2xs 12/16**, NOT
        //    the eyebrow step" — and that ruling is the precedent applied to the other 8.
        //    ⚠️ THE STEP IS NAMED VIA `t.type[…]` ON PURPOSE, and the reason is worth the line.
        //    The prefixed utility spelling would satisfy `no-bare-overline`, but TAILWIND'S
        //    CONTENT SCANNER IS A REGEX OVER RAW FILES AND HARVESTS COMMENTS: writing it here
        //    made the config emit a live `text-`+eyebrow rule with zero call sites, and moved
        //    2b's `--diff` from 13 to 14. Measured, not theorised — it is the same mechanism
        //    that put the bare eyebrow class in the resolved set at 2a and became O-28.
        //    The `t.type[…]` form is discarded by that gate rule AND is already a live token
        //    reference, so it adds nothing to the rule set. Two greps, one spelling.
        //    ⚠️ The band arithmetic this comment used to carry was off by one — it is corrected
        //    in the module header, where the measurement that corrected it also lives.
        tabBarLabelStyle: {
          fontSize: t.type['text-2xs'].size,
          lineHeight: t.type['text-2xs'].lineHeight,
          letterSpacing: t.type['text-2xs'].letterSpacing,
          fontFamily: t.family['body-semi'],
          marginTop: 2,
        },
      }}
    >
      {/* 🔴 THE SIX PAIRS ARE design §9.2's LIST, VERBATIM. `focused` is the mechanism — see the
          header. Two of the names also CHANGE here, and both changes are the design's: Readings
          moves off a book glyph and Astrology off a star, which the icon set reserves for rating
          and favourite semantics this app does not mean. `size` is the navigator's, deliberately. */}
      <Tabs.Screen
        name="home"
        listeners={popToRootOnRetap}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="readings"
        listeners={popToRootOnRetap}
        options={{
          title: 'Readings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="numerology"
        listeners={popToRootOnRetap}
        options={{
          title: 'Numbers',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calculator' : 'calculator-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="astrology"
        listeners={popToRootOnRetap}
        options={{
          title: 'Astrology',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'planet' : 'planet-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="compatibility"
        listeners={popToRootOnRetap}
        options={{
          title: 'Match',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={popToRootOnRetap}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
