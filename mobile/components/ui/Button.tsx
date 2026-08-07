import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { usePress } from '@/lib/motion';
import * as t from '@/theme';

/**
 * 🔴 THE PRESS FEEDBACK RIDES ON THE TOUCHABLE ITSELF AND ADDS NO NODE, for the same reason the
 *    screen entrance rides on the safe area: this control's HEIGHT is X3, a PRESERVE-BLINDLY
 *    invariant, and a wrapper around a fixed-height box is exactly the edit that renders identically
 *    on Android and collapses in iOS production. The animated style is appended to the existing style
 *    array; the three heights and the gradient's 100%/100% are untouched.
 * 🔴 MODULE SCOPE. Created inside the render it would be a new component type every render, which
 *    remounts every button in the app on every parent state change.
 */
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// 🔴 X3 — UI-audit §5.1, HARD, PRESERVE-BLINDLY. THESE THREE LITERALS AND THE GRADIENT'S
//    100%/100% BELOW ARE THE INVARIANT. Explicit pixel heights per size: iOS **production**
//    collapsed padding-sized gradient buttons into thin ribbons (Build 13). The gradient fills
//    100% of an explicitly-sized TouchableOpacity instead of relying on `flex:1` propagation,
//    which does not survive the iOS nav host in a production build.
//
// 🔴 AND THE PART THAT MAKES IT DANGEROUS, quoted from commit 6525a75 itself:
//    "Android unchanged — flex propagation works there, explicit dimensions are no-ops."
//    So on Android all three numbers look like dead code. Delete them, run the app, see nothing
//    change, ship — and this control collapses on iOS at 19 screens at once. codemod-plan §5.4
//    closed the iOS verification programme permanently (founder decision; iOS is paused), so
//    THIS COMMENT AND primitives-plan §2 ARE THE ONLY PROTECTION LEFT. No Android screenshot,
//    no emulator run and no green gate is evidence about any of it.
//    `primitive-adoption-check.js` asserts all four literals survive every commit — a survival
//    check, never a correctness one (§2.4: mechanical assertion is not verification).
const SIZE_HEIGHT: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 48,
  md: 56,
  lg: 64,
};

// 🔴 PASS 2b · D3 — THIS TABLE WAS INVISIBLE TO EVERY GATE, AND IT IS TYPE, NOT DIMENSION.
//    `no-numeric-fontsize` greps for the raw property followed by a digit. Every call site here
//    used to read the size from a VARIABLE, so the app's most-used control has NEVER been counted
//    by the type ledger — not in the 346 baseline, not 2a's 341, not the 124 residual.
//    (The literal spelling is deliberately not written out in this comment: a comment is
//    source to every grep, and it would count itself in `no-variable-fontsize`.)
//    See the pass-2b notes: 15 sites across Button / StreakBadge / AstroNumeroBadge share
//    this shape, and it is why `no-variable-fontsize` now exists in token-gate.sh.
//
// 🆕 §9 ITEM 2 — THE RAMP IS TWO STEPS, NOT THREE, AND THAT IS THE DESIGNED CHANGE.
//    Design §9 row 2 names exactly two steps for a Button label, and §3.3 labels the larger one
//    "Button label (md/lg)" — i.e. md and lg SHARE it. So the `lg` label drops 18 -> 16 and the
//    lookup below now holds two distinct values across three sizes. 🔴 THAT IS NOT A BUG AND MUST NOT BE
//    "RESTORED": the size prop scales the BOX (X3's 48/56/64), and above 16 a label starts to
//    compete with the display ramp it is supposed to sit under.
//    ⚠️ It is OUTSIDE X3's scope and explicitly allowed — primitives-plan §2.2 row 2 and
//    codemod-plan §5's X3 row both say so by name. The heights are untouched by it.
//    Headroom after the drop: 48-22=26, 56-22=34, 64-22=42. All three grew or held.
//
// 🔴 STYLE ONLY — NO SCALING PROPS HERE, DELIBERATELY, AND `p23-optin-check` MUST STAY AT 0.
//    Both steps below are reading-copy steps that opt back IN to scaling everywhere else, but
//    design §3.6 names X3 BY NUMBER as a freeze surface: "chrome, numerals and tab labels freeze
//    so X3's fixed 48/56/64 heights and the chat composer never reflow." §3.3 classifies by STEP
//    and §3.6 by ROLE; on a fixed-height control §3.6 wins. So the sites below spread `.style`
//    and never the props. (Measured for the record: even opted in, 1.3x leaves 19.4 / 27.4 / 32.8
//    of headroom — the freeze is about the CONTRACT, not a near miss.)
const TEXT_STEP: Record<NonNullable<ButtonProps['size']>, 'text-sm' | 'text-base'> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
};

