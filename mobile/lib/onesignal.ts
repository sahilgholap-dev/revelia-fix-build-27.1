import { OneSignal } from 'react-native-onesignal';
import type { NotificationClickEvent } from 'react-native-onesignal';

const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '';

export function initializeOneSignal(): void {
  if (!APP_ID) return;
  try {
    OneSignal.initialize(APP_ID);
  } catch (e) {
    console.warn('[OneSignal] init failed:', e);
  }
}

export async function loginOneSignalUser(userId: string): Promise<void> {
  try {
    await OneSignal.login(userId);
  } catch (e) {
    console.warn('[OneSignal] login failed:', e);
  }
}

export function logoutOneSignalUser(): void {
  try {
    OneSignal.logout();
  } catch (e) {
    console.warn('[OneSignal] logout failed:', e);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const granted = await OneSignal.Notifications.requestPermission(true);
    return granted;
  } catch (e) {
    console.warn('[OneSignal] permission request failed:', e);
    return false;
  }
}

export async function optOutOfNotifications(): Promise<void> {
  try {
    await OneSignal.User.pushSubscription.optOut();
  } catch (e) {
    console.warn('[OneSignal] opt-out failed:', e);
  }
}

export async function optInToNotifications(): Promise<void> {
  try {
    await OneSignal.User.pushSubscription.optIn();
  } catch (e) {
    console.warn('[OneSignal] opt-in failed:', e);
  }
}

export function setUserTags(tags: Record<string, string>): void {
  try {
    OneSignal.User.addTags(tags);
  } catch (e) {
    console.warn('[OneSignal] addTags failed:', e);
  }
}

export function setNotificationClickHandler(
  handler: (event: NotificationClickEvent) => void
): void {
  try {
    OneSignal.Notifications.addEventListener('click', handler);
  } catch (e) {
    console.warn('[OneSignal] click handler failed:', e);
  }
}

export async function getOneSignalPlayerId(): Promise<string | null> {
  try {
    return await OneSignal.User.pushSubscription.getIdAsync();
  } catch (e) {
    console.warn('[OneSignal] getIdAsync failed:', e);
    return null;
  }
}

export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    return await OneSignal.Notifications.getPermissionAsync();
  } catch (e) {
    console.warn('[OneSignal] getPermissionAsync failed:', e);
    return false;
  }
}

// Added so app/_layout.tsx's registration loop no longer imports the native
// package directly. Every react-native-onesignal access lives in this module;
// onesignal.web.ts mirrors the export list for the web bundle, where the
// package's TurboModule spec throws at import time.
export async function getOneSignalPushToken(): Promise<string | null> {
  try {
    return await OneSignal.User.pushSubscription.getTokenAsync();
  } catch (e) {
    console.warn('[OneSignal] getTokenAsync failed:', e);
    return null;
  }
}
