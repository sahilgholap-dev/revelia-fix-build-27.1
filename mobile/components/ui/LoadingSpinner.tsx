import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import * as t from '@/theme';

/**
 * LoadingSpinner — §9 item 12, the loading system. 🔴 THIS IS NOW THE ONLY SCREEN-DENSITY
 * LOADING SURFACE IN THE APP, and making that true was the item.
 *
 * ── 🔴 WHAT THE PRE-FLIGHT FOUND: TWO COMPONENTS FOR ONE DENSITY, DIVERGING ON THE MESSAGE ───
 *
 * `components/common/LoadingView` rendered the SAME THREE THINGS as this module's full-screen
 * branch — the canvas fill, the centred indicator, a message below it — and the two disagreed on
 * the only thing they could disagree about:
 *
 *      this module    the message was the meta role at the 15 step
 *      LoadingView    the message was the PRIMARY foreground at the 18 step
 *
 * Two implementations of one density, seven call sites between them, and neither carried an
 * accessibility role — so a screen reader on a loading screen announced a bare string, or nothing
 * at all. 🔴 AND THE DUPLICATION MADE THE ITEM'S OWN INVARIANT UNVERIFIABLE: "never two densities
 * at once on one screen" cannot be checked while one density has two components. LoadingView is
 * deleted and its four call sites moved here; the gate asserts that element is gone tree-wide,
 * which is the one DECREASING counter this item gets (§1.3 assertion 3).
 *
 * The message keeps THIS module's values rather than a blend — the surviving component's own
 * source, per §0.0 rule 1 — so the four migrated screens move to the meta role at the 15 step.
 * design §9 row 12 specifies no step for it, and §2 row 8 puts a loading message squarely in the
 * meta role's own list. Reported rather than blended, because a value nobody specified should not
 * be invented in the middle of a merge.
 *
 * ── THE THREE DENSITIES, AND ONLY TWO OF THEM EXIST ─────────────────────────────────────────
 *
 *   1  skeleton (a known layout)   🔴 NOT BUILT — see below
 *   2  inline (a button or row)    lives inside `Button`, which owns its own indicator
 *   3  screen (first paint)        THIS MODULE
 *
 * 🔴 THE SKELETON DENSITY IS DELIBERATELY NOT BUILT, and the reason is that its component was
 *    DELETED EARLIER IN THIS PHASE as dead code (§3.2, with owner confirmation). Rebuilding it now
 *    would create a component with ZERO call sites — the exact defect the standing rule names, and
 *    the one item 3 deleted an option for. Its specified treatment is also a SHIMMER.
 *
 * ── 🟢 RULED: **DELIBERATELY OMITTED, NOT DEBT** (owner ruling R-2, 2026-08-04) ─────────────
 *
 * 🔴 THE MOTION HALF OF THE ARGUMENT ABOVE EXPIRED ON 2026-08-04 — motion came back IN — so the
 *    question was re-opened rather than left to inherit a stale premise. It was RULED, and the answer
 *    is that the shimmer is **not built and is not owed**:
 *
 *   1. zero component and zero call sites, so building it creates the defect the standing rule names;
 *   2. 🔴 AN INFINITE SHIMMER IS THE ONE MOTION THAT RUNS **CONTINUOUSLY**, which contradicts §5.3
 *      rule 2 outright — "every entrance plays once, `useRef`-guarded". A loading placeholder is not
 *      an entrance, so it cannot be brought under that rule; it can only sit outside it;
 *   3. a STATIC skeleton is more consistent with the calm direction than a sweeping highlight.
 *
 * ⚠️ THE ONE LEGITIMATE CONTINUOUS LOOP IN THE SYSTEM IS THE WAIT SCREEN'S AURA (R-3), and the
 *    distinction is the rule rather than the exception: **a continuous loop is legitimate ONLY where
 *    it communicates ONGOING WORK.** The aura breathes on a 60-second server call, so it is a
 *    LIVENESS SIGNAL. A shimmer on a skeleton is decoration, and decoration does not earn a loop.
 *
 * 🔴 SO THIS IS AN OMISSION WITH A REASON, NOT A GAP WITH A DEBTOR. Nothing owes it, no counter
 *    tracks it, and a later session must not "finish" it on the assumption that it was missed.
 *
 * ── 🔴 "NEVER TWO AT ONCE ON ONE SCREEN" CANNOT BE MECHANISED, AND THAT IS WORTH WRITING DOWN ─
 *
 * The invariant is about SIMULTANEITY, and static text cannot decide it: nine files mount more
 * than one indicator and eight of them are mutually-exclusive branches that never co-render. A
 * per-file count would over-find on eight of nine — the disarming direction, which is how
 * `no-white-on-accent` became report-only. So this stays prose, like the on-accent rule it
 * resembles, and the one real instance is registered with a named owner rather than gated.
 *
 * That instance: the SPLASH mounted this component AND a second indicator as its immediate
 * sibling, the second one fully transparent. It rendered nothing, it animated anyway on the app's
 * first paint, and it reserved layout. 🟢 **CLOSED BY THE FUNNEL-SCREENS PHASE, IN THE SPLASH'S OWN
 * COMMIT — which is the debtor this paragraph named.** It was not deleted here because that column
 * is vertically centred, so removing roughly thirty points of column height MOVES THE WHOLE SPLASH,
 * and a visible shift on the first screen every user sees is not a tidy-up to slip into a
 * loading-system commit. It is precisely a change to make in the commit that lays that column out.
 * ⚠️ Its own history is the reason it survived so long: it was authored as a fallback for this
 * component's utility classes failing to resolve on a device, was made fully transparent when the
 * diagnostic instrumentation was stripped four builds later, and lost the comment explaining it in
 * the same strip. The rewrite above then removed the failure mode it guarded. **So this module now
 * mounts one indicator per screen, everywhere, and the invariant is checkable by reading.**
 *
 * ⚠️ A dead gradient import was removed. It is why `UI-audit` §8 counts this module among the
 *    twenty-one files using that library; the real number is one lower.
 */
interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  text,
  fullScreen = false,
}) => {
  const content = (
    /* design §9 row 12's a11y contract, on the group rather than per node: the indicator and its
       message are ONE announcement. The role is indeterminate, so it carries no value — a progress
       role with a value would claim a completion figure this surface does not have.
       ⚠️ The design's literal label is the generic word for the state. Where a call site supplies a
       message, that message IS the loading label and is used instead: announcing the generic word
       over it would discard the only screen-specific information present. */
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={text || 'Loading'}
      className="items-center justify-center"
    >
      <View className="relative">
        <ActivityIndicator size={size} color={t.color.accent} />
      </View>
      {text && (
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          className="text-fg-muted text-sm font-body mt-4"
        >
          {text}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        {content}
      </View>
    );
  }

  return content;
};

export default LoadingSpinner;
