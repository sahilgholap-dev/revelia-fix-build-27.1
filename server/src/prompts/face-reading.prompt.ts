/**
 * Face Reading Prompt for Claude Vision API
 *
 * Build 27 R2 (§9 steps 5+7): the face reading is now DRIVEN BY the deterministic
 * trait layer, not the pixels. When the caller passes the extracted `substance`
 * (rules-computed FaceTrait[] + closed-set archetype + measured face shape /
 * features from `physiognomy-rules.ts`), this prompt is FED those values as the
 * FIXED SUBSTANCE and instructs the model to write prose AROUND them — never
 * deriving shape / features / scores / archetype from an image, and NEVER
 * contradicting the measured substrate (Sid decision #3). The image is dropped
 * from that call for maximal stability (plan §4 "what the LLM consumes").
 *
 * The legacy image-based path (below) is retained as a FAIL-OPEN fallback for
 * users whose trait layer is missing (uploaded before R2, or extraction found no
 * face) so no user loses their reading — it is NOT the primary path.
 *
 * The `forehead` facial-feature card was DROPPED (Sid, 2026-06-30 — cheekbone
 * prominence is unmeasurable from 2-D frontal 68 landmarks; the per-feature cards
 * are display-only, so dropping it costs zero personalization). It no longer
 * appears in the output schema or the interface.
 */

import { HONESTY_PREAMBLE } from './shared/honesty-preamble';

/**
 * A/B prompt-version tag, matching `DAILY_PROMPT_VERSION` and its four siblings.
 *
 * 🔴 `v1` MEANS "THE FIRST TAGGED VERSION", NOT "THIS PROMPT HAS NEVER CHANGED."
 * It has changed repeatedly across builds; it simply never carried a tag, because
 * R5 step 2 tagged the six SYNTHESIS surfaces and face/palm were explicitly out of
 * that scope (they are direct Vision calls that never touch the routing helper).
 * P99 closes the logging half of that same gap, and a row with no version tag
 * cannot be A/B-attributed at all, so the tag arrives with the row.
 *
 * ⚠️ THE CALL SITE APPENDS `.legacy` ON THE NON-TRAITS PATH, and that is not
 * decoration: `buildFaceReadingPrompt` emits a genuinely different prompt when no
 * measured substance is supplied (image-only, no rules table), so the two paths are
 * two prompts and an A/B that merged them would compare a blend against itself.
 */
export const FACE_PROMPT_VERSION = 'face.v1';

/**
 * Face reading output interface - Enhanced V2
 */
export interface FaceReadingOutput {
  archetype: {
    name: string;
    tagline: string;
    coreEssence: string;
  };

  faceShape: {
    detected: string;
    meaning: string;
    coreTraits: string[];
    emotionalStyle: string;
    strengthsAndTalents: string[];
    careerSuitability: string[];
    whyThisFitsYou: string;
  };

  facialFeatures: {
    eyes: {
      observation: string;
      emotionalDepth: string;
      trustLevel: string;
      intuitionStrength: string;
      insight: string;
    };
    nose: {
      observation: string;
      ambitionLevel: string;
      financialInstinct: string;
      leadershipDrive: string;
      insight: string;
    };
    lips: {
      observation: string;
      loveExpressionStyle: string;
      communicationPattern: string;
      insight: string;
    };
    jawline: {
      observation: string;
      determination: string;
      decisionPower: string;
      authorityPresence: string;
      insight: string;
    };
  };

  traitAnalysis: Array<{
    trait: string;
    score: number;
    description: string;
  }>;

  hiddenStrength: {
    title: string;
    power: string;
    explanation: string;
  };

  hiddenWeakness: {
    title: string;
    pattern: string;
    improvementTip: string;
  };

  strengths: string[];

  dailyFaceInsight: {
    todayEnergy: string;
    todayAdvice: string;
    avoidToday: string;
  };

  premiumContent: {
    deepPersonalityMatrix: string;
    relationshipBlueprint: string;
    careerDestinyPath: string;
    yearAheadForecast: string;
  };

  // Legacy fields for backward compatibility
  categories?: Record<string, { score: number; title: string; description: string }>;
  growthOpportunity?: string;
  affirmation?: string;
  shareableQuote?: string;
}

/**
 * User context for personalization
 */
export interface FaceReadingContext {
  name?: string;
  sunSign?: string;
  lifePathNumber?: number;
}

