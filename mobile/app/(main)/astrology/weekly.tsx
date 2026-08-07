import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { useAuthStore } from '@/store/authStore';
import { useInsightsStore } from '@/store/insightsStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { LockShell } from '@/components/ui/LockShell';
import { WeeklyDayCard } from '@/components/insights/WeeklyDayCard';
import { AffirmationCard } from '@/components/readings/AffirmationCard';
import { ShareableQuote } from '@/components/readings/ShareableQuote';
import { EntertainmentDisclaimer } from '@/components/common/EntertainmentDisclaimer';

export default function WeeklyForecastScreen() {
  const router = useRouter();
  const bottomPad = useBottomInsetPadding();
  const { user } = useAuthStore();
  const tier = user?.subscription?.tier || 'free';
  const { weeklyForecast, isLoadingWeekly, error, fetchWeeklyForecast, clearError } = useInsightsStore();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (tier === 'premium_plus') {
      fetchWeeklyForecast();
    } else {
      setShowPaywall(true);
    }
  }, []);

  if (showPaywall) {
    /* 🔴 DENSITY 1, AND IT PASSES NO CONTENT TO WITHHOLD — WHICH IS A FINDING, NOT AN OMISSION.
       §4.1 makes d1's defining property "the blurred layer is REAL content, not lorem". Measured
       at this commit: this gate fires BEFORE the fetch (the branch above it is the only one that
       calls the endpoint), so there is nothing on this screen to blur. The same is true at every
       full-screen gate in the app — they all gate before fetching, because the server refuses —
       so d1's blurred half needs the SAME redacted-payload server work `O-1` is blocked on.
       The two destiny screens are the exception and they do pass content: their own body is the
       thing being withheld.
       ⚠️ AND THE TWO STRINGS BELOW ARE VERBATIM, INCLUDING THE TIER NAMES IN BOTH OF THEM. §7's
          standing default is binding: where a copy call has not landed, ship the SOURCE STRING.
          `C-5` ruled the three lock literals it enumerated; these two are not among them, so
          they are registered for PM rather than rewritten here. §4.4's ban on copy-pasting this
          screen's tier-named body applies to the destiny screens, which had no shipped lock copy
          of their own — it is not licence to edit this screen's. */
    return (
      <ScreenContainer withScrollView={false}>
        <LockShell
          density={1}
          title="Premium Feature"
          body="Upgrade to Premium Plus to unlock Weekly Forecasts and detailed 7-day guidance."
          secondaryTitle="Maybe Later"
          onSecondary={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (isLoadingWeekly) {
    return (
      <ScreenContainer withScrollView={false}>
        <LoadingSpinner text="Loading weekly forecast..." fullScreen />
      </ScreenContainer>
    );
  }

  if (!weeklyForecast) {
    return (
      <ScreenContainer withScrollView={false}>
        <View className="flex-1 items-center justify-center p-6">
          <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6">
            <Text className="text-accent text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-fg text-xl font-body-bold mb-3">
            Weekly Forecast Unavailable
          </Text>
          <Text className="text-fg-muted text-center mb-6">
            {error || 'Complete your face and palm readings first to unlock weekly forecasts.'}
          </Text>
          <Button
            title="Retry"
            onPress={() => { clearError(); fetchWeeklyForecast(); }}
            variant="primary"
          />
        </View>
      </ScreenContainer>
    );
  }

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
          <Text className="text-fg-muted text-sm">{weeklyForecast.weekOf}</Text>
          <Text className="text-fg text-display-lg font-display mt-2">{weeklyForecast.theme}</Text>
        </View>
        
        {/* Overview */}
        <View className="px-6 mb-6">
          <Text className="text-fg text-base">
            {weeklyForecast.overview}
          </Text>
        </View>
        
        {/* Daily Breakdown */}
        <View className="mb-6">
          <Text className="text-fg text-xl font-body-semi mb-4 px-6">
            Day by Day
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6">
            {weeklyForecast.days.map((dayForecast, index) => {
              const isToday = new Date().getDay() === (index + 1) % 7;
              return (
                <WeeklyDayCard
                  key={dayForecast.day}
                  day={dayForecast.day}
                  energy={dayForecast.energy}
                  focus={dayForecast.focus}
                  isToday={isToday}
                />
              );
            })}
          </ScrollView>
        </View>
        
        {/* Best Days
            🔴 `O-24` / `P27` — five identical section cards, three headings in iris and two in
            clay, and the split did not follow any property of the sections: Love and Creativity
            were iris, Career was clay, then Challenges was iris and Advice clay. The hue was
            alternating, not classifying. §16.5's test is the one that settles it — if the answer to
            "is this premium / brand?" is "it just needed to be a different colour," it is the wrong
            token. Each heading names itself in words on its own card. All five now read `accent`. */}
        <View className="px-6 mb-6">
          <Text className="text-fg text-xl font-body-semi mb-4">
            Best Days For...
          </Text>
          <View className="bg-surface rounded-lg p-6 mb-3">
            <Text className="text-accent text-base font-body-semi mb-1">💖 Love</Text>
            <Text className="text-fg text-sm">{weeklyForecast.bestDays.forLove}</Text>
          </View>
          <View className="bg-surface rounded-lg p-6 mb-3">
            <Text className="text-accent text-base font-body-semi mb-1">💼 Career</Text>
            <Text className="text-fg text-sm">{weeklyForecast.bestDays.forCareer}</Text>
          </View>
          <View className="bg-surface rounded-lg p-6">
            <Text className="text-accent text-base font-body-semi mb-1">🎨 Creativity</Text>
            <Text className="text-fg text-sm">{weeklyForecast.bestDays.forCreativity}</Text>
          </View>
        </View>
        
        {/* Guidance */}
        <View className="px-6 mb-6">
          <View className="bg-surface rounded-lg p-6 mb-3">
            <Text className="text-accent text-base font-body-semi mb-2">⚠️ Challenges</Text>
            <Text className="text-fg text-sm">{weeklyForecast.challenges}</Text>
          </View>
          <View className="bg-surface rounded-lg p-6">
            <Text className="text-accent text-base font-body-semi mb-2">💡 Advice</Text>
            <Text className="text-fg text-sm">{weeklyForecast.advice}</Text>
          </View>
        </View>
        
        {/* Affirmation */}
        <View className="px-6 mb-6">
          <AffirmationCard text={weeklyForecast.affirmation} />
        </View>
        
        {/* Shareable Quote */}
        <View className="px-6 mb-6">
          <ShareableQuote quote={weeklyForecast.shareableQuote} onShare={() => {}} />
        </View>
        
        {/* Entertainment Disclaimer */}
        <EntertainmentDisclaimer />
      </ScrollView>
    </ScreenContainer>
  );
}
