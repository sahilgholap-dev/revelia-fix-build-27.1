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
 *  3 · EVERY iOS BROWSER IS SAFARI UNDERNEATH. Chrome, Firefox and Edge on
 *      iPhone are WebKit wearing a different shell, so all of them carry
 *      "Safari" in the user agent. They are told apart only by their own
 *      marker — CriOS, FxiOS, EdgiOS, OPiOS — and testing for "Safari"
 *      alone identifies all four as Safari.
 *
 * Export parity with the native fork is asserted by scripts/web-fork-check.js.
 */

export type PwaGateMode = 'none' | 'install-instructions' | 'open-in-safari';

/** Markers the non-Safari iOS browsers put in their own user agent. */
const NON_SAFARI_IOS = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser/;

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
  if (!isIosDevice(ua, navigator.maxTouchPoints || 0)) return 'none';

  // Already installed — this is the app, not a tab. Nothing to ask for.
  if (isStandalone()) return 'none';

  // Trap 3: the marker identifies the shell; "Safari" alone does not.
  return NON_SAFARI_IOS.test(ua) ? 'open-in-safari' : 'install-instructions';
}

/**
 * Attempts to reopen the current URL in Safari.
 *
 * ⚠️ THIS CANNOT BE RELIED ON AND THE CALLER MUST NOT PRETEND OTHERWISE. iOS
 * exposes no supported way for a web page to launch Safari; the `x-safari-`
 * prefix is an Apple-internal scheme that has worked from third-party iOS
 * browsers on some versions and been closed on others. When it is blocked the
 * navigation is simply ignored — no error, no event, nothing to catch.
 *
 * So this is a best effort, and every caller must offer a path that does not
 * depend on it. `copyCurrentUrl` is that path.
 */
export function tryOpenInSafari(): void {
  try {
    window.location.href = `x-safari-${window.location.href}`;
  } catch {
    // Blocked schemes throw in some shells and are silently dropped in others.
    // Either way the fallback is what the user actually needs.
  }
}

/** Copies the current URL. Returns false if the browser refuses, so the UI can say so. */
export async function copyCurrentUrl(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
}
