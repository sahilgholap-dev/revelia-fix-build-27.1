/**
 * Compatibility Prompt Examples
 * 
 * Demonstrates how to use the compatibility prompt builder with different scenarios.
 */

import { buildCompatibilityPrompt } from './compatibility.prompt';
import type { UserCompatibilityProfile, PartnerCompatibilityProfile } from '../types/shared';

// ============================================================================
// Example User 1 (App User with Full Profile)
// ============================================================================

const exampleUser1: UserCompatibilityProfile = {
  name: 'Sarah',
  sunSign: 'Taurus',
  lifePathNumber: 7,
  faceArchetype: 'The Visionary',
  faceArchetypeTagline: 'You see possibilities others miss',
  strengths: [
    'Analytical thinking',
    'Strategic planning',
    'Problem-solving',
    'Innovation',
    'Leadership'
  ],
  communicationStyle: 'Direct and articulate',
  emotionalNature: 'Thoughtful and measured',
  palmType: 'Fire Hand'
};

// ============================================================================
// Scenario A: Partner WITH Birth Data
// ============================================================================

const partnerWithBirthData: PartnerCompatibilityProfile = {
  name: 'Alex',
  imageUrl: 'https://storage.revelia.me/uploads/alex-face.jpg',
  sunSign: 'Scorpio',
  lifePathNumber: 3,
  birthData: {
    date: '1988-11-15'
  }
};

// Generate premium prompt with birth data
const premiumPromptWithBirthData = buildCompatibilityPrompt(
  exampleUser1,
  partnerWithBirthData,
  'premium'
);

console.log('=== SCENARIO A: Premium with Birth Data ===');
console.log('User 1:', exampleUser1.name, '-', exampleUser1.sunSign, 'Life Path', exampleUser1.lifePathNumber);
console.log('User 2:', partnerWithBirthData.name, '-', partnerWithBirthData.sunSign, 'Life Path', partnerWithBirthData.lifePathNumber);
console.log('Prompt length:', premiumPromptWithBirthData.length, 'characters');
console.log('\nPrompt includes:');
console.log('- Astrological compatibility (Taurus-Scorpio)');
console.log('- Numerological alignment (Life Path 7-3)');
console.log('- Face analysis for Alex');
console.log('- 5 category scores');
console.log('- Cosmic connection section');
console.log('- Challenges + advice');
console.log('');

// ============================================================================
// Scenario B: Partner WITHOUT Birth Data (Photo Only)
// ============================================================================

const partnerPhotoOnly: PartnerCompatibilityProfile = {
  name: 'Jordan',
  imageUrl: 'https://storage.revelia.me/uploads/jordan-face.jpg'
};

// Generate free prompt without birth data
const freePromptPhotoOnly = buildCompatibilityPrompt(
  exampleUser1,
  partnerPhotoOnly,
  'free'
);

console.log('=== SCENARIO B: Free with Photo Only ===');
console.log('User 1:', exampleUser1.name, '-', exampleUser1.sunSign, 'Life Path', exampleUser1.lifePathNumber);
console.log('User 2:', partnerPhotoOnly.name, '- Photo only (no birth data)');
console.log('Prompt length:', freePromptPhotoOnly.length, 'characters');
console.log('\nPrompt includes:');
console.log('- Face analysis for Jordan (archetype, traits)');
console.log('- Personality compatibility based on face reading');
console.log('- 2 category scores (emotional, communication)');
console.log('- 2 strengths');
console.log('- Shareable quote');
console.log('');

// ============================================================================
// Scenario C: Premium WITHOUT Birth Data
// ============================================================================

const premiumPromptPhotoOnly = buildCompatibilityPrompt(
  exampleUser1,
  partnerPhotoOnly,
  'premium'
);

console.log('=== SCENARIO C: Premium with Photo Only ===');
console.log('User 1:', exampleUser1.name, '-', exampleUser1.sunSign, 'Life Path', exampleUser1.lifePathNumber);
console.log('User 2:', partnerPhotoOnly.name, '- Photo only (no birth data)');
console.log('Prompt length:', premiumPromptPhotoOnly.length, 'characters');
console.log('\nPrompt includes:');
console.log('- Detailed face analysis for Jordan');
console.log('- 5 category scores');
console.log('- 4 strengths + 2 challenges');
console.log('- Detailed advice');
console.log('- NO cosmic connection (no birth data)');
console.log('- Affirmation + shareable quote');
console.log('');

// ============================================================================
// Expected Output Structure Examples
// ============================================================================

console.log('=== EXPECTED OUTPUT EXAMPLES ===\n');

console.log('FREE TIER OUTPUT:');
console.log(JSON.stringify({
  overallScore: 78,
  headline: "Opposites Who Complete",
  summary: "Sarah's Visionary archetype finds balance with Jordan's grounded, practical nature. Where Sarah sees possibilities, Jordan builds foundations.",
  categoryScores: {
    emotional: {
      score: 75,
      title: "Emotional Harmony",
      description: "Sarah's thoughtful and measured emotional nature complements Jordan's warm, expressive style visible in their gentle eyes and open features..."
    },
    communication: {
      score: 82,
      title: "Communication Flow",
      description: "Sarah's direct and articulate communication style pairs well with Jordan's expressive lips and animated features..."
    }
  },
  strengths: [
    "Sarah's analytical thinking balances Jordan's intuitive approach",
    "Complementary communication styles create rich dialogue"
  ],
  shareableQuote: "Where Sarah sees possibilities, Jordan builds foundations, together, you create miracles."
}, null, 2));

