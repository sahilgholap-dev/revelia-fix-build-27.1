/**
 * Palm Reading Prompt for Claude Vision API
 *
 * Build 27 R3 (§9 step 5): the palm reading is now DRIVEN BY the deterministic,
 * GEOMETRY-ONLY trait layer (`chiromancy-rules.ts` → PalmTrait[] + closed-set
 * palm archetype `energyType` + palmType/lifeTheme/naturalTalents), not the
 * pixels. When the caller passes the extracted `substance`, this prompt is FED
 * those values as the FIXED SUBSTANCE and instructs the model to write prose
 * AROUND them — never re-deriving palmType / scores / talents / archetype, and
 * NEVER contradicting the measured substrate (plan §4/§7 prose-never-contradict,
 * the R2 Sid-#3 analog).
 *
 * LINES ARE FLAVOR (S2 default, the key R3 nuance): unlike R2 face (which drops
 * the image entirely), the palm reading STILL passes the image — but ONLY so the
 * model can DESCRIBE the four major lines (heart/head/life/fate) for the
 * `majorLines` block that the mobile `PalmLineCard` UI renders. Palm lines are
 * NOT part of the stable measured substrate (classical CV can't measure them
 * reproducibly — R3 spike, S2). The line descriptions are explicitly flagged as
 * descriptive flavor and are FORBIDDEN from contradicting the measured
 * palmType / traits. (`PalmLineCard`'s strength dot-bar therefore reflects an LLM
 * description, not a measured band — acceptable for v1 flavor.)
 *
 * The legacy image-based path (below) is retained as a FAIL-OPEN fallback for
 * users whose trait layer is missing (uploaded before R3, or extraction found no
 * hand) so no user loses their reading — it is NOT the primary path.
 */

import { HONESTY_PREAMBLE } from './shared/honesty-preamble';
import { PalmTypeClass } from '../types/shared';

/**
 * A/B prompt-version tag. See `FACE_PROMPT_VERSION` for why `v1` here means "the
 * first TAGGED version" rather than "never changed", and why the call site appends
 * `.legacy` on the non-traits path.
 *
 * ⚠️ THE PALM SURFACE HAS ONE MORE DIMENSION THAN FACE AND IT IS **NOT** IN THE TAG:
 * dominant vs non-dominant hand. Deliberate — the hand changes the prompt's framing
 * but not its structure, and the non-dominant reading is a paid-tier variant of the
 * same prompt rather than a different one. If an A/B ever needs to split them, that
 * is a tag change, not a new surface.
 */
export const PALM_PROMPT_VERSION = 'palm.v1';

/**
 * Palm reading output interface - Enhanced V2
 */
export interface PalmReadingOutput {
  palmEnergyType: {
    type: string;
    description: string;
    coreNature: string;
    lifeDirectionTheme: string;
  };

  palmType: {
    name: string;
    description: string;
  };

  majorLines: {
    heartLine: {
      observation: string;
      lovePattern: string;
      emotionalDepth: string;
      relationshipStability: string;
      insight: string;
    };
    headLine: {
      observation: string;
      decisionStyle: string;
      thinkingPattern: string;
      riskTakingLevel: string;
      insight: string;
    };
    lifeLine: {
      observation: string;
      vitality: string;
      lifeStability: string;
      majorTurningPeriods: string;
      insight: string;
    };
    fateLine: {
      observation: string;
      careerPath: string;
      financialGrowth: string;
      successStyle: string;
      insight: string;
    };
  };

  wealthAndSuccess: {
    financialGrowthScore: number;
    strongestGrowthPhase: string;
    bestSuccessStyle: string;
    moneyMindset: string;
  };

  loveAndMarriage: {
    emotionalCommitmentPhase: string;
    loveLesson: string;
    relationshipRisk: string;
    marriageIndication: string;
  };

  hiddenPalmSecret: {
    hiddenPower: string;
    patternToBreak: string;
  };

  karmaAndPastInfluence: {
    karmaType: string;
    insight: string;
    ancestralBlessing: string;
  };

  decisionMakingStyle: string;

  destiny: {
    lifeTheme: string;
    description: string;
  };

  naturalTalents: string[];

  dailyPalmInsight: {
    todayEnergy: string;
    todayFocus: string;
    avoidToday: string;
  };

