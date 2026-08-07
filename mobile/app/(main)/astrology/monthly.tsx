import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useInsightsStore } from '@/store/insightsStore';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { GeneratingReading } from '@/components/readings/GeneratingReading';
import { MonthlyKeyDateCard } from '@/components/insights/MonthlyKeyDateCard';
import { LifeAreaCard } from '@/components/insights/LifeAreaCard';
import { AffirmationCard } from '@/components/readings/AffirmationCard';
import { ShareableQuote } from '@/components/readings/ShareableQuote';
import { EntertainmentDisclaimer } from '@/components/common/EntertainmentDisclaimer';
import { LockShell } from '@/components/ui/LockShell';
import { recordMeaningfulAction } from '@/store/reviewStore';
import { openPaywall } from '@/lib/paywall';
/* Grepped for a local definition of this name in each file first (O-71/O-79 — the fifth name
   collision in this programme was a LOCAL of exactly this name). None of the four has one. */
import { Plate } from '@/components/ui/Plate';

// Error boundary wrapper
function MonthlyReadingErrorFallback({ error, onRetry }: { error: string; onRetry: () => void }) {
  const router = useRouter();
  return (
    <ScreenContainer withScrollView={false}>
      <View className="flex-1 items-center justify-center p-6">
        <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6">
          <Text className="text-accent text-lg">← Back</Text>
        </TouchableOpacity>
        <Text className="text-fg text-xl font-body-bold mb-3">
          Something Went Wrong
        </Text>
        <Text className="text-fg-muted text-center mb-6">
          {error}
        </Text>
        <Button title="Retry" onPress={onRetry} variant="primary" />
      </View>
    </ScreenContainer>
  );
}

