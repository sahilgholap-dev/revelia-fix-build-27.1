/**
 * Timing Engine — R7 Conversational Q&A (Build 27), §14 charter STEP 0.
 *
 * For a router-labelled `timing` question the engine casts a sidereal MOMENT
 * chart at the question's server timestamp + city-level location, judges it
 * against the confidential rule set PLUS the querent's sidereal natal chart and
 * running dasha, and emits an INTERNAL directional read (the R7-QA §5 output
 * contract). The answer model later phrases that read in plain language — the
 * engine decides, the model phrases (R6 non-fabrication discipline).
 *
 * ── Trade-secret posture (S-R9f/D8) ────────────────────────────────────────
 * The RULE SET (weights, karya-bhava map, classification thresholds, confidence
 * formula, carve-out categories, language + never-expose map) is the core
 * Revelia trade secret. It is NOT in this file and NOT in git: it loads at
 * runtime from `server/config/timing/` (override with TIMING_CONFIG_DIR), which
 * is gitignored (fail-closed). This module is POSTURE-AGNOSTIC — it reads the
 * config from the filesystem and FAILS CLOSED (`TimingConfigUnavailableError`)
 * if it is absent. The private-R2 `loadConfidentialConfig` runtime loader
 * (`confidential-config.service.ts`, LG1) populates the in-memory memo via the
 * exported `setRuleSet` setter at boot, WITHOUT touching this file's engine logic:
 * `loadRuleSet()` stays synchronous and simply returns whatever the boot prefetch
 * set (or, for local/dev/harness where R2 is unconfigured, reads the local file on
 * first use exactly as before). If the memo was never populated (prod misconfig)
 * `loadRuleSet()` fails-closed as today and the serving path degrades per-request.
 *
 * Only CLASSICAL astrology tables (sign lords, exaltation/debilitation, natural
 * friendships, graha aspects) live in this committed file — the same public
 * astrology R9's committed `astrology-sidereal.service.ts` already contains.
 * NO rule weight, threshold, or map value is hard-coded here; every one comes
 * from the loaded config, so no trade-secret number is ever committed to git.
 *
 * ── Astronomy reuse (charter STEP 0 constraint) ────────────────────────────
 * The sidereal natal + Vimshottari dasha ladder + the MOMENT chart are ALL
 * produced by R9's `astrology-sidereal.service.ts` (`computeSiderealChart` /
 * `computeVimshottariDasha` / `computeSiderealTransits`). This module REUSES
 * that surface unchanged and NEVER re-issues `swe.set_sid_mode` (R9 owns that
 * lifecycle). R7 adds only: the carve-out gate, the category→house map, the
 * scoring/classification/window logic, the pratyantardasha (PD) sub-division
 * used for window derivation (pure arithmetic over R9's AD, no ephemeris), and
 * eclipse dates (via `swe.sol_eclipse_when_glob` / `lun_eclipse_when` —
 * physical-event calls, ayanamsa-independent, no sidereal mode).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as swe from 'sweph';
import { formatInTimeZone } from 'date-fns-tz';
import {
  NatalChartInput,
  computeBodyPosition,
  norm360,
} from './astrology.service';
import {
  computeSiderealChart,
  computeVimshottariDasha,
  computeSiderealTransits,
  SiderealChart,
  SiderealPosition,
  SiderealBody,
  VimshottariDasha,
  SiderealTransits,
} from './astrology-sidereal.service';
import { ZodiacSign } from '../types/shared';
import { addUtcMonths } from '../utils/frameDate';

const C = swe.constants;

// ===========================================================================
// Fail-closed config loader (posture-agnostic — reads config/env).
// ===========================================================================

export class TimingConfigUnavailableError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'TimingConfigUnavailableError';
  }
}

function configDir(): string {
  return process.env.TIMING_CONFIG_DIR || path.join(__dirname, '../../config/timing');
}

function readConfigFile(name: string): any {
  const p = path.join(configDir(), name);
  if (!fs.existsSync(p)) {
    throw new TimingConfigUnavailableError(
      `Timing Engine config "${name}" not found at ${p}. The confidential rule set is required and is gitignored (fail-closed). Set TIMING_CONFIG_DIR or provision the config.`
    );
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export interface TimingRuleSet {
  carveOut: any;
  karyaBhava: any;
  scoring: any;
  classification: any;
  confidence: any;
  window: any;
  mixed: any;
  language: any;
  neverExpose: any;
}

let _ruleSet: TimingRuleSet | null = null;
export function loadRuleSet(): TimingRuleSet {
  if (_ruleSet) return _ruleSet;
  _ruleSet = readConfigFile('rule-set.json') as TimingRuleSet;
  return _ruleSet;
}

/**
 * Populate the in-memory rule-set memo from an already-loaded source (the private-R2
 * `loadConfidentialConfig` boot prefetch — LG1). This is the ONLY seam the async R2
 * loader needs: after `initTimingConfig()` calls this at boot, every synchronous
 * `loadRuleSet()` caller returns the R2-sourced value with NO engine-logic change.
 * When R2 is unconfigured (local/dev/harness) this is never called and `loadRuleSet`
 * reads the local filesystem config on first use, unchanged.
 */
export function setRuleSet(rs: TimingRuleSet): void {
  _ruleSet = rs;
}
/** True when the confidential rule set is present (Step-0 harness auto-skip). */
export function timingConfigAvailable(): boolean {
  return fs.existsSync(path.join(configDir(), 'rule-set.json'));
}

// ===========================================================================
// CLASSICAL astrology tables (public — committed; NOT trade-secret weights).
// Canonical graha keys are Capitalized ('Sun'..'Saturn','Rahu','Ketu') to match
// the dasha lord names; sidereal positions use lowercase SiderealBody keys.
// ===========================================================================

type Graha = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SIGN_LORD: Record<ZodiacSign, Graha> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const EXALT_SIGN: Partial<Record<Graha, ZodiacSign>> = {
  Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn', Mercury: 'Virgo',
  Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra',
};
// Naisargika (natural) friendships — standard BPHS. Anything not friend/enemy is neutral.
const FRIENDS: Record<Graha, Graha[]> = {
  Sun: ['Moon', 'Mars', 'Jupiter'],
  Moon: ['Sun', 'Mercury'],
  Mars: ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'],
  Venus: ['Mercury', 'Saturn'],
  Saturn: ['Mercury', 'Venus'],
  Rahu: ['Venus', 'Saturn', 'Mercury'],
  Ketu: ['Venus', 'Saturn', 'Mercury'],
};
const ENEMIES: Record<Graha, Graha[]> = {
  Sun: ['Venus', 'Saturn'],
  Moon: [],
  Mars: ['Mercury'],
  Mercury: ['Moon'],
  Jupiter: ['Mercury', 'Venus'],
  Venus: ['Sun', 'Moon'],
  Saturn: ['Sun', 'Moon', 'Mars'],
  Rahu: ['Sun', 'Moon', 'Mars'],
  Ketu: ['Sun', 'Moon', 'Mars'],
};

// Graha rasi-drishti (whole-sign aspect) offsets, in addition to the universal 7th.
const SPECIAL_ASPECTS: Partial<Record<Graha, number[]>> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
  Rahu: [5, 9],
  Ketu: [5, 9],
};

function relation(from: Graha, to: Graha): 'friend' | 'enemy' | 'neutral' {
  if (FRIENDS[from]?.includes(to)) return 'friend';
  if (ENEMIES[from]?.includes(to)) return 'enemy';
  return 'neutral';
}

/** House-distance (1..12) from sign A to sign B (whole-sign). */
function houseDistance(fromSign: ZodiacSign, toSign: ZodiacSign): number {
  return ((SIGNS.indexOf(toSign) - SIGNS.indexOf(fromSign) + 12) % 12) + 1;
}

/** Does graha at `fromSign` cast a rasi aspect onto `toSign`? */
function aspects(graha: Graha, fromSign: ZodiacSign, toSign: ZodiacSign): boolean {
  const d = houseDistance(fromSign, toSign);
  if (d === 7) return true;
  return (SPECIAL_ASPECTS[graha] ?? []).includes(d);
}

