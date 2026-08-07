import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QaLocation } from './qa';

/**
 * Q&A per-question location consent + capture (R7 D7 — PM-approved).
 *
 * D7 posture: a consent prompt + a one-line privacy note gate CITY-LEVEL,
 * PER-QUESTION device location. On GRANT the ask carries
 * `location:{lat,lng,timezone,city?}`; on DENY / undecided / any capture failure
 * the client OMITS `location` and the SERVER falls back to the querent's birth
 * city (the interim that ships without device consent).
 *
 * "City-level" is enforced with a COARSE permission (app.json) + `Accuracy.Low` —
 * the app never requests precise/fine location. Consent is asked ONCE (persisted);
 * the location itself is re-captured per question (it may change between sessions).
 */

const CONSENT_KEY = '@revelia:qa_location_consent';

export type QaLocationConsent = 'granted' | 'denied' | 'undecided';

/** The persisted consent decision (defaults to 'undecided' when unset / on error). */
export async function getQaLocationConsent(): Promise<QaLocationConsent> {
  try {
    const v = await AsyncStorage.getItem(CONSENT_KEY);
    if (v === 'granted' || v === 'denied') return v;
  } catch {
    // fall through → undecided
  }
  return 'undecided';
}

export async function setQaLocationConsent(v: 'granted' | 'denied'): Promise<void> {
  try {
    await AsyncStorage.setItem(CONSENT_KEY, v);
  } catch {
    // best-effort persistence — a miss just re-asks next launch
  }
}

/**
 * Ask the OS for foreground (coarse / city-level) location permission. Returns
 * whether it was granted. Called only after the user taps "Use my location" in
 * the in-app consent prompt (never a silent grab).
 */
export async function requestQaLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Capture the querent's CURRENT city-level location for THIS question. Returns
 * null on any failure / permission absence → the caller omits `location` and the
 * server falls back to the birth city.
 *
 * `timezone` = the device's current IANA zone (the querent is physically there;
 * this Intl call is already used elsewhere in the app under Hermes). `city` is a
 * best-effort reverse-geocode — optional, the server only needs lat/lng/timezone.
 */
export async function captureQaLocation(): Promise<QaLocation | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return null;

    let city: string | undefined;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      city = places[0]?.city ?? places[0]?.subregion ?? undefined;
    } catch {
      // reverse-geocode is optional; lat/lng/timezone are the required fields
    }

    return { lat, lng, timezone, city: city ?? undefined };
  } catch {
    return null;
  }
}
