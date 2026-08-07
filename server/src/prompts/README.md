# Revelia AI Reading Prompts

This directory contains all Claude Sonnet 4.5 Vision API prompts for generating personalized readings.

## Available Prompts

### 1. Face Reading (`face-reading.prompt.ts`)

Generates personalized face readings based on physiognomy principles.

**Usage:**
```typescript
import { buildFaceReadingPrompt, FaceReadingOutput } from './prompts';

// Free tier
const freePrompt = buildFaceReadingPrompt('free');

// Premium tier with context
const premiumPrompt = buildFaceReadingPrompt('premium', {
  name: 'Sarah',
  sunSign: 'Leo',
  lifePathNumber: 7
});

// Send to Claude Vision API
const response = await claudeVisionAPI({
  prompt: premiumPrompt,
  image: faceImageBase64
});

const reading: FaceReadingOutput = JSON.parse(response);
```

**Output Structure:**
- `archetype`: Name and tagline capturing their essence
- `categories`: Intellect, determination (free); + emotional, communication, perception, creativity (premium)
- `strengths`: 3-5 key strengths based on features
- `growthOpportunity`: Premium only - positively framed growth area
- `affirmation`: Premium only - personal "I" statement
- `shareableQuote`: Always included - screenshot-worthy insight

**Tier Differences:**
- **Free**: 2 categories (intellect, determination), 3 strengths, shareable quote (~200 words)
- **Premium**: 6 categories, 5 strengths, growth opportunity, affirmation, shareable quote (~800-1200 words)

---

### 2. Palm Reading (`palm-reading.prompt.ts`)

Generates personalized palm readings based on palmistry principles.

**Usage:**
```typescript
import { buildPalmReadingPrompt, PalmReadingOutput } from './prompts';

// Free tier - dominant hand
const freePrompt = buildPalmReadingPrompt('free', true, 'right');

// Premium tier - non-dominant hand with context
const premiumPrompt = buildPalmReadingPrompt('premium', false, 'right', {
  name: 'Sarah',
  sunSign: 'Leo',
  lifePathNumber: 7
});

// Send to Claude Vision API
const response = await claudeVisionAPI({
  prompt: premiumPrompt,
  image: palmImageBase64
});

const reading: PalmReadingOutput = JSON.parse(response);
```

**Parameters:**
- `tier`: 'free' | 'premium'
- `isDominant`: true for dominant hand (active life), false for non-dominant (innate potential)
- `handedness`: 'right' | 'left' - user's dominant hand
- `context`: Optional user context for personalization

**Output Structure:**
- `palmType`: Earth/Air/Fire/Water hand classification and description
- `lines`: Heart, head (free); + life, fate (premium)
- `mounts`: Premium only - Jupiter, Saturn, Apollo, Mercury
- `destiny`: Life theme, natural talents (free); + challenges, advice (premium)
- `shareableQuote`: Always included - screenshot-worthy insight

**Tier Differences:**
- **Free**: Palm type, heart + head lines, 2 talents, shareable quote (~200 words)
- **Premium**: All lines, all mounts, full destiny section (~800-1200 words)

---

## Prompt Design Philosophy

### Core Principles

1. **Specificity Over Generality**
   - Prompts instruct Claude to reference actual observed features
   - "Your prominent brow ridge..." not "You might be intelligent"

2. **Confident Tone**
   - No hedging language ("may", "might", "could be")
   - Declarative statements: "You are" not "You may be"

3. **Positive Framing**
   - Even growth areas presented as opportunities
   - Focus on potential and strengths

4. **Shareability**
   - Every reading includes a quotable insight
   - Designed for screenshot sharing

5. **Structured Output**
   - Always valid JSON
   - Parseable by backend
   - Type-safe interfaces

### Safety Guidelines

All prompts include instructions to:
- ❌ Never make medical or health claims
- ❌ Never predict death or lifespan (especially in palm readings)
- ❌ Never mention age, weight, or physical attractiveness
- ❌ Never predict specific life events
- ✅ Frame as entertainment and self-reflection
- ✅ Focus on personality, character, and potential

