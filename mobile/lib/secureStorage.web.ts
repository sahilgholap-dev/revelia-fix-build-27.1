// Web fork of lib/secureStorage.ts — localStorage-backed.
//
// SECURITY POSTURE, stated plainly because "secure" is in the module name:
// localStorage is NOT the Keychain/Keystore. A token here is readable by any
// script running on the origin, so on web the auth token's confidentiality
// rests on the page loading no untrusted third-party script. That is the
// standard SPA trade-off and it is why the deployed page ships a CSP. Native
// builds are unaffected — they keep the hardware-backed store.
//
// Every accessor is wrapped: Safari in Private Browsing (and any origin with
// storage disabled) throws on access rather than returning null. A throw here
// would surface as an unhandled rejection during launch, so the degraded
// behaviour is "logged out" rather than "white screen".
//
// Keys are unchanged from native so nothing else in the app needs to know
// which platform it is on.

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or storage blocked: the session continues in memory and
    // simply will not survive a reload.
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do — a key we cannot read is already effectively absent.
  }
}
