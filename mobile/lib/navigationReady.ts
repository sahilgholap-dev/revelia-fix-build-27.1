// A one-way latch saying whether Expo Router's navigator has mounted, plus a
// queue for navigations that arrive before it has.
//
// 🔴 WHY: some navigations originate OUTSIDE React and cannot wait their turn.
// The axios response interceptor in lib/api.ts redirects to login when a token
// refresh fails — it is triggered by a network response, so its timing is set
// by the server, not by the render tree. On a cold start that response can land
// before the navigator exists, and expo-router then throws
//
//     "Attempted to navigate before mounting the Root Layout component"
//
// which is fatal: the render tree never recovers and the page stays BLANK.
//
// MEASURED ON WEB, where it is not an edge case but the normal path — reloading
// the page is ordinary user behaviour, and a reload on ANY route re-runs auth
// against a possibly-stale token. All seven routes tried (/home /readings
// /astrology /profile /face-capture /palm-capture /birth-data) rendered an empty
// document. In-app navigation was fine throughout, which is what hides it.
//
// The same race exists on native (a 401 arriving during launch), it is just far
// rarer there — so this is not a web workaround, it is the missing guard.
//
// Deliberately NOT a React hook: the callers are modules, not components.

// 🔴 WHY A RETRY AND NOT A PREDICATE. The obvious fix is "check a readiness flag
// before navigating", and it was tried first: gating on useRootNavigationState()
// .key — the exact guard app/index.tsx uses for its <Redirect> — STILL THREW.
// Measured: the key is truthy while expo-router's own assertIsReady is still
// false, so the two signals disagree during the first commit. Rendering the
// navigator on the first render (the fontsReady bypass in _layout) is necessary
// but also not sufficient on its own.
//
// So the reliable move is to stop predicting the moment and react to it: attempt
// the navigation, and if the router says it is not mounted yet, try again on the
// next tick. Self-healing, and it cannot go stale if expo-router changes which
// internal flag flips first.
const RETRY_MS = 50;
const MAX_ATTEMPTS = 40; // ~2s, far beyond the observed window of a few frames

const NOT_READY = /before mounting the Root Layout|navigation.*not.*ready/i;

/**
 * Navigates, retrying briefly if the router is not mounted yet.
 * Any other error is reported once and not retried — a genuinely bad route
 * should surface, not spin.
 */
export function safeNavigate(navigate: () => void, attempt = 0): void {
  try {
    navigate();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (NOT_READY.test(message) && attempt < MAX_ATTEMPTS) {
      setTimeout(() => safeNavigate(navigate, attempt + 1), RETRY_MS);
      return;
    }
    console.warn('[nav] navigation failed:', error);
  }
}

let ready = false;
let queued: Array<() => void> = [];

/** Called once by the root layout when the navigator reports it has mounted. */
export function setNavigationReady(): void {
  if (ready) return;
  ready = true;
  const pending = queued;
  queued = [];
  for (const run of pending) {
    safeNavigate(run);
  }
}

/**
 * Runs `navigate` now if the navigator is mounted, otherwise once it is.
 * A navigation that arrives early is DEFERRED, never dropped and never thrown.
 */
export function whenNavigationReady(navigate: () => void): void {
  if (ready) {
    safeNavigate(navigate);
    return;
  }
  queued.push(navigate);
}

export function isNavigationReady(): boolean {
  return ready;
}
