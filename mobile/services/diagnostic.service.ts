import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@revelia:diagnostic_device_id';

const API_URL =
  (Constants.expoConfig as any)?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://revelia-backend-production.up.railway.app/api';

const APP_VERSION =
  (Constants.expoConfig as any)?.version ||
  (Constants as any)?.manifest?.version ||
  'unknown';

let cachedDeviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      cachedDeviceId = existing;
      return existing;
    }
  } catch {
    // fall through and generate a fresh id
  }
  const fresh = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  cachedDeviceId = fresh;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  } catch {
    // best-effort persistence
  }
  return fresh;
}

const diagnosticClient = axios.create({
  baseURL: API_URL,
  timeout: 5_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Fire-and-forget diagnostic event logger.
 *
 * - Never awaits the network call.
 * - Wrapped in try/catch — must NEVER crash the app.
 * - Uses an isolated axios client so it does not interact with the auth
 *   interceptor / token-refresh flow.
 * - Auto-captures Platform.OS, Platform.Version, app version, persisted
 *   deviceId.
 * - Caller is responsible for keeping `data` PII-free; the server also
 *   strips forbidden keys defensively.
 */
export function logDiagnostic(event: string, data?: any): void {
  try {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[diagnostic]', event, data ?? {});
    }

    // Fire and forget — explicitly do not await
    void (async () => {
      try {
        const deviceId = await getDeviceId();
        await diagnosticClient.post('/diagnostic/log', {
          deviceId,
          platform: Platform.OS,
          osVersion: String(Platform.Version),
          appVersion: APP_VERSION,
          event,
          timestamp: new Date().toISOString(),
          data,
        });
      } catch {
        // swallow — diagnostics must never disrupt the app
      }
    })();
  } catch {
    // swallow
  }
}

export default { logDiagnostic };
