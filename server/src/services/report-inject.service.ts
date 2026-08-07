/**
 * Report inject-payload builders — R9 Personalized Cosmic Report (Build 27),
 * charter §14 STEP 5a.
 *
 * Mode B (R9-report.md §0/§4, spec §12-D2): the Fable model NEVER does
 * arithmetic. This module builds the three validated payloads the generation
 * prompt CONSUMES — `ASTRONOMY_JSON`, `NUMEROLOGY_JSON`, `PALM_OBSERVATIONS` —
 * plus the assembled inject block, from data the backend already computes
 * deterministically. It performs NO Fable call, NO DB write, NO persistence,
 * NO I/O beyond composing the astronomy engine + the numerology utils over data
 * the caller already loaded. Every builder is a PURE, deterministic function of
 * its inputs; step 5b (the Fable `report` surface + orchestration + nonce) calls
 * these and routes a validation failure to the worker's failure path.
 *
 * ── EXPLICIT ALLOW-LIST / STRUCTURAL FACE-ABSENCE (charter §14 step 5; 12c-audit
 *    A) ────────────────────────────────────────────────────────────────────────
 * The inject block is assembled FIELD-BY-FIELD from the three builders. It does
 * NOT call/spread `buildUserInsightProfile` or R5's `buildFeatureContext`, and
 * does NOT import from `insight.service` at all — both carry R2 face substance
 * (`faceArchetype`/`faceTraits`/`faceShape`). Face is therefore STRUCTURALLY
 * ABSENT by construction (never included, not filtered-after): none of the
 * payload types below can even represent a face field, and the compile-time
 * `_faceAbsence*` assertions fail the build if a face key ever appears. R9 is
 * face-free (Play Store reclassification, spec §1); this is the build-time
 * counterpart to the §8 runtime "zero face-derived content" QA gate.
 *
 * ── NODE-SIDE VALIDATION (charter §14 step 5 / prompt §3 pre-use checks) ───────
 * Each builder validates its payload BEFORE returning (the same invariants the
 * prompt tells the model to check in Mode B, done in Node so a bad payload never
 * reaches Fable). A failure throws `ReportInjectValidationError` — step 5b routes
 * it to the worker's failure path (no bad report, no credit spent). These are the
 * same engine invariants steps 1-2 already proved; 5a gates the payload on them.
 *
 * ── S-R9j: inject the FULL derived set (astronomy finding-C analog) ───────────
 * The prompt §3 `ASTRONOMY_JSON` schema (:77-88) enumerates only raw longitudes +
 * ingress tuples, and §3 item "Derived quantities" (:92-100) still says the model
 * should *compute* nakshatra/pada/D9/houses/dignities/dasha/panchanga/yogas/
 * transits. Per the S-R9j working decision (sid-signoff.md) we INJECT the full
 * derived set (the isolated sidereal engine already computes it deterministically
 * in steps 1a-1d) under a `derived` slot, so the model CONSUMES rather than
 * recomputes — belt-and-braces regardless of whether the optional prompt tweak
 * lands (this module does NOT edit the prompt; that is a separate Sid-gated
 * owner-action). The QA gate (step 7) validates no divergence.
 */
import * as swe from 'sweph';
import {
  NatalChartInput,
  toJulianDayUT,
  computeBodyPosition,
  norm360,
} from './astrology.service';
import {
  computeSiderealChart,
  computeSiderealTransits,
  SiderealChart,
  SiderealAngle,
  SiderealPosition,
  SiderealBody,
  DignityInfo,
  YogaAnalysis,
  WesternDignity,
  VimshottariDasha,
  Panchanga,
  SignIngress,
  SadeSatiWindow,
  PlanetaryReturn,
  JupiterPass,
} from './astrology-sidereal.service';
import {
  getLifePathNumber,
  getLifePathDetail,
  getMaturityNumber,
  getBirthdayNumber,
  getMulank,
  getBhagyank,
  getPersonalYearSeries,
  isMasterNumber,
} from '../utils/numerology';
import {
  computePythagoreanTrioDetail,
  computeChaldeanCompound,
  pythagoreanLetterValues,
  chaldeanLetterValues,
} from '../utils/nameNumerology';
import { PalmProfileResult, PalmTrait, PalmTypeClass, ZodiacSign } from '../types/shared';