const CAP: Record<SiderealBody, Graha> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter',
  venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu',
};
const SWE_ID: Partial<Record<Graha, number>> = {
  Sun: C.SE_SUN, Moon: C.SE_MOON, Mars: C.SE_MARS, Mercury: C.SE_MERCURY,
  Jupiter: C.SE_JUPITER, Venus: C.SE_VENUS, Saturn: C.SE_SATURN,
};

// ===========================================================================
// §5 output contract.
// ===========================================================================

export interface TimingWindow {
  from: string;
  to?: string;
  /** `transit_fallback` (v1.1.1) = the honest no-aligned-boundary-within-horizon
   *  fallback: NO domain-aligned era boundary was found inside the rule set's
   *  `window.noAlignmentFallbackYears`, so the window names the strongest benefic
   *  transit trigger on the natal karya house instead of fabricating a distant
   *  boundary. Distinct from `transit` precisely so the honesty is legible to
   *  callers and the trace, never silently collapsed into an ordinary transit. */
  basis: 'station' | 'ad_boundary' | 'transit' | 'deadline' | 'transit_fallback';
}

/**
 * §5 v1.1 frame object (R17). For a frame-bounded question the engine emits a
 * two-part read: `directional` = the R1–R16 read of the matter itself; `verdict`
 * = the frame-adjusted call (equals directional when the window opens in time,
 * else `unfavorable_for_frame`). ALWAYS present — `bounded:false` when the
 * question carries no time frame. The answer model maps `unfavorable_for_frame`
 * to the two-part "Not within the <frame>… the genuine window opens <when>"
 * pattern (never a bare no).
 */
export interface TimingFrame {
  bounded: boolean;
  end: string | null; // frame_end "YYYY-MM-DD"
  subtype: 'threshold' | 'momentum' | null;
  directional: 'favorable' | 'unfavorable' | 'mixed' | null;
  verdict: 'favorable' | 'unfavorable' | 'mixed' | 'unfavorable_for_frame' | null;
  window: TimingWindow | null;
}

export interface TimingVerdict {
  category: string;
  carve_out: boolean;
  elective_timing_ok: boolean;
  indication: 'favorable' | 'unfavorable' | 'mixed' | null;
  confidence: number | null;
  score: number | null;
  factors_plain: string[];
  window: TimingWindow | null;
  textures: string[];
  frame: TimingFrame;
  tip_condition?: string;
  revisit_date?: string;
  professional_pointer?: string;
}

export interface TimingQuestion {
  category: string;
  /** Server-captured question instant (never the client clock). */
  timestamp: Date;
  location: { lat: number; lng: number; timezone: string };
  deadline?: string | null; // "YYYY-MM-DD"
  askedWindow?: { from?: string; to?: string } | null;
  askedWindowMonths?: number; // "within N months" search window (also feeds frame_end)
  compound?: boolean;
  subQuestions?: string[];
  // ── v1.1 router-fed frame tags (R17 / 2.4a) ────────────────────────────────
  /** True when the router detected an explicit time bound ("by/before/within N").
   *  Defaults to true when a `deadline` is present. */
  frameBounded?: boolean;
  /** 2.4a achievement-question class; drives the window bases the frame verdict may use. */
  frameSubtype?: 'threshold' | 'momentum';
  /** Per-sub-question 2.4a subtype for a compound question (R15): each half of a
   *  split compound carries its own frame subtype (FX6: traction=momentum, scale=threshold). */
  subFrameSubtypes?: Record<string, 'threshold' | 'momentum'>;
}

// ===========================================================================
// Moment-chart input from an instant + IANA tz (the R7 per-question primitive).
// ===========================================================================

function momentInput(q: TimingQuestion): NatalChartInput {
  // Local wall-clock at the question location — computeSiderealChart takes a
  // LOCAL datetime + IANA tz (see toJulianDayUT), NOT a UT instant.
  const ymd = formatInTimeZone(q.timestamp, q.location.timezone, 'yyyy-MM-dd');
  const hm = formatInTimeZone(q.timestamp, q.location.timezone, 'HH:mm');
  const [y, m, d] = ymd.split('-').map(Number);
  return {
    date: new Date(Date.UTC(y, m - 1, d)),
    time: hm,
    timezone: q.location.timezone,
    lat: q.location.lat,
    lng: q.location.lng,
    timeIsAssumed: false,
  };
}

// ===========================================================================
// Chart helpers (over R9's SiderealChart output).
// ===========================================================================

interface ChartView {
  chart: SiderealChart;
  ascSign: ZodiacSign;
  ascSignIdx: number;
  byBody: Map<Graha, SiderealPosition>;
  /** sign occupying house h (1..12) from the ascendant */
  signAtHouse: (h: number) => ZodiacSign;
  /** whole-sign house (1..12) of a sign from the ascendant */
  houseOfSign: (s: ZodiacSign) => number;
}

function view(chart: SiderealChart): ChartView {
  const ascSign = chart.ascendant!.sign;
  const ascSignIdx = SIGNS.indexOf(ascSign);
  const byBody = new Map<Graha, SiderealPosition>();
  for (const p of chart.positions) byBody.set(CAP[p.body], p);
  return {
    chart,
    ascSign,
    ascSignIdx,
    byBody,
    signAtHouse: (h) => SIGNS[(ascSignIdx + h - 1) % 12],
    houseOfSign: (s) => ((SIGNS.indexOf(s) - ascSignIdx + 12) % 12) + 1,
  };
}

// ===========================================================================
// Scoring — one rule contribution, tagged so factors_plain / window can read it.
// ===========================================================================

interface RuleHit {
  rule: string; // internal only ("R1".."R15"); NEVER surfaced
  score: number; // contribution to net S (0 for confidence/append/window-only)
  plain: string; // plain-language factor (no technique names)
  positive: boolean;
}

/** One scored karya chain (R1–R6 for a single primary house). Under R16 a
 *  dual-primary question produces two of these. */
interface ChainResult {
  house: number;
  karyaLord: Graha;
  karyaLordPos: SiderealPosition;
  karyaLordRetro: boolean;
  subtotal: number;
  hits: RuleHit[]; // R1..R6
  r3Fired: boolean;
  r4Fired: boolean;
  textures: string[];
}

interface EngineTrace {
  category: string;
  primaryHouses: number[];
  dualPrimary: boolean;
  chains: ChainResult[]; // one, or two (R16)
  karyaLord: Graha; // stronger chain's lord (drives window/R8/R9)
  karyaHouse: number; // stronger chain's house
  lagnaLord: Graha;
  hits: RuleHit[]; // stronger chain R1–R6 + R16 corroboration + globals
  score: number;
  r3Fired: boolean; // OR across chains (R10 weak-connection test)
  r4Fired: boolean; // OR across chains
  r7Negative: boolean;
  r9StationaryBonus: boolean;
  r13ValidityBonus: boolean;
  karyaLordRetro: boolean; // stronger chain's lord
  textures: string[];
  deadlineApplied: boolean;
  conflictMixed: boolean; // R16 sign-conflict + diff < threshold → force Mixed
  tensionNote?: string;
  /** Earliest R12 benefic transit trigger (Jupiter/Rahu ingress into a natal karya
   *  sign) after now, within the asked window — the 2.4 item-3 window candidate. */
  r12TransitDate: string | null;
  /** v1.1.1 — the STRONGEST benefic transit trigger on the natal karya house over
   *  the FULL forward transit horizon, deliberately NOT clipped to the asked window
   *  (Jupiter ingress preferred; a Rahu ingress only for the R12a amplification
   *  categories). Consumed solely by the 30-year no-alignment fallback, which must
   *  still produce an honest window when the asked window holds no trigger at all. */
  r12FallbackTransitDate: string | null;
  /** v1.1.1 R11a — grahas aligning with the domain by the NATAL-FUNCTIONAL path. */
  natalFunctionalLords: Set<Graha>;
  /** v1.1.1 R11a — natal-functional alignment is era-level: it qualifies a lord at
   *  AD gates only, leaving finer PD boundaries natural-path-only. */
  natalFunctionalAdGatesOnly: boolean;
}

// ===========================================================================
// R1–R6 for a SINGLE karya chain (R16: one per primary house).
// ===========================================================================

