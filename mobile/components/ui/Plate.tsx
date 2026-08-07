import React from 'react';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { usePlateEntrance } from '@/lib/motion';
import * as t from '@/theme';

/**
 * 🔴 THE ENTRANCE RIDES A FIRST-PARTY `Animated.View` WRAPPER AND **NEVER THE `<Svg>` ROOT**.
 *    ⚠️ THE OPPOSITE WAS SHIPPED IN CUT 3 AND EVERY PLATE IN THE APP WAS INVISIBLE. Read the
 *    mechanism before "simplifying the extra node away", because the node IS the fix.
 *
 * ── 🔴 THE DEFECT, MEASURED IN THE INSTALLED `react-native-svg@15.11.2` ─────────────────────────
 *
 * `Svg.render()` does not merely forward the `style` prop to its host view — it **CLONES IT ONTO
 * THE INNER `<G>`**, which is a SEPARATE host node:
 *
 *     const gStyle = Object.assign({}, StyleSheet.flatten(style));   // src/elements/Svg.tsx
 *     ...
 *     <RNSVGSvgView style={rootStyles}> <G style={gStyle} .../> </RNSVGSvgView>
 *
 * So an animated style handed to `<Svg>` lands in TWO places at once, and only one of them is
 * animatable. Reanimated's whole design is to drive the value on the UI thread **without a React
 * re-render**, so it updates the host view it resolved and NEVER re-runs `render()` — which means
 * `gStyle` is frozen at the FIRST-RENDER snapshot for the life of the mount. An entrance that
 * starts at opacity 0 therefore paints the entire drawing at group-opacity 0 **permanently**.
 * ⚠️ A LATER RE-RENDER DOES NOT RESCUE IT EITHER: `PropsFilter` caches the first-render snapshot in
 *    its `_initialPropsMap` and replays that same value, so the frozen copy is re-frozen.
 *
 * 🟢 THE SYMPTOM WAS EXACTLY AS SUBTLE AS THAT IMPLIES: the box is real (the explicit `width` and
 *    `height` still reserve their slot), so the device showed an EMPTY BAND where the plate belongs,
 *    the four shape primitives on the same screens rendered perfectly — they are plain `<Svg>` and
 *    are handed no style — and the adoption gate read a clean 6/6/0, because every mount was
 *    genuinely mounted.
 *
 * 🔴 SO THE RULE IS GENERAL AND IT IS NOW ASSERTED IN `motion-arrival-check.js` (rule 10):
 *    **a `react-native-svg` element may receive `animatedProps`, NEVER an animated `style`.**
 *    `CompatibilityScoreRing` is the legal form of the same idea — it animates `strokeDashoffset`
 *    through `animatedProps`, which is a paint prop set on the node reanimated actually owns.
 *
 * ── WHY A WRAPPER IS SAFE HERE, WHICH IS NOT THE SAME AS "A WRAPPER IS ALWAYS SAFE" ────────────
 *
 * `O-110` is the standing reason to fear a new node: inserting one into a FLEX CHAIN is never
 * neutral. This one is not in a flex chain. It carries the plate's own fixed box — the same two
 * numbers the `<Svg>` already declared, so the reserved slot is byte-identical — and it is a leaf
 * container with a single fixed-size child. §14.4's "a plate NEVER stretches" is what makes that
 * true: there is no dimension to negotiate.
 * ⚠️ `opacity` REMAINS THE ONLY ANIMATED PROPERTY. The wrapper changes WHERE the style lands, not
 *    WHAT animates — no transform, no scale, no draw-on (§18.1 row 2).
 */