console.log('\n\nPREMIUM TIER OUTPUT (with birth data):');
console.log(JSON.stringify({
  overallScore: 85,
  headline: "A Dynamic Power Duo",
  summary: "The Taurus-Scorpio connection creates magnetic attraction. Sarah's Life Path 7 analytical depth meets Alex's Life Path 3 expressive creativity in a dance of mind and heart.",
  categoryScores: {
    emotional: {
      score: 88,
      title: "Deep Soul Connection",
      description: "Sarah's thoughtful emotional nature finds its match in Alex's intense Scorpio depth..."
    },
    intellectual: {
      score: 82,
      title: "Mental Synergy",
      description: "Sarah's Visionary archetype and analytical mind complement Alex's creative Life Path 3 thinking..."
    },
    communication: {
      score: 79,
      title: "Learning to Listen",
      description: "Sarah's direct communication meets Alex's more nuanced Scorpio style..."
    },
    values: {
      score: 90,
      title: "Aligned Purpose",
      description: "Both value depth, authenticity, and meaningful connection..."
    },
    passion: {
      score: 92,
      title: "Electric Chemistry",
      description: "The Taurus-Scorpio axis creates one of the zodiac's most powerful attractions..."
    }
  },
  strengths: [
    "Taurus stability grounds Scorpio intensity",
    "Life Path 7 wisdom balances Life Path 3 expression",
    "Complementary archetypes create powerful synergy",
    "Shared values of loyalty and depth"
  ],
  challenges: [
    "Sarah's measured pace and Alex's intense urgency invite you both to find a rhythm that honors both speeds",
    "Different communication styles, Sarah's directness and Alex's subtlety, create opportunities to expand your emotional vocabulary"
  ],
  advice: "This is a relationship built on depth and authenticity. Sarah, your Visionary nature helps Alex see beyond the immediate intensity. Alex, your Scorpio passion reminds Sarah that logic isn't everything. Your Fire Hand energy, Sarah, brings action to Alex's emotional depth. Together, you create a balance of mind and heart that's rare and powerful. The key is patience, Sarah needs time to process, Alex needs space to feel. Honor both.",
  cosmicConnection: {
    sunSignCompatibility: "Taurus and Scorpio sit opposite each other on the zodiac wheel, creating the classic 'opposites attract' dynamic. Taurus brings stability, sensuality, and grounded wisdom. Scorpio brings intensity, transformation, and emotional depth. This pairing works because you complete each other, where one is calm, the other is passionate. Where one is steady, the other is transformative. The challenge is respecting these differences rather than trying to change them.",
    numerologyAlignment: "Life Path 7 (Sarah) seeks truth, wisdom, and understanding through analysis and introspection. Life Path 3 (Alex) seeks joy, expression, and connection through creativity and communication. This pairing creates beautiful balance: Sarah's depth gives Alex's expression substance, while Alex's lightness helps Sarah not take everything so seriously. The 7-3 combination is intellectually stimulating and emotionally enriching when both honor their different approaches to life.",
    archetypeSynergy: "The Visionary (Sarah) sees possibilities and future potential, while Alex's archetype (determined from face analysis) provides the emotional intensity and transformative power to make those visions real. Sarah's strategic mind combined with Alex's passionate execution creates unstoppable momentum. This is the pairing of dreamer and doer, thinker and feeler, vision and manifestation."
  },
  affirmation: "We honor both our differences and our deep connection, knowing that together we create something neither could alone.",
  shareableQuote: "The universe knew what it was doing when it brought a Taurus and Scorpio together, depth meets devotion."
}, null, 2));

// ============================================================================
// Usage in Backend API
// ============================================================================

console.log('\n\n=== BACKEND INTEGRATION EXAMPLE ===\n');
console.log(`
// In your compatibility endpoint:

import { buildCompatibilityPrompt } from '@/prompts';
import { callClaudeVisionAPI } from '@/services/claude';

async function generateCompatibilityReading(
  userId: string,
  partnerData: { name: string; imageUrl: string; birthData?: any },
  tier: 'free' | 'premium'
) {
  // 1. Fetch user's complete profile
  const userProfile = await getUserCompatibilityProfile(userId);
  
  // 2. Build partner profile
  const partnerProfile: PartnerCompatibilityProfile = {
    name: partnerData.name,
    imageUrl: partnerData.imageUrl,
    sunSign: partnerData.birthData?.sunSign,
    lifePathNumber: partnerData.birthData?.lifePathNumber,
    birthData: partnerData.birthData ? { date: partnerData.birthData.date } : undefined
  };
  
  // 3. Build prompt
  const prompt = buildCompatibilityPrompt(userProfile, partnerProfile, tier);
  
  // 4. Call Claude Vision API with partner's photo
  const response = await callClaudeVisionAPI({
    prompt,
    imageUrl: partnerProfile.imageUrl,
    maxTokens: tier === 'premium' ? 2000 : 800
  });
  
  // 5. Parse JSON response
  const reading: CompatibilityOutput = JSON.parse(response.content);
  
  // 6. Store in database
  await saveCompatibilityReading({
    userId,
    partnerName: partnerProfile.name,
    partnerImageUrl: partnerProfile.imageUrl,
    partnerBirthData: partnerProfile.birthData,
    reading,
    tier
  });
  
  // 7. Return to mobile app
  return {
    reading,
    generatedAt: new Date().toISOString(),
    tier,
    cached: false
  };
}
`);

export {
  exampleUser1,
  partnerWithBirthData,
  partnerPhotoOnly,
  premiumPromptWithBirthData,
  freePromptPhotoOnly,
  premiumPromptPhotoOnly
};
