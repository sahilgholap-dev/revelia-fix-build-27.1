import React from 'react';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useDrawIn } from '@/lib/motion';
import * as t from '@/theme';

/**
 * The four SHAPE PRIMITIVES — §9 item 19 / design §15. 🔴 PROPS, NOT DRAWINGS.
 *
 * §15's opening sentence is the whole reason this file exists: *"a hand-rolled <Path> in a screen
 * file is the thing this section exists to prevent."* So each of these takes a width, a tone and at
 * most one more prop, and no call site ever writes a coordinate.
 *
 * ── 🔴 THEY LIVE IN ONE MODULE AND THAT IS A DECISION, NOT LAZINESS ────────────────────────────
 *
 * `RidgeField` is DEFINED as two `ArcDivider` paths plus a dot (§15.1), so the path generator has to
 * be shared or written twice — and §15's own instruction is *"build ArcDivider first; RidgeField is
 * two instances plus a dot, not a second path generator."* Four files would mean either exporting the
 * generator across module boundaries or duplicating it, and duplication is what has produced five
 * findings in this phase. One module, one generator, four exports.
 *
 * ── THE STROKE FLOOR IS *NOT* §14.2's, AND CONFLATING THEM WOULD DELETE THREE OF THE FOUR ────────
 *
 * §14.2 bans the subtle edge token inside PLATES and puts a 1.25 floor on plate strokes. §14.2's own
 * scoping note is explicit that this does not reach here: three of these four legitimately stroke the
 * subtle edge at 1px, because they are structural rules on an opaque ground rather than drawings that
 * must survive sitting on a wash. Generalising the plate floor would delete `ArcDivider`,
 * `RidgeField` and `TickRule` outright.
 * ⚠️ They inherit `O-5` / `W3` verbatim instead: 1px at 7% white is 3 physical pixels on a 3x panel,
 *    and at hairline width the alpha may need to rise to ~10%. That is an ANDROID DEVICE question
 *    that has not been answered, and it is the same one open against every hairline in the app.
 *
 * ── ACCESSIBILITY — the same treatment as §14's plates, applied here EXPLICITLY ─────────────────
 *
 * §14.1.1's ruling scopes itself to plates and says of these four: *"apply it there too, in the
 * primitives phase, rather than assuming this rule reaches them."* So both props are on all four
 * components, not on their call sites: they are platform-specific, neither covers the other, and the
 * omission is invisible unless someone runs a screen reader.
 *
 * ── ⚠️ WHAT IS MOUNTED, AND WHAT IS BUILT AND NOT MOUNTED ──────────────────────────────────────
 *
 * §0.0 rule 5's descope is funnel screens and Home only. §15.3 supplies VERBATIM reference instances
 * for two of these, both on Home, which is the mount set's one non-funnel member:
 *
 *   RidgeField   🟢 MOUNTED — Home's header, via ScreenContainer's opt-in slot
 *   ArcDivider   🟢 MOUNTED — Home, one per screen, which is §15.1's stated budget
 *   BlobField    🟢 MOUNTED — behind Home's quick-action tiles
 *   TickRule     ⬜ BUILT, NOT MOUNTED — §15.1 puts it under section eyebrows, and the eyebrow
 *                   kicker it would underline HAS ZERO CALL SITES (measured at item 4: design §9
 *                   row 4 lists one, no call site passes one, and the data has no field for it).
 *                   Mounting it would mean inventing the kicker first, which is a copy decision.
 *
 * ── 🔴 THE ONE-SHOT DRAW-IN — WHICH OF THE FOUR QUALIFY, AND WHY THE OTHER THREE DO NOT ────────
 *
 * OWNER-REQUESTED, 2026-08-06 (design §18). `lib/motion.ts`'s `useDrawIn` carries the mechanism and
 * the ruling; this list is the SCOPE, and it is written here because "which primitives got it" is a
 * question that will be asked again:
 *
 *   ArcDivider   🟢 HAS IT. **This is "the wave" the request names** — the request's own words are
 *                   "the wave currently enters with its SECTION'S card entrance", and this is the
 *                   only §15 primitive that sits INSIDE the content block and therefore rides that
 *                   entrance at all. Single stroked path, visible endpoints, one left-to-right
 *                   sweep. The draw FOLLOWS the section entrance; it does not replace it.
 *   RidgeField   ⚠️ QUALIFIES, NOT APPLIED — blocked on the CREST DOT, and the reason is above the
 *                   JSX. It is a fill with no specified entrance, so it would sit alone on screen
 *                   for the wait. ⚠️ NOTE THE SECOND HALF, because it is why this is not merely
 *                   cosmetic: this layer is a SIBLING of the animated safe area, so it has no host
 *                   entrance to sequence against — the drawn reference instance is simply PRESENT.
 *                   Two sub-decisions, one owner call.
 *   BlobField    🔴 DOES NOT QUALIFY, STRUCTURALLY. §15.1: it is the only FILL-not-stroke primitive.
 *                   There is no stroke to trace, and a dash phase has no meaning on a filled form.
 *   TickRule     🔴 DOES NOT QUALIFY TODAY — it has ZERO MOUNTS (above). Animating an unmounted
 *                   primitive is the zero-call-site defect exactly: a mechanism nobody has seen,
 *                   reading as finished work. It gets the treatment in the commit that mounts it.
 *
 * ⚠️ AND THE PLATES ARE OUT BY SPEC, NOT BY OVERSIGHT. §18.1 row 1 rules the plate entry "opacity
 *    ONLY", and `usePlateEntrance`'s header states there is "no scale, no rise and no draw-on here".
 *    Several plates are stroked paths and would draw in beautifully. That is a design change.
 */