function scoreChain(
  house: number,
  category: string,
  rs: TimingRuleSet,
  moment: ChartView,
  externalMatter: boolean
): ChainResult {
  const S = rs.scoring;
  const hits: RuleHit[] = [];
  const textures: string[] = [];
  const add = (rule: string, score: number, plain: string) =>
    hits.push({ rule, score, plain, positive: score >= 0 });

  const karyaSign = moment.signAtHouse(house);
  // Karya lord = the SIGN-RULER of the karya bhava (handover literal). An exalted
  // OCCUPANT of the karya bhava is scored ONLY via R5 (occupants) — never treated
  // as the karya lord (that would double-count it in R1 and R5, and R4's "karya
  // lord standing in the lagna" only a ruler can satisfy).
  const karyaLord = SIGN_LORD[karyaSign];
  const lagnaLord = SIGN_LORD[moment.ascSign];
  const karyaLordPos = moment.byBody.get(karyaLord)!;
  const lagnaLordPos = moment.byBody.get(lagnaLord)!;
  const karyaLordDig = moment.chart.dignities.find((d) => CAP[d.body] === karyaLord)!;

  // ── R1: karya lord dignity ────────────────────────────────────────────────
  {
    let r1 = 0;
    let plain = '';
    if (karyaLordDig.dignity === 'exalted' || karyaLordDig.dignity === 'own' || karyaLordDig.dignity === 'moolatrikona') {
      r1 = S.R1_dignity.exalted_or_own;
      plain = 'the influence that governs this matter is unusually strong right now';
    } else if (karyaLordDig.dignity === 'debilitated') {
      if (isDebilitationCancelled(karyaLord, karyaLordPos, moment)) {
        r1 = S.R1_dignity.debilitated_but_cancelled;
        plain = 'a weak-looking influence over this matter is quietly rescued';
      } else {
        r1 = S.R1_dignity.debilitated;
        plain = 'the influence over this matter is under real strain';
      }
    } else {
      const hostLord = SIGN_LORD[karyaSign];
      const rel2 = relation(karyaLord, hostLord);
      if (rel2 === 'friend') { r1 = S.R1_dignity.friendly; plain = 'this matter sits in supportive surroundings'; }
      else if (rel2 === 'enemy') { r1 = S.R1_dignity.enemy; plain = 'this matter sits in unhelpful surroundings'; }
      else { r1 = S.R1_dignity.neutral; }
    }
    if (r1 !== 0 || plain) add('R1', r1, plain || 'the matter’s governing influence is steady');
  }

  // ── R2: karya lord house from prashna lagna (+ R2a suspension) ─────────────
  {
    const h = karyaLordPos.siderealHouse!;
    const R2 = S.R2_house_from_prashna_lagna;
    let r2 = 0;
    let plain = '';
    const kt = [...R2.kendras, ...R2.trikonas];
    if (kt.includes(h)) { r2 = R2.kendra_or_trikona; plain = 'the matter is well placed to move forward'; }
    else if (R2.dusthanas.includes(h)) {
      if (h === 8 && (R2.exception8thCategories || []).includes(category)) {
        r2 = 1; plain = 'a normally difficult placement actually helps this kind of matter';
      } else if (h === 12 && (R2.exception12thCategories || []).includes(category)) {
        r2 = 1; plain = 'the placement that usually signals loss instead favours a move away';
      } else if (R2.suspendWhenKaryaHouseIsDusthana && R2.dusthanas.includes(house) && h === house) {
        // R2a: the karya bhava for THIS question is itself a 6/8/12 and the karya
        // lord stands in that same house → dusthana penalty for that house is
        // suspended (scored on dignity/strength, no minus). A karya lord in a
        // DIFFERENT dusthana (h !== house) keeps its -1 unless its own exception fired.
        r2 = 0;
      } else { r2 = R2.dusthana; plain = 'the matter is awkwardly placed'; }
    }
    if (r2 !== 0) add('R2', r2, plain);
  }

  // ── R3: lagna lord ↔ karya lord connection ────────────────────────────────
  let r3Fired = false;
  {
    const a = lagnaLordPos.sign, b = karyaLordPos.sign;
    const conj = a === b;
    const mutual = aspects(lagnaLord, a, b) && aspects(karyaLord, b, a);
    const exchange = SIGN_LORD[a] === karyaLord && SIGN_LORD[b] === lagnaLord;
    const oneWay = aspects(lagnaLord, a, b) || aspects(karyaLord, b, a);
    if (conj || mutual || exchange) {
      add('R3', S.R3_lagnalord_karyalord_connection.conjunction_mutual_aspect_or_exchange, 'you and the matter are directly linked');
      r3Fired = true;
    } else if (oneWay) {
      add('R3', S.R3_lagnalord_karyalord_connection.one_way_aspect, 'there is a one-sided link between you and the matter');
      r3Fired = true;
    }
  }

  // ── R4: reach (lagna lord in karya bhava, or karya lord in lagna) ──────────
  let r4Fired = false;
  {
    const lagnaLordInKarya = lagnaLordPos.siderealHouse === house;
    const karyaLordInLagna = karyaLordPos.siderealHouse === 1;
    // Sid's FX1 note: for an EXTERNAL matter, the karya lord in the 1st reads as
    // self-direction and does NOT bridge to the external matter — R4 withheld.
    const externalSelfDirection = karyaLordInLagna && externalMatter;
    if ((lagnaLordInKarya || karyaLordInLagna) && !externalSelfDirection) {
      add('R4', S.R4_reach.value, 'you and the matter reach each other');
      r4Fired = true;
    }
  }

  // ── R5: occupants of the karya bhava (R5a dignity-aware weights) ───────────
  {
    const R5 = S.R5_occupants;
    const waxing = moment.chart.panchanga.paksha === 'Shukla';
    let benefic = 0, malefic = 0, upachaya = 0;
    const upa = R5.upachaya;
    const isUpachayaQ = (upa.categories || []).includes(category);
    const scoreOccupant = (body: SiderealBody, occHouse: number) => {
      if (occHouse !== house) return;
      const g = CAP[body];
      const dig = moment.chart.dignities.find((d) => d.body === body);
      const dignified = dig?.dignity === 'exalted' || dig?.dignity === 'own' || dig?.dignity === 'moolatrikona';
      const isBenefic =
        g === 'Jupiter' || g === 'Venus' ||
        (g === 'Mercury' && !dig?.combust) ||
        (g === 'Moon' && waxing);
      if (isBenefic) {
        benefic += dignified ? R5.benefic_exalted_own_each : R5.benefic_generic_each;
      } else if (isUpachayaQ && upa.houses.includes(occHouse)) {
        upachaya += upa.each;
      } else {
        malefic += dignified ? R5.malefic_exalted_own_each : R5.malefic_generic_each;
      }
    };
    for (const p of moment.chart.positions) {
      if (p.body === 'ketu') continue; // Ketu handled explicitly below (node counted once)
      scoreOccupant(p.body, p.siderealHouse!);
    }
    const ketu = moment.chart.positions.find((p) => p.body === 'ketu')!;
    scoreOccupant('ketu', ketu.siderealHouse!);
    benefic = Math.min(benefic, R5.benefic_cap);
    malefic = Math.max(malefic, R5.malefic_cap);
    const net = benefic + malefic + upachaya;
    if (net !== 0) {
      const plain = net > 0 ? 'helpful influences sit right on the matter' : 'unhelpful influences sit on the matter';
      add('R5', net, plain);
    }
    if (upachaya > 0) textures.push('upachaya_malefic');
  }

  // ── R6: Jupiter aspect on the karya bhava or the lagna ─────────────────────
  {
    const jup = moment.byBody.get('Jupiter')!;
    const jupDig = moment.chart.dignities.find((d) => d.body === 'jupiter')!;
    const targetSigns = [moment.signAtHouse(house), moment.ascSign];
    const influences = targetSigns.some((s) => aspects('Jupiter', jup.sign, s));
    if (influences) {
      const r6 = jupDig.dignity === 'exalted' ? S.R6_jupiter_aspect.exalted_aspecting : S.R6_jupiter_aspect.aspecting;
      add('R6', r6, 'the most benevolent influence is lending this matter its support');
    }
  }

  const subtotal = hits.reduce((a, h) => a + h.score, 0);
  return { house, karyaLord, karyaLordPos, karyaLordRetro: karyaLordPos.retrograde, subtotal, hits, r3Fired, r4Fired, textures };
}

