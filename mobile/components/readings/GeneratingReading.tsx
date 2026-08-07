import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { crossFadeIn, crossFadeOut, curve, dur, useAmbient } from '@/lib/motion';

import { Button } from '@/components/ui/Button';
import { Plate } from '@/components/ui/Plate';
import * as t from '@/theme';

/**
 * 🔴 §5.5's AURA LAYER — AND IT HAD TO BECOME AN ABSOLUTE SIBLING BEFORE IT COULD BREATHE.
 *
 * The wash used to be the flex parent, carrying `backgroundColor: t.color.bg` on the SAME element
 * (P71 / `O-103`: a translucent stop needs a NAMED ground beneath it or it composites over whatever
 * the navigator paints). 🔴 Animating that element's opacity would have faded THE GROUND TOO — the
 * whole screen dimming and brightening on a 2.6-second cycle rather than the wash.
 * 🟢 So the ground stays an OPAQUE `View` and the wash becomes a pinned, inert sibling above it, with
 *    the content a sibling above both. That is `ScreenContainer`'s grain-layer pattern verbatim, and
 *    it is a SWAP rather than an INSERTION: the flex chain is the same length it was — `flex:1` box ->
 *    `SafeAreaView flex:1` — because the gradient no longer participates in layout at all (`O-110`).
 * ⚠️ `pointerEvents="none"` because the layer sits ON TOP of the content in paint order and would
 *    otherwise swallow the retry button's touches. It is above rather than below deliberately: the
 *    wash is 14% at its strongest and reads as light falling on the screen.
 */
const AnimatedAura = Animated.createAnimatedComponent(LinearGradient);

/**
 * GeneratingReading — §9 item 7. 5 call sites. THE 60-SECOND-PLUS WAIT, where reading is the
 * entire activity, so perceived quality here is out of all proportion to the screen count.
 *
 * ── 🔴 X17 LIVES IN THIS FILE, THREE TIMES, AND ALL THREE ARE PRESERVE-BLINDLY ───────────────
 *
 * Commit `c542b20` ("Fix emoji/icon cropping: explicit dimensions + overflow visible"). Each of
 * the three is marked at its own site below. On Android they are no-ops; UI-audit §5.1 rates X17
 * "very likely" load-bearing on iOS, and codemod-plan §5.4 closed iOS verification permanently, so
 * these comments plus `primitive-adoption-check.js`'s literal assertions are the ONLY protection.
 * A mechanical assertion proves a guard SURVIVED A DIFF. It cannot prove the guard works.
 *
 * ── 🔴 THE 0.97 ASYMPTOTE IS THE PRODUCT DECISION OF THIS SCREEN, NOT AN IMPLEMENTATION ──────
 *
 * Four legs, 12s / 25s / 45s / 60s, to 0.35 / 0.65 / 0.88 / 0.97, then a plateau until the server
 * answers. 🔴 THE BAR MUST NEVER CLAIM COMPLETION. "About a minute" is a range, never a countdown:
 * a bar that reaches the end and then waits is read as a hang, and this is a screen users stare at.
 * Do not "finish" the curve, do not add a fifth leg, and do not tie it to a promise.
 *
 * ── 🔴 THE ERROR BRANCH BELOW HAS ZERO CALL SITES, AND IT IS NOT DELETED. READ WHY ───────────
 *
 * Measured at item 7: all five call sites pass `type` and NOTHING ELSE. `error`, `onRetry`,
 * `onGoHome` and `title` are unreachable, and the two capture screens render their OWN error
 * overlay on top of this component instead. By the standing rule a zero-call-site option in a
 * primitive is a DEFECT, and item 3 deleted one for exactly that reason.
 *
 * 🔴 IT SURVIVES BECAUSE DELETING IT WOULD DELETE AN X-INVARIANT. The retry control carries X17's
 *    lower width bound, and primitives-plan §0.0 rule 3 is unconditional: an invariant violation
 *    is a HARD STOP, not a conservative choice. So the branch is kept, its latent contrast defect
 *    is fixed, and the DECISION — retire the props, or wire the two capture screens onto them —
 *    is registered as an owner call. Nobody here can retire an X number.
 */

export type ReadingType =
  | 'face'
  | 'palm'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'numerology'
  | 'compatibility';

