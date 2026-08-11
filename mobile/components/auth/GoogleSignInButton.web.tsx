import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { showAlert } from '@/lib/alert';
// Imported with the explicit .web suffix rather than the bare '@/lib/googleSignIn'
// the brief specifies: TypeScript has no moduleSuffixes configured for this
// project (Metro's platform-fork convention is invisible to tsc — the very
// thing web-fork-check.js's own header explains), so the bare specifier
// resolves to the NATIVE lib/googleSignIn.ts, which does not export these
// two names, and tsc fails. This file only ever ships on the web platform,
// so the explicit path is behaviourally identical under Metro and is the
// minimal fix that keeps tsc green without touching tsconfig.json.
import {
  mountGoogleButton,
  profileFromIdToken,
} from '@/lib/googleSignIn.web';
import { useAuthStore } from '@/store/authStore';

interface GoogleSignInButtonProps {
  // Accepted for prop-shape parity with the native fork. Web never calls it:
  // Google's own button owns the click, so there is no press for us to handle.
  onPress?: () => void;
  disabled?: boolean;
}

// Two distinct failure classes get two distinct messages: "try again" is
// false for a mount failure (a missing client ID is permanent, not transient)
// and misleading for a server-side rejection ("Google" was never the problem).
const MOUNT_FAILURE_TITLE = 'Sign In Unavailable';
const MOUNT_FAILURE_BODY =
  'Google Sign In is not available in this browser. Please use another sign-in method.';

const CREDENTIAL_FAILURE_TITLE = 'Sign In Failed';
const CREDENTIAL_FAILURE_BODY =
  'Something went wrong finishing your Google sign-in. Please try again or use another sign-in method.';

/**
 * Web fork: hosts Google's own rendered button.
 *
 * This file holds the React lifecycle and the orchestration and NOTHING ELSE —
 * every reference to the Google SDK lives in lib/googleSignIn.web.ts. Keeping
 * that boundary is what lets the flow be reasoned about without reading GSI's
 * documentation.
 *
 * If the button cannot be mounted at all we render a control that SAYS SO when
 * pressed. A control that silently does nothing is the failure mode this screen
 * has now produced three separate times.
 */
export function GoogleSignInButton({ disabled }: GoogleSignInButtonProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const inFlight = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  const completeGoogleLogin = useAuthStore((s) => s.completeGoogleLogin);

  const handleCredential = useCallback(
    async (idToken: string) => {
      // A second credential while the first is still in flight would call
      // completeGoogleLogin twice for the same token.
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const profile = profileFromIdToken(idToken);
        await completeGoogleLogin(idToken, profile.name);
      } catch (error) {
        console.error('Google Sign In error:', error);
        showAlert(CREDENTIAL_FAILURE_TITLE, CREDENTIAL_FAILURE_BODY);
      } finally {
        inFlight.current = false;
      }
    },
    [completeGoogleLogin]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    mountGoogleButton(host, handleCredential).catch((error) => {
      console.error('Google Sign In unavailable:', error);
      if (!disposed) setUnavailable(true);
    });

    return () => {
      disposed = true;
      // renderButton APPENDS rather than replaces, so a re-run of this effect
      // (a new handleCredential identity, a remount) would otherwise stack a
      // second Google button in the same host.
      host.replaceChildren();
    };
  }, [handleCredential]);

  if (unavailable) {
    return (
      <Button
        title="Sign in with Google"
        onPress={() => showAlert(MOUNT_FAILURE_TITLE, MOUNT_FAILURE_BODY)}
        disabled={disabled}
        variant="secondary"
        fullWidth
        size="lg"
      />
    );
  }

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        // Google's own button has no disabled prop — this is the only way to
        // make the host mean the same thing signup.tsx's disabled={isLoading}
        // already means for the Button primitive's fallback branch above.
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}
