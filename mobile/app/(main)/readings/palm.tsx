import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { BackButton } from '@/components/ui/BackButton';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { useReadingsStore } from '@/store/readingsStore';
import { useAuthStore } from '@/store/authStore';
import { PalmTypeHeader } from '@/components/readings/PalmTypeHeader';
import { PalmLineCard } from '@/components/readings/PalmLineCard';
import { DestinyCard } from '@/components/readings/DestinyCard';
import { ShareableQuote } from '@/components/readings/ShareableQuote';
import { GeneratingReading } from '@/components/readings/GeneratingReading';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { EntertainmentDisclaimer } from '@/components/common/EntertainmentDisclaimer';
import { LockShell } from '@/components/ui/LockShell';
import { SectionCard } from '@/components/ui/SectionCard';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { recordMeaningfulAction } from '@/store/reviewStore';
import * as t from '@/theme';
import { useFill, dur } from '@/lib/motion';
import { Ionicons } from '@expo/vector-icons';


function FeatureInsight({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.accent, fontFamily: t.family['body-semi'], marginBottom: 2 }}>{label}</Text>
      <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>{value}</Text>
    </View>
  );
}

function CollapsibleLine({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
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

function ScoreBar({ score, label }: { score: number; label: string }) {
  /* 🔴 THE BAR ANIMATES `scaleX`, NOT `width`, AND THAT IS §18's CONTRACT RATHER THAN A REFACTOR.
     "opacity and transform ONLY. ZERO layout properties animated — animating layout causes reflow."
     A percentage width inside a worklet re-lays-out the row EVERY FRAME, and this is the SECOND COPY of
     `ScoreCard`'s bar — `UI-audit` §4.1 already flagged the duplication and it is left as a finding
     rather than merged, because collapsing two components is a primitives-phase edit, not a motion
     one (§0.0 rule 1: the smaller change). `motion-arrival-check.js` found three such bars on its FIRST
     run — here, in `palm.tsx`'s local copy, and on the 60-second wait screen — and no other
     instrument in the tree can see them, because a worklet's return value is neither a className nor
     a StyleSheet rule.
     ⚠️ THE ANCHOR IS `transformOrigin`, NOT A TRANSLATE SANDWICH. `scaleX` scales about the centre by
     default, which would grow the fill outward from the middle; `transformOrigin: 'left'` is
     available from RN 0.74 (verified in the installed `processTransformOrigin.js`). The track keeps
     its own clipping, so a zero fill is invisible exactly as before.
     ⚠️ AND THE FILL NOW SPANS THE FULL TRACK: a scaled element must start at 100% width or there is
     nothing to scale. */
  const { style: animatedStyle } = useFill(score / 100, dur.base);

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>{label}</Text>
        <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent, fontFamily: t.family['body-bold'] }}>{score}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: t.color['border-subtle'], borderRadius: t.radius.pill, overflow: 'hidden' }}>
        <Animated.View style={[animatedStyle, { height: '100%', width: '100%', backgroundColor: t.color.accent, borderRadius: t.radius.pill, transformOrigin: 'left' }]} />
      </View>
    </View>
  );
}

