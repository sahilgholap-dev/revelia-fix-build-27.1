// Web fork of lib/cameraPermission.ts.
//
// 🔴 THE BUG THIS EXISTS FOR: on web, tapping "Grant Permission" could do
// NOTHING VISIBLE. expo-camera's web request calls getUserMedia and maps every
// failure to the same `denied` result, the screen re-rendered the identical
// "Camera Permission Required" state, and the user was left tapping a button
// that appeared dead. Three genuinely different situations all looked the same:
//
//   1 · the page is not on HTTPS, so navigator.mediaDevices does not exist and
//       no prompt is possible — the single most likely cause when testing from
//       a phone against a LAN address;
//   2 · the user (or the browser, after an earlier dismissal) has BLOCKED the
//       camera for this site, in which case re-asking is silently refused and
//       no amount of tapping will ever work — it has to be changed in site
//       settings;
//   3 · there is no camera at all.
//
// Each needs a different action from the user, so each gets its own sentence.
// This never throws: it is called from a catch/failure path, and a diagnostic
// that fails must not replace the problem it was describing.

export function describeCameraFailure(): string | null {
  try {
    if (typeof navigator === 'undefined') return null;

    // 1 · insecure context. Browsers only expose mediaDevices over HTTPS (and
    // on localhost), so this is a transport problem, not a permission one.
    const secure = typeof window !== 'undefined' ? window.isSecureContext : true;
    if (!secure || !navigator.mediaDevices?.getUserMedia) {
      return 'Your browser only allows camera access on a secure (https) connection. Open this site over https and try again.';
    }

    // 3 · no camera hardware. enumerateDevices is sync-safe to call but async to
    // resolve, so this is handled in the async helper below; the sync path
    // falls through to the generic blocked message.
    return 'Your browser is blocking camera access for this site. Open the padlock (or site settings) in the address bar, allow Camera, then reload this page.';
  } catch {
    return null;
  }
}

/**
 * Richer async diagnosis, used when we can afford to await. Distinguishes
 * "blocked" from "no camera present", which the sync version cannot.
 */
export async function describeCameraFailureAsync(): Promise<string | null> {
  const sync = describeCameraFailure();
  // An insecure context is decisive — no point probing further.
  if (sync && sync.includes('https')) return sync;

  try {
    if (navigator.mediaDevices?.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!devices.some((d) => d.kind === 'videoinput')) {
        return 'No camera was found on this device. You can upload a photo from your gallery instead.';
      }
    }
    // Permissions API is not implemented for 'camera' in every browser (Safari
    // notably), so a throw here means "unknown", never "granted".
    const status = await (navigator as any).permissions?.query?.({ name: 'camera' });
    if (status?.state === 'denied') {
      return 'Camera access is blocked for this site. Open the padlock (or site settings) in the address bar, allow Camera, then reload this page.';
    }
  } catch {
    // fall through to the sync message
  }
  return sync;
}