### Token Efficiency

- **Free tier**: ~200 words output (~300 tokens)
- **Premium tier**: ~800-1200 words output (~1200-1800 tokens)
- **Cost target**: $0.02-0.03 per reading

---

## Testing Prompts

Before deploying, test prompts with sample images:

```typescript
import { buildFaceReadingPrompt } from './prompts';

// Test with sample face image
const testPrompt = buildFaceReadingPrompt('premium', {
  name: 'Test User',
  sunSign: 'Aries',
  lifePathNumber: 5
});

// Verify:
// 1. JSON output is valid and parseable
// 2. Content feels personal and specific
// 3. References actual facial features
// 4. Tone is confident and warm
// 5. Shareable quote is powerful
// 6. No medical/health claims
// 7. Tier differences are meaningful
```

---

### 3. Daily Insight (`daily-insight.prompt.ts`)

Generates personalized daily insights combining user's complete Revelia Profile with today's astrological and numerological energies.

**Usage:**
```typescript
import { buildDailyInsightPrompt } from './prompts';
import { UserInsightProfile, DailyInsightOutput } from '../types/shared';

const profile: UserInsightProfile = {
  name: 'Sarah',
  sunSign: 'Taurus',
  lifePathNumber: 7,
  personalYear: 5,
  personalMonth: 3,
  personalYearMeaning: 'Year of Change and Freedom',
  faceArchetype: 'The Visionary',
  faceArchetypeTagline: 'You see possibilities others miss',
  strengths: ['Analytical thinking', 'Strategic planning', 'Problem-solving'],
  growthOpportunity: 'Trusting intuition alongside logic',
  palmType: 'Fire Hand',
  palmLifeTheme: 'Leadership through authentic action',
  naturalTalents: ['Natural leadership', 'Quick decision-making', 'Inspiring others'],
  dominantTraits: ['Confident', 'Direct', 'Passionate']
};

const prompt = buildDailyInsightPrompt(profile);

// Send to Claude API (text-only, no image)
const response = await claudeAPI({ prompt });
const insight: DailyInsightOutput = JSON.parse(response);
```

**Output Structure:**
- `headline`: Catchy 3-6 word headline for the day
- `insight`: 3-4 sentences of personalized guidance (80-120 words)
- `focusArea`: Career | Love | Health | Growth | Creativity
- `luckyElement`: { type: 'number' | 'color' | 'time', value: string }
- `affirmation`: Personal "I" statement for today
- `shareableQuote`: Screenshot-worthy wisdom

**Key Features:**
- Integrates sun sign + numerology + face archetype + palm type
- References specific user traits (not generic horoscopes)
- Actionable guidance for the day
- Premium Plus feature

---

### 4. Weekly Forecast (`weekly-forecast.prompt.ts`)

Generates personalized weekly forecasts with day-by-day guidance and best days for different activities.

**Usage:**
```typescript
import { buildWeeklyForecastPrompt } from './prompts';
import { UserInsightProfile, WeeklyForecastOutput } from '../types/shared';

const profile: UserInsightProfile = { /* ... */ };
const weekStart = new Date('2026-01-26'); // Monday

const prompt = buildWeeklyForecastPrompt(profile, weekStart);

// Send to Claude API
const response = await claudeAPI({ prompt });
const forecast: WeeklyForecastOutput = JSON.parse(response);
```

**Output Structure:**
- `weekOf`: Date range string (e.g., "January 27 - February 2, 2026")
- `theme`: 2-4 word theme for the week
- `overview`: 2-3 paragraphs (200-300 words) of integrated guidance
- `days`: Array of 7 day forecasts with energy level and focus
- `bestDays`: { forLove, forCareer, forCreativity } with explanations
- `challenges`: What to watch for with solutions
- `advice`: How their archetype can thrive this week
- `affirmation`: Weekly "I" statement
- `shareableQuote`: Screenshot-worthy wisdom

