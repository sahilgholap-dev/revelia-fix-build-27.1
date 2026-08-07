import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import * as t from '@/theme';

/**
 * lib/motion.ts — THE ONE PLACE A DURATION OR A CURVE IS RESOLVED. Design §5 + §18.
 *
 * ── 🔴 WHY IT IS A MODULE AND NOT A CONVENTION ────────────────────────────────────────────
 *
 * The colour pass has `theme.js` and a gate that greps for raw hex. Motion had NEITHER, and the
 * result was measurable before a single line of this phase was written: **eight files, 45 animation
 * sites, and not one value from the design.** Fourteen distinct raw durations were live —
 * 0, 200, 250, 260, 280, 300, 800, 1000, 1500, 3000, 12000, 25000, 45000, 60000 — against a spec
 * that names SIX. Three files carried three different easing recipes with no name between them.
 *
 * 🔴 AND MOTION DRIFTS BACK IN EXACTLY AS COLOUR DID, for a reason worth stating: a raw duration
 *    RENDERS FINE. There is no crash, no type error and no visual defect a reviewer can point at —
 *    a 250ms fade beside a 220ms fade is invisible in isolation and reads as sloppiness only in
 *    aggregate, which is the one thing a code review never sees.
 *
 * ── THE BOUNDARY THIS FILE EXISTS TO CREATE ───────────────────────────────────────────────
 *
 * 🔴 `Easing.` MAY APPEAR IN THIS FILE AND NOWHERE ELSE IN `app/` OR `components/`, and
 *    `scripts/motion-arrival-check.js` asserts BOTH halves — zero outside, NONZERO here. The second
 *    half is the one that matters: a boundary rule whose protected side is empty is a rule guarding
 *    nothing, and that is how a gate reads green after the thing it guards has been deleted.
 *
 * ⚠️ THE FOUR CURVES ARE BUILT BY INDEX, NOT BY SPREADING THE TOKEN ARRAY. `theme.js` is plain JS,
 *    so `t.motion.easing.standard` infers `number[]` and `Easing.bezier(...arr)` does not typecheck
 *    against a four-argument signature. Indexing keeps `tsc` clean with no cast — and a cast here
 *    would be the one place a wrong-length token array could pass silently.
 */

const bez = (c: readonly number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);

/** §5.1 — the six durations, verbatim from the token file. */
export const dur = t.motion.duration;

/**
 * §5.2 — the four curves.
 * ⚠️ `linear` is `Easing.linear`, not a bezier: the token file spells it as a NAME because the same
 *    token has to be writable on the className path, where there is no bezier at all.
 */
export const curve = {
  standard: bez(t.motion.easing.standard),
  enter: bez(t.motion.easing.enter),
  exit: bez(t.motion.easing.exit),
  linear: Easing.linear,
};

/*
 * 🔴 THE SECOND CURVE FAMILY IS **DELETED**, 2026-08-06, AND THE DELETION IS THE RECORD.
 *
 * This module used to export a `navTiming` spec built from the same token array in REACT NATIVE's
 * `Animated` easing family, because `@react-navigation/bottom-tabs` drives its scene transition
 * with that renderer rather than with reanimated and cannot accept an `EasingFunctionFactory` at
 * all. It existed so that the tab switch could be retimed onto `dur-base` 220 / `ease-standard`
 * without putting an `Easing.` call in a layout file.
 *
 * 🔴 THE OWNER REVERTED THE TAB SWITCH TO A CUT ON THE STRENGTH OF A DEVICE PASS (design §5.4 now
 *    records the whole row as unmeetable), so the spec's only consumer is gone — and an exported
 *    helper with zero call sites is precisely what this file's closing note and the arrival gate's
 *    rule 9 forbid. It is removed rather than kept "in case", which is the same discipline that
 *    staged `usePress` and `usePlateEntrance` in with the items that call them.
 * ⚠️ CONSEQUENCE WORTH INHERITING: `Easing.` now resolves ONLY through reanimated in this tree, so
 *    the boundary rule's protected side is one family again. If a navigator ever needs a curve
 *    again, rebuild the family here — never at the layout file, which is what the boundary is for.
 */

