import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { LockSlot } from '@/components/ui/LockSlot';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { useProfileStore } from '@/store/profileStore';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

/**
 * Pythagorean numerology letter-to-number mapping
 */
function letterToNumber(letter: string): number {
  const map: Record<string, number> = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
    j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
    s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
  };
  return map[letter.toLowerCase()] || 0;
}

/**
 * Reduce to single digit, preserving master numbers (11, 22, 33)
 */
function reduceToSingleDigit(num: number): number {
  if (num === 11 || num === 22 || num === 33) return num;
  while (num > 9) {
    num = num.toString().split('').reduce((sum, d) => sum + parseInt(d, 10), 0);
    if (num === 11 || num === 22 || num === 33) break;
  }
  return num;
}

/**
 * Calculate destiny number from full name
 */
function calculateDestinyNumber(name: string): number {
  const sum = name
    .replace(/[^a-zA-Z]/g, '')
    .split('')
    .reduce((total, letter) => total + letterToNumber(letter), 0);
  return reduceToSingleDigit(sum);
}

const LIFE_PATH_MEANINGS: Record<number, { name: string; summary: string; personality: string; strengths: string[]; challenges: string[]; career: string; relationships: string }> = {
  1: {
    name: 'The Pioneer',
    summary: 'Leadership, independence, and originality',
    personality: 'You are a natural-born leader with a fierce drive for independence. Your innovative mind constantly pushes boundaries, and you thrive when charting your own course. You possess an innate confidence that inspires others to follow your vision.',
    strengths: ['Independent', 'Ambitious', 'Innovative', 'Determined'],
    challenges: ['Can be stubborn', 'May struggle with teamwork', 'Tendency toward impatience'],
    career: 'Entrepreneurship, management, innovation, creative direction',
    relationships: 'You need a partner who respects your independence while grounding your energy',
  },
  2: {
    name: 'The Mediator',
    summary: 'Cooperation, harmony, and diplomacy',
    personality: 'You are the peacemaker, gifted with extraordinary sensitivity and intuition. Your ability to see all sides of a situation makes you invaluable in any group. You create harmony wherever you go and have a natural talent for bringing people together.',
    strengths: ['Diplomatic', 'Intuitive', 'Cooperative', 'Patient'],
    challenges: ['Over-sensitivity', 'Difficulty with confrontation', 'Can be indecisive'],
    career: 'Counseling, mediation, partnerships, healing arts',
    relationships: 'Deep emotional connections fuel you; you thrive with a sensitive, appreciative partner',
  },
  3: {
    name: 'The Communicator',
    summary: 'Creative expression, joy, and social connection',
    personality: 'You are a natural entertainer and communicator, blessed with creativity and charm. Your infectious energy lights up every room, and your words have the power to inspire and uplift. Life is your stage, and self-expression is your gift.',
    strengths: ['Creative', 'Charismatic', 'Optimistic', 'Expressive'],
    challenges: ['Scattered energy', 'Avoiding deeper emotions', 'Can be superficial'],
    career: 'Writing, performing arts, marketing, teaching, design',
    relationships: 'You need intellectual stimulation and someone who appreciates your playful spirit',
  },
  4: {
    name: 'The Builder',
    summary: 'Stability, discipline, and solid foundations',
    personality: 'You are the master builder of the physical world, creating lasting structures through dedication and hard work. Your methodical approach and unwavering discipline turn dreams into reality. Reliability is your superpower.',
    strengths: ['Disciplined', 'Reliable', 'Practical', 'Hardworking'],
    challenges: ['Rigidity', 'Resistance to change', 'Can be overly cautious'],
    career: 'Engineering, architecture, finance, project management, law',
    relationships: 'You value loyalty and consistency; a stable, committed partner complements you best',
  },
  5: {
    name: 'The Freedom Seeker',
    summary: 'Change, adventure, and versatility',
    personality: 'You are the adventurer of the numerology world, craving freedom and new experiences. Your versatile nature and magnetic energy draw exciting opportunities. You learn through experience and inspire others to embrace change.',
    strengths: ['Adventurous', 'Versatile', 'Magnetic', 'Progressive'],
    challenges: ['Restlessness', 'Difficulty with commitment', 'Can be impulsive'],
    career: 'Travel, media, sales, entertainment, entrepreneurship',
    relationships: 'You need freedom within partnership; a flexible, adventurous partner is ideal',
  },
  6: {
    name: 'The Nurturer',
    summary: 'Responsibility, love, and healing',
    personality: 'You are the cosmic parent, driven by a deep sense of responsibility and love. Your nurturing nature creates safe spaces for others to grow. You have an extraordinary ability to heal and comfort, making the world a warmer place.',
    strengths: ['Nurturing', 'Responsible', 'Compassionate', 'Artistic'],
    challenges: ['Over-giving', 'Perfectionism', 'Can be controlling out of care'],
    career: 'Healthcare, teaching, counseling, interior design, culinary arts',
    relationships: 'Family and home are central to you; you thrive with a partner who values domestic harmony',
  },
  7: {
    name: 'The Seeker',
    summary: 'Analysis, wisdom, and spiritual depth',
    personality: 'You are the philosopher and mystic, driven by an insatiable thirst for knowledge and truth. Your analytical mind penetrates beneath the surface to uncover hidden meanings. Solitude energizes you and deepens your powerful intuition.',
    strengths: ['Analytical', 'Intuitive', 'Wise', 'Perceptive'],
    challenges: ['Isolation', 'Overthinking', 'Difficulty expressing emotions'],
    career: 'Research, psychology, spirituality, technology, academia',
    relationships: 'You need intellectual depth and space; a partner who respects your inner world is essential',
  },
  8: {
    name: 'The Powerhouse',
    summary: 'Achievement, abundance, and authority',
    personality: 'You are the manifestor, born to achieve greatness in the material world. Your natural authority and business acumen create abundance wherever you focus your energy. You understand the flow of power and use it to build empires.',
    strengths: ['Authoritative', 'Strategic', 'Ambitious', 'Resilient'],
    challenges: ['Workaholic tendencies', 'Power struggles', 'Material obsession'],
    career: 'Business, finance, law, real estate, executive leadership',
    relationships: 'You need a partner who matches your ambition and supports your drive for success',
  },
  9: {
    name: 'The Humanitarian',
    summary: 'Compassion, wisdom, and universal love',
    personality: 'You are the old soul, here to serve humanity with wisdom and compassion. Your broad perspective sees the bigger picture, and your generous heart touches everyone you meet. You are driven to make the world a better place.',
    strengths: ['Compassionate', 'Wise', 'Generous', 'Visionary'],
    challenges: ['Emotional overwhelm', 'Difficulty letting go', 'Can be preachy'],
    career: 'Non-profit, arts, healing, international work, philanthropy',
    relationships: 'You love deeply and universally; a partner who shares your idealism is your match',
  },
  11: {
    name: 'The Intuitive',
    summary: 'Spiritual insight, inspiration, and illumination',
    personality: 'As a Master Number, you carry heightened spiritual energy. You are a channel for divine inspiration, receiving insights that others cannot access. Your presence alone can shift the energy of a room and awaken others to higher possibilities.',
    strengths: ['Visionary', 'Inspiring', 'Spiritually gifted', 'Charismatic'],
    challenges: ['Nervous energy', 'Self-doubt', 'Difficulty grounding visions'],
    career: 'Spiritual leadership, counseling, artistic creation, innovation',
    relationships: 'You need a partner who understands your spiritual sensitivity and supports your mission',
  },
  22: {
    name: 'The Master Builder',
    summary: 'Turning grand visions into reality',
    personality: 'As a Master Number, you combine the vision of 11 with the practical power of 4. You are here to build something extraordinary that serves humanity. Your rare ability to envision and execute on a massive scale is your gift to the world.',
    strengths: ['Visionary builder', 'Disciplined', 'Powerful manifestor', 'Inspiring leader'],
    challenges: ['Immense pressure', 'Perfectionism', 'Burnout from high expectations'],
    career: 'Architecture, global enterprise, politics, large-scale innovation',
    relationships: 'You need a grounded, supportive partner who believes in your grand vision',
  },
  33: {
    name: 'The Master Teacher',
    summary: 'Selfless service, spiritual guidance, and upliftment',
    personality: 'The rarest Master Number, you embody unconditional love and spiritual mastery. You are here to teach, heal, and uplift humanity through your own example of selfless living. Your very presence inspires transformation in others.',
    strengths: ['Unconditionally loving', 'Deeply wise', 'Healing presence', 'Selfless'],
    challenges: ['Martyrdom', 'Emotional overwhelm', 'Neglecting personal needs'],
    career: 'Spiritual teaching, healing, humanitarian leadership, arts',
    relationships: 'You love unconditionally; you need a partner who can receive and reciprocate that depth',
  },
};

