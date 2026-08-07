# Revelia Prompt Engineering Guide

## Overview

Revelia uses Claude Sonnet 4.5 to generate personalized readings. All prompts are stored in `server/src/prompts/`.

## Prompt Philosophy

1. **Personalized, not generic:** Readings should feel unique to the user's specific facial features or palm lines
2. **Mystical but modern:** Balance spiritual insights with practical advice
3. **Engaging tone:** Confident, warm, insightful (not preachy or vague)
4. **Structured output:** JSON format for easy parsing and display

## Prompt Types

### 1. Face Reading
**File:** `face-reading.prompt.ts`

Analyzes facial features to determine personality traits, emotional patterns, relationship style, career strengths, and life path.

### 2. Palm Reading (Dominant Hand)
**File:** `palm-reading.prompt.ts`

Analyzes major palm lines (life, heart, head, fate) to reveal life trajectory, emotional nature, mental patterns, and destiny.

### 3. Combined Reading
**File:** `combined-reading.prompt.ts`

Synthesizes face and palm analyses for comprehensive life profile.

### 4. Daily Insight
**File:** `daily-insight.prompt.ts`

Generates personalized daily forecast based on user's face/palm profile + current astrology.

### 5. Monthly Reading
**File:** `monthly-reading.prompt.ts`

Deep monthly forecast incorporating face/palm profile + astrology + numerology.

### 6. Compatibility Reading
**File:** `compatibility.prompt.ts`

Analyzes compatibility between two users based on their face/palm profiles.

## Prompt Structure

All prompts follow this structure:

```typescript
export const PROMPT_NAME = `
## Role
You are an expert [face reader / palm reader / etc.]...

## Task
Analyze the provided image and generate...

## Input
- Image: [description]
- User data: [birth date, astrology, etc.]

## Output Format
Return a JSON object with this exact structure:
{
  "title": "...",
  "summary": "...",
  "content": { ... }
}

## Guidelines
1. Be specific to the actual features visible
2. Avoid generic statements
3. Balance positive insights with constructive challenges
4. Use mystical language but stay grounded
5. Keep tone warm and confident

## Example Output
...
`;
```

## Best Practices

- **Use vision capabilities:** Reference specific facial features or palm lines visible in the image
- **Personalize:** Incorporate user's birth data, astrology, numerology when available
- **Structure:** Return valid JSON for easy parsing
- **Length:** 800-1200 words for premium, 200-300 for free tier
- **Tone:** Confident, insightful, warm (not vague or preachy)

---

*This document will be updated as prompts are developed and refined.*
