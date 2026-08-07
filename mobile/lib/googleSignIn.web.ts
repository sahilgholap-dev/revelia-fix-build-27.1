// Web fork of lib/googleSignIn.ts, using Google Identity Services (GSI).
//
// @react-native-google-signin/google-signin is native-only. On web the
// equivalent is GSI, which returns the SAME artifact — a Google ID token — so
// the SERVER NEEDS NO CHANGE: auth.service.verifyGoogleToken already validates
// the token against GOOGLE_OAUTH_WEB_CLIENT_ID, and that is the very client ID
// used here. One client ID, two front ends.
//
// OWNER ACTION REQUIRED before this works in a browser: the deployed origin
// (and http://localhost:8081 for dev) must be listed under "Authorized
// JavaScript origins" on that OAuth client in Google Cloud Console, project
// revelia-497203. Without it GSI fails with origin_mismatch.
//
// Export list mirrors lib/googleSignIn.ts exactly; parity is asserted by
// scripts/web-fork-check.js.

export const GOOGLE_SIGN_IN_CANCELLED = 'GOOGLE_SIGN_IN_CANCELLED';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

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
 * No-op on web: GSI is configured per call in signInWithGoogle, because
 * initialize() takes the callback that receives the credential.
 */
export function configureGoogleSignIn(): void {}

/**
 * Prompts for a Google credential and returns the ID token.
 *
 * Returns the same shape as the native fork, `{ idToken, name }`, so
 * authStore.loginWithGoogle is unchanged. GSI's credential is a JWT whose
 * payload carries the display name; the server re-verifies the token itself,
 * so decoding here is only for the greeting and is never trusted.
 */
export async function signInWithGoogle(): Promise<{ idToken: string; name: string }> {
  if (!CLIENT_ID) {
    throw new Error('No Google client ID — EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set');
  }
  await loadGsi();

  const google = (window as any).google;
  if (!google?.accounts?.id) {
    throw new Error('Google Sign-In unavailable');
  }

  return new Promise<{ idToken: string; name: string }>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(backstop);
      fn();
    };

    const cancel = () =>
      finish(() => {
        const err: any = new Error('Sign-In cancelled');
        err.code = GOOGLE_SIGN_IN_CANCELLED;
        reject(err);
      });

    // 🔴 A BACKSTOP, BECAUSE GOOGLE CAN FAIL WITHOUT TELLING US. When the
    //    origin is not on the OAuth client's authorised list, GSI rejects
    //    INTERNALLY — observed as "[GSI_LOGGER]: FedCM get() rejects with
    //    NetworkError" in the console — and neither the credential callback nor
    //    the notification callback fires. Without this, the promise would never
    //    settle: the caller's catch never runs, no dialog appears, and the
    //    button is dead in exactly the way this whole class of bug keeps
    //    presenting. A settled promise is the difference between a wrong answer
    //    and no answer.
    //
    //    Generous on purpose — the account chooser is a human interaction and
    //    must not be cut off mid-decision. This exists to guarantee an ending,
    //    not to impose a deadline.
    const backstop = setTimeout(() => {
      finish(() => {
        reject(
          new Error(
            'Google Sign-In did not respond. This usually means this site is not ' +
              'authorised for Google Sign-In yet. Please use email sign-in.'
          )
        );
      });
    }, 120_000);

    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      // Opt in to FedCM, the path Google is making mandatory. The prompt-status
      // methods used below are deprecated under it and warn in the console;
      // they are kept as a FAST PATH for the cases they still report, with the
      // backstop above as the guarantee.
      use_fedcm_for_prompt: true,
      callback: (response: { credential?: string }) => {
        const idToken = response?.credential;
        if (!idToken) {
          cancel();
          return;
        }
        finish(() => resolve({ idToken, name: nameFromIdToken(idToken) }));
      },
    });

    // One Tap is suppressed by the browser after a dismissal (cool-down), and
    // is unavailable in some embedded webviews. Both are user-visible as
    // "nothing happened", so they are reported as a cancel and the email/OTP
    // path on the same screen remains the reliable route.
    try {
      google.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          cancel();
        }
      });
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

/** Best-effort display name out of the ID token payload. Never trusted for auth. */
function nameFromIdToken(idToken: string): string {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json)?.name ?? '';
  } catch {
    return '';
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    (window as any).google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    // Signing out of the app must never fail because a Google script is absent.
  }
}
