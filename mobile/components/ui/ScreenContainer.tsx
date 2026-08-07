import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GrainLayer } from './GrainLayer';
import { RidgeField } from './ShapePrimitives';
import { useEntrance } from '@/lib/motion';
import * as t from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 🔴 THE ENTRANCE RIDES ON AN ELEMENT THAT ALREADY EXISTS. IT ADDS NO LAYOUT NODE, AND THAT IS THE
 *    WHOLE DESIGN OF THIS ITEM RATHER THAN AN OPTIMISATION.
 *
 * The obvious implementation is to wrap the content block in a new `Animated.View`. 🔴 MEASURED
 * BEFORE WRITING ANYTHING, THAT BREAKS SIX LIVE SCREENS: `forgot-password`, `login`,
 * `reset-password`, `signup`, `verify-code` and `verify-email` all pass
 * `contentContainerStyle={{ justifyContent: 'center' }}`. A wrapper between the scroll content
 * container and the real children makes that alignment centre the WRAPPER — which already fills the
 * box — and the children inside it go back to being top-aligned. That is the entire login funnel,
 * and on Android it would look like a redesign nobody asked for.
 *
 * ⚠️ AND THE DEEPER REASON IS X1. This primitive is inherited by 25 of 32 screens and its guards are
 *    a FLEX PROPAGATION CHAIN — pinned box → safe area → scroll view — which iOS **production** does
 *    not do for free (Build 13). Inserting a node into that chain is exactly the class of edit
 *    `codemod-plan` §5.4 closed the verification programme for: it is a no-op on Android, so nothing
 *    available to this repo could tell us whether it held.
 *
 * 🟢 SO THE ANIMATED STYLE IS **APPENDED TO THE SAFE AREA'S EXISTING STYLE ARRAY**. Zero new nodes,
 *    X1's three literals byte-identical and in place, and only `opacity` + `transform` animate — no
 *    layout property, so nothing reflows.
 * 🟢 AND IT IS THE CORRECT READING, NOT MERELY THE SAFE ONE: the grain and ridge layers are SIBLINGS
 *    of the safe area, so the page texture stays PUT while the content rises through it. §5.4's row
 *    is "the content block, owned by ScreenContainer, not the navigator" — this is that block, and
 *    nothing else is inside it.
 * 🔴 THE COMPONENT IS CREATED AT MODULE SCOPE. Inside the render it would be a new component type on
 *    every render, which remounts the entire screen subtree on every state change.
 */
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

const DEFAULT_GRADIENT: [string, string, ...string[]] = [
  t.alpha(t.color.accent, 0),
  t.alpha(t.color.accent, 10),
];

/**
 * §17.4 — THE HERO SLOT, AND IT IS A TYPE RATHER THAN A CONVENTION.
 *
 * §17.1's rule is "one display-scale moment per screen — zero or one, never per section", and
 * §17.4's mechanism is that the slot EXISTS ONCE, here, and screens opt in. That is what makes
 * the rule structural instead of per-screen taste: a screen that wants a second one has nowhere
 * to put it.
 *
 * 🔴 THE PAIRING IS PART OF THE RULE, NOT DECORATION AROUND IT. §17.1: the hero pairs with its
 *    eyebrow as its immediate neighbour, "and THAT ADJACENCY IS THE CONTRAST" — 30/34 against
 *    11/14 with no mid step between them. A hero shipped without its eyebrow is not a smaller
 *    hero; it is the mechanism deleted. So the two travel as a pair the compiler enforces, and
 *    scripts/primitive-adoption-check.js asserts the same thing at the JSX boundary, where a
 *    spread or an `as any` would slip past the type.
 */
type HeroSlot =
  | { hero: string; heroOverline: string }
  | { hero?: undefined; heroOverline?: undefined };

