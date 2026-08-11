import React from 'react';
import { Button } from '@/components/ui/Button';

interface GoogleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

/**
 * The Google entry point on native.
 *
 * Web has a fork (GoogleSignInButton.web.tsx) that renders Google's own button
 * instead, because only Google's button flow reopens the account chooser after
 * a dismissal. This file must therefore stay free of any Google SDK reference —
 * the platform difference is the whole reason the fork exists.
 *
 * Wrapping the Button primitive rather than hand-rolling a touchable is what
 * keeps the fixed per-size height, the pill shape, the foreground pairing and
 * the a11y contract. Two of the three auth screens already did this; login did
 * not, and this component is what converges them.
 */
export function GoogleSignInButton({ onPress, disabled }: GoogleSignInButtonProps) {
  return (
    <Button
      title="Sign in with Google"
      onPress={onPress}
      disabled={disabled}
      variant="secondary"
      fullWidth
      size="lg"
    />
  );
}