interface GeneratingReadingProps {
  type: ReadingType;
  /** When set, the loading UI is replaced with a retry-capable error UI. */
  error?: string | null;
  /** Optional callback for the Try Again button. */
  onRetry?: () => void;
  /** Optional callback for a "Go Home" affordance on persistent errors. */
  onGoHome?: () => void;
  /** Title override; otherwise derived from `type`. */
  title?: string;
}

// ---------------------------------------------------------------------------
// Stage-aware message pools
// ---------------------------------------------------------------------------

type Stage = {
  startSeconds: number;
  messages: string[];
};

type StageFamily = 'face' | 'palm' | 'astrology' | 'numerology' | 'compatibility';

function familyFor(type: ReadingType): StageFamily {
  switch (type) {
    case 'face': return 'face';
    case 'palm': return 'palm';
    case 'daily':
    case 'weekly':
    case 'monthly': return 'astrology';
    case 'numerology': return 'numerology';
    case 'compatibility': return 'compatibility';
  }
}

const messageStages: Record<StageFamily, Stage[]> = {
  face: [
    { startSeconds: 0, messages: [
      'Sending your photo to the cosmos...',
      'Connecting to our AI face reader...',
      'Securing your image — your data is yours alone...',
      'Waking up the ancient art of physiognomy...',
    ] },
    { startSeconds: 10, messages: [
      'Studying the geometry of your face...',
      'Tracing the curves around your eyes...',
      'Reading what your forehead reveals...',
      'Mapping the lines of your expression...',
      'Decoding the symmetry of your features...',
      'Listening to what your jawline whispers...',
      'Examining the architecture of your face...',
      'Finding the patterns only you carry...',
    ] },
    { startSeconds: 30, messages: [
      'Cross-referencing 1,000+ years of physiognomy...',
      'Connecting your features to personality archetypes...',
      'Translating your face into character insights...',
      'Weaving together what your features reveal...',
      'Consulting ancient face-reading masters in your service...',
      'Matching your structure to timeless wisdom traditions...',
      'Drawing parallels across centuries of physiognomy...',
      'Layering observations into a coherent reading...',
    ] },
    { startSeconds: 75, messages: [
      'Polishing your insights for clarity...',
      'Adding depth to what we’ve discovered...',
      'Refining your face’s unique story...',
      'Preparing your personalized revelation...',
      'Almost ready — crafting the final piece...',
      'Putting the finishing touches on your reading...',
    ] },
    { startSeconds: 150, messages: [
      'Almost there — savoring the last details...',
      'Just a moment more — this one’s special...',
      'Finalizing your reading now...',
    ] },
  ],
  palm: [
    { startSeconds: 0, messages: [
      'Sending your palm to the AI...',
      'Connecting to our palmistry expert...',
      'Securing your image safely...',
      'Awakening the ancient art of palmistry...',
    ] },
    { startSeconds: 10, messages: [
      'Following your heart line...',
      'Tracing your life line...',
      'Reading your fate line’s depth...',
      'Examining your head line...',
      'Studying the mounts of your palm...',
      'Reading what your hands have witnessed...',
      'Finding the unique signatures in your palm...',
      'Decoding the patterns only your hand carries...',
    ] },
    { startSeconds: 30, messages: [
      'Connecting palm patterns to palmistry traditions...',
      'Cross-referencing centuries of palm-reading wisdom...',
      'Translating your lines into life insights...',
      'Interpreting the intersections of your lines...',
      'Weaving meaning from what your palm reveals...',
      'Consulting timeless palmistry masters...',
      'Layering observations into a coherent reading...',
    ] },
    { startSeconds: 75, messages: [
      'Polishing your palm’s story...',
      'Adding depth to your palm reading...',
      'Refining the insights from your hand...',
      'Almost ready — crafting your personalized reading...',
      'Putting the finishing touches on your palm reading...',
    ] },
    { startSeconds: 150, messages: [
      'Almost there — savoring the last details...',
      'Just a moment more — this one’s special...',
      'Finalizing your palm reading now...',
    ] },
  ],
  astrology: [
    { startSeconds: 0, messages: [
      'Connecting to your cosmic blueprint...',
      'Reaching out to the stars...',
      'Aligning with the current celestial sky...',
      'Awakening your personalized cosmic forecast...',
    ] },
    { startSeconds: 10, messages: [
      'Calculating your planetary positions...',
      'Reading the cosmic weather for you...',
      'Mapping celestial influences to your chart...',
      'Tracing the geometry of your cosmic blueprint...',
      'Listening to what the moon reveals...',
      'Decoding what the planets have planned...',
      'Connecting your birth chart to the current sky...',
      'Reading transits across your natal chart...',
    ] },
    { startSeconds: 30, messages: [
      'Synthesizing your unique astrological signature...',
      'Cross-referencing classical astrological wisdom...',
      'Connecting planetary aspects to your life themes...',
      'Translating cosmic patterns into guidance...',
      'Weaving together your celestial influences...',
      'Layering aspect interpretations...',
    ] },
    { startSeconds: 75, messages: [
      'Polishing your cosmic insights...',
      'Adding depth to your astrological reading...',
      'Refining your personalized forecast...',
      'Putting the finishing touches on your reading...',
    ] },
    { startSeconds: 150, messages: [
      'Almost there — savoring the last details...',
      'Just a moment more — finalizing the cosmic picture...',
      'Final touches on your astrology reading...',
    ] },
  ],
  numerology: [
    { startSeconds: 0, messages: [
      'Connecting to the rhythm of numbers...',
      'Awakening the ancient art of numerology...',
      'Calculating your numerical signature...',
      'Reaching for your unique number patterns...',
    ] },
    { startSeconds: 10, messages: [
      'Calculating your life path number...',
      'Decoding the rhythm of your name...',
      'Translating birth digits into meaning...',
      'Cross-referencing Pythagorean numerology...',
      'Finding patterns in your numbers...',
      'Mapping numerical vibrations to your destiny...',
    ] },
    { startSeconds: 30, messages: [
      'Synthesizing your numerical archetype...',
      'Connecting your numbers to ancient wisdom...',
      'Translating digit patterns into life themes...',
      'Layering numerical insights into your reading...',
    ] },
    { startSeconds: 75, messages: [
      'Polishing your numerology reading...',
      'Adding depth to your numerical insights...',
      'Refining your personalized number guidance...',
      'Putting the finishing touches on your reading...',
    ] },
    { startSeconds: 150, messages: [
      'Almost there — final calibrations...',
      'Just a moment more...',
      'Finalizing your numerology reading...',
    ] },
  ],
  compatibility: [
    { startSeconds: 0, messages: [
      'Connecting two cosmic blueprints...',
      'Awakening the art of compatibility analysis...',
      'Reaching for both your cosmic signatures...',
      'Securing your compatibility data...',
    ] },
    { startSeconds: 10, messages: [
      'Comparing your cosmic blueprints...',
      'Reading the dynamic between your charts...',
      'Calculating your relational harmony...',
      'Tracing connection patterns between you...',
      'Decoding the energy you share...',
      'Studying the chemistry between your signs...',
      'Mapping where your paths align and diverge...',
    ] },
    { startSeconds: 30, messages: [
      'Synthesizing the dynamic between you...',
      'Cross-referencing astrological compatibility wisdom...',
      'Layering observations into a coherent reading...',
      'Weaving your two stories into one analysis...',
    ] },
    { startSeconds: 75, messages: [
      'Polishing your compatibility insights...',
      'Adding depth to your relationship reading...',
      'Refining your personalized compatibility analysis...',
      'Putting the finishing touches on your reading...',
    ] },
    { startSeconds: 150, messages: [
      'Almost there — savoring the last details...',
      'Just a moment more...',
      'Finalizing your compatibility reading...',
    ] },
  ],
};

