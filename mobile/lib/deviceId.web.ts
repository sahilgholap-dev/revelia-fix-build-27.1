// Web fork of lib/deviceId.ts.
//
// The native module's `else` branch already returns null on web, so this fork
// is not needed to avoid a crash — it exists to close a MONETISATION hole.
//
// The server's R7 D5 gate salts+hashes this id to enforce "one free Deep
// Insight per device per month", and it fails OPEN when the id is absent. With
// null from every browser, the gate would be permanently open on web and free
// Deep Insight would be farmable by clearing cookies... or by doing nothing at
// all. A per-browser UUID restores the intended granularity.
//
// HONEST LIMITS, because this is weaker than the native id: it is per-browser-
// profile, not per-device, and clearing site data resets it. That is the
// strongest signal a browser will give without fingerprinting, which is not
// something this app should do. It raises the cost of farming; it does not
// eliminate it.
//
// Same contract as native: the raw id is sent ONLY as the X-Device-Id header on
// the Deep-Insight ask, never logged, never sent elsewhere. Fail-open on any
// error, exactly like the native fork.
const STORAGE_KEY = 'revelia_web_device_id';

let cached: string | null | undefined;

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the manual path
  }
  // Fallback for older Safari, which shipped getRandomValues long before
  // randomUUID. Not a v4 UUID, just an opaque high-entropy string — the server
  // only ever hashes it.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getDeviceId(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = newId();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    cached = id;
  } catch {
    // Private mode / storage blocked → fail open, same as the native fork.
    cached = null;
  }
  return cached;
}