// ===========================================================================
// The rule application over (moment chart, natal, dasha, transits).
// R1–R6 per karya chain (R16); R7/R11/R12/R13/R14 globals applied once.
// ===========================================================================

function applyRules(
  category: string,
  rs: TimingRuleSet,
  moment: ChartView,
  natal: ChartView,
  dasha: VimshottariDasha,
  transits: SiderealTransits,
  q: TimingQuestion,
  natalChart: SiderealChart
): EngineTrace {
  const S = rs.scoring;
  const mapping = resolveKarya(category, rs);
  const primaryHouses = mapping.primary;
  const lagnaLord = SIGN_LORD[moment.ascSign];
  const dual = primaryHouses.length >= 2;

  // ── Per-chain R1–R6 ────────────────────────────────────────────────────────
  const chains = primaryHouses.map((h) => scoreChain(h, category, rs, moment, mapping.externalMatter));
  let strongerIdx = 0;
  for (let i = 1; i < chains.length; i++) if (chains[i].subtotal > chains[strongerIdx].subtotal) strongerIdx = i;
  const stronger = chains[strongerIdx];

  const hits: RuleHit[] = [...stronger.hits];
  const textures: string[] = [...stronger.textures];
  const add = (rule: string, score: number, plain: string) =>
    hits.push({ rule, score, plain, positive: score >= 0 });

  // ── R16: dual-primary combination (corroboration + sign-conflict Mixed) ────
  let conflictMixed = false;
  let tensionNote: string | undefined;
  if (dual) {
    const R16 = S.R16_dual_primary;
    const weaker = chains[strongerIdx === 0 ? 1 : 0];
    if (weaker.subtotal >= R16.corroboration_min_weaker_subtotal) {
      add('R16', R16.corroboration_bonus, 'a second angle on this matter points the same way');
    }
    const a = chains[0].subtotal, b = chains[1].subtotal;
    if (Math.sign(a) !== 0 && Math.sign(b) !== 0 && Math.sign(a) !== Math.sign(b) && Math.abs(a - b) < R16.conflict_diff_threshold) {
      conflictMixed = true;
      tensionNote = 'two sides of this pull in opposite directions and sit too close to call one way';
    }
  }
  // stronger chain R1–R6 + R16 corroboration currently in `hits`.

  const r3Fired = chains.some((c) => c.r3Fired);
  const r4Fired = chains.some((c) => c.r4Fired);

  // ── Globals (applied ONCE per R16) ─────────────────────────────────────────
  // R7: Moon condition
  let r7Negative = false;
  {
    const moon = moment.byBody.get('Moon')!;
    const inPrashna8th = moon.siderealHouse === 8;
    const near = withinHoursOfAmavasya(moment.chart, S.R7_moon.amavasyaHours);
    if (inPrashna8th || near) {
      add('R7', S.R7_moon.within_72h_amavasya_or_moon_in_prashna_8th, 'the emotional/receptive backdrop is weak just now');
      r7Negative = true;
    } else if (moment.chart.panchanga.paksha === 'Shukla') {
      add('R7', S.R7_moon.waxing_unafflicted, 'the receptive backdrop is bright and building');
    }
  }

  // R8: karya lord (stronger chain) retrograde / combust
  const karyaLord = stronger.karyaLord;
  const karyaLordPos = stronger.karyaLordPos;
  const karyaLordDig = moment.chart.dignities.find((d) => CAP[d.body] === karyaLord)!;
  const karyaLordRetro = karyaLordPos.retrograde;
  {
    if (karyaLordPos.retrograde) textures.push('revisit_after_station');
    if (karyaLordDig.combust) {
      if (karyaLordDig.dignity === 'own' || karyaLordDig.dignity === 'exalted' || karyaLordDig.dignity === 'moolatrikona') {
        add('R8', S.R8_karya_lord_motion.combust_own_or_exalted_score, 'this matures later than it looks — the substance is there');
        textures.push('combust_but_dignified');
      } else {
        add('R8', S.R8_karya_lord_motion.combust_score, 'the matter is a little overshadowed right now');
      }
    }
  }

  // R9: karya lord stationary (confidence-only)
  const r9StationaryBonus = Math.abs(karyaLordPos.speed) < S.R9_stationary.speedThreshold
    && karyaLord !== 'Rahu' && karyaLord !== 'Ketu';

  // R11 (+ R11a two-path, v1.1.1): natal dasha AD-lord alignment.
  // Path 1 = the natural signification table; path 2 = the natal-functional test
  // (the running AD lord occupies or rules a natal karya house for the category).
  const nfLords = natalFunctionalLords(primaryHouses, natal, mapping.mapped, rs);
  {
    const adLord = (dasha.current?.antardashaLord || '') as Graha;
    const sig: Record<string, string[]> = S.R11_dasha_alignment.signification;
    const domain = domainTags(category);
    const adTags = sig[adLord] || [];
    const nf = S.R11_dasha_alignment.natalFunctional;
    const naturalMatch = !!adLord && adTags.some((t) => domain.includes(t));
    const natalFunctionalMatch = !!adLord && nfLords.has(adLord);
    // Whether a natal-functional match on the RUNNING period earns the ±1 or only
    // the texture is the one v1.1.1 ambiguity Sid still owes a call on — hence a
    // config key rather than a hard-coded reading (see `_runningPeriodScores`).
    const natalFunctionalScores = natalFunctionalMatch && nf?.runningPeriodScores !== false;
    if (naturalMatch || natalFunctionalScores) {
      add('R11', S.R11_dasha_alignment.signifies, 'the period you are in naturally favours this kind of matter');
    }
    // v1.1.1 FX3 note — a natal-functional match on the RUNNING period cannot be the
    // window start (a running period is not a future boundary), but it is not
    // discarded either: it carries the "already in motion" texture.
    if (natalFunctionalMatch && nf?.runningPeriodTexture) textures.push(nf.runningPeriodTexture);
  }

  // R12(a): transit trigger on the NATAL karya house inside the asked window
  let r12TransitDate: string | null = null;
  let r12FallbackTransitDate: string | null = null;
  {
    const R12 = S.R12_transit_trigger;
    const natalKaryaSigns = primaryHouses.map((h) => natal.signAtHouse(h));
    const winEnd = askedWindowEnd(q);
    const nowJd = jdFromDate(q.timestamp);
    const inWindow = (dateStr: string) => {
      const jd = jdFromISODate(dateStr);
      return jd >= nowJd && (winEnd === null || jd <= winEnd);
    };
    const rahuAmp = (R12.rahuAmplificationCategories || []).includes(category);
    let r12 = 0;
    const triggerDates: string[] = [];
    for (const ing of transits.ingresses.jupiter) {
      if (natalKaryaSigns.includes(ing.sign) && inWindow(ing.date)) { r12 += R12.jupiter_ingress_or_aspect; triggerDates.push(ing.date); break; }
    }
    // R12a: Rahu ingress INTO, or PRESENCE IN, the natal karya house.
    const rahuNow = moment.byBody.get('Rahu')!;
    const rahuPresent = natalKaryaSigns.includes(rahuNow.sign);
    let rahuIngressDate: string | null = null;
    for (const ing of transits.ingresses.rahu) {
      if (natalKaryaSigns.includes(ing.sign) && inWindow(ing.date)) { rahuIngressDate = ing.date; break; }
    }
    if (rahuPresent || rahuIngressDate) {
      r12 += rahuAmp ? R12.rahu_ingress_amplification_only : R12.rahu_ingress_else;
      // Only a FUTURE ingress supplies a window date; a present Rahu (already
      // in the house) gives the +1 score but no forward window event.
      if (rahuIngressDate) triggerDates.push(rahuIngressDate);
    }
    for (const ing of transits.ingresses.saturn) {
      if (natalKaryaSigns.includes(ing.sign) && inWindow(ing.date)) { textures.push('slow_durable'); break; }
    }
    if (r12 !== 0) add('R12', r12, 'a supportive shift is moving over this area in the window ahead');
    triggerDates.sort();
    r12TransitDate = triggerDates[0] || null;

    // v1.1.1 — the 30-year-fallback candidate: the STRONGEST benefic trigger on the
    // natal karya house over the whole forward horizon, NOT clipped to the asked
    // window (the asked window may hold no trigger at all, and the fallback still
    // owes the user an honest window rather than a fabricated boundary). Jupiter is
    // the benefic and wins; a Rahu ingress qualifies only where R12a lets it score.
    const afterNow = (dateStr: string) => jdFromISODate(dateStr) >= nowJd;
    const jupFallback = transits.ingresses.jupiter
      .filter((ing) => natalKaryaSigns.includes(ing.sign) && afterNow(ing.date))
      .map((ing) => ing.date)
      .sort()[0] || null;
    const rahuFallback = rahuAmp
      ? (transits.ingresses.rahu
          .filter((ing) => natalKaryaSigns.includes(ing.sign) && afterNow(ing.date))
          .map((ing) => ing.date)
          .sort()[0] || null)
      : null;
    r12FallbackTransitDate = jupFallback || rahuFallback;
  }

  // R14: prashna lagna degree textures (append-only)
  {
    const deg = moment.chart.ascendant!.degree;
    if (deg < S.R14_lagna_degree.firstDegreeMax) textures.push('newly_forming');
    else if (deg >= S.R14_lagna_degree.lastDegreeMin) textures.push('at_a_transition');
  }

  // R13: validity (confidence-only)
  const r13ValidityBonus = validityWithinOrb(moment.chart, natalChart, S.R13_validity.orbDegrees);

  const score = hits.reduce((a, h) => a + h.score, 0);

  return {
    category,
    primaryHouses,
    dualPrimary: dual,
    chains,
    karyaLord,
    karyaHouse: stronger.house,
    lagnaLord,
    hits,
    score,
    r3Fired,
    r4Fired,
    r7Negative,
    r9StationaryBonus,
    r13ValidityBonus,
    karyaLordRetro,
    textures,
    deadlineApplied: false,
    conflictMixed,
    tensionNote,
    r12TransitDate,
    r12FallbackTransitDate,
    natalFunctionalLords: nfLords,
    natalFunctionalAdGatesOnly: S.R11_dasha_alignment.natalFunctional?.antardashaGatesOnly === true,
  };
}

