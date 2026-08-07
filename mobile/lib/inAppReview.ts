import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

let hasPromptedThisSession = false;

/**
 * Attempt to show the native in-app review sheet.
 *
 * Returns `true` ONLY if `StoreReview.requestReview()` was actually called —
 * i.e. Android + the review API is available + we haven't already prompted this
 * session. Returns `false` in every other case. The caller (reviewStore) uses
 * this boolean to decide whether to advance the rating ladder: no real attempt
 * → ladder stays put so the next eligible action retries.
 *
 * The Android platform gate and the once-per-session `hasPromptedThisSession`
 * guard are unchanged from the previous implementation.
 */
export async function attemptReview(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (hasPromptedThisSession) return false;
  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return false;
  hasPromptedThisSession = true;
  await StoreReview.requestReview();
  return true;
}
