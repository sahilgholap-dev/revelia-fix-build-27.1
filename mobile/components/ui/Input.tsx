import React, { useCallback, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  TouchableOpacity,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useErrorEntrance } from '@/lib/motion';
import * as t from '@/theme';

/**
 * Input — §9 item 5. 7 files, 15 call sites (measured 2026-08-03; design §9 row 5's "9" is a
 * SCREEN share, not a file or site count — codemod-plan §3.0.2 class 7 again).
 *
 * ── 🔴 `label` IS REQUIRED, AND IT IS THE WHOLE SAFETY ARGUMENT FOR THE PLACEHOLDER ROLE ──
 *
 * design §2 row 9 gives the placeholder role FOUR ratios, one per surface step, and marks it
 * sub-AA by design. 🔴 THE COLUMN THAT APPLIES HERE IS THE LAST ONE: this component's own fill
 * is the overlay step, where that role measures **2.73:1** — not the 3.30:1 headline, which is
 * measured against the canvas the placeholder never sits on. So it is the weakest foreground in
 * the palette, on the ONE component that uses it, and it must never carry information a user
 * needs.
 *
 * 🔴 THAT IS SAFE BY CONSTRUCTION AND ONLY BY CONSTRUCTION: `label: string` with NO default and
 *    NO `?`, so a placeholder-only field DOES NOT COMPILE. Making it optional again is a one-
 *    character edit that re-opens the defect at every call site at once, silently, with every
 *    gate in the tree reading green — the placeholder still renders, it just becomes the label.
 *    Four of the fifteen sites were exactly that shape before this item.
 *
 * ── 🔴 THE FOCUS STATE, AND WHY IT IS THE ACCENT ROLE RATHER THAN design §2 ROW 12's ─────────
 *
 * There was NO focus state before this item — the edge read `error ? danger : subtle` and
 * nothing else, so a keyboard or switch-access user had no indication of which field was live.
 * WCAG 2.4.7 makes that a requirement.
 *
 * design §2 row 12 assigns the strong neutral edge to a focused field. 🔴 MEASURED, IT CANNOT
 * CARRY THE SIGNAL, and the numbers are the ruling:
 *
 *      strong neutral edge over this fill   1.61:1
 *      subtle  neutral edge over this fill  1.20:1
 *      🔴 the CHANGE BETWEEN THE TWO STATES  1.33:1   <- the number that matters
 *      the accent role over this fill       6.04:1
 *
 * WCAG 1.4.11 wants 3:1 for the visual information that identifies a state. A state edge that
 * differs from the resting edge by 1.33:1 is not a weak indicator, it is an ABSENT one — on a
 * low-brightness panel outdoors it cannot be made out at all, and no gate here could ever see it.
 *
 * ── 🔴 AND THE RESTING EDGE WAS THE OTHER HALF OF THE SAME SENTENCE — FIXED 2026-08-04 ───────
 *
 * The block above fixed the STATE and left the BOUNDARY, and the two are one clause of 1.4.11.
 * The subtle neutral edge measures **1.20:1 on this component's own fill**, so an unfocused field
 * had no identifiable boundary at all: the fill is one 1.08:1 step off the card behind it, which
 * is a slightly different rectangle rather than a control. That is `O-87`, registered as `P62`,
 * and the register's own ruling was that ONE change here fixes all fifteen call sites rather
 * than patching two of seventeen forms across the app.
 *
 * 🔴 SO THE RESTING EDGE IS NOW THE CONTROL-BOUNDARY ROLE — the third neutral, added to the
 *    palette for this, at **3.37:1 on this fill** and ≥3.20 on every other ground in the system.
 *    Do not "simplify" it back to either older neutral; both are structural roles whose job is to
 *    be nearly invisible, which is the one thing a control boundary must not be.
 *
 * 🔴 BUT RAISING IT BROKE THE STATE THE BLOCK ABOVE HAD JUST FIXED, and this is the whole reason
 *    the width step below exists. Only the resting colour moved, so the SEPARATION collapsed:
 *
 *      resting -> focused, before   5.01:1
 *      resting -> focused, after    1.79:1   <- the number the block above says is the one
 *      resting -> error,   after    1.27:1
 *
 *    Both edges are individually legal against the fill (3.37 and 6.04); they are simply no longer
 *    legible as a CHANGE. ⚠️ Measured across all sixteen boundaries this role landed on, the
 *    separation FELL at five and ROSE at four — and this is the only site where nothing else moves
 *    with the edge. Every other falling site changes a fill, a stroke width, an icon or its own
 *    content in the same transition, so the state survives there without help.
 *    🔴 THE GENERAL RULE, because it will recur the next time a resting value is raised: a
 *       contrast fix to ONE END of a state pair is a change to the PAIR. Re-measure the other end
 *       before committing (`O-88`).
 *
 * ── 🔴 AND THE SECOND RULE THAT CAME OUT OF IT — `O-93`, and it is why row 12 lost this job ───
 *
 * **A STATE INDICATOR MUST NEVER BE LESS PROMINENT THAN THE RESTING STATE IT REPLACES.** Measured
 * across the thirteen state pairs the boundary role landed on, twelve gained and one INVERTED, so
 * it is a class rather than a site and it is asserted rather than remembered.
 *
 * 🔴 THIS COMPONENT IS SAFE ONLY BECAUSE IT ALREADY DIVERGED FROM design §2 ROW 12. On this
 *    component's own fill:
 *
 *      the strong neutral edge   1.61    <- what row 12 assigned to a focused field
 *      the resting edge now      3.37
 *      the accent role           6.04    <- what this file actually renders
 *
 *    So applying the shipped design row AS WRITTEN would now make the focused state **2.09x LESS
 *    PROMINENT than the resting one** — an inversion, not a weak signal. 🟢 ROW 12'S "focused
 *    Input" IS DELETED AT THE SOURCE (design §2.3.1) rather than left as a registered divergence,
 *    because a discrepancy a later reader can "correct" back is a defect with a delay on it. The
 *    `absent` assertion on the strong neutral in this module's contract is the mechanical half and
 *    it stays — it is what resisted this row for a whole phase.
 *
 * ⚠️ SEPARATION AND ORDERING ARE DIFFERENT DIAGNOSTICS. The one inverted site's separation ROSE
 *    while its ordering flipped, so a check on the distance between two states cannot see an
 *    inversion — it reads the same number either way round. Compare PROMINENCE, never distance.
 *
 * ⚠️ THE WORD THAT SENTENCE ORIGINALLY USED MANUFACTURED A LIVE TAILWIND RULE OUT OF THIS
 *    COMMENT — `O-48`, instance 9, and `--diff` was again the only witness. The pre-flight for
 *    this item probed the resolved rule set for the bare utility names ordinary English reaches
 *    for, found the negation's ROOT already resolving, and concluded the family was safe.
 *    🔴 IT IS NOT: a word being present in the rule set says NOTHING about its negation, which is
 *    a separate utility with a separate name. The probe must list the exact words to be written.
 *
 * 🔴 SO THE RULE IS THE ROLE ONE, NOT THE VALUE ONE: an edge that SIGNALS selection, focus or
 *    active state is an ACCENT role. An edge that SEPARATES two surfaces is a neutral role.
 *    They cannot share a token — the neutral pair exists to be quiet, which is the one thing a
 *    state indicator must not be. Pass 1b shipped three regressions from collapsing the two,
 *    the worst of them a consent control that read as unchecked while checked.
 *    ⚠️ This DIVERGES from design §2 row 12 deliberately and is registered; do not "correct" it
 *       back to the neutral token on the strength of that row alone.
 *
 * ── THE FIXED HEIGHT, and why it is a constant here rather than a size class ─────────────────
 *
 * design §9 row 5 pins the field at 56. 🔴 The class that would express it resolves through the
 * MIGRATION-ONLY spacing keys (theme.js correction C-b, registered as `O-39`): those keys exist
 * so today's classes keep resolving, and C-b says in terms DO NOT AUTHOR AGAINST THEM. A
 * primitive written now takes the named constant instead, which also makes the number assertable
 * by `primitive-adoption-check`'s literal check — the same treatment X3's three heights get one
 * module over.
 *
 * ── 🔴 TWO ORDERINGS AND ONE SPLIT, ALL THREE LOAD-BEARING ───────────────────────────────────
 *
 * 1. `onFocus` / `onBlur` are DESTRUCTURED OUT of the rest and re-composed. If they rode the
 *    spread they would replace this component's own handlers and the focus state would never
 *    fire — and it would fire at 14 sites and not the 15th, which is worse than never.
 * 2. The spread lands AFTER the accessibility props, so a call site can still override the name
 *    it announces. It lands after `secureTextEntry` too — that one is destructured, because the
 *    reveal control owns it.
 * 3. 🔴 THE SCALING SPLIT: the label, the helper and the error all sit OUTSIDE the fixed frame,
 *    so they grow freely and they OPT IN (the five reading steps, P23). The reveal control sits
 *    INSIDE it, so it is frozen by number for exactly the reason a Button label is (design §3.6,
 *    X3): a control label must not reflow a box whose height is pinned. That split is why the
 *    freeze here is written explicitly rather than left to the app-wide default — an explicit
 *    prop says the freeze was decided, and the app-wide one says nothing at all.
 *    🟢 It also closes part of `C-P4-5` for free: three text nodes × 15 call sites of reading
 *       copy that was frozen because a size class cannot carry a prop.
 */

