/**
 * Example usage and testing for Revelia AI reading prompts
 * 
 * This file demonstrates how to use the prompt builder functions
 * and shows example outputs for testing purposes.
 */

import {
  buildFaceReadingPrompt,
  buildPalmReadingPrompt,
} from './index';

// ============================================================================
// FACE READING EXAMPLES
// ============================================================================

console.log('='.repeat(80));
console.log('FACE READING - FREE TIER');
console.log('='.repeat(80));

const faceReadingFree = buildFaceReadingPrompt('free');
console.log(faceReadingFree);
console.log('\n');

console.log('='.repeat(80));
console.log('FACE READING - PREMIUM TIER WITH CONTEXT');
console.log('='.repeat(80));

const faceReadingPremium = buildFaceReadingPrompt('premium', {
  name: 'Sarah',
  sunSign: 'Leo',
  lifePathNumber: 7,
});
console.log(faceReadingPremium);
console.log('\n');

// ============================================================================
// PALM READING EXAMPLES
// ============================================================================

console.log('='.repeat(80));
console.log('PALM READING - FREE TIER (DOMINANT HAND)');
console.log('='.repeat(80));

const palmReadingFree = buildPalmReadingPrompt('free', true, 'right');
console.log(palmReadingFree);
console.log('\n');

console.log('='.repeat(80));
console.log('PALM READING - PREMIUM TIER (NON-DOMINANT HAND WITH CONTEXT)');
console.log('='.repeat(80));

const palmReadingPremium = buildPalmReadingPrompt('premium', false, 'right', {
  name: 'Sarah',
  sunSign: 'Leo',
  lifePathNumber: 7,
});
console.log(palmReadingPremium);
console.log('\n');

// ============================================================================
// EXAMPLE OUTPUT STRUCTURES (for testing JSON parsing)
// ============================================================================

console.log('='.repeat(80));
console.log('EXAMPLE FACE READING OUTPUT (PREMIUM)');
console.log('='.repeat(80));

const exampleFaceReading = {
  archetype: {
    name: 'The Visionary',
    tagline: 'You see possibilities where others see limitations',
    coreEssence: 'You are a natural-born innovator with an analytical mind and a compassionate heart. Your unique perspective allows you to bridge the gap between ideas and action, inspiring those around you.',
  },
  categories: {
    intellect: {
      score: 87,
      title: 'Analytical Innovator',
      description:
        'Your high forehead and deep-set eyes reveal a mind that thrives on complex problem-solving. You naturally connect disparate ideas into innovative solutions. Your intellectual curiosity drives you to explore subjects deeply rather than superficially, making you a natural thought leader in your field. The prominence of your brow ridge suggests strong analytical capabilities, while the spacing of your eyes indicates an ability to see both details and big picture simultaneously.',
    },
    emotional: {
      score: 78,
      title: 'Empathetic Connector',
      description:
        'The warmth in your eyes and the gentle curve of your lips reveal someone with deep emotional intelligence. You feel things intensely but have learned to channel this sensitivity into understanding others. Your emotional depth is a gift that allows you to connect authentically with people from all walks of life. The expressiveness of your features shows someone who wears their heart openly, creating trust and intimacy in relationships.',
    },
    communication: {
      score: 82,
      title: 'Inspiring Communicator',
      description:
        'Your well-defined lips and expressive mouth reveal natural communication gifts. You have the rare ability to articulate complex ideas in ways that inspire and motivate others. The shape of your mouth suggests someone who chooses words carefully but speaks with conviction. Your facial expressiveness enhances your verbal communication, making you particularly effective in face-to-face interactions where your authenticity shines through.',
    },
    determination: {
      score: 85,
      title: 'Resilient Achiever',
      description:
        'The strong definition of your jaw and the prominence of your chin reveal unwavering determination. You possess the rare combination of vision and follow-through. When you commit to something, you see it through regardless of obstacles. Your nose structure suggests independence and confidence in your decision-making. You are someone who transforms challenges into stepping stones, never losing sight of your goals even when the path becomes difficult.',
    },
    perception: {
      score: 90,
      title: 'Intuitive Observer',
      description:
        'Your eyes are remarkably perceptive, revealing someone who sees beyond surface appearances. The depth and clarity of your gaze suggests exceptional observational skills and intuitive awareness. You pick up on subtle cues others miss, making you an excellent judge of character and situations. Your eyebrows frame your eyes in a way that suggests both focus and openness, you can zoom in on details while maintaining awareness of the broader context.',
    },
    creativity: {
      score: 79,
      title: 'Innovative Synthesizer',
      description:
        'The overall harmony and uniqueness of your facial features reveal a creative mind that approaches problems from unexpected angles. You have the gift of synthesis, taking seemingly unrelated concepts and weaving them into something new and valuable. Your features suggest someone who thinks in patterns and possibilities rather than rigid categories. This creative approach extends beyond traditional arts into how you solve problems, build relationships, and navigate life.',
    },
  },
  strengths: [
    'Strategic thinking and long-term vision',
    'Ability to inspire and motivate others through authentic communication',
    'Natural problem-solving aptitude with innovative approaches',
    'Deep emotional intelligence and empathy',
    'Unwavering determination and resilience in face of challenges',
  ],
  growthOpportunity:
    'Your analytical brilliance and perceptive nature are tremendous gifts, and learning to balance this mental strength with trust in your emotional intuition will unlock even greater potential. You have both the mind and the heart, integrating them fully is your path to mastery.',
  affirmation:
    'I trust my unique perspective and honor both my analytical mind and intuitive heart.',
  shareableQuote:
    'Your face reveals the mind of someone who transforms obstacles into opportunities and inspires others to see possibilities they never imagined, a true visionary in every sense.',
};