/**
 * The deterministic, rules-derived SUBSTANCE the reading is written around
 * (Build 27 R2 step 5). Produced by `mapFeaturesToTraits()` in
 * `physiognomy-rules.ts` and persisted on the profile. When present, the reading
 * is traits-driven (no image); when absent, the legacy image path runs.
 */
export interface FaceReadingSubstance {
  /** Measured face-shape class (from the feature vector). */
  faceShape?: string;
  /** Closed-set archetype chosen by the rules table (NOT the model). */
  archetype: { name: string; tagline: string };
  /** Rules-computed trait scores/bands — the fixed substance the prose wraps. */
  traits: Array<{ trait: string; score: number; band?: string; description?: string }>;
  /** Measured facial-feature categoricals (eyeSize, noseLength, …) for grounding. */
  features?: Record<string, string>;
}

/**
 * The output JSON schema shared by both prompt paths. `traitAnalysisBlock` is
 * injected so the traits-driven path can list the FIXED trait/score pairs the
 * model must echo, while the legacy path lists the [60-95] template.
 * NOTE: `forehead` is intentionally absent (Sid, 2026-06-30 — card dropped).
 */
function faceOutputSchema(traitAnalysisBlock: string): string {
  return `{
  "archetype": {
    "name": "The [Archetype Name]",
    "tagline": "One powerful sentence about who they are",
    "coreEssence": "2-3 sentences capturing their fundamental nature"
  },

  "faceShape": {
    "detected": "oval/round/square/heart/oblong/diamond/triangle",
    "meaning": "What this face shape reveals about personality",
    "coreTraits": ["trait1", "trait2", "trait3"],
    "emotionalStyle": "How they process and express emotions",
    "strengthsAndTalents": ["hidden talent 1", "hidden talent 2", "hidden talent 3"],
    "careerSuitability": ["career1", "career2", "career3"],
    "whyThisFitsYou": "Personalized explanation connecting their face shape to their behavior patterns"
  },

  "facialFeatures": {
    "eyes": {
      "observation": "What we see in their eyes",
      "emotionalDepth": "Deep/Moderate/Reserved",
      "trustLevel": "Description of how they build trust",
      "intuitionStrength": "Strong/Developing/Analytical",
      "insight": "Personalized 2-line insight"
    },
    "nose": {
      "observation": "What their nose reveals",
      "ambitionLevel": "High/Steady/Selective",
      "financialInstinct": "Description",
      "leadershipDrive": "Description",
      "insight": "Personalized 2-line insight"
    },
    "lips": {
      "observation": "What their lips reveal",
      "loveExpressionStyle": "How they show love",
      "communicationPattern": "How they communicate",
      "insight": "Personalized 2-line insight"
    },
    "jawline": {
      "observation": "What their jawline reveals",
      "determination": "Level and style",
      "decisionPower": "How they make decisions",
      "authorityPresence": "How they command presence",
      "insight": "Personalized 2-line insight"
    }
  },

  "traitAnalysis": [
${traitAnalysisBlock}
  ],

  "hiddenStrength": {
    "title": "Your Face Reveals a Hidden Gift",
    "power": "One powerful sentence about their hidden strength",
    "explanation": "Why this strength exists and how to use it"
  },

  "hiddenWeakness": {
    "title": "One Trait to Be Mindful Of",
    "pattern": "The pattern or tendency to watch",
    "improvementTip": "Practical advice for growth"
  },

  "strengths": ["strength1", "strength2", "strength3", "strength4", "strength5"],

  "dailyFaceInsight": {
    "todayEnergy": "What their expression energy attracts today",
    "todayAdvice": "One line of actionable advice",
    "avoidToday": "What to be cautious about"
  },

  "premiumContent": {
    "deepPersonalityMatrix": "Extended psychological profile (3-4 paragraphs)",
    "relationshipBlueprint": "How their face reveals their relationship patterns",
    "careerDestinyPath": "Detailed career guidance based on facial features",
    "yearAheadForecast": "What the next 12 months hold based on their facial energy"
  }
}`;
}

function buildContextSection(context?: FaceReadingContext): string {
  if (!context) return '';
  const userName = context.name || 'friend';
  const sunSign = context.sunSign || '';
  const lifePathNumber = context.lifePathNumber || '';
  return `
## User Profile
- Name: ${userName}
${sunSign ? `- Sun Sign: ${sunSign}` : ''}
${lifePathNumber ? `- Life Path Number: ${lifePathNumber}` : ''}

Use this context to make insights feel PERSONALLY WRITTEN for ${userName}. Reference their zodiac and life path naturally.
`;
}