const DESTINY_ARCHETYPES: Record<number, string> = {
  1: 'The Pioneer', 2: 'The Peacemaker', 3: 'The Muse', 4: 'The Architect',
  5: 'The Adventurer', 6: 'The Healer', 7: 'The Philosopher', 8: 'The Achiever',
  9: 'The Visionary', 11: 'The Illuminator', 22: 'The Master Architect', 33: 'The Master Healer',
};

const DESTINY_MEANINGS: Record<number, string> = {
  1: 'Born to lead and innovate. Your destiny is to carve your own path and inspire others through your originality and courage.',
  2: 'Born to bring harmony. Your destiny is to unite people, heal divisions, and create balance in all your relationships.',
  3: 'Born to create and inspire. Your destiny is joyful self-expression that uplifts and entertains those around you.',
  4: 'Born to build lasting foundations. Your destiny is to create structure, order, and security for yourself and others.',
  5: 'Born to experience life fully. Your destiny is freedom, adventure, and helping others embrace positive change.',
  6: 'Born to nurture and heal. Your destiny is love, responsibility, and creating beauty in the world.',
  7: 'Born to seek truth. Your destiny is wisdom through deep introspection, research, and spiritual exploration.',
  8: 'Born to achieve greatness. Your destiny is material and spiritual abundance through disciplined effort.',
  9: 'Born to serve humanity. Your destiny is compassion, generosity, and leaving the world better than you found it.',
  11: 'Born with heightened intuition. Your destiny is spiritual illumination and inspiring others through your vision.',
  22: 'Born to manifest grand visions. Your destiny is to build something extraordinary that serves all of humanity.',
  33: 'Born to teach and uplift. Your destiny is selfless service and guiding others toward spiritual awakening.',
};

