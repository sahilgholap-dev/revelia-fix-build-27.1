// theme.d.ts — declaration only. theme.js remains the single runtime source.
//
// WHY THIS FILE EXISTS (§6.5 / C-h): theme.js stays `.js` so tailwind.config.js can
// require() it with no loader and Metro needs no transform. This sibling declaration
// hands every token name to the EXISTING `npx tsc --noEmit` gate at zero runtime cost —
// worth it across ~4,200 token edits, where a typo'd `fg-secondry` is otherwise
// invisible until someone looks at the screen.
//
// 🔴 TWO LIMITS OF THIS GATE, stated rather than implied:
//   1. `skipLibCheck: true` in tsconfig.json means this file's OWN body is never
//      type-checked. Use sites in .ts/.tsx ARE checked — that is the whole point and it
//      works — but an error inside these declarations is silent.
//   2. NOTHING CROSS-CHECKS THIS FILE AGAINST theme.js. theme.js is `.js` with `allowJs`
//      unset, so it is not compiled at all. A token added to theme.js and forgotten here
//      (or vice versa) produces no error from any layer of the §4.5 stack. When you edit
//      one, edit both in the same commit — pass 5's colour flip changes VALUES only, so
//      it is the one pass that cannot drift this file.

export type ColorToken =
  | 'bg' | 'surface' | 'surface-raised' | 'surface-overlay' | 'locked' | 'scrim'
  | 'fg' | 'fg-secondary' | 'fg-muted' | 'fg-placeholder' | 'fg-disabled'
  | 'border-subtle' | 'border-strong' | 'border-control'
  | 'accent' | 'accent-muted' | 'accent-2' | 'accent-2-muted' | 'on-accent'
  | 'success' | 'warning' | 'danger';
//        ^ `scrim` is the P20 / §1.6b V-5 addition: ONE value for all 16
//          rgba(0,0,0,0.5–0.7) sites. The 0.5/0.6/0.7 spread was drift, not design.

export type ChartToken = 'harmonious' | 'tense';

/**
 * Tailwind's opacity scale — steps of five, 0…100. `alpha()` accepts NOTHING else, and
 * the type is the compile-time half of that runtime assert. It exists because
 * `bg-success/12` does not compile (Tailwind 3.4 has no `12` key and rejects a bare
 * off-scale modifier), so an inline alpha that could not be expressed as a className
 * would let the two spellings drift apart silently.
 */
export type OpacityStep =
  | 0 | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50
  | 55 | 60 | 65 | 70 | 75 | 80 | 85 | 90 | 95 | 100;

/**
 * `alpha(token, pct)` — the ONE spelling for "a token colour at N% opacity" in an inline
 * style or a StyleSheet entry (pass 1b, owner ruling 2026-07-31).
 *
 * 🔴 REPLACES alpha; never multiplies. THROWS on a token that already carries one
 * (`surface-raised`, `surface-overlay`, `locked`, `fg-disabled`, `border-subtle`,
 * `border-strong`) — those cases are meaningless under either reading, so they fail
 * loudly rather than resolve silently.
 *
 * 🟢 Under HELD values `alpha(color.accent, 30)` resolves identically to the
 * `rgba(245,158,11,0.3)` literal it replaces, so on-scale sites migrate
 * identity-preserving at 1b and change only at pass 5.
 *
 * Use `bg-scrim/60` for a className; use this for everything inline.
 */
export function alpha(c: string, pct: OpacityStep): string;

export type FamilyToken = 'display' | 'quote' | 'body' | 'body-semi' | 'body-bold';

export type TypeStep =
  | 'display-lg' | 'display-md' | 'display-sm' | 'quote'
  | 'text-2xl' | 'text-xl' | 'text-lg' | 'text-base' | 'text-sm' | 'text-xs'
  | 'text-2xs' | 'overline';

export type SpaceToken =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 'screen-x' | 'screen-y' | 'px';

export type RadiusToken = 'sm' | 'md' | 'lg' | 'xl' | 'pill';
export type DurationToken = 'instant' | 'quick' | 'base' | 'moderate' | 'slow' | 'ambient';
export type EasingToken = 'standard' | 'enter' | 'exit' | 'linear';

export interface TypeSpec {
  size: number;
  lineHeight: number;
  letterSpacing: number;
  family: FamilyToken;
  scales: boolean;
}

export interface TxtResult {
  /**
   * 🟢 `fontFamily` IS NOW REQUIRED (pass 4 · E2, 2026-07-31). It was optional only while
   * 2b's `FAMILY_FREEZE` was in force — the five faces did not exist in assets/fonts/ yet,
   * and emitting a family no platform knows makes RN fall back to the system font SILENTLY.
   * E1 installed them and E2 deleted the freeze, so every ramp step now carries its face and
   * the `?` would be a type-level lie in the other direction.
   *
   * The whole object and its `style` are FROZEN and MEMOISED per step: one instance per
   * ramp step for the process lifetime, so the identity is stable across renders. Do not
   * mutate a returned style — clone it (`{...t.txt('text-sm').style, color}`) or compose
   * it in a style array.
   */
  readonly style: Readonly<{
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    fontFamily: string;
  }>;
  readonly allowFontScaling: boolean;
  readonly maxFontSizeMultiplier: number;
}

export const color: Record<ColorToken, string>;
export const chart: Record<ChartToken, string>;
export const family: Record<FamilyToken, string>;
export const type: Record<TypeStep, TypeSpec>;
export function txt(step: TypeStep): TxtResult;
export const space: Record<SpaceToken, number>;
/** migration-only — do not author against these (§6.2, C-b) */
export const spaceLegacy: Record<string, number>;
export const radius: Record<RadiusToken, number>;
export const motion: {
  duration: Record<DurationToken, number>;
  easing: { standard: number[]; enter: number[]; exit: number[]; linear: 'linear' };
  /**
   * 🔴 TWO RISE DISTANCES, NOT ONE — `P97`, 2026-08-06. They were a single `distance: 8` with the
   * error rise written `distance / 2`, and that coupling became a hazard the moment the entrance
   * moved: 4 is not half of 12, so a shared token would have re-specified §5.4's error rise as 6.
   * 🟢 AND THIS FILE IS THE SECOND HALF OF THE FIX. `theme.js` is plain JS, so a hook naming a
   * token that does not exist is invisible to every grep-shaped gate in `scripts/` — `tsc` caught
   * the dangling `distance` reference here and nothing else in the stack did.
   */
  entranceRise: number;
  errorRise: number;
  stagger: number;
  staggerCap: number;
};
export const a11y: { tapMin: number; fontScaleMax: number; hairline: number };