const C = swe.constants;

// Tropical overlay flags — mirror the sidereal engine's TROP flags EXACTLY so the
// builder's independent tropical positions cannot drift from the engine's frame.
// (No SEFLG_SIDEREAL → the ayanamsa is never applied regardless of the process-
// global sid mode, so these are correct + isolation-safe outside any critical
// section.)
const TROP_PLANET_FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SPEED;
const TROP_HOUSE_FLAGS = C.SEFLG_MOSEPH;

/** sweph body ids for the tropical overlay (mean node primary + true node). */
const TROP_BODY_IDS = {
  sun: C.SE_SUN,
  moon: C.SE_MOON,
  mercury: C.SE_MERCURY,
  venus: C.SE_VENUS,
  mars: C.SE_MARS,
  jupiter: C.SE_JUPITER,
  saturn: C.SE_SATURN,
  rahu_mean: C.SE_MEAN_NODE,
  rahu_true: C.SE_TRUE_NODE,
} as const;

/**
 * `PalmTypeClass` → the "X Hand" display string. Defined LOCALLY (a 4-entry
 * closed-set display map) rather than imported from `insight.service`, so this
 * module's import graph stays free of `buildUserInsightProfile`/face substance
 * (the allow-list proof). Kept in sync with `insight.service`'s copy by the
 * TOTAL-over-the-closed-set type (a new PalmTypeClass would fail to compile here).
 */
const PALM_TYPE_DISPLAY: Record<PalmTypeClass, string> = {
  earth: 'Earth Hand',
  air: 'Air Hand',
  water: 'Water Hand',
  fire: 'Fire Hand',
};

/** Angular gap tolerances for the astronomy validation (degrees). */
const RAHU_KETU_TOL = 0.01; // Rahu/Ketu must differ by 180.000° (they are Rahu+180)
const SID_TROP_TOL = 0.02; // sidereal + ayanamsa = tropical within 0.02° (prompt §3 :90)

// ===========================================================================
// Typed validation error — step 5b routes this to the worker failure path.
// ===========================================================================

/** Thrown by a builder when its Node-side pre-use validation fails. */
export class ReportInjectValidationError extends Error {
  readonly payload: 'astronomy' | 'numerology';
  constructor(payload: 'astronomy' | 'numerology', message: string) {
    super(`[report-inject:${payload}] ${message}`);
    this.name = 'ReportInjectValidationError';
    this.payload = payload;
  }
}

// ===========================================================================
// Output types — SERVER-ONLY (never a mobile DTO; never leaves the server).
// Face fields are UN-REPRESENTABLE by construction (no face key anywhere).
// ===========================================================================

/** Ecliptic longitudes (decimal degrees 0..360) per body + angles for one zodiac. */
export interface BodyLongitudes {
  asc: number | null;
  mc: number | null;
  sun: number;
  moon: number;
  mercury: number;
  venus: number;
  mars: number;
  jupiter: number;
  saturn: number;
  rahu_mean: number;
  rahu_true: number;
}

