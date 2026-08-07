/**
 * chiromancy-rules.ts — Build 27 R3 §9 step 3.
 *
 * The curated, version-controlled palm rules table + a PURE function
 * `mapFeaturesToPalmTraits(vector)` that maps a deterministic, GEOMETRY-ONLY
 * `HandFeatureVector` (produced by palmFeatures.service.ts — step 2) into a
 * stable palm-trait profile + naturalTalents + lifeTheme + a closed-set palm
 * archetype (`energyType`). This is the palm analog of `physiognomy-rules.ts`
 * (R2 §9 step 3) — the layer that REPLACES the model's invented palmType,
 * 40–95 scores, talents, and destiny with a reproducible, auditable mapping.
 * The LLM (step 5) expands prose AROUND these — it never authors the trait,
 * the score, the talents, or the archetype.
 *
 * Determinism contract (the whole point of R3): the SAME `HandFeatureVector` in
 * → an IDENTICAL { traits, palmType, naturalTalents, profile } out. Achieved by:
 * (a) pure data + pure arithmetic (no randomness, no Date, no network); (b)
 * integer-only score contributions summed onto a fixed base; (c) band cutoffs
 * placed OFF integer values so an integer score can never sit exactly on a
 * cutoff and flip; (d) ratio→categorical bin thresholds placed OFF the 4-dp
 * quantization grid (trailing 5 in the 5th decimal) so a quantized input can
 * never equal a threshold and flip; and (e) a nearest-prototype archetype rule
 * that is TOTAL (every profile resolves to a named archetype — NO fallback /
 * "other" bucket) with a deterministic array-order tie-break.
 *
 * palmType is NOT computed here — it is deterministic geometry already carried
 * on the vector (palmShape × fingerLength via the fixed 2×2 chiromancy map, in
 * palmFeatures.service.ts). It passes THROUGH; this table only reads it (plus
 * two per-finger geometric signals) to author traits/talents/archetype.
 *
 * VERSIONING — read this before changing anything below:
 *   RULES_VERSION (here) versions the TRAIT/TALENT/ARCHETYPE MAPPING. Bumping it
 *   triggers a cheap, no-CV RE-MAP over already-stored `palm*Features` vectors
 *   (per plan §6/§8) — NOT a re-detect. It is DISTINCT from the service's
 *   FEATURE_VECTOR_VERSION, which versions the geometry/binning and whose bump
 *   means a deliberate re-DETECT of everyone.
 *
 * ⚠️ FIRST-PASS TAXONOMY + VOICE + WEIGHTS — pending Sid sign-off (mirrors how
 * step 2 flagged its first-pass thresholds and R2 step 3 flagged its archetype
 * names). The palm-trait vocabulary, the per-finger bin thresholds, the
 * trait→contribution weights, the closed archetype NAMES, their taglines, the
 * talent/lifeTheme copy, and the canned phrasing are a first pass authored for
 * internal consistency + discrimination. The mapping SCAFFOLDING (this file) is
 * ungated and built now; Sid signs off on the names + the trait→archetype LOGIC
 * before any copy locks (step 5). See the deliverable note in scratchpad.
 *
 * HONESTY: chiromancy is not science — this is an ENTERTAINMENT product. The
 * quality bar here is reproducibility + internal consistency + tasteful copy,
 * NOT empirical validity. There is no "astro.com" reference (unlike R1); the
 * reference IS this table plus the determinism property. Per the R3 spike, palm
 * LINES and MOUNTS are NOT measured (they stay LLM flavor) — so NO rule here
 * reads a line/mount feature, and no rule reads the pose-dependent
 * thumbAngle/fingerSpread (advisory only). The measured substrate is geometry.
 */
import {
  HandFeatureVector,
  PalmTrait,
  PalmProfileResult,
  PalmTypeClass,
} from '../types/shared';

/**
 * Version of the trait/talent/archetype MAPPING (this table). Stamped onto the
 * profile via `UserProfile.palmRulesVersion` (step 4). Bump → no-CV re-map over
 * stored vectors. DISTINCT from palmFeatures.service.ts FEATURE_VECTOR_VERSION
 * (the geometry/binning), whose bump means a re-detect.
 */