const PERSONAL_YEAR_MEANINGS: Record<number, { archetype: string; description: string; focus: string[]; strengths: string[] }> = {
  1: {
    archetype: 'The Pioneer',
    description: 'This is a year of new beginnings, independence, and fresh starts. The energy favors bold moves, self-discovery, and stepping into uncharted territory. Trust your instincts and take the initiative — the universe is supporting your courage to start anew.',
    focus: ['Self-discovery', 'Initiative', 'Courage'],
    strengths: ['Leadership', 'Innovation', 'Self-reliance'],
  },
  2: {
    archetype: 'The Diplomat',
    description: 'This is a year of partnerships, patience, and cooperation. The energy calls you to nurture your relationships, seek balance, and build trust with those around you. Slow down, listen deeply, and let collaboration guide your path forward.',
    focus: ['Relationships', 'Balance', 'Trust'],
    strengths: ['Empathy', 'Collaboration', 'Patience'],
  },
  3: {
    archetype: 'The Creator',
    description: 'This is a year of self-expression, creativity, and social expansion. The energy invites you to embrace joy, communicate from the heart, and explore artistic pursuits. Let your imagination run free and share your unique voice with the world.',
    focus: ['Joy', 'Communication', 'Artistic pursuits'],
    strengths: ['Creativity', 'Charm', 'Optimism'],
  },
  4: {
    archetype: 'The Builder',
    description: 'This is a year of foundation-building, discipline, and hard work. The energy demands structure, careful planning, and sustained effort. Roll up your sleeves and lay the groundwork — what you build now will support you for years to come.',
    focus: ['Stability', 'Planning', 'Effort'],
    strengths: ['Discipline', 'Reliability', 'Structure'],
  },
  5: {
    archetype: 'The Explorer',
    description: 'This is a year of change, freedom, and adventure. The energy pushes you toward new experiences, travel, and breaking free from old patterns. Stay flexible, say yes to the unexpected, and trust that change is leading you somewhere better.',
    focus: ['Flexibility', 'New experiences', 'Travel'],
    strengths: ['Adaptability', 'Curiosity', 'Courage'],
  },
  6: {
    archetype: 'The Nurturer',
    description: 'This is a year of home, family, and responsibility. The energy centers around love, service, and creating domestic harmony. Open your heart to those who need you, tend to your living space, and find beauty in acts of care and devotion.',
    focus: ['Love', 'Service', 'Domestic harmony'],
    strengths: ['Compassion', 'Responsibility', 'Healing'],
  },
  7: {
    archetype: 'The Seeker',
    description: 'This is a year of introspection, spiritual growth, and inner wisdom. The energy invites you to turn inward through meditation, study, and solitude. Trust the quiet voice within — profound insights and personal breakthroughs await those who seek.',
    focus: ['Meditation', 'Study', 'Solitude'],
    strengths: ['Intuition', 'Analysis', 'Wisdom'],
  },
  8: {
    archetype: 'The Powerhouse',
    description: 'This is a year of achievement, abundance, and authority. The energy amplifies your career ambitions, financial opportunities, and personal power. Step into your authority with confidence — this is your year to manifest success on a grand scale.',
    focus: ['Career', 'Finance', 'Power'],
    strengths: ['Ambition', 'Authority', 'Manifestation'],
  },
  9: {
    archetype: 'The Humanitarian',
    description: 'This is a year of completion, release, and transformation. The energy asks you to let go of what no longer serves you, embrace service to others, and expand your global awareness. Endings make room for powerful new beginnings ahead.',
    focus: ['Letting go', 'Service', 'Global awareness'],
    strengths: ['Compassion', 'Generosity', 'Vision'],
  },
  11: {
    archetype: 'The Illuminator',
    description: 'This is a master year of spiritual awakening, heightened intuition, and divine inspiration. The energy connects you to a higher purpose, calling you to teach, inspire, and follow your inner vision. Pay attention to synchronicities — they are guiding you.',
    focus: ['Higher purpose', 'Teaching', 'Vision'],
    strengths: ['Intuition', 'Inspiration', 'Sensitivity'],
  },
  22: {
    archetype: 'The Master Builder',
    description: 'This is a master year of large-scale vision and practical idealism. The energy empowers you to build a lasting legacy, design powerful systems, and pursue grand ambitions. Dream big and back it with disciplined action — extraordinary results are possible.',
    focus: ['Legacy', 'Systems', 'Grand ambitions'],
    strengths: ['Visionary', 'Builder', 'Leader'],
  },
};

