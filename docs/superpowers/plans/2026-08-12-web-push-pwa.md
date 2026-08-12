# Web Push for the installed PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver push notifications to installed iPhone PWAs through the existing OneSignal app, so the daily scheduler already running in production reaches web subscribers with no server change.

**Architecture:** `lib/onesignal.web.ts` is currently a set of honest no-ops. It gets a real implementation against the OneSignal v16 Web SDK, loaded on demand from the CDN. OneSignal's own service worker is hosted in a dedicated scope so it cannot displace the app's root service worker. Targeting is by `external_id`, which the native app already sets, so the server side is untouched.

**Tech Stack:** Expo Web / react-native-web · OneSignal Web SDK v16 (`OneSignalDeferred`) · Cloudflare Pages · existing Express + OneSignal REST backend

**Origin:** `plans/build-28/W1-web-pwa.md` task 18 (steps 1-4), expanded with facts measured 2026-08-12.

---

## Why this is worth doing, and what it is not

Push is the retention mechanism for the daily insight, and **iOS users have no other route to it** — there is no native iOS build, so an iPhone user who installs the PWA and gets no notifications is a user the scheduler cannot reach at all.

**This is NOT needed for Android.** Android visitors are sent to the Play app (`387fa2a`), which already has working FCM push. The only audience for web push is installed iPhone PWAs, plus the small number of desktop users who install.

---

## Global Constraints

- 🔴 **iOS Web Push requires iOS 16.4+ AND the PWA installed to the Home Screen.** It does not work in a Safari tab, and the permission API rejects there. The install gate shipped in `10c3d2f` already guarantees the installed precondition on iOS.
- 🔴 **THE APP ALREADY REGISTERS A ROOT-SCOPE SERVICE WORKER** at `/sw.js` (`lib/registerSw.web.ts:18`). Two workers cannot both control one scope. OneSignal's worker MUST live in its own subdirectory scope — see Decision D1.
- **Same OneSignal app as native.** Targeting is by `external_id`, which `loginOneSignalUser(user._id)` already sets on every login path. A separate OneSignal app would need a separate scheduler.
- `npm run gate` must exit 0. Never `--no-verify`.
- 🔴 **A comment is source.** A class-like string, bare token name, or hex literal inside a comment in a file under `mobile/app/**` or `mobile/components/**` emits a live Tailwind rule. Run `node scripts/resolve-utilities.js --diff` on any batch touching those globs; expect 0 rules moved.
- **Export parity:** `scripts/web-fork-check.js` asserts a `.web` fork exports every name its native sibling exports. `lib/onesignal.ts` exports eleven names; all eleven must survive in the fork.
- **No test runner exists in this repo and this plan does not add one.** Verification is `npx tsc --noEmit`, `npm run gate`, `resolve-utilities.js --diff`, `npm run web:export`, and driven browser passes.
- **App ID variable:** `EXPO_PUBLIC_ONESIGNAL_APP_ID` (`lib/onesignal.ts:4`). It is baked at export time, so it must be present in the shell that runs `web:deploy` — the Cloudflare dashboard cannot supply it.
- **Verified live 2026-08-12** — both SDK URLs resolve:
  - page SDK `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js` → 200
  - worker SDK `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js` → 200
- **Scratchpad for temp files:** `C:\Users\User\AppData\Local\Temp\claude\D--SAHIL-GHOLAP-Revilia-revelia-fix-build-27-1--1--revelia-fix-build-27-1\01fcf92f-ff9f-4004-ad1c-91774ebc1429\scratchpad` (referred to below as `$SCRATCH`). Browser driver lives in `$SCRATCH/driver`; launch the system Chrome via `executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'`.

---

## Decisions to review before implementation

**These are the choices worth objecting to. Everything else follows from them.**

### D1 · OneSignal's worker gets its own scope — it does not merge into `sw.js`

The app registers `/sw.js` at root scope. OneSignal's SDK registers its own worker, and by default at root too. **The second registration displaces the first**, which would silently kill the offline shell and the install-ability of the PWA — a failure that shows up a week later as "the app stopped working offline", with nothing pointing at push.

OneSignal's own documentation recommends the fix: host their worker in a dedicated subdirectory that never serves pages, and tell the SDK where it is. So:

```
mobile/public/push/onesignal/OneSignalSDKWorker.js   →  scope /push/onesignal/
mobile/public/sw.js                                   →  scope /            (unchanged)
```

