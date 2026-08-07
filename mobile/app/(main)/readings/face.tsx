import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { BackButton } from '@/components/ui/BackButton';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { useReadingsStore } from '@/store/readingsStore';
import { useAuthStore } from '@/store/authStore';
import { ArchetypeHeader } from '@/components/readings/ArchetypeHeader';
import { ScoreCard } from '@/components/readings/ScoreCard';
import { StrengthsList } from '@/components/readings/StrengthsList';
import { GrowthCard } from '@/components/readings/GrowthCard';
import { AffirmationCard } from '@/components/readings/AffirmationCard';
import { ShareCard } from '@/components/ShareCard';
import { GeneratingReading } from '@/components/readings/GeneratingReading';
import { NotificationPrompt } from '@/components/common/NotificationPrompt';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { EntertainmentDisclaimer } from '@/components/common/EntertainmentDisclaimer';
import { LockShell } from '@/components/ui/LockShell';
import { SectionCard } from '@/components/ui/SectionCard';

import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { recordMeaningfulAction } from '@/store/reviewStore';
import * as t from '@/theme';
import { Ionicons } from '@expo/vector-icons';


function FeatureInsight({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.accent, fontFamily: t.family['body-semi'], marginBottom: 2 }}>{label}</Text>
      <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>{value}</Text>
    </View>
  );
}

function CollapsibleFeature({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, marginBottom: 8, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
      >
        <Text style={{ fontSize: 20 /* GLYPH */, marginRight: 10 }}>{icon}</Text>
        <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg, fontFamily: t.family['body-semi'], flex: 1 }}>{title}</Text>
        <Ionicons
          name={expanded ? 'caret-up' : 'caret-down'}
          size={20}
          color={t.color['fg-muted']}
          accessibilityLabel={expanded ? 'Collapse' : 'Expand'}
        />
      </TouchableOpacity>
      {expanded && <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>{children}</View>}
    </View>
  );
}