/**
 * 🔴 THE ARRIVAL CLEARANCE — the one number every entrance in this module waits out before it
 *    starts, and the reason the entrances are observable at all.
 *
 * ── THE DEFECT IT CLOSES, AND IT IS THE **SECOND** MECHANISM, NOT A SECOND GUESS ───────────
 *
 * Deleting the alpha channel (see the hook below) fixed WHICH CHANNEL the entrance travelled on.
 * It did not touch WHEN the entrance ran, and the schedule was the other half: `useEntrance` still
 * started as the screen was being brought in and resolved at roughly the moment the container
 * finished arriving. So the fade no longer completed invisibly — the RISE did.
 *
 * The measured containers are the same list `motion-arrival-check.js` LEG C carries: the root stack
 * fade **150ms** and a nested stack **133ms** (API 33+) / **200ms** (pre-33). An entrance that
 * starts at 0 is finishing while the last of those is still running.
 * ⚠️ THE LIST WAS THREE UNTIL 2026-08-06 AND THE THIRD WAS THE LONGEST. The tab scene cross-fade at
 *    `dur-base` **220** set the floor; the owner reverted that transition to a CUT (design §5.4),
 *    which drops the floor to **200**. 🔴 THE CONSTANT DOES NOT MOVE, and that is the point of
 *    reading it as a floor rather than as a fitted value — 300 still clears 200, and re-tuning a
 *    shared front-load every time a container changes is how a derived number becomes a magic one.
 *
 * 🔴 IT IS `dur-moderate` BECAUSE §0.0 RULE 2 FORBIDS AUTHORING A NUMBER HERE. The requirement is
 *    "clear the longest container animation"; the nearest SPECIFIED value that does is
 *    `dur-moderate` **300**. A hand-picked 250 would be a seventh duration in a system that names
 *    six, and it would be a number no document could be checked against.
 *
 * 🔴 AND THE DELAY IS ONLY SAFE BECAUSE THE ALPHA CHANNEL IS GONE. Record the dependency, because
 *    it is the whole licence for waiting: with an alpha ramp, a 300ms wait means **300ms of blank
 *    screen** — the content genuinely is not there. Rise-only means the content is PAINTED for the
 *    entire wait and merely sits 12dp low, so the delay costs nothing and risks nothing.
 *    **Anyone re-adding an alpha ramp to `useEntrance` re-arms a blank-screen risk that this
 *    constant then makes 300ms long.** The two edits are one edit.
 */
const TRANSITION_CLEARANCE = dur.moderate;

