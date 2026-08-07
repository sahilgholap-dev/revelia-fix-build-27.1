# Daily, Weekly & Monthly Insights Integration Guide

## Overview

This guide helps backend developers integrate the new insight prompts (daily, weekly, monthly) into the Revelia API.

## What's New

Three new prompt files have been created:

1. **`daily-insight.prompt.ts`** - Daily personalized insights (Premium Plus)
2. **`weekly-forecast.prompt.ts`** - Weekly forecasts with day-by-day guidance (Premium Plus)
3. **`monthly-reading.prompt.ts`** - Monthly readings with two tiers (Free & Premium)

## Key Differences from Face/Palm Readings

### No Image Required

Unlike face and palm readings, insights are **text-only**:
- Use Claude's standard API (not Vision API)
- No image upload needed
- Faster and cheaper to generate

### Profile-Based

Insights require the user's **complete Revelia Profile**:
- Face archetype (from face reading)
- Palm type (from palm reading)
- Sun sign (from birth date)
- Life path number (from birth date)
- Personal year/month (calculated from birth date + current date)
- Strengths, talents, traits (from readings)

### Time-Sensitive

Insights are tied to specific dates:
- **Daily**: Generated for today, valid for 24 hours
- **Weekly**: Generated for a specific week (Monday-Sunday), valid for 7 days
- **Monthly**: Generated for a specific month, valid for 30-31 days

## Required Data Structure

### UserInsightProfile

Before generating insights, you need to build a `UserInsightProfile` from the user's data:

```typescript
import { UserInsightProfile } from '../types/shared';

interface UserInsightProfile {
  name: string;
  sunSign: string;               // From birth date
  lifePathNumber: number;        // Calculated from birth date
  personalYear: number;          // Calculated from birth date + current year
  personalMonth: number;         // Calculated from personal year + current month
  personalYearMeaning: string;   // Numerology meaning
  faceArchetype: string;         // From face reading
  faceArchetypeTagline: string;  // From face reading
  strengths: string[];           // From face reading
  growthOpportunity: string;     // From face reading
  palmType: string;              // From palm reading
  palmLifeTheme: string;         // From palm reading
  naturalTalents: string[];      // From palm reading
  dominantTraits: string[];      // Combined from face + palm
}
```

### Building the Profile

You'll need a helper function to construct this from the user's data:

```typescript
import { UserProfile, Reading } from '../types/shared';
import { calculatePersonalYear, calculatePersonalMonth, getPersonalYearMeaning } from '../utils/numerology';

export async function buildUserInsightProfile(
  userProfile: UserProfile,
  faceReading: Reading,
  palmReading: Reading
): Promise<UserInsightProfile> {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const personalYear = calculatePersonalYear(userProfile.birthData.date, currentYear);
  const personalMonth = calculatePersonalMonth(personalYear, currentMonth);
  
  return {
    name: userProfile.name,
    sunSign: userProfile.sunSign,
    lifePathNumber: userProfile.lifePathNumber,
    personalYear,
    personalMonth,
    personalYearMeaning: getPersonalYearMeaning(personalYear),
    faceArchetype: faceReading.content.archetype.name,
    faceArchetypeTagline: faceReading.content.archetype.tagline,
    strengths: faceReading.content.strengths,
    growthOpportunity: faceReading.content.growthOpportunity || '',
    palmType: palmReading.content.palmType.name,
    palmLifeTheme: palmReading.content.destiny.lifeTheme,
    naturalTalents: palmReading.content.destiny.naturalTalents,
    dominantTraits: extractDominantTraits(faceReading, palmReading)
  };
}

function extractDominantTraits(faceReading: Reading, palmReading: Reading): string[] {
  // Combine top traits from both readings
  const traits: string[] = [];
  
  // Add from face reading categories
  Object.values(faceReading.content.categories).forEach((cat: any) => {
    if (cat.score >= 80) {
      traits.push(cat.title);
    }
  });
  
  // Add from palm reading
  traits.push(...palmReading.content.destiny.naturalTalents.slice(0, 2));
  
  return traits.slice(0, 5); // Top 5 traits
}
```

## API Endpoints to Create

### 1. Daily Insight Endpoint

**Route:** `GET /api/insights/daily`

**Access:** Premium Plus only

**Response:**
```typescript
{
  success: true,
  data: {
    insight: DailyInsightOutput,
    generatedAt: string,
    validUntil: string,
    cached: boolean
  }
}
```

