/**
 * Isolated sidereal engine module — R9 Personalized Cosmic Report (Build 27).
 *
 * R1's `astrology.service.ts` produces a TROPICAL / Placidus / true-node natal
 * chart. The Cosmic Report additionally needs a **Lahiri-sidereal, whole-sign,
 * mean-node** layer (Vedic). This module lands the POSITIONAL layer of that
 * engine (charter §14 step 1a): sidereal positions for the nine grahas + Asc/MC,
 * whole-sign houses in BOTH zodiacs, nakshatra/pada, and the D9 navamsa sign.
 *
 * It COMPOSES R1's primitives (`toJulianDayUT` / `computeBodyPosition` /
 * `swe.houses_ex`) — it does NOT duplicate ephemeris logic and does NOT touch
 * R1's tropical natal path or its output shape.
 *
 * Charter §14 step 1b adds the two natal-luminary-derived TIMING layers as PURE
 * arithmetic over the positional layer's sidereal luminaries (NO new ephemeris
 * calls, NO `set_sid_mode` — they run OUTSIDE the critical section, so they add
 * no isolation concern): the **Vimshottari dasha ladder** (`computeVimshottariDasha`,
 * off the sidereal Moon's nakshatra) and the **panchanga** (`computePanchanga`,
 * off Moon−Sun / Moon+Sun). Step 1c adds the classical STRENGTH layer
 * (dignities/combustion, yogas, Western tropical dignities) as pure rules over
 * 1a's positions. Karana is intentionally NOT emitted (see the `Panchanga` doc).
 *
 * Charter §14 step 1d adds the FORWARD-TRANSIT layer and closes the strict
 * sunrise-vara deferral:
 *   - `computeSiderealTransits` (ASYNC) — sidereal sign-ingress tables (Saturn
 *     across the ~30-year forecast horizon; Jupiter + mean Rahu forward), Sade
 *     Sati windows (Saturn over the 12th/1st/2nd signs from the natal Moon),
 *     planetary returns (Saturn / Jupiter / nodal), and transit-Jupiter passes
 *     over the natal stellium / lagna / Moon. Unlike 1a's natal snapshot this
 *     SCANS positions across decades (thousands of ephemeris calls).
 *   - the strict sunrise-vara (`computeStrictVara`, folded into `computePanchanga`):
 *     local sunrise via `swe.rise_trans` (a physical-event call, ayanamsa-
 *     independent — needs no sidereal mode); a birth BEFORE local sunrise takes
 *     the PREVIOUS weekday as its strict Vedic vara (the civil value is retained).
 *
 * ── Why the transit SCAN does NOT hold a long sidereal critical section ──
 * The scan derives each sidereal longitude as `tropical − Lahiri ayanamsa`
 * (R1's native tropical frame minus the interpolated ayanamsa) — which is the
 * generation prompt's OWN Mode-B validation identity ("sidereal + ayanamsa =
 * tropical within 0.02°"; measured max deviation here ≈ 0.005°, i.e. sub-day at
 * any 30° sign boundary). The ONLY sidereal-mode use is a tiny SYNCHRONOUS
 * section that samples the ayanamsa at yearly nodes (linear-interpolation error
 * ≪ 0.001″) under 1a's set→sample→reset discipline. The long multi-decade march
 * then runs ENTIRELY in the tropical frame with NO `set_sid_mode`, so it (a)
 * never holds the process-global sidereal mode across its duration and (b) is
 * free to `await` — it yields to the event loop every few hundred calls. This is
 * charter §14's mitigation (b): it eliminates the ~70–115 ms event-loop BLOCK a
 * single fully-synchronous sidereal-mode scan would impose on the shared live
 * backend (measured on this box; see the step-1d harness), reducing the longest
 * continuous synchronous slice to one yield window (~7 ms). See
 * `computeSiderealTransits`.
 *
 * Fixed astronomy settings are taken from the committed generation prompt §3
 * (folded into R9-report.md §0.2.C), never from memory:
 *   - Sidereal mode: Lahiri (Chitrapaksheeya); ayanamsa printed to 4 decimals.
 *   - Houses: whole sign ('W'), BOTH zodiacs.
 *   - Nodes: MEAN node primary (true node computed + footnoted); Ketu = Rahu+180.
 *   - Ephemeris: Moshier (SEFLG_MOSEPH) + SEFLG_SPEED (retro/stationary).
 *   - Nakshatra n = floor(lon/(360/27)); pada = floor(remainder/(360/108))+1;
 *     lord cycle from Ashwini: Ketu,Venus,Sun,Moon,Mars,Rahu,Jupiter,Saturn,Mercury.
 *   - Navamsa (D9): 3°20' advance; start Aries[fire]/Capricorn[earth]/Libra[air]/Cancer[water].
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ISOLATION INVARIANT (concurrency-safety contract for step 4's job runner):
 *
 *   `swe.set_sid_mode(...)` is PROCESS-GLOBAL on the shared `sweph` instance that
 *   also serves R1's tropical consumers. This module owns that lifecycle inside a
 *   **fully SYNCHRONOUS critical section**: every input (JD, lat/lng, tropical
 *   overlay) is resolved BEFORE the section; the section then does
 *   `set sidereal → compute → RESET` with **NO `await` between the set and the
 *   reset**, wrapped in try/finally so the global mode can never leak.
 *
 *   Because sweph calls are synchronous native calls and the section contains no
 *   `await`, single-threaded Node CANNOT interleave a concurrent tropical read
 *   into sidereal mode — the sidereal compute is a pure SYNC function over
 *   pre-fetched inputs (it returns a value, not a Promise). This synchronous-
 *   section invariant is what makes the module concurrency-safe; the sequential
 *   set-then-reset alone would not prove it. If a future change ever needs I/O
 *   INSIDE the section, do NOT add an `await` here — serialize sidereal
 *   computations behind a lock instead. (Fallback recorded; not built now.)
 *
 *   R1's tropical path is additionally safe because it never sets
 *   SEFLG_SIDEREAL, so the ayanamsa is never applied to its calls regardless of
 *   the global mode; the regression guard (see `__assertTropicalUnaffected` in
 *   the offline harness) proves this empirically (byte-identical natal chart
 *   before/after a sidereal run).
 * ────────────────────────────────────────────────────────────────────────────
 */
import * as swe from 'sweph';
import {
  NatalChartInput,
  toJulianDayUT,
  computeBodyPosition,
  norm360,
  signAndDegree,
} from './astrology.service';
import { ZodiacSign } from '../types/shared';

const C = swe.constants;

// Moshier + speed, matching R1; SEFLG_SIDEREAL applies the active ayanamsa.
const SID_PLANET_FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SPEED | C.SEFLG_SIDEREAL;
const TROP_PLANET_FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SPEED;
const SID_HOUSE_FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SIDEREAL;
const TROP_HOUSE_FLAGS = C.SEFLG_MOSEPH;
// Ephemeris flag for the strict-vara sunrise (`swe.rise_trans`, step 1d) — Moshier,
// matching the engine; the rise is a physical event, ayanamsa-independent.
const RISE_EPHE_FLAGS = C.SEFLG_MOSEPH;

// The Swiss Ephemeris library default ayanamsa; used only to RESET the global
// mode after the critical section. (R1 is unaffected regardless — it never sets
// SEFLG_SIDEREAL — so this reset is belt-and-braces, not a correctness dep.)
const RESET_SID_MODE = C.SE_SIDM_FAGAN_BRADLEY;

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// 27 nakshatras from Ashwini (prompt §3).
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Vimshottari nakshatra-lord cycle from Ashwini, repeating every 9 (prompt §3).
const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
];

// Navamsa (D9) start-sign index by the graha's sign element (prompt §3):
// fire→Aries(0), earth→Capricorn(9), air→Libra(6), water→Cancer(3).
// Sign index mod 4: 0=Aries(fire),1=Taurus(earth),2=Gemini(air),3=Cancer(water)…
const NAVAMSA_START_BY_ELEMENT = [0, 9, 6, 3];

const NAK_SPAN = 360 / 27; // 13°20'
const PADA_SPAN = 360 / 108; // 3°20'
const NAVAMSA_SPAN = 30 / 9; // 3°20'

// Stationary threshold (prompt §3 item 4: "|speed| ≈ 0 → flag 'stationary'").
// The prompt gives no numeric cut-off, so this is calibrated against the sample's
// Appendix A. In the fixture Jupiter sits at |speed| ≈ 0.0148 °/day (within ~1–2
// days of its retrograde station) and IS flagged "stationary"; Saturn at |speed|
// ≈ 0.0592 °/day is flagged only "retrograde" (well into its retrograde arc). A
// 0.03 °/day cut-off sits cleanly between the two — it catches a genuine near-
// station body without false-positiving a normally-moving graha (the next-slowest
// motion in the fixture is Saturn's 0.0592, ~2× the threshold). The two nodes are
// excluded (the mean node never stations).
const STATIONARY_SPEED_THRESHOLD = 0.03;

// ── Vimshottari dasha constants (prompt §3 item 6, folded in §0.2.C) ────────
// Vimshottari year = 365.25 days (prompt §3 "Fixed settings"). Lord years sum
// to 120. The MD/AD SEQUENCE ORDER is the Vimshottari cycle, which is exactly
// the nakshatra-lord cycle 1a already uses (NAKSHATRA_LORDS) — reused verbatim.
const VIMSHOTTARI_YEAR_DAYS = 365.25;
const DASHA_TOTAL_YEARS = 120;
const DASHA_LORD_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
const DASHA_SEQUENCE = NAKSHATRA_LORDS; // Ketu,Venus,Sun,Moon,Mars,Rahu,Jupiter,Saturn,Mercury

// ── Panchanga name tables (prompt §3 item 5, folded in §0.2.C) ──────────────
// The prompt gives the tithi/yoga/vara FORMULAS; the fixed traditional NAME
// sequences (like the 27 nakshatra names 1a hardcodes) are validated against
// the sample cover panchanga line ("Shukla Navami · Shobhana yoga · Budhavara").
// Tithi 1..14 within a paksha; the 15th of Shukla = Purnima, the 15th of Krishna
// (= tithi 30) = Amavasya.
const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
  'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
  'Trayodashi', 'Chaturdashi',
];
// 27 yogas, the fixed order indexed by floor(((Moon+Sun) mod 360)/(360/27)).
const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata',
  'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];
// Vara (weekday) names indexed by the civil weekday, Sunday = 0 .. Saturday = 6.
const VARA_NAMES = [
  'Ravivara', 'Somavara', 'Mangalavara', 'Budhavara',
  'Guruvara', 'Shukravara', 'Shanivara',
];
const YOGA_SPAN = 360 / 27; // same width as a nakshatra (prompt §3 item 5)

