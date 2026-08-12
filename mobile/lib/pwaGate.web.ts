/**
 * Decides whether an iPhone visitor sees the app or install instructions.
 *
 * iOS is the only platform without a native Revelia build, so the web PWA is
 * the entire product there — and an iPhone user browsing in a tab gets none of
 * what makes it usable: full screen, the home-screen icon, notifications.
 * So on iOS, in a browser, the app is replaced by instructions for installing
 * it. Android and desktop are untouched; they keep working in the browser.
 *
 * 🔴 THREE DETECTION TRAPS, ALL OF WHICH LOOK FINE UNTIL A REAL DEVICE:
 *
 *  1 · iPadOS 13+ REPORTS ITSELF AS A MAC. Its user agent says "Macintosh" with
 *      no iPad anywhere in it, so the obvious test misses every iPad. The
 *      distinguishing signal is a touch-capable "Mac", which no real Mac is.
 *
 *  2 · iOS HAS TWO STANDALONE SIGNALS AND NEEDS BOTH CHECKED. The modern
 *      display-mode query is the standard, but Safari shipped the non-standard
 *      navigator.standalone first and older installs still report only that.
 *      Miss it and an installed user is shown instructions for installing.
 *
 *  3 · 🔴 DO NOT REINTRODUCE A SAFARI-ONLY BRANCH. An earlier version of this
 *      file sent Chrome, Firefox and Edge users to a "Safari required" screen,
 *      on the belief that Add to Home Screen was Safari-only. THAT HAS BEEN
 *      FALSE SINCE iOS 16.4 (March 2023): Apple opened the API to third-party
 *      browsers and Chrome for iOS shipped support that July. The result is a
 *      real standalone web app honouring the manifest, not a browser shortcut,
 *      so trap 2's check sees it correctly. The old branch told users to switch
 *      browsers for no reason — corrected after an iPhone 15 install from
 *      Chrome disproved it. Only iOS below 16.4 still needs Safari, and the
 *      instructions carry one line for that rather than a second screen and a
 *      version parser.
 *
 * Export parity with the native fork is asserted by scripts/web-fork-check.js.
 */

import { PLAY_STORE_URL, androidLaunchIntentUrl } from './storeLinks';

export type PwaGateMode = 'none' | 'install-instructions' | 'android-play';

function isIosDevice(ua: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // Trap 1: an iPad claiming to be a Mac. A real Mac reports no touch points.
  return /Macintosh/.test(ua) && maxTouchPoints > 1;
}

/**
 * Whether the page is running as an installed app rather than a browser tab.
 *
 * Exported because web push needs the same test: iOS rejects the notification
 * permission API outside an installed PWA. A second copy of this logic in the
 * push module is exactly the kind of duplicate that drifts, so there is one.
 */
export function isStandaloneDisplay(): boolean {
  // Trap 2: check both, because older iOS installs only set the second.
  const byDisplayMode = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
  const byLegacyFlag = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return byDisplayMode || byLegacyFlag;
}

/**
 * Best-effort hand-off of the current URL to Safari, paired with a clipboard copy.
 *
 * ⚠️ THE HAND-OFF CANNOT BE RELIED ON AND THE CALLER MUST NOT PRETEND IT CAN.
 * iOS exposes no supported way for a web page to launch Safari; `x-safari-` is
 * an Apple-internal scheme that has worked from third-party iOS browsers on some
 * versions and been closed on others, and when it is blocked the navigation is
 * simply ignored — no error, no event, nothing to catch.
 *
 * So the copy is not a fallback that appears after a failure; it happens on the
 * SAME tap. If the hand-off works the user is gone and never reads the
 * confirmation. If it does not, the link is already on their clipboard. There is
 * no third outcome where the tap did nothing.
 *
 * Returns whether the copy succeeded, which is the only half that can be known.
 */
export async function openInSafariAndCopy(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const href = window.location.href;

  let copied = false;
  try {
    await navigator.clipboard.writeText(href);
    copied = true;
  } catch {
    // Clipboard access can be refused by permission or by an insecure context.
    // Nothing to recover — the caller says so rather than claiming success.
  }

  try {
    window.location.href = `x-safari-${href}`;
  } catch {
    // Blocked schemes throw in some shells and are silently dropped in others.
  }

  return copied;
}

/**
 * Opens the installed Android app, or the Play listing if it is not installed.
 *
 * ONE CONTROL, TWO DESTINATIONS, and unlike the iOS Safari hand-off this one can
 * actually be made reliable — because on Android a failed hand-off IS detectable.
 *
 * Two layers, in order:
 *
 *  1 · the intent URL. Chrome reads `browser_fallback_url` and goes to Play by
 *      itself when the package is absent, so for Chrome — and the Chromium
 *      browsers that make up nearly all of Android — this alone is correct.
 *
 *  2 · a visibility check, for the browsers that ignore `intent://` outright and
 *      simply do nothing. If we are still here and still VISIBLE a moment later,
 *      the hand-off did not take, so the Play listing is opened directly. When
 *      the app or Play does open, this tab goes to the background and
 *      visibilityState is no longer 'visible', so the timer becomes a no-op.
 *
 * 🔴 THE SECOND LAYER IS WHY THIS CAN BE A SINGLE BUTTON. Without it, a browser
 *    that drops intent URLs would leave a control that does nothing at all —
 *    the dead-button failure this project has now met four times. With it, every
 *    path ends somewhere useful, so the visible fallback link is no longer
 *    needed to guarantee an exit.
 *
 * Worst case is a duplicate navigation to Play, which is the same destination
 * the user asked for.
 */
export function openAndroidAppOrPlay(): void {
  if (typeof window === 'undefined') return;

  window.location.href = androidLaunchIntentUrl();

  window.setTimeout(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      window.location.href = PLAY_STORE_URL;
    }
  }, 1200);
}

export function pwaGateMode(): PwaGateMode {
  // Rendered during a static export with no DOM, so never assume one.
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'none';

  const ua = navigator.userAgent || '';

  // Installed is installed, whichever platform — this is the app, not a tab.
  // Checked before either branch so an installed user is never asked to install.
  if (isStandaloneDisplay()) return 'none';

  if (isIosDevice(ua, navigator.maxTouchPoints || 0)) return 'install-instructions';

  // 🔴 ANDROID GOES TO PLAY, NOT TO THE PWA, and the asymmetry with iOS is the
  //    point rather than an inconsistency: Android has a native app and iOS has
  //    none, so the web build exists FOR iOS. Sending an Android visitor to the
  //    Play listing gives them the better product; sending an iPhone visitor
  //    anywhere but the PWA gives them nothing.
  //
  //    ⚠️ Excludes Android TVs and the like, which are not the audience, by
  //    requiring the Mobile token that a phone browser sends.
  if (/Android/.test(ua) && /Mobile/.test(ua)) return 'android-play';

  return 'none';
}
