// Web fork of lib/onesignal.ts.
//
// react-native-onesignal has no web build: its TurboModule spec calls
// TurboModuleRegistry.getEnforcing at import time, and on web that registry is
// undefined, so merely importing the package crashes the root layout before
// React mounts. Metro resolves this .web.ts file for web bundles, so the
// package never enters the web graph at all.
//
// Every export below mirrors lib/onesignal.ts exactly — the parity is asserted
// by scripts/web-fork-check.js. The type-only import is erased at compile time
// and does NOT pull the package into the bundle.
//
// These are honest no-ops rather than throws: callers already treat push as
// best-effort, and the reads return the values that make the profile screen
// render its "notifications unavailable" state truthfully.
import type { NotificationClickEvent } from 'react-native-onesignal';

export function initializeOneSignal(): void {}

export async function loginOneSignalUser(_userId: string): Promise<void> {}

export function logoutOneSignalUser(): void {}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function optOutOfNotifications(): Promise<void> {}

export async function optInToNotifications(): Promise<void> {}

export function setUserTags(_tags: Record<string, string>): void {}

export function setNotificationClickHandler(
  _handler: (event: NotificationClickEvent) => void
): void {}

export async function getOneSignalPlayerId(): Promise<string | null> {
  return null;
}

export async function areNotificationsEnabled(): Promise<boolean> {
  return false;
}

export async function getOneSignalPushToken(): Promise<string | null> {
  return null;
}