/**
 * Build face reading prompt.
 *
 * @param tier - 'free' or 'premium' subscription level
 * @param context - Optional user context for personalization
 * @param substance - Optional rules-derived trait layer. When present, the
 *   reading is traits-driven (image dropped); when absent, the legacy image
 *   path runs as a fail-open fallback.
 * @returns Complete prompt string for Claude API
 */
export function buildFaceReadingPrompt(
  tier: 'free' | 'premium',
  context?: FaceReadingContext,
  substance?: FaceReadingSubstance
): string {
  const traitsDriven = !!(substance && substance.traits && substance.traits.length > 0);
  return traitsDriven
    ? buildTraitDrivenPrompt(tier, substance!, context)
    : buildImageBasedPrompt(tier, context);
}

/**
 * TRAITS-DRIVEN prompt (Build 27 R2 step 5 — the primary path).
 * The archetype, face shape, and trait scores are the FIXED, measured substance.
 * The model writes prose around them and NEVER contradicts them. No image.
 */
function buildTraitDrivenPrompt(
  tier: 'free' | 'premium',
  substance: FaceReadingSubstance,
  context?: FaceReadingContext
): string {
  const isPremium = tier === 'premium';
  const userName = context?.name || 'friend';
  const sunSign = context?.sunSign || '';
  const lifePathNumber = context?.lifePathNumber || '';

  const traitLines = substance.traits
    .map(
      (t) =>
        `- ${t.trait}, score ${t.score}${t.band ? ` (${t.band})` : ''}${
          t.description ? `: ${t.description}` : ''
        }`
    )
    .join('\n');

  // The exact trait/score pairs the model must echo verbatim into traitAnalysis.
  const traitAnalysisBlock = substance.traits
    .map(
      (t) =>
        `    {
      "trait": "${t.trait}",
      "score": ${t.score},
      "description": "Detailed, warm, second-person prose about this trait, consistent with the score above and the person's other traits. Never contradict the measured value."
    }`
    )
    .join(',\n');

  const featureLines = substance.features
    ? Object.entries(substance.features)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
    : '';

  return `${HONESTY_PREAMBLE}

You are an expert face reader combining physiognomy, psychology, and intuitive analysis. You are writing a deeply personalized face reading.
${buildContextSection(context)}
## FIXED MEASURED SUBSTANCE (do not change, this is the reading's foundation)

This person's facial features were measured deterministically from precise facial-landmark geometry. The archetype, face shape, and trait scores below are ALREADY DECIDED. Your job is to write the VOICE and PROSE around them, you do NOT get to change, re-score, re-name, or contradict them.

Archetype (use EXACTLY this name and tagline, do not invent another):
- Name: ${substance.archetype.name}
- Tagline: ${substance.archetype.tagline}

Face shape (already detected): ${substance.faceShape || 'balanced'}

Measured traits (use these EXACT trait names and scores in traitAnalysis, do NOT alter the numbers, add, or remove traits):
${traitLines}
${featureLines ? `\nMeasured facial features (ground your Facial Feature Analysis in these — every observation must be consistent with them):\n${featureLines}\n` : ''}
Return a JSON response with this EXACT structure:

${faceOutputSchema(traitAnalysisBlock)}

## Critical Guidelines

### PROSE NEVER CONTRADICTS THE MEASURED SUBSTANCE (most important rule)
- The archetype, face shape, and every trait score above are FIXED. Your prose may ELABORATE on them but must NEVER state, imply, or score anything that conflicts with them.
- Echo the archetype name and tagline EXACTLY as given. Echo each trait's name and score EXACTLY as given.
- A trait scored 'high' must read as a clear strength; a 'low' trait must read as understated, never flip a low trait into a headline strength or vice versa.
- Every facial-feature observation must be consistent with the measured features listed above (e.g. do not describe "large expressive eyes" if the measurement says small).
- You have NOT been shown a photograph. Do NOT claim to "see" or "observe" pixels, colours, or anything beyond the measured values above. Write from the measurements.

### Personalization
1. Make every insight feel PERSONALLY WRITTEN for this specific person
${sunSign ? `2. Reference their zodiac (${sunSign}) and life path (${lifePathNumber}) to add layers` : '2. Be specific, grounding claims in the measured traits and features'}
${context?.name ? `3. Use their name (${userName}) naturally in insights` : '3. Address them directly as "you"'}
4. The daily insight should combine their dominant measured trait${sunSign ? ` + ${sunSign} energy` : ''} + today's energy
5. Premium content should be significantly deeper and more valuable
6. Write as if you're speaking directly TO them, not about them

### Tone and Voice
- **Confident and declarative**: Use "You are" not "You may be"
- **Warm and empowering**: Make them feel seen and understood
- **Second person**: Always address them as "You" and "Your"

### What NOT to Do
- Never mention age, weight, or physical attractiveness
- Never make medical or health claims
- Never predict specific life events
- Never use hedging language ("might", "could", "possibly")
- Never output anything except the JSON object
- Never change a measured score or the archetype

${!isPremium ? `### Free Tier Note
For free tier, still generate ALL fields but the mobile app will gate premiumContent behind the paywall. Generate the full response regardless.` : ''}

## Entertainment Disclaimer Context
This reading is for entertainment and self-reflection purposes. It's based on physiognomy traditions and should inspire self-awareness, not be taken as absolute truth.

## Final Instruction
Write the reading now, wrapping prose around the fixed measured substance above. Output ONLY the JSON object. No markdown formatting, no code blocks, no explanations, just the raw JSON.
`;
}

