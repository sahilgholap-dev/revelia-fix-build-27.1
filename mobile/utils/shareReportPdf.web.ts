// Web fork of utils/shareReportPdf.ts.
//
// The native path downloads the PDF to the cache and shares the file. Neither
// half exists on web: FileSystem.cacheDirectory is null, and react-native-share
// is fatal at import. So on web we hand the browser the presigned link and let
// it do what browsers do with a PDF — open a viewer or download it.
//
// The link is short-lived (server signs it for 1h and the screen re-GETs a
// fresh one before every share), so putting it in a tab is acceptable here in
// a way that pasting it into a share sheet would not be.
//
// Same boolean contract as the native fork: true = the user got the report,
// false = they dismissed the share sheet.

/**
 * Opens or shares the report PDF from its presigned link.
 *
 * Returns true on a real share/open, false when the user dismissed the share
 * sheet. Callers gate recordMeaningfulAction('share:report') on the result.
 */
export async function shareReportPdf(secureLink: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({
        title: 'My Personalized Cosmic Report',
        url: secureLink,
      });
      return true;
    }
  } catch (error) {
    // AbortError = the user dismissed the sheet. Anything else falls through to
    // the tab-open below rather than failing the action outright.
    if ((error as { name?: string } | null)?.name === 'AbortError') return false;
  }

  const opened = window.open(secureLink, '_blank', 'noopener,noreferrer');
  return opened !== null; // popup blocked → report the failure honestly
}
