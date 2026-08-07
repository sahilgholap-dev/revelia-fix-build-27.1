/**
 * Example usage of Daily, Weekly, and Monthly insight prompts
 * 
 * This file demonstrates how to use the new insight prompt functions
 * with sample data.
 */

import { UserInsightProfile } from '../types/shared';
import {
  buildDailyInsightPrompt,
  buildWeeklyForecastPrompt,
  buildMonthlyReadingPrompt,
} from './index';

// Sample user profile for testing
const sampleProfile: UserInsightProfile = {
  name: 'Sarah Chen',
  sunSign: 'Taurus',
  lifePathNumber: 7,
  personalYear: 5,
  personalMonth: 3,
  personalYearMeaning: 'Year of Change and Freedom',
  faceArchetype: 'The Visionary',
  faceArchetypeTagline: 'You see possibilities others miss',
  strengths: [
    'Analytical thinking',
    'Strategic planning',
    'Problem-solving',
    'Leadership',
    'Communication',
  ],
  growthOpportunity: 'Trusting intuition alongside logic',
  palmType: 'Fire Hand',
  palmLifeTheme: 'Leadership through authentic action',
  naturalTalents: [
    'Natural leadership',
    'Quick decision-making',
    'Inspiring others',
    'Strategic vision',
  ],
  dominantTraits: [
    'Confident',
    'Direct',
    'Passionate',
    'Analytical',
  ],
};

// ============================================================================
// EXAMPLE 1: Daily Insight
// ============================================================================

export function exampleDailyInsight() {
  console.log('\n=== DAILY INSIGHT EXAMPLE ===\n');
  
  const prompt = buildDailyInsightPrompt(sampleProfile);
  
  console.log('Prompt length:', prompt.length, 'characters');
  console.log('\nPrompt preview (first 500 chars):\n');
  console.log(prompt.substring(0, 500) + '...\n');
  
  console.log('Expected output structure:');
  console.log({
    headline: 'A Day for Bold Decisions',
    insight: '3-4 sentences of personalized guidance...',
    focusArea: 'Career',
    luckyElement: { type: 'number', value: '7' },
    affirmation: 'I trust my Visionary vision...',
    shareableQuote: 'Today, your Visionary mind...'
  });
}

// ============================================================================
// EXAMPLE 2: Weekly Forecast
// ============================================================================

export function exampleWeeklyForecast() {
  console.log('\n=== WEEKLY FORECAST EXAMPLE ===\n');
  
  // Get Monday of current week
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  
  const prompt = buildWeeklyForecastPrompt(sampleProfile, monday);
  
  console.log('Week starting:', monday.toLocaleDateString());
  console.log('Prompt length:', prompt.length, 'characters');
  console.log('\nPrompt preview (first 500 chars):\n');
  console.log(prompt.substring(0, 500) + '...\n');
  
  console.log('Expected output structure:');
  console.log({
    weekOf: 'January 27 - February 2, 2026',
    theme: 'Week of Breakthrough',
    overview: '2-3 paragraphs...',
    days: [
      { day: 'Monday', energy: 'high', focus: 'Guidance...' },
      { day: 'Tuesday', energy: 'moderate', focus: 'Guidance...' },
      // ... 7 days total
    ],
    bestDays: {
      forLove: 'Wednesday - Venus energy...',
      forCareer: 'Thursday - Mars energy...',
      forCreativity: 'Saturday - Mercury energy...'
    },
    challenges: 'What to watch for...',
    advice: 'How to thrive...',
    affirmation: 'I trust my vision...',
    shareableQuote: 'This week, your Visionary mind...'
  });
}

// ============================================================================
// EXAMPLE 3: Monthly Reading (Free Tier)
// ============================================================================

