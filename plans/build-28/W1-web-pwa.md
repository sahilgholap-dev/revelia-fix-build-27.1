# Revelia Web PWA (Expo Web) Implementation Plan — W1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Revelia as an installable web PWA (Expo Web) at `https://app.revelia.me` so iOS users can use the full product in Safari / as a home-screen app, while Android users keep the Play Store build — one shared codebase, no separate web app.

**Architecture:** The existing Expo Router app compiles to web via `react-native-web`. Every native-only SDK is already isolated behind a thin wrapper in `mobile/lib/` (`revenuecat.ts`, `onesignal.ts`, `googleSignIn.ts`) or `mobile/utils/` (`shareReading.ts`) — we exploit Metro's platform-extension resolution (`*.web.ts` is picked for web builds automatically) to supply web implementations behind the **identical export surface**, so no screen or store changes its imports. Payments move to RevenueCat Web Billing (Stripe) with the same `app_user_id`, so the existing server webhook and tier derivation work unchanged. The PWA shell (manifest, service worker, iOS install prompt) is added via Expo Router's `app/+html.tsx` and a `public/` directory. The server needs exactly one change: a CORS origin.

**Tech Stack:** Expo SDK 53 · react-native-web ~0.20 · react-dom 19.0.0 · @expo/metro-runtime · NativeWind 4 (CSS output on web) · @revenuecat/purchases-js (Web Billing) · OneSignal Web SDK v16 (optional phase) · Google Identity Services (web sign-in) · Cloudflare Pages (hosting) · hand-rolled service worker (no workbox dependency).

## Global Constraints

- **Work in the real git clone.** The `revelia-fix-build-27.1 (1)` directory is an extracted zip with no `.git`. Nothing in this plan can be committed or deployed from it.
- **Branch:** `feature/build-28`, cut from `main` **after** 2.1.0 ships. This work must not touch or delay the `fix/build-27.1` line or the P14 Play deadline (2026-08-31).
- **Versions:** Expo SDK 53 / RN 0.79.6 / React 19.0.0 exactly. Web deps must be installed via `npx expo install` (never `npm i` directly) so SDK-53-compatible versions are selected (`react-dom@19.0.0`, `react-native-web@~0.20`, `@expo/metro-runtime`).
- **After every task:** `cd mobile && npx tsc --noEmit` → 0 errors, and `npm run gate` → exit 0. Server tasks additionally: `cd server && npx tsc --noEmit` → 0.
- **`*.web.tsx` files live under the Tailwind content globs** (`app/**`, `components/**`). The comments-are-source rule (CLAUDE.md) applies fully: run `node scripts/resolve-utilities.js` snapshots and `--diff` after ANY batch that adds prose to those files (`O-69`).
- **Never** add `expo-font` to `app.json` plugins (P33). Fonts stay on the runtime `useFonts` path — it works on web.
- **Never** introduce colors/sizes outside `theme.js` tokens. Web-only UI (install banner, date inputs) uses `t.color` / `t.txt()` / Tailwind classes like everything else.
- **Do not touch** R1–R9 engine code, `synthesis-routing.ts`, prompts, or the timing engine. Server scope in this plan = CORS + one env-driven base-URL improvement, nothing else.
- **Server auto-deploys on push to `main`** and there is no staging. The single server change (Task 19) is fail-open and response-shape-preserving, per `dev-notes/workflow.md`.
- **No jest/vitest exists and none is added.** Per-task verification = `tsc` + `expo export --platform web` + named check scripts (project idiom) + a browser smoke step with expected results spelled out.
- **Descope ladder** (owner-approved cuts, first to cut at top): OneSignal web push (Task 18) → Google Sign-In on web (Task 5b) → desktop frame polish (Task 20) → share-image capture on web (noted inside Task 6). **Never cut:** the storage adapter, the fork-coverage gate, the paywall Web Billing correctness, the iOS install UX.

---

## Owner decisions baked into this plan (confirm or veto before Phase 4)

| # | Decision | Recommendation taken | Alternative |
|---|---|---|---|
| D-W1 | Web payments | **RevenueCat Web Billing (Stripe)** — same `app_user_id`, entitlements sync to Android, existing webhook works, sidesteps Apple entirely | Ship v1 with paywall in "informational" mode (free tier only on web), add billing in v2 |
| D-W2 | Hosting | **Cloudflare Pages** at `app.revelia.me` (account already exists for R2; free; instant rollbacks) | EAS Hosting (`eas deploy`) — more integrated, newer product |
| D-W3 | Web output mode | **`single` (SPA)** — the app is auth-gated; no SEO need; simplest service-worker story | `static` per-route output (only worth it if a public marketing surface is added later) |
| D-W4 | Apple Sign-In on web | **Skip in v1.** iOS never shipped, so there are no existing Apple-auth users; web offers email/OTP + Google | Sign in with Apple JS (adds Apple service config + domain verification) |
| D-W5 | Web push | **Build last, descopable.** iOS web push needs iOS 16.4+ AND the PWA installed to home screen; email + in-app remain primary | Skip entirely in v1 |

**iOS PWA platform limits the owner must sign off on (these are facts, not choices):** no push unless installed + iOS ≥ 16.4; Safari may evict site storage after ~7 days of non-use for *tab* users (installed PWAs are exempt) — a logged-out-after-vacation support case will exist; no in-app review prompts; camera via `getUserMedia` works in Safari and installed PWAs on iOS ≥ 14.3 but is lower-fidelity than the native camera; purchases run through Stripe checkout, not Apple — which is the point.

---

# Phase 0 — Preconditions & branch

### Task 1: Branch, web dependencies, web config

**Files:**
- Modify: `mobile/package.json` (via `expo install`)
- Modify: `mobile/app.json` (add `web` block)

**Interfaces:**
- Produces: a repo state where `npx expo export --platform web` can run (it will still fail on native imports — Tasks 2–8 fix those; this task only makes the toolchain exist).

- [ ] **Step 1: Cut the branch (in the real clone)**

```bash
git checkout main && git pull
git checkout -b feature/build-28
git config core.hooksPath .githooks   # per P29 — hooks are per-clone
```

- [ ] **Step 2: Install the three web packages with expo install**

```bash
cd mobile
npx expo install react-dom react-native-web @expo/metro-runtime
```

Expected: `package.json` gains `react-dom@19.0.0`, `react-native-web@~0.20.x`, `@expo/metro-runtime@~5.x`. If `expo install` proposes different majors, stop and check the SDK 53 changelog — do not force versions.

- [ ] **Step 3: Add the web block to `app.json`** (inside `expo`):

```json
"web": {
  "bundler": "metro",
  "output": "single",
  "favicon": "./assets/favicon.png"
}
```