function getTitle(type: ReadingType): string {
  switch (type) {
    case 'face': return 'Creating Your Face Reading';
    case 'palm': return 'Creating Your Palm Reading';
    case 'daily': return 'Reading Today’s Sky';
    case 'weekly': return 'Casting Your Weekly Forecast';
    case 'monthly': return 'Casting Your Monthly Reading';
    case 'numerology': return 'Decoding Your Numbers';
    case 'compatibility': return 'Reading Your Connection';
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findStageIndex(stages: Stage[], elapsedSec: number): number {
  let idx = 0;
  for (let i = 0; i < stages.length; i++) {
    if (elapsedSec >= stages[i].startSeconds) idx = i;
  }
  return idx;
}

export function GeneratingReading({
  type,
  error,
  onRetry,
  onGoHome,
  title,
}: GeneratingReadingProps) {
  const family = useMemo(() => familyFor(type), [type]);
  const stages = messageStages[family];

  const [stageIndex, setStageIndex] = useState(0);
  const [shuffled, setShuffled] = useState<string[]>(() =>
    shuffle(stages[0].messages)
  );
  const [messageIndex, setMessageIndex] = useState(0);

  const progress = useSharedValue(0);
  const messageOpacity = useSharedValue(1);
  const mountedAtRef = useRef<number>(Date.now());

  // ----- Recalibrated progress curve (tuned for 60-110s typical readings) -----
  //   0 → 35%   in 12s  (ease-out: fast start while upload + early server work)
  //  35 → 65%   in 25s  (ease-in-out: deep analysis)
  //  65 → 88%   in 45s  (ease-in-out: generation in progress)
  //  88 → 97%   in 60s  (ease-in: slow approach to plateau)
  // 97% plateau until response arrives or 180s timeout fires.
  useEffect(() => {
    progress.value = 0;
    /* 🔴 THE FOUR LEGS ARE MARKED `TIMELINE` AND THEY ARE NOT MOTION STEPS. They are REAL-TIME
       WAYPOINTS on a 60-second-plus server call, named BY VALUE in design §5.5, and the marker is
       what stops a later pass "normalising" 12 seconds onto a 220ms token — which would make the bar
       reach its plateau in under two seconds and then sit still for a minute.
       🔴 THE 0.97 ASYMPTOTE IS PRESERVED EXACTLY. The bar never reaches 1.0 until the server says
       ready; that is the whole content of §5.5's "layer one — honesty", and it is the one thing on
       this screen that must never be improved.
       🟢 WHAT DID CHANGE IS THE CURVE, AND §5.5 IS EXPLICIT: the bar runs on `curve.linear`. It
       carried three DIFFERENT unnamed recipes across four legs — an out-cubic, two in-out-quads and
       an in-quad — so the bar accelerated and decelerated four times over a minute for no stated
       reason. §5.2 restricts linear to "progress and loops only", and this is progress. */
    progress.value = withSequence(
      withTiming(0.35, { duration: 12_000 /* TIMELINE */, easing: curve.linear }),
      withTiming(0.65, { duration: 25_000 /* TIMELINE */, easing: curve.linear }),
      withTiming(0.88, { duration: 45_000 /* TIMELINE */, easing: curve.linear }),
      withTiming(0.97, { duration: 60_000 /* TIMELINE */, easing: curve.linear })
    );
  }, [progress]);

  // ----- Stage tracker: 100ms tick -----
  useEffect(() => {
    const tick = setInterval(() => {
      const elapsedSec = (Date.now() - mountedAtRef.current) / 1000;
      const next = findStageIndex(stages, elapsedSec);
      if (next !== stageIndex) {
        setStageIndex(next);
        setShuffled(shuffle(stages[next].messages));
        setMessageIndex(0);
        // fade message in/out on stage change too
        /* §5.5 layer two: "the stage label cross-fades on `dur-base` 220". The two cross-fades in
           this file were 200/80/280 and 200/60/260 — the same gesture, tuned twice, neither on the
           ramp. Both now call the one pair, so they cannot drift apart again. */
        messageOpacity.value = withSequence(crossFadeOut(), crossFadeIn());
      }
    }, 100);
    return () => clearInterval(tick);
  }, [stages, stageIndex, messageOpacity]);

  // ----- Within-stage rotation every 3.5s -----
  useEffect(() => {
    const intervalId = setInterval(() => {
      messageOpacity.value = withSequence(crossFadeOut(), crossFadeIn());
      setTimeout(() => {
        setMessageIndex((idx) => {
          const next = idx + 1;
          if (next >= shuffled.length) {
            // Reshuffle the same stage's pool when we exhaust it
            setShuffled(shuffle(stages[stageIndex].messages));
            return 0;
          }
          return next;
        });
      }, dur.base);
    }, 3500);
    return () => clearInterval(intervalId);
  }, [shuffled, stages, stageIndex, messageOpacity]);

  /* 🔴 THE BAR ANIMATES `scaleX`, NOT `width` — §18's contract, and the third of three such bars
     `motion-arrival-check.js` found on its first run. This is the one that matters most: it is on
     screen for sixty seconds or more, so a per-frame re-layout runs for a minute on the lowest-end
     device in the fleet, which is exactly the "laggy" this direction was set to avoid.
     🔴 X17 IS UNTOUCHED. Its four literals here are `minWidth: 220`, `maxWidth: 320`, `height: 8`
     and `minHeight: 58` — all DIMENSIONS on the track and the message box, none of them this
     worklet's business. The fill gains `width: '100%'` (a scaled element needs a full box to scale)
     and `transformOrigin: 'left'`; the track keeps its own clipping. */
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  // 🔴 THE ANNOUNCED VALUE READS THE REAL SHARED VALUE — there is deliberately NO second copy of
  //    the curve. design §9 row 7 asks for the value on the progress role, and the obvious way to
  //    supply it is to re-derive progress from elapsed time on the JS side. That would put a
  //    SECOND source of truth beside the four legs above, computed from four different easing
  //    functions, and the two would drift — so a screen reader would be told a number the bar does
  //    not show. Reacting to the animation itself cannot drift by construction.
  // ⚠️ BUCKETED TO 5% ON PURPOSE: this crosses to the JS thread and re-renders, so it fires about
  //    20 times over the whole 142-second sequence instead of once per frame. The effects above
  //    depend only on stable identities, so none of them re-runs — 🔴 and that matters more than
  //    it looks, because re-running the first one would RESTART the asymptote from zero.
  const [announcedPct, setAnnouncedPct] = useState(0);
  useAnimatedReaction(
    () => Math.round(progress.value * 20) * 5,
    (current, previous) => {
      if (previous !== null && current !== previous) runOnJS(setAnnouncedPct)(current);
    },
    [],
  );

  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));

  /* 🔴 §5.5 LAYER TWO — "LIFE". `dur-ambient` 2600, opacity 0.5 <-> 1.0 ONLY: no scale, no rotation,
     no reflow. SELF-DRIVEN AND NEVER TIED TO A PROMISE — a loop that restarts when a request retries
     is what users read as "it hung", and this is the surface where that reading costs the most.
     🔴 BUILT HERE, NOT PRESERVED. §5.5 specified it, descope 1 cut it, and it was never written — so
        a session that assumed a preserve would have "kept" nothing. Verified absent before building.
     🟢 AND IT IS THE ONE LEGITIMATE CONTINUOUS LOOP IN THE SYSTEM, on the rule R-2 settled: a
        continuous loop is legitimate ONLY where it communicates ONGOING WORK. This is a 60-second
        server call, so the breathe is a LIVENESS SIGNAL; the skeleton shimmer R-2 declined is
        decoration, and decoration does not earn a loop.
     ⚠️ `useAmbient` carries the reduced-motion branch (R-4): with the OS flag set the value is placed
        at the BRIGHT end and no loop starts, because a suppressed `withRepeat` would otherwise park
        it at 0.5 and leave the screen permanently dimmed. */
  const auraOpacity = useAmbient(0.5, 1);
  const auraStyle = useAnimatedStyle(() => ({ opacity: auraOpacity.value }));

  // ----- Error state — replaces loading UI with retry-capable surface -----
  if (error) {
    return (
      /* 🔴 P71 — THE AURA STOP, NOT A FULL-STRENGTH FILL. See the live branch below for the whole
         argument; the two branches are one decision on the STOP LIST and they move together.
         🔴 BUT THE BREATHE IS DELIBERATELY **NOT** HERE, AND THIS IS THE ONE PLACE THE TWO BRANCHES
            ARE MEANT TO DIVERGE. R-2/R-3's rule is that a continuous loop is legitimate ONLY where it
            communicates ONGOING WORK. The live branch is a 60-second server call, so its breathe is a
            LIVENESS SIGNAL. This branch is the FAILURE state: there is no ongoing work to signal, and
            a screen that keeps pulsing after it has given up is telling the user something false.
         ⚠️ THE DIVERGENCE IS STATED BECAUSE DIVERGENCE BETWEEN THESE TWO BRANCHES HAS PRODUCED FIVE
            FINDINGS IN THIS PHASE — a pictograph here and a plate there, a fixed pair here and a
            latent one there. This one is SEMANTIC rather than accidental, and it stays. */
      <LinearGradient
        colors={[t.color['accent-muted'], t.alpha(t.color.accent, 0), t.alpha(t.color.accent, 0)]}
        style={{ flex: 1, backgroundColor: t.color.bg }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          {/* The same plate as the live branch. This branch is UNREACHABLE (`O-56` / `P45`, and
              X17 lives inside it, which is why it is not deleted) — but leaving one branch with a
              pictograph and the other with a plate is exactly the divergence that has produced five
              findings in this phase, and an unreachable branch is where nobody looks. */}
          <View style={{ marginBottom: 12 }}>
            <Plate name="orbits" width={80} />
          </View>
          <Text
            style={{ ...t.txt('display-md').style, color: t.color.fg,
              textAlign: 'center',
              marginBottom: 12 }}
          >
            We hit a snag
          </Text>
          {/* 🔴 `P79` — THE ROLE MOVED, NOT THE AURA, AND THAT ASYMMETRY IS THE RULING. The aura's
              near stop is the design's own accent-tint token at 14% (§2 row 14), so it is a SPECIFIED
              value and §0.0 rule 2 forbids inventing a different one. Measured over the ground this
              element declares, the muted role on that stop is 4.41:1 — sub-AA by a hair, and the
              hair is the tint. The secondary role reads 8.54:1 on the same band. So on an accent
              aura the muted step is not available and the secondary one is. */}
          <Text {...t.txt('text-base')}
            style={{ ...t.txt('text-base').style, color: t.color['fg-secondary'],
              textAlign: 'center',
              marginBottom: 32 }}
          >
            {error}
          </Text>
          {/* 🔴 A LATENT A5 FAILURE, FIXED BY CONSTRUCTION RATHER THAN BY HAND. This pair was a
              hand-rolled control with an accent FILL and the plain foreground on it — about
              2.31:1, failing AA at every size — and `no-white-on-accent` could not see it: the
              fill and the label sat NINE lines apart and the rule's window is four. Adopting the
              primitive means the pairing is derived ONCE, in Button, which is the whole argument
              of that module's own A5 note: all three previous instances of this defect came from
              re-deriving the colour at the site.
              🔴 X17, INSTANCE 1 OF 3 — the lower width bound. It stays in THIS file, as a call-site
              style, because `style` is spread last in Button and a minimum width does not touch
              X3's pinned height. Do not delete it and do not move it into the primitive: it is
              this control's guard, not every button's. */}
          {onRetry && (
            <View style={{ minWidth: 220 /* X17 */, marginBottom: 12 }}>
              <Button title="Try Again" onPress={onRetry} fullWidth />
            </View>
          )}
          {/* The secondary action is a ghost Button BELOW the primary — design §9's pattern for a
              two-action recovery surface. It was plain muted text before, which reads as a caption
              rather than a control on the one screen where the user is already stuck. */}
          {onGoHome && (
            <Button title="Go Home" onPress={onGoHome} variant="ghost" />
          )}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const headline = title || getTitle(type);
  const message = shuffled[messageIndex] || stages[stageIndex].messages[0];

  return (
    /* 🔴 P71 — THE GROUND IS THE AURA STOP. THE FIX IS THE GROUND, NOT THE FOREGROUND.
       Design §2 row 14 gives this surface `accent-muted`, the aura stop, and names it at 14%.
       What shipped was `t.color.accent` at FULL STRENGTH as stop 1 of a full-bleed gradient, held
       for 60+ seconds across five capture flows. Measured: the slab's relative luminance is 0.34786
       against the specified stop's 0.01631 — 🔴 21.3x the specified value, on the brightest surface
       in the app, on the one screen where waiting IS the activity.
       ⚠️ AND WHY THE FOREGROUND WAS NOT TOUCHED, WHICH IS THE LOAD-BEARING HALF: the plain
       foreground on that top band measures 2.31:1. Fixing the TEXT would mean putting the fill-label
       role there — and on a 14% wash that role measures 1.14:1, i.e. near-invisible. So a foreground
       fix would have locked in the wrong ground and then been undone by this change.
       🔴 NO TEXT NODE ACTUALLY REACHES THE BAND TODAY, and that is stated rather than glossed: the
       layout is centred, so at 800dp / 640dp / 640dp-at-1.3x the headline sits at 15.68-16.35:1
       before the change. The defect is the SLAB — comfort and brightness over a minute — not a live
       AA failure. Both readings are true and only one of them is what the owner reported.
       ⚠️ THE `backgroundColor` IS REQUIRED, NOT TIDINESS. The aura stop is an rgba token, and this
       gradient has nothing beneath it — a translucent stop would composite over whatever the
       navigator happens to paint. Naming the brand ground here makes 14%-over-bg deterministic and
       keeps the token rather than a hand-computed hex (§0.0 rule 2).
       🔴 AND THE FAR STOPS FADE TO THE SAME HUE AT ZERO, NOT TO THE GROUND, WHICH IS WHAT MAKES THE
       RAMP PLATFORM-INDEPENDENT. Measured while writing this: a translucent warm stop interpolating
       toward an OPAQUE near-black diverges by alpha model — premultiplied ramps down monotonically,
       straight-alpha BULGES near the midpoint to a value BRIGHTER THAN STOP 1 ITSELF and takes the
       muted role to 3.30:1 on the way. Fading to the same hue at 0% holds RGB CONSTANT so only alpha
       moves, and both models then agree exactly. This is also §2's aura pair verbatim — the row
       reads "`accent-muted` -> transparent" — so the safe form and the specified form are the same
       form. ⚠️ Three stops, not two, because the wash must be gone by the 50% mark: that is the
       structure the previous ground had and §0.0 rule 1 keeps it.
       ⚠️ THE BULGE VALUE IS NOT SPELLED HERE. A hex literal in a comment is counted by `no-raw-hex`,
       which is the fifth recorded instance of "a comment is source" and the one that bit ONE SESSION
       after the rule was written into CLAUDE.md. The figure lives in the commit body instead.
       ⚠️ §5.5's aura also BREATHES on `dur-ambient` 2600. That is MOTION, cut by §0.0 rule 5, and
       there is no such loop in this file to preserve — the only self-driven animations here are the
       four-leg asymptote and the message cross-fade, both untouched. */
    /* 🔴 THE GROUND IS OPAQUE AND STATIC; THE WASH IS PINNED, INERT AND BREATHING. See
       `AnimatedAura`'s header for why the two had to separate — animating the old single element
       would have faded the GROUND with the wash and dimmed the whole screen on a 2.6s cycle.
       ⚠️ THIS IS A SWAP, NOT AN INSERTION (`O-110`): the flex chain is the same length it was,
          because the gradient no longer participates in layout. */
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <AnimatedAura
        colors={[t.color['accent-muted'], t.alpha(t.color.accent, 0), t.alpha(t.color.accent, 0)]}
        pointerEvents="none"
        /* GRADIENT-FG(fg-secondary) — this layer is a PINNED SIBLING, so it has no subtree and the
           rule cannot reach the text it grounds. The declaration names the WEAKEST reading role this
           screen actually uses. Measured across the live branch: the secondary reading role, the plain
           one and the accent — the MUTED step is not on this screen at all, and item 0 moved the error
           branch's copy off it for exactly this reason. The rule then MEASURES the ramp against the
           declared role rather than taking the declaration on trust. */
        style={[StyleSheet.absoluteFill, auraStyle]}
      />
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        {/* 🔴 §14's `orbits` PLATE, AND IT IS THE ONLY NEW PLATE MOUNT IN THIS RELEASE. design §14.3
            assigns this plate to this surface by name, and §0.0 rule 5's descope (funnel screens and
            Home only) leaves this as the single intersection — the capture wait is on the first-run
            funnel. The other three unmounted plates are registered in Plate.tsx's header.
            ⚠️ IT REPLACES A DECORATIVE PICTOGRAPH, which is §9.2 arriving rather than a side effect:
            the only emoji the design keeps is the streak flame, and the one it names as DROPPED was
            dropped for being "merely decorative" — which is exactly what this was. Its marked
            numeric-size exception retires with it, in BOTH branches, so `no-numeric-fontsize`'s
            excepted count falling by two IS the arrival check.
            ⚠️ THE WIDTH IS CHOSEN, NOT SPECIFIED, and it is chosen against X17's neighbours: §14.4
            makes the slot width a per-mount value, and the block below is ~20px taller than the
            pictograph it replaces. That matters here and nowhere else, because this layout is
            CENTRED and its siblings carry three of X17's four reserved dimensions — at the 1.3
            font-scale cap a generous plate is what pushes the progress bar off a short screen. */}
        <View style={{ marginBottom: 12 }}>
          <Plate name="orbits" width={80} />
        </View>

        <Text
          style={{ ...t.txt('display-md').style, color: t.color.fg,
            textAlign: 'center',
            marginBottom: 16 }}
        >
          {headline}
        </Text>

        {/* 🔴 X17 · D3 — THE RESERVATION AND THE SCALING OPT-IN ARE ONE DECISION, AND THEY
            HAD TO LAND TOGETHER. `minHeight: 44` is an iOS layout guard (commit 6525a75):
            it reserves EXACTLY two lines of 16/22 so the rotating message does not make
            the whole card jump between a one-line and a two-line height mid-generation.
            Design §6.6.2 measured `text-base` 16/22 against it — 44 = 2 × 22 exactly, "the
            luckiest mapping in the register; the reservation survives byte-for-byte".
            🔴 BUT `text-base` IS A `scales: true` STEP, and pass 2b now opts it in (P23).
            At the 1.3 cap the line becomes 28.6px, so two lines = 57.2px against a 44px
            reservation — and the one-vs-two-line jump the guard exists to prevent comes
            straight back, for exactly the users least able to tolerate it. §6.6.2 names
            this as the ONE real pass-2 hazard and gives two exits: keep this single site
            non-scaling, or raise the reservation to ceil(44 × 1.3) = 58. D3 chose the
            RAISE — freezing the rotating status message would have made it the only
            unreadable text on a 60-second waiting screen.
            ⚠️ The plan scheduled 44 → 58 for pass 4 because that is where the opt-in used
            to live. The opt-in moved here, so the raise moved with it. Landing them apart
            would have shipped a scaling opt-in against the old reservation. */}
        <Animated.Text
          {...t.txt('text-base')}
          style={[
            messageStyle,
            t.txt('text-base').style,
            {
              color: t.color['fg-secondary'],
              textAlign: 'center',
              marginBottom: 32,
              minHeight: 58,
            },
          ]}
        >
          {message}
        </Animated.Text>

        {/* 🔴 THE PROGRESS ROLE — design §9 row 7, and this is the component's a11y contract, NOT
            the label/role sweep §0.0 rule 5 descoped. It goes on the TRACK rather than on the fill:
            the track is the thing that exists for the whole wait, and the fill is a child whose
            width is animated on the UI thread.
            ⚠️ The track's ground is the overlay step, and design §2 row 14 names the accent wash as
            the progress-track fill. That is `O-26`'s question — 6 tracks on the wrong token, held
            for a device ruling at cut 3 because moving a track from a neutral to an amber wash is a
            VISIBLE value change. This is a SEVENTH track and O-26's enumeration could not contain
            it: O-26 was enumerated by TOKEN, and this one is wrong in a different token. Left
            alone deliberately so all seven move together, or none do.
            🔴 X17, INSTANCES 2 AND 3 OF 3 — the upper width bound and the explicit bar height, from
            `c542b20`. Both look inert on Android. Neither is. */}
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={headline}
          accessibilityValue={{ min: 0, max: 100, now: announcedPct }}
          style={{
            width: '100%',
            maxWidth: 320 /* X17 */,
            height: 8 /* X17 */,
            backgroundColor: t.color['surface-overlay'],
            borderRadius: t.radius.pill,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              barStyle,
              {
                height: '100%',
                width: '100%',
                backgroundColor: t.color.accent,
                borderRadius: t.radius.pill,
                transformOrigin: 'left',
              },
            ]}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

export default GeneratingReading;