  premiumContent: {
    sunLine: {
      present: boolean;
      recognition: string;
      publicSuccess: string;
      insight: string;
    };
    minorLines: {
      marriageLines: string;
      childrenLines: string;
      travelLines: string;
    };
    detailedLifeTimeline: string;
    spiritualPath: string;
  };

  shareableQuote: string;

  // Legacy fields for backward compatibility
  lines?: Record<string, { strength: string; interpretation: string }>;
  mounts?: Record<string, { prominence: string; meaning: string }>;
}

/**
 * User context for personalization
 */
export interface PalmReadingContext {
  name?: string;
  sunSign?: string;
  lifePathNumber?: number;
}

/**
 * The deterministic, rules-derived SUBSTANCE the palm reading is written around
 * (Build 27 R3 step 5). Produced by `mapFeaturesToPalmTraits()` in
 * `chiromancy-rules.ts` and persisted on the profile (dominant) / re-mapped from
 * the stored vector (non-dominant). When present, the reading is traits-driven
 * (image passed for LINE FLAVOR only); when absent, the legacy image path runs.
 */
export interface PalmReadingSubstance {
  /** Measured palmType class (earth/air/water/fire) — fixed geometry. */
  palmType: PalmTypeClass;
  /** Closed-set palm archetype chosen by the rules table (NOT the model). */
  energyType?: string;
  /** Rules-derived life theme (replaces the model-invented destiny.lifeTheme). */
  lifeTheme: string;
  /** Rules-derived talents (replaces the model-invented destiny.naturalTalents). */
  naturalTalents: string[];
  /** Rules-computed trait scores/bands — the fixed substance the prose wraps. */
  traits: Array<{ trait: string; score: number; band?: string; description?: string }>;
}

/** Display name the UI keys its element icon off (PalmTypeHeader). */
const PALM_TYPE_DISPLAY: Record<PalmTypeClass, string> = {
  earth: 'Earth Hand',
  air: 'Air Hand',
  water: 'Water Hand',
  fire: 'Fire Hand',
};

export function palmTypeDisplayName(palmType: PalmTypeClass): string {
  return PALM_TYPE_DISPLAY[palmType] ?? 'Earth Hand';
}

/**
 * The output JSON schema shared by both prompt paths. The four fixed values
 * (palmEnergyType.type, palmType.name, destiny.lifeTheme, naturalTalents) are
 * injected so the traits-driven path pins the measured substance while the legacy
 * path shows the free-choice template.
 */
function palmOutputSchema(specs: {
  palmEnergyTypeSpec: string;
  palmTypeNameSpec: string;
  lifeThemeSpec: string;
  naturalTalentsSpec: string;
}): string {
  return `{
  "palmEnergyType": {
    "type": "${specs.palmEnergyTypeSpec}",
    "description": "Why this palm type fits them",
    "coreNature": "2 lines about their natural personality",
    "lifeDirectionTheme": "1 strong destiny-focused sentence"
  },

  "palmType": {
    "name": "${specs.palmTypeNameSpec}",
    "description": "What this hand type reveals"
  },

  "majorLines": {
    "heartLine": {
      "observation": "What we observe about this line",
      "lovePattern": "How they love",
      "emotionalDepth": "Deep/Moderate/Guarded",
      "relationshipStability": "Description",
      "insight": "Personalized 2-3 line interpretation"
    },
    "headLine": {
      "observation": "What we observe",
      "decisionStyle": "Analytical/Intuitive/Balanced",
      "thinkingPattern": "How they process information",
      "riskTakingLevel": "Conservative/Calculated/Bold",
      "insight": "Personalized interpretation"
    },
    "lifeLine": {
      "observation": "What we observe",
      "vitality": "Energy level and health tendency",
      "lifeStability": "Stability patterns",
      "majorTurningPeriods": "Approximate life phases of change",
      "insight": "Personalized interpretation"
    },
    "fateLine": {
      "observation": "What we observe (or note if faint/absent)",
      "careerPath": "Career trajectory indication",
      "financialGrowth": "Wealth building pattern",
      "successStyle": "Self-made/Supported/Mixed",
      "insight": "Personalized interpretation"
    }
  },

  "wealthAndSuccess": {
    "financialGrowthScore": [40-95],
    "strongestGrowthPhase": "Age range when financial peak likely occurs",
    "bestSuccessStyle": "Independent/Corporate/Creative/Business",
    "moneyMindset": "Their relationship with wealth"
  },

  "loveAndMarriage": {
    "emotionalCommitmentPhase": "When they're ready for deep commitment",
    "loveLesson": "The key lesson in their love life",
    "relationshipRisk": "The pattern to watch in relationships",
    "marriageIndication": "What their palm suggests about marriage"
  },

  "hiddenPalmSecret": {
    "hiddenPower": "One powerful sentence about what their palm reveals",
    "patternToBreak": "One pattern they must overcome"
  },

  "karmaAndPastInfluence": {
    "karmaType": "Emotional/Spiritual/Material/Relational",
    "insight": "What past influences shape their current path",
    "ancestralBlessing": "Strength inherited from lineage"
  },

  "decisionMakingStyle": "Logical Decision Maker / Emotional Decision Maker / Strategic Planner / Intuitive Actor / Impulsive Action Taker",

  "destiny": {
    "lifeTheme": "${specs.lifeThemeSpec}",
    "description": "Detailed destiny description"
  },

  "naturalTalents": ${specs.naturalTalentsSpec},

  "dailyPalmInsight": {
    "todayEnergy": "What their palm energy favors today",
    "todayFocus": "Where to direct energy",
    "avoidToday": "What to be cautious about"
  },

  "premiumContent": {
    "sunLine": {
      "present": true/false,
      "recognition": "Fame and recognition potential",
      "publicSuccess": "Public image and success",
      "insight": "Deep interpretation"
    },
    "minorLines": {
      "marriageLines": "Relationship indicators",
      "childrenLines": "Family indicators",
      "travelLines": "Life journey indicators"
    },
    "detailedLifeTimeline": "Year-by-year major life events prediction",
    "spiritualPath": "Their soul's journey and purpose"
  },

  "shareableQuote": "One quotable sentence that captures their destiny and feels special"
}`;
}