/**
 * §5.4 — THE SCREEN-CONTENT ENTRANCE. `dur-moderate` 300 / `ease-enter`, a rise of
 * `t.motion.entranceRise` **12dp**, **once per FOCUS**.
 *
 * ── 🔴 THE ALPHA CHANNEL WAS REMOVED HERE ON 2026-08-06, AND IT IS THE FIX FOR "NO MOTION" ──
 *
 * 🔴 A NAVIGATOR'S FADE AND THIS HOOK'S FADE ARE THE SAME CHANNEL, AND THEY MULTIPLY. The container
 *    is faded in by the navigator while the content inside it fades itself, so what the eye receives
 *    is the PRODUCT of two alpha curves. Measured against the installed animations rather than
 *    argued (`react-native-screens@4.11.1`, `@react-navigation/bottom-tabs@7.16.1`):
 *
 *      the root stack's fade      `res/base/anim/rns_fade_in.xml`       0 -> 1 over 150ms
 *      every nested stack         `anim-v33/rns_default_enter_in.xml`   0 -> 1 over  83ms @ +50
 *                                 (pre-33 base variant:                 0 -> 1 over 100ms @ +100)
 *      the tab scene cross-fade   🔴 RETIRED 2026-08-06 — the switch is a CUT (design §5.4)
 *
 *    `ease-enter` is a hard decelerate, so at 150ms this hook had already resolved **83% of its
 *    curve** — the entire perceptible part of both channels happened while the container was still
 *    arriving, and what remained afterwards was the last 17% of an alpha ramp, i.e. nothing.
 *
 * 🟢 THE RISE SURVIVES THE SAME COMPOSITION AND THE FADE CANNOT, and that asymmetry is the whole
 *    reason this is a deletion rather than a retiming. Alpha × alpha is DESTRUCTIVE — a fade inside a
 *    fade is unobservable by construction. A geometric offset is not multiplied by the container's
 *    alpha at all: at composite alpha 0.5 the content is half-visible **and still moving**, which is
 *    a cue the eye reads. So removing the colliding channel leaves the surviving one intact, with no
 *    focus listener, no `transitionEnd` dependency and no ordering race to get wrong.
 *
 * ── 🔴 AND THE DISTANCE WENT 8 -> 12, OWNER-RULED (`P97`, 2026-08-06) ──────────────────────
 *
 * **8 was specified as a COMPANION to the fade.** With the fade gone the spec's premise changed, so
 * 12 RE-DERIVES §5.3 rule 3's intent for a sole cue rather than inventing against it. Measured:
 * counting from the moment content becomes readable (composite alpha ~0.35, ~60ms), the user sees
 * roughly **4dp of travel at 8 and ~6dp at 12**.
 *
 * 🔴 IT IS ITS OWN TOKEN, AND THAT IS MANDATORY RATHER THAN TIDY. The error rise used to be written
 *    `t.motion.distance / 2`, and the gate asserts that EXPRESSION — so bumping one shared token
 *    would have moved §5.4's error rise from 4 to 6 **while every check stayed green**. `theme.js`
 *    now carries `entranceRise` 12 and `errorRise` 4 as two independent numbers, and
 *    `motion-arrival-check.js` asserts each VALUE against the token file, not merely the reference.
 *
 * ⚠️ IF 12 IS STILL IMPERCEPTIBLE ON DEVICE, **THE NEXT LEVER IS THE EASING, NOT MORE DISTANCE.**
 *    Owner ruling, and the measurement is the argument: `ease-enter` (`0, 0, 0.22, 1`) spends **83%
 *    of the 300ms curve inside the first 150ms**, i.e. it front-loads the motion into precisely the
 *    window the container fade occupies. More distance therefore buys a bigger move in a window
 *    nobody can see. And past roughly 12dp a rise stops reading as SETTLING and starts reading as
 *    SLIDING, which is the thing §5.3 rule 3 exists to prevent. **So a third attempt flattens the
 *    curve or moves the duration; it does not raise this number again.**
 *
 * ── 🔴 AND THE KEYING WENT FROM PER-MOUNT TO PER-FOCUS, OWNER-RULED 2026-08-06 ────────────
 *
 * 🔴 THE PER-MOUNT GUARD WAS THE OTHER HALF OF "NO MOTION ANYWHERE", AND IT MADE THE LOSS TOTAL.
 *    Bottom tabs KEEP THEIR SCENES MOUNTED after the first visit, so a guard that fires once per
 *    mount gives a screen **exactly one chance in the life of the app** — and that one chance
 *    landed underneath the container animation. Every later visit showed nothing at all, because
 *    the guard is doing its job. Reachable, and neither perceptible nor repeatable.
 *
 * 🔴 THE MECHANISM IS `useFocusEffect`, AND IT WAS CHOSEN OVER THE OTHER TWO CANDIDATES ON
 *    MEASURABLE GROUNDS RATHER THAN TASTE:
 *      · **the navigator's `transitionEnd`** — emitted by stack navigators only. This app arrives
 *        through THREE different containers (a root stack, a nested stack per section, and a tab
 *        navigator) and the tab one emits no such event, so the listener would be absent on one of
 *        the three paths. ⚠️ Its scene cross-fade WAS the longest of the three at 220ms until the
 *        owner reverted it to a cut; the argument for this hook is unchanged, because the missing
 *        event is a property of the navigator and not of its timing;
 *      · **`InteractionManager.runAfterInteractions`** — resolves when the JS interaction queue
 *        drains. Reanimated runs these animations ON THE UI THREAD specifically so the JS thread
 *        is not involved, so the queue can be empty while the container is still moving. It
 *        answers a question we are not asking;
 *      · 🟢 **`useFocusEffect`** — one event, identical in all three containers, fired by the
 *        navigator that owns the screen. Paired with the clearance above it needs no listener
 *        teardown, no per-navigator branch and no ordering race.
 *
 * 🔴 THE TWO EVENTS THE GUARD MUST TELL APART, AND HOW THIS DISTINGUISHES THEM — conflating them
 *    is what made the motion unobservable, so it is stated as a mechanism and not as an intent:
 *      · a **RE-RENDER** (a list re-fetch, a state write) must NOT replay — §5.3 rule 2;
 *      · a **NEW FOCUS** (the user returns to the tab) MUST replay.
 *    `useFocusEffect` subscribes to the navigator's own focus/blur events, so a re-render is not
 *    an input to it at all — **provided the callback identity is stable**, which is why it is
 *    wrapped in `useCallback`. That is load-bearing rather than idiomatic: the hook's internal
 *    effect lists the callback in its dependency array, so an inline arrow would tear down and
 *    re-subscribe on **every render** and re-fire the entrance with it. A memoised callback is the
 *    §5.3-rule-2 guard, expressed as a dependency instead of as a mutable box.
 *    🟢 `motion-arrival-check.js` LEG D asserts both halves — focus-keyed, and memoised.
 *
 * ⚠️ THE OLD GUARD'S ARGUMENT IS RECORDED BECAUSE IT WAS RIGHT ABOUT THE RISK AND WRONG ABOUT THE
 *    TRADE: "the guard makes a MISSED entrance permanent, which is worse than an imperceptible
 *    one." Measured on a device, the entrance was BOTH — missed once and then never offered again.
 *    Per-focus keying removes the permanence, and the clearance removes the miss.
 *
 * ⚠️ THE RISE IS READ FROM THE TOKEN, NOT WRITTEN HERE. §5.3 rule 3's SHAPE still governs and is
 *    untouched — content RISES, it never slides across the screen and never scales up from small.
 *    Its numeric cap of 8 is the half `P97` re-derived, for the reason above.
 *
 * 🔴 `enabled` EXISTS FOR A MEASURED REASON AND IT IS NOT A CONVENIENCE. A `Card` inside a
 *    `ScreenContainer` ALREADY receives the screen entrance, because the whole safe area rises. Give
 *    that card an entrance of its own at delay 0 and the two `translateY` curves **ADD: 12 + 12 =
 *    24dp, twice the specified rise, which is squarely the SLIDE §5.3 rule 3 exists to prevent**
 *    (it was 8 + 8 = 16 before `P97`; the argument is unchanged and the number is worse). So the
 *    card entrance is
 *    OPT-IN, at the sites that are genuinely lists and where the stagger is the point; every other
 *    card is simply PRESENT and arrives with its screen. `enabled: false` still CALLS the hook —
 *    React forbids a conditional call — but starts nothing and resolves the value to its final
 *    state, so the returned style is inert rather than absent.
 */