**Implementation:**
```typescript
import { buildDailyInsightPrompt } from '../prompts';
import { claudeAPI } from '../services/claude';

export async function getDailyInsight(userId: string): Promise<DailyInsightOutput> {
  // 1. Check cache first
  const cached = await InsightCache.findOne({
    userId,
    type: 'daily',
    validUntil: { $gte: new Date() }
  });
  
  if (cached) {
    return cached.content;
  }
  
  // 2. Get user profile and readings
  const userProfile = await UserProfile.findOne({ userId });
  const faceReading = await Reading.findOne({ userId, type: 'face' }).sort({ createdAt: -1 });
  const palmReading = await Reading.findOne({ userId, type: 'palm-dominant' }).sort({ createdAt: -1 });
  
  if (!faceReading || !palmReading) {
    throw new Error('User must complete face and palm readings first');
  }
  
  // 3. Build insight profile
  const profile = await buildUserInsightProfile(userProfile, faceReading, palmReading);
  
  // 4. Generate prompt
  const prompt = buildDailyInsightPrompt(profile);
  
  // 5. Call Claude API
  const response = await claudeAPI({ prompt });
  const insight: DailyInsightOutput = JSON.parse(response);
  
  // 6. Cache for 24 hours
  const validUntil = new Date();
  validUntil.setHours(23, 59, 59, 999); // End of today
  
  await InsightCache.create({
    userId,
    type: 'daily',
    content: insight,
    validUntil,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return insight;
}
```

### 2. Weekly Forecast Endpoint

**Route:** `GET /api/insights/weekly?weekStart=2026-01-26`

**Access:** Premium Plus only

**Query Params:**
- `weekStart` (optional): ISO date string for Monday of the week. Defaults to current week.

**Response:**
```typescript
{
  success: true,
  data: {
    forecast: WeeklyForecastOutput,
    generatedAt: string,
    validUntil: string,
    cached: boolean
  }
}
```

**Implementation:**
```typescript
import { buildWeeklyForecastPrompt } from '../prompts';
import { claudeAPI } from '../services/claude';

export async function getWeeklyForecast(
  userId: string,
  weekStart?: Date
): Promise<WeeklyForecastOutput> {
  // Default to current week's Monday
  if (!weekStart) {
    weekStart = getMonday(new Date());
  }
  
  // 1. Check cache
  const cached = await InsightCache.findOne({
    userId,
    type: 'weekly',
    'content.weekOf': { $regex: weekStart.toLocaleDateString() },
    validUntil: { $gte: new Date() }
  });
  
  if (cached) {
    return cached.content;
  }
  
  // 2. Get user profile and readings
  const userProfile = await UserProfile.findOne({ userId });
  const faceReading = await Reading.findOne({ userId, type: 'face' }).sort({ createdAt: -1 });
  const palmReading = await Reading.findOne({ userId, type: 'palm-dominant' }).sort({ createdAt: -1 });
  
  if (!faceReading || !palmReading) {
    throw new Error('User must complete face and palm readings first');
  }
  
  // 3. Build insight profile
  const profile = await buildUserInsightProfile(userProfile, faceReading, palmReading);
  
  // 4. Generate prompt
  const prompt = buildWeeklyForecastPrompt(profile, weekStart);
  
  // 5. Call Claude API
  const response = await claudeAPI({ prompt });
  const forecast: WeeklyForecastOutput = JSON.parse(response);
  
  // 6. Cache for 7 days
  const validUntil = new Date(weekStart);
  validUntil.setDate(validUntil.getDate() + 7);
  
  await InsightCache.create({
    userId,
    type: 'weekly',
    content: forecast,
    validUntil,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return forecast;
}

function getMonday(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}
```

### 3. Monthly Reading Endpoint

**Route:** `GET /api/insights/monthly?month=2&year=2026`

**Access:** Free (basic) & Premium (full)

**Query Params:**
- `month` (optional): 1-12. Defaults to current month.
- `year` (optional): Defaults to current year.

**Response:**
```typescript
{
  success: true,
  data: {
    reading: MonthlyReadingOutput,
    tier: 'free' | 'premium',
    generatedAt: string,
    validUntil: string,
    cached: boolean
  }
}
```

**Implementation:**
```typescript
import { buildMonthlyReadingPrompt } from '../prompts';
import { claudeAPI } from '../services/claude';

export async function getMonthlyReading(
  userId: string,
  month?: number,
  year?: number
): Promise<{ reading: MonthlyReadingOutput; tier: 'free' | 'premium' }> {
  // Default to current month/year
  const now = new Date();
  month = month || now.getMonth() + 1;
  year = year || now.getFullYear();
  
  // 1. Get user subscription tier
  const user = await User.findById(userId);
  const tier = user.subscription.tier === 'free' ? 'free' : 'premium';
  
  // 2. Check cache
  const cached = await InsightCache.findOne({
    userId,
    type: 'monthly',
    'content.month': { $regex: `${getMonthName(month)} ${year}` },
    validUntil: { $gte: new Date() }
  });
  
  if (cached && cached.content.tier === tier) {
    return { reading: cached.content, tier };
  }
  
  // 3. Get user profile and readings
  const userProfile = await UserProfile.findOne({ userId });
  const faceReading = await Reading.findOne({ userId, type: 'face' }).sort({ createdAt: -1 });
  const palmReading = await Reading.findOne({ userId, type: 'palm-dominant' }).sort({ createdAt: -1 });
  
  if (!faceReading || !palmReading) {
    throw new Error('User must complete face and palm readings first');
  }
  
  // 4. Build insight profile
  const profile = await buildUserInsightProfile(userProfile, faceReading, palmReading);
  
  // 5. Generate prompt
  const prompt = buildMonthlyReadingPrompt(profile, month, year, tier);
  
  // 6. Call Claude API
  const response = await claudeAPI({ prompt });
  const reading: MonthlyReadingOutput = JSON.parse(response);
  
  // 7. Cache for the month
  const validUntil = new Date(year, month, 0, 23, 59, 59); // Last day of month
  
  await InsightCache.create({
    userId,
    type: 'monthly',
    content: { ...reading, tier },
    validUntil,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return { reading, tier };
}
```