`output: "single"` = SPA (decision D-W3). Do NOT add `expo-font` or any new plugin.

- [ ] **Step 4: Verify NativeWind web CSS wiring**

Open `mobile/metro.config.js`. NativeWind v4 on web needs `withNativeWind(config, { input: <css file>, inlineRem: 16 })`. If an `input` css file is already configured, skip. If not, create `mobile/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

wire it into `withNativeWind({ input: './global.css', inlineRem: 16 })` (preserve the existing `inlineRem: 16` — it is load-bearing, see codemod-plan pass 0), and add `import '../global.css';` as the first import of `mobile/app/_layout.tsx`. The import is a no-op on native and feeds the CSS extractor on web.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit        # expect 0
git add package.json package-lock.json app.json metro.config.js global.css app/_layout.tsx
git commit -m "feat(web): add web deps + expo web config (W1 task 1)"
```

---

# Phase 1 — Platform forks: make the bundle web-clean

**The mechanism for every task in this phase:** Metro resolves `foo.web.ts` before `foo.ts` when bundling for web. Each fork MUST export the byte-identical set of names as its native sibling — open the native file first, copy its export signatures, then implement. `tsc` checks both files, but export-set parity is asserted mechanically by the gate in Task 10.

### Task 2: Secure-storage adapter (unblocks auth, review store, everything)

`expo-secure-store` has no web implementation and is imported by `lib/storage.ts` (auth tokens), `store/reviewStore.ts` (review blob), and the notification-prompt flag. Route all of them through one adapter pair.

**Files:**
- Create: `mobile/lib/secureStorage.ts`
- Create: `mobile/lib/secureStorage.web.ts`
- Modify: `mobile/lib/storage.ts` (swap `import * as SecureStore from 'expo-secure-store'` for the adapter)
- Modify: `mobile/store/reviewStore.ts` (same swap)
- Modify: any other file `grep -rl "expo-secure-store" mobile/app mobile/components mobile/lib mobile/store mobile/hooks` finds (expected: the notification-prompt hook/component)

**Interfaces:**
- Produces: `secureStorage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }` — the only storage API the rest of the app may use from now on.

- [ ] **Step 1: Write the native adapter**

```ts
// mobile/lib/secureStorage.ts
// Single seam over expo-secure-store. Web builds resolve secureStorage.web.ts
// instead; both must export the identical shape.
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(key);
  },
};
```

- [ ] **Step 2: Write the web adapter**

```ts
// mobile/lib/secureStorage.web.ts
// localStorage-backed. Tokens on web are XSS-readable by construction; the app
// loads no third-party scripts except Google GSI / OneSignal (both first-party
// CDNs), and Task 16 ships a CSP. Accepted for v1 — matches industry-standard
// SPA practice.
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null; // Safari private mode can throw — degrade to logged-out
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* quota / private mode: session continues in-memory */
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
```

- [ ] **Step 3: Point every consumer at the adapter.** In `lib/storage.ts` and `store/reviewStore.ts` (and any other hit from the grep), replace `SecureStore.getItemAsync(k)` → `secureStorage.getItem(k)`, `setItemAsync` → `setItem`, `deleteItemAsync` → `removeItem`. Keys stay identical (`revelia_auth_token`, `revelia_refresh_token`, `revelia_user`, `revelia_review_state`, `notification_prompt_shown`) — existing native installs must keep their sessions.

- [ ] **Step 4: Verify no direct imports remain**

```bash
grep -rn "expo-secure-store" mobile/app mobile/components mobile/lib mobile/store mobile/hooks mobile/utils
```

Expected: only `mobile/lib/secureStorage.ts` (the adapter itself).

- [ ] **Step 5: `npx tsc --noEmit` (0 errors), `npm run gate` (exit 0), commit**

```bash
git commit -m "feat(web): secure-storage adapter with localStorage web fork (W1 task 2)"
```

### Task 3: RevenueCat web stub (real billing lands in Task 14)

**Files:**
- Create: `mobile/lib/revenuecat.web.ts`

**Interfaces:**
- Consumes: the exact export list of `mobile/lib/revenuecat.ts`: `initializeRevenueCat`, `identifyUser`, `logoutRevenueCat`, `getOfferings`, `purchasePackage`, `restorePurchases`, `getCustomerInfo`, `addCustomerInfoListener`, `mapCustomerInfoToTier` (mirror the real parameter/return types from the native file when implementing).
- Produces: a web module where every read returns safe defaults and every purchase path throws `WEB_PURCHASES_UNAVAILABLE` — the paywall branches on it in Task 13.

- [ ] **Step 1: Write the stub.** Open `lib/revenuecat.ts`, copy its export signatures, and implement:

```ts
// mobile/lib/revenuecat.web.ts
// Web stub — Task 14 replaces the bodies with @revenuecat/purchases-js.
// The server is the tier authority (GET /subscription/status); a web client
// that cannot see store entitlements is still correct because
// applyServerTierToAuthUser drives the UI. Purchases are unavailable until
// Web Billing lands.
import type { SubscriptionTier } from './constants';

export const WEB_PURCHASES_UNAVAILABLE = 'WEB_PURCHASES_UNAVAILABLE';

export async function initializeRevenueCat(): Promise<void> {}
export async function identifyUser(_userId: string): Promise<void> {}
export async function logoutRevenueCat(): Promise<void> {}
export async function getOfferings(): Promise<null> {
  return null;
}
export async function purchasePackage(_pkg: unknown): Promise<never> {
  throw new Error(WEB_PURCHASES_UNAVAILABLE);
}
export async function restorePurchases(): Promise<never> {
  throw new Error(WEB_PURCHASES_UNAVAILABLE);
}
export async function getCustomerInfo(): Promise<null> {
  return null;
}
export function addCustomerInfoListener(_cb: (info: unknown) => void): void {}
export function mapCustomerInfoToTier(_info: unknown): SubscriptionTier {
  return 'free';
}
```

⚠️ Where the native file types a param as a RevenueCat SDK type (e.g. `PurchasesPackage`, `CustomerInfo`), the web stub must NOT import `react-native-purchases` types at runtime — use `import type` only (types are erased; the native module never enters the web bundle) or `unknown`.

- [ ] **Step 2: Check the store still compiles.** `subscriptionStore.ts` consumes these exports; the upgrade-only RANK guard means a stubbed `'free'` can never clobber a server-granted tier — this is the same protection X21 added for comped accounts, doing double duty on web.

- [ ] **Step 3: `npx tsc --noEmit`, commit** — `feat(web): revenuecat web stub behind identical export surface (W1 task 3)`

