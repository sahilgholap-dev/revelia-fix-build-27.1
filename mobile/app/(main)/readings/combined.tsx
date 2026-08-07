import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { Ionicons } from '@expo/vector-icons';
import { useReadingsStore } from '@/store/readingsStore';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { EntertainmentDisclaimer } from '@/components/common/EntertainmentDisclaimer';
import { ShareCard } from '@/components/ShareCard';
import { dedupStrings } from '@/utils/dedupStrings';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

// Life path number brief descriptions
const LIFE_PATH_DESCRIPTIONS: Record<number, string> = {
  1: 'The Leader - Independent, ambitious, and pioneering',
  2: 'The Mediator - Diplomatic, sensitive, and cooperative',
  3: 'The Communicator - Creative, expressive, and joyful',
  4: 'The Builder - Practical, disciplined, and dependable',
  5: 'The Adventurer - Freedom-loving, versatile, and dynamic',
  6: 'The Nurturer - Responsible, caring, and harmonious',
  7: 'The Seeker - Analytical, spiritual, and introspective',
  8: 'The Powerhouse - Ambitious, authoritative, and resourceful',
  9: 'The Humanitarian - Compassionate, generous, and wise',
  11: 'The Intuitive - Visionary, inspirational, and enlightened',
  22: 'The Master Builder - Practical visionary with grand ambitions',
  33: 'The Master Teacher - Selfless, spiritually evolved, and healing',
};

// 🔴 RENAMED FROM `SectionCard` IN §9 ITEM 4, AND THE RENAME IS THE POINT (§3.3 M-2).
//    This is NOT the extracted primitive wearing a local copy's clothes — it is a DIFFERENT
//    COMPONENT that happened to share its name: {title, icon, children}, no lock branch, no
//    horizontal margin, and a header rule of its own. It was never a candidate for the merge.
// 🔴 THE NAME COLLISION WAS ALSO A GATE HAZARD, which is why it is fixed here rather than
//    tolerated: `primitive-adoption-check.js` keys on the JSX ELEMENT NAME, so while both
//    existed nothing in the tree could tell an adopter from a look-alike. This file is now in
//    the primitive's `forbidden` list with that reason, so re-introducing the name fails loudly.
// ⬜ Its emoji-as-icon is §9.2's ban and is NOT converted here: an Ionicons swap needs a NAME
//    per section and the payload carries none, so it is a screens-phase decision with data
//    behind it, not a rename. Registered rather than done badly (§0.0 rule 2).
function IconSectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={{ fontSize: 22 /* GLYPH */, marginRight: 8 }}>{icon}</Text>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function TraitBadge({ trait }: { trait: string }) {
  return (
    <View style={{ backgroundColor: t.alpha(t.color.accent, 30), paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.lg }}>
      <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['accent-2'], fontFamily: t.family['body-semi'] }}>
        {trait.charAt(0).toUpperCase() + trait.slice(1)}
      </Text>
    </View>
  );
}

function StrengthItem({ strength }: { strength: string }) {
  return (
    <View style={{
      backgroundColor: t.alpha(t.color.accent, 15),
      borderLeftWidth: 3,
      borderLeftColor: t.color.accent,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 16 /* GLYPH */, marginRight: 10, color: t.color.accent }}>{'✓'}</Text>
      <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg, fontFamily: t.family['body-semi'], flex: 1 }}>
        {strength.charAt(0).toUpperCase() + strength.slice(1)}
      </Text>
    </View>
  );
}