// ── Rule helpers ────────────────────────────────────────────────────────────

interface KaryaMapping {
  primary: number[];
  secondary: number[];
  externalMatter: boolean;
  /** False when the 1st-house primary is the DEGRADATION default rather than a real
   *  §2.1 karya row — gates the R11a natal-functional path (v1.1.1). */
  mapped: boolean;
}

function resolveKarya(category: string, rs: TimingRuleSet): KaryaMapping {
  const m = rs.karyaBhava.map[category] || rs.karyaBhava.compound?.[category];
  if (!m) {
    // Unmapped → caller should route to reflective; default to 1st house so the
    // engine degrades rather than throws.
    return { primary: [1], secondary: [], externalMatter: false, mapped: false };
  }
  const externalMatter = category === 'job_external' || category === 'job_promotion';
  return { primary: m.primary, secondary: m.secondary || [], externalMatter, mapped: true };
}

function isDebilitationCancelled(lord: Graha, pos: SiderealPosition, moment: ChartView): boolean {
  // (a) the planet is exalted in navamsa
  if (EXALT_SIGN[lord] === pos.navamsaSign) return true;
  // (b) dispositor OR the exalting planet in a kendra from lagna or Moon
  const kendras = [1, 4, 7, 10];
  const moon = moment.byBody.get('Moon')!;
  const kendraFrom = (s: ZodiacSign, fromSign: ZodiacSign) => kendras.includes(houseDistance(fromSign, s));
  const dispositor = SIGN_LORD[pos.sign];
  const dispP = moment.byBody.get(dispositor);
  if (dispP && (kendraFrom(dispP.sign, moment.ascSign) || kendraFrom(dispP.sign, moon.sign))) return true;
  const exalter = (Object.keys(EXALT_SIGN) as Graha[]).find((g) => EXALT_SIGN[g] === pos.sign);
  if (exalter) {
    const exP = moment.byBody.get(exalter);
    if (exP && (kendraFrom(exP.sign, moment.ascSign) || kendraFrom(exP.sign, moon.sign))) return true;
  }
  return false;
}

function withinHoursOfAmavasya(chart: SiderealChart, hours: number): boolean {
  // Approximate: tithi 30 (amavasya) proximity. Each tithi ≈ 0.984 day. Distance
  // in tithi units → hours. Handles the window just BEFORE amavasya (tithiIndex
  // approaching 30) and just after (tithiIndex 1..). Amavasya itself → true.
  const ti = chart.panchanga.tithiIndex; // 1..30
  const tithisToAmavasya = ti <= 30 ? (30 - ti) : 0;
  const nearBefore = tithisToAmavasya * 24 <= hours; // ti ≥ 27 → within ~72h before
  const nearAfter = (ti <= Math.ceil(hours / 24)) && ti >= 1 && ti <= 3; // ti 1..3 → within ~72h after
  return ti === 30 || nearBefore || nearAfter;
}

function validityWithinOrb(moment: SiderealChart, natal: SiderealChart, orb: number): boolean {
  const pMoon = moment.positions.find((p) => p.body === 'moon')!.longitude;
  const pLagna = moment.ascendant!.longitude;
  const nMoon = natal.positions.find((p) => p.body === 'moon')!.longitude;
  const nLagna = natal.ascendant!.longitude;
  const sep = (a: number, b: number) => { let d = Math.abs(norm360(a) - norm360(b)) % 360; if (d > 180) d = 360 - d; return d; };
  return [pMoon, pLagna].some((p) => sep(p, nMoon) <= orb || sep(p, nLagna) <= orb);
}

function domainTags(category: string): string[] {
  const map: Record<string, string[]> = {
    job_external: ['authority', 'recognition', 'structure', 'labor'],
    job_promotion: ['authority', 'recognition'],
    own_venture: ['action', 'commerce', 'unconventional', 'amplification'],
    venture_scale: ['action', 'commerce', 'amplification', 'unconventional'],
    traction_signs: ['commerce', 'advisory', 'amplification', 'unconventional', 'systems'],
    scale_metric_within_6mo: ['amplification', 'wealth', 'commerce'],
    honors_gains: ['recognition', 'advisory', 'wealth', 'counsel'],
    property_to_income: ['commerce', 'property', 'systems', 'wealth'],
    property_purchase: ['property', 'comfort'],
    property_sale: ['property', 'commerce'],
    relationship: ['relationship', 'comfort', 'arts'],
    marriage: ['relationship', 'comfort'],
    // v1.1.1: the relocation domain gains the displacement-class tags so Ketu's
    // NEW natural significations (displacement / relocation / pilgrimage) can
    // reach it — the patch's stated purpose for extending the Ketu row.
    relocation: ['foreign', 'unconventional', 'displacement', 'relocation'],
    foreign_move: ['foreign', 'unconventional', 'displacement', 'relocation'],
    education_exams: ['teaching', 'documents', 'advisory'],
    dispute_litigation: ['competition', 'action', 'structure'],
    elective_timing_ok: ['comfort', 'arts'],
    reputation: ['authority', 'recognition', 'public'],
    hidden_research: ['research', 'severance', 'simplification'],
    spiritual: ['spiritual', 'severance', 'simplification', 'pilgrimage'],
  };
  return map[category] || [];
}

// ===========================================================================
// R11a (v1.1.1) — TWO-PATH DOMAIN ALIGNMENT.
// ===========================================================================

/**
 * The set of grahas that align with the question domain by the R11a NATAL-FUNCTIONAL
 * path: in the QUERENT'S natal chart the graha OCCUPIES a natal karya house for the
 * category, or RULES one by sign lordship. Nodes qualify by OCCUPANCY ONLY (classical
 * — no sign lordships are assigned to Rahu/Ketu).
 *
 * Computed ONCE per run (it depends only on the natal chart + the category's karya
 * houses), then consulted by both R11 places: the ±1 scoring factor and the 2.4
 * window scan. Returns an EMPTY set when the path does not apply, so every caller
 * degrades to natural-path-only behaviour identical to v1.1.
 */
