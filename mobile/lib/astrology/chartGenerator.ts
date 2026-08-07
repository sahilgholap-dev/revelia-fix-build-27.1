/**
 * Birth chart mapper (Build 27 R1).
 *
 * The chart is now computed server-side with Swiss Ephemeris (arc-second
 * accurate) and delivered as a structured `NatalChart`. This module maps that
 * server shape into the `ClientBirthChart` the astrology UI already renders,
 * attaching the static interpretation copy from `interpretations.ts`.
 *
 * The previous on-device Keplerian engine (`ephemeris.ts`) has been retired —
 * positions now come from the server, so iOS and Android stay in sync and
 * accuracy no longer depends on the client.
 */

import type { NatalChart } from '@shared/types';
import {
  getBigThreeInsight,
  getAllPlanetInsights,
  getLifeThemes,
  getChartSummary,
  getDominantElement,
} from './interpretations';

export interface ClientBirthChart {
  sunSign: string;
  moonSign: string;
  risingSign: string | null;
  planets: Record<string, {
    sign: string;
    house: number | null;
    degree: number;
  }>;
  houses: Record<string, string> | null;
  aspects: Array<{
    planet1: string;
    planet2: string;
    aspect: string;
    orb: number;
  }>;
  angles: {
    ascendant: { sign: string; degree: number } | null;
    midheaven: { sign: string; degree: number } | null;
    descendant: { sign: string; degree: number } | null;
    ic: { sign: string; degree: number } | null;
  };
  summary: string;
  bigThreeInsight: string;
  planetInsights: Record<string, string>;
  lifeThemes: {
    loveAndRelationships: string;
    careerAndSuccess: string;
    communicationStyle: string;
    emotionalWorld: string;
    spiritualPath: string;
  };
}

// The 10 classical planets the UI renders (server also returns the North Node,
// which the wheel/insight tables don't cover — excluded here).
const CLASSICAL_PLANETS = [
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Map a server-computed NatalChart into the ClientBirthChart shape the
 * astrology hub + combined screen render.
 *
 * @param natal Structured chart from GET/POST /api/astrology/birth-chart
 * @param knownSunSign Server-calculated sun sign from the profile (preferred
 *   for the Sun position label so it always matches the rest of the app)
 */
export function mapServerChart(
  natal: NatalChart,
  knownSunSign?: string,
): ClientBirthChart {
  const planetData: Record<string, { sign: string; house: number | null; degree: number }> = {};
  for (const p of natal.planets) {
    if (!CLASSICAL_PLANETS.includes(p.body)) continue;
    planetData[p.body] = {
      sign: p.body === 'sun' && knownSunSign ? knownSunSign : p.sign,
      house: p.house ?? null,
      degree: p.degree,
    };
  }

  const sunSign = knownSunSign || natal.sun;
  const moonSign = natal.moon;
  const risingSign = natal.rising;

  let houses: Record<string, string> | null = null;
  if (natal.houses && natal.houses.length > 0) {
    houses = {};
    for (const h of natal.houses) {
      houses[String(h.house)] = h.sign;
    }
  }

  const aspects = natal.aspects.map((a) => ({
    planet1: a.body1,
    planet2: a.body2,
    aspect: capitalize(a.type),
    orb: a.orb,
  }));

  const angles = {
    ascendant: natal.angles ? { sign: natal.angles.asc.sign, degree: natal.angles.asc.degree } : null,
    midheaven: natal.angles ? { sign: natal.angles.mc.sign, degree: natal.angles.mc.degree } : null,
    descendant: natal.angles ? { sign: natal.angles.desc.sign, degree: natal.angles.desc.degree } : null,
    ic: natal.angles ? { sign: natal.angles.ic.sign, degree: natal.angles.ic.degree } : null,
  };

  // Interpretive copy (static lookup tables) keyed off the server positions.
  const planetInsights = getAllPlanetInsights(planetData);
  const lifeThemes = getLifeThemes(planetData);
  const dominantElement = getDominantElement(planetData);
  const bigThreeInsight = getBigThreeInsight(sunSign, moonSign, risingSign);
  const summary = getChartSummary(sunSign, moonSign, risingSign, dominantElement);

  return {
    sunSign,
    moonSign,
    risingSign,
    planets: planetData,
    houses,
    aspects,
    angles,
    summary,
    bigThreeInsight,
    planetInsights,
    lifeThemes,
  };
}
