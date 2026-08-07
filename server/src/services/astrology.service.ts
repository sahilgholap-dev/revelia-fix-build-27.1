/**
 * Astrology service — Swiss Ephemeris natal-chart + transit computation.
 *
 * Build 27 R1. Uses `sweph` (Swiss Ephemeris N-API binding) in **Moshier mode**
 * (`SEFLG_MOSEPH`) — no external `.se1` ephemeris files, no native compile step.
 * Spike (2026-06-27) measured ≤ 0.97″ vs astro.com across 1879–2024, both
 * hemispheres — within arc-second tolerance. See plans/build-27/R1-swiss-ephemeris.md.
 *
 * Design:
 *  - computeNatalChart() runs once on birth-data save (and lazily at reading time).
 *  - computeTransits() runs on demand, cached by UTC calendar date.
 *  - Houses/angles are computed (Placidus) ONLY when birth time is known
 *    (not assumed) and coordinates + timezone are available; otherwise planets
 *    are still sign-accurate and houses/rising are suppressed.
 */
import * as swe from 'sweph';
import { fromZonedTime } from 'date-fns-tz';
import {
  NatalChart,
  PlanetPosition,
  HouseCusp,
  ChartAngle,
  Aspect,
  TransitSet,
  TransitAspect,
  CelestialBody,
  AspectType,
  ZodiacSign,
} from '../types/shared';
import { logger } from '../utils/logger';

const C = swe.constants;

// Moshier mode + planetary speeds (speed sign gives retrograde).
const PLANET_FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SPEED;
const HOUSE_FLAGS = C.SEFLG_MOSEPH;