export const RULES_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Palm-trait taxonomy — FIRST PASS (there is no existing palm `traitAnalysis[]`
// to reuse, unlike R2's face traits). Chosen so the four palmTypes each push a
// distinct, discriminating profile (Earth→practicality, Air→intellect,
// Water→intuition, Fire→drive; creativity is the shared expressive axis), and so
// the vocabulary echoes the current palm-reading prompt's voice
// (decisionMakingStyle Logical/Emotional/Strategic/Intuitive/Impulsive;
// palmEnergyType Leader/Healer/Creator/Visionary/Survivor/Scholar;
// naturalTalents phrasing). Lowercase names; the mobile UI title-cases.
// ---------------------------------------------------------------------------
export type PalmTraitName =
  | 'practicality'
  | 'intellect'
  | 'intuition'
  | 'creativity'
  | 'drive';

const TRAIT_ORDER: readonly PalmTraitName[] = [
  'practicality',
  'intellect',
  'intuition',
  'creativity',
  'drive',
] as const;

type Contribution = Partial<Record<PalmTraitName, number>>;

// Every trait starts here; integer contributions are summed on top, then clamped.
const BASE_SCORE = 50;
const SCORE_MIN = 20;
const SCORE_MAX = 96;

// Band cutoffs placed OFF integer values (scores are always integers) so a
// score can never equal a cutoff and flip between equivalent inputs — the same
// anti-boundary discipline step 2 used for its categorical thresholds.
const BAND_LOW_MAX = 44.5; // score < 44.5 → 'low'
const BAND_HIGH_MIN = 66.5; // score >= 66.5 → 'high'; between → 'moderate'

// ---------------------------------------------------------------------------
// Per-finger bin thresholds — FIRST PASS (⚠️ calibration pending real captures,
// same status as the service's palmShape/fingerLength cutoffs; only 2 local
// samples exist). Every cutoff carries a trailing 5 in the 5th decimal (e.g.
// 0.95005) so it sits BETWEEN two 4-dp-quantized ratios — a quantized input can
// never equal a threshold, so a tiny landmark shift cannot flip a bin (the R2
// / step-2 anti-flip rule). digitRatio2D4D = index/ring (classic 2D:4D, ~0.9–1.0);
// ringRatio = ring length / palm length (Apollo finger — the creativity marker).
// ---------------------------------------------------------------------------
const DIGIT_LOW_MAX = 0.95005; // < → 'low' (index shorter than ring — bold/assertive)
const DIGIT_HIGH_MIN = 0.99005; // >= → 'high' (index ≈/> ring — reflective/analytical)
const RING_SHORT_MAX = 0.90005; // < → 'short'
const RING_LONG_MIN = 1.00005; // >= → 'long' (a pronounced Apollo finger)

// ---------------------------------------------------------------------------
// The features the table reads, in a FIXED order. This order is the
// deterministic tie-break for "which feature authored a trait's description"
// and the stable ordering of `sourceFeatures`. `palmType` is read from
// vector.palmType (pass-through geometry); `digit2D4D` + `ringLength` are binned
// from vector.ratios here. NOTE (honest scope): indexRatio/middleRatio/
// pinkyRatio are intentionally NOT read as separate rules in v1 — palmType
// already subsumes palmShape × fingerLength, and ring (Apollo) + 2D:4D are the
// two per-finger signals with the clearest chiromantic convention. The other
// per-finger ratios remain on the vector, reserved for a future richer pass
// (a RULES_VERSION bump + re-map, never a re-detect).
// ---------------------------------------------------------------------------
const FEATURE_ORDER = ['palmType', 'digit2D4D', 'ringLength'] as const;

type FeatureKey = (typeof FEATURE_ORDER)[number];

interface Rule {
  // Trait score contributions (integer; +/-). Summed onto BASE_SCORE.
  c: Contribution;
  // Short, deterministic rules-table phrasing. The LLM EXPANDS prose around
  // this later; the rules author the trait, the model does not.
  phrasing: string;
  // Provenance/source note — the chiromancy-tradition basis (entertainment;
  // not an empirical claim). Kept for auditability + future curation passes.
  note: string;
}

// ---------------------------------------------------------------------------
// THE CURATED RULES TABLE.
// Each categorical value → a trait contribution + canned phrasing + provenance.
// Weights are a FIRST PASS (Sid-gated for voice). Sizing convention: palmType is
// the PRIMARY, validated, discriminating signal (contributions ±6..+30 so a
// dominant trait clears the 'high' band); digit2D4D + ringLength are secondary
// modulators (±2..+18) that shift the profile enough to reach the full closed
// archetype set without overriding the palmType core.
// ---------------------------------------------------------------------------
const RULES: Record<FeatureKey, Record<string, Rule>> = {
  // palmType — the fixed 2×2 (palmShape × fingerLength) chiromancy element,
  // already computed deterministically on the vector. The holistic core.
  palmType: {
    earth: {
      c: { practicality: 28, drive: 8, intellect: 2, intuition: -8, creativity: -10 },
      phrasing:
        'An Earth hand, a square palm with shorter fingers, reflects a grounded, practical, and dependable nature.',
      note: 'Earth = square palm + short fingers; the builder/doer temperament.',
    },
    air: {
      c: { intellect: 28, creativity: 10, intuition: 2, drive: -6 },
      phrasing:
        'An Air hand, a square palm with long fingers, reflects a curious, communicative, and analytical mind.',
      note: 'Air = square palm + long fingers; the thinker/communicator temperament.',
    },
    water: {
      c: { intuition: 28, creativity: 12, intellect: 4, practicality: -10, drive: -8 },
      phrasing:
        'A Water hand, a long palm with long fingers, reflects a sensitive, intuitive, and imaginative temperament.',
      note: 'Water = rectangular palm + long fingers; the feeling/creative temperament.',
    },
    fire: {
      c: { drive: 30, creativity: 6, practicality: 6, intellect: -4, intuition: -6 },
      phrasing:
        'A Fire hand, a long palm with shorter fingers, reflects an energetic, driven, and action-oriented spirit.',
      note: 'Fire = rectangular palm + short fingers; the initiator/leader temperament.',
    },
  },

  // digit2D4D — index length / ring length (the classic 2D:4D ratio).
  digit2D4D: {
    low: {
      c: { drive: 12, practicality: 4, intuition: -4, creativity: -2 },
      phrasing:
        'A ring finger longer than the index points to boldness and a readiness to act.',
      note: 'Low 2D:4D (index < ring) = assertive / action-led in the tradition.',
    },
    balanced: {
      c: { intellect: 2, intuition: 2 },
      phrasing: 'Balanced index and ring fingers reflect an even, adaptable disposition.',
      note: 'Mid 2D:4D = neither markedly bold nor markedly analytical.',
    },
    high: {
      c: { intellect: 12, intuition: 6, creativity: 6, drive: -8, practicality: -4 },
      phrasing:
        'An index finger as long as or longer than the ring points to a reflective, analytical bent.',
      note: 'High 2D:4D (index ≈/> ring) = considered / analytical in the tradition.',
    },
  },

  // ringLength — ring (Apollo) finger length / palm length. The classic
  // creativity/expression marker.
  ringLength: {
    short: {
      c: { practicality: 6, creativity: -6, drive: 2 },
      phrasing:
        'A shorter ring finger reflects a pragmatic, understated way of expressing yourself.',
      note: 'Short Apollo finger = reserved expression / pragmatism.',
    },
    standard: {
      c: {},
      phrasing: 'A balanced ring finger reflects a measured creative streak.',
      note: 'Mid Apollo finger = neither muted nor pronounced expression.',
    },
    long: {
      c: { creativity: 18, intuition: 4, drive: -2 },
      phrasing: 'A long ring finger points to a strong creative and expressive drive.',
      note: 'Long Apollo finger = the classic creativity / expression marker.',
    },
  },
};

// ---------------------------------------------------------------------------
// CLOSED PALM ARCHETYPE SET (`energyType`). Direction per plan §4 option (a):
// a closed, fixed list — NO free coining. Names REUSE the palm-reading prompt's
// existing `palmEnergyType` taxonomy (Leader/Healer/Creator/Visionary/Survivor/
// Scholar Palm) for downstream continuity. Each archetype is a PROTOTYPE in the
// 5-trait score space [practicality, intellect, intuition, creativity, drive].
// The archetype is the NEAREST prototype (Euclidean) to the computed profile.
// This is TOTAL by construction — every possible profile has a nearest prototype
// → NO fallback / "other" bucket (plan §4 hard condition). Ties break by array
// order (strict-less comparison keeps the earlier entry) — fully deterministic.
//
// ⚠️ FIRST-PASS names/taglines/profiles — pending Sid sign-off. The full set +
// each prototype's rationale + coverage proof is the scratchpad deliverable.
// ---------------------------------------------------------------------------
interface ArchetypeDef {
  name: string;
  tagline: string;
  // Target profile in the same TRAIT_ORDER as scores.
  profile: Record<PalmTraitName, number>;
}

const ARCHETYPES: readonly ArchetypeDef[] = [
  {
    name: 'Survivor Palm',
    tagline: 'You build lasting stability through grit and steady effort.',
    profile: { practicality: 88, intellect: 52, intuition: 44, creativity: 42, drive: 70 },
  },
  {
    name: 'Scholar Palm',
    tagline: 'You turn knowledge into understanding and share it freely.',
    profile: { practicality: 52, intellect: 86, intuition: 54, creativity: 60, drive: 46 },
  },
  {
    name: 'Healer Palm',
    tagline: 'You feel deeply and bring comfort to those around you.',
    profile: { practicality: 44, intellect: 54, intuition: 88, creativity: 64, drive: 42 },
  },
  {
    name: 'Leader Palm',
    tagline: 'You lead from the front and turn ideas into decisive action.',
    profile: { practicality: 58, intellect: 48, intuition: 44, creativity: 54, drive: 86 },
  },
  {
    name: 'Creator Palm',
    tagline: 'You shape raw imagination into work the world can see.',
    profile: { practicality: 46, intellect: 60, intuition: 70, creativity: 88, drive: 44 },
  },
  {
    name: 'Visionary Palm',
    tagline: 'You see what could be and draw others toward it.',
    profile: { practicality: 46, intellect: 82, intuition: 68, creativity: 80, drive: 52 },
  },
] as const;

// ---------------------------------------------------------------------------
// naturalTalents + lifeTheme table — keyed by the resolved archetype (which is
// itself derived from the trait/palmType profile), so it is deterministic and
// TOTAL. These REPLACE the model-invented `destiny.naturalTalents` /
// `destiny.lifeTheme` (the exact fields insight.service.ts reads at L167–168);
// same SHAPE (string[] + string) so step 6 sources from here unchanged.
// ⚠️ FIRST-PASS copy — Sid-gated for voice.
// ---------------------------------------------------------------------------
interface ProfileCopy {
  talents: string[];
  lifeTheme: string;
}

const ARCHETYPE_COPY: Record<string, ProfileCopy> = {
  'Survivor Palm': {
    talents: ['Resilience', 'Practical problem-solving', 'Endurance', 'Resourcefulness'],
    lifeTheme: 'Building lasting stability through grit and steady, hands-on effort.',
  },
  'Scholar Palm': {
    talents: ['Analytical thinking', 'Clear communication', 'Continuous learning', 'Strategic planning'],
    lifeTheme: 'Turning knowledge into understanding and sharing it with the world.',
  },
  'Healer Palm': {
    talents: ['Empathy', 'Emotional insight', 'Nurturing others', 'Deep listening'],
    lifeTheme: 'Bringing comfort and healing to the people and causes you care about.',
  },
  'Leader Palm': {
    talents: ['Leadership', 'Decisive action', 'Motivating others', 'Initiative'],
    lifeTheme: 'Leading from the front and turning bold ideas into decisive action.',
  },
  'Creator Palm': {
    talents: ['Creative expression', 'Artistic vision', 'Innovation', 'Design sense'],
    lifeTheme: 'Shaping raw imagination into work the world can see and feel.',
  },
  'Visionary Palm': {
    talents: ['Big-picture thinking', 'Innovation', 'Intuitive insight', 'Inspiring others'],
    lifeTheme: 'Seeing what could be and drawing others toward a larger vision.',
  },
};

// ---------------------------------------------------------------------------
// Pure helpers.
// ---------------------------------------------------------------------------
function clampScore(s: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(s)));
}