/** The nine Vedic grahas of the sidereal positional layer. */
export type SiderealBody =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'
  | 'rahu' | 'ketu';

// Seven graha ↔ sweph body id. Rahu = MEAN node (primary, prompt §3); Ketu is
// derived (Rahu + 180), Sun–Saturn are the seven classical bodies.
const GRAHA_IDS: Record<Exclude<SiderealBody, 'ketu'>, number> = {
  sun: C.SE_SUN,
  moon: C.SE_MOON,
  mercury: C.SE_MERCURY,
  venus: C.SE_VENUS,
  mars: C.SE_MARS,
  jupiter: C.SE_JUPITER,
  saturn: C.SE_SATURN,
  rahu: C.SE_MEAN_NODE,
};

const GRAHA_ORDER: Exclude<SiderealBody, 'ketu'>[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'rahu',
];

// ---------------------------------------------------------------------------
// Pure derivations (sign / nakshatra / pada / navamsa) — no ephemeris state.
// ---------------------------------------------------------------------------

/** Zero-padded degree°minute string within the sign, e.g. "8°24'". */
function toDegreeMinute(longitude: number): string {
  const { degree } = signAndDegree(longitude);
  let d = Math.floor(degree);
  let m = Math.round((degree - d) * 60);
  if (m === 60) { m = 0; d += 1; } // carry rounding at the arc-minute boundary
  return `${d}°${String(m).padStart(2, '0')}'`;
}

/** Nakshatra + pada + Vimshottari lord for an ecliptic longitude (prompt §3). */
function nakshatraOf(longitude: number): {
  index: number; name: string; pada: number; lord: string;
} {
  const l = norm360(longitude);
  const index = Math.floor(l / NAK_SPAN); // 0..26
  const remainder = l - index * NAK_SPAN;
  const pada = Math.floor(remainder / PADA_SPAN) + 1; // 1..4
  return {
    index,
    name: NAKSHATRAS[index],
    pada,
    lord: NAKSHATRA_LORDS[index % 9],
  };
}

/** Navamsa (D9) sign for an ecliptic longitude (prompt §3). */
function navamsaSignOf(longitude: number): ZodiacSign {
  const l = norm360(longitude);
  const signIndex = Math.floor(l / 30);
  const within = l - signIndex * 30;
  const division = Math.floor(within / NAVAMSA_SPAN); // 0..8
  const start = NAVAMSA_START_BY_ELEMENT[signIndex % 4];
  return SIGNS[(start + division) % 12];
}

/** Whole-sign house (1..12) of a sign relative to the ascendant's sign. */
function wholeSignHouse(bodySignIndex: number, ascSignIndex: number): number {
  return ((bodySignIndex - ascSignIndex + 12) % 12) + 1;
}

// ---------------------------------------------------------------------------
// Output shape (server-only computed types — never a client DTO).
// ---------------------------------------------------------------------------

export interface SiderealPosition {
  body: SiderealBody;
  longitude: number; // sidereal ecliptic longitude [0,360)
  sign: ZodiacSign;
  degree: number; // within-sign degrees
  dms: string; // "8°24'"
  speed: number; // ecliptic longitude speed °/day (retro when < 0); surfaced for 1c dignities
  retrograde: boolean;
  stationary: boolean; // |speed| ≈ 0 (nodes: always false — mean node has no station)
  nakshatra: string;
  pada: number; // 1..4
  nakshatraLord: string;
  navamsaSign: ZodiacSign; // D9
  siderealHouse: number | null; // whole-sign house from the sidereal lagna
  tropicalHouse: number | null; // whole-sign house from the tropical Asc
}

export interface SiderealAngle {
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  dms: string;
}

export interface SiderealChart {
  ayanamsa: number; // Lahiri ayanamsa at birth
  ayanamsaStr: string; // to 4 decimals (prompt §3)
  ayanamsaMode: 'lahiri';
  ephemeris: 'moshier';
  nodeType: 'mean';
  houseSystem: 'whole-sign';
  timeKnown: boolean;
  positions: SiderealPosition[]; // nine grahas
  ascendant: (SiderealAngle & { nakshatra: string; pada: number; navamsaSign: ZodiacSign }) | null;
  midheaven: SiderealAngle | null; // sidereal MC (no nakshatra/D9 — matches Appendix A)
  // Whole-sign house → sign, in each zodiac (house 1 = the Asc's own sign).
  siderealHouses: ZodiacSign[] | null;
  tropicalHouses: ZodiacSign[] | null;
  // How many of the nine grahas hold the same whole-sign house in both zodiacs
  // (prompt §3 item 3; reported in Part I). Null when houses are unavailable.
  bothZodiacHouseAgreement: number | null;
  // Mean node is primary; the true node is footnote-able in Appendix A (prompt §3).
  trueNode: SiderealAngle | null;
  // Timing layers (step 1b) — pure arithmetic off the sidereal luminaries above.
  dasha: VimshottariDasha;
  panchanga: Panchanga;
  // Classical strength layer (step 1c) — pure rules over the positions above.
  dignities: DignityInfo[]; // Vedic SIDEREAL dignity + combustion, per graha (DO 1)
  yogas: YogaAnalysis; // named Vedic combinations (DO 2)
  westernDignities: WesternDignity[]; // Western TROPICAL own/exalt/debil (DO 3, distinct frame)
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Timing-layer output shapes (step 1b): Vimshottari dasha ladder + panchanga.
// Both are PURE arithmetic over the sidereal luminaries — no ephemeris calls,
// no set_sid_mode (see the ISOLATION INVARIANT header; these run OUTSIDE the
// critical section).
// ---------------------------------------------------------------------------

/** One antardasha (AD) sub-period inside a mahadasha. */
export interface AntardashaPeriod {
  mahadashaLord: string;
  lord: string; // the AD (sub-period) lord
  start: string; // ISO date "YYYY-MM-DD" (UT)
  end: string; // ISO date "YYYY-MM-DD" (UT)
  years: number; // AD length in Vimshottari years (MD years × AD-lord years / 120)
}

/** One mahadasha (MD) period in the ladder from birth. */
export interface MahadashaPeriod {
  lord: string;
  lordYears: number; // the lord's full Vimshottari allocation
  start: string; // ISO date (UT); the FIRST MD starts at birth (its balance only)
  end: string; // ISO date (UT)
  startAge: number; // floored age at start (matches the sample's age column)
  endAge: number; // floored age at end
  isBirthMahadasha: boolean; // the partial MD the subject was born inside
  antardashas: AntardashaPeriod[]; // ADs overlapping [birth, MD end]
}

/**
 * Vimshottari dasha ladder off the sidereal Moon's nakshatra (prompt §3 item 6).
 * `current` names the running MD-AD at the reference instant (report-time "now"
 * by default; the offline harness passes the sample's generation date).
 * Pratyantardasha (PD) is intentionally OMITTED (not trivially needed; the
 * cover/table only require MD-AD) — see the module header note in §14 step 1b.
 */
export interface VimshottariDasha {
  moonLongitude: number; // the sidereal Moon longitude the ladder derives from
  moonNakshatra: string;
  moonNakshatraLord: string; // = the birth mahadasha lord
  elapsedFraction: number; // fraction elapsed through the Moon's nakshatra [0,1)
  balanceYears: number; // remaining years of the birth MD = (1 − fraction) × lord-years
  birthMahadashaLord: string;
  mahadashas: MahadashaPeriod[];
  current: { mahadashaLord: string; antardashaLord: string } | null;
}

/**
 * Panchanga (prompt §3 item 5). tithi uses Moon − Sun (ayanamsa-invariant, so
 * identical in either zodiac); yoga uses Moon + Sun (NOT invariant — it shifts
 * by 2×ayanamsa, so it MUST be computed from the SIDEREAL luminaries: sidereal →
 * Shobhana [the sample], a tropical Moon+Sun would give the wrong yoga).
 *
 * `varaCivil` is the CIVIL weekday of the birth calendar date (pure, no
 * ephemeris). The STRICT Vedic sunrise-vara (the Vedic day runs sunrise→sunrise,
 * so a birth BEFORE local sunrise belongs to the PREVIOUS weekday) is computed in
 * step 1d via a real sunrise (`swe.rise_trans`, a physical-event call — see
 * `computeStrictVara`); civil is ALWAYS retained and strict differs from it ONLY
 * for pre-sunrise births (`varaDiverges`). Karana is OMITTED: the prompt lists it
 * only in the §3 "compute" list, no rendered section presents it (cover line =
 * tithi/nakshatra/rashi/lagna; appendices carry none), and the sample shows none
 * — an unpresented, sample-unvalidated quantity is pure silent-error surface, so
 * it is not emitted here (see §14 step 1b note).
 */
export interface Panchanga {
  tithiIndex: number; // 1..30 across both pakshas
  tithiInPaksha: number; // 1..15
  tithiName: string; // e.g. "Navami"
  paksha: 'Shukla' | 'Krishna';
  tithiLabel: string; // e.g. "Shukla Navami"
  yogaIndex: number; // 0..26
  yogaName: string; // e.g. "Shobhana"
  varaCivil: string; // e.g. "Budhavara"
  varaCivilWeekday: number; // 0 = Sunday .. 6 = Saturday
  // Strict Vedic sunrise-vara (step 1d). Civil is always retained above; strict
  // is the PREVIOUS weekday for a pre-sunrise birth, else equals civil.
  varaStrict: string;
  varaStrictWeekday: number; // 0 = Sunday .. 6 = Saturday
  bornBeforeSunrise: boolean;
  varaDiverges: boolean; // strict !== civil (true only for a pre-sunrise birth)
  sunriseAvailable: boolean; // false when coords are missing (strict falls back to civil)
  sunriseUT: string | null; // ISO datetime of local sunrise on the birth date (UT)
  varaNote: string; // human-readable civil-vs-strict note
}

// ---------------------------------------------------------------------------
// The sidereal positional-layer computation.
// ---------------------------------------------------------------------------

/**
 * Compute the Lahiri-sidereal positional layer for a birth.
 *
 * SYNCHRONOUS by contract (see the ISOLATION INVARIANT header). All inputs are
 * resolved before the critical section; the section itself performs only
 * synchronous sweph calls between `set_sid_mode` and its reset.
 */
export function computeSiderealChart(input: NatalChartInput): SiderealChart {
  // ── PRE-FETCH: everything resolved BEFORE the critical section ──────────
  const jd = toJulianDayUT(input);
  const hasCoords =
    typeof input.lat === 'number' && typeof input.lng === 'number';
  const timeKnown = !input.timeIsAssumed && !!(input.time && input.time.trim());
  const housesAvailable = timeKnown && hasCoords && !!input.timezone;
  const lat = input.lat as number;
  const lng = input.lng as number;

  // Tropical overlay (mean-node, matching the sample's Appendix A tropical
  // column) — needs NO sidereal mode, so computed OUTSIDE the critical section.
  const trop = computeGrahaData(jd, TROP_PLANET_FLAGS);
  const tropAscSignIndex = housesAvailable
    ? Math.floor(norm360(swe.houses_ex(jd, TROP_HOUSE_FLAGS, lat, lng, 'W').data.points[0]) / 30)
    : null;

  // ── CRITICAL SECTION: fully synchronous, no `await` between set and reset ─
  swe.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);
  let ayanamsa: number;
  let sid: Record<SiderealBody, { longitude: number; speed: number }>;
  let trueNodeLon: number | null;
  let ascLon: number | null = null;
  let mcLon: number | null = null;
  try {
    ayanamsa = swe.get_ayanamsa_ut(jd);
    sid = computeGrahaData(jd, SID_PLANET_FLAGS);
    const tn = computeBodyPosition(jd, C.SE_TRUE_NODE, SID_PLANET_FLAGS);
    trueNodeLon = tn ? tn.longitude : null;
    if (housesAvailable) {
      const h = swe.houses_ex(jd, SID_HOUSE_FLAGS, lat, lng, 'W');
      if (h.data && h.data.points) {
        ascLon = norm360(h.data.points[0]);
        mcLon = norm360(h.data.points[1]);
      }
    }
  } finally {
    // Reset the process-global mode so it can never leak to tropical consumers.
    swe.set_sid_mode(RESET_SID_MODE, 0, 0);
  }
  // ── END CRITICAL SECTION — everything below is pure assembly ─────────────

