// Explains WHY a camera-permission request failed, in words a user can act on.
//
// On native the OS dialog is the explanation, and a denial is self-evident: the
// system sheet appeared and the user answered it. So there is nothing to add
// here and this returns null, leaving the existing screens unchanged.
//
// The web fork is the one that matters — see cameraPermission.web.ts.
export function describeCameraFailure(): string | null {
  return null;
}

/**
 * Async counterpart. Present on native so a caller can import one name for both
 * platforms — importing a web-only export would break the native bundle, and
 * scripts/web-fork-check.js only asserts native ⊆ web, so this direction is on
 * us to keep straight.
 */
export async function describeCameraFailureAsync(): Promise<string | null> {
  return null;
}