### Task 4: OneSignal web no-op (real web push is Task 18, descopable)

**Files:**
- Create: `mobile/lib/onesignal.web.ts`

**Interfaces:**
- Consumes: export list of `mobile/lib/onesignal.ts`: `initializeOneSignal`, `loginOneSignalUser`, `logoutOneSignalUser`, `requestNotificationPermission`, `optInToNotifications`, `optOutOfNotifications`, `setUserTags`, `setNotificationClickHandler`, `getOneSignalPlayerId`, `areNotificationsEnabled` (verify exact names/arities against the native file — CLAUDE.md warns these names have bitten before).
- Produces: safe no-ops; `areNotificationsEnabled` → `false`, `getOneSignalPlayerId` → `null`, so `profile.tsx`'s notification section renders its "disabled" state honestly on web.

- [ ] **Step 1: Write the no-op module** (every function `async`/`void` matching the native signature, returning the neutral value; a one-line header comment: `// Web no-op — Task 18 upgrades this to the OneSignal Web SDK; iOS web push requires iOS 16.4+ and an installed PWA.`)

- [ ] **Step 2:** Confirm `app/_layout.tsx` calls these only through the wrapper (grep `react-native-onesignal` outside `lib/onesignal.ts` — expect zero hits).

- [ ] **Step 3: `npx tsc --noEmit`, commit** — `feat(web): onesignal web no-op fork (W1 task 4)`

### Task 5: Google Sign-In web fork (descopable — email/OTP is the primary web path)

**Files:**
- Create: `mobile/lib/googleSignIn.web.ts`

**Interfaces:**
- Consumes: export list of `mobile/lib/googleSignIn.ts`: `configureGoogleSignIn`, `signInWithGoogle`, `signOutGoogle`, `GOOGLE_SIGN_IN_CANCELLED`. The server verifies the ID token against `GOOGLE_OAUTH_WEB_CLIENT_ID` via `oauth2.googleapis.com/tokeninfo` — the SAME web client ID the mobile env already uses (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`), so no server change.
- Produces: `signInWithGoogle(): Promise<{ idToken: string }>` (mirror the native return shape exactly — open the native file and match it field-for-field).

- [ ] **Step 1: Write the fork using Google Identity Services**

```ts
// mobile/lib/googleSignIn.web.ts
// Google Identity Services (GSI) — loads Google's script on demand, asks for
// an ID token credential. The One Tap prompt can be suppressed by the browser
// (cool-down after dismissal); when that happens we reject as CANCELLED and
// the login screen's email/OTP path remains the reliable route.
export const GOOGLE_SIGN_IN_CANCELLED = 'GOOGLE_SIGN_IN_CANCELLED';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
let gsiLoaded: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (gsiLoaded) return gsiLoaded;
  gsiLoaded = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('gsi_load_failed'));
    document.head.appendChild(s);
  });
  return gsiLoaded;
}

export function configureGoogleSignIn(): void {}

export async function signInWithGoogle(): Promise<{ idToken: string }> {
  await loadGsi();
  return new Promise((resolve, reject) => {
    const g = (window as any).google;
    if (!g?.accounts?.id || !CLIENT_ID) {
      reject(new Error(GOOGLE_SIGN_IN_CANCELLED));
      return;
    }
    g.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (resp: { credential?: string }) => {
        if (resp?.credential) resolve({ idToken: resp.credential });
        else reject(new Error(GOOGLE_SIGN_IN_CANCELLED));
      },
    });
    g.accounts.id.prompt((n: any) => {
      // Browser refused to show One Tap (cool-down, unsupported) → treat as cancel
      if (n?.isNotDisplayed?.() || n?.isSkippedMoment?.()) {
        reject(new Error(GOOGLE_SIGN_IN_CANCELLED));
      }
    });
  });
}

export async function signOutGoogle(): Promise<void> {
  const g = (window as any).google;
  g?.accounts?.id?.disableAutoSelect?.();
}
```

- [ ] **Step 2: Owner action (record in `tracking_files/owner-actions.md` as a new P-item):** add `https://app.revelia.me` (and `http://localhost:8081` for dev) to the OAuth client's **Authorized JavaScript origins** in Google Cloud Console (project `revelia-497203`). Without this, GSI rejects with `origin_mismatch`.

- [ ] **Step 3:** Login screen behavior check: on web, a suppressed One Tap surfaces as a cancel (no error toast storm). Verify `authStore.loginWithGoogle`'s catch treats `GOOGLE_SIGN_IN_CANCELLED` silently (it already does for native cancels).

- [ ] **Step 4: `npx tsc --noEmit`, commit** — `feat(web): google sign-in via GSI web fork (W1 task 5)`

### Task 6: Share fork (Web Share API, graceful degradation)

**Files:**
- Create: `mobile/utils/shareReading.web.ts`

**Interfaces:**
- Consumes: export list of `mobile/utils/shareReading.ts`: `shareReadingCard(viewRef, message?) → Promise<boolean>` and `isShareDismissal(error)` (mirror the exact native signature).
- Produces: same boolean contract — `true` = real share happened, `false` = user dismissed. **This contract is load-bearing:** every caller gates `recordMeaningfulAction('share:…')` on it (CLAUDE.md "Reading share — do not fix naively").

- [ ] **Step 1: Write the fork**

```ts
// mobile/utils/shareReading.web.ts
// v1 shares TEXT (message + footer) — react-native-view-shot cannot capture on
// web. The image-capture upgrade (html-to-image over the card node) is a
// recorded follow-up, not a silent gap. The boolean contract is preserved:
// callers gate recordMeaningfulAction on the return value.
export function isShareDismissal(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'AbortError';
}

export async function shareReadingCard(
  _viewRef: unknown,
  message: string,
): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text: message });
      return true; // navigator.share resolves only on a completed share
    }
    await navigator.clipboard.writeText(message);
    return true; // desktop fallback: copied — callers may surface a toast
  } catch (error) {
    if (isShareDismissal(error)) return false; // sheet dismissed — NOT a share
    return false;
  }
}
```

⚠️ If the native `shareReadingCard` takes `(viewRef, options)` or builds the message internally, mirror that — the fork's parameter list must match the native one exactly, and the message text must include `SHARE_FOOTER` from `lib/shareUtils.ts` the same way the native path does. Read the native file first.

- [ ] **Step 2:** `grep -rn "react-native-share\|react-native-view-shot" mobile/app mobile/components mobile/utils` — every hit must be inside `shareReading.ts` (native) or a component that only *renders* the card (rendering is fine; capturing is not). Any stray direct import gets routed through the util.