export default function PalmReadingScreen() {
  const { palmReadingDominant, isLoadingPalm, error, fetchPalmReading, clearError } = useReadingsStore();
  const { user } = useAuthStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const bottomPad = useBottomInsetPadding();

  const tier = user?.subscription?.tier || 'free';
  const isPremium = tier !== 'free'; // premium or premium_plus
  const isPremiumPlus = tier === 'premium_plus';

  useEffect(() => {
    loadReading();
  }, []);

  useEffect(() => {
    if (!palmReadingDominant) return;
    recordMeaningfulAction('reading:palm');
  }, [palmReadingDominant]);

  const loadReading = async () => {
    try {
      await fetchPalmReading('dominant');
    } catch (err) {
      console.error('Failed to load palm reading:', err);
    }
  };

  const handleShareQuote = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (isGenerating) {
    return <GeneratingReading type="palm" />;
  }

  if (isLoadingPalm) {
    return <LoadingSpinner text="Reading your palm lines..." fullScreen />;
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

  if (!palmReadingDominant) {
    return (
      <ScreenContainer withScrollView={false}>
        <EmptyState
          title="No Palm Reading Yet"
          description="Capture your palm to unlock your personalized reading and discover your destiny"
          actionTitle="Capture Palm"
          onAction={() => router.push('/(capture)/palm-capture')}
        />
      </ScreenContainer>
    );
  }

  const reading = palmReadingDominant as any;

  // V2 fields
  const palmEnergyType = reading.palmEnergyType;
  const palmType = reading.palmType;
  const majorLines = reading.majorLines;
  const wealthAndSuccess = reading.wealthAndSuccess;
  const loveAndMarriage = reading.loveAndMarriage;
  const hiddenPalmSecret = reading.hiddenPalmSecret;
  const karmaAndPastInfluence = reading.karmaAndPastInfluence;
  const decisionMakingStyle = reading.decisionMakingStyle;
  const destiny = reading.destiny;
  const naturalTalents = reading.naturalTalents;
  const dailyPalmInsight = reading.dailyPalmInsight;
  const premiumContent = reading.premiumContent;
  const shareableQuote = reading.shareableQuote;

  // Legacy V1 fields
  const legacyLines = reading.lines;
  const legacyMounts = reading.mounts;

  const palmTypeName = typeof palmType === 'string' ? palmType : palmType?.name || 'Your Palm';
  const palmTypeDesc = typeof palmType === 'string' ? '' : palmType?.description || reading.description || '';

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        {/* 1. Header */}
        <View className="px-6 pt-4 pb-6">
          {/* One of the two screens the review named. Three ways in, no way out but the tab bar. */}
          <BackButton className="mb-3" />
          <Text className="text-fg text-display-lg font-display">Palm Reading</Text>
          <Text className="text-fg-muted text-sm mt-1">Your destiny in your hands</Text>
        </View>

        {/* 2. Palm Energy Type Header (FREE) */}
        {palmEnergyType ? (
          <View className="px-4 mb-4">
            <View style={{ backgroundColor: t.alpha(t.color.accent, 10), borderRadius: t.radius.md, padding: 20 }}>
              <Text style={{ ...t.txt('text-xl').style, color: t.color.accent, marginBottom: 4 }}>
                {palmEnergyType.type}
              </Text>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], marginBottom: 8 }}>
                {palmEnergyType.description}
              </Text>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg, fontFamily: t.family['body-semi'], marginBottom: 4 }}>
                {palmEnergyType.coreNature}
              </Text>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote }}>
                {palmEnergyType.lifeDirectionTheme}
              </Text>
            </View>
          </View>
        ) : (
          palmType && (
            <View className="px-6 mb-6">
              <PalmTypeHeader
                name={palmTypeName}
                description={palmTypeDesc}
                imageUrl={reading.imageUrl}
              />
            </View>
          )
        )}

        {/* 3. Palm Type Badge (FREE) */}
        {palmType && palmEnergyType && (
          <View className="px-4 mb-4">
            <View style={{ backgroundColor: t.alpha(t.color.accent, 20), borderRadius: t.radius.md, padding: 14 }}>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family['body-bold'], marginBottom: 4 }}>{palmTypeName}</Text>
              <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'] }}>{palmTypeDesc}</Text>
            </View>
          </View>
        )}

        {/* 4. Destiny & Talents (FREE) */}
        {destiny && (
          <View className="px-4 mb-4">
            <DestinyCard
              lifeTheme={typeof destiny === 'string' ? destiny : destiny.lifeTheme || destiny.description || ''}
              naturalTalents={naturalTalents || destiny.naturalTalents || []}
              challenges={destiny.challenges}
              advice={destiny.advice}
              isFullVersion={isPremium}
            />
          </View>
        )}

        {/* Decision Making Style (FREE) */}
        {decisionMakingStyle && (
          <View className="px-4 mb-4">
            <View style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, padding: 16, alignItems: 'center' }}>
              <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Decision Making Style</Text>
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.accent, fontFamily: t.family['body-bold'] }}>{decisionMakingStyle}</Text>
            </View>
          </View>
        )}

        {/* 5. Daily Palm Insight (FREE) */}
        {dailyPalmInsight && (
          <SectionCard title="Today's Palm Insight">
            <FeatureInsight label="Today's Energy" value={dailyPalmInsight.todayEnergy} />
            <FeatureInsight label="Focus" value={dailyPalmInsight.todayFocus} />
            <FeatureInsight label="Avoid" value={dailyPalmInsight.avoidToday} />
          </SectionCard>
        )}

        {/* ===== PREMIUM TIER SECTIONS ===== */}

        {/* 6. Major Lines Analysis (PREMIUM) */}
        {isPremium && majorLines ? (
          <SectionCard title="Major Lines Analysis">
            {majorLines.heartLine && (
              <CollapsibleLine title="Heart Line" icon="❤️">
                <FeatureInsight label="Observation" value={majorLines.heartLine.observation} />
                <FeatureInsight label="Love Pattern" value={majorLines.heartLine.lovePattern} />
                <FeatureInsight label="Emotional Depth" value={majorLines.heartLine.emotionalDepth} />
                <FeatureInsight label="Relationship Stability" value={majorLines.heartLine.relationshipStability} />
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote, marginTop: 4 }}>{majorLines.heartLine.insight}</Text>
              </CollapsibleLine>
            )}

            {majorLines.headLine && (
              <CollapsibleLine title="Head Line" icon="🧠">
                <FeatureInsight label="Observation" value={majorLines.headLine.observation} />
                <FeatureInsight label="Decision Style" value={majorLines.headLine.decisionStyle} />
                <FeatureInsight label="Thinking Pattern" value={majorLines.headLine.thinkingPattern} />
                <FeatureInsight label="Risk Taking" value={majorLines.headLine.riskTakingLevel} />
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote, marginTop: 4 }}>{majorLines.headLine.insight}</Text>
              </CollapsibleLine>
            )}

            {majorLines.lifeLine && (
              <CollapsibleLine title="Life Line" icon="🌿">
                <FeatureInsight label="Observation" value={majorLines.lifeLine.observation} />
                <FeatureInsight label="Vitality" value={majorLines.lifeLine.vitality} />
                <FeatureInsight label="Life Stability" value={majorLines.lifeLine.lifeStability} />
                <FeatureInsight label="Turning Periods" value={majorLines.lifeLine.majorTurningPeriods} />
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.success, fontFamily: t.family.quote, marginTop: 4 }}>{majorLines.lifeLine.insight}</Text>
              </CollapsibleLine>
            )}

            {majorLines.fateLine && (
              <CollapsibleLine title="Fate Line" icon="⭐">
                <FeatureInsight label="Observation" value={majorLines.fateLine.observation} />
                <FeatureInsight label="Career Path" value={majorLines.fateLine.careerPath} />
                <FeatureInsight label="Financial Growth" value={majorLines.fateLine.financialGrowth} />
                <FeatureInsight label="Success Style" value={majorLines.fateLine.successStyle} />
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent, fontFamily: t.family.quote, marginTop: 4 }}>{majorLines.fateLine.insight}</Text>
              </CollapsibleLine>
            )}
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Major Lines Analysis" teaser="Complete Heart, Head, Life & Fate line readings" />
        ) : null}

        {/* Legacy V1 lines fallback (PREMIUM) */}
        {isPremium && !majorLines && legacyLines && typeof legacyLines === 'object' && Object.keys(legacyLines).length > 0 && (
          <View className="px-6 mb-6">
            <Text className="text-fg text-xl font-body-bold mb-4">Palm Lines</Text>
            {Object.entries(legacyLines).map(([key, line]: [string, any], index) => (
              <PalmLineCard
                key={index}
                lineName={line?.name || key}
                strength={line?.quality || line?.strength || 'moderate'}
                interpretation={line?.interpretation || ''}
                isLocked={!isPremium && index > 2}
              />
            ))}
          </View>
        )}

        {/* 7. Wealth & Success (PREMIUM) */}
        {isPremium && wealthAndSuccess ? (
          <SectionCard title="Wealth & Success">
            <ScoreBar score={wealthAndSuccess.financialGrowthScore} label="Financial Growth Potential" />
            <FeatureInsight label="Strongest Growth Phase" value={wealthAndSuccess.strongestGrowthPhase} />
            <FeatureInsight label="Best Success Style" value={wealthAndSuccess.bestSuccessStyle} />
            <FeatureInsight label="Money Mindset" value={wealthAndSuccess.moneyMindset} />
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Wealth & Success Lines" teaser="What your palm reveals about financial destiny" />
        ) : null}

        {/* 8. Love & Marriage (PREMIUM) */}
        {isPremium && loveAndMarriage ? (
          <SectionCard title="Love & Marriage">
            <FeatureInsight label="Commitment Phase" value={loveAndMarriage.emotionalCommitmentPhase} />
            <FeatureInsight label="Love Lesson" value={loveAndMarriage.loveLesson} />
            <FeatureInsight label="Relationship Risk" value={loveAndMarriage.relationshipRisk} />
            <FeatureInsight label="Marriage Indication" value={loveAndMarriage.marriageIndication} />
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Love & Marriage Lines" teaser="Your romantic destiny mapped in your palm" />
        ) : null}

        {/* 9. Hidden Palm Secret (PREMIUM) */}
        {isPremium && hiddenPalmSecret ? (
          <SectionCard title="Hidden Palm Secret">
            <View style={{ backgroundColor: t.alpha(t.color.accent, 10), borderRadius: t.radius.md, padding: 14, marginBottom: 8 }}>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent, fontFamily: t.family['body-semi'] }}>
                {hiddenPalmSecret.hiddenPower}
              </Text>
            </View>
            <View style={{ backgroundColor: t.alpha(t.color['accent-2'], 10), borderRadius: t.radius.md, padding: 14 }}>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family['body-semi'], marginBottom: 4 }}>Pattern to Break</Text>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>{hiddenPalmSecret.patternToBreak}</Text>
            </View>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Hidden Palm Secret" teaser="A unique marking most palmists overlook" />
        ) : null}

        {/* ===== PREMIUM CONTENT SECTIONS (locked for free, unlocked for premium+) ===== */}

        {/* 10. Karma & Past Influence */}
        {isPremium && karmaAndPastInfluence ? (
          <SectionCard title="Karma & Past Influence">
            <View style={{ backgroundColor: t.alpha(t.color.accent, 15), borderRadius: t.radius.sm, padding: 10, marginBottom: 8 }}>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family['body-semi'] }}>{karmaAndPastInfluence.karmaType} Karma</Text>
            </View>
            <FeatureInsight label="Insight" value={karmaAndPastInfluence.insight} />
            <FeatureInsight label="Ancestral Blessing" value={karmaAndPastInfluence.ancestralBlessing} />
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Karma & Past Influence" teaser="What your palm says about past life patterns" />
        ) : null}

        {/* 11. Sun Line Analysis */}
        {isPremium && premiumContent?.sunLine ? (
          <SectionCard title="Sun Line Analysis">
            <FeatureInsight label="Recognition" value={premiumContent.sunLine.recognition} />
            <FeatureInsight label="Public Success" value={premiumContent.sunLine.publicSuccess} />
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['accent-2'], fontFamily: t.family.quote }}>{premiumContent.sunLine.insight}</Text>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Sun Line Analysis" teaser="Your fame, creativity, and public recognition line" />
        ) : null}

        {/* 12. Minor Lines */}
        {isPremium && premiumContent?.minorLines ? (
          <SectionCard title="Minor Lines">
            <FeatureInsight label="Marriage Lines" value={premiumContent.minorLines.marriageLines} />
            <FeatureInsight label="Children Lines" value={premiumContent.minorLines.childrenLines} />
            <FeatureInsight label="Travel Lines" value={premiumContent.minorLines.travelLines} />
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Minor Lines" teaser="Marriage, Children, and Travel lines decoded" />
        ) : null}

        {/* 13. Life Timeline */}
        {isPremium && premiumContent?.detailedLifeTimeline ? (
          <SectionCard title="Life Timeline">
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
              {premiumContent.detailedLifeTimeline}
            </Text>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Life Timeline" teaser="Key life events mapped across your palm" />
        ) : null}

        {/* 14. Spiritual Path */}
        {isPremium && premiumContent?.spiritualPath ? (
          <SectionCard title="Spiritual Path">
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>
              {premiumContent.spiritualPath}
            </Text>
          </SectionCard>
        ) : !isPremium ? (
          <LockShell density={2} title="Spiritual Path" teaser="Your soul's journey revealed through palm markings" />
        ) : null}

        {/* 15. Locked Banner — now a density-2 shell. Its subtitle named a TIER, `C-5`'s fourth
            literal and an R1 violation, so the tier name is retired and the count and sentence
            carry verbatim. "Upgrade Now" retires with the component. */}
        {!isPremium && (
          <LockShell
            density={2}
            title="Unlock Your Complete Palm Reading"
            teaser="See all 9 sections"
          />
        )}

        {/* 16. Shareable Quote */}
        {shareableQuote && (
          <View className="px-6 mb-6">
            <ShareableQuote
              quote={shareableQuote}
              archetype={palmEnergyType?.type || palmTypeName}
              onShare={handleShareQuote}
            />
          </View>
        )}

        {/* 17. Entertainment Disclaimer */}
        <EntertainmentDisclaimer />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
});
