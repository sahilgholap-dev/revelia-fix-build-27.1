# Compatibility Reading Prompt

## Overview

The compatibility reading prompt is Revelia's **viral growth mechanism**. It analyzes two people and generates a compatibility reading that users will want to share, driving organic app downloads.

## The Viral Loop

1. **User takes compatibility reading** with partner/friend/crush
2. **Gets shareable card** with both photos + score + powerful quote
3. **Shares on social media** because the quote is screenshot-worthy
4. **Partner/friends see card** → want to know their full reading → **download app**

## File Location

`/app/server/src/prompts/compatibility.prompt.ts`

## Key Function

```typescript
export function buildCompatibilityPrompt(
  user1: UserCompatibilityProfile,
  user2: PartnerCompatibilityProfile,
  tier: 'free' | 'premium'
): string
```

## Two Scenarios

### Scenario A: Partner Has Birth Data

**Input:**
- User 1: Full Revelia profile (face archetype, palm type, sun sign, life path)
- User 2: Photo + sun sign + life path number

**Analysis:**
- Analyze User 2's face for archetype and traits
- Compare astrological compatibility (sun signs)
- Compare numerological compatibility (life paths)
- Compare personality archetypes
- Integrate all dimensions

**Output (Premium):**
- 5 category scores (emotional, intellectual, communication, values, passion)
- Cosmic connection section (sun sign + numerology + archetype synergy)
- 4 strengths, 2 challenges, detailed advice
- Affirmation + shareable quote

### Scenario B: Partner Has NO Birth Data (Photo Only)

**Input:**
- User 1: Full Revelia profile
- User 2: Photo only

**Analysis:**
- Analyze User 2's face thoroughly (archetype, traits, communication style, emotional nature)
- Compare personality compatibility based on face analysis
- Focus on archetype synergy and observed traits

**Output (Free):**
- 2 category scores (emotional, communication)
- 2 strengths
- Shareable quote

## Output Structure

### Free Tier (~300 words)

```json
{
  "overallScore": 75,
  "headline": "A Dynamic Power Duo",
  "summary": "2-3 sentences celebrating the connection",
  "categoryScores": {
    "emotional": { "score": 82, "title": "...", "description": "..." },
    "communication": { "score": 78, "title": "...", "description": "..." }
  },
  "strengths": ["strength1", "strength2"],
  "shareableQuote": "Your Visionary mind and their grounded wisdom create the rare alchemy where dreams meet reality."
}
```

### Premium Tier (~800-1000 words)

```json
{
  "overallScore": 75,
  "headline": "A Dynamic Power Duo",
  "summary": "...",
  "categoryScores": {
    "emotional": { "score": 82, "title": "...", "description": "..." },
    "intellectual": { "score": 88, "title": "...", "description": "..." },
    "communication": { "score": 78, "title": "...", "description": "..." },
    "values": { "score": 85, "title": "...", "description": "..." },
    "passion": { "score": 90, "title": "...", "description": "..." }
  },
  "strengths": ["strength1", "strength2", "strength3", "strength4"],
  "challenges": ["positively framed challenge1", "challenge2"],
  "advice": "2-3 paragraphs of relationship guidance",
  "cosmicConnection": {
    "sunSignCompatibility": "Paragraph on Taurus-Scorpio dynamic",
    "numerologyAlignment": "Paragraph on Life Path 7-3 compatibility",
    "archetypeSynergy": "How Visionary + Guardian archetypes work together"
  },
  "affirmation": "We honor both our differences and our deep connection...",
  "shareableQuote": "The universe knew what it was doing when it brought a Taurus and Scorpio together—depth meets devotion."
}
```

## Scoring Guidelines

### Overall Score Ranges

- **90-100**: Exceptional connection (RARE—reserve for truly aligned pairs)
- **75-89**: Strong compatibility (most healthy relationships)
- **60-74**: Good potential (requires conscious effort)
- **40-59**: Challenging but workable (highlight strengths)
- **<40**: Significant differences (still frame positively)

### Category Scores

- **Vary authentically** based on observed traits
- Some categories can be 90+ while others are 60-70
- Don't cluster all scores around the same number
- Higher scores need clear justification

### Scoring Factors

**With Birth Data:**
- Sun sign compatibility (fire/earth/air/water dynamics)
- Life path number harmony
- Archetype synergy
- Communication style alignment
- Emotional nature compatibility
- Values and life approach

**Without Birth Data:**
- Archetype synergy (from face analysis)
- Communication style (from face analysis)
- Emotional nature (from face analysis)
- Intellectual approach (from face analysis)
- Energy levels (from face analysis)
- Overall personality harmony

## The Shareable Quote (CRITICAL)

This is the **viral mechanism**. It must:

1. **Reference something specific** about this pairing
2. **Be quotable and screenshot-worthy**
3. **Make both people feel special**
4. **Be 1-2 sentences maximum** (15-30 words)
5. **Sound poetic but authentic**

### ✅ Good Examples

- "Your Visionary mind and their grounded wisdom create the rare alchemy where dreams meet reality."
- "Two Fire Hands together? A relationship that transforms obstacles into adventures."
- "The universe knew what it was doing when it brought a Taurus and Scorpio together—depth meets devotion."
- "Where Sarah sees possibilities, Alex builds foundations—together, you create miracles."