export default function MonthlyReadingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const tier = user?.subscription?.tier || 'free';
  const { monthlyReading, isLoadingMonthly, error, fetchMonthlyReading, clearError } = useInsightsStore();
  const [renderError, setRenderError] = useState<string | null>(null);
  const bottomPad = useBottomInsetPadding();

  useEffect(() => {
    fetchMonthlyReading();
  }, []);

  // Record a meaningful action once the monthly reading is displayed.
  // Deduped per local calendar month by reviewStore (monthly:<YYYY-MM>).
  useEffect(() => {
    if (!monthlyReading || isLoadingMonthly || renderError) return;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    recordMeaningfulAction('monthly:' + ym);
  }, [monthlyReading, isLoadingMonthly, renderError]);

  // Catch render errors from data shape mismatches
  if (renderError) {
    return (
      <MonthlyReadingErrorFallback
        error="We had trouble displaying your reading. Please try refreshing."
        onRetry={() => { setRenderError(null); clearError(); fetchMonthlyReading(); }}
      />
    );
  }

  if (isLoadingMonthly) {
    return <GeneratingReading type="monthly" />;
  }

  if (!monthlyReading) {
    return (
      <ScreenContainer withScrollView={false}>
        <View className="flex-1 items-center justify-center p-6">
          <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6">
            <Text className="text-accent text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-fg text-xl font-body-bold mb-3">
            Monthly Reading Unavailable
          </Text>
          <Text className="text-fg-muted text-center mb-6">
            {error || 'Complete your face and palm readings first to unlock monthly insights.'}
          </Text>
          <Button
            title="Retry"
            onPress={() => { clearError(); fetchMonthlyReading(); }}
            variant="primary"
          />
        </View>
      </ScreenContainer>
    );
  }
  
  const isPremium = tier !== 'free';
  const isPremiumPlus = tier === 'premium_plus';

  console.log('Monthly reading data:', JSON.stringify(monthlyReading?.areas ? Object.keys(monthlyReading.areas) : 'no areas'));

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Header */}
        <View className="p-6">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-accent text-lg">← Back</Text>
          </TouchableOpacity>
          {/* 🔴 §14.3.4's OWN HEADING NAMES THIS SURFACE — "monthly reading" — and it is that plate's
              ONLY currently-legal home: its other named home is the share cards, which §14.6 rules
              take NO SVG at all until W1 clears (the owner ruled the flat fallback, so that is a
              post-release upgrade, not a launch state). Assigned by §14.3's heading, not chosen.
              🔴 THIS PLATE IS ALSO THE ONE SPECIMEN WITH TWO KNOWN DISCREPANCIES, and neither is
              resolved here because §14.3.7 says not to: its stated ratio disagrees with its own
              viewBox by 26% (the VIEWBOX IS NORMATIVE, the ratio label descriptive — so the slot
              simply reserves what the viewBox implies, which is what the width prop below does), and
              its second and third strokes sit below the §14.2 stroke floor. Both are designer
              judgements on a decorative element that is hidden from the a11y tree; flagged at the
              mount so the next reader does not "fix" the specimen.
              🔴 ONE PLATE IN THIS VIEWPORT (§14.5) — checked: this screen renders a quote card, which
              §15.2 lists as a plate carrier and which carries none (W1). The plate's aspect is the
              widest of the five, so it takes the header's full width below the copy rather than
              sitting beside it. */}
          <Text className="text-fg-muted text-sm">{monthlyReading?.month}</Text>
          <Text className="text-fg text-display-lg font-display mt-2">{monthlyReading?.theme}</Text>
          <View className="mt-4">
            <Plate name="tide" width={160} />
          </View>
        </View>
        
        {/* Overview */}
        <View className="px-6 mb-6">
          <Text className="text-fg text-base">
            {monthlyReading?.overview}
          </Text>
        </View>

        {/* Key Dates (sorted chronologically) */}
        <View className="px-6 mb-6">
          <Text className="text-fg text-xl font-body-semi mb-4">
            Key Dates
          </Text>
          {[...(Array.isArray(monthlyReading?.keyDates) ? monthlyReading.keyDates : [])]
            .sort((a: any, b: any) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              return dateA.getTime() - dateB.getTime();
            })
            .map((keyDate: any, index: number) => (
            <MonthlyKeyDateCard
              key={index}
              date={keyDate.date}
              significance={keyDate.significance}
              advice={keyDate.advice}
            />
          ))}
        </View>

        {/* Locked Premium Sections (for free users) */}
        {!isPremium && (
          <>
            <LockShell density={2} title="Your Personal Month" teaser="How this month's numerology energy affects you specifically" />
            <LockShell density={2} title="Astrological Forecast" teaser="Planetary movements and their impact on your month" />
          </>
        )}

        {/* Numerology (Premium) */}
        {isPremium && monthlyReading?.numerology && (
          <View className="px-6 mb-6">
            <Text className="text-fg text-xl font-body-semi mb-4">
              Your Personal Month
            </Text>
            <View className="bg-surface rounded-lg p-6">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-pill bg-accent items-center justify-center mr-3">
                  <Text className="text-on-accent text-xl font-body-bold">
                    {monthlyReading.numerology?.personalMonth}
                  </Text>
                </View>
                <Text className="text-accent text-lg font-body-semi flex-1">
                  {monthlyReading.numerology?.meaning}
                </Text>
              </View>
              <Text className="text-fg text-sm">
                {monthlyReading.numerology?.guidance}
              </Text>
            </View>
          </View>
        )}

        {/* Astrology (Premium) */}
        {isPremium && monthlyReading?.astrology && (
          <View className="px-6 mb-6">
            <Text className="text-fg text-xl font-body-semi mb-4">
              Astrological Forecast
            </Text>
            <View className="bg-surface rounded-lg p-6">
              <Text className="text-fg text-sm mb-4">
                {monthlyReading.astrology?.sunSignForecast}
              </Text>
              {monthlyReading.astrology?.keyTransits && monthlyReading.astrology.keyTransits.length > 0 && (
                <View className="mt-4">
                  <Text className="text-accent text-sm font-body-semi mb-2">Key Transits</Text>
                  {(Array.isArray(monthlyReading.astrology.keyTransits) ? monthlyReading.astrology.keyTransits : []).map((transit: any, i: number) => (
                    <Text key={i} className="text-fg-muted text-xs mb-1">• {transit}</Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Locked Life Areas: Love & Career (for free users) */}
        {!isPremium && (
          <>
            <LockShell density={2} title="Life Areas: Love" teaser="Your romantic energy forecast for this month" />
            <LockShell density={2} title="Life Areas: Career" teaser="Professional opportunities and challenges ahead" />
          </>
        )}

        {/* Life Areas: Love & Career (Premium) */}
        {isPremium && monthlyReading?.areas && (
          <View className="px-6 mb-6">
            <Text className="text-fg text-xl font-body-semi mb-4">
              Life Areas
            </Text>
            {monthlyReading.areas?.love ? (
              <LifeAreaCard area="love" {...monthlyReading.areas.love} />
            ) : (
              <View className="bg-surface rounded-lg p-5 mb-3">
                <Text className="text-fg-muted text-sm text-center">This section will be available in your next reading refresh.</Text>
              </View>
            )}
            {monthlyReading.areas?.career ? (
              <LifeAreaCard area="career" {...monthlyReading.areas.career} />
            ) : (
              <View className="bg-surface rounded-lg p-5 mb-3">
                <Text className="text-fg-muted text-sm text-center">This section will be available in your next reading refresh.</Text>
              </View>
            )}
          </View>
        )}

        {/* Locked Cosmic Advice Section (for non-premium_plus users) */}
        {!isPremiumPlus && (
          <LockShell density={2} title="Cosmic Advice" teaser="Personalized monthly guidance from the stars" />
        )}

        {/* Life Areas: Money & Health (Premium Plus) */}
        {isPremiumPlus && monthlyReading?.areas?.money ? (
          <View className="px-6 mb-6">
            <LifeAreaCard area="money" {...monthlyReading.areas.money} />
          </View>
        ) : isPremiumPlus ? (
          <View className="px-6 mb-3">
            <View className="bg-surface rounded-lg p-5">
              <Text className="text-accent text-base font-body-semi mb-2">Life Areas: Money</Text>
              <Text className="text-fg-muted text-sm text-center">This section will be available in your next reading refresh.</Text>
            </View>
          </View>
        ) : (
          <LockShell density={2} title="Life Areas: Money" teaser="Financial energy and abundance patterns" />
        )}

        {isPremiumPlus && monthlyReading?.areas?.health ? (
          <View className="px-6 mb-6">
            <LifeAreaCard area="health" {...monthlyReading.areas.health} />
          </View>
        ) : isPremiumPlus ? (
          <View className="px-6 mb-3">
            <View className="bg-surface rounded-lg p-5">
              <Text className="text-accent text-base font-body-semi mb-2">Life Areas: Health</Text>
              <Text className="text-fg-muted text-sm text-center">This section will be available in your next reading refresh.</Text>
            </View>
          </View>
        ) : (
          <LockShell density={2} title="Life Areas: Health" teaser="Wellness guidance aligned to your cosmic cycle" />
        )}

        {/* Profile Integration (Premium) */}
        {isPremium && monthlyReading?.profileIntegration && (
          <View className="px-6 mb-6">
            <View className="bg-surface rounded-lg p-6">
              <Text className="text-accent text-lg font-body-semi mb-3">
                🔮 Your Cosmic Blueprint This Month
              </Text>
              <Text className="text-fg text-sm">
                {monthlyReading.profileIntegration}
              </Text>
            </View>
          </View>
        )}

        {/* Challenges & Opportunities (Premium Plus) */}
        {isPremiumPlus && monthlyReading?.challenges ? (
          <View className="px-6 mb-6">
            <Text className="text-fg text-xl font-body-semi mb-4">
              Cosmic Advice
            </Text>
            <View className="bg-surface rounded-lg p-6">
              {/* Shared type defines these as `string`, but cast preserves the
                  legacy array-handling branch without a TS error (runtime-identical). */}
              {(() => {
                const challenges = monthlyReading.challenges as string | string[] | undefined;
                const opportunities = monthlyReading.opportunities as string | string[] | undefined;
                return (
                  <>
                    {typeof challenges === 'string' ? (
                      <Text className="text-fg-secondary text-sm mb-2">• {challenges}</Text>
                    ) : Array.isArray(challenges) ? (
                      challenges.map((challenge: string, i: number) => (
                        <Text key={`challenge-${i}`} className="text-fg-secondary text-sm mb-2">• {challenge}</Text>
                      ))
                    ) : null}
                    {typeof opportunities === 'string' ? (
                      <Text className="text-accent text-sm mb-2">✦ {opportunities}</Text>
                    ) : Array.isArray(opportunities) ? (
                      opportunities.map((opportunity: string, i: number) => (
                        <Text key={`opportunity-${i}`} className="text-accent text-sm mb-2">✦ {opportunity}</Text>
                      ))
                    ) : null}
                  </>
                );
              })()}
            </View>
          </View>
        ) : isPremiumPlus ? (
          <View className="px-6 mb-6">
            <View className="bg-surface rounded-lg p-5">
              <Text className="text-accent text-base font-body-semi mb-2">Cosmic Advice</Text>
              <Text className="text-fg-muted text-sm text-center">This section will be available in your next reading refresh.</Text>
            </View>
          </View>
        ) : null}

        {/* Locked Banner (for non-premium_plus users).
            🔴 THE BANNER IS A DENSITY-2 SHELL, AND THE SUBTITLE LOST ITS TIER NAME. That string
            was `C-5`'s FOURTH literal — the one the audit's list of three missed — and it named a
            tier in body copy selected client-side, which is the R1 violation the tier-neutral CTA
            exists to retire. The count and the sentence are otherwise verbatim. "Upgrade Now"
            retires with the component it lived in. */}
        {!isPremiumPlus && (
          <LockShell
            density={2}
            title="Unlock Your Complete Monthly Reading"
            teaser={`See all ${!isPremium ? 7 : 3} sections`}
          />
        )}

        {/* Upgrade CTA (non-premium_plus users) */}
        {!isPremiumPlus && (
          <View className="px-6 mb-6">
            <TouchableOpacity
              onPress={() => openPaywall('monthly-upgrade')}
              className="bg-accent rounded-pill p-6 items-center"
            >
              <Text className="text-on-accent text-lg font-body-semi">
                Unlock Full Monthly Reading
              </Text>
              {/* 🔴 A5, AND THIS ONE IS THE SHARPEST SHAPE YET: A CORRECT SIBLING THREE LINES
                  ABOVE A BROKEN ONE, INSIDE THE SAME ELEMENT. The line above uses the on-fill
                  role; this line used the secondary foreground on the same accent fill and
                  measured 1.43:1 — the worst reachable pairing found in this phase, on the
                  monthly upgrade control every non-entitled user sees.
                  🔴 THE REPORT-ONLY RULE MISSED IT BY THREE LINES. Its window is ±4 from the
                     fill; the fill is on the wrapper, this label is 7 lines below it, and the
                     correct sibling sits inside the window. So the rule saw the RIGHT half of a
                     two-label control and stopped. That is `O-55`'s lesson at closer range:
                     adjacency is not a control, whether the adjacent thing is prose or code.
                  ⚠️ AND THE HIERARCHY IS NOT LOST BY MAKING THEM ONE COLOUR: on an accent fill
                     there is exactly one legal foreground, so rank has to be a PROMINENCE ladder
                     (step and weight), never a colour ladder — the same rule `O-24` settled for
                     score bands. It is the lg semi step against the sm one. */}
              <Text className="text-on-accent text-sm mt-2">
                Get complete forecast, key dates, and life area guidance
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Affirmation */}
        <View className="px-6 mb-6">
          <AffirmationCard text={monthlyReading?.affirmation || ''} />
        </View>

        {/* Shareable Quote */}
        <View className="px-6 mb-6">
          <ShareableQuote quote={monthlyReading?.shareableQuote} onShare={() => {}} />
        </View>

        {/* Entertainment Disclaimer */}
        <EntertainmentDisclaimer />
      </ScrollView>
    </ScreenContainer>
  );
}
