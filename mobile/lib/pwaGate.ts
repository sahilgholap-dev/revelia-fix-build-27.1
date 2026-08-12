/**
 * Native fork — there is no gate on a native build.
 *
 * The web fork (pwaGate.web.ts) decides whether an iPhone visitor is shown
 * install instructions instead of the app. On Android and iOS native the user
 * already HAS the app, so this is inert.
 *
 * Kept as a real fork rather than a Platform check at the call site so the web
 * fork's DOM access never reaches the native bundle. Export parity is asserted
 * by scripts/web-fork-check.js.
 */

export type PwaGateMode = 'none' | 'install-instructions' | 'android-play';

export function pwaGateMode(): PwaGateMode {
  return 'none';
}

/**
 * Native IS the installed app, so this is unconditionally true.
 *
 * The web fork uses it to decide whether asking for notification permission can
 * succeed at all; on native the platform's own permission flow applies and
 * there is no tab-versus-app distinction to make.
 */
export function isStandaloneDisplay(): boolean {
  return true;
}
