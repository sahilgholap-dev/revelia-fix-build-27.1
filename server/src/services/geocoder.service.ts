/**
 * Geocoder. Resolves free-text birth places to lat/lng/IANA timezone via
 * a Haiku-first, Sonnet-fallback ladder. Honest by default: returns null
 * only after all attempts fail; never invents coordinates.
 *
 * Resolution ladder (per uncached input):
 *   1. claude-haiku-4-5-20251001 — first try (cheap, fast, handles 85%+)
 *   2. claude-haiku-4-5-20251001 — retry once (handles non-determinism;
 *      backfill dry-run showed Tampa flaking on a second pass after a
 *      successful first pass with the same input)
 *   3. claude-sonnet-4-6 — single fallback (smarter, knows obscure places
 *      Haiku declines, e.g. Satara, India)
 *
 * Cost profile: ~80 input + 40 output tokens per call. Most resolves on
 * step 1 (1 call). Sonnet only invoked for the 10-15% Haiku can't handle.
 * Cache absorbs duplicate places — functionally negligible at our scale.
 */

import Anthropic from '@anthropic-ai/sdk';
import { HONESTY_PREAMBLE } from '../prompts/shared/honesty-preamble';
import { GeocodeCache } from '../models/GeocodeCache';
import { logger } from '../utils/logger';

export interface GeocodeResult {
  lat: number;
  lng: number;
  timezone: string;
  normalized: string;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `${HONESTY_PREAMBLE}

You are a precise geocoding service. Given a free-text birth place, return ONLY a JSON object with the geographic coordinates and IANA timezone of that location. If the location is ambiguous, unrecognizable, or fictional, return the unresolvable response.

OUTPUT FORMAT — RESOLVED:
{"lat": <number, -90 to 90>, "lng": <number, -180 to 180>, "timezone": "<IANA>", "normalized": "<City, Region, Country>"}

OUTPUT FORMAT — UNRESOLVABLE:
{"lat": null, "lng": null, "timezone": null, "normalized": null}

Rules:
- Use mid-city coordinates for cities. Capital coordinates for countries-only inputs.
- Timezone must be an IANA name (e.g., "America/New_York", "Asia/Kolkata"). Never abbreviations like "EST" or "IST".
- For ambiguous names ("Springfield" without state), pick the most populous match and reflect that in the normalized field.
- Never invent coordinates for places you don't recognize. Return unresolvable.
- Output ONLY the JSON object. No prose. No markdown fences.`;

// Cache key: lowercased + whitespace + comma-spacing collapsed. Ensures
// "Mumbai , India ", "mumbai,india", and "Mumbai, India" all resolve to
// the same cache row.
function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ');
}

// Prompt input: same normalization as the cache key, but case-preserving.
// Backfill dry-run revealed Haiku rejects "Mumbai , India" (awkward
// space-before-comma) where "Mumbai, India" resolves cleanly. Send the
// normalized form so geocoding doesn't depend on input cosmetics.
function normalizeForPrompt(input: string): string {
  return input
    .trim()
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ');
}

function isValidLat(n: unknown): n is number {
  return typeof n === 'number' && !isNaN(n) && n >= -90 && n <= 90;
}

function isValidLng(n: unknown): n is number {
  return typeof n === 'number' && !isNaN(n) && n >= -180 && n <= 180;
}

function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  // Round-trip through Intl — throws on unknown IANA names. Accepts
  // "America/New_York", "Asia/Kolkata", "UTC", etc. Rejects "EST"/"IST"
  // abbreviations and arbitrary strings.
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * One model call. Returns a resolved GeocodeResult on success, or null
 * for any failure (API error, empty response, parse error, model says
 * unresolvable). Caller decides whether to retry, escalate, or give up.
 *
 * Intentionally narrow: no caching, no retries internally. Composition
 * happens in geocodeBirthPlace.
 */