## Caching Strategy

### Why Cache?

1. **Cost savings**: Claude API calls are expensive
2. **Performance**: Instant responses for cached insights
3. **Consistency**: Same insight for the time period

### Cache Duration

- **Daily**: Until end of day (23:59:59)
- **Weekly**: 7 days from week start
- **Monthly**: Until end of month

### Cache Invalidation

Invalidate cache when:
- User updates their profile (birth date, name)
- User gets new face or palm reading
- Time period expires

## Error Handling

### Common Errors

1. **Missing Readings**
   - User hasn't completed face or palm reading
   - Return 400: "Complete your face and palm readings first"

2. **Invalid Subscription**
   - User tries to access Premium Plus feature without subscription
   - Return 403: "Upgrade to Premium Plus for daily insights"

3. **JSON Parse Error**
   - Claude returns invalid JSON
   - Log error, retry once, then return 500

4. **Claude API Error**
   - API timeout or rate limit
   - Return 503: "Service temporarily unavailable"

## Testing

### Unit Tests

```typescript
describe('Daily Insight', () => {
  it('should generate personalized daily insight', async () => {
    const profile = mockUserInsightProfile();
    const prompt = buildDailyInsightPrompt(profile);
    
    expect(prompt).toContain(profile.name);
    expect(prompt).toContain(profile.sunSign);
    expect(prompt).toContain(profile.faceArchetype);
  });
  
  it('should return cached insight if valid', async () => {
    const userId = 'test-user';
    const cached = await getDailyInsight(userId);
    const second = await getDailyInsight(userId);
    
    expect(cached).toEqual(second);
  });
});
```

### Integration Tests

```typescript
describe('GET /api/insights/daily', () => {
  it('should require Premium Plus subscription', async () => {
    const response = await request(app)
      .get('/api/insights/daily')
      .set('Authorization', `Bearer ${freeUserToken}`);
    
    expect(response.status).toBe(403);
  });
  
  it('should return daily insight for Premium Plus user', async () => {
    const response = await request(app)
      .get('/api/insights/daily')
      .set('Authorization', `Bearer ${premiumPlusToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.insight).toHaveProperty('headline');
    expect(response.body.data.insight).toHaveProperty('focusArea');
  });
});
```

## Cost Estimation

### Per Insight

- **Daily**: ~500 input tokens + ~300 output tokens = ~$0.01
- **Weekly**: ~600 input tokens + ~800 output tokens = ~$0.03
- **Monthly (Free)**: ~600 input tokens + ~400 output tokens = ~$0.015
- **Monthly (Premium)**: ~700 input tokens + ~1500 output tokens = ~$0.04

### With Caching

Assuming 80% cache hit rate:
- **Daily** (per user/month): 30 insights × 20% × $0.01 = **$0.06/month**
- **Weekly** (per user/month): 4 insights × 20% × $0.03 = **$0.024/month**
- **Monthly** (per user/month): 1 insight × 20% × $0.04 = **$0.008/month**

**Total per Premium Plus user:** ~$0.09/month

## Monitoring

### Metrics to Track

1. **Cache hit rate**: Should be >80%
2. **Generation time**: Should be <5 seconds
3. **JSON parse errors**: Should be <1%
4. **User engagement**: Daily insight open rate
5. **Cost per user**: Should stay under $0.10/month

### Alerts

- Cache hit rate drops below 70%
- JSON parse errors exceed 2%
- Average generation time exceeds 10 seconds
- Cost per user exceeds $0.15/month

## Next Steps

1. **Create API routes** for daily, weekly, monthly endpoints
2. **Implement caching** using InsightCache model
3. **Add subscription checks** for Premium Plus features
4. **Build helper functions** for UserInsightProfile construction
5. **Write tests** for prompt generation and API endpoints
6. **Set up monitoring** for cache hit rate and costs
7. **Document API** in Swagger/OpenAPI spec

## Questions?

Contact the AI Prompt Agent for:
- Prompt modifications
- Output schema changes
- Quality concerns
- New insight types

---

*Created: January 2026*
