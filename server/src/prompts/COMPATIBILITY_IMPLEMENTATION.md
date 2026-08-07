# Compatibility Prompt - Implementation Complete

## Summary

Successfully created the compatibility reading prompt for Revelia's viral growth feature. This prompt analyzes two people and generates personalized compatibility readings that users will want to share.

## Files Created

### 1. `/app/server/src/prompts/compatibility.prompt.ts`

**Main prompt builder function:**
```typescript
export function buildCompatibilityPrompt(
  user1: UserCompatibilityProfile,
  user2: PartnerCompatibilityProfile,
  tier: 'free' | 'premium'
): string
```

**Key Features:**
- Handles two scenarios: with/without partner birth data
- Analyzes partner's face for archetype and traits
- Compares both people across multiple dimensions
- Generates tier-appropriate output (free vs premium)
- Creates shareable quotes designed for virality
- Integrates astrological and numerological compatibility when available

**Prompt Length:** ~8,000-10,000 characters (comprehensive instructions for Claude)

### 2. `/app/server/src/prompts/COMPATIBILITY_PROMPT.md`

**Comprehensive documentation covering:**
- The viral loop mechanism
- Two analysis scenarios (with/without birth data)
- Output structure for free and premium tiers
- Scoring guidelines and ranges
- Shareable quote requirements (THE viral element)
- Personalization requirements
- Tone and style guidelines
- What NOT to do
- Face analysis guidance
- Backend integration example
- Testing checklist
- Cost considerations
- Success metrics

### 3. `/app/server/src/prompts/compatibility-examples.ts`

**Working examples demonstrating:**
- Scenario A: Premium with birth data (Taurus + Scorpio)
- Scenario B: Free with photo only
- Scenario C: Premium with photo only
- Expected output structures
- Backend integration code example

### 4. `/app/server/src/prompts/index.ts` (Updated)

Added export:
```typescript
export { buildCompatibilityPrompt } from './compatibility.prompt';
```

## Key Design Decisions

### 1. Two-Scenario Handling

**Scenario A: Partner has birth data**
- Analyze face + integrate sun sign + life path number
- Full cosmic compatibility section
- Astrological and numerological insights

**Scenario B: Partner has NO birth data (photo only)**
- Deep face analysis determines personality traits
- Focus on archetype synergy and observed traits
- No cosmic connection section (no birth data to work with)

### 2. Tiering Strategy

**Free Tier (~300 words):**
- 2 categories: emotional + communication
- 2 strengths
- Shareable quote (always included)
- Shows potential, encourages upgrade

**Premium Tier (~800-1000 words):**
- 5 categories: emotional, intellectual, communication, values, passion
- 4 strengths + 2 challenges (positively framed)
- Detailed advice (2-3 paragraphs)
- Cosmic connection (if birth data available)
- Affirmation + shareable quote

### 3. The Viral Mechanism: Shareable Quote

The shareable quote is THE growth driver. Requirements:

1. **Specific to this pairing** (not generic)
2. **Screenshot-worthy** (sounds wise and mystical)
3. **Makes both people feel special**
4. **15-30 words** (1-2 sentences max)
5. **Poetic but authentic** (not cheesy)

**Good Examples:**
- "Your Visionary mind and their grounded wisdom create the rare alchemy where dreams meet reality."
- "Two Fire Hands together? A relationship that transforms obstacles into adventures."
- "The universe knew what it was doing when it brought a Taurus and Scorpio together—depth meets devotion."

**Bad Examples:**
- "You two are compatible." (Generic, boring)
- "Love conquers all." (Not specific)

### 4. Scoring Philosophy

**Authentic Variation:**
- Not every couple scores 85+
- Some categories can be 90+ while others are 60-70
- Higher scores need clear justification
- Overall score should feel earned

**Score Ranges:**
- 90-100: Exceptional (RARE)
- 75-89: Strong compatibility (most healthy relationships)
- 60-74: Good potential (requires work)
- 40-59: Challenging but workable
- <40: Significant differences (still frame positively)

### 5. Personalization Requirements

Every reading must feel **specific to THIS pairing**.

❌ Generic: "You two are compatible. Communication is good."

✅ Personalized: "Sarah's Visionary archetype finds perfect balance with Alex's grounded, practical nature visible in their strong jaw and steady gaze. Where Sarah sees possibilities, Alex builds the foundation."

### 6. Challenges as Growth Opportunities

Never frame challenges as "problems"—always as invitations to grow.

✅ Good: "Your different paces—Sarah's quick decisions and Alex's thoughtful reflection—invite you to find a rhythm that honors both."

❌ Bad: "You'll fight about decision-making."