export default function FaceReadingScreen() {
  const { faceReading, isLoadingFace, error, fetchFaceReading, clearError } = useReadingsStore();
  const { user } = useAuthStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const { showPrompt, handleAccept, handleDecline } = useNotificationPermission();

  const tier = user?.subscription?.tier || 'free';
  const isPremium = tier !== 'free'; // premium or premium_plus
  const isPremiumPlus = tier === 'premium_plus';
  const bottomPad = useBottomInsetPadding();

  useEffect(() => {
    loadReading();
  }, []);

  useEffect(() => {
    if (!faceReading) return;
    recordMeaningfulAction('reading:face');
  }, [faceReading]);

  const loadReading = async () => {
    try {
      await fetchFaceReading();
    } catch (err) {
      console.error('Failed to load face reading:', err);
    }
  };

  if (isGenerating) {
    return <GeneratingReading type="face" />;
  }

  if (isLoadingFace) {
    return <LoadingSpinner text="Revealing your traits..." fullScreen />;
  }

  if (error) {
    return (
      <ScreenContainer withScrollView={false}>
        <ErrorView
          message={error}
          onRetry={() => {
            clearError();
            loadReading();
          }}
        />
      </ScreenContainer>
    );
  }

  if (!faceReading) {
    return (
      <ScreenContainer withScrollView={false}>
        <EmptyState
          title="No Face Reading Yet"
          description="Capture your face to unlock your personalized reading and discover your archetype"
          actionTitle="Capture Face"
          onAction={() => router.push('/(capture)/face-capture')}
        />
      </ScreenContainer>
    );
  }

  // Support both V1 and V2 format
  const reading = faceReading as any;
  const archetype = reading.archetype;
  const faceShape = reading.faceShape;
  const facialFeatures = reading.facialFeatures;
  const traitAnalysis = reading.traitAnalysis;
  const hiddenStrength = reading.hiddenStrength;
  const hiddenWeakness = reading.hiddenWeakness;
  const strengths = reading.strengths;
  const dailyFaceInsight = reading.dailyFaceInsight;
  const premiumContent = reading.premiumContent;

  // Legacy V1 fields
  const categories = reading.categories;
  const growthOpportunity = reading.growthOpportunity;
  const affirmation = reading.affirmation;
  const shareableQuote = reading.shareableQuote;

  // Share card data (V1 + V2 compatible)
  const faceSubtitle: string | null =
    typeof archetype === 'string' ? archetype : (archetype?.name ?? null);
  const faceInsightLine: string | null =
    shareableQuote ||
    (archetype?.coreEssence ? archetype.coreEssence.split('.')[0] + '.' : null) ||
    archetype?.tagline ||
    null;

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          {/* Three ways in — Home, the hub, and the capture screen on completion — and until now
              no way out but the tab bar, which loses the reading. It renders nothing when there
              is nothing beneath, which is the completion path. */}
          <BackButton className="mb-3" />
          <Text className="text-fg text-display-lg font-display">Face Reading</Text>
          <Text className="text-fg-muted text-sm mt-1">Your unique archetype revealed</Text>
        </View>

        {/* Archetype Header */}
        {archetype && (
          <View className="px-6 mb-6">
            <ArchetypeHeader
              name={typeof archetype === 'string' ? archetype : archetype.name}
              tagline={archetype.tagline || ''}
              imageUrl={reading.imageUrl}
            />
            {archetype.coreEssence && (
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], marginTop: 12, textAlign: 'center' }}>
                {archetype.coreEssence}
              </Text>
            )}
          </View>
        )}

        {/* === FREE TIER SECTIONS (always visible) === */}

        {/* Trait Analysis with Score Bars */}
        {traitAnalysis && traitAnalysis.length > 0 && (
          <View className="px-4 mb-4">
            <Text className="text-fg text-xl font-body-bold mb-4 px-2">Trait Analysis</Text>
            {traitAnalysis.map((item: any, index: number) => (
              <ScoreCard
                key={index}
                title={item.trait}
                score={item.score}
                description={item.description}
              />
            ))}
          </View>
        )}

        {/* Legacy V1 categories fallback */}
        {!traitAnalysis && categories && Object.keys(categories).length > 0 && (
          <View className="px-6 mb-6">
            <Text className="text-fg text-xl font-body-bold mb-4">Trait Analysis</Text>
            {Object.entries(categories).map(([key, category]: [string, any], index) => (
              <ScoreCard
                key={index}
                title={category.name || category.title || key}
                score={category.score}
                description={category.description}
                isLocked={!isPremium && index > 2}
              />
            ))}
          </View>
        )}

        {/* Strengths */}
        {strengths && strengths.length > 0 && (
          <View className="px-4 mb-4">
            <StrengthsList strengths={strengths} />
          </View>
        )}

        {/* Share Card */}
        {faceSubtitle && faceInsightLine && (
          <View className="px-6 mb-6">
            <ShareCard
              title="Face Reading"
              subtitle={faceSubtitle}
              insightLine={faceInsightLine}
            />
          </View>
        )}

        {/* === PREMIUM TIER SECTIONS (locked for free, unlocked for premium+) === */}

        {/* Face Shape Analysis */}
        {isPremium && faceShape ? (
          <SectionCard title="Face Shape Analysis">
            <View style={{ backgroundColor: t.alpha(t.color.accent, 10), borderRadius: t.radius.md, padding: 14, marginBottom: 12 }}>
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.accent, fontFamily: t.family['body-bold'], marginBottom: 4 }}>
                {faceShape.detected?.charAt(0).toUpperCase() + faceShape.detected?.slice(1)} Face
              </Text>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>{faceShape.meaning}</Text>
            </View>

            {faceShape.coreTraits && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {faceShape.coreTraits.map((trait: string, i: number) => (
                  <View key={i} style={{ backgroundColor: t.alpha(t.color.accent, 30), paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.lg }}>
                    <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['accent-2'], fontFamily: t.family['body-semi'] }}>{trait}</Text>
                  </View>
                ))}
              </View>
            )}

            <FeatureInsight label="Emotional Style" value={faceShape.emotionalStyle} />

            {faceShape.strengthsAndTalents && (
              <FeatureInsight label="Hidden Talents" value={faceShape.strengthsAndTalents.join(', ')} />
            )}

            {faceShape.careerSuitability && (
              <FeatureInsight label="Career Suitability" value={faceShape.careerSuitability.join(', ')} />
            )}

            {faceShape.whyThisFitsYou && (
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'], fontFamily: t.family.quote, marginTop: 8 }}>
                {faceShape.whyThisFitsYou}
              </Text>
            )}
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Face Shape Analysis" teaser="Discover what your face shape reveals about your personality" />
        ) : null}

        {/* Facial Feature Analysis */}
        {isPremium && facialFeatures ? (
          <SectionCard title="Facial Feature Analysis">
            {facialFeatures.eyes && (
              <CollapsibleFeature title="Eyes" icon="👁️">
                <FeatureInsight label="Observation" value={facialFeatures.eyes.observation} />
                <FeatureInsight label="Emotional Depth" value={facialFeatures.eyes.emotionalDepth} />
                <FeatureInsight label="Trust Level" value={facialFeatures.eyes.trustLevel} />
                <FeatureInsight label="Intuition" value={facialFeatures.eyes.intuitionStrength} />
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote, marginTop: 4 }}>{facialFeatures.eyes.insight}</Text>
              </CollapsibleFeature>
            )}

            {facialFeatures.nose && (
              <CollapsibleFeature title="Nose" icon="👃">
                <FeatureInsight label="Observation" value={facialFeatures.nose.observation} />
                <FeatureInsight label="Ambition" value={facialFeatures.nose.ambitionLevel} />
                <FeatureInsight label="Financial Instinct" value={facialFeatures.nose.financialInstinct} />
                <FeatureInsight label="Leadership" value={facialFeatures.nose.leadershipDrive} />
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote, marginTop: 4 }}>{facialFeatures.nose.insight}</Text>
              </CollapsibleFeature>
            )}

            {facialFeatures.lips && (
              <CollapsibleFeature title="Lips" icon="👄">
                <FeatureInsight label="Observation" value={facialFeatures.lips.observation} />
                <FeatureInsight label="Love Expression" value={facialFeatures.lips.loveExpressionStyle} />
                <FeatureInsight label="Communication" value={facialFeatures.lips.communicationPattern} />
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote, marginTop: 4 }}>{facialFeatures.lips.insight}</Text>
              </CollapsibleFeature>
            )}

            {facialFeatures.jawline && (
              <CollapsibleFeature title="Jawline" icon="💪">
                <FeatureInsight label="Observation" value={facialFeatures.jawline.observation} />
                <FeatureInsight label="Determination" value={facialFeatures.jawline.determination} />
                <FeatureInsight label="Decision Power" value={facialFeatures.jawline.decisionPower} />
                <FeatureInsight label="Authority" value={facialFeatures.jawline.authorityPresence} />
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote, marginTop: 4 }}>{facialFeatures.jawline.insight}</Text>
              </CollapsibleFeature>
            )}
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Facial Feature Analysis" teaser="Deep analysis of your eyes, nose, lips, and jawline" />
        ) : null}

        {/* Hidden Gift */}
        {isPremium && hiddenStrength ? (
          <SectionCard title={hiddenStrength.title || 'Hidden Strength'}>
            <View style={{ backgroundColor: t.alpha(t.color.accent, 10), borderRadius: t.radius.md, padding: 14 }}>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent, fontFamily: t.family['body-semi'], marginBottom: 8 }}>
                {hiddenStrength.power}
              </Text>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
                {hiddenStrength.explanation}
              </Text>
            </View>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Hidden Gift" teaser="Uncover the unique talent written in your features" />
        ) : null}

        {/* Trait to Be Mindful Of */}
        {isPremium && hiddenWeakness ? (
          <SectionCard title={hiddenWeakness.title || 'Growth Area'}>
            <View style={{ backgroundColor: t.alpha(t.color['accent-2'], 10), borderRadius: t.radius.md, padding: 14 }}>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family['body-semi'], marginBottom: 8 }}>
                {hiddenWeakness.pattern}
              </Text>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
                {hiddenWeakness.improvementTip}
              </Text>
            </View>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Trait to Be Mindful Of" teaser="Awareness of your shadow traits for personal growth" />
        ) : null}

        {/* Today's Face Insight */}
        {isPremium && dailyFaceInsight ? (
          <SectionCard title="Today's Face Insight">
            <FeatureInsight label="Today's Energy" value={dailyFaceInsight.todayEnergy} />
            <FeatureInsight label="Advice" value={dailyFaceInsight.todayAdvice} />
            <FeatureInsight label="Avoid" value={dailyFaceInsight.avoidToday} />
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Today's Face Insight" teaser="Daily guidance based on your facial energy" />
        ) : null}

        {/* === PREMIUM CONTENT SECTIONS (locked for free, unlocked for premium+) === */}

        {/* Deep Personality Matrix */}
        {isPremium && premiumContent?.deepPersonalityMatrix ? (
          <SectionCard title="Deep Personality Matrix">
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
              {premiumContent.deepPersonalityMatrix}
            </Text>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Deep Personality Matrix" teaser="Your deeper behavioral and emotional pattern analysis" />
        ) : null}

        {/* Relationship Blueprint */}
        {isPremium && premiumContent?.relationshipBlueprint ? (
          <SectionCard title="Relationship Blueprint">
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
              {premiumContent.relationshipBlueprint}
            </Text>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Relationship Blueprint" teaser="How your face reveals your relationship patterns" />
        ) : null}

        {/* Career Destiny Path */}
        {isPremium && premiumContent?.careerDestinyPath ? (
          <SectionCard title="Career Destiny Path">
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
              {premiumContent.careerDestinyPath}
            </Text>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Career Destiny Path" teaser="Professional destiny written in your features" />
        ) : null}

        {/* Future Focus */}
        {isPremium && premiumContent?.yearAheadForecast ? (
          <SectionCard title="Future Focus">
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
              {premiumContent.yearAheadForecast}
            </Text>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Future Focus" teaser="Guidance for what lies ahead based on your facial map" />
        ) : null}

        {/* Locked Banner — now a density-2 shell. Its subtitle named a TIER, `C-5`'s fourth
            literal and an R1 violation, so the tier name is retired and the count and sentence
            carry verbatim. "Upgrade Now" retires with the component. */}
        {!isPremium && (
          <LockShell
            density={2}
            title="Unlock Your Complete Face Reading"
            teaser="See all 9 sections"
          />
        )}

        {/* Legacy V1 Growth Opportunity */}
        {!premiumContent && growthOpportunity && (
          <View className="px-6 mb-6">
            <GrowthCard
              text={typeof growthOpportunity === 'string' ? growthOpportunity : (growthOpportunity as any).description}
              isLocked={!isPremium}
            />
          </View>
        )}

        {/* Legacy V1 Affirmation */}
        {!premiumContent && affirmation && (
          <View className="px-6 mb-6">
            <AffirmationCard text={affirmation} />
          </View>
        )}

        {/* Entertainment Disclaimer */}
        <EntertainmentDisclaimer />
      </ScrollView>

      {/* Notification Prompt */}
      {showPrompt && (
        <NotificationPrompt
          visible={showPrompt}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
});