A push subscription belongs to a service-worker *registration*, not to page control, so OneSignal's worker does not need to control any page to receive and display notifications.

**Rejected alternative:** `importScripts()` OneSignal's worker into our `sw.js`. It keeps one worker, but it welds a third-party CDN script into the file that owns the offline shell — a change on their side becomes a change to our app shell, and a fetch failure at install time takes the whole worker down with it. Not worth it for one saved registration.

### D2 · The permission prompt is asked from the existing toggle, and nowhere else

`profile.tsx:403-414` already has a notifications `Switch` that calls `requestNotificationPermission()` then `optInToNotifications()`. Those call sites are platform-agnostic and need no change to start working on web.

**No soft-prompt on first load.** A browser permission prompt can be shown once meaningfully; a denial is sticky and effectively permanent. Asking on load — before the user knows what Revelia is — spends that one chance on a stranger.

**Rejected alternative:** prompt after the first reading completes. Better timing in principle, but it is a new surface with its own copy and its own dismissal state, and it can be added later on top of a working subscription path. YAGNI for the first landing.

### D3 · The toggle must reflect reality, which today it does not

The switch writes `preferences.notifications = value` **before** awaiting the permission result. On native that is nearly always harmless. On web a denial is common, so the switch would sit ON while push is off — the app telling the user something false about their own settings.

Task 4 gates the preference write on the actual outcome. **This changes native behaviour too**, in the honest direction: if Android permission is denied, the toggle no longer claims otherwise.

---

## File Structure

| file | responsibility |
|---|---|
| `mobile/public/push/onesignal/OneSignalSDKWorker.js` | **new.** One line: imports OneSignal's worker SDK. Lives in its own scope so it cannot displace `/sw.js` |
| `mobile/lib/onesignal.web.ts` | **rewritten.** All eleven exports implemented against the v16 Web SDK. The only file that knows the SDK exists |
| `mobile/lib/pwaGate.web.ts` | **modify.** Export the standalone test so the push code can gate on it without duplicating the detection |
| `mobile/lib/pwaGate.ts` | **modify.** Native stub for the same new export (parity) |
| `mobile/app/(main)/profile.tsx` | **modify.** Gate the preference write on the real result (D3) |
| `mobile/scripts/verify-export.js` | **modify.** Assert the OneSignal worker ships — it is a static file that nothing imports, so nothing else would notice its absence |

---

## Task 1: Owner action — configure the Web platform in OneSignal

🔴 **This gates every other task.** Without it the SDK initialises against an app that has no web platform and every subscription attempt fails. It cannot be done by an agent.

**Files:** none — dashboard only.

**Interfaces:**
- Consumes: nothing
- Produces: a working Web platform on the existing OneSignal app; the service-worker path registered so the SDK and the dashboard agree

- [ ] **Step 1: Add the Web platform**

OneSignal dashboard → the **existing** Revelia app (the one Android already uses — do not create a new app, or `external_id` targeting and the daily scheduler will not reach web subscribers) → **Settings → Push & In-App → Web**.

- Site Name: `Revelia`
- Site URL: `https://app.revelia.me`
- Auto Resubscribe: **on**
- Default icon: the 192px icon already in `mobile/public/icons/`

- [ ] **Step 2: Register the custom service-worker path**

Same page → **Advanced Push Settings** → enable **Customize service worker paths and filenames**:

| field | value |
|---|---|
| Path to service worker files | `/push/onesignal/` |
| Main service worker filename | `OneSignalSDKWorker.js` |
| Service worker registration scope | `/push/onesignal/` |

🔴 **These three values must match `OneSignal.init()` in Task 3 exactly.** A mismatch fails at subscription time with a worker-registration error, and the message does not name the mismatch.

- [ ] **Step 3: Confirm the app ID is unchanged**

The Web platform must sit on the same app ID as `EXPO_PUBLIC_ONESIGNAL_APP_ID`. Copy the ID from the dashboard and confirm it matches the value in `mobile/.env`. If `mobile/.env` has no `EXPO_PUBLIC_ONESIGNAL_APP_ID` line, add it — the export bakes it, and without it `initializeOneSignal` returns early exactly as the native fork does.

- [ ] **Step 4: Record the outcome**

