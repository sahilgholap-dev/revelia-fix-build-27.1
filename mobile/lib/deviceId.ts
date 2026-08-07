import { Platform } from 'react-native';
import * as Application from 'expo-application';

/**
 * Stable, hardware-scoped device id for free-Deep-Insight anti-farming (R7 D5).
 *
 * Android → the SSAID via `getAndroidId()` (permission-free; stable per
 * app-signing-key per device). iOS → `identifierForVendor` (permission-free).
 *
 * The RAW id is used ONLY as the `X-Device-Id` header on the Deep-Insight ask
 * (`lib/qa.ts`), where the SERVER salts + hashes it (raw id never persisted
 * server-side, per plan §6). It is NEVER persisted on-device, NEVER logged, and
 * NEVER sent on any other request.
 *
 * FAIL-OPEN: any failure / unavailable id resolves to `null`; the caller then
 * simply omits the header. The server's per-device gate is designed to fail open
 * when the id is absent — a legitimate user is never blocked over a missing id.
 */
let cached: string | null | undefined;

export async function getDeviceId(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    if (Platform.OS === 'android') {
      // Synchronous on Android; returns the SSAID string (or null on failure).
      const id = Application.getAndroidId();
      cached = id && id.length > 0 ? id : null;
    } else if (Platform.OS === 'ios') {
      const id = await Application.getIosIdForVendorAsync();
      cached = id && id.length > 0 ? id : null;
    } else {
      cached = null;
    }
  } catch {
    cached = null;
  }
  return cached;
}