/**
 * LEGACY image-based prompt — fail-open fallback ONLY (no trait layer available).
 * Retained so users whose extraction failed / predate R2 still get a reading.
 * `forehead` dropped from the schema (Sid, 2026-06-30).
 */
function buildImageBasedPrompt(
  tier: 'free' | 'premium',
  context?: FaceReadingContext
): string {
  const isPremium = tier === 'premium';
  const userName = context?.name || 'friend';
  const sunSign = context?.sunSign || '';
  const lifePathNumber = context?.lifePathNumber || '';

  const traitAnalysisBlock = `    {
      "trait": "intellect",
      "score": [60-95],
      "description": "Detailed personalized analysis of their intellectual nature..."
    },
    {
      "trait": "determination",
      "score": [60-95],
      "description": "Detailed personalized analysis..."
    },
    {
      "trait": "empathy",
      "score": [60-95],
      "description": "Detailed personalized analysis..."
    },
    {
      "trait": "creativity",
      "score": [60-95],
      "description": "Detailed personalized analysis..."
    },
    {
      "trait": "leadership",
      "score": [60-95],
      "description": "Detailed personalized analysis..."
    }`;

  return `${HONESTY_PREAMBLE}

You are an expert face reader combining physiognomy, psychology, and intuitive analysis. Generate a deeply personalized face reading.
${buildContextSection(context)}
Analyze the uploaded face image and return a JSON response with this EXACT structure:

${faceOutputSchema(traitAnalysisBlock)}

## Critical Guidelines

### Personalization
1. Make every insight feel PERSONALLY WRITTEN for this specific person
${sunSign ? `2. Reference their zodiac (${sunSign}) and life path (${lifePathNumber}) to add layers` : '2. Be specific about what you observe in their face'}
${context?.name ? `3. Use their name (${userName}) naturally in insights` : '3. Address them directly as "you"'}
4. Avoid generic statements - be SPECIFIC to what you see
5. The daily insight should combine their dominant facial trait${sunSign ? ` + ${sunSign} energy` : ''} + today's energy
6. Premium content should be significantly deeper and more valuable
7. Write as if you're speaking directly TO them, not about them

### Tone and Voice
- **Confident and declarative**: Use "You are" not "You may be"
- **Specific and personal**: Reference actual features you observe
- **Warm and empowering**: Make them feel seen and understood
- **Second person**: Always address them as "You" and "Your"

### Scoring Guidelines
- **90-95**: Exceptional, rare strength clearly visible
- **80-89**: Strong, well-developed trait
- **70-79**: Above average, noticeable
- **60-69**: Moderate, present but not dominant
- Vary scores authentically. Most people have 1-2 areas in 80s-90s and others in 60s-70s.

### What NOT to Do
- Never mention age, weight, or physical attractiveness
- Never make medical or health claims
- Never predict specific life events
- Never use hedging language ("might", "could", "possibly")
- Never output anything except the JSON object
- Never make all scores similar
- Never give generic readings that could apply to anyone

${!isPremium ? `### Free Tier Note
For free tier, still generate ALL fields but the mobile app will gate premiumContent behind the paywall. Generate the full response regardless.` : ''}

## Entertainment Disclaimer Context
This reading is for entertainment and self-reflection purposes. It's based on physiognomy traditions and should inspire self-awareness, not be taken as absolute truth.

## Final Instruction
Analyze the face in the image now. Output ONLY the JSON object. No markdown formatting, no code blocks, no explanations, just the raw JSON.
`;
}