function buildPalmContextSection(
  handedness: 'right' | 'left',
  context?: PalmReadingContext
): string {
  if (!context) return '';
  const userName = context.name || 'friend';
  const sunSign = context.sunSign || '';
  const lifePathNumber = context.lifePathNumber || '';
  return `
## User Profile
- Name: ${userName}
- Dominant Hand: ${handedness}
${sunSign ? `- Sun Sign: ${sunSign}` : ''}
${lifePathNumber ? `- Life Path Number: ${lifePathNumber}` : ''}

Use this context to make insights feel PERSONALLY WRITTEN for ${userName}. Reference their zodiac and life path naturally.
`;
}

/**
 * Build palm reading prompt for Claude Vision API.
 *
 * @param tier - 'free' or 'premium' subscription level
 * @param isDominant - true if this is the dominant hand
 * @param handedness - 'right' or 'left' handed
 * @param context - Optional user context for personalization
 * @param substance - Optional rules-derived trait layer. When present, the
 *   reading is traits-driven (palmType/traits/talents/archetype are fixed; the
 *   image is used ONLY for line description); when absent, the legacy image path
 *   runs as a fail-open fallback.
 * @returns Complete prompt string for Claude API
 */
export function buildPalmReadingPrompt(
  tier: 'free' | 'premium',
  isDominant: boolean,
  handedness: 'right' | 'left',
  context?: PalmReadingContext,
  substance?: PalmReadingSubstance
): string {
  const traitsDriven = !!(substance && substance.traits && substance.traits.length > 0);
  return traitsDriven
    ? buildTraitDrivenPalmPrompt(tier, isDominant, handedness, substance!, context)
    : buildImageBasedPalmPrompt(tier, isDominant, handedness, context);
}

/**
 * TRAITS-DRIVEN palm prompt (Build 27 R3 step 5 — the primary path).
 * palmType, archetype, trait scores, talents, and life theme are the FIXED,
 * measured substance. The model writes prose around them and NEVER contradicts
 * them. The image is passed ONLY so the model can DESCRIBE the four major lines
 * for the `majorLines` block (LLM flavor, not measured).
 */