export default function CombinedProfileScreen() {
  const { faceReading, palmReadingDominant, isLoadingFace, isLoadingPalm, error, fetchFaceReading, fetchPalmReading, clearError } = useReadingsStore();
  const { user } = useAuthStore();
  const { profile, numerology, birthChart, fetchProfile, fetchNumerology, fetchBirthChart } = useProfileStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const bottomPad = useBottomInsetPadding();

  const isPremium = user?.subscription?.tier !== 'free';

  useEffect(() => {
    if (!isPremium) {
      openPaywall('combined-gate', { replace: true });
      return;
    }

    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([
        fetchFaceReading().catch(() => {}),
        fetchPalmReading('dominant').catch(() => {}),
        fetchProfile().catch(() => {}),
        fetchNumerology().catch(() => {}),
        fetchBirthChart().catch(() => {}),
      ]);
    } catch (err) {
      console.error('Failed to load combined profile data:', err);
    } finally {
      setIsInitialLoad(false);
    }
  };

  if (!isPremium) {
    return null;
  }

  // Show loading during initial data fetch
  if (isInitialLoad && (isLoadingFace || isLoadingPalm)) {
    return (
      <ScreenContainer withScrollView={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={t.color.accent} />
          <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color['fg-muted'], marginTop: 16 }}>Loading your cosmic blueprint...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // If no readings at all, show a helpful empty state
  if (!faceReading && !palmReadingDominant && !profile?.sunSign && !profile?.lifePathNumber) {
    return (
      <ScreenContainer withScrollView={false}>
        {/* 🔴 PASS 3a — all three sites in this file are the SCREEN gutter, named (design §4.2).
            This screen renders `<ScreenContainer withScrollView={false}>`, which applies NO
            padding at all, so the gutter is genuinely this file's to own. Byte-identical: 24. */}
        <View style={{ paddingHorizontal: t.space['screen-x'], paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color={t.color.fg} />
          </TouchableOpacity>
          <Text style={{ ...t.txt('text-xl').style, color: t.color.fg }}>Your Cosmic Blueprint</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.space['screen-x'] }}>
          <Text style={{ fontSize: 48 /* GLYPH */, marginBottom: 16 }}>{'*'}</Text>
          <Text style={{ ...t.txt('display-sm').style, color: t.color.fg, marginBottom: 8 }}>Build Your Profile</Text>
          <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'], textAlign: 'center', marginBottom: 24 }}>
            Capture your face or palm to start building your combined cosmic profile.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(main)/home')}
            style={{ backgroundColor: t.color.accent, paddingVertical: 14, paddingHorizontal: 32, borderRadius: t.radius.lg }}
          >
            <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color['on-accent'] }}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Extract face reading data safely (V1 and V2 compatible)
  const face = faceReading ? (faceReading as any) : null;
  const faceArchetypeName = face?.archetype?.name || (typeof face?.archetype === 'string' ? face.archetype : null);
  const faceArchetypeTagline = face?.archetype?.tagline || face?.archetype?.coreEssence || '';
  const faceStrengths: string[] = Array.isArray(face?.strengths) ? face.strengths : [];
  const faceTraits: string[] = Array.isArray(face?.faceShape?.coreTraits) ? face.faceShape.coreTraits : [];
  const faceAffirmation: string | null = face?.affirmation || null;

  // Extract palm reading data safely (V1 and V2 compatible)
  const palm = palmReadingDominant ? (palmReadingDominant as any) : null;
  const palmEnergyType = palm?.palmEnergyType;
  const palmTypeName = palmEnergyType?.type || (typeof palm?.palmType === 'string' ? palm.palmType : palm?.palmType?.name) || null;
  const palmTypeDesc = palmEnergyType?.description || (typeof palm?.palmType === 'string' ? '' : palm?.palmType?.description) || '';
  const palmCoreNature = palmEnergyType?.coreNature || '';
  const palmLifeTheme = palm?.destiny?.lifeTheme || palmEnergyType?.lifeDirectionTheme || '';
  const palmNaturalTalents: string[] = Array.isArray(palm?.naturalTalents) ? palm.naturalTalents : (Array.isArray(palm?.destiny?.naturalTalents) ? palm.destiny.naturalTalents : []);

  // Profile data
  const sunSign = profile?.sunSign || null;
  const lifePathNumber = profile?.lifePathNumber || numerology?.lifePathNumber || null;
  const lifePathMeaning = numerology?.lifePathMeaning || (lifePathNumber ? LIFE_PATH_DESCRIPTIONS[lifePathNumber] : null) || null;

  // Birth chart data (if available)
  const moonSign = birthChart?.moonSign || null;
  const risingSign = birthChart?.risingSign || birthChart?.ascendant || null;

  // Combine strengths from both readings, then dedup near-duplicates that
  // emerge when face/palm both surface the same underlying trait expressed
  // slightly differently (e.g., "Creativity" + "Creative thinking").
  const combinedStrengths: string[] = dedupStrings(
    [...faceStrengths, ...palmNaturalTalents.slice(0, 3)],
    { similarityThreshold: 0.6, maxLength: 8 }
  );

  // Combine traits — same dedup treatment.
  const combinedTraits: string[] = dedupStrings(
    [...faceTraits, ...(palmCoreNature ? [palmCoreNature] : [])],
    { similarityThreshold: 0.6, maxLength: 8 }
  );

  // Share card data
  const signParts = [sunSign, moonSign, risingSign].filter(Boolean) as string[];
  const cosmicSubtitle =
    signParts.length > 0
      ? signParts.join(' · ')
      : (faceArchetypeName || palmTypeName || 'Cosmic Blueprint');
  const cosmicInsightLine =
    faceArchetypeTagline ||
    (palmLifeTheme ? palmLifeTheme.split('.')[0] + '.' : null) ||
    (faceArchetypeName && palmTypeName
      ? `The essence of ${faceArchetypeName} meets the energy of ${palmTypeName}.`
      : null) ||
    (faceArchetypeName
      ? `Your face reveals the archetype of ${faceArchetypeName}.`
      : null) ||
    null;

  return (
    <ScreenContainer withScrollView={false}>
      {/* Header — the SCREEN gutter, named (pass 3a; see the empty-state branch above for why this
          file owns it: `withScrollView={false}` means ScreenContainer applies no padding). */}
      <View style={{ paddingHorizontal: t.space['screen-x'], paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color={t.color.fg} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ ...t.txt('text-xl').style, color: t.color.fg }}>Your Cosmic Blueprint</Text>
          <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'] }}>{user?.name || 'Your complete profile'}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>

        {/* Archetype Summary */}
        {faceArchetypeName && (
          <IconSectionCard title="Your Archetype" icon={'\uD83D\uDC64'}>
            <View style={{ backgroundColor: t.alpha(t.color.accent, 20), borderRadius: t.radius.md, padding: 20, alignItems: 'center' }}>
              <Text style={{ ...t.txt('display-md').style, color: t.color.accent, textAlign: 'center', marginBottom: 6 }}>
                {faceArchetypeName}
              </Text>
              {faceArchetypeTagline ? (
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], textAlign: 'center' }}>
                  {faceArchetypeTagline}
                </Text>
              ) : null}
            </View>
          </IconSectionCard>
        )}

        {/* Palm Energy Type */}
        {palmTypeName && (
          <IconSectionCard title="Palm Energy Type" icon={'\u270B'}>
            <View style={{ backgroundColor: t.alpha(t.color.accent, 10), borderRadius: t.radius.md, padding: 20 }}>
              <Text style={{ ...t.txt('display-sm').style, color: t.color.accent, marginBottom: 6 }}>
                {palmTypeName}
              </Text>
              {palmTypeDesc ? (
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], marginBottom: 8 }}>
                  {palmTypeDesc}
                </Text>
              ) : null}
              {palmCoreNature ? (
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote }}>
                  {palmCoreNature}
                </Text>
              ) : null}
            </View>
          </IconSectionCard>
        )}

        {/* Sun / Moon / Rising */}
        {(sunSign || moonSign || risingSign) && (
          <IconSectionCard title="Celestial Signs" icon={'\u2600\uFE0F'}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {sunSign && (
                <View style={{ backgroundColor: t.alpha(t.color.accent, 15), borderRadius: t.radius.md, paddingHorizontal: 16, paddingVertical: 12, flex: 1, minWidth: '45%' }}>
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Sun Sign</Text>
                  <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.accent, fontFamily: t.family['body-bold'] }}>{sunSign}</Text>
                </View>
              )}
              {/* 🔴 `O-24` / `P27` — THE SAME THREE CATEGORIES AS THE ASTROLOGY HUB'S BIG THREE,
                  RENDERED IN A THIRD PALETTE. Sun was accent, Moon was the MUTED neutral on a muted
                  wash, Rising was iris — so the same three facts about one user carried different
                  colours on two screens, and on this one the Moon cell additionally read as
                  DE-EMPHASISED against its siblings, which is a claim the data does not make.
                  🟢 All three now take the Sun cell's shipped treatment verbatim, so the set is one
                     hue and the LABEL above each value is the identity. */}
              {moonSign && (
                <View style={{ backgroundColor: t.alpha(t.color.accent, 15), borderRadius: t.radius.md, paddingHorizontal: 16, paddingVertical: 12, flex: 1, minWidth: '45%' }}>
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Moon Sign</Text>
                  <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.accent, fontFamily: t.family['body-bold'] }}>{moonSign}</Text>
                </View>
              )}
              {risingSign && (
                <View style={{ backgroundColor: t.alpha(t.color.accent, 15), borderRadius: t.radius.md, paddingHorizontal: 16, paddingVertical: 12, flex: 1, minWidth: '45%' }}>
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Rising Sign</Text>
                  <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.accent, fontFamily: t.family['body-bold'] }}>{risingSign}</Text>
                </View>
              )}
            </View>
          </IconSectionCard>
        )}

        {/* Life Path Number */}
        {lifePathNumber && (
          <IconSectionCard title="Life Path Number" icon={'\uD83D\uDD22'}>
            <View style={{ backgroundColor: t.alpha(t.color.accent, 15), borderRadius: t.radius.md, padding: 20, alignItems: 'center' }}>
              <Text style={{ color: t.color.accent, fontSize: 40 /* ABOVE-CEILING */, fontFamily: t.family['body-bold'], marginBottom: 8 }}>{lifePathNumber}</Text>
              {lifePathMeaning ? (
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], textAlign: 'center' }}>
                  {lifePathMeaning}
                </Text>
              ) : null}
            </View>
          </IconSectionCard>
        )}

        {/* Key Personality Traits */}
        {combinedTraits.length > 0 && (
          <IconSectionCard title="Key Personality Traits" icon={'\u2728'}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {combinedTraits.map((trait, index) => (
                <TraitBadge key={index} trait={trait} />
              ))}
            </View>
          </IconSectionCard>
        )}

        {/* Strengths Synthesis */}
        {combinedStrengths.length > 0 && (
          <IconSectionCard title="Strengths Synthesis" icon={'\u2B50'}>
            <View style={{ gap: 10 }}>
              {combinedStrengths.map((strength, index) => (
                <StrengthItem key={index} strength={strength} />
              ))}
            </View>
          </IconSectionCard>
        )}

        {/* Cosmic Blueprint Narrative */}
        {(faceArchetypeName || palmTypeName) && (
          <IconSectionCard title="Your Cosmic Blueprint" icon={'\uD83C\uDF0C'}>
            <View style={{ backgroundColor: t.color.surface, borderRadius: t.radius.md, padding: 20 }}>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
                {faceArchetypeName && palmTypeName
                  ? `You embody the essence of ${faceArchetypeName.toLowerCase()}, with the elemental energy of ${palmTypeName.toLowerCase()}. This unique combination creates a powerful synergy in your personality.`
                  : faceArchetypeName
                    ? `Your face reveals the archetype of ${faceArchetypeName.toLowerCase()}, shaping the way you engage with the world around you.`
                    : `Your palm reveals ${palmTypeName!.toLowerCase()} energy, guiding your path and destiny.`
                }
              </Text>

              {sunSign && (
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], marginTop: 12 }}>
                  As a {sunSign}, your celestial alignment adds another dimension to this profile, influencing your instincts and deeper motivations.
                </Text>
              )}

              {user?.subscription?.tier === 'premium_plus' && birthChart && (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.alpha(t.color.accent, 30) }}>
                  <Text style={{ color: t.color.fg, fontFamily: t.family['body-semi'], marginBottom: 6 }}>Birth Chart Integration</Text>
                  <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'] }}>
                    Your birth chart reveals deeper cosmic patterns that enhance your combined profile.
                    {moonSign ? ` Your ${moonSign} Moon shapes your emotional landscape,` : ''}
                    {risingSign ? ` while your ${risingSign} Rising influences how others perceive you.` : ''}
                  </Text>
                </View>
              )}
            </View>
          </IconSectionCard>
        )}

        {/* Unified Life Theme */}
        {palmLifeTheme ? (
          <IconSectionCard title="Unified Life Theme" icon={'\u2728'}>
            <View style={{ backgroundColor: t.alpha(t.color.accent, 15), borderRadius: t.radius.md, padding: 20 }}>
              <Text {...t.txt('quote')} style={{ ...t.txt('quote').style, color: t.color.fg, textAlign: 'center' }}>
                {palmLifeTheme}
              </Text>
            </View>
          </IconSectionCard>
        ) : null}

        {/* Personal Affirmation */}
        {faceAffirmation && (
          <IconSectionCard title="Your Personal Affirmation" icon={'\uD83D\uDCAB'}>
            <View style={{ backgroundColor: t.color.surface, borderRadius: t.radius.md, padding: 20 }}>
              <Text style={{ color: t.color.accent, fontSize: 36 /* ABOVE-CEILING */, textAlign: 'center', marginBottom: 8 }}>"</Text>
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg, fontFamily: t.family.quote, textAlign: 'center' }}>
                {faceAffirmation}
              </Text>
              <Text style={{ color: t.color.accent, fontSize: 36 /* ABOVE-CEILING */, textAlign: 'center', marginTop: 8 }}>"</Text>
            </View>
          </IconSectionCard>
        )}

        {/* Complete Your Profile CTA */}
        {(!faceReading || !palmReadingDominant) && (
          <View style={styles.ctaCard}>
            <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'], marginBottom: 6 }}>
              {faceReading ? 'Add Your Palm Reading' : 'Add Your Face Reading'}
            </Text>
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'], textAlign: 'center', marginBottom: 16 }}>
              {faceReading
                ? 'Capture your palm to unlock the full combined profile experience.'
                : 'Capture your face to unlock the full combined profile experience.'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(faceReading ? '/(capture)/palm-capture' : '/(capture)/face-capture');
              }}
              style={{ backgroundColor: t.color.accent, paddingVertical: 12, paddingHorizontal: 28, borderRadius: t.radius.lg }}
            >
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['on-accent'], fontFamily: t.family['body-semi'] }}>
                {faceReading ? 'Capture Palm' : 'Capture Face'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Share Card */}
        {cosmicInsightLine && (
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <ShareCard
              title="Cosmic Blueprint"
              subtitle={cosmicSubtitle}
              insightLine={cosmicInsightLine}
            />
          </View>
        )}

        {/* Entertainment Disclaimer */}
        <EntertainmentDisclaimer />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: t.color['surface-raised'],
    borderRadius: t.radius.md,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: t.type['text-lg'].size,
    lineHeight: t.type['text-lg'].lineHeight,
    letterSpacing: t.type['text-lg'].letterSpacing,
    fontFamily: t.family['body-semi'],
    color: t.color.fg,
    flex: 1,
  },
  ctaCard: {
    backgroundColor: t.alpha(t.color.accent, 15),
    borderRadius: t.radius.md,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.alpha(t.color.accent, 30),
  },
});