interface ScreenContainerBaseProps {
  /** Wrap content in a LinearGradient background pinned to screen dims.
   *  Default: false (plain dark background). */
  withGradient?: boolean;
  /** Override the default brand gradient. */
  gradientColors?: [string, string, ...string[]];
  /** Wrap content in a ScrollView. Default: true. */
  withScrollView?: boolean;
  /** Wrap content in a KeyboardAvoidingView (iOS=padding, Android=height).
   *  Default: false. Used for forms/auth screens. */
  withKeyboardAvoiding?: boolean;
  /** Per-screen override for ScrollView's contentContainerStyle. Merged on
   *  top of the safe defaults so callers can tweak padding per design. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Optional style override for the inner SafeAreaView (rare). */
  safeAreaStyle?: StyleProp<ViewStyle>;
  /**
   * 🔴 §15.1's RIDGE, AND IT IS OPT-IN PER SCREEN RATHER THAN AUTOMATIC — that is the whole design
   * of this prop. §15.1 mounts the ridge "behind a screen header ONLY", and §0.0 rule 5's descope
   * mounts it on the funnel screens and Home only. This primitive is rendered by 25 screens, so a
   * ridge painted here unconditionally would mount it on all 25 — which is not a smaller version of
   * the descope, it is the descope deleted. Exactly one screen passes it today.
   * ⚠️ It is ABSOLUTE and NON-INTERACTIVE and it is painted as a SIBLING of the safe area, in the
   *    same position the texture occupies — so like the texture it adds no layout node and X1's four
   *    anchors are untouched. §15.1's "absolute, pointerEvents none" is satisfied here, not by the
   *    caller, because the caller cannot reach inside the pinned element.
   */
  ridge?: boolean;
  /** ScrollView passthrough props (showsVerticalScrollIndicator, etc.). */
  scrollViewProps?: Omit<ScrollViewProps, 'style' | 'contentContainerStyle'>;
  /** Background color when withGradient=false. Default: t.color.bg. */
  backgroundColor?: string;
  children: React.ReactNode;
}

type ScreenContainerProps = ScreenContainerBaseProps & HeroSlot;