- [ ] **Step 3: `npx tsc --noEmit`, commit** — `feat(web): web share fork preserving the dismissal boolean contract (W1 task 6)`

### Task 7: Date/time picker fork

`@react-native-community/datetimepicker` does not support web. Consumers: `app/(capture)/birth-data.tsx` (birth date + time), `app/(main)/compatibility/index.tsx` (partner birth data), `app/(main)/profile.tsx` (daily-insight time).

**Files:**
- Create: `mobile/components/ui/DateTimeField.tsx`
- Create: `mobile/components/ui/DateTimeField.web.tsx`
- Modify: `app/(capture)/birth-data.tsx`, `app/(main)/compatibility/index.tsx`, `app/(main)/profile.tsx` (replace direct DateTimePicker usage)

**Interfaces:**
- Produces: `DateTimeField({ mode, value, onChange, maximumDate, minimumDate }: { mode: 'date' | 'time'; value: Date; onChange: (d: Date) => void; maximumDate?: Date; minimumDate?: Date })`

- [ ] **Step 1: Native wrapper** — `DateTimeField.tsx` renders the existing `DateTimePicker` with the exact props each screen currently passes (display mode, spinner/default, theme). Move the per-screen prop values into the wrapper's defaults so all three call sites shrink.

- [ ] **Step 2: Web implementation**

```tsx
// mobile/components/ui/DateTimeField.web.tsx
import { unstable_createElement as createElement } from 'react-native-web';
import { t } from '@/theme'; // match the project's actual theme import path

type Props = {
  mode: 'date' | 'time';
  value: Date;
  onChange: (d: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const toHHMM = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function DateTimeField({ mode, value, onChange, maximumDate, minimumDate }: Props) {
  return createElement('input', {
    type: mode,
    value: mode === 'date' ? toISODate(value) : toHHMM(value),
    max: mode === 'date' && maximumDate ? toISODate(maximumDate) : undefined,
    min: mode === 'date' && minimumDate ? toISODate(minimumDate) : undefined,
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      if (!v) return;
      const next = new Date(value);
      if (mode === 'date') {
        const [y, m, d] = v.split('-').map(Number);
        next.setFullYear(y, m - 1, d);
      } else {
        const [h, min] = v.split(':').map(Number);
        next.setHours(h, min, 0, 0);
      }
      onChange(next);
    },
    style: {
      backgroundColor: t.color['surface-raised'],
      color: t.color.fg,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.color['border-control'],
      borderRadius: 14,
      padding: 12,
      fontFamily: t.family.body,
      fontSize: 16,
      colorScheme: 'dark', // makes Safari render the native picker chrome dark
    },
  });
}
```

⚠️ Token discipline: values above must come from `theme.js` (`t.color`, `t.family`) — verify the import path and radius token (`t.radius.md` = 14) against the real file; never inline a hex. The gate will catch a raw hex here — that's it working.

- [ ] **Step 3:** Swap the three screens onto `DateTimeField`. Keep each screen's date-state handling unchanged — only the picker element moves.

- [ ] **Step 4:** `npx tsc --noEmit`, `npm run gate`, `node scripts/resolve-utilities.js --diff` (this task adds prose under content globs). Commit — `feat(web): DateTimeField platform fork replacing datetimepicker (W1 task 7)`

### Task 8: Device-id fork + small no-op sweep

**Files:**
- Create: `mobile/lib/deviceId.web.ts`
- Verify (no change expected): `mobile/lib/inAppReview.ts`, haptics usage

**Interfaces:**
- Consumes: `lib/deviceId.ts` exports (a `getDeviceId(): Promise<string | null>`-shaped function — mirror exactly). Used only as the `X-Device-Id` header on the free Deep-Insight ask; server treats absent id as fail-open, so `null` is always safe.

- [ ] **Step 1: Web device id**

```ts
// mobile/lib/deviceId.web.ts
// A stable-per-browser pseudo device id. The server's D5 gate is fail-open on
// null; a per-browser UUID gives the free-DI gate the same "one device, one
// free Deep Insight per month" semantics a browser can honestly provide.
const KEY = 'revelia_web_device_id';

export async function getDeviceId(): Promise<string | null> {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null; // private mode → fail-open, matches native null path
  }
}
```

- [ ] **Step 2: Verify the already-safe modules.** `lib/inAppReview.ts` is Android-only by explicit `Platform.OS` guard and `expo-store-review` is a pure-JS module (safe to import on web) — confirm by reading the file; no fork needed. Grep `expo-haptics` — if present anywhere, guard with `Platform.OS !== 'web'` (expo-haptics no-ops on web but keep it explicit).

- [ ] **Step 3: `npx tsc --noEmit`, commit** — `feat(web): device-id web fork (W1 task 8)`

---

# Phase 2 — First boot and screen-by-screen verification

### Task 9: First web boot + module-scope crash sweep

**Files:**
- Modify: whatever the boot surfaces (expected: none-to-few after Tasks 2–8; `app/_layout.tsx` init guards if needed)

- [ ] **Step 1:**

```bash
cd mobile && npx expo start --web
```