const SIGNS: ZodiacSign[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

// sweph body IDs. 'northNode' uses the True Node (astro.com default).
const BODY_IDS: Record<CelestialBody, number> = {
  sun: C.SE_SUN,
  moon: C.SE_MOON,
  mercury: C.SE_MERCURY,
  venus: C.SE_VENUS,
  mars: C.SE_MARS,
  jupiter: C.SE_JUPITER,
  saturn: C.SE_SATURN,
  uranus: C.SE_URANUS,
  neptune: C.SE_NEPTUNE,
  pluto: C.SE_PLUTO,
  northNode: C.SE_TRUE_NODE,
};

const ALL_BODIES: CelestialBody[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'northNode',
];

// Classical planets only — used for natal aspects (node excluded to reduce noise).
const ASPECT_BODIES: CelestialBody[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

interface AspectDef {
  type: AspectType;
  angle: number;
  natalOrb: number;
  transitOrb: number;
}

const ASPECT_DEFS: AspectDef[] = [
  { type: 'conjunction', angle: 0, natalOrb: 8, transitOrb: 3 },
  { type: 'sextile', angle: 60, natalOrb: 6, transitOrb: 2 },
  { type: 'square', angle: 90, natalOrb: 7, transitOrb: 3 },
  { type: 'trine', angle: 120, natalOrb: 8, transitOrb: 3 },
  { type: 'opposition', angle: 180, natalOrb: 8, transitOrb: 3 },
];

/** Normalize a longitude to [0, 360). */
export function norm360(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

/** Sign + within-sign degree from an absolute ecliptic longitude. */
export function signAndDegree(lon: number): { sign: ZodiacSign; degree: number } {
  const l = norm360(lon);
  const idx = Math.floor(l / 30);
  return { sign: SIGNS[idx], degree: l - idx * 30 };
}

function toAngle(lon: number): ChartAngle {
  const l = norm360(lon);
  const { sign, degree } = signAndDegree(l);
  return { sign, degree, longitude: l };
}

/** Shortest angular separation between two longitudes, 0–180. */
function separation(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Which house (1–12) a longitude falls in, given the 12 cusp longitudes.
 * House i spans [cusp[i], cusp[i+1]) walking forward through the zodiac.
 */
function houseOfLongitude(lon: number, cusps: number[]): number {
  const l = norm360(lon);
  for (let i = 0; i < 12; i++) {
    const start = norm360(cusps[i]);
    const end = norm360(cusps[(i + 1) % 12]);
    if (start <= end) {
      if (l >= start && l < end) return i + 1;
    } else {
      // Cusp span wraps past 0°.
      if (l >= start || l < end) return i + 1;
    }
  }
  return 1;
}

export interface NatalChartInput {
  date: Date; // birth date (calendar date interpreted via its UTC components)
  time?: string | null; // "HH:mm" local wall-clock time at birthplace
  timezone?: string | null; // IANA tz of the birthplace
  lat?: number | null;
  lng?: number | null;
  timeIsAssumed?: boolean; // true when time was noon-defaulted
}

/**
 * Resolve the birth moment to a Julian Day in Universal Time.
 *
 * The stored birth `date` carries the calendar date in its UTC fields (it was
 * parsed from an ISO "YYYY-MM-DD" → UTC midnight). We combine those Y/M/D with
 * the wall-clock `time`, interpret the result in the birthplace timezone, and
 * convert to a UTC instant. Without a timezone we fall back to treating the
 * wall time as UTC (best-effort; only the degraded no-geocode path hits this).
 */
export function toJulianDayUT(input: NatalChartInput): number {
  const year = input.date.getUTCFullYear();
  const month = input.date.getUTCMonth() + 1;
  const day = input.date.getUTCDate();

  const timeStr = input.time && input.time.trim() ? input.time.trim() : '12:00';
  const [hhRaw, mmRaw] = timeStr.split(':');
  const hh = Number(hhRaw) || 0;
  const mm = Number(mmRaw) || 0;

  let utc: Date;
  if (input.timezone) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const wall = `${year}-${pad(month)}-${pad(day)}T${pad(hh)}:${pad(mm)}:00`;
    utc = fromZonedTime(wall, input.timezone);
  } else {
    utc = new Date(Date.UTC(year, month - 1, day, hh, mm));
  }

  const utHour =
    utc.getUTCHours() +
    utc.getUTCMinutes() / 60 +
    utc.getUTCSeconds() / 3600;

  return swe.julday(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
    utHour,
    C.SE_GREG_CAL
  );
}

/**
 * Low-level ephemeris primitive: one body's ecliptic longitude + speed at a
 * Julian Day (UT), under the given flags. Returns null on a fatal sweph error.
 *
 * Exposed so the isolated sidereal engine module (`astrology-sidereal.service.ts`)
 * can COMPOSE the same ephemeris call with `SEFLG_SIDEREAL` (+ a mean-node body
 * id) instead of duplicating it. `flags` defaults to the tropical natal path's
 * `PLANET_FLAGS` (Moshier + speed) so the existing behaviour is unchanged.
 */
export function computeBodyPosition(
  jd: number,
  bodyId: number,
  flags: number = PLANET_FLAGS
): { longitude: number; speed: number } | null {
  const r = swe.calc_ut(jd, bodyId, flags);
  if (r.error && r.error.length && !r.data) {
    return null;
  }
  return { longitude: norm360(r.data[0]), speed: r.data[3] };
}

/** Compute every body's position at a given Julian Day (UT). */
function computePositions(jd: number): PlanetPosition[] {
  const out: PlanetPosition[] = [];
  for (const body of ALL_BODIES) {
    const raw = computeBodyPosition(jd, BODY_IDS[body], PLANET_FLAGS);
    if (!raw) {
      logger.warn('astrology_calc_failed', { body });
      continue;
    }
    const { sign, degree } = signAndDegree(raw.longitude);
    out.push({
      body,
      sign,
      degree,
      longitude: raw.longitude,
      retrograde: raw.speed < 0,
      house: null,
    });
  }
  return out;
}

/** Major aspects between two sets of bodies, within the given orb selector. */
function computeAspects(
  positions: PlanetPosition[],
  bodies: CelestialBody[]
): Aspect[] {
  const byBody = new Map(positions.map((p) => [p.body, p]));
  const aspects: Aspect[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const p1 = byBody.get(bodies[i]);
      const p2 = byBody.get(bodies[j]);
      if (!p1 || !p2) continue;
      const sep = separation(p1.longitude, p2.longitude);
      let best: { def: AspectDef; orb: number } | null = null;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(sep - def.angle);
        if (orb <= def.natalOrb && (!best || orb < best.orb)) {
          best = { def, orb };
        }
      }
      if (best) {
        aspects.push({
          body1: bodies[i],
          body2: bodies[j],
          type: best.def.type,
          orb: Number(best.orb.toFixed(2)),
        });
      }
    }
  }
  return aspects;
}

/**
 * Compute a structured natal chart from birth data.
 *
 * Planets are always computed (sign-accurate). Houses, angles, and rising sign
 * are computed only when the birth time is known (not assumed) AND coordinates
 * + timezone are available — otherwise they're suppressed (null/empty).
 */
export function computeNatalChart(input: NatalChartInput): NatalChart {
  const jd = toJulianDayUT(input);
  const positions = computePositions(jd);

  const hasCoords =
    typeof input.lat === 'number' && typeof input.lng === 'number';
  const timeKnown = !input.timeIsAssumed && !!(input.time && input.time.trim());
  const housesAvailable = timeKnown && hasCoords && !!input.timezone;

  let houses: HouseCusp[] = [];
  let angles: NatalChart['angles'] = null;
  let rising: ZodiacSign | null = null;

  if (housesAvailable) {
    const h = swe.houses_ex(
      jd,
      HOUSE_FLAGS,
      input.lat as number,
      input.lng as number,
      'P'
    );
    if (h.data && h.data.houses && h.data.points) {
      const cusps = h.data.houses as number[];
      houses = cusps.map((lon, i) => {
        const { sign, degree } = signAndDegree(lon);
        return { house: i + 1, sign, degree, longitude: norm360(lon) };
      });
      const asc = h.data.points[0];
      const mc = h.data.points[1];
      angles = {
        asc: toAngle(asc),
        mc: toAngle(mc),
        desc: toAngle(asc + 180),
        ic: toAngle(mc + 180),
      };
      rising = angles.asc.sign;
      // Assign each planet to a house.
      for (const p of positions) {
        p.house = houseOfLongitude(p.longitude, cusps);
      }
    } else {
      logger.warn('astrology_houses_failed', { flag: h.flag });
    }
  }

  const sunPos = positions.find((p) => p.body === 'sun');
  const moonPos = positions.find((p) => p.body === 'moon');

  return {
    sun: sunPos ? sunPos.sign : signAndDegree(0).sign,
    moon: moonPos ? moonPos.sign : signAndDegree(0).sign,
    rising,
    planets: positions,
    houses,
    aspects: computeAspects(positions, ASPECT_BODIES),
    angles,
    houseSystem: 'placidus',
    ephemeris: 'moshier',
    timeKnown,
    computedAt: new Date().toISOString(),
  };
}

/** Birth-data shape as stored on the UserProfile document (or geocode result). */
interface BirthDataLike {
  date?: Date | string;
  time?: string | null;
  location?: {
    lat?: number | null;
    lng?: number | null;
    timezone?: string | null;
  } | null;
  timeIsAssumed?: boolean;
}

/**
 * Convenience mapper: build a NatalChart straight from a profile's birthData
 * sub-document. Returns null when there's no usable birth date.
 */
export function computeNatalChartFromBirthData(
  birthData: BirthDataLike | undefined | null
): NatalChart | null {
  if (!birthData?.date) return null;
  const date =
    birthData.date instanceof Date ? birthData.date : new Date(birthData.date);
  if (isNaN(date.getTime())) return null;

  return computeNatalChart({
    date,
    time: birthData.time ?? null,
    timezone: birthData.location?.timezone ?? null,
    lat: birthData.location?.lat ?? null,
    lng: birthData.location?.lng ?? null,
    timeIsAssumed: birthData.timeIsAssumed,
  });
}

// ---------------------------------------------------------------------------
// Transits
// ---------------------------------------------------------------------------

// Transiting positions are natal-independent, so cache them by UTC date.
// Bounded LRU-ish: trimmed when it grows past the cap.
const transitPositionCache = new Map<string, PlanetPosition[]>();
const TRANSIT_CACHE_CAP = 64;

function utcDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

/**
 * Transiting positions for a calendar date, anchored to **UTC noon** of that
 * date. UTC-noon (rather than per-user-tz) keeps the cache global and is plenty
 * precise for daily/weekly/monthly framing (slow bodies barely move in a day;
 * the Moon moves ~6°, acceptable for transit-aspect context).
 */
function transitingPositions(date: Date): PlanetPosition[] {
  const key = utcDateKey(date);
  const cached = transitPositionCache.get(key);
  if (cached) return cached;

  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    12.0,
    C.SE_GREG_CAL
  );
  const positions = computePositions(jd);

  if (transitPositionCache.size >= TRANSIT_CACHE_CAP) {
    const oldest = transitPositionCache.keys().next().value;
    if (oldest !== undefined) transitPositionCache.delete(oldest);
  }
  transitPositionCache.set(key, positions);
  return positions;
}

