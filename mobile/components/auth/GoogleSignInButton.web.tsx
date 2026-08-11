import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { showAlert } from '@/lib/alert';
// Imported with the explicit .web suffix rather than the bare '@/lib/googleSignIn'
// the brief specifies: TypeScript has no moduleSuffixes configured for this
// project (Metro's platform-fork convention is invisible to tsc — the very
// thing web-fork-check.js's own header explains), so the bare specifier
// resolves to the NATIVE lib/googleSignIn.ts, which does not export these
// three names, and tsc fails. This file only ever ships on the web platform,
// so the explicit path is behaviourally identical under Metro and is the
// minimal fix that keeps tsc green without touching tsconfig.json.
import {
  confirmGoogleAccount,
  mountGoogleButton,
  profileFromIdToken,
  signOutGoogle,
} from '@/lib/googleSignIn.web';
import { useAuthStore } from '@/store/authStore';

interface GoogleSignInButtonProps {
  // Accepted for prop-shape parity with the native fork. Web never calls it:
  // Google's own button owns the click, so there is no press for us to handle.
  onPress?: () => void;
  disabled?: boolean;
}

const UNAVAILABLE_TITLE = 'Sign In Failed';
const UNAVAILABLE_BODY =
  'Google Sign In is unavailable. Please try again or use another sign-in method.';

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
      // A second credential while the confirm is open would open a second
      // dialog over the first, closing it without running a handler.
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const profile = profileFromIdToken(idToken);
        const confirmed = await confirmGoogleAccount(profile);
        if (!confirmed) {
          // Clears Google's auto-select so the next press offers the chooser
          // rather than silently reusing the account just declined.
          await signOutGoogle();
          return;
        }
        await completeGoogleLogin(idToken, profile.name);
      } catch (error) {
        console.error('Google Sign In error:', error);
        showAlert(UNAVAILABLE_TITLE, UNAVAILABLE_BODY);
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
    };
  }, [handleCredential]);

  if (unavailable) {
    return (
      <Button
        title="Sign in with Google"
        onPress={() => showAlert(UNAVAILABLE_TITLE, UNAVAILABLE_BODY)}
        disabled={disabled}
        variant="secondary"
        fullWidth
        size="lg"
      />
    );
  }

  return <div ref={hostRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />;
}