## Integration with Backend

The backend will:

1. Receive compatibility request (User 1 ID + User 2 photo/data)
2. Build `UserCompatibilityProfile` from User 1's stored readings
3. Build `PartnerCompatibilityProfile` from User 2's input
4. Call `buildCompatibilityPrompt(user1, user2, tier)`
5. Send prompt + User 2's photo to Claude Vision API
6. Parse JSON response into `CompatibilityOutput`
7. Store reading in database
8. Return to mobile app for share card generation

## Type Definitions

All types are defined in `/app/packages/shared/types.ts`:

- `CompatibilityOutput` - The reading structure
- `CompatibilityCategory` - Individual category scores
- `UserCompatibilityProfile` - App user's full profile
- `PartnerCompatibilityProfile` - Partner's photo + optional birth data
- `CompatibilityReading` - Database record

## Testing Checklist

- [x] Prompt file created and exported
- [x] TypeScript types correctly imported
- [x] ESLint passes (no issues)
- [x] Documentation complete
- [x] Examples provided
- [ ] Backend integration (pending)
- [ ] Test with real images (pending)
- [ ] Verify JSON parsing (pending)
- [ ] Test free tier output (pending)
- [ ] Test premium tier output (pending)
- [ ] Test with birth data scenario (pending)
- [ ] Test without birth data scenario (pending)
- [ ] Verify shareable quotes are powerful (pending)
- [ ] Check score variation (pending)

## Cost Estimates

**Free Tier:**
- ~300 words output
- ~$0.015 per reading

**Premium Tier:**
- ~800-1000 words output
- ~$0.025-0.030 per reading

**Target:** Keep premium readings under $0.03 per generation

## Success Metrics to Track

1. **Share rate**: % of users who share their compatibility card
2. **Viral coefficient**: # of new users per shared card
3. **Quote quality**: User feedback on shareable quotes
4. **Personalization score**: Do readings feel specific?
5. **Conversion rate**: % of partners who download app after seeing card

## Next Steps for Backend Team

1. **Create compatibility endpoint** (`POST /api/compatibility`)
2. **Implement profile builder** (convert stored readings to `UserCompatibilityProfile`)
3. **Integrate Claude Vision API** (send prompt + partner photo)
4. **Add JSON parsing** with error handling
5. **Store readings** in database
6. **Generate share cards** (both photos + score + quote)
7. **Test with real images** and verify output quality
8. **Monitor costs** and adjust token limits if needed

## Critical Rules Enforced in Prompt

1. ✅ Output ONLY valid JSON (no markdown, no explanations)
2. ✅ Reference both people's specific traits
3. ✅ Vary scores authentically (not all 75-85)
4. ✅ Frame challenges positively (growth opportunities)
5. ✅ Never predict marriage/breakups/duration
6. ✅ Never make medical/financial/legal claims
7. ✅ Shareable quote must be specific and powerful
8. ✅ No hedging language ("might", "could", "possibly")
9. ✅ For entertainment purposes only

## Prompt Quality Features

### Tone
- Confident and declarative
- Warm and empowering
- Specific and personal
- Balanced (honest but constructive)
- Mystical but grounded

### Personalization
- References User 1's archetype, strengths, communication style
- Analyzes User 2's face for traits
- Compares specific traits (not generic statements)
- Integrates sun signs and life paths when available
- Creates unique insights for THIS pairing

### Structure
- Clear instructions for Claude
- Explicit JSON schema
- Tier-specific requirements
- Scenario-specific guidance (with/without birth data)
- Examples of good vs bad outputs

## Files Summary

```
/app/server/src/prompts/
├── compatibility.prompt.ts          (Main prompt builder - 500+ lines)
├── COMPATIBILITY_PROMPT.md          (Documentation - 400+ lines)
├── compatibility-examples.ts        (Working examples - 250+ lines)
└── index.ts                         (Updated exports)
```

## Validation

- ✅ TypeScript compiles correctly
- ✅ ESLint passes with no issues
- ✅ Types imported from shared package
- ✅ Exported in index.ts
- ✅ Documentation complete
- ✅ Examples provided

## Ready for Backend Integration

The prompt is production-ready and can be integrated by the backend team. All type definitions are in place, documentation is comprehensive, and examples demonstrate usage.

**Backend can now:**
1. Import `buildCompatibilityPrompt` from `@/prompts`
2. Build user profiles from stored readings
3. Call the function with appropriate tier
4. Send result to Claude Vision API
5. Parse and store the compatibility reading

---

**Status:** ✅ Complete and ready for backend integration

**Next Agent:** Backend team for API endpoint implementation
