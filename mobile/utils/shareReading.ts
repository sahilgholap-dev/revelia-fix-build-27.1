import { Share, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { RefObject } from 'react';
import { SHARE_FOOTER } from '@/lib/shareUtils';
import RNShare from 'react-native-share';

/**
 * True when an error represents the user dismissing/cancelling a share sheet
 * (vs a genuine failure). RNShare rejects with dismissedAction:true; expo-sharing
 * and RN's Share surface cancel via the message. Treat any of these as a silent
 * no-op so we never cascade into a second sheet or record a share that didn't happen.
 */
export function isShareDismissal(error: unknown): boolean {
  if (!error) return false;
  const e = error as any;
  const msg = typeof e === 'string' ? e : (e?.message ?? '');
  return e?.dismissedAction === true || /did not share|cancel|dismiss/i.test(msg);
}

/**
 * Shares the captured reading card (image + footer text in one intent).
 * Returns true on a real share, false when the user dismissed the sheet — so
 * callers can gate recordMeaningfulAction('share:...') on a genuine share.
 */
export async function shareReadingCard(viewRef: RefObject<View | null>): Promise<boolean> {
  if (!viewRef.current) {
    throw new Error('View ref not ready');
  }

  let uri: string | null = null;
  try {
    uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile'
    });
  } catch (error) {
    console.error('Failed to capture view snapshot:', error);
  }

  if (uri) {
    try {
      const result = await RNShare.open({
        title: 'Revelia Reading',
        message: SHARE_FOOTER,
        url: `file://${uri}`,
        type: 'image/png',
        failOnCancel: false,
      });
      // With failOnCancel:false a dismissal resolves (dismissedAction:true)
      // instead of rejecting — don't count it as a share.
      return (result as any)?.dismissedAction !== true;
    } catch (error) {
      if (isShareDismissal(error)) return false;
      // Genuine RNShare failure → exactly one fallback (never reaches Share.share).
      try {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        return true;
      } catch (err) {
        if (isShareDismissal(err)) return false;
        throw err;
      }
    }
  } else {
    try {
      await Share.share({ message: SHARE_FOOTER });
      return true;
    } catch (err) {
      if (isShareDismissal(err)) return false;
      throw err;
    }
  }
}