const PERSONAL_MONTH_MEANINGS: Record<number, { archetype: string; description: string; focus: string[]; strengths: string[] }> = {
  1: {
    archetype: 'The Pioneer',
    description: 'This month channels The Pioneer energy — a time to take initiative, assert your independence, and plant seeds for fresh starts. Be bold in your decisions and trust your ability to lead yourself forward.',
    focus: ['Self-discovery', 'Initiative', 'Courage'],
    strengths: ['Leadership', 'Innovation', 'Self-reliance'],
  },
  2: {
    archetype: 'The Diplomat',
    description: 'This month channels The Diplomat energy — a time to strengthen partnerships, practice patience, and seek harmony in your connections. Listen more than you speak and let cooperation open new doors.',
    focus: ['Relationships', 'Balance', 'Trust'],
    strengths: ['Empathy', 'Collaboration', 'Patience'],
  },
  3: {
    archetype: 'The Creator',
    description: 'This month channels The Creator energy — a time to express yourself, embrace joy, and connect with others socially. Let creativity flow freely and share your ideas with enthusiasm and charm.',
    focus: ['Joy', 'Communication', 'Artistic pursuits'],
    strengths: ['Creativity', 'Charm', 'Optimism'],
  },
  4: {
    archetype: 'The Builder',
    description: 'This month channels The Builder energy — a time to focus on discipline, organize your plans, and put in the hard work. Build structure into your daily routine and trust the process of steady progress.',
    focus: ['Stability', 'Planning', 'Effort'],
    strengths: ['Discipline', 'Reliability', 'Structure'],
  },
  5: {
    archetype: 'The Explorer',
    description: 'This month channels The Explorer energy — a time to embrace change, seek adventure, and break free from routine. Stay open to unexpected opportunities and let curiosity guide your choices.',
    focus: ['Flexibility', 'New experiences', 'Travel'],
    strengths: ['Adaptability', 'Curiosity', 'Courage'],
  },
  6: {
    archetype: 'The Nurturer',
    description: 'This month channels The Nurturer energy — a time to focus on home, family, and acts of loving service. Create warmth in your environment and tend to the relationships that matter most.',
    focus: ['Love', 'Service', 'Domestic harmony'],
    strengths: ['Compassion', 'Responsibility', 'Healing'],
  },
  7: {
    archetype: 'The Seeker',
    description: 'This month channels The Seeker energy — a time for introspection, quiet study, and spiritual reflection. Step back from the noise, honor your need for solitude, and let inner wisdom surface.',
    focus: ['Meditation', 'Study', 'Solitude'],
    strengths: ['Intuition', 'Analysis', 'Wisdom'],
  },
  8: {
    archetype: 'The Powerhouse',
    description: 'This month channels The Powerhouse energy — a time to pursue achievement, step into your authority, and focus on abundance. Take charge of your finances and career goals with confidence and determination.',
    focus: ['Career', 'Finance', 'Power'],
    strengths: ['Ambition', 'Authority', 'Manifestation'],
  },
  9: {
    archetype: 'The Humanitarian',
    description: 'This month channels The Humanitarian energy — a time to release what no longer serves you and focus on giving back. Practice generosity, expand your perspective, and prepare for the new cycle ahead.',
    focus: ['Letting go', 'Service', 'Global awareness'],
    strengths: ['Compassion', 'Generosity', 'Vision'],
  },
  11: {
    archetype: 'The Illuminator',
    description: 'This month channels The Illuminator energy — a heightened time for spiritual insight, intuitive downloads, and inspired action. Trust your inner knowing and let it guide you toward your higher purpose.',
    focus: ['Higher purpose', 'Teaching', 'Vision'],
    strengths: ['Intuition', 'Inspiration', 'Sensitivity'],
  },
  22: {
    archetype: 'The Master Builder',
    description: 'This month channels The Master Builder energy — a powerful time to pursue large-scale goals with practical idealism. Align your vision with disciplined action and lay the groundwork for something extraordinary.',
    focus: ['Legacy', 'Systems', 'Grand ambitions'],
    strengths: ['Visionary', 'Builder', 'Leader'],
  },
};

