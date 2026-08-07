/**
 * physiognomy-rules.ts — Build 27 R2 §9 step 3.
 *
 * The curated, version-controlled rules table + a PURE function
 * `mapFeaturesToTraits(vector)` that maps a deterministic `FaceFeatureVector`
 * (produced by faceFeatures.service.ts — step 2) into a stable trait profile +
 * a closed-set archetype. This is the layer that REPLACES the model's invented
 * 60–95 trait scores and free-coined archetype with a reproducible, auditable
 * mapping. The LLM (step 5) will expand prose AROUND these traits — it never
 * authors the trait, the score, or the archetype.
 *
 * Determinism contract (the whole point of R2): the SAME `FaceFeatureVector` in
 * → an IDENTICAL { traits, archetype, scores } out. Achieved by: (a) pure data
 * + pure arithmetic (no randomness, no Date, no network); (b) integer-only score
 * contributions summed onto a fixed base; (c) band cutoffs placed OFF integer
 * values so an integer score can never sit exactly on a cutoff and flip; and
 * (d) a nearest-prototype archetype rule that is TOTAL (every trait profile
 * resolves to a named archetype — there is NO fallback / "other" bucket, per
 * Sid's hard condition) with a deterministic tie-break.
 *
 * VERSIONING — read this before changing anything below:
 *   RULES_VERSION (here) versions the TRAIT/ARCHETYPE MAPPING. Bumping it
 *   triggers a cheap, no-CV RE-MAP over already-stored `faceFeatures` vectors
 *   (per plan §6/§8) — NOT a re-detect. It is DISTINCT from the service's
 *   FEATURE_VECTOR_VERSION, which versions the geometry/binning and whose bump
 *   means a deliberate re-DETECT of everyone.
 *
 * ⚠️ FIRST-PASS TAXONOMY + VOICE — pending Sid sign-off (mirrors how step 2
 * flagged its first-pass thresholds). The trait→contribution weights, the
 * closed archetype NAMES, their taglines, and the canned phrasing are a first
 * pass authored for internal consistency + discrimination. The mapping
 * SCAFFOLDING (this file) is ungated and built now; Sid signs off on the names
 * + the trait→archetype LOGIC before any copy locks (steps 5/7). See the
 * generated deliverable note at the bottom of this file.
 *
 * HONESTY: physiognomy is not science — this is an ENTERTAINMENT product. The
 * quality bar here is reproducibility + internal consistency + tasteful copy,
 * NOT empirical validity. There is no "astro.com" reference (unlike R1); the
 * reference IS this table plus the determinism property.
 */
import {
  FaceFeatureVector,
  FaceTrait,
  FaceArchetypeResult,
} from '../types/shared';

/**
 * Version of the trait/archetype MAPPING (this table). Stamped onto the profile
 * via `UserProfile.faceRulesVersion`. Bump → no-CV re-map over stored vectors.
 * DISTINCT from faceFeatures.service.ts FEATURE_VECTOR_VERSION (the geometry).
 */
export const RULES_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Trait taxonomy — REUSE the existing names the prompt + face.tsx already use
// (server/src/prompts/face-reading.prompt.ts traitAnalysis: intellect,
// determination, empathy, creativity, leadership). Keeping the exact lowercase
// names means face.tsx's ScoreCard (title is CSS-capitalized) renders unchanged.
// ---------------------------------------------------------------------------
export type TraitName =
  | 'intellect'
  | 'determination'
  | 'empathy'
  | 'creativity'
  | 'leadership';

const TRAIT_ORDER: readonly TraitName[] = [
  'intellect',
  'determination',
  'empathy',
  'creativity',
  'leadership',
] as const;

type Contribution = Partial<Record<TraitName, number>>;

// Every trait starts here; integer contributions are summed on top, then clamped.
const BASE_SCORE = 60;
const SCORE_MIN = 25;
const SCORE_MAX = 96;

// Band cutoffs placed OFF integer values (scores are always integers) so a
// score can never equal a cutoff and flip between equivalent inputs — the same
// anti-boundary discipline step 2 used for its categorical thresholds.
const BAND_LOW_MAX = 49.5; // score < 49.5 → 'low'
const BAND_HIGH_MIN = 71.5; // score >= 71.5 → 'high'; between → 'moderate'

