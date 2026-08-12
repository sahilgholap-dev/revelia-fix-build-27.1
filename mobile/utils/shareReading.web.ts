// Web fork of utils/shareReading.ts.
//
// Both react-native-share and react-native-view-shot ship TurboModule specs
// that call TurboModuleRegistry.getEnforcing at import time, which is fatal on
// web. Expo Router eagerly requires every route file, so a single native import
// anywhere in app/ crashes the entire web app at startup — not just the screen
// that uses it. Metro resolves this .web.ts instead, keeping both packages out
// of the web graph.
//
// 🟢 THE IMAGE IS NOW SHARED, closing the v1 gap this file used to record. Native
//    captures the card with view-shot; there is no view-shot on web, so the card's
//    DOM node is rasterised with html-to-image and handed to navigator.share as a
//    File. The card is pure text and styled views — no remote images, no canvas,
//    nothing cross-origin — which is what makes DOM rasterisation viable here.
//
// 🔴 THREE FALLBACKS, IN ORDER, AND EVERY ONE OF THEM STILL SHARES SOMETHING:
//
//      1 · image + text   navigator.share with a File, when canShare says the
//                         browser accepts files (iOS 15+, Android Chrome)
//      2 · text only      navigator.share without a File — the old behaviour,
//                         used when file sharing is unsupported OR when the
//                         rasterisation fails for any reason
//      3 · clipboard      the desktop path, where navigator.share is absent
//
//    A capture failure must never lose the share. Sharing the text is the outcome
//    the user asked for minus the picture; sharing nothing because a canvas step
//    threw is a broken button.
//
// The boolean contract is preserved exactly, because callers gate
// recordMeaningfulAction('share:...') on it: true = a real share happened,
// false = the user dismissed. Never return true for a dismissal.
import { RefObject } from 'react';
import { View } from 'react-native';
import { toBlob } from 'html-to-image';
import { SHARE_FOOTER } from '@/lib/shareUtils';
import * as t from '@/theme';

/** Name the shared file carries into the target app's attachment list. */
const FILE_NAME = 'revelia-reading.png';

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
 * Rasterises the card, or returns null.
 *
 * ⚠️ NEVER THROWS. Every failure here is recoverable by sharing text instead, so
 * a thrown error would only convert a slightly-worse share into no share at all.
 *
 * ⚠️ `pixelRatio: 2` because the card is laid out in CSS pixels and a 1x capture
 * looks soft in a messaging app, where the recipient views it at full width.
 *
 * ⚠️ `backgroundColor` is set explicitly, FROM THE TOKEN: the card sits on the
 * screen's ground rather than painting its own, so a transparent PNG would arrive
 * as a black or white rectangle depending on the recipient's app rather than as
 * the card's ground. Taken from the theme rather than written as a literal —
 * utils/ is inside token-gate's scope and a raw hex here is a blocking failure,
 * which is how the first draft of this function was caught.
 */
async function captureCard(node: HTMLElement): Promise<Blob | null> {
  try {
    return await toBlob(node, {
      pixelRatio: 2,
      backgroundColor: t.color.bg,
      // html-to-image inlines fonts by fetching them; ours are same-origin, so
      // the embed succeeds and the card keeps its own typefaces rather than
      // falling back to a system face in the exported image.
      cacheBust: true,
    });
  } catch (error) {
    console.warn('[share] card capture failed, falling back to text:', error);
    return null;
  }
}

/**
 * Shares the reading — the card image plus the footer text where the browser
 * supports it, text alone otherwise.
 *
 * Returns true on a real share, false when the user dismissed the sheet — so
 * callers can gate recordMeaningfulAction('share:...') on a genuine share.
 */
export async function shareReadingCard(viewRef: RefObject<View | null>): Promise<boolean> {
  try {
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    if (canShare) {
      // On react-native-web a View's ref IS its host element, which is what
      // makes the native fork's ref signature usable here unchanged.
      const node = viewRef.current as unknown as HTMLElement | null;

      if (node) {
        const blob = await captureCard(node);

        if (blob) {
          const file = new File([blob], FILE_NAME, { type: 'image/png' });

          // canShare({ files }) is the only honest test — a browser can support
          // navigator.share and still refuse files, and calling share() with an
          // unsupported File rejects with a TypeError that is NOT a dismissal.
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], text: SHARE_FOOTER });
            return true;
          }
        }
      }

      // Text-only: file sharing unsupported, the node was missing, or the
      // capture failed. Still a share.
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