export function useEntrance(opts?: { delay?: number; enabled?: boolean }) {
  const delay = opts?.delay ?? 0;
  const enabled = opts?.enabled ?? true;
  const lift = useSharedValue(enabled ? t.motion.entranceRise : 0);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      /* The start state is re-armed HERE and not only at `useSharedValue`, because on the second
         and every later focus the value is already parked at its landed state. Re-arming on a
         screen that is not yet on-screen is invisible; skipping it would make every visit after
         the first a no-op, which is the defect this hook is being changed to fix. */
      lift.value = t.motion.entranceRise;
      /* ⚠️ THE WAIT GOES THROUGH `withDelay` RATHER THAN A `setTimeout`, and that is R-4 rather
         than style: `withDelay` carries `ReduceMotion.System` too, so with the OS flag set the
         clearance AND the stagger collapse along with the animation. A JS timer would keep the
         full wait and hand a reduced-motion user a list that still appears one row at a time. */
      /* 🔴 THE STAGGER IS CLAMPED AT ZERO AT THE POINT IT IS ADDED, AND THAT IS A GUARANTEE RATHER
         THAN A TIDY-UP. `delay` is the only term here a CALLER supplies, so it is the only term
         that can pull the start back INSIDE the container window the clearance exists to clear —
         and a negative index reaching `staggerFor` is one `map` refactor away. Clamping makes the
         floor a property of this line instead of a property of every call site's arithmetic, which
         is also what lets the arrival gate resolve a guaranteed minimum for this hook at all. */
      lift.value = withDelay(
        TRANSITION_CLEARANCE + Math.max(0, delay),
        withTiming(0, { duration: dur.moderate, easing: curve.enter }),
      );
    }, [enabled, delay]),
  );

  return useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));
}

/**
 * §5.4's card-entrance stagger: **40ms per item, capped at 5**, item 6+ arriving with the 5th.
 * 🔴 THE CAP IS THE POINT, not an optimisation. Uncapped, a 12-row list's last row lands 480ms after
 *    its first and the screen reads as LOADING rather than as arriving.
 */
export const staggerFor = (index: number) =>
  Math.min(Math.max(index, 0), t.motion.staggerCap - 1) * t.motion.stagger;

/**
 * §5.4 — PRESS FEEDBACK. In on `dur-instant` 90 / `ease-standard`, out on `dur-quick` 140 /
 * `ease-exit`. Opacity 1 → 0.88 and scale 1 → 0.985.
 *
 * 🔴 ONE SHARED VALUE DRIVES BOTH PROPERTIES, not two. They are one gesture, and two values can
 *    desynchronise — the press-out of one arriving before the other reads as a flicker on a control
 *    the app uses on sixty screens. The interpolation is written out rather than using a helper so
 *    that the two constants stay visible at the site that defines them.
 *
 * 🔴 THE SCALE IS LEGAL ON A `PRESERVE-BLINDLY` CONTROL FOR ONE SPECIFIC REASON, and it is worth
 *    stating because the reflex is to assume otherwise: X3 pins `Button`'s HEIGHT (48/56/64) and its
 *    gradient's 100%/100%. A transform does not participate in layout at all, so it happens INSIDE
 *    that fixed box and nothing reflows. §5.4's own words: "scale is inside X3's fixed height so
 *    nothing reflows." A width, a padding or a margin here would be the invariant violated.
 *
 * ⚠️ IT REPLACES `activeOpacity`, IT DOES NOT SIT BESIDE IT. §5.4: "No `activeOpacity` guesswork."
 *    Leaving the built-in fade on would compose two opacity curves with different durations, so the
 *    consuming control must pass `activeOpacity={1}`.
 */
/* ⚠️ NOT EXPORTED, AND THE GATE IS WHY. Both were `export const` in the first draft and
   `motion-arrival-check.js` flagged them immediately: two names exported and called from nowhere. The
   two numbers are §5.4's, they are consumed by the hook below and by nothing else, and exporting a
   constant "in case someone needs it" is the same defect as an unused hook one size down. */
const PRESS_OPACITY = 0.88;
const PRESS_SCALE = 0.985;

export function usePress() {
  const held = useSharedValue(0);
  return {
    style: useAnimatedStyle(() => ({
      opacity: 1 - held.value * (1 - PRESS_OPACITY),
      transform: [{ scale: 1 - held.value * (1 - PRESS_SCALE) }],
    })),
    onPressIn: () => {
      held.value = withTiming(1, { duration: dur.instant, easing: curve.standard });
    },
    onPressOut: () => {
      held.value = withTiming(0, { duration: dur.quick, easing: curve.exit });
    },
  };
}

