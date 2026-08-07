import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { useAuthStore } from '@/store/authStore';
import { useInsightsStore } from '@/store/insightsStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { FocusAreaBadge } from '@/components/insights/FocusAreaBadge';
import { ContinuityCard } from '@/components/insights/ContinuityCard';
import { AffirmationCard } from '@/components/readings/AffirmationCard';
import { ShareableQuote } from '@/components/readings/ShareableQuote';
import { EntertainmentDisclaimer } from '@/components/common/EntertainmentDisclaimer';
import { recordMeaningfulAction } from '@/store/reviewStore';
/* Grepped for a local definition of this name in each file first (O-71/O-79 — the fifth name
   collision in this programme was a LOCAL of exactly this name). None of the four has one. */
import { Plate } from '@/components/ui/Plate';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

/** Reusable section component for Career/Love/Friendship */
function InsightSection({ emoji, title, summary, details, extra, extraLabel }: {
  emoji: string;
  title: string;
  summary: string;
  details?: string[];
  extra?: string;
  extraLabel?: string;
}) {
  return (
    <View className="bg-surface rounded-lg p-5 mb-3 border border-border-subtle">
      <View className="flex-row items-center mb-3">
        <Text className="text-xl mr-2">{emoji}</Text>
        <Text className="text-fg text-lg font-body-bold">{title}</Text>
      </View>
      <Text className="text-accent text-sm font-body-semi mb-2">{summary}</Text>
      {details?.map((detail, i) => (
        <Text key={i} className="text-fg-secondary text-sm mb-1.5">
          • {detail}
        </Text>
      ))}
      {extra && (
        <View className="mt-2 pt-2 border-t border-border-subtle">
          <Text className="text-sm">
            <Text style={{ color: extraLabel === 'Avoid' ? t.color.danger : t.color.accent }} className="font-body-semi">
              {extraLabel === 'Avoid' ? '⚠️ Avoid: ' : '💡 Tip: '}
            </Text>
            <Text className="text-fg-muted">{extra}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

export default function DailyInsightScreen() {
  const router = useRouter();
  const bottomPad = useBottomInsetPadding();
  const { user } = useAuthStore();
  const { dailyInsight, isLoadingDaily, error, fetchDailyInsight, clearError } = useInsightsStore();
  /* 🔴 A CAPTURE REF USED TO LIVE HERE AND NOTHING EVER READ IT. ShareableQuote owns its own ref
     and calls the share util itself (see its header), so this one was bound to two Views and
     consumed by nobody — AND neither of those Views carried the anti-flattening prop, which is
     the one thing a view-shot target cannot do without on Android. A dead ref that would snapshot null
     the moment someone wired it up is worse than no ref: it reads as a working seam. */

  useEffect(() => {
    fetchDailyInsight();
  }, []);

  // Record a meaningful action once the daily insight is displayed.
  // Deduped per local calendar day by reviewStore (daily:<YYYY-MM-DD>).
  useEffect(() => {
    if (!dailyInsight || isLoadingDaily) return;
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    recordMeaningfulAction('daily:' + ymd);
  }, [dailyInsight, isLoadingDaily]);

  if (isLoadingDaily) {
    return (
      <ScreenContainer withScrollView={false}>
        <LoadingSpinner text="Consulting the cosmos for you..." fullScreen />
      </ScreenContainer>
    );
  }

  if (!dailyInsight) {
    return (
      <ScreenContainer withScrollView={false}>
        <View className="flex-1 items-center justify-center p-6">
          <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6">
            <Text className="text-accent text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-fg text-xl font-body-bold mb-3">
            Daily Insight Unavailable
          </Text>
          <Text className="text-fg-muted text-center mb-6">
            {error || 'Complete your face and palm readings first to unlock daily insights.'}
          </Text>
          <Button
            title="Retry"
            onPress={() => { clearError(); fetchDailyInsight(); }}
            variant="primary"
          />
        </View>
      </ScreenContainer>
    );
  }

  // Detect new vs legacy format
  const isNewFormat = 'overallEnergy' in dailyInsight;
  const score = dailyInsight.overallEnergy?.score || 7;
  const headline = dailyInsight.overallEnergy?.headline || (dailyInsight as any).headline || '';

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Header */}
        <View className="p-6 pb-4">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-accent text-lg">← Back</Text>
            </TouchableOpacity>
            <Text className="text-fg-muted text-sm">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          {/* 🔴 §14.3.1's OWN HEADING NAMES THIS SURFACE — "the daily astrology header" — the second
              of that plate's two named homes, the first being Home's insight hero. Assigned, not
              chosen (R-1 / §14.3's headings are the mount map).
              🔴 ONE PLATE IN THIS VIEWPORT (§14.5), and this screen is the one where that needed
              CHECKING rather than asserting: it renders both a quote card and an affirmation card
              further down, and §15.2's carry matrix lists BOTH as plate carriers. Neither has one —
              the share family takes no SVG at all until W1 clears, and the affirmation card was left
              bare deliberately — so this header's plate is the only one on the route. 🔴 A future
              mount in either of those components puts two plates on this screen. */}
          <View className="flex-row items-start justify-between">
            <Text className="text-fg text-2xl font-body-bold flex-1">
              Your Daily Cosmic Blueprint
            </Text>
            <Plate name="lunar" width={92} />
          </View>
        </View>

        {/* Build 27 R6 Option C — "what's shifted since your last reading" card.
            Self-hides when there's no meaningful shift. The unlock CTA is shown
            only to non-Premium-Plus viewers (a gentle upsell on an engaging
            surface); Premium Plus sees the card with no CTA. */}
        <View className="px-6 mb-4">
          <ContinuityCard
            continuity={dailyInsight.continuity}
            hook={dailyInsight.continuityHook}
            onUnlock={
              user?.subscription?.tier === 'premium_plus'
                ? undefined
                : () => openPaywall('daily-continuity')
            }
          />
        </View>

        {isNewFormat ? (
          <>
            {/* Energy Score Card */}
            <View className="px-6 mb-4">
              <View className="bg-surface rounded-lg p-6 border border-border-subtle">
                <View className="flex-row items-center mb-2">
                  <Text className="text-xl mr-2">🌟</Text>
                  <Text className="text-fg text-base font-body-bold">TODAY'S ENERGY</Text>
                  <View className="ml-auto">
                    <Text className="text-accent text-2xl font-body-bold">{score}/10</Text>
                  </View>
                </View>
                <Text className="text-accent text-lg font-quote mb-3">
                  "{headline}"
                </Text>
                {/* Energy Bar */}
                <View className="h-3 rounded-pill overflow-hidden" style={{ backgroundColor: t.color['border-subtle'] }}>
                  <View
                    className="h-3 rounded-pill"
                    style={{
                      width: `${score * 10}%`,
                      backgroundColor: score >= 7 ? t.color.accent : score >= 4 ? t.alpha(t.color.accent, 50) : t.color['border-subtle'],
                    }}
                  />
                </View>
                {dailyInsight.focusArea && (
                  <View className="mt-3">
                    <FocusAreaBadge area={dailyInsight.focusArea} size="small" />
                  </View>
                )}
              </View>
            </View>

            {/* Career Section */}
            {dailyInsight.career && (
              <View className="px-6">
                <InsightSection
                  emoji="💼"
                  title="CAREER & AMBITION"
                  summary={dailyInsight.career.summary}
                  details={dailyInsight.career.details}
                  extra={dailyInsight.career.avoid}
                  extraLabel="Avoid"
                />
              </View>
            )}

            {/* Love Section */}
            {dailyInsight.love && (
              <View className="px-6">
                <InsightSection
                  emoji="💕"
                  title="LOVE & RELATIONSHIPS"
                  summary={dailyInsight.love.summary}
                  details={dailyInsight.love.details}
                  extra={dailyInsight.love.tip}
                  extraLabel="Tip"
                />
              </View>
            )}

            {/* Friendship Section */}
            {dailyInsight.friendship && (
              <View className="px-6">
                <InsightSection
                  emoji="👥"
                  title="FRIENDSHIP & SOCIAL"
                  summary={dailyInsight.friendship.summary}
                  details={dailyInsight.friendship.details}
                />
              </View>
            )}

            {/* Lucky Elements Grid */}
            {dailyInsight.lucky && (
              <View className="px-6 mb-3">
                <View className="bg-surface rounded-lg p-5 border border-border-subtle">
                  <View className="flex-row items-center mb-4">
                    <Text className="text-xl mr-2">🍀</Text>
                    <Text className="text-fg text-lg font-body-bold">YOUR LUCKY ELEMENTS</Text>
                  </View>
                  <View className="flex-row" style={{ gap: 10 }}>
                    <View className="flex-1 items-center rounded-md p-3" style={{ backgroundColor: t.color['border-subtle'] }}>
                      <Text className="text-fg-muted text-xs mb-1">Number</Text>
                      <Text className="text-accent text-2xl font-body-bold">{dailyInsight.lucky.number}</Text>
                    </View>
                    <View className="flex-1 items-center rounded-md p-3" style={{ backgroundColor: t.color['border-subtle'] }}>
                      <Text className="text-fg-muted text-xs mb-1">Color</Text>
                      <Text className="text-accent text-sm font-body-bold text-center">{dailyInsight.lucky.color}</Text>
                    </View>
                    <View className="flex-1 items-center rounded-md p-3" style={{ backgroundColor: t.color['border-subtle'] }}>
                      <Text className="text-fg-muted text-xs mb-1">Best Time</Text>
                      <Text className="text-accent text-sm font-body-bold text-center">{dailyInsight.lucky.timeWindow}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Crystals */}
            {dailyInsight.crystals && dailyInsight.crystals.length > 0 && (
              <View className="px-6 mb-3">
                <View className="bg-surface rounded-lg p-5 border border-border-subtle">
                  <View className="flex-row items-center mb-4">
                    <Text className="text-xl mr-2">💎</Text>
                    <Text className="text-fg text-lg font-body-bold">RECOMMENDED CRYSTALS</Text>
                  </View>
                  {dailyInsight.crystals.map((crystal, i) => (
                    <View key={i} className="flex-row items-start mb-2">
                      <Text className="text-accent text-sm font-body-bold mr-2">•</Text>
                      <View className="flex-1">
                        <Text className="text-fg text-sm font-body-semi">{crystal.name}</Text>
                        <Text className="text-fg-muted text-xs">{crystal.reason}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Affirmation */}
            {dailyInsight.affirmation && (
              <View className="px-6 mb-3">
                <View className="flex-row items-center mb-2 px-1">
                  <Text className="text-xl mr-2">✨</Text>
                  <Text className="text-fg text-lg font-body-bold">TODAY'S AFFIRMATION</Text>
                </View>
                <AffirmationCard text={dailyInsight.affirmation} />
              </View>
            )}

            {/* Action Summary */}
            {dailyInsight.action && (
              <View className="px-6 mb-3">
                <View className="flex-row items-center mb-3 px-1">
                  <Text className="text-xl mr-2">📋</Text>
                  <Text className="text-fg text-lg font-body-bold">ACTION SUMMARY</Text>
                </View>
                <View className="rounded-lg p-4 mb-2 border" style={{ backgroundColor: t.alpha(t.color.success, 10), borderColor: t.alpha(t.color.success, 30) }}>
                  <Text className="font-body-bold text-sm mb-1" style={{ color: t.color.success }}>✅ BEST ACTION TODAY:</Text>
                  <Text className="text-fg text-sm">{dailyInsight.action.doToday}</Text>
                </View>
                <View className="rounded-lg p-4 mb-2 border" style={{ backgroundColor: t.alpha(t.color.danger, 10), borderColor: t.alpha(t.color.danger, 30) }}>
                  <Text className="font-body-bold text-sm mb-1" style={{ color: t.color.danger }}>⛔ ONE THING TO AVOID:</Text>
                  <Text className="text-fg text-sm">{dailyInsight.action.avoidToday}</Text>
                </View>
              </View>
            )}

            {/* Shareable Quote */}
            <View className="px-6 mb-6">
              <ShareableQuote
                quote={dailyInsight.shareableQuote}
                onShare={() => {
                  // ShareableQuote performs the share via its own ref and only
                  // calls onShare on a genuine share — just record it here.
                  recordMeaningfulAction('share:daily');
                }}
              />
            </View>
          </>
        ) : (
          /* Legacy format fallback */
          <>
            <View className="px-6 mb-4">
              <View className="bg-surface rounded-lg p-6">
                <Text className="text-accent text-2xl font-body-bold mb-3">
                  {(dailyInsight as any).headline}
                </Text>
                {(dailyInsight as any).focusArea && <FocusAreaBadge area={(dailyInsight as any).focusArea} />}
              </View>
            </View>

            {(dailyInsight as any).insight && (
              <View className="px-6 mb-4">
                <Text className="text-fg text-base">
                  {(dailyInsight as any).insight}
                </Text>
              </View>
            )}

            {(dailyInsight as any).luckyElement && (
              <View className="px-6 mb-4">
                <View className="bg-surface rounded-lg p-6 items-center border border-border-subtle">
                  <Text className="text-fg-muted text-sm mb-2">
                    {(dailyInsight as any).luckyElement.type === 'number' ? '🔢 Lucky Number' :
                     (dailyInsight as any).luckyElement.type === 'color' ? '🎨 Lucky Color' : '⏰ Best Time'}
                  </Text>
                  <Text className="text-accent text-display-lg font-display">{(dailyInsight as any).luckyElement.value}</Text>
                </View>
              </View>
            )}

            {(dailyInsight as any).affirmation && (
              <View className="px-6 mb-4">
                <AffirmationCard text={(dailyInsight as any).affirmation} />
              </View>
            )}

            <View className="px-6 mb-6">
              <ShareableQuote
                quote={(dailyInsight as any).shareableQuote}
                onShare={() => {
                  // ShareableQuote performs the share via its own ref and only
                  // calls onShare on a genuine share — just record it here.
                  recordMeaningfulAction('share:daily');
                }}
              />
            </View>
          </>
        )}

        {/* Entertainment Disclaimer */}
        <EntertainmentDisclaimer />
      </ScrollView>
    </ScreenContainer>
  );
}