// ---------------------------------------------------------------------------
// The features the table reads, in a FIXED order. This order is the
// deterministic tie-break for "which feature authored a trait's description"
// and the stable ordering of `sourceFeatures`. `faceShape` is read from
// vector.faceShape; the rest from vector.categoricals.
// ---------------------------------------------------------------------------
const FEATURE_ORDER = [
  'faceShape',
  'jawWidth',
  'chinShape',
  'cheekboneProminence',
  'browArch',
  'eyeOpenness',
  'eyeSpacing',
  'eyeSize',
  'noseLength',
  'noseWidth',
  'lipFullness',
  'mouthWidth',
] as const;

type FeatureKey = (typeof FEATURE_ORDER)[number];

interface Rule {
  // Trait score contributions (integer; +/-). Summed onto BASE_SCORE.
  c: Contribution;
  // Short, deterministic rules-table phrasing. The LLM EXPANDS prose around
  // this later; the rules author the trait, the model does not.
  phrasing: string;
  // Provenance/source note — the physiognomy-tradition basis (entertainment;
  // not an empirical claim). Kept for auditability + future curation passes.
  note: string;
}

// ---------------------------------------------------------------------------
// THE CURATED RULES TABLE.
// Each categorical value → a trait contribution + canned phrasing + provenance.
// Weights are a FIRST PASS (Sid-gated for voice). Sizing convention: a strongly
// trait-aligned feature contributes roughly +8..+10; a counter-indicator
// -2..-6; balanced/middle bins are near-neutral. A few aligned features push a
// dominant trait into the 'high' band; counter-indicators pull others 'low'.
// ---------------------------------------------------------------------------
const RULES: Record<FeatureKey, Record<string, Rule>> = {
  // Face shape — from the jaw/cheek outline + lower-face proportions (step 2).
  faceShape: {
    oval: {
      c: { intellect: 4, empathy: 4 },
      phrasing: 'An oval face reflects a balanced, adaptable temperament.',
      note: 'Oval = classical balance; no single dimension dominates.',
    },
    round: {
      c: { empathy: 8, creativity: 4, leadership: -2 },
      phrasing:
        'A round face suggests warmth, sociability, and easy emotional openness.',
      note: 'Round = soft contours read as approachable / feeling-led.',
    },
    square: {
      c: { determination: 8, leadership: 6, intellect: 2, empathy: -4 },
      phrasing:
        'A square face signals grounded resolve and a practical, dependable nature.',
      note: 'Square = strong angles read as willful / structured.',
    },
    heart: {
      c: { creativity: 8, intellect: 6, empathy: 2, determination: -2 },
      phrasing:
        'A heart-shaped face points to imagination and quick, intuitive intelligence.',
      note: 'Heart = wide upper face tapering to a fine chin reads as ideational.',
    },
    oblong: {
      c: { intellect: 8, determination: 4, empathy: -2 },
      phrasing:
        'An oblong face reflects a methodical, disciplined, and thoughtful mind.',
      note: 'Oblong = long lower face reads as measured / persevering.',
    },
    diamond: {
      c: { creativity: 8, intellect: 4, leadership: 2 },
      phrasing:
        'A diamond face suggests an original, detail-attentive, and inventive streak.',
      note: 'Diamond = prominent cheekbones with narrow brow/jaw read as distinctive.',
    },
    triangle: {
      c: { determination: 6, leadership: 6, creativity: 2 },
      phrasing:
        'A triangle face points to drive and a take-charge, energetic presence.',
      note: 'Triangle = jaw wider than cheek reads as bottom-heavy / forceful.',
    },
  },

  // Jaw width — gonial width / face width (large → willpower).
  jawWidth: {
    small: {
      c: { empathy: 4, intellect: 2, determination: -6, leadership: -4 },
      phrasing:
        'A delicate jaw reflects flexibility and a gentle, accommodating style.',
      note: 'Narrow jaw = yielding / adaptable in the tradition.',
    },
    medium: {
      c: { determination: 2 },
      phrasing: 'A balanced jaw reflects steady, measured resolve.',
      note: 'Mid jaw = neither forceful nor yielding.',
    },
    large: {
      c: { determination: 10, leadership: 6, empathy: -4 },
      phrasing:
        'A strong, defined jaw points to willpower and steady determination.',
      note: 'Wide jaw = the classic willpower / endurance marker.',
    },
  },

  // Chin shape — chin height / chin width.
  chinShape: {
    pointed: {
      c: { intellect: 6, creativity: 4, determination: -4 },
      phrasing:
        'A pointed chin suggests a sharp, idea-driven, and expressive mind.',
      note: 'Pointed chin = mental / refined in the tradition.',
    },
    rounded: {
      c: { empathy: 8, leadership: -2 },
      phrasing:
        'A rounded chin reflects warmth, patience, and an easygoing manner.',
      note: 'Rounded chin = sociable / accommodating.',
    },
    square: {
      c: { determination: 8, leadership: 4, intellect: 2 },
      phrasing: 'A square chin signals tenacity and a no-nonsense resolve.',
      note: 'Square chin = stubborn / resolute marker.',
    },
  },

  // Cheekbone prominence — derived from cheek-to-jaw taper (step 2).
  cheekboneProminence: {
    low: {
      c: { empathy: 4, leadership: -4 },
      phrasing: 'Soft cheekbones reflect an unassuming, approachable presence.',
      note: 'Flat cheek plane = understated / private.',
    },
    medium: {
      c: { leadership: 2 },
      phrasing: 'Balanced cheekbones reflect quiet, steady confidence.',
      note: 'Mid cheek = composed presence.',
    },
    high: {
      c: { leadership: 10, determination: 4, creativity: 2 },
      phrasing:
        'Prominent cheekbones point to charisma and a commanding presence.',
      note: 'High cheekbones = social power / presence marker.',
    },
  },

  // Brow arch — apex deviation from the brow chord (step 2).
  browArch: {
    flat: {
      c: { intellect: 8, determination: 4, creativity: -4 },
      phrasing:
        'Straight brows reflect logical, analytical, and grounded thinking.',
      note: 'Straight brow = methodical / literal in the tradition.',
    },
    soft: {
      c: { empathy: 6, intellect: 2 },
      phrasing: 'Gently curved brows reflect a considered, even-handed outlook.',
      note: 'Soft arch = balanced emotional/rational read.',
    },
    arched: {
      c: { creativity: 10, leadership: 4, intellect: -2 },
      phrasing: 'Arched brows point to expressiveness, flair, and an eye for drama.',
      note: 'High arch = dramatic / expressive marker.',
    },
  },

  // Eye openness — eye height / eye width (aperture).
  eyeOpenness: {
    narrow: {
      c: { intellect: 6, determination: 6, empathy: -4 },
      phrasing: 'Focused, narrow eyes reflect concentration and analytical depth.',
      note: 'Narrow aperture = guarded / focused.',
    },
    average: {
      c: { intellect: 2 },
      phrasing: 'Balanced eye openness reflects an even, attentive focus.',
      note: 'Mid aperture = neutral.',
    },
    wide: {
      c: { empathy: 8, creativity: 6, intellect: -2 },
      phrasing:
        'Wide-open eyes reflect curiosity, receptivity, and emotional openness.',
      note: 'Wide aperture = receptive / expressive.',
    },
  },

  // Eye spacing — inner-corner spacing / face width.
  eyeSpacing: {
    close: {
      c: { intellect: 6, determination: 4, creativity: -4 },
      phrasing: 'Close-set eyes reflect focus, precision, and attention to detail.',
      note: 'Close-set = narrow attentional field / detail-led.',
    },
    average: {
      c: { intellect: 2, empathy: 2 },
      phrasing:
        'Balanced eye spacing reflects a grounded, well-rounded perspective.',
      note: 'Average spacing = balanced perspective.',
    },
    wide: {
      c: { creativity: 8, empathy: 4, determination: -2 },
      phrasing:
        'Wide-set eyes reflect big-picture thinking and an open imagination.',
      note: 'Wide-set = broad / panoramic perspective in the tradition.',
    },
  },

  // Eye size — eye width / face width.
  eyeSize: {
    small: {
      c: { intellect: 6, determination: 4, empathy: -2 },
      phrasing:
        'Smaller eyes reflect concentration, discretion, and analytical focus.',
      note: 'Small eyes = contained / focused.',
    },
    medium: {
      c: { intellect: 2, empathy: 2 },
      phrasing: 'Medium eyes reflect a balanced, attentive emotional range.',
      note: 'Mid eyes = balanced expressiveness.',
    },
    large: {
      c: { empathy: 8, creativity: 6, leadership: -2 },
      phrasing:
        'Large, expressive eyes reflect sensitivity, warmth, and imagination.',
      note: 'Large eyes = open / feeling-led marker.',
    },
  },

  // Nose length — nose length / alar width.
  noseLength: {
    short: {
      c: { empathy: 6, creativity: 4, leadership: -4 },
      phrasing: 'A shorter nose reflects spontaneity, warmth, and an easygoing drive.',
      note: 'Short nose = spontaneous / present-focused.',
    },
    medium: {
      c: { leadership: 2, determination: 2 },
      phrasing: 'A balanced nose reflects measured ambition and steady drive.',
      note: 'Mid nose = measured drive.',
    },
    long: {
      c: { leadership: 8, determination: 6, intellect: 2 },
      phrasing:
        'A longer nose points to ambition, leadership instinct, and persistence.',
      note: 'Long nose = ambition / authority marker in the tradition.',
    },
  },

  // Nose width — alar width / face width.
  noseWidth: {
    small: {
      c: { intellect: 6, empathy: 2, leadership: -2 },
      phrasing: 'A refined, narrow nose reflects precision and an eye for quality.',
      note: 'Narrow nose = refined / discerning.',
    },
    medium: {
      c: { leadership: 2 },
      phrasing: 'A balanced nose width reflects a practical, capable drive.',
      note: 'Mid nose width = practical.',
    },
    large: {
      c: { leadership: 8, determination: 6, intellect: -2 },
      phrasing: 'A broad nose points to energy, enterprise, and a strong work drive.',
      note: 'Broad nose = enterprising / energetic marker.',
    },
  },

  // Lip fullness — lip height / lip width.
  lipFullness: {
    thin: {
      c: { intellect: 6, determination: 6, empathy: -6 },
      phrasing:
        'Thinner lips reflect reserve, discipline, and economy of expression.',
      note: 'Thin lips = self-contained / disciplined.',
    },
    medium: {
      c: { empathy: 2, creativity: 2 },
      phrasing: 'Medium lips reflect a balanced, warm communicative style.',
      note: 'Mid lips = balanced expressiveness.',
    },
    full: {
      c: { empathy: 10, creativity: 6, intellect: -4 },
      phrasing: 'Full lips reflect expressiveness, generosity, and emotional warmth.',
      note: 'Full lips = generous / expressive marker.',
    },
  },

  // Mouth width — mouth width / face width.
  mouthWidth: {
    small: {
      c: { intellect: 4, determination: 2, leadership: -4 },
      phrasing: 'A smaller mouth reflects selectivity and a considered way with words.',
      note: 'Small mouth = selective / private speech.',
    },
    medium: {
      c: { empathy: 2, leadership: 2 },
      phrasing: 'A balanced mouth reflects an even, sociable communication style.',
      note: 'Mid mouth = sociable balance.',
    },
    large: {
      c: { leadership: 8, creativity: 4, empathy: 2 },
      phrasing:
        'A wide mouth reflects sociability, expressiveness, and natural rapport.',
      note: 'Wide mouth = outgoing / expressive marker.',
    },
  },
};