/** `ASTRONOMY_JSON` (prompt §3 :77-88) + the full injected derived set (S-R9j). */
export interface ReportAstronomyPayload {
  // ── Base schema (prompt §3 :77-88) — a reviewer can paste these slots as-is ──
  birth: { jd_ut: number; ayanamsa: number };
  sidereal: BodyLongitudes & { speeds: Record<string, number> };
  tropical: BodyLongitudes;
  ingresses: {
    saturn: [string, string][];
    jupiter: [string, string][];
    rahu_mean: [string, string][];
  };
  // ── Injected derived set (S-R9j) — the engine computes it; the model consumes ─
  derived: {
    ayanamsaStr: string; // 4-decimal (prompt §3)
    settings: {
      ayanamsaMode: 'lahiri';
      ephemeris: 'moshier';
      nodeType: 'mean';
      houseSystem: 'whole-sign';
      vimshottariYearDays: 365.25;
    };
    timeKnown: boolean;
    positions: SiderealPosition[]; // 9 grahas: sign/dms/nakshatra/pada/lord/D9/houses(both)/retro/stationary
    ascendant: SiderealChart['ascendant']; // sidereal Asc + nakshatra/pada/D9 (null if no time)
    midheaven: SiderealAngle | null;
    trueNode: SiderealAngle | null; // footnote-able (prompt §3)
    houses: {
      sidereal: ZodiacSign[] | null; // house 1..12 → sign
      tropical: ZodiacSign[] | null;
      bothZodiacAgreement: number | null; // Part I count (prompt §3 item 3)
    };
    dignities: DignityInfo[]; // Vedic sidereal dignity + combustion (+ escape margin)
    yogas: YogaAnalysis; // named combinations + dhana support
    westernDignities: WesternDignity[]; // Western TROPICAL frame (distinct, labelled)
    dasha: VimshottariDasha; // full MD ladder WITH antardashas + current MD-AD
    panchanga: Panchanga; // tithi/yoga/vara incl. strict sunrise-vara
    transits: {
      horizonYears: number;
      asOf: string;
      scanFrom: string;
      scanTo: string;
      ingresses: { saturn: SignIngress[]; jupiter: SignIngress[]; rahu: SignIngress[] };
      sadeSati: SadeSatiWindow[];
      returns: PlanetaryReturn[];
      jupiterPasses: JupiterPass[];
    };
  };
}

/** One reduced numerology value with its pre-reduction compound + master flag. */
export interface CompoundReduced {
  compound: number;
  reduced: number;
  isMaster: boolean;
}

/** `NUMEROLOGY_JSON` (prompt §3 :106-127) — exact schema key-for-key. */
export interface ReportNumerologyPayload {
  name_at_birth: string;
  current_name?: string; // optional adopted overlay (string per schema :108)
  letter_values: {
    pythagorean: [string, number][];
    chaldean: [string, number][];
  };
  expression: CompoundReduced;
  soul_urge: CompoundReduced;
  personality: CompoundReduced;
  life_path: { compound: number; intermediate: number; reduced: number; isMaster: boolean };
  maturity: CompoundReduced;
  birthday: { value: number; reduced: number; isMaster: boolean };
  mulank: { value: number; planet: string };
  bhagyank: {
    compound: number;
    intermediate: number;
    reduced: number;
    isMaster: boolean;
    planet: string;
  };
  chaldean: {
    full_name: CompoundReduced;
    components: Array<{ label: string; compound: number; reduced: number; isMaster: boolean }>;
  };
  personal_years: Array<{ year: number; value: number; isMaster: boolean }>;
}

/**
 * `PALM_OBSERVATIONS` (prompt §5). SELF ONLY — the R3 stored trait layer, never
 * fresh pixels, never a third party (BIPA). When no palm is on file, `available`
 * is false and the Hand layer is omitted (the prompt tolerates an empty palm).
 */
export interface ReportPalmPayload {
  available: boolean;
  handType?: string; // "Earth Hand" etc.
  energyType?: string;
  lifeTheme?: string;
  naturalTalents?: string[];
  dominantTraits?: Array<{ trait: string; band: string; description?: string }>;
  nonDominantTraits?: Array<{ trait: string; band: string; description?: string }>; // premium only
  note: string; // hedging sentence / no-data marker
}

/** Stored palm data (self) the caller passes in — the builder reads, never fetches. */
export interface StoredPalmInput {
  palmProfileResult?: PalmProfileResult | null;
  palmDominantTraits?: PalmTrait[] | null;
  palmNonDominantTraits?: PalmTrait[] | null; // premium-only, self
}

/** The assembled inject block (server-only). Face is un-representable here. */
export interface ReportInjectPayload {
  subject: 'self'; // v1 self-only (D4); `other` is Phase D, not built here
  astronomy: ReportAstronomyPayload;
  numerology: ReportNumerologyPayload;
  palm: ReportPalmPayload;
}

