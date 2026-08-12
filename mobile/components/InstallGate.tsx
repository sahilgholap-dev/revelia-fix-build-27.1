import React from 'react';

/**
 * Native fork — renders the app, always.
 *
 * The gate exists only on web, where an iPhone visitor in a browser is shown
 * install instructions instead of the app. A native build IS the installed app,
 * so there is nothing to gate. See InstallGate.web.tsx.
 *
 * Export parity is asserted by scripts/web-fork-check.js.
 */
export function InstallGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