function natalFunctionalLords(
  primaryHouses: number[],
  natal: ChartView,
  categoryMapped: boolean,
  rs: TimingRuleSet
): Set<Graha> {
  const nf = rs.scoring.R11_dasha_alignment.natalFunctional;
  const out = new Set<Graha>();
  if (!nf || nf.enabled !== true) return out;
  // A karya house we INVENTED (unmapped category / the elective_timing_ok
  // timing-quality path both degrade to the 1st) is not a karya bhava — testing
  // occupancy of it would manufacture alignment out of a fallback.
  if (nf.requiresMappedKaryaHouse === true && !categoryMapped) return out;

  const nodes: Graha[] = nf.nodes || ['Rahu', 'Ketu'];
  const karyaSigns = primaryHouses.map((h) => natal.signAtHouse(h));

  // (a) OCCUPIES a natal karya house — available to every graha, nodes included.
  if (nf.occupies !== false) {
    for (const [g, pos] of natal.byBody) {
      if (primaryHouses.includes(pos.siderealHouse!)) out.add(g);
    }
  }
  // (b) RULES a natal karya house by sign lordship — NOT available to the nodes.
  if (nf.rules !== false) {
    for (const s of karyaSigns) {
      const lord = SIGN_LORD[s];
      if (nf.nodesOccupancyOnly === true && nodes.includes(lord)) continue;
      out.add(lord);
    }
  }
  return out;
}

// ===========================================================================
// Classification + confidence.
// ===========================================================================

function classify(trace: EngineTrace, rs: TimingRuleSet, frameBounded: boolean): {
  indication: 'favorable' | 'unfavorable' | 'mixed';
  confidence: number;
  structuralMiss: boolean;
} {
  const cls = rs.classification;
  const S = trace.score;
  let indication: 'favorable' | 'unfavorable' | 'mixed';
  let structuralMiss = false;

  if (S >= cls.favorableMin) indication = 'favorable';
  else if (S <= cls.unfavorableMax) indication = 'unfavorable';
  else indication = 'mixed';

  // ── R16 sign-conflict on a dual-primary chain → force Mixed ─────────────────
  if (trace.conflictMixed) indication = 'mixed';

  // ── R10 (retained INSIDE R17 as the weak-connection case) ───────────────────
  // Frame-bounded question with neither R3 nor R4 fired → cap the DIRECTIONAL
  // read at Mixed; Unfavorable if the Moon is also weak.
  const R17 = rs.scoring.R17_frame_bounded;
  if (frameBounded && R17.r10_capAtMixedIfNoR3R4 && !trace.r3Fired && !trace.r4Fired) {
    trace.deadlineApplied = true;
    if (indication === 'favorable') indication = 'mixed';
    if (R17.r10_unfavorableIfAlsoMoonWeak && trace.r7Negative) { indication = 'unfavorable'; structuralMiss = true; }
  }

  // ── Confidence (§2.3) ──────────────────────────────────────────────────────
  const cf = rs.confidence;
  let conf = cf.start;
  let perPoint = 0;
  if (indication === 'favorable') perPoint = (S - cls.favorableMin) * cf.perPointAboveThreshold;
  else if (indication === 'unfavorable') perPoint = (Math.abs(S) - Math.abs(cls.unfavorableMax)) * cf.perPointAboveThreshold;
  if (structuralMiss) perPoint = cf.perPointBonusCap; // a structural weak-connection miss is a definitive call
  perPoint = Math.max(0, Math.min(perPoint, cf.perPointBonusCap));
  conf += perPoint;
  if (trace.r9StationaryBonus) conf += rs.scoring.R9_stationary.confidenceBonus;
  if (trace.r13ValidityBonus) conf += rs.scoring.R13_validity.confidenceBonus;
  if (trace.r7Negative) conf += cf.r7NegativePenalty;
  conf = Math.max(cf.clampLo, Math.min(cf.clampHi, conf));
  conf = Math.round(conf / cf.roundTo) * cf.roundTo;

  return { indication, confidence: conf, structuralMiss };
}

// ===========================================================================
// Window derivation (§2.4) — station / ad_boundary / transit / deadline.
// ===========================================================================

/** 2.4a — the window bases a given subtype may draw on. threshold excludes
 *  transits (era boundaries complete matters); momentum / non-frame use all. */
function windowBasesFor(subtype: 'threshold' | 'momentum' | null, rs: TimingRuleSet): string[] {
  const classes = rs.window.classes || {};
  if (subtype === 'threshold') return classes.threshold || ['station', 'ad_boundary'];
  return classes.momentum || ['station', 'ad_boundary', 'transit'];
}

function deriveWindow(
  trace: EngineTrace,
  rs: TimingRuleSet,
  q: TimingQuestion,
  dasha: VimshottariDasha,
  subtype: 'threshold' | 'momentum' | null
): { window: TimingWindow | null; revisitDate: string | null } {
  const nowJd = jdFromDate(q.timestamp);

  // Deadline questions → basis 'deadline' (state inside/outside the asked date).
  if (q.deadline) {
    const from = monthOf(q.timestamp);
    // the genuine window may fall outside the deadline — surface honestly
    const strong = nextDomainBoundary(trace, dasha, nowJd) || trace.r12TransitDate;
    const to = q.deadline.slice(0, 7);
    return { window: { from, to, basis: 'deadline' }, revisitDate: strong ? strong.slice(0, 7) : to };
  }

  // §2.4 as amended by 2.4a — collect the applicable candidates for this subtype,
  // then take the EARLIEST DATE (not a fixed priority order).
  const allowed = windowBasesFor(subtype, rs);
  // 2.4a: a threshold matter completes at ANTARDASHA gates only (era boundaries);
  // finer pratyantardasha progress signals belong to momentum.
  const adOnly = subtype === 'threshold' && rs.window.thresholdUsesAntardashaGatesOnly === true;
  const cands: { date: string; basis: TimingWindow['basis']; to?: string }[] = [];

  // 1) karya lord direct station, if retrograde now (act after it).
  if (allowed.includes('station') && trace.karyaLordRetro) {
    const station = nextDirectStation(trace.karyaLord, q.timestamp);
    if (station) {
      const strengthen = nextDomainBoundary(trace, dasha, jdFromISODate(station), adOnly);
      cands.push({ date: station, basis: 'station', to: strengthen ? strengthen.slice(0, 7) : undefined });
    }
  }
  // 2) next PD/AD boundary whose incoming lord aligns with the domain (R11a two-path).
  let alignedBoundaryFound = false;
  if (allowed.includes('ad_boundary')) {
    const adb = nextDomainBoundary(trace, dasha, nowJd, adOnly);
    if (adb) {
      alignedBoundaryFound = true;
      cands.push({ date: adb, basis: 'ad_boundary', to: addMonths(adb, 3).slice(0, 7) });
    }
  }
  // 3) next benefic transit trigger from R12 (momentum only — 2.4a).
  if (allowed.includes('transit') && trace.r12TransitDate) {
    cands.push({ date: trace.r12TransitDate, basis: 'transit' });
  }

  // 4) v1.1.1 — 30-YEAR NO-ALIGNMENT FALLBACK. No domain-aligned boundary inside the
  // horizon → name the strongest benefic transit trigger on the natal karya house and
  // SAY SO in the basis (`transit_fallback` + texture). NEVER fabricate a distant
  // boundary. This is allowed to use a transit even for the 2.4a threshold class,
  // which normally excludes transits: an honest transit-grade window is worth more
  // than a fabricated era boundary, and the basis makes the difference legible.
  if (allowed.includes('ad_boundary') && !alignedBoundaryFound && trace.r12FallbackTransitDate) {
    cands.push({
      date: trace.r12FallbackTransitDate,
      basis: rs.window.noAlignmentFallbackBasis || 'transit_fallback',
    });
    trace.textures.push('window_beyond_alignment_horizon');
  }

  if (cands.length === 0) return { window: null, revisitDate: null };
  cands.sort((a, b) => a.date.localeCompare(b.date));
  const w = cands[0];
  void beyond24Months(w.date, q.timestamp, rs.window.beyondMonthsHonest);
  const window: TimingWindow = { from: w.date.slice(0, 7), basis: w.basis };
  if (w.to) window.to = w.to;
  return { window, revisitDate: w.date.slice(0, 7) };
}