// ===========================================================================
// STRUCTURAL FACE-ABSENCE — compile-time proof (charter §14 step 5 / 12c-audit A)
// The build FAILS if a face key ever appears at a payload's top level. Combined
// with the explicit sub-types (none expose face) + the grep-clean import graph
// (no buildUserInsightProfile / buildFeatureContext / insight.service), face is
// structurally absent, not filtered-after.
// ===========================================================================
type ForbiddenFaceKey =
  | 'face'
  | 'faceArchetype'
  | 'faceArchetypeTagline'
  | 'faceTraits'
  | 'faceShape'
  | 'faceScores'
  | 'faceFeatures';
// Resolves to `true` when the type has NO face key; to `never` (assigning `true`
// → a compile error) the moment a face key appears.
type AssertNoFaceKeys<T> = Extract<keyof T, ForbiddenFaceKey> extends never ? true : never;

const _faceAbsence: [
  AssertNoFaceKeys<ReportInjectPayload>,
  AssertNoFaceKeys<ReportAstronomyPayload>,
  AssertNoFaceKeys<ReportNumerologyPayload>,
  AssertNoFaceKeys<ReportPalmPayload>,
] = [true, true, true, true];
void _faceAbsence;

// ===========================================================================
// Shared helpers.
// ===========================================================================

