import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import * as t from '@/theme';

/**
 * textDefaults — THE TWO APP-WIDE TEXT DEFAULTS, AND THE ONLY MECHANISM ON THIS STACK THAT
 * CAN DELIVER THEM.  Build 27.1, codemod pass 4, batches E6a (family) and E6b (scaling).
 *
 * ── 🔴 WHY THIS FILE EXISTS AT ALL: THE DOCUMENTED MECHANISM IS A SILENT NO-OP ──────────────
 *
 * `UI-revamp-design.md` §3.6 and `codemod-plan.md` §1.7 both specify
 *     Text.defaultProps.allowFontScaling = false
 * set once at app root. **On this stack that line changes nothing, silently.** Measured against
 * the installed renderer rather than recalled:
 *
 *   · react 19.0.0, react-native 0.79.6.
 *   · React 19 resolves `defaultProps` for CLASS components ONLY. In
 *     react-native/Libraries/Renderer/implementations/ReactFabric-dev.js the merge lives in
 *     `resolveClassComponentProps()`, and every one of its call sites is reached only through
 *     `shouldConstruct(type)`.
 *   · `updateForwardRef()` passes `nextProps` straight to `renderWithHooks` with no merge at all.
 *   · RN 0.79.6's `Text` is `React.forwardRef(...)` (Libraries/Text/Text.js:41).
 *
 * So `Text.defaultProps = …` assigns a property nothing ever reads: no error, no warning, no
 * build signal — the precise failure shape P23 exists to prevent, arriving through the fix
 * rather than the omission.
 *
 * ── 🔴 AND IT IS LOAD-BEARING TWICE, because the FAMILY needs a global default too ──────────
 *
 * Census over app/ + components/ at pass 4 (`<Text>` opening tags, balanced-expression parse):
 *
 *     1,118 total
 *       328  carry a family utility           -> E3 gives them a face
 *       198  carry a t.txt() spread           -> E2 gives them a face
 *     ───── 592 WITH NO FAMILY AT ALL ────────────────────────────────────────────────
 *       410  className with a size but no family utility
 *        99  style={styles.x} / style={[…]} only
 *        83  no styling attribute whatsoever
 *
 * A Tailwind size utility CANNOT carry a family (Tailwind's fontSize plugin honours only
 * lineHeight, letterSpacing and fontWeight in its options object), so those 592 cannot be reached
 * by the config. Without a working global default, pass 4 ships an app that is **53% system
 * font** — and every layer of the four-layer stack reads green: `no-fontweight` is 0, `--diff`
 * is clean, `--members` is clean, `tsc` is clean. The only instrument that can see it is
 * `token-gate.sh`'s `text-defaults-installed`, which is why that rule exists.
 *
 * ── THE MECHANISM: wrap the forwardRef's `render`, which is the ONE writable seam ────────────
 *
 * `React.forwardRef(fn)` returns `{ $$typeof, render: fn }`, and RN itself proves the object is
 * mutable by assigning `Text.displayName` right after creating it. Wrapping `render` therefore
 * reaches EVERY `<Text>` in the app and every `<Text>` inside a library (React Navigation's tab
 * labels, for one) with no per-site edit and no new component.
 *
 * 🔴 PROP AND STYLE ORDER ARE BOTH LOAD-BEARING, IN OPPOSITE DIRECTIONS:
 *   · `allowFontScaling` is spread BEFORE `...props`, so any explicit prop WINS. That is what
 *     lets pass 2b's 70 opt-in call sites and every `t.txt()` spread on a `scales: true` step
 *     keep scaling. Put it after `...props` and the freeze silently overrides the opt-ins —
 *     shipping exactly the release P23 forbids.
 *   · the default STYLE goes FIRST in the style array, so any per-site `fontFamily` WINS. That
 *     is what keeps @expo/vector-icons rendering icons (`createIconSet` pushes its own
 *     `fontFamily` into `props.style`, which lands after ours) and what lets all 328 family
 *     utilities and 198 txt() spreads override the body default.
 *
 * ⚠️ TextInput GETS THE SAME TREATMENT, deliberately. Its family matters for the same reason
 *    Text's does — a Roboto input in a Figtree app is the mixed-font defect this pass exists to
 *    remove — and §3.6 names the Q&A composer BY NAME as a surface that must never reflow.
 *
 * ⚠️ WHAT THIS DOES **NOT** REACH: react-native-svg's `Text`, which is a different component
 *    entirely. The one site that matters is the birth-chart wheel's planet symbols, and they are
 *    pictographs in neither shipped face — see the comment there.
 *
 * 🔴 IT MUST BE CALLED AT MODULE SCOPE, not from an effect: effects run after the first render,
 *    and a `<Text>` that has already mounted does not re-resolve its typeface. It therefore also
 *    MUST NOT THROW — a module-scope throw runs at import, before React mounts, where the root
 *    ErrorBoundary cannot see it and the app dies white (theme.js's standing rule). Hence the
 *    boolean return and the loud `console.error` instead of an assertion.
 */

// One frozen instance, referenced forever, so the style prop's identity does not churn per
// render — the same reasoning that made txt() memoised in pass 2b.
const DEFAULT_TEXT_STYLE = Object.freeze({ fontFamily: t.family.body });

// E6b — the global scaling freeze. `false` app-wide; the five reading-copy steps opt back in
// through txt()/the 70 JSX props that pass 2b landed. Flip this ONE constant to `true` to ship
// pass 4 without the freeze (codemod-plan §1.7's named fallback) — that is a one-line change and
// does NOT require reverting E6a's family default, which is the whole reason both live here.
const FREEZE_FONT_SCALING = true;

type ForwardRefLike = { render?: (props: unknown, ref: unknown) => unknown };

let installed = false;

function patch(component: unknown, label: string): boolean {
  const target = component as ForwardRefLike;
  if (typeof target.render !== 'function') {
    console.error(
      `installTextDefaults: ${label} is not the forwardRef shape this patch expects, so the ` +
      `app-wide font family and the font-scaling freeze are NOT applied. Text will render in ` +
      `the system font. This means React Native changed ${label}'s implementation — see ` +
      `mobile/lib/textDefaults.ts.`
    );
    return false;
  }
  const original = target.render;
  target.render = function patched(props: unknown, ref: unknown) {
    const p = (props ?? {}) as { style?: unknown };
    return original.call(this, {
      // BEFORE the spread: an explicit prop at the call site wins (the P23 opt-ins).
      ...(FREEZE_FONT_SCALING ? { allowFontScaling: false } : null),
      ...p,
      // AFTER the spread: ours is FIRST in the array, so per-site styles win.
      style: [DEFAULT_TEXT_STYLE, p.style],
    }, ref);
  };
  return true;
}

/**
 * Install the app-wide text defaults. Idempotent, never throws, returns whether both patches
 * applied. Call once, at MODULE SCOPE in the root layout.
 */
export function installTextDefaults(): boolean {
  if (installed) return true;
  const okText = patch(RNText, 'Text');
  const okInput = patch(RNTextInput, 'TextInput');
  installed = okText && okInput;
  return installed;
}