/**
 * Compute the current transits to a natal chart for a given date.
 * Aspects use tight transit orbs so only genuinely active contacts surface.
 */
export function computeTransits(natal: NatalChart, date: Date): TransitSet {
  const positions = transitingPositions(date);
  const natalByBody = new Map(natal.planets.map((p) => [p.body, p]));

  const aspectsToNatal: TransitAspect[] = [];
  for (const t of positions) {
    for (const natalBody of ALL_BODIES) {
      const n = natalByBody.get(natalBody);
      if (!n) continue;
      const sep = separation(t.longitude, n.longitude);
      let best: { def: AspectDef; orb: number } | null = null;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(sep - def.angle);
        if (orb <= def.transitOrb && (!best || orb < best.orb)) {
          best = { def, orb };
        }
      }
      if (best) {
        aspectsToNatal.push({
          transiting: t.body,
          natal: natalBody,
          type: best.def.type,
          orb: Number(best.orb.toFixed(2)),
        });
      }
    }
  }

  return {
    date: utcDateKey(date),
    positions,
    aspectsToNatal,
  };
}

// ---------------------------------------------------------------------------
// Human-readable summaries (consumed by insight.service in Phase D)
// ---------------------------------------------------------------------------

const BODY_LABEL: Record<CelestialBody, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  northNode: 'North Node',
};

/** "Sun trine Moon (orb 2.1°)" style lines for the major natal aspects. */
export function describeNatalAspects(chart: NatalChart, limit = 8): string[] {
  return [...chart.aspects]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, limit)
    .map(
      (a) =>
        `${BODY_LABEL[a.body1]} ${a.type} ${BODY_LABEL[a.body2]} (orb ${a.orb.toFixed(
          1
        )}°)`
    );
}

/** "Transiting Saturn square natal Sun (orb 1.2°)" style lines. */
export function describeTransits(transits: TransitSet, limit = 8): string[] {
  return [...transits.aspectsToNatal]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, limit)
    .map(
      (a) =>
        `Transiting ${BODY_LABEL[a.transiting]} ${a.type} natal ${
          BODY_LABEL[a.natal]
        } (orb ${a.orb.toFixed(1)}°)`
    );
}