/**
 * §18.1 ROW 1 — THE PLATE ENTRY. **Opacity ONLY**, `dur-slow` 420, `ease-enter`, and 🔴 **SEQUENCED
 * AFTER its host card has landed — never parallel.** §18.1's own words: *"two things arriving at once
 * reads as jitter."*
 *
 * 🔴 THE DELAY IS DERIVED, NOT TUNED: it is the clearance the host entrance waits out PLUS that
 *    entrance's own duration, so the plate still starts at the instant its host lands. A hand-picked
 *    number here would drift the moment `dur-moderate` moved, and it would drift SILENTLY — the two
 *    would simply start overlapping again.
 * ⚠️ THE `TRANSITION_CLEARANCE` TERM IS NOT DECORATION. When `useEntrance` moved behind that
 *    clearance, a plate left at the bare `dur-moderate` would have begun at 300 while its host was
 *    only THEN starting to rise — i.e. the sequencing §18.1 states in words would have inverted into
 *    a parallel arrival, with every gate green. The derivation is what stops that.
 *
 * 🔴 AND THIS HOOK IS DELIBERATELY **NOT** FOCUS-KEYED, WHICH IS THE ONE PLACE THIS MODULE SPLITS
 *    FROM `useEntrance`. The licence for waiting is stated at `TRANSITION_CLEARANCE`: a delay is
 *    free only while the content is PAINTED throughout it. This entrance is alpha-only by §18.1's
 *    explicit ruling ("opacity ONLY"), so its wait is a wait on NOTHING BEING THERE. Replaying it
 *    per focus would blank a decorative layer for 600ms on every single return to the screen —
 *    re-arming, on the one hook that cannot afford it, exactly the blank-screen risk the alpha
 *    deletion removed everywhere else.
 * 🟢 The cost of that split is bounded and is the right way round: the plate animates on first
 *    arrival and is simply PRESENT on every later visit — which is §18.1 row 3's own treatment of a
 *    hero ("simply present", no animation of its own), not a degradation.
 * ⚠️ SO THE PER-MOUNT GUARD BELOW IS A DECLARED EXCEPTION, NOT A LEFTOVER, and `motion-arrival-check`
 *    LEG D pins it at exactly one. A SECOND mount-keyed entrance is the shape that shipped the whole
 *    system unobservable.
 *
 * ⚠️ OPACITY AND NOTHING ELSE, AND ON THIS COMPONENT THAT IS A HARD LINE RATHER THAN A PREFERENCE.
 *    A plate's `<Svg>` root carries an explicit `width` and `height` (§14.4: a plate NEVER stretches),
 *    and the standing rule is that a transform is fine but touching a dimension is not. There is no
 *    scale, no rise and no draw-on here — §18.1 also rules that SVG curves do not respond to scroll
 *    and never enter independently of their section.
 *
 * ⚠️ NO `hostDelay` PARAMETER, DELIBERATELY. Measured at this item: not one of the seven plate mounts
 *    sits inside an INDEXED `Card`, so every host lands at delay 0 today. The parameter arrives with
 *    the first plate that needs it — an unused parameter is the same defect as an unused hook.
 *
 * 🟢 AND IT IS THE ONE ALPHA-ONLY ENTRANCE THAT IS STILL OBSERVABLE, WHICH IS WHY IT SURVIVED THE
 *    CHANNEL-COLLISION FIX ABOVE. It starts at 600 and finishes at 1020, so it does not begin until
 *    every navigator animation in this app has long since resolved (the longest is now a nested
 *    stack's pre-API-33 variant, done at 200). Nothing multiplies it. **`motion-arrival-check.js`
 *    LEG C asserts exactly
 *    that** — an alpha-only entrance is legal only while its wait clears the longest container
 *    animation, so shortening it would fail the gate rather than fail on a device.
 * ⚠️ REGISTERED RATHER THAN GLOSSED: 1020ms is a LONG first paint for a decorative layer, and it is
 *    the honest consequence of §18.1's sequencing meeting the clearance. It is a first-visit-only
 *    cost (the guard below), and the lever if it reads as pop-in is §18.1's sequencing rule, not
 *    this expression.
 */
export function usePlateEntrance() {
  const played = useRef(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    opacity.value = withDelay(
      TRANSITION_CLEARANCE + dur.moderate,
      withTiming(1, { duration: dur.slow, easing: curve.enter }),
    );
  }, []);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

