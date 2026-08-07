/* Revelia service worker — deliberately minimal.
 *
 * Three rules, and the third is the one that matters:
 *
 *   1. Hashed build output (/_expo/static, /assets) is immutable by construction
 *      — the filename changes when the content does — so it is cache-first.
 *   2. Navigations are network-first with a cached-shell fallback, so relaunching
 *      an installed PWA offline shows the app rather than the browser's dinosaur.
 *   3. /api IS NEVER CACHED, AT ALL. Readings are personalised and auth-bearing;
 *      a cached response could show one account's reading to another after a
 *      logout, and a cached 402 would freeze a user out of content they have
 *      just paid for. Requests to it are not intercepted, so they behave exactly
 *      as they would with no service worker installed.
 *
 * VERSION is the cache key. It MUST change on every deploy or clients keep
 * serving the previous shell; the deploy script rewrites it (see
 * package.json → web:deploy).
 */
const VERSION = 'revelia-web-v1';
const SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()), // a failed precache must not wedge install
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* Precache handoff from the page.
 *
 * The entry bundle and stylesheet have CONTENT-HASHED names that a static
 * sw.js cannot know, and they are requested on the very first load — before
 * this worker has activated — so the fetch handler never sees them and they
 * never enter the cache. The symptom is subtle and worth stating: the offline
 * shell is served correctly and then has no JavaScript to run.
 *
 * Rather than add a build step to generate a precache manifest, the page reads
 * the URLs it actually loaded out of the DOM and posts them here. Exact by
 * construction, and it re-runs on every load, so a new deploy's assets are
 * warmed the first time a client sees them.
 */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'precache' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.all(
        data.urls.map((u) =>
          cache.match(u).then((hit) => (hit ? null : cache.add(u).catch(() => null))),
        ),
      ),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Same-origin only. Never touch the API, RevenueCat, Google, or OneSignal.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  const isHashedAsset =
    url.pathname.startsWith('/_expo/static') || url.pathname.startsWith('/assets');

  if (isHashedAsset) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const resp = await fetch(req);
        if (resp && resp.ok) cache.put(req, resp.clone());
        return resp;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // 🔴 ONLY REFRESH THE STORED SHELL FROM A SUCCESSFUL RESPONSE.
          //    This app is an SPA: after boot the router pushes a client-side
          //    path, so a reload requests /some/route. If the host has no SPA
          //    rewrite that returns 404 — and caching it under SHELL would
          //    POISON the offline fallback PERMANENTLY, with every later
          //    offline launch rendering the host's 404 page instead of the app.
          //    Measured exactly that way before this guard existed.
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(VERSION).then((c) => c.put(SHELL, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(async () => (await caches.match(SHELL)) || Response.error()),
    );
  }
});