export default function Numerology() {
  const router = useRouter();
  const { profile, fetchNumerology, numerology } = useProfileStore();
  const { user } = useAuthStore();
  const tier = user?.subscription?.tier || 'free';
  const isPremiumPlus = tier === 'premium_plus';
  const bottomPad = useBottomInsetPadding();

  const [isLoadingLifePath, setIsLoadingLifePath] = useState(false);
  const [lifePathError, setLifePathError] = useState<string | null>(null);

  const lifePathNumber = profile?.lifePathNumber || numerology?.lifePathNumber;
  const lifePathData = lifePathNumber ? LIFE_PATH_MEANINGS[lifePathNumber] : null;

  const personalYear = numerology?.personalYear || profile?.personalYear;
  const personalYearMeaning = numerology?.personalYearMeaning;
  const personalMonth = numerology?.personalMonth || profile?.personalMonth;
  const personalMonthMeaning = numerology?.personalMonthMeaning;

  const userName = profile?.name || user?.name || '';
  const destinyNumber = userName ? calculateDestinyNumber(userName) : null;
  const destinyMeaning = destinyNumber ? (DESTINY_MEANINGS[destinyNumber] || 'A unique destiny') : null;

  const personalYearData = personalYear ? PERSONAL_YEAR_MEANINGS[personalYear] : null;
  const personalMonthData = personalMonth ? PERSONAL_MONTH_MEANINGS[personalMonth] : null;

  // Auto-load numerology if profile exists but numbers aren't shown
  useEffect(() => {
    if (profile?.birthData?.date && !lifePathNumber) {
      handleCalculateLifePath();
    }
  }, [profile?.birthData?.date]);

  const handleCalculateLifePath = async () => {
    if (lifePathNumber) return;
    setIsLoadingLifePath(true);
    setLifePathError(null);
    try {
      await fetchNumerology();
      const state = useProfileStore.getState();
      if (!state.numerology?.lifePathNumber) {
        setLifePathError('Could not calculate. Please ensure birth data is set.');
      }
    } catch {
      setLifePathError('Failed to calculate. Please try again.');
    } finally {
      setIsLoadingLifePath(false);
    }
  };

  return (
    <ScreenContainer withScrollView={false}>
      <View className="px-6 pt-4 pb-6">
        <Text className="text-fg text-display-lg font-display">Numerology</Text>
        <Text className="text-fg-muted text-sm mt-1">Discover your cosmic numbers</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Your Numbers Grid */}
        {(lifePathNumber || destinyNumber || personalYear || personalMonth) && (
          <View className="mb-4">
            <Text className="text-fg text-lg font-body-bold mb-3">Your Numbers</Text>
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {lifePathNumber && (
                <View className="flex-1 bg-surface rounded-lg p-4 items-center border border-border-subtle" style={{ minWidth: '45%' }}>
                  <Text className="text-fg-muted text-xs mb-1">Life Path</Text>
                  <Text className="text-accent text-display-lg font-display">{lifePathNumber}</Text>
                  <Text className="text-fg-muted text-xs mt-1">{lifePathData?.name}</Text>
                </View>
              )}
              {destinyNumber && (
                <View className="flex-1 bg-surface rounded-lg p-4 items-center border border-border-subtle" style={{ minWidth: '45%' }}>
                  <Text className="text-fg-muted text-xs mb-1">Destiny</Text>
                  <Text className="text-accent text-display-lg font-display">{destinyNumber}</Text>
                  <Text className="text-fg-muted text-xs mt-1">{DESTINY_ARCHETYPES[destinyNumber]}</Text>
                </View>
              )}
              {personalYear && (
                <View className="flex-1 bg-surface rounded-lg p-4 items-center border border-border-subtle" style={{ minWidth: '45%' }}>
                  <Text className="text-fg-muted text-xs mb-1">Personal Year</Text>
                  <Text className="text-display-lg font-display" style={{ color: t.color.accent }}>{personalYear}</Text>
                  {personalYearMeaning && <Text className="text-fg-muted text-xs mt-1 text-center" numberOfLines={1}>{personalYearMeaning}</Text>}
                </View>
              )}
              {personalMonth && (
                <View className="flex-1 bg-surface rounded-lg p-4 items-center border border-border-subtle" style={{ minWidth: '45%' }}>
                  <Text className="text-fg-muted text-xs mb-1">Personal Month</Text>
                  {/* 🔴 `O-24` / `P27` — this stat cell and its Personal Year SIBLING three lines
                      above sat in different hues, and the difference between them is not a
                      difference in KIND: both are a numerology number under a label. `success` is a
                      STATUS role (ready · verified); spending it as "the month's colour" is the
                      exact defect the ruling names. The LABEL above each number is the identity. */}
                  <Text style={{ color: t.color.accent }} className="text-display-lg font-display">{personalMonth}</Text>
                  {personalMonthMeaning && <Text className="text-fg-muted text-xs mt-1 text-center" numberOfLines={1}>{personalMonthMeaning}</Text>}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Life Path Section */}
        <Card className="mb-4">
          <Text className="text-fg text-xl font-body-bold mb-2">Life Path Number</Text>
          <Text className="text-fg-muted mb-4">
            Your life path number reveals your purpose and the lessons you're meant to learn.
          </Text>

          {lifePathNumber && lifePathData ? (
            <View className="bg-bg rounded-md p-4 mt-2">
              <View className="flex-row items-center mb-4">
                {/* 🔴 ABOVE-CEILING DIMENSION — pass 3a. All four circular number badges in this
                    file are 56×56, and design §4.3 lists that key among "the five spacing outliers"
                    to migrate onto an authoring step. MEASURED: there is no step to migrate to. The
                    authoring vocabulary (§4.2) tops out at 48dp, so the only "nearest step" is 48 —
                    an 8px (14.3%) reduction of a circle whose content is a 24px numeral, on all four.
                    🔴 AND THE CLASSIFICATION IS WRONG AT THE ROOT: these are not spacing at all.
                    They are explicit DIMENSIONS that merely resolve THROUGH the spacing scale,
                    because Tailwind's width/height scales merge it. Same species as pass 2b's 7
                    above-ceiling type sizes: no target exists, so the value stays and the judgement
                    is recorded here rather than in a document. Registered as O-39.
                    A circle diameter is a dimension — it is not on the spacing ramp and never was. */}
                <View className="w-14 h-14 rounded-pill bg-accent items-center justify-center mr-4">
                  <Text className="text-on-accent text-2xl font-body-bold">{lifePathNumber}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-accent text-lg font-body-semi">
                    {lifePathData.name}
                  </Text>
                  <Text className="text-fg-muted text-sm">{lifePathData.summary}</Text>
                </View>
              </View>

              <Text className="text-fg text-sm mb-4">{lifePathData.personality}</Text>

              {/* Strengths */}
              <View className="mb-3">
                <Text className="text-accent text-sm font-body-semi mb-2">Strengths</Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {lifePathData.strengths.map((s, i) => (
                    <View key={i} className="bg-surface px-3 py-1.5 rounded-pill border border-border-subtle">
                      <Text className="text-fg text-xs">{s}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Challenges */}
              <View className="mb-3">
                <Text className="text-accent text-sm font-body-semi mb-2">Challenges</Text>
                {lifePathData.challenges.map((c, i) => (
                  <Text key={i} className="text-fg-muted text-xs mb-1">• {c}</Text>
                ))}
              </View>

              {/* Career */}
              <View className="mb-3">
                <Text style={{ color: t.color.accent }} className="text-sm font-body-semi mb-1">Career</Text>
                <Text className="text-fg-secondary text-xs">{lifePathData.career}</Text>
              </View>

              {/* Relationships */}
              <View>
                <Text style={{ color: t.color.danger }} className="text-sm font-body-semi mb-1">Relationships</Text>
                <Text className="text-fg-secondary text-xs">{lifePathData.relationships}</Text>
              </View>
            </View>
          ) : (
            <View>
              {lifePathError && (
                <Text className="text-danger text-sm mb-3">{lifePathError}</Text>
              )}
              <Button
                title="Calculate Life Path Number"
                onPress={handleCalculateLifePath}
                loading={isLoadingLifePath}
                variant="primary"
                fullWidth
              />
            </View>
          )}
        </Card>

        {/* Destiny Number Section */}
        <Card className="mb-4">
          <Text className="text-fg text-xl font-body-bold mb-2">Destiny Number</Text>
          <Text className="text-fg-muted mb-4">
            Your destiny number, derived from your full name, reveals your life's ultimate purpose.
          </Text>

          {destinyNumber ? (
            <View className="bg-bg rounded-md p-4 mt-2">
              <View className="flex-row items-center mb-4">
                {/* 🔴 THE SECOND LIVE AA FAILURE THE HUE SWEEP TURNED UP, AND THE WORST PAIRING IN
                    IT: the plain foreground on an iris fill measures **1.96:1**. It is the blind
                    half `CLAUDE.md` names — an INLINE fill with a className label, which the A5 pair
                    rule cannot resolve and the proximity rule's window and pattern both miss.
                    Two defects, one site: the iris was §16.5's generic-second-colour drift (this is
                    the DESTINY disc; the three siblings in this file are `accent`), and the label
                    was the wrong foreground for any accent-family fill. `on-accent` is 6.86:1. */}
                <View className="w-14 h-14 rounded-pill bg-accent items-center justify-center mr-4">
                  <Text className="text-on-accent text-2xl font-body-bold">{destinyNumber}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-accent text-lg font-body-semi">
                    {DESTINY_ARCHETYPES[destinyNumber] || `Destiny ${destinyNumber}`}
                  </Text>
                  <Text className="text-fg-muted text-xs">
                    Destiny Number {destinyNumber}
                  </Text>
                </View>
              </View>
              <Text className="text-fg text-sm">{destinyMeaning}</Text>
            </View>
          ) : (
            <View>
              <Text className="text-fg-muted text-sm mb-3">
                Add your name in your profile to calculate your destiny number.
              </Text>
              <Button
                title="Calculate Destiny Number"
                onPress={() => {}}
                variant="primary"
                fullWidth
                disabled
              />
            </View>
          )}
        </Card>

        {/* Personal Year Section */}
        <Card className="mb-4">
          <Text className="text-fg text-xl font-body-bold mb-2">Personal Year</Text>
          <Text className="text-fg-muted mb-4">
            Your personal year number reveals the overarching theme and energy shaping your entire year.
          </Text>

          {personalYear && personalYearData ? (
            <View className="bg-bg rounded-md p-4 mt-2">
              <View className="flex-row items-center mb-4">
                <View className="w-14 h-14 rounded-pill items-center justify-center mr-4" style={{ backgroundColor: t.color.accent }}>
                  <Text className="text-on-accent text-2xl font-body-bold">{personalYear}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-accent text-lg font-body-semi">
                    Year of {personalYearData.archetype}
                  </Text>
                  <Text className="text-fg-muted text-xs">
                    Personal Year {personalYear}
                  </Text>
                </View>
              </View>
              <Text className="text-fg text-sm mb-4">{personalYearData.description}</Text>

              {/* Focus Areas */}
              <View className="mb-3">
                <Text style={{ color: t.color.accent }} className="text-sm font-body-semi mb-2">Focus Areas</Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {personalYearData.focus.map((f, i) => (
                    <View key={i} className="bg-surface px-3 py-1.5 rounded-pill border border-border-subtle">
                      <Text className="text-fg text-xs">{f}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Strengths */}
              <View>
                <Text className="text-accent text-sm font-body-semi mb-2">Strengths</Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {personalYearData.strengths.map((s, i) => (
                    <View key={i} className="bg-surface px-3 py-1.5 rounded-pill border border-border-subtle">
                      <Text className="text-fg text-xs">{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-fg-muted text-sm mb-3">
                Your personal year number will appear once your birth data is set and numerology is calculated.
              </Text>
              <Button
                title="Calculate Personal Year"
                onPress={handleCalculateLifePath}
                loading={isLoadingLifePath}
                variant="primary"
                fullWidth
                disabled={!profile?.birthData?.date}
              />
            </View>
          )}
        </Card>

        {/* Personal Month Section */}
        <Card className="mb-4">
          <Text className="text-fg text-xl font-body-bold mb-2">Personal Month</Text>
          <Text className="text-fg-muted mb-4">
            Your personal month number reveals the specific energy and opportunities available to you this month.
          </Text>

          {personalMonth && personalMonthData ? (
            <View className="bg-bg rounded-md p-4 mt-2">
              <View className="flex-row items-center mb-4">
                {/* `O-24` / `P27` — the fourth of this file's four number discs, and the only one
                    that was not `accent`. `success` is a status role, not the month's colour. */}
                <View className="w-14 h-14 rounded-pill bg-accent items-center justify-center mr-4">
                  <Text className="text-on-accent text-2xl font-body-bold">{personalMonth}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-accent text-lg font-body-semi">
                    Month of {personalMonthData.archetype}
                  </Text>
                  <Text className="text-fg-muted text-xs">
                    Personal Month {personalMonth}
                  </Text>
                </View>
              </View>
              <Text className="text-fg text-sm mb-4">{personalMonthData.description}</Text>

              {/* Focus Areas */}
              <View className="mb-3">
                {/* 🔴 `O-24` / `P27` — "Focus Areas" and "Strengths" are two GROUP LABELS over two
                    identical chip lists inside one card, and they were green and orange. Nothing
                    about the two groups differs in kind, so the hue was encoding "these are the
                    other ones" — which is §16.5's test failed outright ("it just needed to be a
                    different colour" is the wrong token). The HEADING is the identity. */}
                <Text className="text-accent text-sm font-body-semi mb-2">Focus Areas</Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {personalMonthData.focus.map((f, i) => (
                    <View key={i} className="bg-surface px-3 py-1.5 rounded-pill border border-border-subtle">
                      <Text className="text-fg text-xs">{f}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Strengths */}
              <View>
                <Text className="text-accent text-sm font-body-semi mb-2">Strengths</Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {personalMonthData.strengths.map((s, i) => (
                    <View key={i} className="bg-surface px-3 py-1.5 rounded-pill border border-border-subtle">
                      <Text className="text-fg text-xs">{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-fg-muted text-sm mb-3">
                Your personal month number will appear once your birth data is set and numerology is calculated.
              </Text>
              <Button
                title="Calculate Personal Month"
                onPress={handleCalculateLifePath}
                loading={isLoadingLifePath}
                variant="primary"
                fullWidth
                disabled={!profile?.birthData?.date}
              />
            </View>
          )}
        </Card>

        {/* Name Destiny Analysis Card */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (isPremiumPlus) {
              router.push('/(main)/numerology/name-destiny' as any);
            } else {
              openPaywall('numerology-name-destiny');
            }
          }}
          className="mb-8"
          activeOpacity={0.8}
        >
          {/* 🔴 THIS TILE WAS THE LAST SURVIVING INSTANCE OF THE ACCENT-CARD PATTERN, AND ALL THREE
              OF ITS PARTS WERE THE SAME MISTAKE SEEN FROM THREE ANGLES.
                · an ACCENT-FILLED GROUND on a card. §2 row 13 gives the accent to the primary
                  ACTION; §2 rows 2-4 give a card the surface ladder. A whole tile in the action
                  colour leaves the CTA inside it with nowhere to go, which is why that CTA had to
                  draw a translucent veil over its own ground to be seen at all — the veil was a
                  symptom, and it is gone with the fill rather than "fixed".
                · an EMOJI where an Ionicon belongs (§9.2, and per-OEM fallback is why functional
                  emoji were retired system-wide — the same glyph is a different picture per vendor).
                · a CLIENT-SIDE TIER LITERAL, absolutely positioned, overlapping the title. That is
                  the R1 half and it is the serious one; see `components/ui/LockSlot.tsx`.
              🟢 THE TREATMENT IS NOT INVENTED HERE — it is the readings hub's Name Destiny card,
                 which is THE SAME DESTINATION gated on THE SAME ENTITLEMENT, already built this way.
                 Two renderings of one row is what produced this defect, so the fix is to converge
                 rather than to author a third look.
              ⚠️ EVERY STRING IS THIS FILE'S OWN, VERBATIM. §0.0 rule 1 — the hub's wording is
                 different and adopting it would be a copy change riding a restyle.
              🔴 AND THE LABELS RE-MEASURE, THEY ARE NOT RE-USED: on a dark ground the on-fill role
                 is wrong and the ramp returns — `fg` 16.04:1 for the title, `fg-secondary` 9.89:1
                 for the subtitle, both on `surface`. `on-accent` survives on the CTA pill ALONE,
                 because the pill is the only accent fill left in the box. */}
          <View
            style={{
              backgroundColor: t.color.surface,
              borderRadius: t.radius.md,
              padding: 24,
              minHeight: 140,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: t.color['border-subtle'],
            }}
          >
            <View className="flex-row items-center mb-3">
              <View
                style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="text-outline" size={40} color={t.color.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-fg text-xl font-body-bold">Name Destiny</Text>
                <Text className="text-fg-secondary text-sm">
                  {isPremiumPlus ? 'Discover your name\'s cosmic power' : 'Unlock your name\'s hidden numerology'}
                </Text>
              </View>
              {!isPremiumPlus && <LockSlot />}
            </View>
            <View className="bg-accent py-3 px-4 rounded-pill">
              <Text className="text-on-accent font-body-semi text-center">
                {isPremiumPlus ? 'Analyze My Name' : 'Upgrade to Unlock'} &rarr;
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