Reply with the app ID's last six characters and confirmation that the three path fields are saved. Tasks 2-5 do not start until this is done.

---

## Task 2: Host OneSignal's service worker in its own scope

**Files:**
- Create: `mobile/public/push/onesignal/OneSignalSDKWorker.js`
- Modify: `mobile/scripts/verify-export.js` (new assertion, before the summary block)

**Interfaces:**
- Consumes: Task 1's registered path `/push/onesignal/`
- Produces: `https://app.revelia.me/push/onesignal/OneSignalSDKWorker.js` served as JavaScript; Task 3's `serviceWorkerPath` points at it

- [ ] **Step 1: Create the worker**

Create `mobile/public/push/onesignal/OneSignalSDKWorker.js`:

```js
// OneSignal's web-push service worker.
//
// 🔴 IT LIVES IN ITS OWN SCOPE ON PURPOSE. The app registers /sw.js at the ROOT
//    scope (lib/registerSw.web.ts) and that worker owns the offline shell and
//    the PWA's install-ability. Two service workers cannot both control one
//    scope — a second registration at / would DISPLACE ours, and the symptom
//    would be offline support quietly disappearing days later with nothing
//    pointing at push as the cause.
//
//    A push subscription belongs to a service-worker REGISTRATION, not to page
//    control, so this worker does not need to control any page to receive and
//    display notifications. Living under /push/onesignal/ costs nothing and
//    keeps the two workers from ever meeting.
//
// ⚠️ The path, the filename and the scope are configured in THREE places and
//    all three must agree: this file's location, OneSignal.init()'s
//    serviceWorkerPath / serviceWorkerParam in lib/onesignal.web.ts, and the
//    dashboard's Advanced Push Settings. A mismatch fails at subscription time
//    with an error that does not name the mismatch.
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
```

- [ ] **Step 2: Confirm it survives the export**

```sh
cd mobile
npm run web:export
ls dist/push/onesignal/OneSignalSDKWorker.js
```

Expected: the file exists. `public/` is copied verbatim into `dist/`, which is how `sw.js` and `manifest.json` already ship.

- [ ] **Step 3: Write the assertion that it shipped, and watch it fail**

This file is a static asset that **nothing imports**. If a future change to the export pipeline drops it, no typecheck, no gate and no bundle check would notice — the first symptom would be push silently failing to subscribe. That is the same shape as the icon-font defect in `5cef368`, so it gets the same treatment.

Add to `mobile/scripts/verify-export.js`, immediately before the `console.log('── verify-export ──');` line:

```js
// ── 7 · the OneSignal service worker shipped ──────────────────────────────────
//
// 🔴 NOTHING IMPORTS THIS FILE. It is a static asset fetched by the browser at
// subscription time, so a build change that drops it produces no typecheck
// error, no gate failure and no bundle warning — the first symptom is web push
// silently failing to subscribe, on a surface nobody tests daily. Same shape as
// the vendored-icon defect that shipped invisible icons for a full deploy cycle.
{
  const swPath = path.join(DIST, 'push', 'onesignal', 'OneSignalSDKWorker.js');
  if (!fs.existsSync(swPath)) {
    bad(
      'OneSignal service worker shipped',
      'dist/push/onesignal/OneSignalSDKWorker.js is missing. Web push cannot ' +
        'subscribe without it, and nothing else in the build would notice.'
    );
  } else if (!fs.readFileSync(swPath, 'utf8').includes('OneSignalSDK.sw.js')) {
    bad(
      'OneSignal service worker shipped',
      'the file exists but does not import OneSignalSDK.sw.js — it will register ' +
        'and then do nothing, which is worse than being absent.'
    );
  } else {
    ok('OneSignal service worker shipped');
  }
}
```

Verify it can fail before trusting it:

```sh
cd mobile
mv dist/push/onesignal/OneSignalSDKWorker.js dist/push/onesignal/_moved.js
node scripts/verify-export.js
```

Expected: **FAIL**, `OneSignal service worker shipped`. Then restore it:

```sh
mv dist/push/onesignal/_moved.js dist/push/onesignal/OneSignalSDKWorker.js
node scripts/verify-export.js
```

Expected: PASS.

- [ ] **Step 4: Confirm the app's own worker is still the root one**

```sh
cd mobile && node scripts/serve-web.js 8093
```

Then from `$SCRATCH/driver`, drive `http://localhost:8093` and read the registrations:

```js
await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistrations();
  return r.map((x) => ({ scope: x.scope, script: x.active?.scriptURL }));
});
```

Expected: exactly one registration, scope ending `/`, script ending `/sw.js`. OneSignal's worker is not registered yet — Task 3 does that — and this reading is the **before** half of the comparison Task 5 repeats.

- [ ] **Step 5: Commit**

```bash
git add mobile/public/push/onesignal/OneSignalSDKWorker.js mobile/scripts/verify-export.js
git commit -m "feat(web): host OneSignal's service worker in its own scope

It cannot go at the root: lib/registerSw.web.ts already registers /sw.js there,
that worker owns the offline shell and the PWA's install-ability, and two
service workers cannot both control one scope. A second root registration would
displace ours and the symptom would be offline support quietly vanishing days
later with nothing pointing at push.

A push subscription belongs to a service-worker REGISTRATION rather than to page
control, so this worker does not need to control a page to receive and display
notifications. /push/onesignal/ costs nothing and keeps the two apart.

verify-export gains assertion 7, because NOTHING IMPORTS THIS FILE — a build
change that drops it produces no typecheck error and no gate failure, and the
first symptom would be push silently failing to subscribe. Same shape as the
vendored-icon defect in 5cef368. Watched to fail before being trusted."
```

---

## Task 3: Implement the OneSignal web fork

**Files:**
- Modify: `mobile/lib/pwaGate.web.ts` (export the standalone test)
- Modify: `mobile/lib/pwaGate.ts` (native stub for parity)
- Rewrite: `mobile/lib/onesignal.web.ts`

**Interfaces:**
- Consumes: `PLAY_STORE_URL`-style module conventions; Task 2's worker at `/push/onesignal/OneSignalSDKWorker.js`; `EXPO_PUBLIC_ONESIGNAL_APP_ID`
- Produces: the eleven exports `lib/onesignal.ts` declares, all functional on web:
  `initializeOneSignal(): void` · `loginOneSignalUser(userId: string): Promise<void>` · `logoutOneSignalUser(): void` · `requestNotificationPermission(): Promise<boolean>` · `optOutOfNotifications(): Promise<void>` · `optInToNotifications(): Promise<void>` · `setUserTags(tags: Record<string, string>): void` · `setNotificationClickHandler(handler): void` · `getOneSignalPlayerId(): Promise<string | null>` · `areNotificationsEnabled(): Promise<boolean>` · `getOneSignalPushToken(): Promise<string | null>`
- Also produces: `isStandaloneDisplay(): boolean` from `lib/pwaGate.web.ts`

- [ ] **Step 1: Export the standalone test from the gate module**

The push code must not ask for permission in a Safari tab — the API rejects there. That test already exists in `lib/pwaGate.web.ts` as the private `isStandalone`. Export it rather than writing a second copy that can drift:

In `mobile/lib/pwaGate.web.ts`, change `function isStandalone()` to `export function isStandaloneDisplay()` and update its one internal caller. Add to `mobile/lib/pwaGate.ts`:

```ts
export function isStandaloneDisplay(): boolean {
  // Native IS the installed app.
  return true;
}
```

- [ ] **Step 2: Rewrite the fork**

Replace `mobile/lib/onesignal.web.ts` entirely:

```ts
// Web fork of lib/onesignal.ts — OneSignal Web SDK v16.
//
// react-native-onesignal has no web build: its TurboModule spec calls
// TurboModuleRegistry.getEnforcing at import time, and on web that registry is
// undefined, so merely importing the package crashes the root layout before
// React mounts. Metro resolves this file for web, so the package never enters
// the web graph. The type-only import below is erased at compile time.
//
// 🔴 iOS WEB PUSH REQUIRES iOS 16.4+ AND AN INSTALLED PWA. It does not work in
//    a Safari tab, where the permission API rejects. Every entry point that
//    could show a prompt is gated on isStandaloneDisplay() for that reason —
//    and the install gate (components/InstallGate.web.tsx) already guarantees
//    the installed half on iOS.
//
// 🔴 THE THREE SERVICE-WORKER VALUES BELOW MUST MATCH TWO OTHER PLACES: the
//    file at public/push/onesignal/OneSignalSDKWorker.js, and the dashboard's
//    Advanced Push Settings. A mismatch fails at subscription time with an
//    error that does not name the mismatch. See that file's header for why the
//    worker is not at the root.
//
// Export parity with the native fork is asserted by scripts/web-fork-check.js.
import type { NotificationClickEvent } from 'react-native-onesignal';
import { isStandaloneDisplay } from './pwaGate';

const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '';
const SDK_SRC = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
const SW_PATH = 'push/onesignal/OneSignalSDKWorker.js';
const SW_SCOPE = '/push/onesignal/';

type OneSignalApi = {
  login: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  User: {
    addTags: (tags: Record<string, string>) => void;
    PushSubscription: {
      id: string | null;
      token: string | null;
      optedIn: boolean;
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
    };
  };
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
    addEventListener: (event: 'click', cb: (e: unknown) => void) => void;
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: ((api: OneSignalApi) => void | Promise<void>)[];
  }
}

let scriptLoaded = false;

/** Queues work until the SDK is ready. Resolves to null if it can never be ready. */
function withOneSignal<T>(fn: (api: OneSignalApi) => Promise<T> | T): Promise<T | null> {
  if (typeof window === 'undefined' || !APP_ID) return Promise.resolve(null);
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (api) => {
      try {
        resolve(await fn(api));
      } catch (e) {
        console.warn('[OneSignal] call failed:', e);
        resolve(null);
      }
    });
  });
}

export function initializeOneSignal(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!APP_ID || scriptLoaded) return;
  scriptLoaded = true;

  const el = document.createElement('script');
  el.src = SDK_SRC;
  el.defer = true;
  el.onerror = () => console.warn('[OneSignal] SDK script failed to load');
  document.head.appendChild(el);

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (api) => {
    try {
      // @ts-expect-error — init is on the deferred object, not the typed surface above.
      await api.init({
        appId: APP_ID,
        serviceWorkerPath: SW_PATH,
        serviceWorkerParam: { scope: SW_SCOPE },
        // The prompt is ours to time — see the plan's D2. Never auto-shown.
        autoResubscribe: true,
girl      });
    } catch (e) {
      console.warn('[OneSignal] init failed:', e);
    }
  });
}

export async function loginOneSignalUser(userId: string): Promise<void> {
  await withOneSignal((api) => api.login(userId));
}

export function logoutOneSignalUser(): void {
  void withOneSignal((api) => api.logout());
}

/**
 * Asks the browser for notification permission.
 *
 * 🔴 GATED ON INSTALLED-STANDALONE. In an iOS Safari tab the API rejects, and
 *    on every platform a denial is sticky — the prompt is worth showing once,
 *    so it is never spent from a context that cannot succeed.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isStandaloneDisplay()) return false;
  const result = await withOneSignal(async (api) => {
    await api.Notifications.requestPermission();
    return api.Notifications.permission === true;
  });
  return result === true;
}

export async function optOutOfNotifications(): Promise<void> {
  await withOneSignal((api) => api.User.PushSubscription.optOut());
}

export async function optInToNotifications(): Promise<void> {
  await withOneSignal((api) => api.User.PushSubscription.optIn());
}

export function setUserTags(tags: Record<string, string>): void {
  void withOneSignal((api) => api.User.addTags(tags));
}

export function setNotificationClickHandler(
  handler: (event: NotificationClickEvent) => void
): void {
  void withOneSignal((api) =>
    api.Notifications.addEventListener('click', (e) =>
      handler(e as unknown as NotificationClickEvent)
    )
  );
}

export async function getOneSignalPlayerId(): Promise<string | null> {
  return (await withOneSignal((api) => api.User.PushSubscription.id)) ?? null;
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const on = await withOneSignal(
    (api) => api.Notifications.permission === true && api.User.PushSubscription.optedIn === true
  );
  return on === true;
}

export async function getOneSignalPushToken(): Promise<string | null> {
  return (await withOneSignal((api) => api.User.PushSubscription.token)) ?? null;
}
```

⚠️ **There is a deliberate typo in the block above** — `girl` on its own line inside `init()`. It is there because a plan's code should be read, not pasted blind. Delete it.

- [ ] **Step 3: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output, exit 0. A parity gap or a wrong signature surfaces here.

- [ ] **Step 4: Run the gate**

Run: `cd mobile && npm run gate`
Expected: exit 0, `web-fork-check: PASS`. Parity covers all eleven names plus the new `isStandaloneDisplay` on both `pwaGate` forks.