/**
 * Universal screen wrapper that fixes the iOS production layout collapse.
 *
 * Why this exists:
 *   On iOS production builds, `flex:1` does not propagate from the navigation
 *   host (the screen slot) down through `SafeAreaView` and (optionally)
 *   `LinearGradient`/`ScrollView`. The result is that the entire screen
 *   collapses to the top safe-area inset (~82px) and reports `height: 0`
 *   from the inner ScrollView. Build 13 onLayout measurements proved this.
 *
 * The fix:
 *   - Outermost element is pinned to `Dimensions.get('window')` width/height
 *     with `position: 'absolute', top: 0, left: 0`.
 *   - SafeAreaView gets `flex:1, width: '100%', minHeight: SCREEN_HEIGHT`.
 *   - ScrollView gets `style={{ flex:1, width:'100%' }}` + a content
 *     container with `flexGrow:1, minHeight: SCREEN_HEIGHT - 100`.
 *
 * Android sanity:
 *   `Dimensions.get('window')` matches what Android already calculated for
 *   `flex:1`. `minHeight` is bounded by the viewport so it can't push past
 *   the screen. No platform branch is needed; this is a no-op on Android
 *   layouts that were already working.
 *
 * 🔴 X1 — AND THE SENTENCE THAT MAKES IT DANGEROUS, from commit 6525a75 itself:
 *   "Android unchanged — flex propagation works there, explicit dimensions are no-ops."
 *   ON ANDROID EVERY GUARD ABOVE LOOKS LIKE DEAD CODE. Delete them, run the app, see nothing
 *   change, ship — and the screen collapses to a thin ribbon on iOS production. There used to be
 *   two protections: this comment, and the chance of catching it on a device. codemod-plan §5.4
 *   closed the iOS verification programme permanently, so THIS COMMENT IS THE ONLY ONE LEFT.
 *   No Android screenshot is evidence about any of it. RESTYLE INSIDE THE STRUCTURE; never
 *   flatten it. The four anchors are: the pinned width/height, the position on the outermost
 *   element, SafeAreaView's minHeight, and the scroll container's flexGrow + minHeight.
 *
 * 🔴 THE PADDING NUMBERS ARE NOT PART OF X1 and the two named gutter tokens may be retuned.
 *
 * WHAT THE PRIMITIVES PHASE ADDED HERE (item 1, 2026-08-03), both INSIDE the structure:
 *   · the paper texture — an inert, pinned SIBLING of the safe area, painted BELOW it, so it
 *     shows in gutters, margins and section gaps and never across an opaque card face. Design
 *     §14.2.1: "the PAGE is textured, the objects on it are clean."
 *   · the one hero slot (§17.4) — CONTENT, inside the scroll container, never structure.
 * ⚠️ §9's row for this component also lists a card-entrance. 🔴 **MOTION WAS CUT AND IS BACK IN**
 *    (owner, 2026-08-04 — primitives-plan §0.0's reversal box). The entrance is therefore OWED here,
 *    and the constraint it must respect is X1's: it animates the CONTENT BLOCK, never the pinned
 *    wrapper. ⚠️ AND A DESCOPED ITEM IS NOT A PRESERVED ITEM — this one has to be BUILT, not found.
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  withGradient = false,
  gradientColors,
  withScrollView = true,
  withKeyboardAvoiding = false,
  contentContainerStyle,
  safeAreaStyle,
  scrollViewProps,
  backgroundColor = t.color.bg,
  ridge = false,
  hero,
  heroOverline,
  children,
}) => {
  /* §5.4's screen-content entrance. 🔴 IT IS CALLED UNCONDITIONALLY AND THAT IS DELIBERATE: a hook
     behind a prop is a hook behind a conditional call, which React forbids, and a per-screen opt-out
     would make the entrance a thing 25 screens each have to remember. The two surfaces that must NOT
     get it are excluded STRUCTURALLY rather than by a flag — `qa.tsx` (the crisis state must read
     deliberately bare) and `welcome.tsx` (X2) are both in this primitive's `forbidden` list in
     `primitive-adoption-check.js`, so neither can adopt it without failing the gate.
     ⚠️ `cosmic-report.tsx` DOES inherit it, and that is permitted: §18.5 freezes that screen's own
        STRUCTURE and re-times its state transitions, and this entrance is neither — it arrives from
        inside this module and changes nothing in that file.
     🔴 IT IS KEYED ON FOCUS NOW, NOT ON MOUNT (owner ruling, 2026-08-06), and THIS primitive is why
        the distinction was worth a session: the tab navigator KEEPS ITS SCENES MOUNTED, so a
        once-per-mount entrance on a screen reached from the tab bar had exactly one chance in the
        life of the app — and spent it underneath the container's own arrival. Every later visit was
        silent. The hook now waits out the longest container animation and re-arms on each focus;
        neither half works without the other. See `lib/motion.ts` and LEG D of the arrival gate.
     ⚠️ CONSEQUENCE FOR THIS FILE: it now needs a navigation context. All 25 consumers are routes,
        and the two forbidden screens are forbidden by the adoption gate rather than by a flag, so
        nothing here can drift outside the router without also failing that gate. */
  const entrance = useEntrance();

  // §17.4's slot. Typed to the top ramp step plus its eyebrow, and the two steps are chosen by
  // the slot rather than by the caller — that is the whole point of it being a slot.
  // 🔴 The eyebrow sits IMMEDIATELY above with no gap between them (§17.1); the gap goes BELOW
  //    the pair. The uppercase transform is applied here and the caller's literal is passed
  //    through untouched (C-6: keep the source string, transform at the site).
  const content: React.ReactNode = hero === undefined ? children : (
    <>
      <View style={{ marginBottom: t.space[6] }}>
        <Text
          {...t.txt('overline')}
          style={[t.txt('overline').style, { color: t.color['fg-muted'], textTransform: 'uppercase' }]}
        >
          {heroOverline}
        </Text>
        <Text {...t.txt('display-lg')} style={[t.txt('display-lg').style, { color: t.color.fg }]}>
          {hero}
        </Text>
      </View>
      {children}
    </>
  );

  // Inner content (content → optionally wrapped in ScrollView → optionally
  // wrapped in KeyboardAvoidingView)
  let body: React.ReactNode = content;

  if (withScrollView) {
    body = (
      <ScrollView
        {...scrollViewProps}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={[
          {
            flexGrow: 1,
            // 🔴 PASS 3a — THIS IS THE CANONICAL HOME OF THE SCREEN GUTTER, and the two named
            //    tokens (design §4.2) exist so the next screen does not hand-type the numbers.
            //    Both are byte-identical to what was here (24 and 32), so this is a NAMING change
            //    with zero rendered effect — which is the only kind 3a permits.
            // ⚠️ THE ROLE IS THE POINT, NOT THE NUMBER. The `screen-x` token and the step-6 spacing
            //    token BOTH resolve to 24 today, so the identity gate cannot tell them apart — the
            //    same shape as §3.0.2.2's held-value collisions, one family over. This site is the
            //    SCREEN gutter; a button that happens to pad by 24 is the step-6 token and must NOT
            //    be renamed to this one, or it silently follows the gutter the first time the gutter
            //    is retuned. 12 such sites were deliberately left alone in this pass for that reason.
            // 🔴 X1: the padding numbers are NOT part of the invariant — the pinned structure,
            //    flexGrow and `minHeight: SCREEN_HEIGHT - 100` are. Do not touch those.
            paddingHorizontal: t.space['screen-x'],
            paddingVertical: t.space['screen-y'],
            minHeight: SCREEN_HEIGHT - 100,
          },
          contentContainerStyle,
        ]}
      >
        {content}
      </ScrollView>
    );
  }

  if (withKeyboardAvoiding) {
    body = (
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {body}
      </KeyboardAvoidingView>
    );
  }

  /* 🔴 THE ENTRANCE STYLE IS THE LAST ELEMENT OF THE ARRAY AND `safeAreaStyle` IS STILL SECOND, so a
     caller's override continues to beat the defaults exactly as before and only the animated
     properties are added on top. The first element is untouched, character for character, because
     `invariant-register-check.js` asserts X1's anchors as EXACT counts against this file — including
     `minHeight: SCREEN_HEIGHT }` spelled with its closing brace, so that it cannot be satisfied by
     the scroll floor, and `flex: 1, width: '100%'` at exactly three sites. Reformatting this object
     would fail the gate, which is the point of asserting it. */
  const safeArea = (
    <AnimatedSafeAreaView
      style={[
        { flex: 1, width: '100%', minHeight: SCREEN_HEIGHT },
        safeAreaStyle,
        entrance,
      ]}
    >
      {body}
    </AnimatedSafeAreaView>
  );

  // Outer pinned-dimension container — gradient or plain View.
  // 🔴 THE TEXTURE IS A SIBLING OF `safeArea`, INSIDE THIS ELEMENT, AND FIRST.
  //    Inside, because X1 pins this element and only this element knows the real screen box.
  //    First, because siblings paint in order: the texture must sit under everything the screen
  //    draws. Design §14.2's stack is canvas -> wash -> texture -> content, and every card ground
  //    in the system is opaque, so this shows in the negative space only. That is the reading
  //    (§14.2.1), not a limitation.
  //    It adds NO layout node — it is pinned and inert — so X1's four anchors are untouched.
  if (withGradient) {
    return (
      <LinearGradient
        colors={gradientColors ?? DEFAULT_GRADIENT}
        /* GRADIENT-FG(fg-muted) — this element's children arrive from 25 other files, so the
           foregrounds that actually land on the page ground are out of static reach from here. The
           declaration says what the page ground MUST keep legal: the WEAKEST reading role in the
           ramp. The A6 rule then measures the ramp against it (4.72:1 at the worst point of the
           span), so any future change to DEFAULT_GRADIENT that puts muted body copy under AA fails
           in this file rather than on 25 screens. */
        style={{
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          position: 'absolute',
          top: 0,
          left: 0,
          /* 🔴 `O-103` / `P79` — THE PAGE'S OPAQUE GROUND LIVES HERE NOW, NOT IN STOP 1.
             DEFAULT_GRADIENT used to open on the opaque canvas step and close on a translucent
             accent tint, which is the shape that renders two different ways: straight-alpha lerps
             the colour toward accent while the alpha falls, so the midpoint bulges LIGHTER than
             either end. This is the ground for 25 of 32 screens, so the bulge was app-wide.
             Ground beneath + a one-hue ramp above = identical endpoints, no bulge, both models
             agree. ⚠️ X1 IS UNTOUCHED: its four anchors are the pinned dimensions, the absolute
             position and the two minHeights. A fill is not one of them. */
          backgroundColor: t.color.bg,
        }}
      >
        <GrainLayer />
        {ridge ? <RidgeFieldLayer /> : null}
        {safeArea}
      </LinearGradient>
    );
  }

  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor,
      }}
    >
      <GrainLayer />
      {ridge ? <RidgeFieldLayer /> : null}
      {safeArea}
    </View>
  );
};

/**
 * §15.1's ridge, positioned. It is a separate component only so the two return branches above cannot
 * drift apart — five findings in this phase came from two copies of one thing.
 *
 * 🔴 THE `top` IS §15.3's REFERENCE INSTANCE, VERBATIM: that comp draws the ridge at top 86 behind
 *    Home's header, in a 360x150 box. The width is the real screen so the bleed reaches both edges.
 */
function RidgeFieldLayer() {
  return (
    <View style={{ position: 'absolute', top: 86, left: 0 }} pointerEvents="none">
      <RidgeField width={SCREEN_WIDTH} accentNode />
    </View>
  );
}

export default ScreenContainer;