// ---------------------------------------------------------------------------
// CLOSED ARCHETYPE SET (Sid-approved direction: closed list, no free coining).
// Each archetype is a PROTOTYPE in the 5-trait score space [intellect,
// determination, empathy, creativity, leadership]. The archetype is the
// NEAREST prototype (Euclidean) to the computed trait profile. This is TOTAL by
// construction — every possible profile has a nearest prototype, so there is NO
// fallback / "other" bucket (Sid's hard condition). Ties break by array order
// (strict-less comparison keeps the earlier entry) — fully deterministic.
//
// Names REUSE the existing downstream taxonomy where it exists ('The Visionary'
// is used in examples/prompts; 'The Seeker' is the current insight.service
// default) so nothing downstream breaks. The full set + each prototype's
// rationale is the deliverable Sid signs off on before copy locks.
//
// ⚠️ FIRST-PASS names/taglines/profiles — pending Sid sign-off.
// ---------------------------------------------------------------------------
interface ArchetypeDef {
  name: string;
  tagline: string;
  // Target profile in the same TRAIT_ORDER as scores.
  profile: Record<TraitName, number>;
}

const ARCHETYPES: readonly ArchetypeDef[] = [
  {
    name: 'The Visionary',
    tagline: 'You see possibilities where others see limits.',
    profile: { intellect: 80, determination: 58, empathy: 55, creativity: 88, leadership: 62 },
  },
  {
    name: 'The Strategist',
    tagline: 'You turn complex problems into clear plans.',
    profile: { intellect: 88, determination: 80, empathy: 48, creativity: 58, leadership: 66 },
  },
  {
    name: 'The Sovereign',
    tagline: 'You lead with presence and natural authority.',
    profile: { intellect: 60, determination: 80, empathy: 50, creativity: 52, leadership: 90 },
  },
  {
    name: 'The Empath',
    tagline: 'You feel deeply and connect with quiet ease.',
    profile: { intellect: 56, determination: 52, empathy: 90, creativity: 62, leadership: 48 },
  },
  {
    name: 'The Creator',
    tagline: 'You shape ideas into something the world can see.',
    profile: { intellect: 64, determination: 52, empathy: 62, creativity: 90, leadership: 52 },
  },
  {
    name: 'The Achiever',
    tagline: 'You set your sights high and follow through.',
    profile: { intellect: 60, determination: 90, empathy: 46, creativity: 52, leadership: 74 },
  },
  {
    name: 'The Sage',
    tagline: 'You pair sharp insight with genuine warmth.',
    profile: { intellect: 86, determination: 62, empathy: 80, creativity: 62, leadership: 56 },
  },
  {
    name: 'The Seeker',
    tagline: "You search beneath the surface for what's true.",
    profile: { intellect: 68, determination: 58, empathy: 66, creativity: 66, leadership: 52 },
  },
] as const;