// Shared by every variant's container and by the gradient. Extracted so the five variants cannot
// drift apart on it — one of them silently losing centring is the exact failure a five-way copy
// invites, and no gate in this tree can see a layout property.
const CENTRE = { justifyContent: 'center', alignItems: 'center' } as const;

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  size = 'md',
  style,
  ...props
}) => {
  const press = usePress();

  const handlePress = () => {
    if (!disabled && !loading) {
      /* 🔴 THE HAPTIC WEIGHT IS PER VARIANT, AND THAT IS §5.4's ONE DOCUMENTED EXCEPTION (owner
         ruling R-1, 2026-08-04). §5.4's press-in row reads "Haptic `Light` on press-in, matching
         today's 25 `expo-haptics` sites", and this control was the odd one out on `Medium`. §0.0
         rule 2 says use the specified value; rule 1's "preserve existing behaviour" governs only
         where no ruling exists. 🟢 The design's premise was CHECKED rather than taken (`O-99`):
         measured across app+components, Light is at 38 sites and Medium at 24, so Light genuinely is
         the app's dominant impact weight.
         🔴 BUT HAPTIC WEIGHT IS A SIGNAL, NOT A STYLE. A heavier tap on an irreversible action is a
         deliberate cue, and flattening every variant to Light would remove weight from the most
         consequential control in the app. So `danger` KEEPS `Medium`, permanently.
         🟢 AND IT IS A GUARD RATHER THAN A FIX, WHICH IS WHY IT READS AS DEAD CODE TODAY. Measured
         at the ruling: `variant="danger"` has ZERO call sites, and every destructive control in the
         tree is still hand-rolled — DeleteAccountModal's "Delete My Account" is a bare
         TouchableOpacity (X20's `height: 56`), and the irreversible act itself fires a `Warning`
         NOTIFICATION rather than an impact. So NOTHING destructive lost weight when Light landed;
         the two `<Button>`s in that modal are both the outline CANCEL, which SHOULD be lighter.
         🔴 THE HAZARD IS THE FUTURE ABSORPTION, AND primitives-plan §2.2 ANTICIPATES IT BY NAME:
         "if §9's Button/Sheet absorb these two hand-rolled buttons, X3 takes over and X20 retires."
         On the day that happens the destructive action inherits this control's haptic silently, and
         nothing in the tree would say so. Deriving it HERE, once, per variant, is the same argument
         R-4 already makes for the destructive FILL colour one property over — that pairing has been
         a contrast defect three times, every time from re-deriving at the site. */
      Haptics.impactAsync(
        variant === 'danger'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
      onPress();
    }
  };

  const height = SIZE_HEIGHT[size];
  const textStyle = t.txt(TEXT_STEP[size]).style;
  const widthStyle: ViewStyle = fullWidth ? { width: '100%' } : {};
  // V-6: THE CONTAINER-OPACITY HACK IS RETIRED. `opacity: 0.5` on the whole button dimmed its
  // FILL as well as its label, so a disabled primary button faded into the page AND its label
  // fell further below AA at the same time. The design ships a dedicated disabled foreground role
  // (38% white while held) paired with **opacity: 1** — the fill stays at full strength
  // and only the LABEL reads as unavailable. §1.6b V-6.
  const isDisabled = disabled || loading;
  const disabledOpacity = 1;
  // 🔴 A5: the primary variant's label sits on an ACCENT-FILLED gradient, so its only legal
  //    foreground is the on-accent role (CLAUDE.md's rule; design §2.2). It was the plain
  //    foreground = 2.15:1 — and this is the app's PRIMARY BUTTON PRIMITIVE, so it is the single
  //    highest-traffic A5 site in the codebase. No §1.6b row, no gate hit and no allow-list named
  //    it: the fill is a LinearGradient `colors={...}` array, which no proximity grep treats as a
  //    background at all.
  // 🆕 THE SAME PAIRING IS WHAT THE FIFTH VARIANT IS FOR, and it is R-4, which is PERMANENT:
  //    a destructive action is a danger FILL with an on-accent label, measured 5.60:1, and no red
  //    copy anywhere beside it. That button has been a contrast defect three times in this repo
  //    (4.83:1 on main -> 3.76:1 at 1b's C7 remap -> 3.26:1 at the pass-5 flip), and every one of
  //    the three came from re-deriving the colour AT THE SITE. Deriving it HERE, once, is the fix.
  const onFillLabel = isDisabled ? t.color['fg-disabled'] : t.color['on-accent'];
  const onSurfaceLabel = isDisabled ? t.color['fg-disabled'] : t.color.accent;

  const isPrimary = variant === 'primary';
  const labelColor = isPrimary || variant === 'danger' ? onFillLabel : onSurfaceLabel;

  // 🔴 THE FIVE VARIANTS ARE FIVE STYLE OBJECTS, NOT FIVE RETURNS. Before §9 item 2 this file
  //    held four near-identical `return (<TouchableOpacity …>)` blocks, and the a11y contract
  //    below would have had to be written five times to reach every variant. A shared contract
  //    that must be repeated per branch is a contract one branch eventually loses — and losing it
  //    is undetectable: nothing crashes, nothing renders differently, a screen reader just goes
  //    quiet on one variant. The per-variant styles are byte-equivalent to what the four blocks
  //    carried; the only variant whose container is deliberately EMPTY is primary, because its
  //    gradient child carries the corner and the centring.
  const containerStyle: ViewStyle =
    variant === 'primary'   ? {}
  : variant === 'secondary' ? { backgroundColor: t.color.surface, borderRadius: t.radius.pill, ...CENTRE }
  : variant === 'outline'   ? { borderWidth: 2, borderColor: t.color['border-strong'], borderRadius: t.radius.pill, ...CENTRE }
  : variant === 'danger'    ? { backgroundColor: t.color.danger, borderRadius: t.radius.pill, ...CENTRE }
  :                           { borderRadius: t.radius.pill, ...CENTRE };   // ghost

  const body = loading
    ? <ActivityIndicator color={labelColor} />
    : (
      <Text style={{ ...textStyle, fontFamily: t.family['body-semi'], color: labelColor }}>
        {title}
      </Text>
    );

  return (
    <AnimatedTouchable
      onPress={handlePress}
      disabled={isDisabled}
      /* 🔴 `activeOpacity={1}` DISABLES THE BUILT-IN FADE, AND IT IS REQUIRED RATHER THAN TIDY. §5.4:
         "No `activeOpacity` guesswork." Left at 0.8 it would compose TWO opacity curves with two
         different durations on one gesture — the platform's untimed fade over the token's 90ms — and
         the result is neither value. */
      activeOpacity={1}
      /* 🔴 BOTH HANDLERS SIT BEFORE THE SPREAD, which is this file's stated convention for the a11y
         contract too: a call site that passes its own always wins. ⚠️ THE CONSEQUENCE IS REAL AND IS
         MEASURED RATHER THAN ASSUMED — a caller passing `onPressIn` would silently lose the press
         feedback. Measured across app+components: ZERO of the call sites pass either handler, so the
         convention costs nothing today. If one ever does, compose rather than reorder: the ordering
         is what keeps the a11y props overridable. */
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      /* 🔴 THE A11Y CONTRACT — ON THE COMPONENT, ONCE, FOR ALL 54 CALL SITES.
         Design §9 row 2 specifies it per component; this is NOT the label/role SWEEP that
         primitives-plan §0.0 rule 5 descoped (that is ~93 files of per-site labels, and it
         stays cut). Measured before this commit: the whole app carried ZERO accessibilityRole.
         · the label is given EXPLICITLY rather than derived from the Text child, because in the
           loading state there IS no Text child — the child is a spinner, and a screen reader
           would announce an unnamed button. "Loading keeps the label" is design §9's own wording.
         · `busy` is the loading half and `disabled` is both halves: a button mid-request is not
           actionable, so it must not read as available.
         🔴 ORDERING IS LOAD-BEARING AND IT IS THE textDefaults LESSON: these sit BEFORE the
            spread, so a call site that passes its own always wins. */
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      /* 🔴 X3 — `style` IS SPREAD LAST, SO A CALL SITE'S `height` WOULD BEAT THE ONE ABOVE.
         That is the one way X3 can be defeated from outside this file, tsc permits it, and no
         grep over this module could ever see it. `primitive-adoption-check.js` reads the JSX
         attribute at every call site instead — currently 0 of 54. */
      /* 🔴 THE PRESS STYLE IS LAST, AFTER the call site's `style`, and that inverts this line's own
         X3 warning DELIBERATELY: a caller must be able to beat the defaults, but nothing may beat the
         press feedback, or one screen's `opacity` would silently kill it. The two properties it sets
         are `opacity` and `transform`; every other property a caller passes is unaffected.
         ⚠️ `opacity: disabledOpacity` (V-6's fixed 1) stays where it is. It is the DISABLED
            treatment and it is not in conflict: a disabled button never fires `onPressIn`. */
      style={[{ height, opacity: disabledOpacity, ...containerStyle, ...widthStyle }, style, press.style]}
      {...props}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[t.color.accent, t.alpha(t.color.accent, 90), t.alpha(t.color.accent, 80)]}
          /* GRADIENT-FG(on-accent) — the A6 rule's one DECLARATION, and it is here because this
             element's child is `{body}`, a variable holding either a <Text> or a spinner. So the
             gradient's subtree contains no text element and the rule measured ZERO pairs on the
             very site it was written for. It read green. The role is declared once and then
             MEASURED against every stop, so a wrong role gives a wrong number rather than a pass —
             and `labelColor` above derives the same role for all 60 call sites. */
            /* X3 + design §2: this is the ONE LinearGradient the design KEEPS (`aura`
               replaces the other 21). Its three stops were primaryBg / primaryLight /
               pink, which V-1 and V-3 would collapse to a single flat accent. Held as a
               one-hue alpha ramp so the gradient STRUCTURE survives the colour pass;
               the screens phase owns what the clay button finally looks like.
               🔴 P77 — THE RANGE IS CLAMPED, AND THE FLOOR IS A CONTRAST FLOOR, NOT A TASTE
                  ONE. The ramp used to run 100 / 85 / 70. Because stops 2 and 3 are
                  TRANSLUCENT, the composited fill darkens toward whatever sits behind the
                  button, and the on-fill label needs the fill's relative luminance to stay
                  at or above 0.211 to clear 4.5:1. Measured against the darkest ground in
                  the palette (the canvas step, which is also the darkest thing any of the
                  60 call sites sits on): the old third stop composited to luminance 0.173 =
                  3.85:1, and the ramp CROSSED 4.5:1 at 74.7% of the diagonal, so the last
                  25.3% of the app's primary control was sub-AA for its own label.
                  🔴 THE OWNER'S RULING WAS CLAMP THE RANGE — not recolour the label (A5
                     leaves exactly one legal one) and not flatten the fill (a visible design
                     change to 60 sites, larger than the defect requires). So the ramp keeps
                     three stops, keeps its direction and keeps two thirds of its span:
                       stop 1  opaque      luminance 0.348   6.86:1
                       stop 2  90%         luminance 0.282   5.72:1
                       stop 3  80%         luminance 0.224   4.72:1  <- the floor
                     Minimum along the WHOLE span, over the canvas step: 4.72:1. Over the
                     other four surface steps it is higher (4.80 / 4.88 / 4.97 / 5.03), because
                     a lighter ground raises a translucent composite.
                  ⚠️ BOTH REMAINING VALUES SIT ON THE 5-STEP OPACITY SCALE, which `alpha()`
                     asserts at runtime — 78% would be the exact floor and is not a legal step.
                  🟢 ALL THREE STOPS ARE ONE HUE, so premultiplied and straight-alpha
                     interpolation agree to the byte along the whole ramp (`O-103`): only the
                     alpha varies, and a constant colour times a linear alpha is linear either
                     way. That is why checking the stops is sufficient HERE and is not
                     sufficient in general — see the A6 rule's header.
                  🔴 X3 IS UNTOUCHED. X3 governs DIMENSIONS: the three heights and this
                     element's 100%/100%. A stop list is not a dimension. */
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          /* 🔴 X3's second half. 100%/100% of an explicitly-sized parent — NEVER padding. */
          style={{
            width: '100%',
            height: '100%',
            borderRadius: t.radius.pill,
            ...CENTRE,
          }}
        >
          {body}
        </LinearGradient>
      ) : body}
    </AnimatedTouchable>
  );
};

export default Button;
