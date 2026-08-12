/**
 * Native fork — there is no gate on a native build.
 *
 * The web fork (pwaGate.web.ts) decides whether an iPhone visitor is shown
 * install instructions instead of the app. On Android and iOS native the user
 * already HAS the app, so every export here is inert.
 *
 * Kept as a real fork rather than a Platform check at the call site so the web
 * fork's DOM access never reaches the native bundle. Export parity is asserted
 * by scripts/web-fork-check.js.
 */

export type PwaGateMode = 'none' | 'install-instructions' | 'open-in-safari';

export function pwaGateMode(): PwaGateMode {
  return 'none';
}

export function tryOpenInSafari(): void {
  // Native has no browser to hand off to.
}

export async function copyCurrentUrl(): Promise<boolean> {
  return false;
}