async function callGeocodingModel(
  modelName: string,
  haikuInput: string
): Promise<GeocodeResult | null> {
  let response;
  try {
    response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Birth place: "${haikuInput}"` }],
    });
  } catch (err: any) {
    logger.warn('geocoder_api_error', {
      input: haikuInput,
      model: modelName,
      error: err?.message ?? String(err),
    });
    return null;
  }

  const textContent = response.content.find((c) => c.type === 'text');
  const text = textContent && textContent.type === 'text' ? textContent.text.trim() : '';

  if (!text) {
    logger.warn('geocoder_empty_response', { input: haikuInput, model: modelName });
    return null;
  }

  let parsed: { lat: number | null; lng: number | null; timezone: string | null; normalized: string | null };
  try {
    parsed = JSON.parse(text);
  } catch {
    logger.warn('geocoder_parse_error', { input: haikuInput, model: modelName, text });
    return null;
  }

  if (
    isValidLat(parsed.lat) &&
    isValidLng(parsed.lng) &&
    isValidTimezone(parsed.timezone)
  ) {
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      timezone: parsed.timezone,
      normalized: parsed.normalized || haikuInput,
    };
  }

  return null;
}

/**
 * Resolve a free-text birth place to lat/lng/IANA-timezone, or null if
 * unresolvable. Orchestrates Haiku-retry-then-Sonnet-fallback. Caches
 * both terminal outcomes — never re-asks the API about a known place.
 */
export async function geocodeBirthPlace(
  input: string
): Promise<GeocodeResult | null> {
  const trimmed = (input || '').trim();
  if (trimmed.length < 2) return null;

  // cacheKey: lowercased lookup form. haikuInput: case-preserved form sent
  // to the model and stored in cache.inputOriginal for log readability.
  // Both use the same whitespace + comma normalization so "Mumbai , India",
  // "mumbai,india", and "Mumbai, India" all collapse to one cache row.
  const cacheKey = normalizeKey(trimmed);
  const haikuInput = normalizeForPrompt(trimmed);

  const cached = await GeocodeCache.findOne({ inputKey: cacheKey }).lean();
  if (cached) {
    if (
      cached.resolved &&
      cached.lat !== null &&
      cached.lng !== null &&
      cached.timezone
    ) {
      return {
        lat: cached.lat,
        lng: cached.lng,
        timezone: cached.timezone,
        normalized: cached.normalized || haikuInput,
      };
    }
    // Cached as terminally unresolvable from a full Haiku-2x + Sonnet pass.
    return null;
  }

  // Step 1: first Haiku attempt.
  let result = await callGeocodingModel(HAIKU_MODEL, haikuInput);
  let modelUsed = HAIKU_MODEL;

  // Step 2: retry Haiku once. Backfill dry-run showed Tampa flaking on a
  // second pass after resolving cleanly first — pure non-determinism.
  if (!result) {
    logger.info('geocoder_haiku_retry', { input: haikuInput });
    result = await callGeocodingModel(HAIKU_MODEL, haikuInput);
  }

  // Step 3: Sonnet fallback. Smarter, knows obscure places like Satara.
  if (!result) {
    logger.info('geocoder_sonnet_fallback', { input: haikuInput });
    result = await callGeocodingModel(SONNET_MODEL, haikuInput);
    if (result) modelUsed = SONNET_MODEL;
  }

  if (result) {
    await GeocodeCache.create({
      inputKey: cacheKey,
      inputOriginal: haikuInput,
      lat: result.lat,
      lng: result.lng,
      timezone: result.timezone,
      normalized: result.normalized,
      resolved: true,
      modelUsed,
    });
    logger.info('geocoder_resolved', {
      input: haikuInput,
      normalized: result.normalized,
      modelUsed,
    });
    return result;
  }

  // All three attempts failed — cache as terminally unresolvable.
  await GeocodeCache.create({
    inputKey: cacheKey,
    inputOriginal: haikuInput,
    resolved: false,
    modelUsed: `${HAIKU_MODEL} (2x) + ${SONNET_MODEL} (failed)`,
  });
  logger.info('geocoder_unresolvable', { input: haikuInput });
  return null;
}
