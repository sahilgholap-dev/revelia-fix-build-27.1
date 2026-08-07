// Registers /sw.js, which is what makes the site installable and gives an
// installed PWA an offline launch.
//
// DEV IS DELIBERATELY EXCLUDED. A service worker caching a Metro dev bundle
// produces stale-JS bugs that look like application bugs and cost hours; the
// worker is a production concern and nothing in development depends on it.
//
// Registration failure is swallowed on purpose: the worker is an enhancement,
// and an app that will not start because a cache could not be opened is a worse
// outcome than one that simply is not installable this session.
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return; // static export runs this in Node
  if (!('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // Hand the worker the hashed asset URLs this page actually loaded. It
        // cannot discover them itself: the entry bundle and stylesheet are
        // content-hashed and are requested BEFORE the worker activates, so its
        // fetch handler never sees them and an offline launch would serve the
        // shell with no JavaScript to run.
        const urls = [
          ...Array.from(document.querySelectorAll('script[src]')).map((n) =>
            n.getAttribute('src'),
          ),
          ...Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((n) =>
            n.getAttribute('href'),
          ),
        ].filter((u): u is string => typeof u === 'string' && u.startsWith('/'));

        if (urls.length) registration.active?.postMessage({ type: 'precache', urls });
      })
      .catch((error) => {
        console.warn('[sw] registration failed:', error);
      });
  };

  // 🔴 CHECK readyState FIRST — DO NOT just addEventListener('load').
  //    This function is called from app/_layout.tsx's module scope, and Expo
  //    Router loads the root layout ASYNCHRONOUSLY, so by the time we get here
  //    `load` has usually ALREADY FIRED. A listener attached after its event
  //    never runs: measured as a registration that was present in the bundle,
  //    threw nothing, logged nothing, and simply never happened — the site was
  //    silently not installable while every other PWA check passed.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