/**
 * 🔴 THE ONE-SHOT PATH DRAW-IN — a stroked §15 primitive PAINTS ITSELF from one end to the other,
 *    once, and then rests. **OWNER-REQUESTED ADDITION, 2026-08-06.** design §18 carries the ruling
 *    and the rationale; this header carries the mechanism.
 *
 * ── ⚠️ IT IS AN ADDITION TO THE SPEC, NOT AN IMPLEMENTATION OF IT. READ THIS FIRST. ────────
 *
 * §18.1 row 2 says the §15 curves *"enter with their section's card-entrance and never
 * independently"*, and the owner asked for motion on them. The FIRST request was ambient drift; the
 * owner then ruled AGAINST any perpetual loop on battery and low-end-Android grounds, and this is
 * the resolution. 🔴 **DO NOT "UPGRADE" IT INTO A LOOP.** The drift alternative was considered and
 * DECLINED, in those terms, by the owner — and `dur-ambient` is reserved for the ONE surface that
 * communicates ongoing work (§5.5's wait screen), on the same rule that declined the skeleton
 * shimmer.
 *
 * 🟢 AND IT SATISFIES §5.3 RULE 2 RATHER THAN OVERRULING IT, which is why this shape was available
 *    when a loop was not: it plays ONCE per arrival, it costs nothing after it finishes, and a
 *    suppressed `withTiming` resolves AT ITS FINAL VALUE — offset 0, i.e. fully drawn, which is the
 *    intended resting state. **So reduced motion needs no branch of its own here.** Contrast
 *    `useAmbient`, where a suppressed `withRepeat` parks at `from` and needs the explicit override.
 *
 * ── 🔴 THE CHANNEL IS A PAINT PROP, AND THAT IS THE WHOLE REASON THIS IS SAFE ──────────────
 *
 * `strokeDashoffset` through `animatedProps` sets a property on the very node reanimated resolved,
 * so LEG B's react-native-svg CLONE problem does not apply to it — `<Svg>`'s `render()` clones the
 * `style` prop onto a second host node, and this touches no style at all.
 * 🟢 **THE MECHANISM IS ALREADY PROVEN IN THIS TREE**, which is why it needed no new technique:
 *    `CompatibilityScoreRing` has swept a `strokeDashoffset` this way since Build 27, and `Circle`
 *    is already a declared carrier in the arrival gate's WRAPPERS table. `Path` joins it there.
 *
 * 🔴 AND THE GEOMETRY IS NEVER TOUCHED. Morphing `d` is a JS-thread recalculation per frame and is
 *    exactly what §18 bans for low-end Android, which is the primary market. The path string is
 *    computed once, at its width; only the dash phase moves, on the UI thread.
 *
 * ── SEQUENCING: IT **FOLLOWS** THE HOST ENTRANCE. IT DOES NOT REPLACE IT. ──────────────────
 *
 * The delay is the same derived expression `usePlateEntrance` uses — the shared arrival clearance
 * plus the host entrance's own duration — so the draw begins at the instant the screen's content
 * block lands. §18.1's reason is verbatim: *"two things arriving at once reads as jitter."*
 * 🟢 **AND NO DOUBLE-UP IS POSSIBLE HERE, unlike the card case.** The compounding defect §5.3 rule 3
 *    guards against is two `translateY` curves ADDING (12 + 12 = 24dp). This channel is orthogonal
 *    to the host's: the section still rises with the screen, and the stroke's dash phase is not a
 *    transform at all. The section entrance is UNCHANGED — nothing was moved off it.
 *
 * 🔴 FOCUS-KEYED, OWNER-RULED, NOT MOUNT-KEYED — and the cost is stated rather than hidden. A
 *    mount-keyed draw-in would play once in the life of the app on a screen the tab navigator keeps
 *    mounted, which is LEG D's defect exactly. ⚠️ The price is that the stroke is UNDRAWN for the
 *    600ms wait on every return, because a paint-channel entrance shares the alpha-only entrance's
 *    property: its wait is a wait on nothing being painted. That is the trade §18.1 declined for the
 *    plate and the owner took here. It is registered (caveats `C-XF-3`, beside `P101`) and the lever
 *    if it reads badly is the CLEARANCE term, not the duration.
 *
 * ⚠️ THE DURATION IS `dur-slow` 420 AND THE CHOICE IS §0.0 RULE 2's, not a preference: the nearest
 *    specified analogue is the PLATE ENTRY — §18.1 row 1, `dur-slow` / `ease-enter` — which is the
 *    same thing (a decorative vector layer arriving after its host). Authoring a seventh duration
 *    for a sweep would be a number no document could be checked against.
 *
 * @param length the path's own length, in user units. See `arcLength()` in `ShapePrimitives.tsx`:
 *   it is COMPUTED from the same control points the path generator emits, never measured and never
 *   a constant. ⚠️ An UNDERESTIMATE is the unsafe direction — the dash then fails to cover the tail
 *   and a stub stays visible at the start state. An overestimate merely finishes the sweep early.
 */