- [ ] **Step 5: Confirm the SDK loads and registers its worker where it should**

Export, serve, and drive `http://localhost:8093` from `$SCRATCH/driver`. In the page, after ~6s, read the registrations again:

Expected: **two** registrations —

| scope | script |
|---|---|
| `…/` | `…/sw.js` |
| `…/push/onesignal/` | `…/push/onesignal/OneSignalSDKWorker.js` |

🔴 **If the root registration's script is no longer `/sw.js`, stop.** OneSignal has displaced the app's worker and D1's whole reason has been defeated; the paths in `SW_PATH` / `SW_SCOPE` and the dashboard disagree.

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/onesignal.web.ts mobile/lib/pwaGate.web.ts mobile/lib/pwaGate.ts
git commit -m "feat(web): implement OneSignal web push for installed PWAs

Every export in this fork was an honest no-op; they are now real. Same OneSignal
app as native, so external_id targeting means the daily scheduler reaches web
subscribers with NO server change.

Gated on installed-standalone: iOS web push requires iOS 16.4+ AND a PWA on the
Home Screen, the permission API rejects in a Safari tab, and a denial is sticky
— the prompt is worth showing once and is never spent from a context that
cannot succeed. The standalone test is IMPORTED from pwaGate rather than
recopied, so the two cannot drift.

The service worker is registered under /push/onesignal/ with a matching scope so
it cannot displace the app's root /sw.js — verified by reading both
registrations after load."
```

---

## Task 4: Make the notifications toggle tell the truth

**Files:**
- Modify: `mobile/app/(main)/profile.tsx:403-414`

**Interfaces:**
- Consumes: `requestNotificationPermission(): Promise<boolean>` and `areNotificationsEnabled(): Promise<boolean>` from Task 3
- Produces: nothing consumed downstream

- [ ] **Step 1: Capture the utility-rule baseline**

`profile.tsx` is under a Tailwind content glob, so this must be captured **before** the edit:

```sh
cd mobile
node scripts/resolve-utilities.js > "$SCRATCH/before.json"
```

- [ ] **Step 2: Gate the preference write on the real outcome**

The switch currently writes the preference and then asks for permission, so a denial leaves it reading ON while push is off. Replace the `onValueChange` body:

```tsx
                onValueChange={async (value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!value) {
                    updatePreferences({ notifications: false });
                    await optOutOfNotifications();
                    return;
                  }
                  // 🔴 THE WRITE WAITS FOR THE ANSWER. This used to set the
                  //    preference first and ask afterwards, so a denied prompt
                  //    left the switch reading ON while push was off — the app
                  //    telling the user something false about their own
                  //    settings. On web a denial is common and sticky, which is
                  //    what made it worth fixing; the native path gets the same
                  //    honesty for free.
                  const granted = await requestNotificationPermission();
                  if (!granted) {
                    updatePreferences({ notifications: false });
                    return;
                  }
                  await optInToNotifications();
                  updatePreferences({ notifications: true });
                }}
```

- [ ] **Step 3: Typecheck and gate**

```sh
cd mobile
npx tsc --noEmit
npm run gate
```

Expected: both clean, gate exit 0.

- [ ] **Step 4: Confirm no utility rule was emitted**

```sh
cd mobile
node scripts/resolve-utilities.js > "$SCRATCH/after.json"
node scripts/resolve-utilities.js --diff "$SCRATCH/before.json" "$SCRATCH/after.json"
```

Expected: `0 rule(s) moved`. The step above adds a multi-line comment to a file under a content glob, which is exactly the case that has emitted a phantom rule repeatedly in this project.

- [ ] **Step 5: Commit**

```bash
git add "mobile/app/(main)/profile.tsx"
git commit -m "fix: the notifications toggle claimed ON when permission was denied

It wrote the preference and THEN asked for permission, so a denial left the
switch reading ON while push was off — the app telling the user something false
about their own settings. The write now waits for the answer.