Expected: the app boots to `(auth)/welcome` in the browser with fonts loading. Known-good subsystems on web that need NO fork (verify visually, don't "fix" preemptively): `expo-router`, NativeWind classes, `react-native-svg` (BirthChartWheel), `react-native-reanimated` (motion lib), `expo-blur` (CSS backdrop-filter), `expo-linear-gradient`, `expo-image-picker` (file input), `expo-image-manipulator`, `expo-location` (browser geolocation).

- [ ] **Step 2: If boot crashes**, read the stack: a module-scope throw before React mounts means a native import escaped Phase 1. Fix by fork (never by try/catch burial). `lib/textDefaults.ts` deserves special attention: it wraps `Text`/`TextInput` forwardRef renders — react-native-web's `Text` is also a forwardRef so the mechanism holds, and the module logs-never-throws by design; if the wrap fails on web it logs loudly and the app keeps running in system fonts. Check the console for its failure log and, if present, fix the detection rather than silencing it (the `text-defaults-installed` gate rule depends on this module).

- [ ] **Step 3: Walk all 33 screens** via URL paths in the browser (auth → capture → all six tabs, paywall). Record every render defect found in a `plans/build-28/W1-web-findings.md` scratchlist (screen, symptom, suspected cause) — do not fix inline; later tasks batch them. Expected common findings: fixed `Dimensions`-based sizing on resize (X1 anchors — leave alone, Task 20 frames the viewport instead), scroll behavior, hover states absent.

- [ ] **Step 4: Static export must succeed:**

```bash
npx expo export --platform web   # writes dist/
```

Expected: exit 0. This is the CI-grade smoke for "no native module reachable from web".

- [ ] **Step 5: Commit** any fixes — `fix(web): first-boot web fixes from screen walk (W1 task 9)`

### Task 10: The fork-coverage gate (project-idiom check script)

**Files:**
- Create: `mobile/scripts/web-fork-check.js`
- Modify: `mobile/scripts/token-gate.sh` (append the node-check invocation alongside the existing ones)

**Interfaces:**
- Produces: `node scripts/web-fork-check.js` → exit 0/1. Two assertion classes: (1) every file importing a NATIVE_ONLY module has a `.web.ts[x]` sibling; (2) the sibling's export names are a superset of the native file's export names (parity check — the whole fork mechanism silently breaks if a name is missing, because Metro will happily bundle a partial module and the screen crashes at runtime, on web only, where no gate has ever looked).

- [ ] **Step 1: Write the check**

```js
#!/usr/bin/env node
// web-fork-check.js — arrival gate for the web platform-fork seam.
// Class 1: any source file importing a NATIVE_ONLY package must have a .web
//          sibling (Metro platform resolution is the only thing keeping that
//          package out of the web bundle).
// Class 2: the .web sibling must export every name the native file exports —
//          a missing export is a web-only runtime crash no other gate can see.
const fs = require('fs');
const path = require('path');

const NATIVE_ONLY = [
  'react-native-purchases',
  'react-native-onesignal',
  '@react-native-google-signin/google-signin',
  'react-native-share',
  'react-native-view-shot',
  'expo-secure-store',
  '@react-native-community/datetimepicker',
];

const ROOTS = ['app', 'components', 'lib', 'store', 'utils', 'hooks', 'services'];
const exportRe = /export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_]+)|export\s*\{([^}]+)\}/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  let m;
  while ((m = exportRe.exec(src))) {
    if (m[1]) names.add(m[1]);
    if (m[2])
      m[2].split(',').forEach((n) => {
        const name = n.split(' as ').pop().trim();
        if (name) names.add(name);
      });
  }
  return names;
}

let fail = 0;
const files = ROOTS.filter((r) => fs.existsSync(r)).flatMap((r) => walk(r));

for (const f of files) {
  if (/\.web\.tsx?$/.test(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  // type-only imports are erased at compile time and are legal without a fork
  const usesNative = NATIVE_ONLY.some((m) =>
    new RegExp(`import\\s+(?!type\\b)[^;]*['"]${m.replace(/[/@-]/g, '\\$&')}['"]`).test(src),
  );
  if (!usesNative) continue;
  const webSibling = f.replace(/\.(tsx?)$/, '.web.$1');
  if (!fs.existsSync(webSibling)) {
    console.error(`FAIL class1: ${f} imports a native-only module and has no ${webSibling}`);
    fail = 1;
    continue;
  }
  const nativeExports = exportsOf(f);
  const webExports = exportsOf(webSibling);
  for (const name of nativeExports) {
    if (!webExports.has(name)) {
      console.error(`FAIL class2: ${webSibling} is missing export "${name}" (present in ${f})`);
      fail = 1;
    }
  }
}

console.log(fail ? 'web-fork-check: FAIL' : 'web-fork-check: PASS');
process.exit(fail);
```

- [ ] **Step 2: Prove it can fail** (the project's "does it fail?" discipline): temporarily rename an export in `revenuecat.web.ts`, run the script, expect `FAIL class2`; restore, expect `PASS`. Do the same for class 1 by temporarily renaming `secureStorage.web.ts`.

- [ ] **Step 3: Wire into `token-gate.sh`** following the exact pattern of the existing node checks (`if node scripts/web-fork-check.js; then :; else fail=1; fi`).

- [ ] **Step 4: `npm run gate` (exit 0), commit** — `feat(web): web-fork-check gate — fork coverage + export parity (W1 task 10)`

### Task 11: Fonts, tokens, and type-ramp verification on web

**Files:** none expected (verification task; fixes go where found)

- [ ] **Step 1:** In the running web app, DevTools → inspect: an H1 (should compute `font-family: Literata-Bold`), body copy (`Figtree-Regular`), the quote face on any quote step (`Literata-Italic`). If body text renders a system font, `installTextDefaults` didn't wrap react-native-web's Text — check its console log and adapt the detection in `lib/textDefaults.ts` (native behavior must remain byte-identical; add a web branch only if required).

- [ ] **Step 2:** Verify the ramp is not inverted (the `inlineRem` class of bug, this time in real CSS): `text-base` (16) must render larger than `text-sm` (15). Measure computed `font-size` on one element of each.

- [ ] **Step 3:** Verify `t.alpha()` sites render (rgba backgrounds on plates/scrims) and that `npm run check:...` equivalents still pass: `node scripts/alpha-callsite-check.js` (it invokes all call sites against live theme.js — platform-independent, must stay green).

- [ ] **Step 4: Commit** any fixes — `fix(web): font/token arrival fixes on web (W1 task 11)`

### Task 12: Camera capture on web (face + palm) with picker fallback

**Files:**
- Modify: `app/(capture)/face-capture.tsx`, `app/(capture)/palm-capture.tsx` (add a web capability branch)
- Possibly modify: `hooks/useCamera.ts` (or wherever `takePicture` retry logic lives)

**Interfaces:**
- Consumes: existing `uploadService.uploadFace/uploadPalm` (multipart — works on web unchanged; `expo-image-picker` returns a blob-backed URI on web that the existing FormData path must be verified against).

- [ ] **Step 1:** Test `CameraView` on web dev build in Chrome + Safari: expo-camera has web support via `getUserMedia`. Expected working: preview, capture. Expected broken/absent: torch, some EXIF metadata (web captures don't need the EXIF-flip path — browsers hand you upright pixels; guard the `ImageManipulator` flip with `Platform.OS !== 'web'` if it double-flips the selfie — verify by eye against the guide overlay).

- [ ] **Step 2:** Add the fallback branch: when `Platform.OS === 'web'` and (`!navigator.mediaDevices?.getUserMedia` OR permission denied), skip straight to the existing `ImagePicker` path (both screens already have a picker branch — reuse it, don't build a new one).

- [ ] **Step 3:** End-to-end on web dev: face capture → upload → generation → reading renders. This exercises the full multipart + 180s-timeout path in a browser. Expected: works unchanged; if FormData upload fails, the fix is in how the picker URI is appended (blob vs file URI) inside the upload service — `fetch`-compatible `FormData` with a `Blob` from `fetch(uri).then(r => r.blob())`.

- [ ] **Step 4:** `npx tsc --noEmit`, `npm run gate`, commit — `feat(web): camera capture web support with picker fallback (W1 task 12)`

### Task 13: Paywall on web — honest pre-billing state

**Files:**
- Modify: `app/(paywall)/index.tsx`

- [ ] **Step 1:** Branch on `Platform.OS === 'web'` + `getOfferings()` returning `null`: render the existing feature-comparison content, but replace purchase buttons with a single disabled-state notice card (token-styled) — copy: `"Subscriptions are coming to the web soon. Android users can subscribe in the app today."` No dead buttons, no silent failures. (This state is deleted by Task 14 — it exists so the PWA can ship to testers before Stripe is configured, per the descope ladder.)

- [ ] **Step 2:** Verify a comped/premium user still sees their entitled state on web (server `GET /subscription/status` drives it — no store needed). This is the acceptance test that the tier pipeline is fully server-authoritative on web.

- [ ] **Step 3:** `npm run gate`, `node scripts/resolve-utilities.js --diff` (prose added under a content glob), commit — `feat(web): paywall pre-billing web state (W1 task 13)`

---

# Phase 3 — Payments (D-W1: RevenueCat Web Billing)

### Task 14: RevenueCat Web Billing integration

**Files:**
- Modify: `mobile/lib/revenuecat.web.ts` (replace stub bodies)
- Modify: `mobile/app/(paywall)/index.tsx` (web price rendering from Web Billing offering)
- Modify: `mobile/package.json` (add `@revenuecat/purchases-js`)

**Interfaces:**
- Consumes: RevenueCat Web Billing public API key (new, per-platform — NOT the Android key), env var `EXPO_PUBLIC_REVENUECAT_WEB_KEY`.
- Produces: real `getOfferings`/`purchasePackage`/`getCustomerInfo` on web returning shapes the paywall + `subscriptionStore` already consume. The mapping layer (`mapCustomerInfoToTier`) keys on entitlement ids `premium_plus` / `premium` — identical ids across platforms.

- [ ] **Step 1: Owner actions first (blocking — append to `owner-actions.md` as new P-items):**
  1. Connect Stripe to RevenueCat and enable **Web Billing** in the RC dashboard; create web products mirroring the four Android products (premium monthly/annual, premium_plus monthly/annual) attached to the SAME entitlements (`premium`, `premium_plus`).
  2. Add the web app to the RC project → copy the **Web Billing public API key** → set `EXPO_PUBLIC_REVENUECAT_WEB_KEY` in the web build environment.
  3. Decide web price points (Stripe supports local currency — this is also the venue where the S-P1 currency problem gets a correct-by-construction answer on web: prices come from the offering, never hardcoded).
  4. Sandbox: RC Web Billing test mode + Stripe test cards.

- [ ] **Step 2: Install and implement**

```bash
cd mobile && npm i @revenuecat/purchases-js
```

```ts
// mobile/lib/revenuecat.web.ts — Task 14 replaces the Task-3 stub bodies.
// purchases-js and react-native-purchases have DIFFERENT shapes; this module
// is the adapter. Everything downstream keeps consuming the native-shaped API.
import { Purchases } from '@revenuecat/purchases-js';
import type { SubscriptionTier } from './constants';