// ---------------------------------------------------------------------------
// Pure helpers.
// ---------------------------------------------------------------------------
function clampScore(s: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(s)));
}

function bandFor(score: number): FaceTrait['band'] {
  if (score < BAND_LOW_MAX) return 'low';
  if (score >= BAND_HIGH_MIN) return 'high';
  return 'moderate';
}

// Resolve the categorical value the table should read for a given feature.
function featureValue(vector: FaceFeatureVector, feature: FeatureKey): string {
  if (feature === 'faceShape') return vector.faceShape;
  return (vector.categoricals as Record<string, string>)[feature];
}

// ---------------------------------------------------------------------------
// THE pure mapping function — same vector in → identical traits + archetype out.
// ---------------------------------------------------------------------------
export function mapFeaturesToTraits(vector: FaceFeatureVector): {
  traits: FaceTrait[];
  archetype: FaceArchetypeResult;
} {
  // 1) Accumulate score contributions + provenance per trait.
  const scores: Record<TraitName, number> = {
    intellect: BASE_SCORE,
    determination: BASE_SCORE,
    empathy: BASE_SCORE,
    creativity: BASE_SCORE,
    leadership: BASE_SCORE,
  };

  // Per trait: the contributing features in FEATURE_ORDER, with amount + phrasing.
  const contributors: Record<
    TraitName,
    { feature: FeatureKey; value: string; amount: number; phrasing: string }[]
  > = {
    intellect: [],
    determination: [],
    empathy: [],
    creativity: [],
    leadership: [],
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
  const traits: FaceTrait[] = TRAIT_ORDER.map((trait) => {
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
      `${trait[0].toUpperCase()}${trait.slice(1)} reads in a more understated register in your features.`;

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
  const profile: Record<TraitName, number> = {
    intellect: traits[0].score,
    determination: traits[1].score,
    empathy: traits[2].score,
    creativity: traits[3].score,
    leadership: traits[4].score,
  };

  let best: ArchetypeDef = ARCHETYPES[0];
  let bestDistSq = Infinity;
  for (const def of ARCHETYPES) {
    let distSq = 0;
    for (const trait of TRAIT_ORDER) {
      const d = profile[trait] - def.profile[trait];
      distSq += d * d;
    }
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = def;
    }
  }

  // sourceTraits = the two highest-scoring traits (tie-break by TRAIT_ORDER),
  // the profile dimensions that most define this archetype match.
  const ranked = TRAIT_ORDER.map((t, i) => ({ t, score: profile[t], i }))
    .sort((a, b) => (b.score - a.score) || (a.i - b.i))
    .map((x) => x.t);

  const archetype: FaceArchetypeResult = {
    name: best.name,
    tagline: best.tagline,
    sourceTraits: ranked.slice(0, 2),
  };

  return { traits, archetype };
}