/** Next AD boundary — or, unless `adOnly`, the finer PD sub-division boundary —
 * (start) after `afterJd` whose incoming lord ALIGNS with the question domain by
 * EITHER R11a path. PD is pure Vimshottari proportion within R9's AD (no ephemeris,
 * no module change). `adOnly` = the 2.4a threshold class, which completes at
 * ANTARDASHA (era) gates only; PD progress signals are momentum-level.
 *
 * v1.1.1 changes, both of them deliberate:
 *  - TWO-PATH alignment (R11a): natural significations OR the natal-functional set.
 *    The natal-functional path is ERA-LEVEL, so under `natalFunctionalAdGatesOnly`
 *    it qualifies a lord at AD gates only and PD boundaries stay natural-path-only.
 *  - HORIZON: boundaries beyond `window.noAlignmentFallbackYears` are NOT returned.
 *    Returning null here is what triggers the honest transit fallback in
 *    `deriveWindow` instead of surfacing a far-future boundary as if it meant
 *    something (the v1.1 defect that put FX6b at 2035).
 */
function nextDomainBoundary(
  trace: EngineTrace,
  dasha: VimshottariDasha,
  afterJd: number,
  adOnly = false
): string | null {
  const domain = domainTags(trace.category);
  const rs = loadRuleSet();
  const sig: Record<string, string[]> = rs.scoring.R11_dasha_alignment.signification;
  const naturalAligns = (lord: string) => (sig[lord] || []).some((t) => domain.includes(t));
  const natalFunctionalAligns = (lord: string, isAdGate: boolean) => {
    if (trace.natalFunctionalAdGatesOnly && !isAdGate) return false;
    return trace.natalFunctionalLords.has(lord as Graha);
  };

  const horizonYears = rs.window.noAlignmentFallbackYears;
  const horizonJd = typeof horizonYears === 'number' ? afterJd + horizonYears * 365.25 : Infinity;

  const boundaries: { date: string; lord: string; isAdGate: boolean }[] = [];
  for (const md of dasha.mahadashas) {
    for (const ad of md.antardashas) {
      boundaries.push({ date: ad.start, lord: ad.lord, isAdGate: true });
      if (!adOnly) {
        for (const pd of pratyantardashas(ad.lord, ad.start, ad.end)) {
          // The first PD of an AD starts exactly at the AD gate — keep the AD-gate
          // flag on that shared instant so the era-level path is not lost to it.
          const isAdGate = pd.date === ad.start;
          boundaries.push({ date: pd.date, lord: pd.lord, isAdGate });
        }
      }
    }
  }
  boundaries.sort((a, b) => a.date.localeCompare(b.date));
  for (const b of boundaries) {
    const jd = jdFromISODate(b.date);
    if (jd <= afterJd) continue;
    if (jd > horizonJd) return null; // no aligned boundary inside the horizon
    if (naturalAligns(b.lord) || natalFunctionalAligns(b.lord, b.isAdGate)) return b.date;
  }
  return null;
}

const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

/** Pratyantardasha boundaries within an AD (pure proportion; boundaries only). */
function pratyantardashas(adLord: string, adStart: string, adEnd: string): { date: string; lord: string }[] {
  const startJd = jdFromISODate(adStart);
  const endJd = jdFromISODate(adEnd);
  const total = endJd - startJd;
  const out: { date: string; lord: string }[] = [];
  const startIdx = DASHA_ORDER.indexOf(adLord);
  let cursor = startJd;
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(startIdx + i) % 9];
    out.push({ date: isoDateFromJd(cursor), lord });
    cursor += total * (DASHA_YEARS[lord] / 120);
  }
  return out;
}

/** Next date the (retrograde) graha turns direct, scanning forward from `from`. */
function nextDirectStation(lord: Graha, from: Date): string | null {
  const id = SWE_ID[lord];
  if (id === undefined) return null;
  let jd = jdFromDate(from);
  let prev = signedSpeed(id, jd);
  for (let i = 0; i < 400; i++) {
    jd += 2;
    const sp = signedSpeed(id, jd);
    if (prev < 0 && sp >= 0) {
      // bisect
      let lo = jd - 2, hi = jd;
      for (let k = 0; k < 40 && hi - lo > 0.02; k++) {
        const mid = (lo + hi) / 2;
        if (signedSpeed(id, mid) < 0) lo = mid; else hi = mid;
      }
      return isoDateFromJd(hi);
    }
    prev = sp;
  }
  return null;
}

function signedSpeed(id: number, jd: number): number {
  const p = computeBodyPosition(jd, id, C.SEFLG_MOSEPH | C.SEFLG_SPEED); // tropical speed sign == sidereal
  return p ? p.speed : 0;
}

// ===========================================================================
// Eclipse dates within a window (R12 append + FX5 avoid-note).
// ===========================================================================

export function eclipseDatesInWindow(fromISO: string, toISO: string): string[] {
  const fromJd = jdFromISODate(fromISO);
  const toJd = jdFromISODate(toISO);
  const out: string[] = [];
  // solar (global) + lunar
  let jd = fromJd;
  for (let i = 0; i < 30; i++) {
    // NB: sweph's .d.ts types `backwards` as number here, but the native binding
    // requires a boolean at runtime — pass false, cast to satisfy the stale type.
    const s = swe.sol_eclipse_when_glob(jd, C.SEFLG_MOSEPH, 0, false as unknown as number);
    if (s.flag < 0) break;
    if (s.data[0] > toJd) break;
    if (s.data[0] >= fromJd) out.push(isoDateFromJd(s.data[0]));
    jd = s.data[0] + 10;
  }
  jd = fromJd;
  for (let i = 0; i < 30; i++) {
    const l = swe.lun_eclipse_when(jd, C.SEFLG_MOSEPH, 0, false);
    if (l.flag < 0) break;
    if (l.data[0] > toJd) break;
    if (l.data[0] >= fromJd) out.push(isoDateFromJd(l.data[0]));
    jd = l.data[0] + 10;
  }
  return out.sort();
}

// ===========================================================================
// Date/JD helpers.
// ===========================================================================