/** Shorter-arc angular separation between two ecliptic longitudes, in degrees. */
function angularDiff(a: number, b: number): number {
  let d = Math.abs(norm360(a) - norm360(b)) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/** A finite longitude in [0, 360)? (payload-integrity gate — catches NaN/garbage.) */
function inRange(v: number | null): boolean {
  return v === null || (Number.isFinite(v) && v >= 0 && v < 360);
}

// ===========================================================================
// buildAstronomyJson — ASTRONOMY_JSON + the full injected derived set (S-R9j).
// ===========================================================================

/**
 * Compute the tropical overlay INDEPENDENTLY (a separate non-sidereal sweph call
 * per body + tropical whole-sign Asc/MC), mirroring the sidereal engine's own
 * internal `trop` computation. Independent (not derived from sidereal+ayanamsa)
 * so the `sidereal + ayanamsa = tropical` validation is a genuine cross-check,
 * not a tautology.
 */
function computeTropicalOverlay(input: NatalChartInput): {
  bodies: Record<keyof typeof TROP_BODY_IDS | 'ketu', number>;
  asc: number | null;
  mc: number | null;
} {
  const jd = toJulianDayUT(input);
  const bodies = {} as Record<keyof typeof TROP_BODY_IDS | 'ketu', number>;
  (Object.keys(TROP_BODY_IDS) as (keyof typeof TROP_BODY_IDS)[]).forEach((key) => {
    const p = computeBodyPosition(jd, TROP_BODY_IDS[key], TROP_PLANET_FLAGS);
    bodies[key] = p ? p.longitude : 0;
  });
  bodies.ketu = norm360(bodies.rahu_mean + 180);

  const hasCoords = typeof input.lat === 'number' && typeof input.lng === 'number';
  const timeKnown = !input.timeIsAssumed && !!(input.time && input.time.trim());
  const housesAvailable = timeKnown && hasCoords && !!input.timezone;

  let asc: number | null = null;
  let mc: number | null = null;
  if (housesAvailable) {
    const h = swe.houses_ex(jd, TROP_HOUSE_FLAGS, input.lat as number, input.lng as number, 'W');
    if (h.data && h.data.points) {
      asc = norm360(h.data.points[0]);
      mc = norm360(h.data.points[1]);
    }
  }
  return { bodies, asc, mc };
}

/**
 * Build `ASTRONOMY_JSON` for a birth. Source = `computeSiderealChart` (positional
 * + dasha + panchanga + dignities + yogas, steps 1a-1c) + `computeSiderealTransits`
 * (ingress/Sade-Sati/returns, step 1d) + an independent tropical overlay. Injects
 * the full derived set (S-R9j). ASYNC (the transit scan is async by contract).
 * Validates before returning (throws `ReportInjectValidationError` on failure).
 *
 * @param asOf reference "now" for the dasha `current` + the transit horizon. The
 *   offline harness passes the sample's generation date to reproduce Appendix B.
 */
export async function buildAstronomyJson(
  input: NatalChartInput,
  asOf: Date = new Date()
): Promise<ReportAstronomyPayload> {
  const chart = computeSiderealChart(input); // sync, owns the set_sid_mode lifecycle
  const transits = await computeSiderealTransits(input, chart, asOf);
  const trop = computeTropicalOverlay(input);

  const byBody = new Map(chart.positions.map((p) => [p.body, p]));
  const sl = (b: SiderealBody): number => byBody.get(b)!.longitude;
  const sp = (b: SiderealBody): number => byBody.get(b)!.speed;

  const payload: ReportAstronomyPayload = {
    birth: { jd_ut: toJulianDayUT(input), ayanamsa: chart.ayanamsa },
    sidereal: {
      asc: chart.ascendant ? chart.ascendant.longitude : null,
      mc: chart.midheaven ? chart.midheaven.longitude : null,
      sun: sl('sun'),
      moon: sl('moon'),
      mercury: sl('mercury'),
      venus: sl('venus'),
      mars: sl('mars'),
      jupiter: sl('jupiter'),
      saturn: sl('saturn'),
      rahu_mean: sl('rahu'),
      rahu_true: chart.trueNode ? chart.trueNode.longitude : sl('rahu'),
      speeds: {
        sun: sp('sun'),
        moon: sp('moon'),
        mercury: sp('mercury'),
        venus: sp('venus'),
        mars: sp('mars'),
        jupiter: sp('jupiter'),
        saturn: sp('saturn'),
        rahu_mean: sp('rahu'),
        ketu: sp('ketu'),
      },
    },
    tropical: {
      asc: trop.asc,
      mc: trop.mc,
      sun: trop.bodies.sun,
      moon: trop.bodies.moon,
      mercury: trop.bodies.mercury,
      venus: trop.bodies.venus,
      mars: trop.bodies.mars,
      jupiter: trop.bodies.jupiter,
      saturn: trop.bodies.saturn,
      rahu_mean: trop.bodies.rahu_mean,
      rahu_true: trop.bodies.rahu_true,
    },
    ingresses: {
      saturn: transits.ingresses.saturn.map((i) => [i.date, i.sign] as [string, string]),
      jupiter: transits.ingresses.jupiter.map((i) => [i.date, i.sign] as [string, string]),
      rahu_mean: transits.ingresses.rahu.map((i) => [i.date, i.sign] as [string, string]),
    },
    derived: {
      ayanamsaStr: chart.ayanamsaStr,
      settings: {
        ayanamsaMode: chart.ayanamsaMode,
        ephemeris: chart.ephemeris,
        nodeType: chart.nodeType,
        houseSystem: chart.houseSystem,
        vimshottariYearDays: 365.25,
      },
      timeKnown: chart.timeKnown,
      positions: chart.positions,
      ascendant: chart.ascendant,
      midheaven: chart.midheaven,
      trueNode: chart.trueNode,
      houses: {
        sidereal: chart.siderealHouses,
        tropical: chart.tropicalHouses,
        bothZodiacAgreement: chart.bothZodiacHouseAgreement,
      },
      dignities: chart.dignities,
      yogas: chart.yogas,
      westernDignities: chart.westernDignities,
      dasha: chart.dasha,
      panchanga: chart.panchanga,
      transits: {
        horizonYears: transits.horizonYears,
        asOf: transits.asOf,
        scanFrom: transits.scanFrom,
        scanTo: transits.scanTo,
        ingresses: transits.ingresses,
        sadeSati: transits.sadeSati,
        returns: transits.returns,
        jupiterPasses: transits.jupiterPasses,
      },
    },
  };

  validateAstronomyPayload(payload);
  return payload;
}

/**
 * Node-side pre-use validation (prompt §3 :90) — the SAME checks the model would
 * run in Mode B, so a bad payload never reaches Fable. Throws on any failure.
 * Exported so the offline harness (and step 7's QA gate) can exercise it against
 * a deliberately-broken payload.
 */
export function validateAstronomyPayload(p: ReportAstronomyPayload): void {
  const fail = (m: string): never => {
    throw new ReportInjectValidationError('astronomy', m);
  };

  // (0) Payload integrity — every longitude finite ∈ [0,360) (catches NaN/garbage,
  //     and covers the "ascendant plausible for the time of day" numeric floor:
  //     the engine already validated the Asc to the arc-minute in step 1a).
  const nums: Array<[string, number | null]> = [
    ['sidereal.asc', p.sidereal.asc],
    ['sidereal.mc', p.sidereal.mc],
    ['tropical.asc', p.tropical.asc],
    ['tropical.mc', p.tropical.mc],
  ];
  (['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'rahu_mean', 'rahu_true'] as const).forEach(
    (b) => {
      nums.push([`sidereal.${b}`, p.sidereal[b]]);
      nums.push([`tropical.${b}`, p.tropical[b]]);
    }
  );
  for (const [label, v] of nums) {
    if (!inRange(v)) fail(`${label} is not a finite longitude in [0,360): ${v}`);
  }
  if (!Number.isFinite(p.birth.ayanamsa)) fail(`ayanamsa is not finite: ${p.birth.ayanamsa}`);

  // (1) Rahu and Ketu differ by 180.000° (Ketu is the derived opposition point).
  const ketu = p.derived.positions.find((x) => x.body === 'ketu');
  if (!ketu) fail('Ketu missing from derived positions');
  const rahuKetu = angularDiff(p.sidereal.rahu_mean, (ketu as SiderealPosition).longitude);
  if (Math.abs(rahuKetu - 180) > RAHU_KETU_TOL) {
    fail(`Rahu/Ketu separation ${rahuKetu.toFixed(4)}° differs from 180° by more than ${RAHU_KETU_TOL}°`);
  }

  // (2) sidereal + ayanamsa = tropical within 0.02° for every body + angles.
  const bodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'rahu_mean', 'rahu_true'] as const;
  for (const b of bodies) {
    const diff = angularDiff(p.sidereal[b] + p.birth.ayanamsa, p.tropical[b]);
    if (diff > SID_TROP_TOL) {
      fail(`${b}: sidereal+ayanamsa vs tropical differ by ${diff.toFixed(4)}° (> ${SID_TROP_TOL}°)`);
    }
  }
  if (p.sidereal.asc !== null && p.tropical.asc !== null) {
    const diff = angularDiff(p.sidereal.asc + p.birth.ayanamsa, p.tropical.asc);
    if (diff > SID_TROP_TOL) fail(`asc: sidereal+ayanamsa vs tropical differ by ${diff.toFixed(4)}°`);
  }
}

// ===========================================================================
// buildNumerologyJson — NUMEROLOGY_JSON (prompt §3 :106-127), from the utils.
// ===========================================================================

/** Component label for a Chaldean name-part compound (first / middle / surname). */
function componentLabel(index: number, total: number): string {
  if (index === 0) return 'first name';
  if (index === total - 1) return 'surname';
  return 'middle name';
}

/**
 * Build `NUMEROLOGY_JSON`. Every value comes from the step-2 utils (Y-as-vowel
 * 2.0.0 path) — NEVER recomputed inline. Compute-once-and-inject (D1): the report
 * cannot diverge from the Numerology tab. Validates before returning.
 *
 * @param currentYear anchor for the personal-year series (current + next two);
 *   defaults to the current UTC year. The harness passes the sample's year.
 */
export function buildNumerologyJson(
  nameAtBirth: string,
  dob: Date,
  currentName?: string,
  currentYear: number = new Date().getUTCFullYear()
): ReportNumerologyPayload {
  const trio = computePythagoreanTrioDetail(nameAtBirth);
  const lp = getLifePathDetail(dob);

  // Maturity = Life Path (master-preserving) + Expression, reduced (prompt §4).
  const expressionReduced = trio.expression.reduced;
  const lifePathValue = getLifePathNumber(dob); // === lp.intermediate (harness-asserted)
  const maturityReduced = getMaturityNumber(lifePathValue, expressionReduced);
  const maturityCompound = lifePathValue + expressionReduced;

  const birthday = getBirthdayNumber(dob);
  const mulank = getMulank(dob);
  const bhagyank = getBhagyank(dob);
  const chaldeanFull = computeChaldeanCompound(nameAtBirth);

  // Chaldean component compounds (first / middle / surname) — the model surfaces
  // the first-name/master-carrying ones (prompt §4). Only when the name splits.
  const parts = nameAtBirth.trim().split(/\s+/).filter(Boolean);
  const components =
    parts.length > 1
      ? parts.map((part, i) => {
          const c = computeChaldeanCompound(part);
          return { label: componentLabel(i, parts.length), compound: c.compound, reduced: c.reduced, isMaster: c.isMaster };
        })
      : [];

  const personalYears = getPersonalYearSeries(dob, currentYear, 3).map((y) => ({
    year: y.year,
    value: y.value,
    isMaster: isMasterNumber(y.value),
  }));

  const payload: ReportNumerologyPayload = {
    name_at_birth: nameAtBirth,
    ...(currentName && currentName.trim() ? { current_name: currentName.trim() } : {}),
    letter_values: {
      pythagorean: pythagoreanLetterValues(nameAtBirth),
      chaldean: chaldeanLetterValues(nameAtBirth),
    },
    expression: trio.expression,
    soul_urge: trio.soulUrge,
    personality: trio.personality,
    life_path: { compound: lp.compound, intermediate: lp.intermediate, reduced: lp.reduced, isMaster: lp.isMaster },
    maturity: { compound: maturityCompound, reduced: maturityReduced, isMaster: isMasterNumber(maturityReduced) },
    birthday: { value: birthday.day, reduced: birthday.reduced, isMaster: birthday.isMaster },
    mulank: { value: mulank.reduced, planet: mulank.planet },
    bhagyank: {
      compound: bhagyank.compound,
      intermediate: bhagyank.reduced, // master-preserving total before final resolution
      reduced: bhagyank.finalDigit, // fully resolved 1-9 (the planet-map key)
      isMaster: isMasterNumber(bhagyank.reduced),
      planet: bhagyank.planet,
    },
    chaldean: { full_name: chaldeanFull, components },
    personal_years: personalYears,
  };

  validateNumerologyPayload(payload);
  return payload;
}

/**
 * Node-side pre-use validation (prompt §3 :130). Throws on any failure. Exported
 * so the harness (and step 7) can feed it a deliberately-broken payload.
 */
export function validateNumerologyPayload(p: ReportNumerologyPayload): void {
  const fail = (m: string): never => {
    throw new ReportInjectValidationError('numerology', m);
  };

  // (1) Soul Urge + Personality = Expression. Checked on COMPOUND totals (the
  //     robust identity: vowel-sum + consonant-sum = all-letter-sum). The reduced
  //     form of the identity breaks under master preservation (see 2a's harness
  //     note), so the compound identity is the correct gate — and it catches a
  //     vowel/consonant mis-classification, which is the real failure mode.
  if (p.soul_urge.compound + p.personality.compound !== p.expression.compound) {
    fail(
      `Soul Urge (${p.soul_urge.compound}) + Personality (${p.personality.compound}) ` +
        `!= Expression (${p.expression.compound})`
    );
  }

  // (2) Every reduced value is a single digit UNLESS flagged isMaster (11/22[/33]).
  const singleDigitOrMaster = (label: string, reduced: number, isMaster: boolean): void => {
    const ok = isMaster ? isMasterNumber(reduced) : reduced >= 1 && reduced <= 9;
    if (!ok) fail(`${label} reduced=${reduced} isMaster=${isMaster} violates the single-digit-unless-master rule`);
  };
  singleDigitOrMaster('expression', p.expression.reduced, p.expression.isMaster);
  singleDigitOrMaster('soul_urge', p.soul_urge.reduced, p.soul_urge.isMaster);
  singleDigitOrMaster('personality', p.personality.reduced, p.personality.isMaster);
  singleDigitOrMaster('life_path', p.life_path.reduced, p.life_path.isMaster);
  singleDigitOrMaster('maturity', p.maturity.reduced, p.maturity.isMaster);
  singleDigitOrMaster('birthday', p.birthday.reduced, p.birthday.isMaster);
  p.personal_years.forEach((y) => singleDigitOrMaster(`personal_year ${y.year}`, y.value, y.isMaster));

  // (3) Bhagyank: the intermediate preserves any master before the final reduction;
  //     the final `reduced` (planet-map key) is a single digit 1-9.
  if (p.bhagyank.isMaster && !isMasterNumber(p.bhagyank.intermediate)) {
    fail(`bhagyank isMaster but intermediate=${p.bhagyank.intermediate} is not a master`);
  }
  if (p.bhagyank.reduced < 1 || p.bhagyank.reduced > 9) {
    fail(`bhagyank final reduced=${p.bhagyank.reduced} is not a single digit 1-9`);
  }

  // (4) Personal Years cover the current calendar year + the next two (consecutive).
  if (p.personal_years.length !== 3) fail(`personal_years must have 3 entries, got ${p.personal_years.length}`);
  for (let i = 1; i < p.personal_years.length; i++) {
    if (p.personal_years[i].year !== p.personal_years[i - 1].year + 1) {
      fail('personal_years must be three consecutive calendar years');
    }
  }
}

// ===========================================================================
// buildPalmObservations — PALM_OBSERVATIONS (prompt §5). SELF ONLY.
// ===========================================================================

const PALM_HEDGE_NOTE =
  'Palm observations are limited to the major lines, mounts, finger architecture, ' +
  'and the left-right comparison; finer markings are below photographic confidence ' +
  'and are not claimed. Each observation corroborates a computed chart feature, ' +
  'never stands as independent proof.';

/**
 * Build `PALM_OBSERVATIONS` from the R3 stored trait layer (self only). No fresh
 * pixels, no third party. Reads the data the caller already loaded (no DB call);
 * when no palm profile is on file, returns an explicit no-data marker (the prompt
 * tolerates an empty palm layer) — never fabricates.
 */
export function buildPalmObservations(palm: StoredPalmInput): ReportPalmPayload {
  const profile = palm.palmProfileResult;
  if (!profile) {
    return {
      available: false,
      note: 'No palm data on file for this subject; the Hand layer (Part VII layer two) is omitted.',
    };
  }

  const mapTraits = (traits?: PalmTrait[] | null) =>
    (traits ?? []).map((t) => ({ trait: t.trait, band: t.band, description: t.description }));

  const nonDominant = palm.palmNonDominantTraits && palm.palmNonDominantTraits.length
    ? mapTraits(palm.palmNonDominantTraits)
    : undefined;

  return {
    available: true,
    handType: PALM_TYPE_DISPLAY[profile.palmType],
    energyType: profile.energyType,
    lifeTheme: profile.lifeTheme,
    naturalTalents: profile.naturalTalents,
    dominantTraits: mapTraits(palm.palmDominantTraits),
    nonDominantTraits: nonDominant,
    note: PALM_HEDGE_NOTE,
  };
}

// ===========================================================================
// buildReportInjectPayload — the EXPLICIT ALLOW-LIST assembler (charter §14 step 5).
// Field-by-field from the three builders. NEVER buildUserInsightProfile /
// buildFeatureContext / a UserInsightProfile dump. Face is structurally absent.
// ===========================================================================

export interface BuildReportInjectArgs {
  input: NatalChartInput; // self birth data (UserProfile.birthData)
  nameAtBirth: string;
  dob: Date;
  currentName?: string;
  palm?: StoredPalmInput; // self stored trait layer (omit → no-palm marker)
  asOf?: Date; // report-generation "now" (defaults to now)
  currentYear?: number; // personal-year anchor (defaults to asOf's UTC year)
}

/**
 * Assemble the full inject block for a SELF report. Awaits the astronomy builder
 * (the transit scan is async), builds numerology + palm synchronously, and
 * returns the field-by-field allow-listed payload. Any builder validation failure
 * propagates as `ReportInjectValidationError` (step 5b → worker failure path).
 */
export async function buildReportInjectPayload(
  args: BuildReportInjectArgs
): Promise<ReportInjectPayload> {
  const asOf = args.asOf ?? new Date();
  const currentYear = args.currentYear ?? asOf.getUTCFullYear();

  const astronomy = await buildAstronomyJson(args.input, asOf);
  const numerology = buildNumerologyJson(args.nameAtBirth, args.dob, args.currentName, currentYear);
  const palm = buildPalmObservations(args.palm ?? {});

  return { subject: 'self', astronomy, numerology, palm };
}