export function useDrawIn(length: number) {
  const offset = useSharedValue(length);

  useFocusEffect(
    useCallback(() => {
      /* Re-armed HERE as well as at `useSharedValue`, for the same reason `useEntrance` does it: on
         the second and every later focus the value is parked at its landed state, so without this
         every visit after the first would be a no-op — which is the defect focus keying exists to
         fix. Re-arming a screen that is not yet on-screen is invisible. */
      offset.value = length;
      offset.value = withDelay(
        TRANSITION_CLEARANCE + dur.moderate,
        withTiming(0, { duration: dur.slow, easing: curve.enter }),
      );
    }, [length]),
  );

  return useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
}

/**
 * §5.4's **ERROR** ROW — `dur-base` 220 / `ease-standard`, opacity plus a **4dp** rise, and
 * 🔴 **NO SHAKE.** §5.4's own note is the reason and it is worth keeping verbatim: *"an error that
 * jitters reads as a crash."*
 *
 * 🔴 THE DISTANCE IS **HALF** THE ENTRANCE'S, AND THAT IS THE SPEC RATHER THAN A ROUNDING. §5.3 rule 3
 *    caps every distance at 8dp; an error message is a small, local arrival under a field, so it moves
 *    4. 🔴 IT WAS WRITTEN AS `t.motion.distance / 2` UNTIL `P97`, so the two would stay related if the
 *    token moved. **THAT DERIVATION IS NOW DELETED AND ITS DELETION IS THE POINT.** The entrance rose
 *    to 12 and 4 is not half of 12, so a division kept for its own sake would have quietly
 *    re-specified this number as 6 with every gate green. §5.4 names **4** verbatim, so it is its own
 *    token now and `motion-arrival-check.js` asserts its VALUE against `theme.js` rather than
 *    asserting that it is half of something. **A relationship that has stopped being true is worse
 *    than no relationship.**
 *
 * ⚠️ IT IS KEYED ON THE MESSAGE, NOT ON MOUNT, and that is what makes it an ERROR animation rather
 *    than an entrance. The same field can fail twice with two different messages and the second must
 *    animate too, so this hook has NO `useRef` guard — §5.3 rule 2 governs ENTRANCES, and a state
 *    change is not a mount. Passing the message string as the key is what distinguishes them.
 */
export function useErrorEntrance(key: string | undefined) {
  const opacity = useSharedValue(key ? 1 : 0);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (!key) return;
    opacity.value = 0;
    lift.value = t.motion.errorRise;
    opacity.value = withTiming(1, { duration: dur.base, easing: curve.standard });
    lift.value = withTiming(0, { duration: dur.base, easing: curve.standard });
  }, [key]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));
}

/**
 * §5.4's **SUCCESS** ROW — `dur-slow` 420 / `ease-enter`, opacity plus scale **0.92 → 1**.
 * 🔴 **NEVER ABOVE 1**, which is §5.3's no-overshoot rule arriving as a number: a scale that passes 1
 *    and settles back IS a bounce, whatever curve produced it. And §5.4 is explicit that there is no
 *    confetti and no pulse — the haptic carries the celebration, the motion only carries the arrival.
 * ⚠️ It starts at 0.92 rather than 0 because §5.3 rule 3 forbids scaling up from small.
 */
/* ⚠️ NOT EXPORTED, and the gate is why — the same finding as `PRESS_OPACITY` two items back: it was
   `export const` in the first draft and the helper rule flagged it immediately as a name called from
   nowhere. It is §5.4's number, consumed by the hook below and by nothing else. */
const SUCCESS_SCALE_FROM = 0.92;

export function useSuccessEntrance(active: boolean) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (!active) { progress.value = 0; return; }
    progress.value = withTiming(1, { duration: dur.slow, easing: curve.enter });
  }, [active]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: SUCCESS_SCALE_FROM + progress.value * (1 - SUCCESS_SCALE_FROM) },
    ],
  }));
}

/*
 * 🔴 WHAT IS DELIBERATELY **NOT** IN THIS FILE YET, AND WHY THAT IS A RULE RATHER THAN A GAP.
 *
 * 🟢 TWO OF THE THREE HAVE NOW RETURNED, EACH WITH ITS OWN ITEM — `useEntrance` with the screen
 * entrance and `usePress` with the button press. **`usePlateEntrance` is still out**, and stays out
 * until a plate mount calls it. The paragraph below is the original note and it is kept, not
 * rewritten, because the rule it records is the reason both returns were staged at all.
 *
 * The first draft of this module also exported `usePlateEntrance` and `usePress` — §18.1's plate
 * entry and the press feedback — alongside `useEntrance`. All three were correct, and all three had
 * **ZERO CALL SITES**, because the items that consume them had not been written. `useEntrance`
 * returned with the screen-entrance item; the other two are still out.
 *
 * 🔴 THAT IS THE `font-display` DEFECT, ONE LEVEL UP: a token existed, every gate read green, and
 *    nobody had ever seen the value render. `primitive-adoption-check.js`'s header states the rule
 *    outright — "ADD AN ENTRY IN THE COMMIT THAT LANDS THE PRIMITIVE, NEVER BEFORE AND NEVER
 *    AFTER. Before -> a contract nothing satisfies, which is a pending counter with no debtor."
 *    A hook is the same thing wearing a different shape, and the shape is more dangerous: an unused
 *    hook typechecks, reads as finished work, and is the thing a later reader assumes is wired.
 *
 * 🟢 SO EACH ARRIVES IN THE COMMIT OF THE ITEM THAT CALLS IT, and `motion-arrival-check.js` asserts
 *    the invariant directly: **every helper exported from this file has at least one call site
 *    outside it.** Adding one early now fails the gate.
 */