function jdFromDate(d: Date): number {
  const h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  return swe.julday(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h, C.SE_GREG_CAL);
}
function jdFromISODate(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return swe.julday(y, m, d, 0, C.SE_GREG_CAL);
}
function isoDateFromJd(jd: number): string {
  const r = swe.revjul(jd, C.SE_GREG_CAL);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${r.year}-${p(r.month)}-${p(Math.floor(r.day))}`;
}
function monthOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function addMonths(iso: string, n: number): string {
  const [y, m] = iso.slice(0, 7).split('-').map(Number);
  const total = (y * 12 + (m - 1)) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}
function beyond24Months(iso: string, from: Date, months: number): boolean {
  return jdFromISODate(iso) - jdFromDate(from) > months * 30.44;
}
function askedWindowEnd(q: TimingQuestion): number | null {
  if (q.deadline) return jdFromISODate(q.deadline);
  if (q.askedWindow?.to) return jdFromISODate(q.askedWindow.to + '-28');
  if (q.askedWindowMonths) return jdFromDate(q.timestamp) + q.askedWindowMonths * 30.44;
  return null;
}

/** R17 frame_end: the deadline date, or timestamp + askedWindowMonths (for
 *  "within N months"). "YYYY-MM-DD" or null when the question is not frame-bounded.
 *  The relative-window branch uses the shared `addUtcMonths` (`utils/frameDate.ts`)
 *  — the SAME month-add the router's `resolveFrame` uses, so the two cannot drift. */
function frameEndFrom(q: TimingQuestion): string | null {
  if (q.deadline) return q.deadline.slice(0, 10);
  if (q.askedWindowMonths) return addUtcMonths(q.timestamp, q.askedWindowMonths);
  return null;
}

// ===========================================================================
// Carve-out gate (§2.0) — runs FIRST.
// ===========================================================================

function carveOutVerdict(category: string): TimingVerdict {
  return {
    category,
    carve_out: true,
    elective_timing_ok: false,
    indication: null,
    confidence: null,
    score: null,
    factors_plain: ['this is a question best answered by a qualified professional; here is the reflective side of it'],
    window: null,
    textures: [],
    frame: { bounded: false, end: null, subtype: null, directional: null, verdict: null, window: null },
    professional_pointer: 'point the user to the right professional in one sentence (medical, legal, or financial as appropriate)',
  };
}

function isCarveOut(category: string, rs: TimingRuleSet): boolean {
  return (rs.carveOut.categories || []).includes(category);
}

// ===========================================================================
// factors_plain assembly (top contributors, plain language, never-expose safe).
// ===========================================================================

function buildFactors(trace: EngineTrace): string[] {
  const sorted = [...trace.hits].filter((h) => h.plain);
  // strongest-magnitude first, matching the read's direction where possible
  sorted.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const picked = sorted.slice(0, 3).map((h) => h.plain);
  if (picked.length === 0) picked.push('the chart says little that is decisive about this right now');
  assertNoNeverExpose(picked);
  return picked;
}

function assertNoNeverExpose(strings: string[]): void {
  const rs = loadRuleSet();
  const terms: string[] = rs.neverExpose.terms;
  for (const s of strings) {
    const low = s.toLowerCase();
    for (const t of terms) {
      if (low.includes(t.toLowerCase())) {
        throw new Error(`Timing Engine invariant violated: factor leaked a never-expose term "${t}"`);
      }
    }
  }
}

// ===========================================================================
// Public entry point.
// ===========================================================================

/**
 * Run the Timing Engine for one question. Returns the §5 output contract object,
 * or an ARRAY of two verdict objects for a compound question (FX6 — never
 * averaged). Carve-out categories short-circuit to a reflective + pointer verdict.
 */
export async function runTimingEngine(
  q: TimingQuestion,
  natalInput: NatalChartInput
): Promise<TimingVerdict | TimingVerdict[]> {
  const rs = loadRuleSet();

  // Compound → decompose into sub-questions, score each, return multiple objects.
  // Each sub carries its OWN 2.4a frame subtype (R15 + 2.4a) — this is what lets a
  // split compound return different frame verdicts for its halves (FX6a vs FX6b).
  if (q.compound && q.subQuestions && q.subQuestions.length > 0) {
    const out: TimingVerdict[] = [];
    for (const sub of q.subQuestions) {
      const v = await runSingle(
        {
          ...q,
          category: sub,
          compound: false,
          subQuestions: undefined,
          frameSubtype: q.subFrameSubtypes?.[sub] ?? q.frameSubtype,
        },
        natalInput,
        rs
      );
      out.push(v);
    }
    return out;
  }
  return runSingle(q, natalInput, rs);
}

async function runSingle(q: TimingQuestion, natalInput: NatalChartInput, rs: TimingRuleSet): Promise<TimingVerdict> {
  const electiveOk = q.category === rs.carveOut.electiveTimingOk.category;

  // ── CARVE-OUT GATE FIRST (§2.0) ────────────────────────────────────────────
  if (isCarveOut(q.category, rs)) {
    return carveOutVerdict(q.category);
  }

  // ── Astronomy — ALL via R9's module (no set_sid_mode here) ─────────────────
  const momentChart = computeSiderealChart(momentInput(q));
  const natalChart = computeSiderealChart(natalInput);
  const natalMoonLon = natalChart.positions.find((p) => p.body === 'moon')!.longitude;
  const dasha = computeVimshottariDasha(natalInput, natalMoonLon, q.timestamp);
  const transits = await computeSiderealTransits(natalInput, natalChart, q.timestamp);

  const moment = view(momentChart);
  const natal = view(natalChart);

  // For elective_timing_ok the karya defaults to the 1st (body/appearance) when
  // the category is not itself in the karya map (timing quality only).
  const traceCategory = rs.karyaBhava.map[q.category] ? q.category : (electiveOk ? 'elective_timing_ok' : q.category);
  const trace = applyRules(traceCategory, rs, moment, natal, dasha, transits, q, natalChart);
  void moment;

  // ── Frame detection (R17 / 2.4a) ───────────────────────────────────────────
  const frameBounded = q.frameBounded ?? !!q.deadline;
  const subtype: 'threshold' | 'momentum' | null = frameBounded ? (q.frameSubtype ?? null) : null;
  const frameEnd = frameBounded ? frameEndFrom(q) : null;

  // Directional read (R1–R16, with R10 weak-connection cap when frame-bounded).
  const { indication: directional, confidence: directionalConf } = classify(trace, rs, frameBounded);
  const { window, revisitDate } = deriveWindow(trace, rs, q, dasha, subtype);

  // ── R17 two-part frame verdict ─────────────────────────────────────────────
  const R17 = rs.scoring.R17_frame_bounded;
  let topIndication: 'favorable' | 'unfavorable' | 'mixed' = directional;
  let topConfidence = directionalConf;
  let frameVerdict: TimingFrame['verdict'] = null;
  let frameRevisit: string | null = null;
  if (frameBounded) {
    const windowOpen = window ? window.from : null; // "YYYY-MM"
    const endMonth = frameEnd ? frameEnd.slice(0, 7) : null;
    if (!windowOpen || !endMonth) {
      // window cannot be resolved → Mixed + revisit at the window opening (if any)
      frameVerdict = 'mixed';
      topIndication = 'mixed';
      frameRevisit = revisitDate;
    } else {
      const opensAfter = windowOpen > endMonth;
      const opensStraddle = !opensAfter && !!window!.to && window!.to > endMonth;
      if (opensAfter) {
        if (directional === 'favorable') { frameVerdict = 'unfavorable_for_frame'; topIndication = 'unfavorable'; topConfidence = R17.unfavorableForFrameConfidence; }
        else if (directional === 'unfavorable') { frameVerdict = 'unfavorable'; topIndication = 'unfavorable'; }
        else { frameVerdict = 'mixed'; topIndication = 'mixed'; frameRevisit = windowOpen; }
      } else if (opensStraddle) {
        frameVerdict = 'mixed'; topIndication = 'mixed'; frameRevisit = windowOpen;
      } else {
        // window opens on/before frame_end → frame verdict = directional read
        frameVerdict = directional;
        topIndication = directional;
        if (directional === 'mixed') frameRevisit = windowOpen;
      }
    }
  }

  // Textures: eclipse avoid-note if an eclipse falls in the window.
  const textures = [...new Set(trace.textures)];
  if (window) {
    const to = window.to ? window.to + '-28' : addMonths(window.from, 4) + '-28';
    const ecl = eclipseDatesInWindow(window.from + '-01', to);
    if (ecl.length) textures.push(`avoid_dates_near_eclipse:${ecl.join(',')}`);
  }

  const frame: TimingFrame = {
    bounded: frameBounded,
    end: frameEnd,
    subtype,
    directional: frameBounded ? directional : null,
    verdict: frameBounded ? frameVerdict : null,
    window: frameBounded ? window : null,
  };

  const verdict: TimingVerdict = {
    category: q.category,
    carve_out: false,
    elective_timing_ok: electiveOk,
    indication: topIndication,
    confidence: topConfidence,
    score: trace.score,
    factors_plain: buildFactors(trace),
    window,
    textures,
    frame,
  };
  if (topIndication === 'mixed') {
    verdict.tip_condition = trace.conflictMixed && trace.tensionNote ? trace.tensionNote : tipCondition(trace);
    verdict.revisit_date = frameRevisit || revisitDate || (window ? window.from : monthOf(q.timestamp));
  }
  return verdict;
}

function tipCondition(trace: EngineTrace): string {
  // the single highest-magnitude negative or missing factor
  const neg = [...trace.hits].filter((h) => h.score < 0).sort((a, b) => a.score - b.score)[0];
  return neg ? neg.plain : 'watch for the one factor currently holding this back to shift';
}