function buildTraitDrivenPalmPrompt(
  tier: 'free' | 'premium',
  isDominant: boolean,
  handedness: 'right' | 'left',
  substance: PalmReadingSubstance,
  context?: PalmReadingContext
): string {
  const isPremium = tier === 'premium';
  const handType = isDominant ? 'dominant' : 'non-dominant';
  const handDescription = isDominant
    ? 'This is the DOMINANT hand, which reveals the life you are actively creating through your choices, actions, and conscious decisions.'
    : 'This is the NON-DOMINANT hand, which reveals your inherited traits, natural potential, and subconscious patterns.';

  const userName = context?.name || 'friend';
  const sunSign = context?.sunSign || '';
  const lifePathNumber = context?.lifePathNumber || '';

  const palmTypeName = palmTypeDisplayName(substance.palmType);
  const energyType = substance.energyType || 'Scholar Palm';

  const traitLines = substance.traits
    .map(
      (t) =>
        `- ${t.trait}, score ${t.score}${t.band ? ` (${t.band})` : ''}${
          t.description ? `: ${t.description}` : ''
        }`
    )
    .join('\n');

  const schema = palmOutputSchema({
    palmEnergyTypeSpec: energyType,
    palmTypeNameSpec: palmTypeName,
    lifeThemeSpec: substance.lifeTheme,
    naturalTalentsSpec: JSON.stringify(substance.naturalTalents),
  });

  return `${HONESTY_PREAMBLE}

You are a master palm reader combining ancient palmistry wisdom with modern psychological insight. You are writing a deeply personalized palm reading.
${buildPalmContextSection(handedness, context)}
## Hand Context
User is ${handedness}-handed.
${handDescription}

## FIXED MEASURED SUBSTANCE (do not change, this is the reading's foundation)

This person's hand was measured deterministically from precise hand-landmark geometry. The palm type, archetype, trait scores, talents, and life theme below are ALREADY DECIDED. Your job is to write the VOICE and PROSE around them, you do NOT get to change, re-score, re-name, or contradict them.

Palm type (already measured, use EXACTLY this name): ${palmTypeName}
Palm archetype (use EXACTLY this name for palmEnergyType.type, do not invent another): ${energyType}
Life theme (use EXACTLY this for destiny.lifeTheme): ${substance.lifeTheme}
Natural talents (use EXACTLY these for naturalTalents, do NOT add, remove, or reword): ${JSON.stringify(substance.naturalTalents)}

Measured traits (ground every claim in these scores, a 'high' trait reads as a clear strength, a 'low' trait as understated; never flip them):
${traitLines}

## LINES ARE DESCRIPTIVE FLAVOR ONLY (read carefully)

You ARE given the palm photo, but ONLY so you can DESCRIBE the four major lines (heart, head, life, fate) for the "majorLines" block. Palm lines are NOT part of the measured substance above, treat their descriptions as light, tasteful flavor. Two hard rules for the lines:
- Your line descriptions must NEVER contradict the measured palm type, archetype, or trait scores above. If the geometry says practical and driven, the lines must read consistently with that.
- Do NOT derive the palm type, archetype, talents, life theme, or any score from the image. Those come ONLY from the measured substance above. The image is for line description, nothing else.

Return a JSON response with this EXACT structure:

${schema}

## Critical Guidelines

### PROSE NEVER CONTRADICTS THE MEASURED SUBSTANCE (most important rule)
- The palm type, archetype, trait scores, talents, and life theme above are FIXED. Your prose may ELABORATE on them but must NEVER state, imply, or score anything that conflicts with them.
- Echo the archetype name (palmEnergyType.type), the palmType name, the life theme, and the natural talents EXACTLY as given.
- A trait scored 'high' must read as a clear strength; a 'low' trait must read as understated, never flip a low trait into a headline strength or vice versa.
- The wealth/success and love sections must be consistent with the measured traits (e.g. do not describe relentless ambition if 'drive' is low).

### Personalization
1. Every insight must feel written SPECIFICALLY for ${userName}
${sunSign ? `2. Integrate their zodiac (${sunSign}) and numerology (${lifePathNumber})` : '2. Ground claims in the measured traits above'}
3. Make wealth/success predictions feel achievable and motivating
4. Love insights should be helpful, not fatalistic
5. Daily palm insight should rotate based on their dominant measured trait${sunSign ? ` + ${sunSign}` : ''} + day energy
6. Premium content must feel significantly more valuable
7. Be specific - avoid generic palmistry cliches

### Tone and Voice
- **Confident and declarative**: Use "You are" not "You may be"
- **Warm and empowering**: Make them feel their destiny is meaningful
- **Second person**: Always address them as "You" and "Your"

### CRITICAL: Life Line Rules
- NEVER predict lifespan or death
- NEVER say "long life" or "short life"
- ALWAYS frame as vitality, energy, and life journey

### What NOT to Do
- Never predict death, illness, or lifespan
- Never make medical or health claims
- Never predict specific life events (marriage date, etc.)
- Never use hedging language ("might", "could", "possibly")
- Never output anything except the JSON object
- Never change a measured score, the palm type, the archetype, the talents, or the life theme
- Never give generic readings that could apply to anyone

${!isPremium ? `### Free Tier Note
For free tier, still generate ALL fields but the mobile app will gate premiumContent behind the paywall. Generate the full response regardless.` : ''}

## Entertainment Disclaimer Context
This reading is for entertainment and self-reflection purposes. It's based on palmistry traditions and should inspire self-awareness and empowerment.

## Final Instruction
Write the reading now, wrapping prose around the fixed measured substance above and describing the lines from the image as flavor. Pay attention to whether this is the ${handType} hand, interpret accordingly. Output ONLY the JSON object. No markdown formatting, no code blocks, no explanations, just the raw JSON.
`;
}