function bandFor(score: number): PalmTrait['band'] {
  if (score < BAND_LOW_MAX) return 'low';
  if (score >= BAND_HIGH_MIN) return 'high';
  return 'moderate';
}

// Bin digitRatio2D4D → 'low' | 'balanced' | 'high'. Input pre-quantized (4 dp)
// on the vector; thresholds are off-grid so no input can equal them.
function binDigit(r2d4d: number): 'low' | 'balanced' | 'high' {
  if (r2d4d < DIGIT_LOW_MAX) return 'low';
  if (r2d4d < DIGIT_HIGH_MIN) return 'balanced';
  return 'high';
}

// Bin ringRatio → 'short' | 'standard' | 'long'. Same off-grid discipline.
function binRing(ringRatio: number): 'short' | 'standard' | 'long' {
  if (ringRatio < RING_SHORT_MAX) return 'short';
  if (ringRatio < RING_LONG_MIN) return 'standard';
  return 'long';
}

// Resolve the categorical value the table should read for a given feature.
function featureValue(vector: HandFeatureVector, feature: FeatureKey): string {
  switch (feature) {
    case 'palmType':
      return vector.palmType;
    case 'digit2D4D':
      return binDigit(vector.ratios.digitRatio2D4D);
    case 'ringLength':
      return binRing(vector.ratios.ringRatio);
  }
}