const A11Y = {
  // 🔴 BOTH, ALWAYS — §14.1.1 applied here explicitly rather than by assumption.
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

type Tone = 'subtle' | 'strong';
const toneColor = (tone: Tone) => (tone === 'strong' ? t.color['border-strong'] : t.color['border-subtle']);

/**
 * §15.1's path rule, verbatim, with the crest fixed at 55%:
 *   M0,h·0.8  C w·0.25,h·0.8  w·0.33,h·0.2  w·0.55,h·0.2  C w·0.75,h·0.2  w·0.83,h·0.65  w,h·0.6
 *
 * 🟢 §15.3 point 2 CHECKS this rule against the drawn reference instance and it reproduces it: at
 *    w=360 h=34 the crest lands at x≈200, which is 55.6% of 360. It is a faithful generalisation of
 *    the comp, not a different curve — which is the only reason a generator may replace a drawing.
 *
 * ⚠️ `bleed` EXISTS BECAUSE §15.3 point 3 IS A CONSTRAINT, NOT A DETAIL. The reference ridge runs
 *    x = -20 -> 380 inside a 360-wide box specifically SO THE CURVE HAS NO VISIBLE ENDPOINTS. A ridge
 *    clipped to 0 -> w shows two stubs at the screen edges. Dividers want the opposite (they are
 *    meant to end), so it is a parameter rather than a constant.
 */
function arcPath(w: number, h: number, bleed = 0): string {
  const x0 = -bleed;
  const x1 = w + bleed;
  const span = x1 - x0;
  const px = (f: number) => x0 + span * f;
  return `M${x0} ${h * 0.8} C ${px(0.25)} ${h * 0.8}, ${px(0.33)} ${h * 0.2}, ${px(0.55)} ${h * 0.2} ` +
         `C ${px(0.75)} ${h * 0.2}, ${px(0.83)} ${h * 0.65}, ${x1} ${h * 0.6}`;
}

/**
 * 🔴 THE PATH'S OWN LENGTH, **COMPUTED FROM THE SAME CONTROL POINTS `arcPath` EMITS.** The draw-in
 *    (`useDrawIn`) needs it as the dash period, and how it is obtained is a decision worth stating
 *    because the two obvious alternatives are both wrong here:
 *
 *      · MEASURED at runtime — `react-native-svg` exposes no reliable `getTotalLength()` on this
 *        stack (there is no such method on the Fabric node, and a ref round-trip would put a layout
 *        read on the JS thread on every mount of a decorative layer);
 *      · A CONSTANT — these paths are PARAMETERISED by width and height. `ArcDivider` is drawn at
 *        `screen − 48` and the ridge at the full screen width plus a 40-unit bleed, so any constant
 *        written here is wrong at every width but one, and wrong SILENTLY.
 *
 * 🟢 So it is derived: flatten both cubics with the standard de Casteljau sampling and sum the
 *    chords. 24 segments per curve holds the error under ~0.05% on a curve this shallow, which is
 *    far inside the one place the number matters (see the direction note below). It runs once per
 *    mount, on two curves, in plain arithmetic.
 *
 * 🔴 AND THE ROUNDING GOES **UP**, WHICH IS NOT COSMETIC. The dash period must be at least the path
 *    length or the start state is not fully hidden — at offset = period the dash covers `[-P, 0]`,
 *    so any path longer than `P` keeps a visible stub at its start for the whole wait. An
 *    OVERestimate only means the pen reaches the end slightly before the timing finishes. One
 *    direction is a visible defect; the other is a few milliseconds of nothing.
 */
function arcLength(w: number, h: number, bleed = 0): number {
  const x0 = -bleed;
  const x1 = w + bleed;
  const span = x1 - x0;
  const px = (f: number) => x0 + span * f;
  // The two cubic segments, as [p0, c1, c2, p3] — the same points, in the same order, as the string.
  const segs: [number, number][][] = [
    [[x0, h * 0.8], [px(0.25), h * 0.8], [px(0.33), h * 0.2], [px(0.55), h * 0.2]],
    [[px(0.55), h * 0.2], [px(0.75), h * 0.2], [px(0.83), h * 0.65], [x1, h * 0.6]],
  ];
  const STEPS = 24;
  let total = 0;
  for (const [p0, c1, c2, p3] of segs) {
    let prevX = p0[0], prevY = p0[1];
    for (let i = 1; i <= STEPS; i++) {
      const s = i / STEPS, u = 1 - s;
      const a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
      const x = a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0];
      const y = a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1];
      total += Math.hypot(x - prevX, y - prevY);
      prevX = x; prevY = y;
    }
  }
  return Math.ceil(total);
}