/**
 * LEGACY image-based palm prompt — fail-open fallback ONLY (no trait layer).
 * Retained so users whose extraction failed / predate R3 still get a reading.
 */
function buildImageBasedPalmPrompt(
  tier: 'free' | 'premium',
  isDominant: boolean,
  handedness: 'right' | 'left',
  context?: PalmReadingContext
): string {
  const isPremium = tier === 'premium';
  const handType = isDominant ? 'dominant' : 'non-dominant';
  const handDescription = isDominant
    ? 'This is the DOMINANT hand, which reveals the life you are actively creating through your choices, actions, and conscious decisions.'
    : 'This is the NON-DOMINANT hand, which reveals your inherited traits, natural potential, and subconscious patterns.';

  const userName = context?.name || 'friend';
  const sunSign = context?.sunSign || '';
  const lifePathNumber = context?.lifePathNumber || '';

  const schema = palmOutputSchema({
    palmEnergyTypeSpec:
      'Leader Palm / Healer Palm / Creator Palm / Visionary Palm / Survivor Palm / Scholar Palm',
    palmTypeNameSpec: 'Earth Hand / Air Hand / Fire Hand / Water Hand',
    lifeThemeSpec: 'Their overarching life purpose',
    naturalTalentsSpec: '["talent1", "talent2", "talent3", "talent4"]',
  });

  return `${HONESTY_PREAMBLE}

You are a master palm reader combining ancient palmistry wisdom with modern psychological insight. Generate a deeply personalized palm reading.
${buildPalmContextSection(handedness, context)}
## Hand Context
User is ${handedness}-handed.
${handDescription}

Analyze the uploaded palm image and return a JSON response with this EXACT structure:

${schema}

## Critical Guidelines

### Personalization
1. Every insight must feel written SPECIFICALLY for ${userName}
${sunSign ? `2. Integrate their zodiac (${sunSign}) and numerology (${lifePathNumber})` : '2. Be specific about what you observe in their palm'}
3. Make wealth/success predictions feel achievable and motivating
4. Love insights should be helpful, not fatalistic
5. Daily palm insight should rotate based on dominant line${sunSign ? ` + ${sunSign}` : ''} + day energy
6. Premium content must feel significantly more valuable
7. Be specific - avoid generic palmistry cliches

### Tone and Voice
- **Confident and declarative**: Use "You are" not "You may be"
- **Specific and personal**: Reference actual lines and features you observe
- **Warm and empowering**: Make them feel their destiny is meaningful
- **Second person**: Always address them as "You" and "Your"

### CRITICAL: Life Line Rules
- NEVER predict lifespan or death
- NEVER say "long life" or "short life"
- ALWAYS frame as vitality, energy, and life journey

### What NOT to Do
- Never predict death, illness, or lifespan
- Never make medical or health claims
- Never predict specific life events (marriage date, etc.)
- Never use hedging language ("might", "could", "possibly")
- Never output anything except the JSON object
- Never give generic readings that could apply to anyone

${!isPremium ? `### Free Tier Note
For free tier, still generate ALL fields but the mobile app will gate premiumContent behind the paywall. Generate the full response regardless.` : ''}

## Entertainment Disclaimer Context
This reading is for entertainment and self-reflection purposes. It's based on palmistry traditions and should inspire self-awareness and empowerment.

## Final Instruction
Analyze the palm in the image now. Pay special attention to whether this is the ${handType} hand, interpret accordingly. Output ONLY the JSON object. No markdown formatting, no code blocks, no explanations, just the raw JSON.
`;
}