/**
 * Plate — §9 item 18 / design §14. FIVE line-art plates, ONE component, `name` selects.
 *
 * All five are strokes and dots at ZERO binary weight; the only raster in the system remains the
 * grain tile. No faces, no hands, no real people, no recognisable IP — celestial geometry only.
 * Every stroke is 1.25, which is §14.2's floor exactly and nowhere above it.
 *
 * ── 🔴 THE TINT IS RESOLVED IN JS, NOT LEFT TO `currentColor`, AND THAT IS A DELIBERATE CHOICE ──
 *
 * design §14.1's model is a host `color` and `currentColor` on every child. The JS half of that is
 * VERIFIED in the installed react-native-svg 15.11.2 (extractBrush returns a currentColor brush;
 * extractProps passes a host color through) — but the NATIVE render is `P38` check 2 and it has NOT
 * run, because there is no device in this loop. §14.1 pre-specifies the fallback as "the component
 * resolves theme.color[tint] to a literal itself. Same API, same call sites, five lines."
 *
 * 🟢 SO THE FALLBACK IS WHAT SHIPS, AND IT IS NOT A DOWNGRADE: the prop, the token vocabulary and
 *    every call site are identical either way, and this form CANNOT fail on a marker the native
 *    side has to honour. §0.0 rule 1 — take the smaller risk when the check has not run.
 * ⚠️ THE HOST `color` IS SET ANYWAY, so §14.1's model is live the moment check 2 passes and the
 *    swap is deleting the explicit props. Do NOT "simplify" by removing the explicit ones first.
 *
 * ── 🔴 THE THREE LITERALS IN §14.3's VERBATIM MARKUP ARE TOKENS AND ARE SUBSTITUTED ────────────
 *
 * A plate containing raw hex fails `no-raw-hex` (§14.3.6, and the mapping is not optional): the
 * host colour is the `tint` prop defaulting to the muted role, and the two node colours are the
 * primary and secondary accents. Every coordinate, radius and transform below is character-exact
 * from §14.3 — only the colours moved.
 *
 * ── ACCESSIBILITY: ON THE COMPONENT, NEVER PER SITE (§14.1.1, owner ruling R4) ─────────────────
 *
 * 🔴 BOTH props, always. They are platform-specific and neither covers the other, so shipping one
 *    leaves the other platform announcing anonymous nodes. On the component so every mount inherits
 *    it once and no future mount can forget — the omission is invisible unless someone runs a screen
 *    reader, and nothing in this repo's verification stack does.
 *
 * ── ⚠️ DESCOPE 3 REDUCES THIS SYSTEM TO **ONE** NEW MOUNT, AND THAT IS WORTH STATING PLAINLY ────
 *
 * §0.0 rule 5 mounts plates on the FUNNEL screens and Home only. Intersecting §14.5's may-list with
 * that funnel, surface by surface:
 *
 *   orbits        GeneratingReading            🟢 MOUNTED — the capture wait is on the funnel
 *   comet         LockShell density 1          ⬜ NOT MOUNTED — and NOT for the descope's reason;
 *                                                 see the correction below
 *   lunar         insight hero · daily header  ⬜ BUILT, NOT MOUNTED — neither is a funnel surface
 *   constellation Ask-the-stars card · EmptyState  ⬜ BUILT, NOT MOUNTED — same
 *   tide          monthly reading · share cards    ⬜ BUILT, NOT MOUNTED — and W1 bans SVG in the
 *                                                     share surfaces outright, so its second home
 *                                                     is unavailable at any mount map
 *
 * ⚠️ CORRECTION, MEASURED AT THIS ITEM: the `comet` plate did NOT land with LockShell density 1 at
 *    item 13. That module's own header still records it as *"item 18, and it rides `P38` check 4"*,
 *    and item 13 shipped without it deliberately. It is unmounted here too, and the reason is a
 *    RULING rather than a descope: §4.2 pre-specifies that if the plate does not composite acceptably
 *    under d1's veil it is DROPPED from that density entirely and NEVER moved above the veil — and
 *    check 4 has not run. `O-65` then removed the question's subject on Android, where there is no
 *    real blur to composite under at all, so the check now means something different from what it
 *    was written to ask. Mounting on an unrun check whose pre-specified failure mode is "drop it"
 *    would be taking the risk in the one direction the design already declined.
 *
 * 🔴 THE PAYWALL HEADER IS THE ONE GAP THAT IS A DESIGNER CALL, NOT A DESCOPE. §14.5 says that
 *    surface MAY carry a plate and it IS the funnel's last screen — but §14.3 assigns each of the
 *    five to named surfaces and the paywall header is not among them. Choosing one here would be
 *    inventing a design assignment, which §0.0 rule 2 forbids. Registered instead.
 * ⚠️ Three unmounted plates are NOT dead code by the zero-call-site rule: `name` is one component's
 *    prop, the markup is verbatim spec, and the mount map is an owner descope with a named date to
 *    revisit — not an option nobody wanted.
 */

export type PlateName = 'lunar' | 'constellation' | 'orbits' | 'tide' | 'comet';

/** Fixed viewBoxes — §14.4: the box is NORMATIVE and the ratio labels are descriptive. §14.3.7 (i)
 *  measured one label as off by 26%; nothing downstream breaks because the slot reserves whatever
 *  the box implies, and the label is not used by this code at all. */
const BOX: Record<PlateName, { w: number; h: number }> = {
  lunar: { w: 86, h: 104 },
  constellation: { w: 150, h: 96 },
  orbits: { w: 104, h: 104 },
  tide: { w: 160, h: 72 },
  comet: { w: 110, h: 90 },
};

const STROKE = 1.25;

interface PlateProps {
  name: PlateName;
  /** A colour-token NAME, never a literal. Defaults to the muted role, which is §14.3's host colour. */
  tint?: 'fg-muted' | 'fg-secondary' | 'border-strong';
  /** The slot width. Height follows the fixed box, so a plate never stretches. */
  width: number;
}