**Key Features:**
- Day-by-day breakdown (Monday-Sunday)
- Energy levels: high | moderate | reflective
- Best days identified for love, career, creativity
- Challenges framed positively with solutions
- Premium Plus feature

---

### 5. Monthly Reading (`monthly-reading.prompt.ts`)

Generates comprehensive monthly readings with two tier levels: free (basic) and premium (full).

**Usage:**
```typescript
import { buildMonthlyReadingPrompt } from './prompts';
import { UserInsightProfile, MonthlyReadingOutput } from '../types/shared';

const profile: UserInsightProfile = { /* ... */ };

// Free tier
const freePrompt = buildMonthlyReadingPrompt(profile, 2, 2026, 'free');

// Premium tier
const premiumPrompt = buildMonthlyReadingPrompt(profile, 2, 2026, 'premium');

// Send to Claude API
const response = await claudeAPI({ prompt: premiumPrompt });
const reading: MonthlyReadingOutput = JSON.parse(response);
```

**Output Structure (Free Tier):**
- `month`: Month name and year
- `theme`: 2-4 word theme
- `overview`: 1 paragraph (~200 words) with personalization
- `keyDates`: 3 key dates with significance and advice
- `affirmation`: Monthly "I" statement
- `shareableQuote`: Screenshot-worthy wisdom

**Output Structure (Premium Tier):**
- All free tier fields PLUS:
- `numerology`: { personalMonth, meaning, guidance }
- `astrology`: { sunSignForecast, keyTransits, retrogradeWarnings }
- `keyDates`: 8-12 key dates (expanded)
- `areas`: { love, career, money, health } with forecasts and best days
- `profileIntegration`: Paragraph on how complete profile creates opportunities
- `challenges`: Monthly challenges with solutions
- `opportunities`: Where to focus for best results

**Tier Differences:**
- **Free**: ~200 words, basic personalization, 3 key dates
- **Premium**: ~800-1200 words, deep integration, 8-12 key dates, life areas breakdown

**Key Features:**
- Two distinct tier experiences
- Deep profile integration (archetype + palm + sun sign + numerology)
- Specific timing guidance throughout the month
- Premium available to all paid tiers

---

## Future Prompts

Planned additions:
- `combined-reading.prompt.ts` - Synthesize face + palm for complete profile
- `compatibility.prompt.ts` - Two-user compatibility analysis
- `numerology.prompt.ts` - Detailed numerology report

---

## Integration with Backend

These prompts are used by the reading service:

```typescript
// In reading.service.ts
import { buildFaceReadingPrompt, FaceReadingOutput } from '../prompts';
import { claudeVisionAPI } from '../services/claude';

export async function generateFaceReading(
  imageUrl: string,
  tier: 'free' | 'premium',
  userProfile: UserProfile
): Promise<FaceReadingOutput> {
  const prompt = buildFaceReadingPrompt(tier, {
    name: userProfile.name,
    sunSign: userProfile.sunSign,
    lifePathNumber: userProfile.lifePathNumber
  });

  const response = await claudeVisionAPI({
    prompt,
    image: imageUrl
  });

  return JSON.parse(response);
}
```

---

## Maintenance

### When to Update Prompts

1. **User feedback indicates readings feel generic**
   - Add more specific feature references
   - Strengthen instructions for personalization

2. **JSON parsing errors**
   - Clarify output format instructions
   - Add more examples

3. **Tone issues (too vague, too clinical)**
   - Adjust tone guidelines
   - Update example outputs

4. **Cost concerns**
   - Reduce output length targets
   - Optimize prompt efficiency

### Version Control

When updating prompts:
1. Test with sample images first
2. Compare outputs before/after
3. Verify JSON parsing still works
4. Check tier differences remain meaningful
5. Document changes in git commit

---

*Last updated: 2025*
