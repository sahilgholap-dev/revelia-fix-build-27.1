import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * Returns the paddingBottom a screen's scroll content needs in order to clear whatever occupies the
 * bottom of the window — the tab bar inside the tab navigator, the system navigation row outside it.
 *
 * Build 22 fix for Android-only clipping on Home (Recent Readings), Face Reading + Monthly Reading
 * + Profile (disclaimer trail), and Compatibility ("View Past Readings" — a functional blocker).
 * 17 call sites in 16 files today.
 *
 * ── 🔴 2026-08-05: THE INSET WAS BEING COUNTED TWICE, AND THAT IS THE EMPTY BAND ────────────────
 *
 * This hook used to return `insets.bottom + tabBarHeight + extraBottom`. Measured in the installed
 * @react-navigation/bottom-tabs 7.16.1:
 *
 *   · `useBottomTabBarHeight()` returns the value of `getTabBarHeight`, and that function ADDS the
 *     system inset itself (`TABBAR_HEIGHT_UIKIT + inset`) unless a numeric height in `tabBarStyle`
 *     short-circuits it. Since 2026-08-05 `app/(main)/_layout.tsx` supplies a height that carries
 *     the inset explicitly, so the term is present in EITHER branch. Adding it again here is a
 *     second copy of one measurement.
 *   · and it is a THIRD copy at the site: every caller renders inside `ScreenContainer`, whose
 *     SafeAreaView takes ALL edges and therefore already pads the content box by the same inset.
 *
 * On a 3-button device that put the last row of content ~112 above the bar instead of the intended
 * `extraBottom`. 🟢 The corrected expression is an EXACT no-op where the system row does not overlay
 * the window (the inset is 0 there, so `max(0, h - 0) + extra` is the old `0 + h + extra`), which is
 * every device the Build-22 numbers were tuned on.
 *
 * 🔴 THE PRECONDITION, WRITTEN DOWN BECAUSE THE ARITHMETIC DEPENDS ON IT: the value assumes the
 *    caller sits inside a container that has ALREADY cleared the system inset — which is what
 *    `ScreenContainer`'s SafeAreaView does for all 17 sites. `scripts/primitive-adoption-check.js`
 *    asserts exactly that, per file, so a future caller outside that container is a gate failure
 *    rather than content that quietly slides under the system row.
 *
 * `useBottomTabBarHeight` throws when called outside a tab navigator (nested screens, modals). The
 * try/catch returns 0 in that case, so the hook is safe to use anywhere; with no bar, the caller's
 * container has already cleared the system row and only `extraBottom` remains.
 *
 * @param extraBottom breathing room past the obstruction (default 16)
 */
export function useBottomInsetPadding(extraBottom: number = 16): number {
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = 0;
  }
  // The bar's height already contains the system inset, and so does the container we are padding
  // inside. What is left to clear is the bar's own visible band above that inset.
  return Math.max(0, tabBarHeight - insets.bottom) + extraBottom;
}
