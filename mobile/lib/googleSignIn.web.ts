// Web fork of lib/googleSignIn.ts, using Google Identity Services (GSI).
//
// @react-native-google-signin/google-signin is native-only. On web the
// equivalent is GSI, which returns the SAME artifact — a Google ID token — so
// the SERVER NEEDS NO CHANGE: auth.service.verifyGoogleToken already validates
// the token against GOOGLE_OAUTH_WEB_CLIENT_ID, and that is the very client ID
// used here. One client ID, two front ends.
//
// 🔴 WHY THE RENDERED BUTTON AND NOT ONE TAP. This fork used to call
//    google.accounts.id.prompt(). Dismissing that prompt puts the origin into a
//    COOLDOWN — the browser suppresses third-party sign-in for a growing window
//    — and the two status callbacks written to detect it, isNotDisplayed and
//    isSkippedMoment, DO NOT FIRE UNDER FedCM. Measured, and Google's own
//    console warning says those methods are being retired. The result was a
//    button that opened the chooser once and then produced a two-minute spinner
//    on every later press.
//
//    The rendered button is BUTTON MODE: user-gesture initiated, always shows
//    the chooser, exempt from that cooldown. It is also why the old 120-second
//    backstop is gone rather than shortened — nothing is awaited across
//    Google's UI anymore, so there is no promise left to strand.
//
// OWNER ACTION REQUIRED before this works in a browser: the origin must be
// listed under "Authorized JavaScript origins" on that OAuth client in Google
// Cloud Console, project revelia-497203. See
// docs/GOOGLE_SIGNIN_WEB_SETUP.md. Without it GSI rejects the origin.
//
// Export list mirrors lib/googleSignIn.ts and adds three web-only helpers;
// parity is asserted by scripts/web-fork-check.js.

import { showAlert } from './alert';

export const GOOGLE_SIGN_IN_CANCELLED = 'GOOGLE_SIGN_IN_CANCELLED';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Google's rendered button takes a pixel width and caps at 400.
const MAX_BUTTON_WIDTH = 400;
const FALLBACK_BUTTON_WIDTH = 320;

let gsiLoader: Promise<void> | null = null;

/** Loads Google's script once, on demand. */
function loadGsi(): Promise<void> {
  if (gsiLoader) return gsiLoader;
  gsiLoader = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.id) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = GSI_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => {
      gsiLoader = null; // allow a retry on the next attempt
      reject(new Error('Google Sign-In script failed to load'));
    };
    document.head.appendChild(el);
  });
  return gsiLoader;
}

/**
 * No-op on web: initialization happens in mountGoogleButton, which is the only
 * place that has the credential callback to hand it.
 */
export function configureGoogleSignIn(): void {}

/**
 * Renders Google's own button into `host` and reports each credential.
 *
 * Rejects if the script cannot load or no client ID is configured; the caller
 * is expected to fall back to a control that explains itself rather than a
 * button that does nothing. Resolves WITHOUT rendering if `host` is no longer
 * attached to the document by the time the script has loaded — the component
 * unmounted mid-flight, and there is nothing left to draw a button into.
 */
export async function mountGoogleButton(
  host: HTMLElement,
  onCredential: (idToken: string) => void
): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('No Google client ID — EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set');
  }
  await loadGsi();

  const google = (window as any).google;
  if (!google?.accounts?.id) {
    throw new Error('Google Sign-In unavailable');
  }

  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (response: { credential?: string }) => {
      if (response?.credential) onCredential(response.credential);
    },
  });

  // The component may have unmounted while the script above was loading —
  // React does not (and cannot) cancel this async function mid-flight. A
  // detached host still has a getBoundingClientRect() (it returns all zeros),
  // so rendering into it would silently take FALLBACK_BUTTON_WIDTH and paint a
  // button nobody will ever see. Checking here, rather than in the component,
  // keeps this DOM-lifecycle knowledge where the DOM node is read.
  if (!host.isConnected) return;

  const measured = Math.round(host.getBoundingClientRect().width) || FALLBACK_BUTTON_WIDTH;
  google.accounts.id.renderButton(host, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    logo_alignment: 'center',
    width: Math.min(measured, MAX_BUTTON_WIDTH),
  });
}

/**
 * Best-effort display fields out of the ID token payload.
 *
 * NEVER trusted for auth — the server re-verifies the token itself. These two
 * values exist only so the confirm dialog can name the account the user is
 * about to sign in as.
 */
export function profileFromIdToken(idToken: string): { name: string; email: string } {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return { name: '', email: '' };
    // atob() alone returns a Latin-1 byte string: a non-ASCII name ("अनिल",
    // "José", "李") comes out as mojibake, silently — JSON.parse still
    // succeeds on the mangled bytes. Re-decoding those bytes as UTF-8 is what
    // makes the confirm dialog actually name the account it is naming.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
    const parsed = JSON.parse(json);
    return { name: parsed?.name ?? '', email: parsed?.email ?? '' };
  } catch {
    return { name: '', email: '' };
  }
}

/**
 * Asks the user to confirm the account Google returned, BEFORE anything is sent
 * to our server.
 *
 * 🔴 WHY THIS EXISTS: the server does User.create on a first Google sign-in, so
 *    a mis-tapped account does not merely sign you in wrong — it creates a whole
 *    stray Revelia account. This dialog is the only thing between the chooser
 *    and that write.
 *
 * The second button carries the cancel style, which is what makes Escape and a
 * backdrop tap resolve false as well (see cancelButtonOf in alert.web.ts). Every
 * accidental exit therefore lands on "do not sign in".
 *
 * Always settles — including across flows, not only within this one. A LATER
 * showAlert (an unrelated error on the same screen, say) STOMPS this dialog;
 * that stomp now runs the outgoing dialog's own `cancel`-styled button rather
 * than closing silently (see openDialog in alert.web.ts), so a stomp resolves
 * this promise to `false` exactly as if the user had declined.
 */
export function confirmGoogleAccount(profile: {
  name: string;
  email: string;
}): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // Both fields can be empty (a malformed or undecodable token) — naming no
    // account is worse than naming it generically.
    const title = profile.name || profile.email
      ? `Continue as ${profile.name || profile.email}`
      : 'Continue with this Google account';

    showAlert(title, profile.email, [
      { text: 'Continue', onPress: () => done(true) },
      { text: 'Use a different account', style: 'cancel', onPress: () => done(false) },
    ]);
  });
}

/**
 * Native-only. Kept exported so web-fork-check's parity assertion holds, and
 * throwing rather than returning so a future web call site fails loudly instead
 * of hanging — which is the failure mode this whole rewrite removed.
 */
export async function signInWithGoogle(): Promise<{ idToken: string; name: string }> {
  throw new Error(
    'signInWithGoogle is native-only. On web the credential arrives from the rendered ' +
      'button — use mountGoogleButton, see components/auth/GoogleSignInButton.web.tsx.'
  );
}

export async function signOutGoogle(): Promise<void> {
  try {
    (window as any).google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    // Signing out of the app must never fail because a Google script is absent.
  }
}