/**
 * 🔴 THE ONLY ANIMATED CARRIER IN THIS MODULE, AND IT CARRIES `animatedProps` — NEVER `style`.
 *    `react-native-svg`'s `<Svg>` clones its `style` prop onto a second host node that reanimated
 *    does not own, which is what shipped every plate in the app invisible at cut 3. A paint prop is
 *    set on the node reanimated resolved, so the clone is irrelevant to it. `motion-arrival-check`'s
 *    LEG B declares this wrapper with that channel stated and asserts both halves at the call sites.
 */
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface ArcDividerProps {
  width: number;
  /** §15.1's range. */
  height?: number;
  tone?: Tone;
}

/** 🔴 §15.1: replaces AT MOST ONE hairline per screen. That is a budget on REPLACEMENT, not on
 *  hairlines — §4.5's tier-2 rule still governs every other divider on the screen.
 *
 *  🔴 IT DRAWS ITSELF IN — owner-requested, 2026-08-06, design §18. This is "the wave" the request
 *     names: the one §15 primitive that sits INSIDE the content block, so it already rides its
 *     section's entrance, and the draw FOLLOWS that entrance rather than replacing it (see
 *     `useDrawIn`'s header for why the two cannot compound). The static offset matches the dash
 *     period so the FIRST FRAME is undrawn before the animation is attached.
 *
 *  ⚠️ CONSEQUENCE, AND IT IS THE SAME ONE `ScreenContainer` ALREADY CARRIES: the draw-in subscribes
 *     to navigation focus, so **this primitive now needs a navigation context.** Its one call site is
 *     a route, so nothing breaks today — but a divider rendered ABOVE the navigator (an error
 *     fallback, a splash) would throw. Recorded at the component because the failure is at mount and
 *     the reason would be nowhere near the stack trace. */
export function ArcDivider({ width, height = 34, tone = 'strong' }: ArcDividerProps) {
  const len = arcLength(width, height);
  const draw = useDrawIn(len);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" {...A11Y}>
      <AnimatedPath
        d={arcPath(width, height)}
        stroke={toneColor(tone)}
        strokeWidth={1}
        strokeDasharray={len}
        strokeDashoffset={len}
        animatedProps={draw}
      />
    </Svg>
  );
}

interface RidgeFieldProps {
  width: number;
  height?: number;
  /** §15.1's optional crest dot. */
  accentNode?: boolean;
}

/** 🔴 §15.1: BEHIND A SCREEN HEADER ONLY, absolute and non-interactive — which is the caller's job,
 *  and `ScreenContainer` is the only caller that does it. TWO ArcDivider paths offset 10dp
 *  vertically, the second at the weaker tone, per §15.1 and §15.3's reference instance. */
