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

export type PwaGateMode = 'none' | 'install-instructions' | 'android-play';

function isIosDevice(ua: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // Trap 1: an iPad claiming to be a Mac. A real Mac reports no touch points.
  return /Macintosh/.test(ua) && maxTouchPoints > 1;
}

function isStandalone(): boolean {
  // Trap 2: check both, because older iOS installs only set the second.
  const byDisplayMode = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
  const byLegacyFlag = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return byDisplayMode || byLegacyFlag;
}

export function pwaGateMode(): PwaGateMode {
  // Rendered during a static export with no DOM, so never assume one.
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'none';

  const ua = navigator.userAgent || '';

  // Installed is installed, whichever platform — this is the app, not a tab.
  // Checked before either branch so an installed user is never asked to install.
  if (isStandalone()) return 'none';

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