export const WEB_PURCHASES_UNAVAILABLE = 'WEB_PURCHASES_UNAVAILABLE';

const WEB_KEY = process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY ?? '';
let client: Purchases | null = null;

export async function initializeRevenueCat(): Promise<void> {
  // Web configures lazily in identifyUser — purchases-js requires an appUserId
  // at configure time and Revelia never purchases anonymously (paywall is
  // behind auth).
}

export async function identifyUser(appUserId: string): Promise<void> {
  if (!WEB_KEY) return;
  client = Purchases.configure(WEB_KEY, appUserId);
}

export async function logoutRevenueCat(): Promise<void> {
  client = null;
}

export async function getOfferings() {
  if (!client) return null;
  const offerings = await client.getOfferings();
  return offerings.current ?? null;
}

export async function purchasePackage(pkg: { rcBillingProduct?: unknown } | any) {
  if (!client) throw new Error(WEB_PURCHASES_UNAVAILABLE);
  const { customerInfo } = await client.purchase({ rcPackage: pkg });
  return customerInfo;
}

export async function restorePurchases() {
  // Web Billing has no receipt restore; entitlements follow the app_user_id.
  if (!client) throw new Error(WEB_PURCHASES_UNAVAILABLE);
  return client.getCustomerInfo();
}

export async function getCustomerInfo() {
  if (!client) return null;
  return client.getCustomerInfo();
}

export function addCustomerInfoListener(_cb: (info: unknown) => void): void {
  // purchases-js has no push listener; the post-purchase flow calls
  // subscriptionService.syncSubscription() + checkSubscriptionStatus()
  // explicitly (the store already does this on the purchase path).
}

export function mapCustomerInfoToTier(info: {
  entitlements?: { active?: Record<string, unknown> };
} | null): SubscriptionTier {
  const active = info?.entitlements?.active ?? {};
  if ('premium_plus' in active) return 'premium_plus';
  if ('premium' in active) return 'premium';
  return 'free';
}
```

⚠️ Align param/return types against BOTH the native `revenuecat.ts` and the installed `@revenuecat/purchases-js` typings at implementation time; where the shapes can't unify, widen the shared seam type in the wrapper (both platforms), never in the store.

- [ ] **Step 3: Paywall web pricing:** render price strings from the Web Billing offering (`pkg.rcBillingProduct.currentPrice.formattedPrice` per purchases-js docs — verify exact field against the installed typings). Remove the Task-13 notice card. Hardcoded `$` literals must NOT be the web fallback — if the offering fails to load, show a retry state, not stale prices (this is the web-side lesson of S-P1/A1).

- [ ] **Step 4: Server-side verification (read-only, no code change expected):** RC sends the same webhook event types for Web Billing purchases; `webhook.service.ts`'s `deriveTierFromEntitlements` keys on entitlement ids so it's platform-agnostic. Confirm with one sandbox purchase: user → paywall on web → Stripe test card → RC webhook fires → `subscription.tier` updates → `GET /subscription/status` reflects it → Android device with same account shows premium (cross-platform entitlement proof).

- [ ] **Step 5:** `npx tsc --noEmit`, `npm run gate`, sandbox purchase end-to-end, commit — `feat(web): RevenueCat Web Billing on the web fork (W1 task 14)`

---

# Phase 4 — PWA shell

### Task 15: HTML shell, manifest, icons

**Files:**
- Create: `mobile/app/+html.tsx`
- Create: `mobile/public/manifest.json`
- Create: `mobile/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180×180)

**Interfaces:**
- Produces: the document shell every route renders into; `public/` is copied verbatim into `dist/` by `expo export`.