  const sidAscSignIndex = ascLon !== null ? Math.floor(ascLon / 30) : null;

  const positions: SiderealPosition[] = ([...GRAHA_ORDER, 'ketu'] as SiderealBody[]).map(
    (body) => {
      const lon = sid[body].longitude;
      const { sign, degree } = signAndDegree(lon);
      const nak = nakshatraOf(lon);
      const bodySignIndex = Math.floor(lon / 30);
      const speed = sid[body].speed;
      return {
        body,
        longitude: lon,
        sign,
        degree,
        dms: toDegreeMinute(lon),
        speed,
        retrograde: speed < 0,
        stationary:
          body === 'rahu' || body === 'ketu'
            ? false
            : Math.abs(speed) < STATIONARY_SPEED_THRESHOLD,
        nakshatra: nak.name,
        pada: nak.pada,
        nakshatraLord: nak.lord,
        navamsaSign: navamsaSignOf(lon),
        siderealHouse:
          sidAscSignIndex !== null ? wholeSignHouse(bodySignIndex, sidAscSignIndex) : null,
        tropicalHouse:
          tropAscSignIndex !== null
            ? wholeSignHouse(Math.floor(trop[body].longitude / 30), tropAscSignIndex)
            : null,
      };
    }
  );

  let ascendant: SiderealChart['ascendant'] = null;
  if (ascLon !== null) {
    const { sign, degree } = signAndDegree(ascLon);
    const nak = nakshatraOf(ascLon);
    ascendant = {
      longitude: ascLon,
      sign,
      degree,
      dms: toDegreeMinute(ascLon),
      nakshatra: nak.name,
      pada: nak.pada,
      navamsaSign: navamsaSignOf(ascLon),
    };
  }

  let midheaven: SiderealAngle | null = null;
  if (mcLon !== null) {
    const { sign, degree } = signAndDegree(mcLon);
    midheaven = { longitude: mcLon, sign, degree, dms: toDegreeMinute(mcLon) };
  }

  let trueNode: SiderealAngle | null = null;
  if (trueNodeLon !== null) {
    const { sign, degree } = signAndDegree(trueNodeLon);
    trueNode = { longitude: trueNodeLon, sign, degree, dms: toDegreeMinute(trueNodeLon) };
  }

  const siderealHouses =
    sidAscSignIndex !== null ? housesFromAsc(sidAscSignIndex) : null;
  const tropicalHouses =
    tropAscSignIndex !== null ? housesFromAsc(tropAscSignIndex) : null;

  let bothZodiacHouseAgreement: number | null = null;
  if (sidAscSignIndex !== null && tropAscSignIndex !== null) {
    bothZodiacHouseAgreement = positions.filter(
      (p) => p.siderealHouse !== null && p.siderealHouse === p.tropicalHouse
    ).length;
  }

  // Timing layers (step 1b) — PURE over the sidereal luminaries computed above;
  // no ephemeris calls, no set_sid_mode (safely outside the critical section).
  const dasha = computeVimshottariDasha(input, sid.moon.longitude);
  const panchanga = computePanchanga(
    input,
    sid.moon.longitude,
    sid.sun.longitude
  );

  // Classical strength layer (step 1c) — PURE rules over the positions computed
  // above; no ephemeris calls, no set_sid_mode (safely outside the section).
  const dignities = computeDignities(positions); // Vedic sidereal (DO 1)
  const yogas = computeYogas(positions, ascendant, dignities); // DO 2
  // Western TROPICAL own/exalt/debil off the tropical overlay already computed
  // for the whole-sign houses (byte-identical to R1's Moshier positions; NO new
  // ephemeris call). A DISTINCT, LABELED frame from the sidereal dignities above.
  const westernDignities = computeWesternDignities(
    GRAHA_ORDER.map((body) => ({
      body,
      tropicalSign: signAndDegree(trop[body].longitude).sign,
    }))
  );