// 🔴 design §9 row 5. See the constant's paragraph above before changing it — and note that the
//    frame is what carries this, so a call-site `style` reaches the field and not the frame.
const FIELD_HEIGHT = 56;

interface InputProps extends TextInputProps {
  /** 🔴 REQUIRED, and no default. See the header — this is what makes the placeholder safe. */
  label: string;
  /** Sits below the field and doubles as the announced hint. */
  helper?: string;
  /** Renders the danger-coloured marker the source screens already showed beside a label. */
  required?: boolean;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helper,
  required,
  error,
  leftIcon,
  rightIcon,
  containerClassName,
  className,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );
  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  // Error outranks focus: a field that is both wrong and live still needs to read as wrong.
  //
  // 🔴 THE WIDTH IS PART OF THE STATE, NOT DECORATION, AND IT IS HERE BECAUSE FIXING THE RESTING
  //    EDGE BROKE THE FOCUS EDGE. See the header's third block for the measurement: raising the
  //    resting edge to the 3:1 floor moved the RESTING/FOCUSED separation from 5.01 to 1.79,
  //    because only one of the two colours moved. A doubled stroke is a non-colour state cue,
  //    1.4.11 credits it, and both other selectable controls in this app already express state
  //    that way. Deleting it re-opens the state defect while every ratio in the file still reads
  //    legal on its own.
  /* §5.4's error row, keyed on the MESSAGE — see the note at the render site. */
  const errorEntrance = useErrorEntrance(error);

  const edge = error
    ? 'border-2 border-danger'
    : isFocused
      ? 'border-2 border-accent'
      : 'border border-border-control';

  return (
    <View className={`mb-4 ${containerClassName || ''}`}>
      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.3}
        className="text-fg-secondary text-sm font-body-semi mb-2"
      >
        {label}
        {required ? <Text className="text-danger font-body-semi">{' *'}</Text> : null}
      </Text>
      <View
        style={{ height: FIELD_HEIGHT }}
        className={`flex-row items-center bg-surface-overlay rounded-md px-4 ${edge}`}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          className={`flex-1 text-fg text-base ${className || ''}`}
          placeholderTextColor={t.color['fg-placeholder']}
          secureTextEntry={isSecure}
          accessibilityLabel={label}
          accessibilityHint={helper}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            accessibilityRole="button"
            // The visible word IS the accessible name, so no separate label is invented here.
            // 🔴 hitSlop, not padding: the frame's height is pinned, so the touch area has to
            //    grow where nothing lays out. 22 + 28 = 50 against the 48 minimum.
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            className="ml-2"
          >
            <Text
              allowFontScaling={false}
              className="text-accent text-sm font-body-semi"
            >
              {isSecure ? 'Show' : 'Hide'}
            </Text>
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <View className="ml-2">{rightIcon}</View>
        )}
      </View>
      {helper ? (
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          className="text-fg-muted text-xs font-body mt-1"
        >
          {helper}
        </Text>
      ) : null}
      {/* 🔴 §5.4's ERROR ROW — `dur-base` 220 / `ease-standard`, opacity + a 4dp rise, and NO SHAKE.
          §5.4's own note is the argument: "an error that jitters reads as a crash." This is the app's
          most frequent error surface, so it is the one that had to take the token.
          ⚠️ THE ANIMATION IS KEYED ON THE MESSAGE, NOT ON MOUNT, and that is the whole distinction:
             a field can fail twice with two different messages and the second must animate too. So
             `useErrorEntrance` deliberately carries NO `useRef` guard — §5.3 rule 2 governs
             ENTRANCES, and a state change is not a mount.
          ⚠️ `accessibilityLiveRegion` STAYS. It is the half a screen reader hears, and the animation
             is the half a sighted user sees; neither substitutes for the other. */}
      {error ? (
        <Animated.Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          accessibilityLiveRegion="polite"
          className="text-danger text-xs font-body mt-1"
          style={errorEntrance}
        >
          {error}
        </Animated.Text>
      ) : null}
    </View>
  );
};

export default Input;