export function Plate({ name, tint = 'fg-muted', width }: PlateProps) {
  /* §18.1 row 1 — opacity only, `dur-slow` 420, and SEQUENCED after the host card lands. The delay
     lives in the hook and is DERIVED from the card entrance's own duration, so retiming the card
     cannot silently desynchronise the plate. "Two things arriving at once reads as jitter." */
  const entrance = usePlateEntrance();
  const box = BOX[name];
  const stroke = t.color[tint];
  const node = t.color.accent;
  const node2 = t.color['accent-2'];
  const height = Math.round((width * box.h) / box.w);

  return (
    /* 🔴 THE ENTRANCE LANDS HERE AND NOT ON THE `<Svg>` — see the header for the measured reason.
       The box is the plate's own fixed box, restated so the reserved slot is unchanged from the
       form that shipped in cut 3.
       🔴 BOTH a11y props sit on the OUTERMOST element, which is now this one — §14.1.1 / R4. */
    <Animated.View
      style={[{ width, height }, entrance]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${box.w} ${box.h}`}
        fill="none"
        // §14.4 — a plate NEVER stretches.
        preserveAspectRatio="xMidYMid meet"
        // §14.1's host colour. Live for `currentColor` the moment P38 check 2 passes; see the header.
        color={stroke}
      >
        {name === 'lunar' && (
          <>
            <Circle cx="43" cy="40" r="24" stroke={stroke} strokeWidth={STROKE} />
            <Path d="M35 19 a24 24 0 0 0 0 42 a30 30 0 0 1 0 -42" stroke={stroke} strokeWidth={STROKE} />
            <Circle cx="20" cy="82" r="1.5" fill={stroke} />
            <Circle cx="43" cy="90" r="2" fill={node} />
            <Circle cx="66" cy="84" r="1.5" fill={stroke} />
          </>
        )}

        {name === 'constellation' && (
          <>
            <Path d="M18 70 L52 34 L84 52 L118 20" stroke={stroke} strokeWidth={STROKE} />
            <Circle cx="18" cy="70" r="2" fill={stroke} />
            <Circle cx="52" cy="34" r="2.5" fill={node2} />
            <Circle cx="84" cy="52" r="2" fill={stroke} />
            <Circle cx="118" cy="20" r="3" fill={node2} />
            <Circle cx="132" cy="66" r="1.5" fill={stroke} />
            <Circle cx="38" cy="14" r="1.5" fill={stroke} />
          </>
        )}

        {name === 'orbits' && (
          <>
            <Ellipse cx="52" cy="52" rx="44" ry="18" stroke={stroke} strokeWidth={STROKE} transform="rotate(-18 52 52)" />
            <Ellipse cx="52" cy="52" rx="30" ry="12" stroke={stroke} strokeWidth={STROKE} transform="rotate(-18 52 52)" />
            <Circle cx="52" cy="52" r="7" stroke={stroke} strokeWidth={STROKE} />
            <Circle cx="90" cy="36" r="2.5" fill={node} />
          </>
        )}

        {name === 'tide' && (
          <>
            {/* ⚠️ §14.3.7 (ii) — the 2nd and 3rd strokes breach §14.2's contrast floor as drawn
                (≈3.2:1 and ≈2.0:1 against the canvas). It is the only specimen that does, and §14.3.7
                records it as a DESIGNER judgement rather than a WCAG failure, because a plate carries
                no information and is hidden from the accessibility tree. The opacities are therefore
                preserved EXACTLY as specified — raising them to ≈0.85/≈0.7 is the alternative reading
                and it is not a session's call to take. Registered. */}
            <Path d="M0 18 C 30 12, 50 24, 80 18 C 110 12, 130 24, 160 18" stroke={stroke} strokeWidth={STROKE} />
            <Path d="M0 38 C 30 32, 50 44, 80 38 C 110 32, 130 44, 160 38" stroke={stroke} strokeWidth={STROKE} opacity={0.7} />
            <Path d="M0 58 C 30 52, 50 64, 80 58 C 110 52, 130 64, 160 58" stroke={stroke} strokeWidth={STROKE} opacity={0.45} />
          </>
        )}

        {name === 'comet' && (
          <>
            <Path d="M16 74 C 40 62, 70 40, 94 16" stroke={stroke} strokeWidth={STROKE} />
            <Circle cx="94" cy="16" r="4" fill={node} />
            <Circle cx="72" cy="38" r="1.5" fill={stroke} />
            <Circle cx="54" cy="52" r="1.2" fill={stroke} />
            <Circle cx="38" cy="63" r="1" fill={stroke} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}
