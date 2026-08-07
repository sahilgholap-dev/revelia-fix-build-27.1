// Single seam over expo-secure-store.
//
// expo-secure-store has no web implementation: on web its native methods are
// undefined, so every read throws "getValueWithKeyAsync is not a function" and
// the app can never restore a session. Metro resolves secureStorage.web.ts for
// web bundles, which backs the same API with localStorage.
//
// The three exported names deliberately MATCH expo-secure-store's own, so the
// five consumers changed only their import specifier — no call-site bodies were
// touched and native behaviour is byte-identical to the direct import.
//
// Consumers: lib/storage.ts · store/reviewStore.ts ·
// hooks/useNotificationPermission.ts · app/(capture)/face-capture.tsx ·
// app/(capture)/palm-capture.tsx
import * as SecureStore from 'expo-secure-store';

export async function getItemAsync(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  return SecureStore.deleteItemAsync(key);
}