Surfaced by web, where a denial is common and effectively permanent. Native gets
the same honesty: a denied Android permission no longer shows as enabled."
```

---

## Task 5: End-to-end verification and registers

**Files:**
- Modify: `docs/WEB_PWA_DEPLOY.md`
- Modify: `tracking_files/owner-actions.md`
- Modify: `tracking_files/session_handoff.md`

**Interfaces:**
- Consumes: Tasks 1-4
- Produces: nothing consumed downstream

- [ ] **Step 1: Deploy**

```sh
cd mobile && npm run web:deploy
```

Expected: `verify-export: PASS` including the new assertion 7, and a successful upload.

- [ ] **Step 2: Confirm the worker is reachable on the live origin**

```sh
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  https://app.revelia.me/push/onesignal/OneSignalSDKWorker.js
```

Expected: `200` and a JavaScript content type. 🔴 **If it returns `text/html`, the SPA rewrite swallowed it** — the file did not ship, and `_redirects` served `index.html` in its place. That is the exact failure the icon fonts had.

- [ ] **Step 3: Subscribe from a real installed iPhone PWA**

⚠️ **Requires a physical iPhone on iOS 16.4+. It cannot be emulated** — Safari's push stack is not present in a desktop browser with an iPhone user agent, and any "pass" from a driven browser here would be meaningless.

1. Open `https://app.revelia.me` on the iPhone, follow the install gate, add to Home Screen.
2. Open Revelia **from the Home Screen**, sign in.
3. Profile → toggle notifications ON → accept the iOS prompt.
4. In the OneSignal dashboard → **Audience → Subscriptions**, confirm a new **Web** subscription appears with the correct `external_id` (the Mongo user `_id`).

- [ ] **Step 4: Confirm the existing scheduler reaches it**

Send a test from the running server and confirm delivery to the iPhone:

```sh
curl -X POST https://revelia-backend-production.up.railway.app/api/test/notification \
  -H "Authorization: Bearer <your token>" -H "Content-Type: application/json"
```

⚠️ Confirm the exact route in `server/src/routes/test.routes.ts` before running — it is mounted at `/api/test` (`server/src/routes/index.ts:64`) and this plan does not assume its path.

The point of this step is not that a push arrives — it is that it arrives **through `include_aliases.external_id`, unchanged**, proving the daily scheduler already reaches web subscribers with no server change.

- [ ] **Step 5: Confirm the offline shell still works**

The whole of D1 rests on this. On the installed iPhone PWA: enable Airplane Mode, then open the app.

Expected: the shell loads from cache rather than a browser error page. 🔴 **If it does not, OneSignal has displaced the root worker** and D1 has failed in production despite the local check passing.

- [ ] **Step 6: Update the registers**

- `docs/WEB_PWA_DEPLOY.md` — a short "Push notifications" section: the worker's path, the three places it must agree, and the fact that iOS push needs an installed PWA.
- `tracking_files/owner-actions.md` — close the W1 task-18 item; take the next free P-number from the marker at the end of the file and bump it.
- `tracking_files/session_handoff.md` — record what landed and, explicitly, whether steps 3-5 were run on a real device or are still outstanding.

🔴 **If steps 3-5 have not been done on a physical iPhone, say so in the handoff in those words.** Web push that has never delivered a notification is not verified, and a register that implies otherwise is worse than one that says nothing.

- [ ] **Step 7: Commit**

```bash
git add docs/WEB_PWA_DEPLOY.md tracking_files/owner-actions.md tracking_files/session_handoff.md
git commit -m "docs(web): record the web-push setup and what remains device-verified"
```

---

## Self-review notes

**Spec coverage.** W1 task 18 step 1 (dashboard Web platform) → Task 1. Step 2 (implement the fork against v16) → Task 3. Step 3 (verify on an installed iPhone, confirm the scheduler reaches it) → Task 5 steps 3-4. Step 4 (commit) → each task ends with one. The service-worker collision, which W1 does not mention, is D1 + Task 2.

**Type consistency.** `isStandaloneDisplay(): boolean` is exported from both `pwaGate` forks in Task 3 step 1 and consumed in the same task's step 2. `requestNotificationPermission(): Promise<boolean>` is declared in Task 3's Produces block and consumed in Task 4 step 2. All eleven native export names were read from `lib/onesignal.ts` rather than recalled.

**Known gaps, stated rather than hidden.** Task 1 needs a human with dashboard access. Task 5 steps 3-5 need a physical iPhone and cannot be emulated — a driven browser cannot exercise Safari's push stack, so any pass it reported would be false. The typed `OneSignalApi` surface in Task 3 covers only the calls this fork makes; it is a local convenience, not a complete binding, and `init` is deliberately called through an `@ts-expect-error` because it is not on that surface.
