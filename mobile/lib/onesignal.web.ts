// Web fork of lib/onesignal.ts — OneSignal Web SDK v16.
//
// react-native-onesignal has no web build: its TurboModule spec calls
// TurboModuleRegistry.getEnforcing at import time, and on web that registry is
// undefined, so merely importing the package crashes the root layout before
// React mounts. Metro resolves this file for web, so the package never enters
// the web graph. The type-only import below is erased at compile time.
//
// 🔴 SAME OneSignal APP AS NATIVE, WHICH IS THE WHOLE POINT. Targeting is by
//    external_id, and loginOneSignalUser(user._id) already runs on every login
//    path, so the daily scheduler running in production reaches web subscribers
//    with NO SERVER CHANGE. A separate app would have needed its own scheduler.
//
// 🔴 iOS WEB PUSH REQUIRES iOS 16.4+ AND AN INSTALLED PWA. It does not work in
//    a Safari tab, where the permission API rejects. requestNotificationPermission
//    is gated on isStandaloneDisplay() for that reason — and the install gate
//    (components/InstallGate.web.tsx) already guarantees the installed half on
//    iOS. A browser permission prompt is worth showing ONCE; a denial is sticky,
//    so it is never spent from a context that cannot succeed.
//
// 🔴 THE THREE SERVICE-WORKER VALUES BELOW MUST MATCH TWO OTHER PLACES: the file
//    at public/push/onesignal/OneSignalSDKWorker.js, and the dashboard's
//    Advanced Push Settings. A mismatch fails at subscription time with an error
//    that does not name the mismatch. See that file's header for why the worker
//    is not at the root — in short, ours already owns the root scope and a
//    second registration there would displace it.
//
// Export parity with the native fork is asserted by scripts/web-fork-check.js.
import type { NotificationClickEvent } from 'react-native-onesignal';
import { isStandaloneDisplay } from './pwaGate';

const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '';
const SDK_SRC = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
const SW_PATH = 'push/onesignal/OneSignalSDKWorker.js';
const SW_SCOPE = '/push/onesignal/';

/**
 * Only the surface this fork actually calls.
 *
 * Deliberately partial — a full binding would be a maintenance burden for no
 * benefit, and every call goes through `withOneSignal`, which swallows and logs
 * anything the real SDK disagrees about rather than letting it reach a caller
 * that treats push as best-effort.
 */
type OneSignalApi = {
  init: (config: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
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
  // eslint-disable-next-line no-var
  var OneSignalDeferred: ((api: OneSignalApi) => void | Promise<void>)[] | undefined;
}

let scriptRequested = false;

/**
 * Queues work until the SDK is ready, resolving to null when it never can be.
 *
 * OneSignal's v16 page SDK is a loader: it drains `OneSignalDeferred` once the
 * real bundle arrives. Pushing to that array is therefore safe before the
 * script has loaded, which is what lets every export below be called at any
 * time without ordering rules.
 *
 * Never throws. Push is best-effort at every call site in this app — a failed
 * subscription must not take down a login.
 */
function withOneSignal<T>(fn: (api: OneSignalApi) => Promise<T> | T): Promise<T | null> {
  if (typeof window === 'undefined' || !APP_ID) return Promise.resolve(null);
  return new Promise((resolve) => {
    globalThis.OneSignalDeferred = globalThis.OneSignalDeferred || [];
    globalThis.OneSignalDeferred.push(async (api) => {
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
  if (!APP_ID || scriptRequested) return;
  scriptRequested = true;

  const el = document.createElement('script');
  el.src = SDK_SRC;
  el.defer = true;
  el.onerror = () => console.warn('[OneSignal] SDK script failed to load');
  document.head.appendChild(el);

  globalThis.OneSignalDeferred = globalThis.OneSignalDeferred || [];
  globalThis.OneSignalDeferred.push(async (api) => {
    try {
      await api.init({
        appId: APP_ID,
        serviceWorkerPath: SW_PATH,
        serviceWorkerParam: { scope: SW_SCOPE },
        // The prompt is ours to time, from the profile toggle. Never auto-shown:
        // asking a stranger on first load spends the one chance the browser gives.
        autoResubscribe: true,
      });
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
 * Asks the browser for notification permission. Returns whether it was granted.
 *
 * 🔴 GATED ON INSTALLED-STANDALONE — see this file's header.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isStandaloneDisplay()) return false;
  const granted = await withOneSignal(async (api) => {
    await api.Notifications.requestPermission();
    return api.Notifications.permission === true;
  });
  return granted === true;
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
