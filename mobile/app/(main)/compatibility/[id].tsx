import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Alert, Image, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { compatibilityService } from '../../../services/compatibility.service';
import { useAuthStore } from '../../../store/authStore';
import { useProfileStore } from '../../../store/profileStore';
import { CompatibilityReading } from '@shared/types';
import { Button } from '../../../components/ui/Button';
import { CompatibilityScoreRing } from '../../../components/compatibility/CompatibilityScoreRing';
import { CompatibilityShareCard } from '../../../components/compatibility/CompatibilityShareCard';
import { ScoreCard } from '../../../components/readings/ScoreCard';
import { StrengthsList } from '../../../components/readings/StrengthsList';
import { GrowthCard } from '../../../components/readings/GrowthCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EntertainmentDisclaimer } from '@/components/common/EntertainmentDisclaimer';

import * as Haptics from 'expo-haptics';
import { isShareDismissal, shareReadingCard } from '@/utils/shareReading';
import { SectionCard } from '@/components/ui/SectionCard';
import { recordMeaningfulAction } from '@/store/reviewStore';
import * as t from '@/theme';



export default function CompatibilityResultScreen() {
  const { id } = useLocalSearchParams();
  const bottomPad = useBottomInsetPadding();
  const [reading, setReading] = useState<CompatibilityReading | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore(state => state.user);
  const { profile } = useProfileStore();
  const tier = user?.subscription?.tier || 'free';
  const shareRef = useRef(null);
  const userFaceUrl = profile?.images?.face?.url;

  useEffect(() => {
    loadReading();
  }, [id]);

  useEffect(() => {
    if (!reading) return;
    recordMeaningfulAction('compat:' + (id as string));
  }, [reading, id]);

  const loadReading = async () => {
    try {
      const data = await compatibilityService.getCompatibilityById(id as string);
      setReading(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load reading');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🔴 THIS WAS A FOURTH, HAND-ROLLED COPY OF THE ENTIRE SHARE PIPELINE — 48 lines reproducing
   *    `utils/shareReading.ts` step for step — AND IT WAS DEFINED UNDER THE EXPORTED UTIL'S OWN
   *    NAME. Two separate hazards in one function:
   *
   *    · X6/X7's four properties (a boolean return, callers gating on it, `failOnCancel: false`,
   *      dismissal through the exported predicate) are documented as living in ONE module. A second
   *      implementation means the invariant has two homes and only one of them is documented, so a
   *      future fix to the documented one silently misses this surface. It was CORRECT here, which
   *      is the dangerous kind of duplicate: nothing would have flagged it drifting.
   *    · the local name SHADOWED the export, so importing the util into this file would have
   *      resolved to the local. That is the fourth name collision of this phase and the third
   *      caught by grepping for a local definition BEFORE reaching for a shared symbol.
   *
   * 🟢 Behaviour is preserved exactly, including the ref staying where it is: `result: 'tmpfile'`
   *    is view-shot's default, so the capture is unchanged, and the early return on a missing ref
   *    is kept because the util THROWS there (which would otherwise surface as a "failed" alert
   *    where today nothing happens at all).
   */
  const shareCompatibilityCard = async () => {
    if (!shareRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const shared = await shareReadingCard(shareRef);
      if (!shared) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      recordMeaningfulAction('share:compatibility');
    } catch (error) {
      if (isShareDismissal(error)) return;
      console.error('Share error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Share Failed', 'Unable to share the reading');
    }
  };

  if (isLoading || !reading) {
    return <LoadingSpinner text="Loading compatibility reading..." fullScreen />;
  }

  const isPremium = tier !== 'free';
  const compat = reading.reading;

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
      {/* Header with both photos */}
      <View className="p-6 items-center">
        <View className="flex-row items-center mb-4">
          <View className="w-20 h-20 rounded-pill bg-surface mr-4 overflow-hidden items-center justify-center">
            {userFaceUrl ? (
              <Image source={{ uri: userFaceUrl }} className="w-full h-full" />
            ) : (
              <Text style={{ fontSize: 32 /* GLYPH */ }}>👤</Text>
            )}
          </View>
          <Text className="text-4xl">💫</Text>
          <View className="w-20 h-20 rounded-pill bg-surface ml-4 overflow-hidden">
            <Image
              source={{ uri: reading.partnerImageUrl }}
              className="w-full h-full"
            />
          </View>
        </View>

        <Text className="text-fg text-lg mb-2">
          You & {reading.partnerName}
        </Text>

        {/* Relationship Type Badge */}
        {(reading as any).relationshipType && (reading as any).relationshipType !== 'love' && (
          <View style={{
            backgroundColor: t.alpha(t.color.accent, 30),
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: t.radius.md,
            marginTop: 4,
          }}>
            <Text style={{ ...t.txt('text-2xs').style, color: t.color['accent-2'] }}>
              {(() => {
                const labels: Record<string, string> = {
                  love: '❤️ Love',
                  business: '💼 Business',
                  sibling: '👨‍👧 Family',
                  parent_child: '👨‍👧 Family',
                  friend: '🤝 Friend',
                };
                return labels[(reading as any).relationshipType] || '❤️ Love';
              })()}
            </Text>
          </View>
        )}
      </View>

      {/* Score Ring */}
      <View className="items-center mb-6">
        <CompatibilityScoreRing score={compat.overallScore} size={200} animated />
      </View>

      {/* Headline */}
      <View className="px-4 mb-6">
        <Text className="text-accent text-2xl font-body-bold text-center">
          {compat.headline}
        </Text>
      </View>

      {/* Summary */}
      <View className="px-4 mb-6">
        <Text className="text-fg text-base text-center">
          {compat.summary}
        </Text>
      </View>

      {/* Category Scores - All wrapped in SectionCard for consistency */}
      <SectionCard title="Compatibility Breakdown">
        <ScoreCard {...compat.categoryScores.emotional} />
        <ScoreCard {...compat.categoryScores.communication} />
      </SectionCard>

      <SectionCard title="Intellectual Compatibility" locked={!isPremium}>
        {isPremium && compat.categoryScores.intellectual && (
          <ScoreCard {...compat.categoryScores.intellectual} />
        )}
      </SectionCard>

      <SectionCard title="Shared Values" locked={!isPremium}>
        {isPremium && compat.categoryScores.values && (
          <ScoreCard {...compat.categoryScores.values} />
        )}
      </SectionCard>

      <SectionCard title="Passion & Chemistry" locked={!isPremium}>
        {isPremium && compat.categoryScores.passion && (
          <ScoreCard {...compat.categoryScores.passion} />
        )}
      </SectionCard>

      {/* Strengths */}
      <SectionCard title="What Works">
        <StrengthsList strengths={compat.strengths} />
      </SectionCard>

      {/* Challenges */}
      <SectionCard title="Areas to Navigate" locked={!isPremium}>
        {isPremium && compat.challenges && compat.challenges.length > 0 && (
          <>
            {compat.challenges.map((challenge: string, i: number) => (
              <View key={i} className="bg-surface rounded-md p-4 mb-2">
                <Text className="text-fg-secondary text-sm">{challenge}</Text>
              </View>
            ))}
          </>
        )}
      </SectionCard>

      {/* Advice */}
      <SectionCard title="Relationship Advice" locked={!isPremium}>
        {isPremium && compat.advice && (
          <GrowthCard text={compat.advice} isLocked={false} />
        )}
      </SectionCard>

      {/* Cosmic Connection */}
      <SectionCard title="Cosmic Connection" locked={!isPremium}>
        {isPremium && compat.cosmicConnection && (
          <>
            <View className="bg-surface rounded-lg p-5 mb-3">
              <Text className="text-accent-2 text-sm font-body-semi mb-2">Sun Sign Compatibility</Text>
              <Text className="text-fg-secondary text-sm">{compat.cosmicConnection.sunSignCompatibility}</Text>
            </View>
            <View className="bg-surface rounded-lg p-5 mb-3">
              <Text className="text-accent-2 text-sm font-body-semi mb-2">Numerology Alignment</Text>
              <Text className="text-fg-secondary text-sm">{compat.cosmicConnection.numerologyAlignment}</Text>
            </View>
            <View className="bg-surface rounded-lg p-5">
              <Text className="text-accent-2 text-sm font-body-semi mb-2">Archetype Synergy</Text>
              <Text className="text-fg-secondary text-sm">{compat.cosmicConnection.archetypeSynergy}</Text>
            </View>
          </>
        )}
      </SectionCard>

      {/* Shareable Card */}
      <View className="px-4 mb-8" collapsable={false} ref={shareRef}>
        <CompatibilityShareCard
          user1={{ name: 'You', imageUrl: userFaceUrl || '' }}
          user2={{ name: reading.partnerName, imageUrl: reading.partnerImageUrl }}
          score={compat.overallScore}
          headline={compat.headline}
          quote={compat.shareableQuote}
          onShare={shareCompatibilityCard}
        />
      </View>

      {/* Bottom CTAs */}
      <View className="px-4 mb-6">
        <Button
          title="New Compatibility"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.back();
            router.back();
          }}
          variant="secondary"
          fullWidth
        />
      </View>

      {/* Entertainment Disclaimer */}
      <EntertainmentDisclaimer />
    </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
});