export function RidgeField({ width, height = 150, accentNode = false }: RidgeFieldProps) {
  // §15.3 point 3 — the bleed is what removes the endpoints. The reference runs 20dp past each edge.
  const BLEED = 20;
  const OFFSET = 10;
  const inner = height - OFFSET;
  /* 🔴 THIS PRIMITIVE QUALIFIES FOR THE DRAW-IN AND DELIBERATELY DOES NOT HAVE IT. The blocker is
     the CREST DOT, and it is a design sub-decision rather than a technical one — see the module
     header. In one line: `accentNode` is a FILL with no specified entrance of its own, so while the
     two strokes were undrawn it would sit alone on the screen as a lone accent dot for the whole
     600ms wait, on every return. Giving it an entrance is an addition the request did not make, and
     §0.0 rule 1 takes the smaller change. Registered for the owner, not silently skipped. */
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" {...A11Y}>
      <Path d={arcPath(width, inner, BLEED)} stroke={t.color['border-strong']} strokeWidth={1} />
      <Path
        d={arcPath(width, inner, BLEED)}
        stroke={t.color['border-subtle']}
        strokeWidth={1}
        translateY={OFFSET}
      />
      {accentNode ? (
        // §15.1's "2.5r accent dot at the crest", and §15.3 point 1 confirms both the radius and the
        // token against the drawn instance. The crest is the path rule's fixed 55%.
        <Circle cx={-BLEED + (width + 2 * BLEED) * 0.55} cy={inner * 0.2} r={2.5} fill={t.color.accent} />
      ) : null}
    </Svg>
  );
}

interface BlobFieldProps {
  size: number;
  tint?: 'accent' | 'accent-2';
  /** 🔴 PER SCREEN, never per user — see below. */
  seed?: number;
}

/**
 * 🔴 THE ONLY FILL-NOT-STROKE PRIMITIVE, AND THE ONLY ONE THAT TAKES A SEED (§15.1). It replaces the
 * radial aura INSIDE cards — the full-bleed screen-level auras are untouched.
 *
 * ⚠️ THE SEED'S SCOPE IS PER SCREEN AND THAT IS A RULING, NOT A DEFAULT. §15.1: *"deterministic per
 *    user, not per screen"* was a prompt suggestion the owner DID NOT TAKE. Do not implement
 *    per-user seeding.
 * ⚠️ X17's `overflow: 'visible'` wells are unaffected because THE BLOB IS A SIBLING, NOT A MASK
 *    (§15.1). A mask would change what those wells clip, which is an invariant.
 */
export function BlobField({ size, tint = 'accent', seed = 0 }: BlobFieldProps) {
  // §15.1's four nodes with ±8% jitter. A tiny hash keeps it deterministic for a given seed. It is
  // deliberately NOT built on the platform's non-deterministic number source — that would re-roll the
  // shape on every render, and the absence of that call is a gate assertion, so it is not named here.
  const j = (i: number) => {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return ((x - Math.floor(x)) * 2 - 1) * 0.08;
  };
  const w = size, h = size;
  const p = (fx: number, fy: number, i: number) => `${(fx + j(i)) * w} ${(fy + j(i + 4)) * h}`;
  const d =
    `M${p(0.5, 0, 0)} C ${p(0.8, 0.05, 1)}, ${p(1, 0.2, 2)}, ${p(1, 0.4, 3)} ` +
    `C ${p(1, 0.65, 4)}, ${p(0.8, 0.95, 5)}, ${p(0.55, 1, 6)} ` +
    `C ${p(0.3, 1, 7)}, ${p(0, 0.8, 8)}, ${p(0, 0.55, 9)} ` +
    `C ${p(0, 0.3, 10)}, ${p(0.25, 0, 11)}, ${p(0.5, 0, 0)} Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" {...A11Y}>
      {/* NO STROKE — §15.1. The wash is the whole object. */}
      <Path d={d} fill={t.color[tint === 'accent' ? 'accent-muted' : 'accent-2-muted']} />
    </Svg>
  );
}

interface TickRuleProps {
  width: number;
  /** 0-1. Default 0 — flush left under the eyebrow it underlines (§15.1). */
  tick?: number;
  tone?: Tone;
}

/** 🔴 §15.1: THE ONE PRIMITIVE LEGAL INSIDE `SectionCard`, `Card` AND the report screen. Built and
 *  NOT MOUNTED — the eyebrow kicker it sits under has zero call sites; see the module header. */
export function TickRule({ width, tick = 0, tone = 'subtle' }: TickRuleProps) {
  const H = 6;
  return (
    <Svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} fill="none" {...A11Y}>
      <Path d={`M0 ${H / 2} L${width} ${H / 2}`} stroke={toneColor(tone)} strokeWidth={1} />
      <Circle cx={tick * width} cy={H / 2} r={2} fill={t.color.accent} />
    </Svg>
  );
}
