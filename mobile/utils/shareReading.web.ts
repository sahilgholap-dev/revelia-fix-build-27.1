// Web fork of utils/shareReading.ts.
//
// Both react-native-share and react-native-view-shot ship TurboModule specs
// that call TurboModuleRegistry.getEnforcing at import time, which is fatal on
// web. Expo Router eagerly requires every route file, so a single native import
// anywhere in app/ crashes the entire web app at startup — not just the screen
// that uses it. Metro resolves this .web.ts instead, keeping both packages out
// of the web graph.
//
// v1 shares TEXT only: there is no view-shot on web, so the card image cannot
// be captured. Upgrading to an image share (html-to-image over the card node,
// then navigator.share with a File) is a recorded follow-up, not a silent gap.
//
// The boolean contract is preserved exactly, because callers gate
// recordMeaningfulAction('share:...') on it: true = a real share happened,
// false = the user dismissed. Never return true for a dismissal.
import { RefObject } from 'react';
import { View } from 'react-native';
import { SHARE_FOOTER } from '@/lib/shareUtils';

/**
 * True when an error represents the user dismissing/cancelling a share sheet
 * (vs a genuine failure). The Web Share API rejects with a DOMException named
 * AbortError on dismissal; the text matchers mirror the native fork so a
 * caller cannot tell the two implementations apart.
 */
export function isShareDismissal(error: unknown): boolean {
  if (!error) return false;
  const e = error as any;
  if (e?.name === 'AbortError') return true;
  const msg = typeof e === 'string' ? e : (e?.message ?? '');
  return e?.dismissedAction === true || /did not share|cancel|dismiss|abort/i.test(msg);
}

/**
 * Shares the reading. On web this is the footer text: navigator.share where
 * available (all iOS Safari, which is the platform this build exists for),
 * clipboard copy as the desktop fallback.
 *
 * Returns true on a real share, false when the user dismissed the sheet — so
 * callers can gate recordMeaningfulAction('share:...') on a genuine share.
 */
export async function shareReadingCard(_viewRef: RefObject<View | null>): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      // Resolves only once the share completes; rejects with AbortError on dismiss.
      await navigator.share({ text: SHARE_FOOTER });
      return true;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(SHARE_FOOTER);
      return true;
    }
    return false;
  } catch (error) {
    if (isShareDismissal(error)) return false;
    throw error;
  }
}