console.log(JSON.stringify(exampleFaceReading, null, 2));
console.log('\n');

console.log('='.repeat(80));
console.log('EXAMPLE PALM READING OUTPUT (PREMIUM)');
console.log('='.repeat(80));

const examplePalmReading = {
  palmType: {
    name: 'Air Hand',
    description:
      'Your square palm with long fingers reveals an Air Hand, the mark of an intellectual, communicative soul. You are naturally curious, drawn to ideas and conversation. Your mind is your greatest tool, and you thrive in environments that stimulate your intellect. You approach life through analysis and understanding, always seeking to learn and share knowledge. This hand type suggests someone who builds bridges between people and ideas.',
  },
  lines: {
    heart: {
      strength: 'strong',
      interpretation:
        'Your deep, clear heart line reveals someone with intense emotional capacity and loyalty. The high curve of your heart line shows you lead with your heart in relationships, expressing affection openly and generously. You form deep, meaningful connections and value emotional authenticity above all. The length of your heart line suggests you have much love to give and need partners who can match your emotional depth and commitment.',
    },
    head: {
      strength: 'strong',
      interpretation:
        'Your prominent head line reveals a brilliant, focused mind. The slight downward curve indicates creative, imaginative thinking balanced with practical application. You are a strategic thinker who can envision possibilities while also planning concrete steps to achieve them. The clarity and depth of this line shows mental stamina and the ability to concentrate deeply on complex problems. You are someone who thinks before acting, but once decided, you move with confidence.',
    },
    life: {
      strength: 'strong',
      interpretation:
        'Your strong, sweeping life line reveals abundant vitality and a resilient approach to life\'s journey. The wide curve suggests an adventurous spirit balanced with wisdom, you embrace new experiences while maintaining groundedness. This line indicates high energy levels and the physical and emotional stamina to pursue your ambitions. The clarity of your life line shows someone who approaches life with enthusiasm and recovers quickly from setbacks.',
    },
    fate: {
      strength: 'moderate',
      interpretation:
        'Your fate line, emerging clearly from the middle of your palm, reveals a destiny you are actively creating through conscious choices. This line suggests your life purpose became clear in your twenties or thirties, and you are now on a path of intentional growth. The moderate depth indicates flexibility in how you pursue your purpose, you have direction without rigidity. You are building a meaningful life aligned with your values and vision.',
    },
  },
  mounts: {
    jupiter: {
      prominence: 'high',
      meaning:
        'Your prominent Mount of Jupiter reveals natural leadership abilities and healthy ambition. You have confidence in your abilities and are not afraid to take charge when needed. This mount suggests someone who inspires others and has a vision for what is possible. You lead through example and authentic presence rather than force.',
    },
    saturn: {
      prominence: 'moderate',
      meaning:
        'Your balanced Mount of Saturn shows wisdom and responsibility without heaviness. You take your commitments seriously but do not let duty overshadow joy. This moderate prominence suggests someone who has learned to balance structure with spontaneity, creating a life that is both meaningful and enjoyable.',
    },
    apollo: {
      prominence: 'high',
      meaning:
        'Your well-developed Mount of Apollo reveals creative gifts and natural charisma. You have an eye for beauty and harmony, and you bring artistic sensibility to everything you do. This prominence suggests someone who lights up a room and inspires others through their creative expression and authentic enthusiasm for life.',
    },
    mercury: {
      prominence: 'high',
      meaning:
        'Your prominent Mount of Mercury reveals exceptional communication skills and business acumen. You have a way with words and can articulate ideas that move people to action. This mount suggests quick thinking, wit, and the ability to read social situations with accuracy. You are a natural networker and connector.',
    },
  },
  destiny: {
    lifeTheme:
      'Your palm reveals a life journey of transforming ideas into reality through inspired communication and creative leadership.',
    description:
      'Lean into your natural gifts for communication and leadership. Your destiny involves bringing people together around shared visions and inspiring them to achieve what they thought impossible. Trust your creative instincts and do not be afraid to take bold steps toward your purpose.',
  },
  naturalTalents: [
    'Strategic thinking and visionary planning',
    'Exceptional communication and ability to inspire others',
    'Creative problem-solving and innovative approaches',
    'Natural leadership through authentic presence',
  ],
  shareableQuote:
    'Your palm reveals the hands of someone destined to build bridges between ideas and reality, inspiring others to see possibilities they never imagined, a true creator of lasting impact.',
};

console.log(JSON.stringify(examplePalmReading, null, 2));
console.log('\n');

console.log('='.repeat(80));
console.log('TESTING COMPLETE');
console.log('='.repeat(80));