  return {
    ayanamsa,
    ayanamsaStr: ayanamsa.toFixed(4),
    ayanamsaMode: 'lahiri',
    ephemeris: 'moshier',
    nodeType: 'mean',
    houseSystem: 'whole-sign',
    timeKnown,
    positions,
    ascendant,
    midheaven,
    siderealHouses,
    tropicalHouses,
    bothZodiacHouseAgreement,
    trueNode,
    dasha,
    panchanga,
    dignities,
    yogas,
    westernDignities,
    computedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers that touch sweph (called only where the sid mode is correct
// for the requested flags — sidereal helpers only inside the critical section).
// ---------------------------------------------------------------------------

/**
 * Longitude + speed of the nine grahas under `flags`. Rahu = mean node; Ketu is
 * derived (Rahu + 180, sharing Rahu's motion). With SEFLG_SIDEREAL in `flags`
 * this MUST be called inside the critical section (Lahiri mode active); without
 * it, it returns tropical longitudes.
 */
function computeGrahaData(
  jd: number,
  flags: number
): Record<SiderealBody, { longitude: number; speed: number }> {
  const out = {} as Record<SiderealBody, { longitude: number; speed: number }>;
  for (const body of GRAHA_ORDER) {
    const raw = computeBodyPosition(jd, GRAHA_IDS[body], flags);
    out[body] = raw ? { longitude: raw.longitude, speed: raw.speed } : { longitude: 0, speed: 0 };
  }
  out.ketu = { longitude: norm360(out.rahu.longitude + 180), speed: out.rahu.speed };
  return out;
}

/** House 1..12 → sign, given the ascendant's sign index (whole-sign). */
function housesFromAsc(ascSignIndex: number): ZodiacSign[] {
  return Array.from({ length: 12 }, (_, i) => SIGNS[(ascSignIndex + i) % 12]);
}

// ===========================================================================
// STEP 1b — TIMING LAYERS (pure arithmetic over the sidereal luminaries).
//
// Neither function touches sweph ephemeris state: `toJulianDayUT`/`swe.julday`
// and `swe.revjul` are calendar conversions only (no ayanamsa, no set_sid_mode),
// so both are safe to call anywhere — they carry NO isolation concern.
// ===========================================================================

/** JD (UT) → "YYYY-MM-DD" using the pure calendar conversion `revjul`. */
function jdToISODate(jd: number): string {
  const d = swe.revjul(jd, C.SE_GREG_CAL);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.year}-${pad(d.month)}-${pad(Math.floor(d.day))}`;
}

/** JD (UT) → "YYYY-MM-DDThh:mmZ" (UT) — used for the sunrise instant (step 1d).
 * `revjul` returns the day as an integer and the time-of-day in a separate `hour`
 * field (0..23.999), so the clock time comes from `d.hour`, not a day fraction. */
function jdToISODateTime(jd: number): string {
  const d = swe.revjul(jd, C.SE_GREG_CAL);
  const totalMin = Math.round(d.hour * 60);
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.year}-${pad(d.month)}-${pad(d.day)}T${pad(hh)}:${pad(mm)}Z`;
}

/** A calendar `Date` → JD (UT), the inverse used to place the "now" reference. */
function dateToJdUT(date: Date): number {
  const hour =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  return swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    hour,
    C.SE_GREG_CAL
  );
}

/**
 * Vimshottari dasha ladder off the sidereal Moon (prompt §3 item 6, §0.2.C).
 *
 * PURE over `moonLongitude` (a sidereal longitude 1a already provides) + the
 * birth instant. Reuses the module's nakshatra-lord cycle for both the birth MD
 * lord and the MD/AD sequence order (`DASHA_SEQUENCE === NAKSHATRA_LORDS`).
 *
 * @param asOf reference instant for the `current` MD-AD (defaults to now; the
 *   offline harness passes the sample's generation date to reproduce its "now").
 */
export function computeVimshottariDasha(
  input: NatalChartInput,
  moonLongitude: number,
  asOf: Date = new Date()
): VimshottariDasha {
  const birthJd = toJulianDayUT(input);
  const lon = norm360(moonLongitude);

  // Moon's nakshatra + elapsed fraction within it → birth MD lord + balance.
  const nakIndex = Math.floor(lon / NAK_SPAN);
  const withinNak = lon - nakIndex * NAK_SPAN;
  const elapsedFraction = withinNak / NAK_SPAN; // [0,1)
  const birthLord = NAKSHATRA_LORDS[nakIndex % 9];
  const birthLordYears = DASHA_LORD_YEARS[birthLord];
  const balanceYears = (1 - elapsedFraction) * birthLordYears;

  // The birth MD's TRUE (full-length) start precedes birth by the elapsed
  // portion; every later MD is full length. Lay out one full 120-year cycle
  // from the birth lord (9 MDs) — covers any plausible lifetime.
  const birthLordSeqIndex = DASHA_SEQUENCE.indexOf(birthLord);
  const fullBirthMdStartJd =
    birthJd - elapsedFraction * birthLordYears * VIMSHOTTARI_YEAR_DAYS;

  const mahadashas: MahadashaPeriod[] = [];
  let mdFullStartJd = fullBirthMdStartJd;
  let current: VimshottariDasha['current'] = null;
  const asOfJd = dateToJdUT(asOf);

  for (let i = 0; i < DASHA_SEQUENCE.length; i++) {
    const lord = DASHA_SEQUENCE[(birthLordSeqIndex + i) % DASHA_SEQUENCE.length];
    const lordYears = DASHA_LORD_YEARS[lord];
    const mdEndJd = mdFullStartJd + lordYears * VIMSHOTTARI_YEAR_DAYS;
    // The ladder entry starts at birth for the (partial) birth MD, else at the
    // MD's true start.
    const entryStartJd = Math.max(mdFullStartJd, birthJd);
    const isBirthMahadasha = i === 0;

    // Antardashas: from the MD lord, cycling; length = MD years × AD years / 120.
    // Drop ADs ending before birth; clip the birth-straddling AD's start to birth.
    const antardashas: AntardashaPeriod[] = [];
    let adStartJd = mdFullStartJd;
    for (let j = 0; j < DASHA_SEQUENCE.length; j++) {
      const adLord =
        DASHA_SEQUENCE[(DASHA_SEQUENCE.indexOf(lord) + j) % DASHA_SEQUENCE.length];
      const adYears = (lordYears * DASHA_LORD_YEARS[adLord]) / DASHA_TOTAL_YEARS;
      const adEndJd = adStartJd + adYears * VIMSHOTTARI_YEAR_DAYS;
      if (adEndJd > birthJd) {
        const clippedStartJd = Math.max(adStartJd, birthJd);
        antardashas.push({
          mahadashaLord: lord,
          lord: adLord,
          start: jdToISODate(clippedStartJd),
          end: jdToISODate(adEndJd),
          years: adYears,
        });
        // Current MD-AD: the AD (and its MD) containing the reference instant.
        if (
          current === null &&
          asOfJd >= clippedStartJd &&
          asOfJd < adEndJd &&
          asOfJd >= entryStartJd &&
          asOfJd < mdEndJd
        ) {
          current = { mahadashaLord: lord, antardashaLord: adLord };
        }
      }
      adStartJd = adEndJd;
    }

    mahadashas.push({
      lord,
      lordYears,
      start: jdToISODate(entryStartJd),
      end: jdToISODate(mdEndJd),
      startAge: Math.floor((entryStartJd - birthJd) / VIMSHOTTARI_YEAR_DAYS),
      endAge: Math.floor((mdEndJd - birthJd) / VIMSHOTTARI_YEAR_DAYS),
      isBirthMahadasha,
      antardashas,
    });

    mdFullStartJd = mdEndJd;
  }

  return {
    moonLongitude: lon,
    moonNakshatra: NAKSHATRAS[nakIndex],
    moonNakshatraLord: birthLord,
    elapsedFraction,
    balanceYears,
    birthMahadashaLord: birthLord,
    mahadashas,
    current,
  };
}

/**
 * Panchanga (prompt §3 item 5, §0.2.C).
 *
 * tithi = floor(((Moon − Sun) mod 360) / 12) + 1 (Moon − Sun is ayanamsa-
 * invariant → identical in either zodiac). yoga = floor(((Moon + Sun) mod 360)
 * / (360/27)) — Moon + Sun is NOT invariant, so this MUST use the sidereal
 * longitudes (a tropical sum shifts by 2×ayanamsa and names a different yoga).
 * These two are pure over the sidereal luminaries.
 *
 * The vara is BOTH values (prompt §3 item 5 "state both … when they differ"):
 * `varaCivil` = the civil weekday of the birth calendar date (pure); `varaStrict`
 * = the strict Vedic sunrise-vara from `computeStrictVara` (a single physical
 * `swe.rise_trans` sunrise call — step 1d closes the 1b deferral). The rise call
 * is ayanamsa-independent and touches NO sidereal mode, so it is safe here
 * (`computePanchanga` runs after 1a's critical section). Karana omitted (type doc).
 */
export function computePanchanga(
  input: NatalChartInput,
  moonLongitude: number,
  sunLongitude: number
): Panchanga {
  const moon = norm360(moonLongitude);
  const sun = norm360(sunLongitude);

  // Tithi (Moon − Sun): 1..30, split into Shukla (1..15) / Krishna (16..30).
  const tithiIndex = Math.floor(norm360(moon - sun) / 12) + 1; // 1..30
  const paksha: 'Shukla' | 'Krishna' = tithiIndex <= 15 ? 'Shukla' : 'Krishna';
  const tithiInPaksha = tithiIndex <= 15 ? tithiIndex : tithiIndex - 15; // 1..15
  const tithiName =
    tithiInPaksha === 15
      ? paksha === 'Shukla' ? 'Purnima' : 'Amavasya'
      : TITHI_NAMES[tithiInPaksha - 1];
  const tithiLabel = `${paksha} ${tithiName}`;

  // Yoga (Moon + Sun) — sidereal (see the function doc).
  const yogaIndex = Math.floor(norm360(moon + sun) / YOGA_SPAN); // 0..26
  const yogaName = YOGA_NAMES[yogaIndex];

  // Vara — the civil weekday of the birth CALENDAR date. `input.date` stores the
  // local calendar date in its UTC fields, so getUTCDay() is that date's weekday.
  const varaCivilWeekday = input.date.getUTCDay(); // 0 = Sunday
  const varaCivil = VARA_NAMES[varaCivilWeekday];

  // Strict Vedic sunrise-vara (step 1d) — one real sunrise call.
  const strict = computeStrictVara(input, varaCivilWeekday);

  const varaNote = strict.sunriseAvailable
    ? strict.varaDiverges
      ? `Born before local sunrise (sunrise ${strict.sunriseUT} UT); the strict Vedic vara is the previous weekday (${strict.varaStrict}); the civil weekday is ${varaCivil}.`
      : `Post-sunrise birth (local sunrise ${strict.sunriseUT} UT); the strict Vedic vara equals the civil weekday (${varaCivil}).`
    : `Strict sunrise-vara unavailable (birth coordinates missing); the civil weekday ${varaCivil} is used.`;

  return {
    tithiIndex,
    tithiInPaksha,
    tithiName,
    paksha,
    tithiLabel,
    yogaIndex,
    yogaName,
    varaCivil,
    varaCivilWeekday,
    varaStrict: strict.varaStrict,
    varaStrictWeekday: strict.varaStrictWeekday,
    bornBeforeSunrise: strict.bornBeforeSunrise,
    varaDiverges: strict.varaDiverges,
    sunriseAvailable: strict.sunriseAvailable,
    sunriseUT: strict.sunriseUT,
    varaNote,
  };
}

/**
 * Strict Vedic sunrise-vara (prompt §3 item 5, step 1d). The Vedic day runs
 * sunrise→sunrise; a birth BEFORE local sunrise belongs to the PREVIOUS weekday.
 *
 * Uses `swe.rise_trans` to find the first Sun rise AT/AFTER local midnight on the
 * birth calendar date (that morning's sunrise) at the birthplace, then compares
 * the birth instant to it. This is a PHYSICAL-event call — ayanamsa-independent,
 * touches NO `set_sid_mode` — so it carries no isolation concern and needs no
 * critical section. Standard rise convention (`SE_CALC_RISE`: upper limb with
 * refraction). Falls back to civil when coordinates are missing.
 */
function computeStrictVara(
  input: NatalChartInput,
  civilWeekday: number
): {
  varaStrict: string;
  varaStrictWeekday: number;
  bornBeforeSunrise: boolean;
  varaDiverges: boolean;
  sunriseAvailable: boolean;
  sunriseUT: string | null;
} {
  const fallback = {
    varaStrict: VARA_NAMES[civilWeekday],
    varaStrictWeekday: civilWeekday,
    bornBeforeSunrise: false,
    varaDiverges: false,
    sunriseAvailable: false,
    sunriseUT: null as string | null,
  };
  const hasCoords =
    typeof input.lat === 'number' && typeof input.lng === 'number';
  if (!hasCoords) return fallback;

  // JD (UT) of local midnight on the birth calendar date, then the first sunrise
  // after it (that morning's sunrise). geopos order is [longitude, latitude, elev].
  const midnightJd = toJulianDayUT({ ...input, time: '00:00', timeIsAssumed: false });
  const rise = swe.rise_trans(
    midnightJd,
    C.SE_SUN,
    null,
    RISE_EPHE_FLAGS,
    C.SE_CALC_RISE,
    [input.lng as number, input.lat as number, 0],
    0,
    0
  );
  if (rise.flag !== C.OK) return fallback;

  const birthJd = toJulianDayUT(input);
  const bornBeforeSunrise = birthJd < rise.data;
  const strictWeekday = bornBeforeSunrise ? (civilWeekday + 6) % 7 : civilWeekday;
  return {
    varaStrict: VARA_NAMES[strictWeekday],
    varaStrictWeekday: strictWeekday,
    bornBeforeSunrise,
    varaDiverges: strictWeekday !== civilWeekday,
    sunriseAvailable: true,
    sunriseUT: jdToISODateTime(rise.data),
  };
}

// ===========================================================================
// STEP 1c — CLASSICAL STRENGTH LAYER (pure rules over the positional layer).
//
// Three DISTINCT computations, all pure over 1a's already-computed positions +
// speed (no ephemeris calls, no set_sid_mode — they run over the assembled
// output, not sweph state):
//   DO 1 — Vedic SIDEREAL dignities + combustion (exalt/debil/own/moolatrikona,
//          retro/stationary flags, combustion orbs from prompt §3 item 4).
//   DO 2 — Vedic yogas (Mahapurusha, Budha-Aditya, Gaja-Kesari, Neecha Bhanga
//          with stated cancellation, yogakaraka, dig bala, vargottama, dhana).
//   DO 3 — Western TROPICAL own-sign/exalt/debil (a SEPARATE, labelled frame off
//          R1's tropical positions — never mixed with the sidereal dignities).
//
// Every table/limit below is taken from the committed generation prompt §3 item 4
// (folded into R9-report.md §0.2.C), never from memory. The combustion orbs are
// the prompt's verbatim values (Mercury 14/retro 12, Venus 10/retro 8, Mars 17,
// Jupiter 11, Saturn 15) — which happen to equal the standard textbook orbs.
//
// Classical exaltation/debilitation/own-sign/moolatrikona tables: the prompt says
// "per classical tables" without transcribing them, so the canonical BPHS tables
// are used and every discrete flag is cross-checked against the sample's
// Appendix A (see the offline harness). Rahu/Ketu are given NO exalt/debil/own/
// moolatrikona: the classical tradition is not unanimous on node dignities and
// the sample assigns the nodes none (documented assumption).
// ===========================================================================

/** Exaltation sign per graha (classical; deep-exaltation degree not needed here). */
const EXALT_SIGN: Partial<Record<SiderealBody, ZodiacSign>> = {
  sun: 'Aries', moon: 'Taurus', mars: 'Capricorn', mercury: 'Virgo',
  jupiter: 'Cancer', venus: 'Pisces', saturn: 'Libra',
};

/** Debilitation sign per graha (the sign opposite the exaltation sign). */
const DEBIL_SIGN: Partial<Record<SiderealBody, ZodiacSign>> = {
  sun: 'Libra', moon: 'Scorpio', mars: 'Cancer', mercury: 'Pisces',
  jupiter: 'Capricorn', venus: 'Virgo', saturn: 'Aries',
};

/** Own (rulership) signs per graha (Vedic — the seven classical rulers only). */
const OWN_SIGNS: Partial<Record<SiderealBody, ZodiacSign[]>> = {
  sun: ['Leo'],
  moon: ['Cancer'],
  mars: ['Aries', 'Scorpio'],
  mercury: ['Gemini', 'Virgo'],
  jupiter: ['Sagittarius', 'Pisces'],
  venus: ['Taurus', 'Libra'],
  saturn: ['Capricorn', 'Aquarius'],
};

/** Moolatrikona sign + within-sign degree range [lo, hi) (classical/BPHS). */
const MOOLATRIKONA: Partial<
  Record<SiderealBody, { sign: ZodiacSign; lo: number; hi: number }>
> = {
  sun: { sign: 'Leo', lo: 0, hi: 20 },
  moon: { sign: 'Taurus', lo: 3, hi: 30 },
  mars: { sign: 'Aries', lo: 0, hi: 12 },
  mercury: { sign: 'Virgo', lo: 15, hi: 20 },
  jupiter: { sign: 'Sagittarius', lo: 0, hi: 10 },
  venus: { sign: 'Libra', lo: 0, hi: 15 },
  saturn: { sign: 'Aquarius', lo: 0, hi: 20 },
};

/**
 * Combustion orbs, VERBATIM from the committed prompt §3 item 4 (folded in
 * §0.2.C): Mercury 14 (retro 12), Venus 10 (retro 8), Mars 17, Jupiter 11,
 * Saturn 15. Sun/Moon/Rahu/Ketu never combust (not in this table). Mars/Jupiter/
 * Saturn have a single orb (the prompt gives no retro value → direct == retro).
 */
const COMBUSTION_ORB: Partial<
  Record<SiderealBody, { direct: number; retro: number }>
> = {
  mercury: { direct: 14, retro: 12 },
  venus: { direct: 10, retro: 8 },
  mars: { direct: 17, retro: 17 },
  jupiter: { direct: 11, retro: 11 },
  saturn: { direct: 15, retro: 15 },
};

/** Vedic sign rulers (dispositors) — the seven classical grahas only. */
const SIGN_RULER: Record<ZodiacSign, SiderealBody> = {
  Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon',
  Leo: 'sun', Virgo: 'mercury', Libra: 'venus', Scorpio: 'mars',
  Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter',
};

/** Dig-bala (directional strength) house per graha (prompt §3 item 4 "dig bala"). */
const DIG_BALA_HOUSE: Partial<Record<SiderealBody, number>> = {
  jupiter: 1, mercury: 1, // eastern (lagna)
  sun: 10, mars: 10, // southern (MC)
  saturn: 7, // western (descendant)
  moon: 4, venus: 4, // northern (nadir)
};

const KENDRAS = [1, 4, 7, 10];

// ---------------------------------------------------------------------------
// Output shapes (server-only computed types — never a client DTO).
// ---------------------------------------------------------------------------

/** DO 1 — one graha's Vedic sidereal dignity + combustion state. */
export interface DignityInfo {
  body: SiderealBody;
  sign: ZodiacSign;
  exalted: boolean;
  debilitated: boolean;
  ownSign: boolean;
  moolatrikona: boolean;
  // Strongest single label (exalted > moolatrikona > own > debilitated > neutral).
  dignity: 'exalted' | 'moolatrikona' | 'own' | 'debilitated' | 'neutral';
  retrograde: boolean;
  stationary: boolean;
  // Combustion (Mercury/Venus/Mars/Jupiter/Saturn only).
  combustEligible: boolean; // false for Sun/Moon/Rahu/Ketu
  combust: boolean;
  sunSeparation: number | null; // angular degrees from the Sun (null if not eligible)
  combustLimit: number | null; // the orb applied (retro-adjusted)
  // limit − separation: > 0 = combust by that depth; < 0 = clears the orb by |x|
  // (the "escape margin" the prompt requires stating when a planet just clears).
  combustMargin: number | null;
}

/** DO 2 — one detected named Vedic combination. */
export interface DetectedYoga {
  name: string; // e.g. "Budha-Aditya", "Neecha Bhanga (Mercury)", "Shasha (Saturn)"
  category:
    | 'mahapurusha' | 'budha-aditya' | 'gaja-kesari' | 'neecha-bhanga'
    | 'yogakaraka' | 'dig-bala' | 'vargottama' | 'dhana';
  basis: string; // the technical basis (mirrors the sample's "Technical Basis" column)
  bodies: SiderealBody[]; // grahas the yoga is formed by / about
}

/** DO 2 — the full yoga analysis + the raw dhana/yogakaraka support data. */
export interface YogaAnalysis {
  lagnaSign: ZodiacSign | null; // null if the birth time is unknown (no houses)
  yogas: DetectedYoga[];
  // 2nd/5th/9th/11th house lords + where each lord sits (the dhana support table).
  dhanaLords: {
    house: number; sign: ZodiacSign; lord: SiderealBody; lordHouse: number | null;
  }[];
}

/** DO 3 — one body's Western TROPICAL dignity (a distinct frame from DO 1). */
export interface WesternDignity {
  body: SiderealBody;
  tropicalSign: ZodiacSign;
  ownSign: boolean;
  exalted: boolean;
  debilitated: boolean;
  condition: 'own' | 'exalted' | 'debilitated' | 'neutral';
}

// ---------------------------------------------------------------------------
// DO 1 — Vedic sidereal dignities + combustion.
// ---------------------------------------------------------------------------

/** Shorter-arc angular separation between two ecliptic longitudes, in degrees. */
function angularSeparation(a: number, b: number): number {
  let d = Math.abs(norm360(a) - norm360(b)) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * DO 1 — dignities + combustion for every graha, over the sidereal positions.
 * PURE: reads the assembled `SiderealPosition[]` (sign/degree/speed/retro/
 * stationary already computed by 1a) + the Sun's sidereal longitude for
 * combustion. No ephemeris state touched.
 */
export function computeDignities(positions: SiderealPosition[]): DignityInfo[] {
  const sun = positions.find((p) => p.body === 'sun');
  const sunLon = sun ? sun.longitude : null;

  return positions.map((p) => {
    const exalted = EXALT_SIGN[p.body] === p.sign;
    const debilitated = DEBIL_SIGN[p.body] === p.sign;
    const ownSign = (OWN_SIGNS[p.body] ?? []).includes(p.sign);
    const mt = MOOLATRIKONA[p.body];
    const moolatrikona =
      !!mt && mt.sign === p.sign && p.degree >= mt.lo && p.degree < mt.hi;

    const dignity: DignityInfo['dignity'] = exalted
      ? 'exalted'
      : moolatrikona
      ? 'moolatrikona'
      : ownSign
      ? 'own'
      : debilitated
      ? 'debilitated'
      : 'neutral';

    // Combustion — only the five true planets, and only when the Sun is known.
    const orb = COMBUSTION_ORB[p.body];
    const combustEligible = !!orb;
    let combust = false;
    let sunSeparation: number | null = null;
    let combustLimit: number | null = null;
    let combustMargin: number | null = null;
    if (orb && sunLon !== null) {
      sunSeparation = angularSeparation(p.longitude, sunLon);
      combustLimit = p.retrograde ? orb.retro : orb.direct;
      combustMargin = combustLimit - sunSeparation; // >0 combust; <0 escape margin
      combust = sunSeparation < combustLimit;
    }

    return {
      body: p.body,
      sign: p.sign,
      exalted,
      debilitated,
      ownSign,
      moolatrikona,
      dignity,
      retrograde: p.retrograde,
      stationary: p.stationary,
      combustEligible,
      combust,
      sunSeparation,
      combustLimit,
      combustMargin,
    };
  });
}

// ---------------------------------------------------------------------------
// DO 2 — Vedic yogas.
// ---------------------------------------------------------------------------

const MAHAPURUSHA_NAME: Partial<Record<SiderealBody, string>> = {
  mars: 'Ruchaka', mercury: 'Bhadra', jupiter: 'Hamsa',
  venus: 'Malavya', saturn: 'Shasha',
};

const ORDINAL = [
  '', '1st', '2nd', '3rd', '4th', '5th', '6th',
  '7th', '8th', '9th', '10th', '11th', '12th',
];

/**
 * DO 2 — detect and name the classical Vedic combinations (prompt §3 item 4).
 * PURE over the sidereal positions (sign + whole-sign house + D9), the ascendant,
 * and the DO-1 dignities. Detections are house-based, so when the birth time is
 * unknown (no ascendant) only the frame-independent yogas (Budha-Aditya sign
 * conjunction, vargottama) can fire; the rest are skipped.
 */
export function computeYogas(
  positions: SiderealPosition[],
  ascendant: SiderealChart['ascendant'],
  dignities: DignityInfo[]
): YogaAnalysis {
  const byBody = new Map(positions.map((p) => [p.body, p]));
  const digByBody = new Map(dignities.map((d) => [d.body, d]));
  const yogas: DetectedYoga[] = [];

  const lagnaSign = ascendant ? ascendant.sign : null;
  const lagnaIdx = lagnaSign ? SIGNS.indexOf(lagnaSign) : null;

  // House (1..12) of a sign, relative to the lagna. Null when no lagna.
  const houseOfSign = (sign: ZodiacSign): number | null =>
    lagnaIdx === null ? null : ((SIGNS.indexOf(sign) - lagnaIdx + 12) % 12) + 1;
  // The sign occupying house h (1..12) from the lagna.
  const signAtHouse = (h: number): ZodiacSign | null =>
    lagnaIdx === null ? null : SIGNS[(lagnaIdx + h - 1) % 12];

  // ── Mahapurusha: a planet in its OWN or EXALTED sign, in a KENDRA. ─────────
  if (lagnaIdx !== null) {
    for (const body of ['mars', 'mercury', 'jupiter', 'venus', 'saturn'] as SiderealBody[]) {
      const p = byBody.get(body);
      const d = digByBody.get(body);
      if (!p || !d || p.siderealHouse === null) continue;
      if ((d.ownSign || d.exalted) && KENDRAS.includes(p.siderealHouse)) {
        yogas.push({
          name: `${MAHAPURUSHA_NAME[body]} (${cap(body)})`,
          category: 'mahapurusha',
          basis: `${cap(body)} ${d.exalted ? 'exalted' : 'in own sign'} in ${p.sign}, in the ${ORDINAL[p.siderealHouse]} (a kendra)`,
          bodies: [body],
        });
      }
    }
  }

  // ── Budha-Aditya: Sun and Mercury in the SAME sign (frame-independent). ────
  const sunP = byBody.get('sun');
  const merP = byBody.get('mercury');
  if (sunP && merP && sunP.sign === merP.sign) {
    const h = houseOfSign(sunP.sign);
    yogas.push({
      name: 'Budha-Aditya',
      category: 'budha-aditya',
      basis: `Sun with Mercury in ${sunP.sign}${h ? ` (the ${ORDINAL[h]} house)` : ''}`,
      bodies: ['sun', 'mercury'],
    });
  }

  // ── Gaja-Kesari: Jupiter in a KENDRA FROM the Moon. ───────────────────────
  const jupP = byBody.get('jupiter');
  const moonP = byBody.get('moon');
  if (jupP && moonP) {
    const moonIdx = SIGNS.indexOf(moonP.sign);
    const houseFromMoon = ((SIGNS.indexOf(jupP.sign) - moonIdx + 12) % 12) + 1;
    if (KENDRAS.includes(houseFromMoon)) {
      yogas.push({
        name: 'Gaja-Kesari',
        category: 'gaja-kesari',
        basis: `Jupiter in the ${ORDINAL[houseFromMoon]} from the Moon (a kendra)`,
        bodies: ['jupiter', 'moon'],
      });
    }
  }

  // ── Neecha Bhanga: a debilitated planet with a stated cancellation. ───────
  // Conditions implemented (the two standard "in a kendra" cancellations):
  //   (1) the dispositor (lord of the debilitation sign) is in a kendra from the
  //       lagna OR the Moon;
  //   (2) the planet EXALTED in that sign is in a kendra from the lagna OR Moon.
  // The specific condition met is stated (never just "cancelled").
  if (lagnaIdx !== null) {
    const moonIdx = moonP ? SIGNS.indexOf(moonP.sign) : null;
    const kendraFrom = (occupiedSign: ZodiacSign, fromIdx: number | null): number | null => {
      if (fromIdx === null) return null;
      const h = ((SIGNS.indexOf(occupiedSign) - fromIdx + 12) % 12) + 1;
      return KENDRAS.includes(h) ? h : null;
    };
    for (const d of dignities) {
      if (!d.debilitated) continue;
      const dispositor = SIGN_RULER[d.sign];
      const dispP = byBody.get(dispositor);
      // The planet exalted in this (debilitation) sign, if any.
      const exaltedHere = (Object.keys(EXALT_SIGN) as SiderealBody[]).find(
        (b) => EXALT_SIGN[b] === d.sign
      );
      const exaltP = exaltedHere ? byBody.get(exaltedHere) : undefined;

      const reasons: string[] = [];
      if (dispP) {
        const kL = kendraFrom(dispP.sign, lagnaIdx);
        const kM = kendraFrom(dispP.sign, moonIdx);
        if (kL) reasons.push(`dispositor ${cap(dispositor)} in a kendra (the ${ORDINAL[kL]}) from the lagna`);
        else if (kM) reasons.push(`dispositor ${cap(dispositor)} in a kendra (the ${ORDINAL[kM]}) from the Moon`);
      }
      if (exaltP && exaltedHere && exaltedHere !== d.body) {
        const kL = kendraFrom(exaltP.sign, lagnaIdx);
        const kM = kendraFrom(exaltP.sign, moonIdx);
        if (kL) reasons.push(`${cap(exaltedHere)} (exalted in ${d.sign}) in a kendra (the ${ORDINAL[kL]}) from the lagna`);
        else if (kM) reasons.push(`${cap(exaltedHere)} (exalted in ${d.sign}) in a kendra (the ${ORDINAL[kM]}) from the Moon`);
      }
      if (reasons.length > 0) {
        yogas.push({
          name: `Neecha Bhanga (${cap(d.body)})`,
          category: 'neecha-bhanga',
          basis: `${cap(d.body)} debilitated in ${d.sign}, cancelled: ${reasons.join('; ')}`,
          bodies: [d.body],
        });
      }
    }
  }

  // ── Yogakaraka: a single planet ruling BOTH a kendra (4/7/10) and a ───────
  // trikona (5/9) for the lagna (the 1st, kendra-and-trikona, does not qualify
  // alone). ──────────────────────────────────────────────────────────────────
  const yogakarakaBodies: SiderealBody[] = [];
  if (lagnaIdx !== null) {
    for (const body of ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as SiderealBody[]) {
      const ownHouses = (OWN_SIGNS[body] ?? [])
        .map((s) => houseOfSign(s))
        .filter((h): h is number => h !== null);
      const rulesKendra = ownHouses.some((h) => h === 4 || h === 7 || h === 10);
      const rulesTrikona = ownHouses.some((h) => h === 5 || h === 9);
      if (rulesKendra && rulesTrikona) {
        yogakarakaBodies.push(body);
        const d = digByBody.get(body);
        const p = byBody.get(body);
        const kh = ownHouses.filter((h) => h === 4 || h === 7 || h === 10);
        const th = ownHouses.filter((h) => h === 5 || h === 9);
        const dignityNote = d && d.exalted ? ', exalted' : d && d.ownSign ? ', in own sign' : '';
        const placeNote = p && p.siderealHouse !== null ? `, placed in the ${ORDINAL[p.siderealHouse]}` : '';
        yogas.push({
          name: `Yogakaraka (${cap(body)})`,
          category: 'yogakaraka',
          basis: `lord of the ${th.map((h) => ORDINAL[h]).join(' & ')} (trikona) and the ${kh.map((h) => ORDINAL[h]).join(' & ')} (kendra)${dignityNote}${placeNote}`,
          bodies: [body],
        });
      }
    }
  }

  // ── Dig bala: a planet in its directional-strength house. ─────────────────
  if (lagnaIdx !== null) {
    for (const p of positions) {
      const digHouse = DIG_BALA_HOUSE[p.body];
      if (digHouse && p.siderealHouse === digHouse) {
        yogas.push({
          name: `Dig Bala (${cap(p.body)})`,
          category: 'dig-bala',
          basis: `${cap(p.body)} in the ${ORDINAL[digHouse]} (its direction of strength)`,
          bodies: [p.body],
        });
      }
    }
  }

  // ── Vargottama: D1 sign == D9 (navamsa) sign. ─────────────────────────────
  for (const p of positions) {
    if (p.sign === p.navamsaSign) {
      yogas.push({
        name: `Vargottama (${cap(p.body)})`,
        category: 'vargottama',
        basis: `${cap(p.body)} in ${p.sign} in both D1 and the D9 navamsa`,
        bodies: [p.body],
      });
    }
  }
  if (ascendant && ascendant.sign === ascendant.navamsaSign) {
    yogas.push({
      name: 'Vargottama (Lagna)',
      category: 'vargottama',
      basis: `the lagna in ${ascendant.sign} in both D1 and the D9 navamsa`,
      bodies: [],
    });
  }

  // ── Dhana linkages: 2nd/5th/9th/11th lords + their placements. ────────────
  const dhanaLords: YogaAnalysis['dhanaLords'] = [];
  if (lagnaIdx !== null) {
    const DHANA_HOUSES = [2, 5, 9, 11];
    for (const h of DHANA_HOUSES) {
      const sign = signAtHouse(h)!;
      const lord = SIGN_RULER[sign];
      const lordHouse = byBody.get(lord)?.siderealHouse ?? null;
      dhanaLords.push({ house: h, sign, lord, lordHouse });
    }
    // A dhana yoga = a dhana-house lord occupying another dhana house, and/or the
    // 11th (gains) lord in a kendra. State every linkage found (mirrors the
    // sample's "2nd lord in the 11th; 5th lord in the 11th; 11th lord in a kendra").
    const linkages: string[] = [];
    for (const dl of dhanaLords) {
      if (dl.lordHouse !== null && DHANA_HOUSES.includes(dl.lordHouse) && dl.lordHouse !== dl.house) {
        linkages.push(`${ORDINAL[dl.house]} lord (${cap(dl.lord)}) in the ${ORDINAL[dl.lordHouse]}`);
      }
    }
    const eleventh = dhanaLords.find((dl) => dl.house === 11);
    if (eleventh && eleventh.lordHouse !== null && KENDRAS.includes(eleventh.lordHouse)) {
      linkages.push(`11th lord (${cap(eleventh.lord)}) in a kendra (the ${ORDINAL[eleventh.lordHouse]})`);
    }
    if (linkages.length >= 2) {
      yogas.push({
        name: 'Dhana cluster',
        category: 'dhana',
        basis: linkages.join('; '),
        bodies: [...new Set(dhanaLords.map((dl) => dl.lord))],
      });
    }
  }

  return { lagnaSign, yogas, dhanaLords };
}

/** Capitalize a graha key for display ("mercury" → "Mercury"). */
function cap(body: string): string {
  return body.charAt(0).toUpperCase() + body.slice(1);
}

// ---------------------------------------------------------------------------
// DO 3 — Western TROPICAL own-sign / exaltation / debilitation.
//
// A DISTINCT, LABELLED frame from DO 1: this reads TROPICAL signs (R1's default
// frame — the overlay already computed for the whole-sign houses, byte-identical
// to R1's Moshier positions), NOT the sidereal signs. Separating the two frames
// is what prevents a dignity being computed in the wrong zodiac (e.g. Saturn is
// exalted SIDEREALLY in Libra but neutral TROPICALLY in Scorpio). The same
// classical rulership/exaltation/debilitation tables apply in both zodiacs; only
// the input sign differs. Nodes are omitted (no node dignities — as in DO 1).
// ---------------------------------------------------------------------------

/** DO 3 — Western tropical own/exalt/debil, per body, off tropical signs. */
export function computeWesternDignities(
  bodies: { body: SiderealBody; tropicalSign: ZodiacSign }[]
): WesternDignity[] {
  return bodies.map(({ body, tropicalSign }) => {
    const ownSign = (OWN_SIGNS[body] ?? []).includes(tropicalSign);
    const exalted = EXALT_SIGN[body] === tropicalSign;
    const debilitated = DEBIL_SIGN[body] === tropicalSign;
    const condition: WesternDignity['condition'] = ownSign
      ? 'own'
      : exalted
      ? 'exalted'
      : debilitated
      ? 'debilitated'
      : 'neutral';
    return { body, tropicalSign, ownSign, exalted, debilitated, condition };
  });
}

// ===========================================================================
// STEP 1d — FORWARD-TRANSIT LAYER (ingress tables + Sade Sati + returns).
//
// Prompt §3 item 7 (folded in R9-report.md §0.2.C): sidereal ingress dates for
// Saturn (~30 years forward), Jupiter (selected), and mean Rahu, mapped to the
// subject's houses; Sade Sati windows (Saturn over the 12th/1st/2nd signs from
// the natal Moon), past and future; Saturn return years (~29.5y); note transit
// Jupiter passing over the natal stellium / lagna / Moon in the forecast horizon.
//
// FORECAST HORIZON = ~30 years forward from the reference instant ("now"). This
// is taken from the PROMPT, NOT defaulted: §3 item 7 says Saturn "about 30 years
// forward" and §8 Appendix B says "Saturn full sequence about 30 years". (It is
// NOT the dasha ladder's ~2074 horizon — the prompt scopes transits to ~30y.)
//
// ISOLATION / EVENT-LOOP: this SCANS positions across decades. Rather than hold
// the process-global sidereal mode across a ~100 ms synchronous block (charter
// §14's hazard), it uses mitigation (b): sidereal longitude = tropical − Lahiri
// ayanamsa. The ayanamsa is sampled ONCE at yearly nodes inside a tiny synchronous
// set→sample→reset section (1a's discipline) and linearly interpolated; the long
// march then runs in R1's tropical frame with NO set_sid_mode and yields to the
// event loop every YIELD_EVERY_CALLS ephemeris calls. See the module header.
// ===========================================================================

const TRANSIT_HORIZON_YEARS = 30; // prompt §3 item 7 + §8 Appendix B ("about 30 years")
// Coarse march step (days) per body — smaller than each body's minimum dwell in a
// sign AND than any retrograde in-and-out near a boundary, so no crossing is
// aliased (Saturn ~2.46y/sign, Jupiter ~1y/sign, mean Rahu ~1.6y/sign, uniform).
const TRANSIT_STEP_DAYS: Record<'saturn' | 'jupiter' | 'rahu', number> = {
  saturn: 20,
  jupiter: 12,
  rahu: 20,
};
const BISECT_TOL_DAYS = 0.02; // ~29 min — day-resolution ingress/return dates
const YIELD_EVERY_CALLS = 400; // yield to the event loop this often (mitigation b)
const RETURN_CLUSTER_DAYS = 550; // group a retrograde triple-crossing into one return
// Sade Sati windowing: merge only a SHORT retrograde wobble at a boundary (Saturn
// dips across a sign line and comes straight back), NOT a ~6-month excursion back
// to the previous sign (a false start before Saturn settles). Then require a real
// Sade Sati's ~7.5-year length so a brief pre-settle dip is not reported as its own
// window — this makes the window start at the SETTLING entry (matches the sample).
const SADE_SATI_WOBBLE_MERGE_DAYS = 90;
const SADE_SATI_MIN_WINDOW_DAYS = 5 * 365.25;

// ---------------------------------------------------------------------------
// Output shapes (server-only computed types — never a client DTO).
// ---------------------------------------------------------------------------

/** One sidereal sign-ingress: the date a body's sidereal longitude enters `sign`. */
export interface SignIngress {
  date: string; // ISO "YYYY-MM-DD" (UT) of the 30° boundary crossing
  sign: ZodiacSign; // the sign entered
  house: number | null; // whole-sign house from the sidereal lagna (null if no time)
  retrograde: boolean; // true when the body entered while retrograde
}

/** One Sade Sati window: Saturn over the 12th→1st→2nd signs from the natal Moon. */
export interface SadeSatiWindow {
  start: string; // ISO date Saturn enters the window's first sign
  end: string; // ISO date Saturn leaves the 2nd-from-Moon sign
  startSign: ZodiacSign; // sign at the window's start (normally 12th-from-Moon)
  timing: 'past' | 'current' | 'future'; // relative to the reference instant
}

/** One planetary return (Saturn / Jupiter / nodal): body back over its natal degree. */
export interface PlanetaryReturn {
  body: 'saturn' | 'jupiter' | 'rahu';
  kind: 'saturn' | 'jupiter' | 'nodal';
  ordinal: number; // 1st, 2nd, … (Saturn counts from birth; Jupiter/nodal from scan start)
  date: string; // representative crossing (middle of a retrograde cluster)
  crossings: string[]; // every crossing date in the cluster (1 or 3 for a retro loop)
  natalLongitude: number; // the natal sidereal degree being returned to
  sign: ZodiacSign;
  house: number | null;
  timing: 'past' | 'future';
}

/** Transit Jupiter passing over a notable natal point (prompt §3 item 7). */
export interface JupiterPass {
  target: 'lagna' | 'moon' | 'sun' | 'mercury' | 'mars';
  targetLabel: string; // e.g. "natal Moon", "natal stellium (Sun)"
  date: string;
  natalLongitude: number;
  sign: ZodiacSign;
  house: number | null;
}

/** The full forward-transit layer for a subject over the ~30-year horizon. */
export interface SiderealTransits {
  horizonYears: number; // 30 (from the prompt)
  asOf: string; // ISO date of the reference instant ("now")
  scanFrom: string; // ISO date of the past-coverage floor (birth for Saturn)
  scanTo: string; // ISO date of the forward horizon (asOf + horizon)
  ingresses: {
    saturn: SignIngress[]; // full sequence from the current sign entry to the horizon
    jupiter: SignIngress[]; // forward selected
    rahu: SignIngress[]; // mean node, forward selected
  };
  sadeSati: SadeSatiWindow[]; // past + current + future
  returns: PlanetaryReturn[]; // Saturn + Jupiter + nodal
  jupiterPasses: JupiterPass[]; // transit Jupiter over lagna / Moon / stellium in the horizon
  scanCalls: number; // ephemeris calls made (for the event-loop-block measurement)
}

// ---------------------------------------------------------------------------
// Ayanamsa sampler — the ONLY sidereal-mode use in the scan (tiny sync section).
// ---------------------------------------------------------------------------

/**
 * Sample the Lahiri ayanamsa at yearly nodes over [fromJd, toJd] inside a
 * synchronous set→sample→reset section (1a's isolation discipline), and return a
 * linear-interpolating lookup. The ayanamsa is near-linear (~50″/yr), so yearly
 * linear interpolation error is ≪ 0.001″ (measured) — negligible for a 30° scan.
 */
function makeAyanamsaLookup(fromJd: number, toJd: number): (jd: number) => number {
  const nodes: { jd: number; a: number }[] = [];
  swe.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);
  try {
    for (let jd = Math.floor(fromJd) - 366; jd <= toJd + 366; jd += 365.25) {
      nodes.push({ jd, a: swe.get_ayanamsa_ut(jd) });
    }
  } finally {
    swe.set_sid_mode(RESET_SID_MODE, 0, 0);
  }
  return (jd: number): number => {
    if (jd <= nodes[0].jd) return nodes[0].a;
    const last = nodes[nodes.length - 1];
    if (jd >= last.jd) return last.a;
    let i = 1;
    while (i < nodes.length && nodes[i].jd < jd) i++;
    const lo = nodes[i - 1];
    const hi = nodes[i];
    const t = (jd - lo.jd) / (hi.jd - lo.jd);
    return lo.a + t * (hi.a - lo.a);
  };
}

// ---------------------------------------------------------------------------
// The forward-transit computation.
// ---------------------------------------------------------------------------

/**
 * Compute the forward-transit layer (ingress tables + Sade Sati + returns +
 * Jupiter passes) for a subject, over the ~30-year forecast horizon from `asOf`.
 *
 * ASYNC by contract: the multi-decade scan yields to the event loop periodically
 * so it never blocks the shared backend (mitigation b — see the module header).
 * It reads the ALREADY-COMPUTED sidereal natal chart (`natal`) for the target
 * longitudes and the lagna, and derives transit sidereal longitudes as
 * `tropical − ayanamsa` (no held sidereal mode).
 *
 * @param natal the subject's `computeSiderealChart` output (natal targets + lagna)
 * @param asOf  reference instant ("now"); the offline harness passes the sample's
 *              generation date to reproduce Appendix B.
 */
export async function computeSiderealTransits(
  input: NatalChartInput,
  natal: SiderealChart,
  asOf: Date = new Date()
): Promise<SiderealTransits> {
  const birthJd = toJulianDayUT(input);
  const asOfJd = dateToJdUT(asOf);
  const scanToJd = asOfJd + TRANSIT_HORIZON_YEARS * VIMSHOTTARI_YEAR_DAYS;
  const ayaFn = makeAyanamsaLookup(birthJd, scanToJd);

  // Ephemeris accessors (tropical frame; sidereal = tropical − ayanamsa).
  let calls = 0;
  let sinceYield = 0;
  const SL = (jd: number, bodyId: number): number => {
    calls++;
    sinceYield++;
    const t = computeBodyPosition(jd, bodyId, TROP_PLANET_FLAGS);
    return norm360((t ? t.longitude : 0) - ayaFn(jd));
  };
  const SP = (jd: number, bodyId: number): number => {
    calls++;
    sinceYield++;
    const t = computeBodyPosition(jd, bodyId, TROP_PLANET_FLAGS);
    return t ? t.speed : 0; // tropical speed sign == sidereal speed sign (drift ≈ 0)
  };
  const maybeYield = async (): Promise<void> => {
    if (sinceYield >= YIELD_EVERY_CALLS) {
      sinceYield = 0;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  };

  // Natal targets + lagna from the already-computed sidereal chart.
  const posByBody = new Map(natal.positions.map((p) => [p.body, p.longitude]));
  const lonOf = (b: SiderealBody): number => posByBody.get(b) as number;
  const natSat = lonOf('saturn');
  const natJup = lonOf('jupiter');
  const natRahu = lonOf('rahu');
  const moonSignIdx = Math.floor(norm360(lonOf('moon')) / 30);
  const ascSignIndex = natal.ascendant ? SIGNS.indexOf(natal.ascendant.sign) : null;

  // ── Scan primitives (all pure over SL/SP; no sidereal mode) ───────────────
  const sgn = (x: number): number => (x >= 0 ? 1 : -1);
  const signedDiff = (a: number, b: number): number => {
    let d = norm360(a) - norm360(b);
    if (d > 180) d -= 360;
    else if (d < -180) d += 360;
    return d;
  };
  const bisectSignChange = (bodyId: number, lo: number, hi: number, loSign: number): number => {
    for (let k = 0; k < 60 && hi - lo > BISECT_TOL_DAYS; k++) {
      const mid = (lo + hi) / 2;
      if (Math.floor(SL(mid, bodyId) / 30) === loSign) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  const bisectDiffZero = (bodyId: number, lo: number, hi: number, target: number): number => {
    let dLo = signedDiff(SL(lo, bodyId), target);
    for (let k = 0; k < 60 && hi - lo > BISECT_TOL_DAYS; k++) {
      const mid = (lo + hi) / 2;
      const dMid = signedDiff(SL(mid, bodyId), target);
      if (sgn(dMid) === sgn(dLo)) {
        lo = mid;
        dLo = dMid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) / 2;
  };

  interface Crossing {
    jd: number;
    sign: number;
    retro: boolean;
  }
  // A single coarse march recording every sign crossing AND every crossing over
  // each supplied natal target (returns / passes) — one march, many detectors.
  const march = async (
    bodyId: number,
    fromJd: number,
    toJd: number,
    stepDays: number,
    targets: { lon: number; hits: number[] }[]
  ): Promise<Crossing[]> => {
    const cross: Crossing[] = [];
    let prevJd = fromJd;
    let prevLon = SL(fromJd, bodyId);
    let prevSign = Math.floor(prevLon / 30);
    const prevDiff = targets.map((t) => signedDiff(prevLon, t.lon));
    for (let jd = fromJd + stepDays; ; jd += stepDays) {
      const cur = Math.min(jd, toJd);
      const lon = SL(cur, bodyId);
      const sign = Math.floor(lon / 30);
      if (sign !== prevSign) {
        const cj = bisectSignChange(bodyId, prevJd, cur, prevSign);
        cross.push({ jd: cj, sign, retro: SP(cj, bodyId) < 0 });
      }
      for (let i = 0; i < targets.length; i++) {
        const d = signedDiff(lon, targets[i].lon);
        // A crossing of the target degree: the signed diff flips sign while both
        // samples sit near it (excludes the ±180° wrap far from the target).
        if (sgn(d) !== sgn(prevDiff[i]) && Math.abs(prevDiff[i]) < 40 && Math.abs(d) < 40) {
          targets[i].hits.push(bisectDiffZero(bodyId, prevJd, cur, targets[i].lon));
        }
        prevDiff[i] = d;
      }
      prevJd = cur;
      prevLon = lon;
      prevSign = sign;
      await maybeYield();
      if (cur >= toJd) break;
    }
    return cross;
  };

  // ── Ingress list: from the current sign entry (≤ asOf) forward ────────────
  const toIngressList = (cross: Crossing[]): SignIngress[] => {
    let startIdx = 0;
    for (let i = 0; i < cross.length; i++) if (cross[i].jd <= asOfJd) startIdx = i;
    return cross.slice(startIdx).map((c) => ({
      date: jdToISODate(c.jd),
      sign: SIGNS[c.sign],
      house: ascSignIndex !== null ? wholeSignHouse(c.sign, ascSignIndex) : null,
      retrograde: c.retro,
    }));
  };

  // ── Returns: cluster a retrograde triple-crossing into one return event ───
  const clusterReturns = (
    hits: number[],
    body: PlanetaryReturn['body'],
    kind: PlanetaryReturn['kind'],
    natalLon: number,
    minJd: number
  ): PlanetaryReturn[] => {
    const sorted = hits.filter((h) => h > minJd).sort((a, b) => a - b);
    const groups: number[][] = [];
    for (const h of sorted) {
      const g = groups[groups.length - 1];
      if (g && h - g[g.length - 1] < RETURN_CLUSTER_DAYS) g.push(h);
      else groups.push([h]);
    }
    const nl = norm360(natalLon);
    const sign = signAndDegree(nl).sign;
    const house = ascSignIndex !== null ? wholeSignHouse(Math.floor(nl / 30), ascSignIndex) : null;
    return groups.map((g, i) => ({
      body,
      kind,
      ordinal: i + 1,
      date: jdToISODate(g[Math.floor((g.length - 1) / 2)]),
      crossings: g.map(jdToISODate),
      natalLongitude: nl,
      sign,
      house,
      timing: (g[g.length - 1] < asOfJd ? 'past' : 'future') as 'past' | 'future',
    }));
  };

  // ── Run the three marches ─────────────────────────────────────────────────
  // Saturn: full range [birth, horizon] — its ingress table, Sade Sati, and both
  // returns (~29.5y & ~59y) all need past + future coverage.
  const satReturnHits: number[] = [];
  const satCross = await march(GRAHA_IDS.saturn, birthJd, scanToJd, TRANSIT_STEP_DAYS.saturn, [
    { lon: natSat, hits: satReturnHits },
  ]);

  // Jupiter: forward from ~2y before asOf (to capture the current sign entry) —
  // ingresses + Jupiter return + passes over lagna / Moon / stellium.
  const jupFrom = asOfJd - 2 * VIMSHOTTARI_YEAR_DAYS;
  const jupReturnHits: number[] = [];
  const passDefs = (
    [
      { key: 'lagna', label: 'natal lagna', lon: natal.ascendant ? natal.ascendant.longitude : null },
      { key: 'moon', label: 'natal Moon', lon: lonOf('moon') },
      { key: 'sun', label: 'natal stellium (Sun)', lon: lonOf('sun') },
      { key: 'mercury', label: 'natal stellium (Mercury)', lon: lonOf('mercury') },
      { key: 'mars', label: 'natal stellium (Mars)', lon: lonOf('mars') },
    ] as { key: JupiterPass['target']; label: string; lon: number | null }[]
  ).filter((p) => p.lon !== null) as { key: JupiterPass['target']; label: string; lon: number }[];
  const passHits = passDefs.map((p) => ({ lon: p.lon, hits: [] as number[] }));
  const jupCross = await march(GRAHA_IDS.jupiter, jupFrom, scanToJd, TRANSIT_STEP_DAYS.jupiter, [
    { lon: natJup, hits: jupReturnHits },
    ...passHits,
  ]);

  // mean Rahu: forward — ingresses + the nodal return (~18.6y). Mean node moves
  // uniformly retrograde (no stations), so one clean crossing per cycle.
  const rahuFrom = asOfJd - 2 * VIMSHOTTARI_YEAR_DAYS;
  const rahuReturnHits: number[] = [];
  const rahuCross = await march(GRAHA_IDS.rahu, rahuFrom, scanToJd, TRANSIT_STEP_DAYS.rahu, [
    { lon: natRahu, hits: rahuReturnHits },
  ]);

  // ── Sade Sati: Saturn over the 12th/1st/2nd signs from the natal Moon ─────
  const sadeSet = new Set([(moonSignIdx + 11) % 12, moonSignIdx, (moonSignIdx + 1) % 12]);
  const sadeSati: SadeSatiWindow[] = (() => {
    // Saturn's sign timeline from birth through the horizon.
    const birthSign = Math.floor(SL(birthJd, GRAHA_IDS.saturn) / 30);
    const segs: { sign: number; start: number; end: number }[] = [];
    let curSign = birthSign;
    let curStart = birthJd;
    for (const c of satCross) {
      segs.push({ sign: curSign, start: curStart, end: c.jd });
      curSign = c.sign;
      curStart = c.jd;
    }
    segs.push({ sign: curSign, start: curStart, end: scanToJd });
    // Merge in-set segments (adjacent, gap 0) and short retro wobbles into windows;
    // a longer out-of-set excursion (Saturn retreating for months before settling)
    // starts a new window. Then keep only windows of real Sade-Sati length, so a
    // brief pre-settle dip drops out and the window begins at the settling entry.
    const merged: { start: number; end: number }[] = [];
    for (const s of segs) {
      if (!sadeSet.has(s.sign)) continue;
      const last = merged[merged.length - 1];
      if (last && s.start - last.end < SADE_SATI_WOBBLE_MERGE_DAYS) last.end = Math.max(last.end, s.end);
      else merged.push({ start: s.start, end: s.end });
    }
    return merged
      .filter((m) => m.end - m.start >= SADE_SATI_MIN_WINDOW_DAYS)
      .map((m) => {
      const startSignIdx = Math.floor(SL(m.start + 1, GRAHA_IDS.saturn) / 30);
      const timing: SadeSatiWindow['timing'] =
        m.end < asOfJd ? 'past' : m.start > asOfJd ? 'future' : 'current';
      return {
        start: jdToISODate(m.start),
        end: jdToISODate(m.end),
        startSign: SIGNS[startSignIdx],
        timing,
      };
    });
  })();

  // ── Returns (all three bodies) ────────────────────────────────────────────
  const returns: PlanetaryReturn[] = [
    ...clusterReturns(satReturnHits, 'saturn', 'saturn', natSat, birthJd + 400),
    ...clusterReturns(jupReturnHits, 'jupiter', 'jupiter', natJup, jupFrom - 1),
    ...clusterReturns(rahuReturnHits, 'rahu', 'nodal', natRahu, rahuFrom - 1),
  ];

  // ── Jupiter passes over natal stellium / lagna / Moon in the horizon ──────
  const jupiterPasses: JupiterPass[] = [];
  passDefs.forEach((def, i) => {
    for (const h of passHits[i].hits) {
      if (h < asOfJd || h > scanToJd) continue; // forecast horizon only
      const nl = norm360(def.lon);
      jupiterPasses.push({
        target: def.key,
        targetLabel: def.label,
        date: jdToISODate(h),
        natalLongitude: nl,
        sign: signAndDegree(nl).sign,
        house: ascSignIndex !== null ? wholeSignHouse(Math.floor(nl / 30), ascSignIndex) : null,
      });
    }
  });
  jupiterPasses.sort((a, b) => a.date.localeCompare(b.date));

  return {
    horizonYears: TRANSIT_HORIZON_YEARS,
    asOf: jdToISODate(asOfJd),
    scanFrom: jdToISODate(birthJd),
    scanTo: jdToISODate(scanToJd),
    ingresses: {
      saturn: toIngressList(satCross),
      jupiter: toIngressList(jupCross),
      rahu: toIngressList(rahuCross),
    },
    sadeSati,
    returns,
    jupiterPasses,
    scanCalls: calls,
  };
}