export function exampleMonthlyReadingFree() {
  console.log('\n=== MONTHLY READING (FREE) EXAMPLE ===\n');
  
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const prompt = buildMonthlyReadingPrompt(sampleProfile, month, year, 'free');
  
  console.log('Month:', now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  console.log('Tier: FREE');
  console.log('Prompt length:', prompt.length, 'characters');
  console.log('\nPrompt preview (first 500 chars):\n');
  console.log(prompt.substring(0, 500) + '...\n');
  
  console.log('Expected output structure (FREE):');
  console.log({
    month: 'February 2026',
    theme: 'Month of Transformation',
    overview: '1 paragraph (~200 words)...',
    keyDates: [
      { date: 'February 5', significance: '...', advice: '...' },
      { date: 'February 14', significance: '...', advice: '...' },
      { date: 'February 25', significance: '...', advice: '...' }
    ],
    affirmation: 'I embrace my Visionary vision...',
    shareableQuote: 'February is your month...'
  });
}

// ============================================================================
// EXAMPLE 4: Monthly Reading (Premium Tier)
// ============================================================================

export function exampleMonthlyReadingPremium() {
  console.log('\n=== MONTHLY READING (PREMIUM) EXAMPLE ===\n');
  
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const prompt = buildMonthlyReadingPrompt(sampleProfile, month, year, 'premium');
  
  console.log('Month:', now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  console.log('Tier: PREMIUM');
  console.log('Prompt length:', prompt.length, 'characters');
  console.log('\nPrompt preview (first 500 chars):\n');
  console.log(prompt.substring(0, 500) + '...\n');
  
  console.log('Expected output structure (PREMIUM):');
  console.log({
    month: 'February 2026',
    theme: 'Month of Transformation',
    overview: '3-4 paragraphs (~400 words)...',
    numerology: {
      personalMonth: 3,
      meaning: 'What Personal Month 3 brings...',
      guidance: 'How to work with this energy...'
    },
    astrology: {
      sunSignForecast: 'Detailed Taurus forecast...',
      keyTransits: ['Transit 1...', 'Transit 2...'],
      retrogradeWarnings: ['Any retrogrades...']
    },
    keyDates: [
      // 8-12 dates with detailed guidance
    ],
    areas: {
      love: { forecast: '...', bestDays: ['Feb 5', 'Feb 14', 'Feb 23'] },
      career: { forecast: '...', bestDays: ['Feb 8', 'Feb 17', 'Feb 26'] },
      money: { forecast: '...', bestDays: ['Feb 3', 'Feb 12', 'Feb 21'] },
      health: { forecast: '...', bestDays: ['Feb 7', 'Feb 16', 'Feb 25'] }
    },
    profileIntegration: 'How complete profile creates opportunities...',
    challenges: 'Monthly challenges with solutions...',
    opportunities: 'Where to focus for best results...',
    affirmation: 'I embrace my complete profile...',
    shareableQuote: 'February is your month...'
  });
}

// ============================================================================
// EXAMPLE 5: Comparison of Tiers
// ============================================================================

export function exampleTierComparison() {
  console.log('\n=== TIER COMPARISON ===\n');
  
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const freePrompt = buildMonthlyReadingPrompt(sampleProfile, month, year, 'free');
  const premiumPrompt = buildMonthlyReadingPrompt(sampleProfile, month, year, 'premium');
  
  console.log('FREE TIER:');
  console.log('- Prompt length:', freePrompt.length, 'characters');
  console.log('- Expected output: ~200 words');
  console.log('- Key dates: 3');
  console.log('- Sections: overview, keyDates, affirmation, quote');
  console.log('');
  
  console.log('PREMIUM TIER:');
  console.log('- Prompt length:', premiumPrompt.length, 'characters');
  console.log('- Expected output: ~800-1200 words');
  console.log('- Key dates: 8-12');
  console.log('- Sections: overview, numerology, astrology, keyDates, areas, profileIntegration, challenges, opportunities, affirmation, quote');
  console.log('');
  
  console.log('Difference:');
  console.log('- Premium is', Math.round(premiumPrompt.length / freePrompt.length * 100) / 100, 'x longer');
  console.log('- Premium includes 6 additional sections');
  console.log('- Premium provides 5-9 more key dates');
  console.log('- Premium breaks down 4 life areas');
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

if (require.main === module) {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('REVELIA INSIGHT PROMPTS - USAGE EXAMPLES');
  console.log('='.repeat(80));
  
  exampleDailyInsight();
  exampleWeeklyForecast();
  exampleMonthlyReadingFree();
  exampleMonthlyReadingPremium();
  exampleTierComparison();
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('To use these prompts in your code:');
  console.log('='.repeat(80));
  console.log(`
import { buildDailyInsightPrompt } from './prompts';
import { UserInsightProfile } from '../types/shared';

const profile: UserInsightProfile = { /* ... */ };
const prompt = buildDailyInsightPrompt(profile);

// Send to Claude API
const response = await claudeAPI({ prompt });
const insight = JSON.parse(response);
  `);
  console.log('\n');
}

// Export for testing
export const examples = {
  sampleProfile,
  exampleDailyInsight,
  exampleWeeklyForecast,
  exampleMonthlyReadingFree,
  exampleMonthlyReadingPremium,
  exampleTierComparison,
};