### ❌ Bad Examples

- "You two are compatible and will have a good relationship." (Generic, boring)
- "Love conquers all." (Not specific to them)
- "You're perfect for each other." (Vague, no substance)

## Personalization Requirements

Every reading must feel **specific to THIS pairing**.

### ❌ Generic (Bad)

"You two are compatible. Communication is good."

### ✅ Personalized (Good)

"Sarah's Visionary archetype finds perfect balance with Alex's grounded, practical nature visible in their strong jaw and steady gaze. Where Sarah sees possibilities, Alex builds the foundation."

### ✅ With Birth Data (Good)

"The Taurus-Scorpio dynamic creates magnetic attraction. Sarah's Life Path 7 analytical depth helps navigate Alex's Life Path 3 expressive intensity."

## Tone Requirements

- **Celebratory**: Honor the connection
- **Balanced**: Honest but constructive
- **Specific**: Reference both people's actual traits
- **Actionable**: Practical relationship advice
- **Shareable**: Quote must be screenshot-worthy
- **Confident**: Use "You are" not "You might be"
- **Warm**: Make both people feel seen and valued

## Challenges Must Be Constructive

Frame challenges as **growth invitations**, not problems.

### ✅ Good

"Your different paces—Sarah's quick decisions and Alex's thoughtful reflection—invite you to find a rhythm that honors both."

### ❌ Bad

"You'll fight about decision-making."

## What NOT to Do

- ❌ Never predict marriage, breakups, or relationship duration
- ❌ Never make all scores 75-85 (vary them!)
- ❌ Never give generic advice that could apply to any couple
- ❌ Never ignore Person 2's face—analyze it thoroughly
- ❌ Never frame challenges as "problems" or "issues"
- ❌ Never make the shareable quote generic or boring
- ❌ Never use hedging language ("might", "could", "possibly")
- ❌ Never make medical, financial, or legal claims

## Face Analysis for Person 2

When analyzing the partner's face, look for:

### Archetype Indicators

- **Face shape, forehead, overall energy** → fundamental approach to life
- **Eyes** → emotional depth, perception, how they see the world
- **Jaw/chin** → determination, resilience, groundedness
- **Lips** → communication style, expressiveness, warmth
- **Overall harmony** → creativity, balance, complexity

### Compatibility Factors

- Do their features suggest similar or complementary energy?
- What does their face reveal about emotional style?
- How might their communication style work with User 1's style?
- Do they appear more analytical (high forehead) or intuitive (deep eyes)?
- Is their energy intense (strong features) or gentle (soft features)?

## Integration with Backend

The backend will:

1. Receive compatibility request with User 1 profile + User 2 photo/data
2. Build `UserCompatibilityProfile` from User 1's stored readings
3. Build `PartnerCompatibilityProfile` from User 2's input
4. Call `buildCompatibilityPrompt(user1, user2, tier)`
5. Send prompt + User 2's photo to Claude Vision API
6. Parse JSON response into `CompatibilityOutput`
7. Store reading in database
8. Return to mobile app for display + share card generation

## Testing Checklist

- [ ] Free tier outputs only 2 categories + 2 strengths + quote
- [ ] Premium tier outputs all 5 categories + challenges + advice + cosmic connection
- [ ] Shareable quote is specific and powerful
- [ ] Overall score varies authentically (not always 80+)
- [ ] Category scores vary (not all clustered)
- [ ] Challenges are framed positively
- [ ] Both people's traits are referenced
- [ ] Works with birth data (Scenario A)
- [ ] Works without birth data (Scenario B)
- [ ] JSON parses correctly
- [ ] No hedging language ("might", "could")
- [ ] No predictions about marriage/breakups

## Cost Considerations

- **Free tier**: ~300 words output (~$0.015 per reading)
- **Premium tier**: ~800-1000 words output (~$0.025-0.030 per reading)
- **Image analysis**: Included in Claude Vision API call
- **Target**: Keep premium readings under $0.03 per generation

## Success Metrics

1. **Share rate**: % of users who share their compatibility card
2. **Viral coefficient**: # of new users per shared card
3. **Quote quality**: User feedback on shareable quotes
4. **Personalization score**: Do readings feel specific?
5. **Conversion rate**: % of partners who download app after seeing card

## Future Enhancements

- [ ] Add "relationship advice" section for specific situations
- [ ] Include "best date ideas" based on both profiles
- [ ] Add "conflict resolution style" analysis
- [ ] Create "friendship compatibility" variant
- [ ] Add "family compatibility" for parent-child readings
- [ ] Include "growth timeline" for relationship evolution

## Related Files

- `/app/packages/shared/types.ts` - Type definitions
- `/app/server/src/prompts/face-reading.prompt.ts` - Face analysis reference
- `/app/server/src/prompts/palm-reading.prompt.ts` - Palm analysis reference
- `/app/server/src/prompts/index.ts` - Prompt exports

## Questions?

Contact the orchestrator agent or backend team for:
- Integration questions
- Type definition changes
- Output schema modifications
- Quality concerns
