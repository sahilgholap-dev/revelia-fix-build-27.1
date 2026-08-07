// Native no-op. The web fork (registerSw.web.ts) registers the service worker.
//
// This pair exists so app/_layout.tsx can call one function unconditionally,
// rather than carrying a Platform.OS branch for something that has no native
// meaning at all.
export function registerServiceWorker(): void {}
