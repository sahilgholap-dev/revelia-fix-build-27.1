// Sharing the Cosmic Report PDF, extracted from app/(main)/readings/cosmic-report.tsx
// so the web bundle can fork it. The native body below is the original inline
// block moved verbatim: same RNShare.open arguments, same failOnCancel:false,
// same single expo-sharing fallback, same dismissal semantics.
//
// Why it had to move: the screen downloaded the PDF with FileSystem.downloadAsync
// (cacheDirectory is null on web) and then shared it with RNShare (whose
// TurboModule spec is fatal on web at import). Both now live behind this seam.
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import RNShare from 'react-native-share';
import { isShareDismissal } from './shareReading';

const SHARE_TITLE = 'My Personalized Cosmic Report';
const SHARE_MESSAGE =
  'My Personalized Cosmic Report from Revelia — Vedic and Western astrology, dasha timing, numerology and palm, in one dated PDF. ✨';

/**
 * Downloads the report from its presigned link and shares the FILE — never the
 * private link itself (a 1h URL would leak and soon 404).
 *
 * Returns true on a real share, false when the user dismissed. Callers gate
 * recordMeaningfulAction('share:report') on the result. Throws only on a
 * genuine failure, which the caller surfaces as a notice.
 */
export async function shareReportPdf(secureLink: string): Promise<boolean> {
  const target = `${FileSystem.cacheDirectory}revelia-cosmic-report.pdf`;
  const { uri } = await FileSystem.downloadAsync(secureLink, target);

  try {
    const result = await RNShare.open({
      title: SHARE_TITLE,
      message: SHARE_MESSAGE,
      url: uri, // file:// from cacheDirectory (already scheme-prefixed)
      type: 'application/pdf',
      failOnCancel: false,
    });
    // failOnCancel:false → a dismissal resolves (dismissedAction:true); don't
    // count it as a share.
    return (result as any)?.dismissedAction !== true;
  } catch (err) {
    if (isShareDismissal(err)) return false;
    // One fallback: expo-sharing (file only, no message text on Android).
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    return true;
  }
}