- [ ] **Step 1: Owner/designer action (new P-item):** export the four PNGs above from the existing brand icon source (the same artwork `app.json` uses). The maskable variant needs the mark inside the 80% safe zone — this is exactly the class of defect `check-brand-assets.js` exists for; extend its CONTRACTS table with the four web icons (opaque, correct dimensions) in this task.

- [ ] **Step 2: Write `app/+html.tsx`**

```tsx
// mobile/app/+html.tsx — Expo Router web document shell. Server-side only;
// renders once at export. No React state, no hooks.
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>Revelia</title>
        <meta name="theme-color" content="#100E0D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Revelia" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `body{background:#100E0D}#root{min-height:100dvh}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

⚠️ `#100E0D` here is the brand-background constant appearing in a NEW file type the hex gate may or may not scope — check `token-gate.sh`'s SRC list; if `app/+html.tsx` is in scope, reference the value via a shared constant the gate already exempts, or add the file to the gate's documented exception with an `SA` exact-count assertion (the project's pattern for legal literals). Do not silently widen an exclusion.

- [ ] **Step 3: Write `public/manifest.json`**

```json
{
  "name": "Revelia — AI Mystical Readings",
  "short_name": "Revelia",
  "id": "/",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#100E0D",
  "theme_color": "#100E0D",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 4:** `npx expo export --platform web`, serve `dist/` locally (`npx serve dist`), Lighthouse → PWA installability checks pass except service worker (Task 16). Commit — `feat(web): PWA document shell, manifest, icons (W1 task 15)`

### Task 16: Service worker + registration + CSP

**Files:**
- Create: `mobile/public/sw.js`
- Create: `mobile/lib/registerSw.ts` (native no-op) + `mobile/lib/registerSw.web.ts`
- Modify: `mobile/app/_layout.tsx` (one call)
- Create: `mobile/public/_headers` (Cloudflare Pages headers file — CSP)

- [ ] **Step 1: Write `public/sw.js`**

```js
/* Revelia service worker — deliberately minimal.
 * Hashed bundles under /_expo/static and /assets are immutable → cache-first.
 * Navigations → network-first with cached-shell fallback (offline relaunch).
 * /api is NEVER cached: readings are personalized and auth-bearing. */
const VERSION = 'revelia-web-v1'; // bumped by the deploy script (Task 17)
const SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.add(SHELL)).then(() => self.skipWaiting()),
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api')) return; // network-only, always

  if (url.pathname.startsWith('/_expo/static') || url.pathname.startsWith('/assets')) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const resp = await fetch(event.request);
        if (resp.ok) cache.put(event.request, resp.clone());
        return resp;
      }),
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(SHELL)),
    );
  }
});
```

- [ ] **Step 2: Registration fork** — `lib/registerSw.ts` exports `registerServiceWorker(): void {}` (native no-op); `lib/registerSw.web.ts`:

```ts
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW failure must never break the app — it is an enhancement */
      });
    });
  }
}
```

Call `registerServiceWorker()` once in `app/_layout.tsx` alongside the other inits.

- [ ] **Step 3: CSP via `public/_headers`** (Cloudflare Pages syntax):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://cdn.onesignal.com; connect-src 'self' https://api.revelia.me https://*.revenuecat.com https://accounts.google.com https://*.onesignal.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://accounts.google.com; frame-src https://accounts.google.com https://*.revenuecat.com; font-src 'self'; worker-src 'self'
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
```

⚠️ Validate against reality at implementation: purchases-js's checkout origin and OneSignal's SDK host must be confirmed from their current docs; a wrong CSP silently kills payments. Test a sandbox purchase with the CSP active before shipping it.