// ---------------------------------------------------------------------------
// THE pure mapping function — same vector in → identical traits + palmType +
// talents + profile out.
// ---------------------------------------------------------------------------
export function mapFeaturesToPalmTraits(vector: HandFeatureVector): {
  traits: PalmTrait[];
  palmType: PalmTypeClass;
  naturalTalents: string[];
  profile: PalmProfileResult;
} {
  // 1) Accumulate score contributions + provenance per trait.
  const scores: Record<PalmTraitName, number> = {
    practicality: BASE_SCORE,
    intellect: BASE_SCORE,
    intuition: BASE_SCORE,
    creativity: BASE_SCORE,
    drive: BASE_SCORE,
  };

  // Per trait: the contributing features in FEATURE_ORDER, with amount + phrasing.
  const contributors: Record<
    PalmTraitName,
    { feature: FeatureKey; value: string; amount: number; phrasing: string }[]
  > = {
    practicality: [],
    intellect: [],
    intuition: [],
    creativity: [],
    drive: [],
  };

  // Iterate features in the FIXED order so accumulation + tie-breaks are stable.
  for (const feature of FEATURE_ORDER) {
    const value = featureValue(vector, feature);
    const rule = RULES[feature]?.[value];
    if (!rule) continue; // unknown categorical value — contributes nothing
    for (const trait of TRAIT_ORDER) {
      const amount = rule.c[trait];
      if (amount === undefined || amount === 0) continue;
      scores[trait] += amount;
      contributors[trait].push({ feature, value, amount, phrasing: rule.phrasing });
    }
  }

  // 2) Build the trait list (fixed order). Description = the phrasing of the
  //    strongest POSITIVE contributor (tie-break by FEATURE_ORDER, which is the
  //    push order, so a stable sort is unnecessary). sourceFeatures lists every
  //    feature that moved the score, in FEATURE_ORDER, for auditability.
  const traits: PalmTrait[] = TRAIT_ORDER.map((trait) => {
    const score = clampScore(scores[trait]);
    const contribs = contributors[trait];

    let topPhrasing: string | undefined;
    let topAmount = 0;
    for (const c of contribs) {
      if (c.amount > topAmount) {
        topAmount = c.amount;
        topPhrasing = c.phrasing;
      }
    }
    const description =
      topPhrasing ??
      `${trait[0].toUpperCase()}${trait.slice(1)} reads in a more understated register in your hand.`;

    const sourceFeatures = contribs.map((c) => `${c.feature}:${c.value}`);

    return {
      trait,
      score,
      band: bandFor(score),
      description,
      sourceFeatures,
    };
  });

  // 3) Archetype = nearest prototype (Euclidean) over the trait profile. TOTAL:
  //    every profile has a nearest prototype, so no fallback bucket. Tie-break:
  //    strict-less keeps the earlier ARCHETYPES entry → deterministic.
  const profileScores: Record<PalmTraitName, number> = {
    practicality: traits[0].score,
    intellect: traits[1].score,
    intuition: traits[2].score,
    creativity: traits[3].score,
    drive: traits[4].score,
  };

  let best: ArchetypeDef = ARCHETYPES[0];
  let bestDistSq = Infinity;
  for (const def of ARCHETYPES) {
    let distSq = 0;
    for (const trait of TRAIT_ORDER) {
      const d = profileScores[trait] - def.profile[trait];
      distSq += d * d;
    }
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = def;
    }
  }

  // sourceTraits = the two highest-scoring traits (tie-break by TRAIT_ORDER),
  // the profile dimensions that most define this archetype match.
  const ranked = TRAIT_ORDER.map((t, i) => ({ t, score: profileScores[t], i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.t);
  const sourceTraits = ranked.slice(0, 2);

  // 4) naturalTalents + lifeTheme from the fixed per-archetype copy table.
  const copy = ARCHETYPE_COPY[best.name];
  const naturalTalents = copy.talents;

  const profile: PalmProfileResult = {
    palmType: vector.palmType, // pass-through geometry, not recomputed
    lifeTheme: copy.lifeTheme,
    naturalTalents,
    sourceTraits,
    energyType: best.name,
  };

  return {
    traits,
    palmType: vector.palmType,
    naturalTalents,
    profile,
  };
}