/**
 * §5.1 — `dur-ambient` 2600 is **the only looping duration in the system**.
 *
 * 🔴 SELF-DRIVEN, NEVER TIED TO A PROMISE (§18.4). A loop that restarts when a request retries is
 *    what users read as "it hung", and the 60-second wait screen is the surface where that reading
 *    costs the most.
 * ⚠️ IT CANCELS ON UNMOUNT. `UI-audit` §4.1 flagged that the two `withRepeat` loops already in the
 *    tree have NO teardown at all — "not a confirmed leak, but worth verifying on device", which is
 *    a device this project does not have. `cancelAnimation` costs one line and removes the question.
 *
 * 🔴 R-4 — AND THIS IS THE **ONE PLACE** THE OS REDUCED-MOTION FLAG NEEDS CODE OF OUR OWN.
 *    Everything else in this module is covered by the renderer: `withTiming`, `withDelay` and
 *    `withRepeat` all default to `ReduceMotion.System`, so with the flag set each animation resolves
 *    AT ITS FINAL VALUE and each delay collapses. 🔴 **BUT A LOOP HAS NO FINAL VALUE.** Suppressed,
 *    `withRepeat` simply never starts — which leaves this shared value parked at `from`, i.e. the
 *    aura frozen at HALF opacity forever. That is not "reduced motion", that is a dimmed screen.
 * 🟢 So when the flag is set the value is placed at `to` — the loop's BRIGHT end — and nothing is
 *    started. A reduced-motion user gets the layer present and steady, which is what it is for.
 * ⚠️ `reduced` is in the dependency list because the OS setting can change WHILE THE APP IS OPEN,
 *    and `useReducedMotion` re-renders when it does. Without it, a user who enables the setting
 *    mid-session keeps the loop running until the screen unmounts.
 */
export function useAmbient(from: number, to: number) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? to : from);
  useEffect(() => {
    if (reduced) { v.value = to; return; }
    v.value = withRepeat(
      withTiming(to, { duration: dur.ambient, easing: curve.standard }),
      -1,
      true,
    );
    return () => cancelAnimation(v);
  }, [reduced]);
  return v;
}

/**
 * A cross-fade of TEXT ONLY, in a box whose height is already reserved — §18.1 row 3 and §5.5's
 * stage label. Out on `dur-base`, a `stagger` beat, in on `dur-base`.
 * 🔴 IT RETURNS THE ANIMATION, NOT A STYLE, because the caller owns WHEN the swap happens and this
 *    module must not own a timer. A rise animation on a late arrival pushes content the user is
 *    already reading, which is why the box is reserved and only the opacity moves.
 */
export function crossFadeOut() {
  return withTiming(0, { duration: dur.base, easing: curve.standard });
}
export function crossFadeIn() {
  return withDelay(
    t.motion.stagger,
    withTiming(1, { duration: dur.base, easing: curve.standard }),
  );
}

/**
 * A progress FILL, for a score bar or a ring — `curve.linear`, because §5.2 restricts that curve to
 * "progress and loops only".
 *
 * ⚠️ THE CURVE IS NAMED BY ITS CODE SPELLING, NOT ITS UTILITY SPELLING, THROUGHOUT THIS PHASE — and
 *    that is `O-69` instance 23, measured: the utility form written in ONE comment made Tailwind's
 *    content scanner emit a live rule with ZERO call sites and moved `--diff` from 204 to 205. The
 *    scanner has no parser and does not know what a comment is.
 *
 * 🔴 AND READ WHY IT TAKES `scaleX` RATHER THAN A WIDTH: §18's contract is "opacity and transform
 *    ONLY, ZERO layout properties animated", and the two score bars in this tree animated
 *    `width: '<pct>%'` — a LAYOUT property, on every reading screen. A left-anchored `scaleX` is the
 *    same picture with no reflow, and `transformOrigin` is available from RN 0.74 (verified in the
 *    installed `processTransformOrigin.js`), so the anchor does not need a translate sandwich.
 */
export function useFill(target: number, delay = 0) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(Math.max(0, Math.min(1, target)), { duration: dur.slow, easing: curve.linear }),
    );
  }, [target]);
  return { progress: p, style: useAnimatedStyle(() => ({ transform: [{ scaleX: p.value }] })) };
}

/** Exposed so a caller can drive a value the module does not own (the wait screen's own timeline). */
export type { SharedValue };