- [ ] **Step 4:** Export + serve + Lighthouse: installability fully green; offline relaunch of the shell works (readings correctly show the error view offline — that's honest). Commit — `feat(web): service worker, registration fork, CSP (W1 task 16)`

### Task 17: iOS install experience + deploy pipeline

**Files:**
- Create: `mobile/components/web/InstallPrompt.web.tsx` + `mobile/components/web/InstallPrompt.tsx` (native: `export function InstallPrompt() { return null; }`)
- Modify: `mobile/app/(main)/home.tsx` (mount once)
- Modify: `mobile/package.json` (scripts)

- [ ] **Step 1: InstallPrompt** — web version: if iOS Safari (`/iphone|ipad/i.test(navigator.userAgent)`) AND not standalone (`!window.navigator.standalone` and `!matchMedia('(display-mode: standalone)').matches`) AND not previously dismissed (localStorage flag `revelia_install_prompt_dismissed`), render a dismissible token-styled banner: `"Install Revelia: tap Share, then 'Add to Home Screen'."` (iOS has no `beforeinstallprompt` — instructions are the only mechanism.) On Android-web/desktop Chrome, listen for `beforeinstallprompt`, stash it, and render an "Install app" button that calls `prompt()`. Full component ≤120 lines, all colors/type via tokens.

- [ ] **Step 2: Deploy scripts** in `mobile/package.json`:

```json
"web:export": "expo export --platform web",
"web:deploy": "npm run web:export && npx wrangler pages deploy dist --project-name revelia-web"
```

Plus a version stamp: the deploy script must bump `VERSION` in `public/sw.js` (a one-line `node -e` replace with the current date — deterministic, no `Date.now()` needed at runtime).

- [ ] **Step 3: Owner actions (new P-items):** create the Cloudflare Pages project `revelia-web`; attach custom domain `app.revelia.me`; DNS CNAME. Set `EXPO_PUBLIC_REVENUECAT_WEB_KEY` + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` + `EXPO_PUBLIC_ONESIGNAL_APP_ID` in the shell environment used to run `web:deploy` (export-time bake, same as EAS env behavior).

- [ ] **Step 4: SPA fallback** — create `mobile/public/_redirects`:

```
/*  /index.html  200
```

(`output: "single"` produces one index.html; deep links like `/readings/face` need the rewrite.)

- [ ] **Step 5:** Deploy to the Pages preview URL, run the full browser walk on a real iPhone (Safari): login, capture, reading, install to home screen, relaunch standalone, verify safe-area insets under the notch (viewport-fit=cover + `react-native-safe-area-context` web `env()` support). Commit — `feat(web): install prompt + Cloudflare Pages deploy pipeline (W1 task 17)`

### Task 18: OneSignal web push (DESCOPABLE — cut first per the ladder)

**Files:**
- Modify: `mobile/lib/onesignal.web.ts` (upgrade no-ops to the OneSignal Web SDK)
- Create: `mobile/public/OneSignalSDKWorker.js` (one-line importScripts per OneSignal docs)

- [ ] **Step 1: Owner action:** in the OneSignal dashboard, add a Web platform to the SAME OneSignal app (so `external_id` targeting and the existing server scheduler reach web subscribers with zero server changes); site URL `https://app.revelia.me`.

- [ ] **Step 2:** Implement `onesignal.web.ts` against the OneSignal v16 Web SDK (`OneSignalDeferred` script pattern): `initializeOneSignal` injects the SDK script; `loginOneSignalUser(id)` → `OneSignal.login(id)`; `requestNotificationPermission` → `OneSignal.Notifications.requestPermission()` — but ONLY when installed-standalone on iOS (check `display-mode: standalone`; otherwise the API rejects and the soft-prompt should never show). `setUserTags` → `OneSignal.User.addTags`.

- [ ] **Step 3:** Verify: subscribe on an installed iPhone PWA (iOS ≥ 16.4), send a test push via the existing server `POST /api/notifications/test`, confirm delivery + deep-link into the PWA. Confirm the daily scheduler reaches the web subscription via `include_aliases.external_id` unchanged.

- [ ] **Step 4:** Commit — `feat(web): onesignal web push for installed PWAs (W1 task 18)`

---

# Phase 5 — Server & polish

### Task 19: Server CORS + API base URL hygiene

**Files:**
- Modify: `server/src/config/production.ts` (CORS origins)
- Modify: `mobile/lib/api.ts` (env-first base URL)

- [ ] **Step 1:** Add `'https://app.revelia.me'` to the production CORS origin allow-list (alongside the existing `revelia.me` entries). This is additive and response-shape-preserving — safe for the no-staging deploy rule.

- [ ] **Step 2:** In `lib/api.ts`, make the base URL resolution env-first:

```ts
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  '';
```

(Web exports then pin `EXPO_PUBLIC_API_URL=https://api.revelia.me/api` in the deploy env; native builds are untouched because the env var is absent there and the `extra` fallback wins.)

- [ ] **Step 3:** `cd server && npx tsc --noEmit` (0), `cd mobile && npx tsc --noEmit` (0). Server commit deploys on push to main — coordinate with the owner per the workflow doc; the change is inert until a browser sends the new Origin. Commit — `feat(web): CORS origin + env-first api base url (W1 task 19)`

### Task 20: Desktop frame (DESCOPABLE)

**Files:**
- Modify: `mobile/app/+html.tsx` (frame CSS)

- [ ] **Step 1:** The app is mobile-designed; on desktop, frame it as a centered column instead of stretching: in `+html.tsx`'s inline style block, add `@media (min-width: 520px){#root{max-width:430px;margin:0 auto;box-shadow:0 0 48px rgba(0,0,0,.5)}}`. ⚠️ Then verify the X1 anchors: `ScreenContainer` pins `Dimensions.get('window')` sizes — on web that's the full window, not the framed column. If screens overflow the frame, the correct fix is a web-only `maxWidth` in `ScreenContainer`'s outermost style (one primitive, 26 screens inherit), NOT per-screen edits. Test tab bar, paywall, capture overlays at 1440×900 and 375×812.

- [ ] **Step 2:** `npm run gate`, commit — `feat(web): desktop viewport frame (W1 task 20)`

### Task 21: Release QA checklist + docs

**Files:**
- Create: `plans/build-28/W1-web-qa-checklist.md`
- Modify: `CLAUDE.md` (a short "Web/PWA" gotchas section), `tracking_files/owner-actions.md` (the new P-items from Tasks 5/14/15/17/18), `PROJECT_CONTEXT.md` §2/§10 (web exists now)

- [ ] **Step 1: Write the device QA checklist** (real iPhone, Safari — every line gets a checkbox and an expected result):
  - Email/OTP signup → onboarding → birth data (web date input) → sun-sign reveal
  - Face capture via camera; face capture via photo upload; palm both hands
  - All reading surfaces render; Q&A ask (free cap 402 renders the upgrade sheet); Deep Insight device gate honored (`X-Device-Id` present in the request)
  - Cosmic Report: locked state (free), sample PDF opens, credit state (premium_plus), report PDF downloads via presigned link in Safari
  - Paywall: prices render from Web Billing in local currency; Stripe test purchase; entitlement live on Android with same account; cancel path is loud, not silent
  - Install to home screen; standalone relaunch; safe-area under notch/home indicator; storage survives relaunch
  - Push (if Task 18 shipped): opt-in prompt only in standalone; test push delivers; deep link navigates
  - Offline: airplane-mode relaunch shows the shell + honest error states; recovery on reconnect
  - Session: refresh-token rotation works (leave app 24h, return, still logged in)
  - Kill-switch checks: `npm run gate` green; `node scripts/web-fork-check.js` green; `npx tsc --noEmit` 0/0; `resolve-utilities --diff` clean vs. the pre-phase snapshot
- [ ] **Step 2: CLAUDE.md additions** (short, in the existing gotcha idiom): the fork-parity rule (any new native SDK import REQUIRES a `.web` sibling — the gate blocks it); tokens-on-web (localStorage, XSS caveat, CSP is the control); `sw.js` VERSION must bump per deploy; `/api` is never cached; iOS web push requires installed + 16.4.
- [ ] **Step 3: Commit** — `docs(web): QA checklist, CLAUDE.md web gotchas, tracking updates (W1 task 21)`

---

## What this plan deliberately does NOT do

- **No server feature work.** Readings, Q&A, reports, webhooks, schedulers all already serve any authenticated HTTP client. The only server diff is one CORS origin.
- **No Android regression surface.** Every change is either a new `.web.*` file (invisible to native bundles), a shared refactor that preserves native behavior byte-for-byte (storage adapter, DateTimeField), or `Platform.OS === 'web'` branches. The existing gate suite plus `web-fork-check` enforce this.
- **No App Store resubmission workstream.** That remains a separate product decision; the PWA renders it non-blocking.
- **No SEO/marketing site.** `output: "single"` is an app shell behind auth; a public landing page would be a separate, trivially-hosted artifact.

## Sequencing & effort

Phases are strictly ordered; tasks within Phase 1 are parallelizable. Rough effort: Phase 0–1 ≈ 3–4 sessions, Phase 2 ≈ 3–4 sessions (camera and screen-walk dominate), Phase 3 ≈ 2–3 sessions + owner setup latency (Stripe/RC), Phase 4 ≈ 2–3 sessions, Phase 5 ≈ 1–2 sessions + a real-device QA day. **Total ≈ 11–16 working sessions**, with the descope ladder able to shed ~3 (Tasks 18, 5, 20) without touching the core promise: an iOS user can sign up, capture, read, subscribe, and install from Safari.
