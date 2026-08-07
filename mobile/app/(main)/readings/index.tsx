import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { LockSlot } from '@/components/ui/LockSlot';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { useReadingsStore } from '@/store/readingsStore';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useCompatibilityStore } from '@/store/compatibilityStore';
import { EmptyState } from '@/components/common/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

/* 🔴 `LockSlot` WAS DEFINED HERE AND IS NOW `components/ui/LockSlot.tsx`, UNCHANGED IN BEHAVIOUR.
   It moved because the numerology hub's Name Destiny tile — the same destination, gated on the same
   entitlement — still carried the tier-badge treatment this component exists to replace, and a
   second copy of a five-line component is how the two drift apart. The reasoning that justifies
   every line of it travelled with it; nothing was left behind here as a summary.
   🔴 NO NEW COPY WAS AUTHORED IN EITHER FILE. §0.0 rule 2 — the CTA string is `P53`'s shipped
      "Upgrade to Unlock", already live on the cards below, so each adopter joins a pattern. */

export default function ReadingsHub() {
  const { faceReading, palmReadingDominant, fetchFaceReading, fetchPalmReading } = useReadingsStore();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { readings: compatibilityReadings, fetchReadings: fetchCompatibilityReadings } = useCompatibilityStore();
  const bottomPad = useBottomInsetPadding();

  const isPremium = user?.subscription.tier !== 'free';

  useEffect(() => {
    // Try to load existing readings
    loadReadings();
  }, []);

  const loadReadings = async () => {
    try {
      await Promise.all([
        fetchFaceReading().catch(() => {}),
        fetchPalmReading('dominant').catch(() => {}),
        fetchCompatibilityReadings().catch(() => {})
      ]);
    } catch (err) {
      // Silently fail - readings may not exist yet
    }
  };

  const handleFaceReading = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (faceReading) {
      router.push('/(main)/readings/face' as any);
    } else {
      router.push('/(capture)/face-capture');
    }
  };

  const handlePalmReading = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (palmReadingDominant) {
      router.push('/(main)/readings/palm' as any);
    } else {
      router.push('/(capture)/palm-capture');
    }
  };

  const handleCombinedProfile = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isPremium) {
      openPaywall('readings-combined-profile');
    } else {
      router.push('/(main)/readings/combined' as any);
    }
  };

  // Show empty state if no readings exist
  if (!faceReading && !palmReadingDominant && (!compatibilityReadings || compatibilityReadings.length === 0)) {
    return (
      <ScreenContainer withScrollView={false}>
        <View className="px-6 pt-4 pb-6">
          <Text className="text-fg text-display-lg font-display">Your Readings</Text>
          <Text className="text-fg-muted text-sm mt-1">
            Discover your cosmic profile
          </Text>
        </View>
        <EmptyState
          title="No Readings Yet"
          description="Take your first photo to begin your cosmic journey and unlock personalized insights"
          actionTitle="Get Started"
          onAction={() => router.push('/(main)/home')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withScrollView={false}>
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <Text className="text-fg text-display-lg font-display">Your Readings</Text>
        <Text className="text-fg-muted text-sm mt-1">
          Discover your cosmic profile
        </Text>
        
        {/* Quick Stats */}
        {profile && (profile.sunSign || profile.lifePathNumber) && (
          <View className="flex-row gap-3 mt-4">
            {profile.sunSign && (
              <View className="bg-surface px-4 py-2 rounded-pill">
                <Text className="text-accent font-body-semi">
                  {profile.sunSign} ☀️
                </Text>
              </View>
            )}
            {profile.lifePathNumber && (
              <View className="bg-surface px-4 py-2 rounded-pill">
                <Text className="text-accent-2 font-body-semi">
                  Life Path {profile.lifePathNumber}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        {/* AI Astrologer (Q&A) Card — R7 §13e Item A. Identical for free/paid;
            gating (monthly caps + Deep Insight) is enforced SERVER-SIDE inside
            the chat, so no tier pill here. */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(main)/readings/qa' as any);
          }}
          className="mb-4"
          activeOpacity={0.8}
        >
          {/* ══ THE CARD GROUND, AND THE THREE THINGS THAT DEPENDED ON IT ══════════════════════

              🔴 THIS CARD — AND ALL SEVEN ON THIS SCREEN — WAS A FULL-BLEED ACCENT FILL UNTIL
                 2026-08-05, AND THAT WAS A DESIGN REGRESSION THAT PASSED EVERY GATE. Every pair
                 measured correctly (the on-fill role at 6.86:1), which is exactly WHY A5 and A6
                 passed: they enforce CONTRAST, never DESIGN INTENT. Nothing in the stack asks
                 whether a surface is SUPPOSED to be accent-filled. §2 grounds a card in the card
                 role and reserves the accent for the ACTION role, and seven full-bleed accent cards
                 is the loudest treatment in the palette repeated seven times.
              ⚠️ THE MISREADING WAS SPECIFIC AND WORTH NAMING: collapsing seven category hues to one
                 accent meant "stop using hue for IDENTITY" — cards keep the card ground, the accent
                 goes on the CTA and the icon. It did not mean "fill every card with accent."
              🟢 SO THE GROUND IS THE CARD ROLE, matching the `Card` primitive exactly (that ground,
                 the hairline, unconditional). Differentiation comes from ICON, LABEL and POSITION —
                 P27's second ground and the Explore-grouping precedent. On a dark ground the title
                 returns to the plain foreground role and the subtitle to the secondary one; only the
                 CTA pill is a real accent fill now, so the on-fill role there is A5-correct rather
                 than A5-correct-by-coincidence.

              ── 🔴 AND THE PLATE DROP'S PREMISE IS GONE WITH THE FILL. NOT RE-OPENED HERE. ────────

              §14.3.2's heading names this surface ("Ask the stars card" — a VERBATIM CITATION of a
              design-document heading, NOT app copy; the feature itself is "AI Astrologer" from
              2026-08-05) and the mount was DROPPED
              on 2026-08-04 (`P65` / `O-86`, closed). 🔴 THE WHOLE ARGUMENT WAS THAT THIS CARD'S
              GROUND WAS AN ACCENT FILL, on which all three legal tints measured 1.42 / 1.36 / 1.15
              and the component's own internal accent node landed at 1.00:1 — invisible, so there was
              no legal configuration. That ground no longer exists. On the card role the same three
              tints are 5.11 / 9.89 / 3.87, i.e. the surface steps the tint allow-list was chosen for
              in §14.2, and the drop's reasoning does not survive the change.
              🟢 THE MOUNT STAYS DROPPED IN THIS COMMIT ANYWAY, and deliberately: re-mounting is a
                 DESIGN addition, §0.0 rule 1 takes the smaller change, and §14.5 bans two plates in
                 one viewport — which this route satisfies only trivially, because the empty-state
                 plate sits behind an early return. 🔴 REGISTERED, NOT SILENTLY LEFT: the `forbidden`
                 entry in `primitive-adoption-check.js` now carries the superseded premise, so
                 next reader inherits an owner decision rather than a stale measurement.
              ⚠️ WHAT REPLACED THE PLATE IS UNCHANGED and is still correct: the same Ionicon Home's
                 Explore row uses for this destination, so the two entry points agree. It replaced a
                 pictograph §9.2 bans as an icon and it retired a GLYPH exception.

              ── THE INVARIANTS ON THIS ELEMENT, ALL UNTOUCHED ────────────────────────────────────

              🔴 X14 is the height floor here — one of SEVEN identical iOS-production collapse guards
                 in this file (`6525a75`), each a no-op on Android and each looking exactly like
                 copy-paste cruft. Seven before, seven after; only the two colour props and the type roles moved.
              🔴 X17 is the icon well's clipping override, on all SEVEN wells. `611674b` dropped THIS
                 ONE once while converting its pictograph, and nothing caught it, which is why the
                 count is a gate assertion rather than a paragraph.
                 ⚠️ Neither declaration is spelled in this paragraph, on purpose — the censuses read
                 raw source and would count their own documentation (`O-68` direction 3).
              ⚠️ The two-equal-stop gradient is KEPT rather than collapsed to a plain View: X14 exists
                 because padding-only sizing on THIS element class collapsed on iOS production, and
                 iOS verification is closed permanently, so the element the guard sits on is not a
                 thing to change without a device. Only its colours moved. */}
          <LinearGradient
            colors={[t.color.surface, t.color.surface]}
            style={{ borderRadius: t.radius.md, padding: 24, minHeight: 140, justifyContent: 'center', borderWidth: 1, borderColor: t.color['border-subtle'] }}
          >
            <View className="flex-row items-center mb-3">
              {/* 🔴 X17 RESTORED. `main` carries the clipping override on all SEVEN of this file's
                  wells; `611674b` dropped THIS ONE while converting its pictograph to a glyph, and
                  nothing caught it — the declaration reads as a no-op because it IS the web default,
                  and it is NOT React Native's default on Android. That is the exact sentence the
                  register was written to stop, and it happened anyway, which is why the count is a
                  gate assertion from this commit rather than a paragraph. Seven again.
                  ⚠️ The declaration is NOT spelled in this paragraph on purpose — the census below
                  reads raw source and would count its own documentation (`O-68` direction 3). */}
              <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'visible' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Ionicons name="sparkles-outline" size={40} color={t.color.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-fg text-xl font-body-bold">AI Astrologer</Text>
                <Text className="text-fg-secondary text-sm">
                  Ask about love, career, or what's next
                </Text>
              </View>
            </View>

            <View className="bg-accent py-3 px-4 rounded-pill">
              <Text className="text-on-accent font-body-semi text-center">Ask a question →</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Face Reading Card */}
        <TouchableOpacity
          onPress={handleFaceReading}
          className="mb-4"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[t.color.surface, t.color.surface]}
            style={{ borderRadius: t.radius.md, padding: 24, minHeight: 140, justifyContent: 'center', borderWidth: 1, borderColor: t.color['border-subtle'] }}
          >
            <View className="flex-row items-center mb-3">
              <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'visible' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Ionicons name="person-outline" size={40} color={t.color.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-fg text-xl font-body-bold">Face Reading</Text>
                <Text className="text-fg-secondary text-sm">
                  {faceReading ? faceReading.archetype.name : 'Discover your archetype'}
                </Text>
              </View>
            </View>
            
            <View className="bg-accent py-3 px-4 rounded-pill">
              <Text className="text-on-accent font-body-semi text-center">
                {faceReading ? 'View Reading' : 'Get Reading'} →
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Palm Reading Card */}
        <TouchableOpacity
          onPress={handlePalmReading}
          className="mb-4"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[t.color.surface, t.color.surface]}
            style={{ borderRadius: t.radius.md, padding: 24, minHeight: 140, justifyContent: 'center', borderWidth: 1, borderColor: t.color['border-subtle'] }}
          >
            <View className="flex-row items-center mb-3">
              <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'visible' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Ionicons name="hand-left-outline" size={40} color={t.color.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-fg text-xl font-body-bold">Palm Reading</Text>
                <Text className="text-fg-secondary text-sm">
                  {palmReadingDominant ? palmReadingDominant.palmType.name : 'Reveal your destiny'}
                </Text>
              </View>
            </View>
            
            <View className="bg-accent py-3 px-4 rounded-pill">
              <Text className="text-on-accent font-body-semi text-center">
                {palmReadingDominant ? 'View Reading' : 'Get Reading'} →
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Combined Profile Card */}
        <TouchableOpacity
          onPress={handleCombinedProfile}
          className="mb-4"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[t.color.surface, t.color.surface]}
            style={{ borderRadius: t.radius.md, padding: 24, minHeight: 140, justifyContent: 'center', borderWidth: 1, borderColor: t.color['border-subtle'] }}
          >
            <View className="flex-row items-center mb-3">
              <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'visible' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Ionicons name="layers-outline" size={40} color={t.color.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-fg text-xl font-body-bold">Combined Profile</Text>
                <Text className="text-fg-secondary text-sm">
                  {isPremium ? 'Your complete cosmic blueprint' : 'Unlock your full profile'}
                </Text>
              </View>
              {!isPremium && <LockSlot />}
            </View>
            
            <View className="bg-accent py-3 px-4 rounded-pill">
              <Text className="text-on-accent font-body-semi text-center">
                {isPremium ? 'View Profile' : 'Upgrade to Unlock'} →
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Compatibility Card */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(main)/compatibility');
          }}
          className="mb-4"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[t.color.surface, t.color.surface]}
            style={{ borderRadius: t.radius.md, padding: 24, minHeight: 140, justifyContent: 'center', borderWidth: 1, borderColor: t.color['border-subtle'] }}
          >
            <View className="flex-row items-center mb-3">
              <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'visible' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Ionicons name="heart-outline" size={40} color={t.color.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-fg text-xl font-body-bold">Compatibility</Text>
                <Text className="text-fg-secondary text-sm">
                  {compatibilityReadings && compatibilityReadings.length > 0
                    ? `${compatibilityReadings.length} reading${compatibilityReadings.length === 1 ? '' : 's'}`
                    : 'Discover your cosmic match'}
                </Text>
              </View>
            </View>

            <View className="bg-accent py-3 px-4 rounded-pill">
              <Text className="text-on-accent font-body-semi text-center">
                {compatibilityReadings && compatibilityReadings.length > 0 ? 'View Readings' : 'Get Reading'} →
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Name Destiny Card */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const isPremiumPlus = user?.subscription?.tier === 'premium_plus';
            if (isPremiumPlus) {
              router.push('/(main)/numerology/name-destiny' as any);
            } else {
              openPaywall('readings-name-destiny');
            }
          }}
          className="mb-4"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[t.color.surface, t.color.surface]}
            style={{ borderRadius: t.radius.md, padding: 24, minHeight: 140, justifyContent: 'center', borderWidth: 1, borderColor: t.color['border-subtle'] }}
          >
            <View className="flex-row items-center mb-3">
              <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'visible' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Ionicons name="text-outline" size={40} color={t.color.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-fg text-xl font-body-bold">Name Destiny</Text>
                <Text className="text-fg-secondary text-sm">
                  {user?.subscription?.tier === 'premium_plus' ? "Your name's cosmic blueprint" : 'Unlock your name analysis'}
                </Text>
              </View>
              {user?.subscription?.tier !== 'premium_plus' && <LockSlot />}
            </View>
            <View className="bg-accent py-3 px-4 rounded-pill">
              <Text className="text-on-accent font-body-semi text-center">
                {user?.subscription?.tier === 'premium_plus' ? 'View Analysis' : 'Upgrade to Unlock'} →
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Career Destiny Card */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const isPremiumPlus = user?.subscription?.tier === 'premium_plus';
            if (isPremiumPlus) {
              router.push('/(main)/readings/career-destiny' as any);
            } else {
              openPaywall('readings-career-destiny');
            }
          }}
          className="mb-4"
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[t.color.surface, t.color.surface]}
            style={{ borderRadius: t.radius.md, padding: 24, minHeight: 140, justifyContent: 'center', borderWidth: 1, borderColor: t.color['border-subtle'] }}
          >
            <View className="flex-row items-center mb-3">
              <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'visible' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Ionicons name="compass-outline" size={40} color={t.color.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-fg text-xl font-body-bold">Career Destiny</Text>
                <Text className="text-fg-secondary text-sm">
                  {user?.subscription?.tier === 'premium_plus' ? 'Your ideal career paths' : 'Discover your career destiny'}
                </Text>
              </View>
              {user?.subscription?.tier !== 'premium_plus' && <LockSlot />}
            </View>
            <View className="bg-accent py-3 px-4 rounded-pill">
              <Text className="text-on-accent font-body-semi text-center">
                {user?.subscription?.tier === 'premium_plus' ? 'View Career Path' : 'Upgrade to Unlock'} &rarr;
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* CTA Section - Encourage completing both readings */}
        {(faceReading && !palmReadingDominant) || (!faceReading && palmReadingDominant) && (
          <View className="bg-surface rounded-lg p-6 mt-4 mb-8">
            <Text className="text-2xl mb-3 text-center">🌟</Text>
            <Text className="text-fg text-lg font-body-semi text-center mb-2">
              Complete Your Profile
            </Text>
            <Text className="text-fg-muted text-sm text-center mb-4">
              {faceReading ? 'Add your palm reading to unlock your full cosmic profile' : 'Add your face reading to unlock your full cosmic profile'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push(faceReading ? '/(capture)/palm-capture' : '/(capture)/face-capture')}
              className="bg-accent py-3 px-6 rounded-pill"
            >
              <Text className="text-on-accent font-body-semi text-center">
                {faceReading ? 'Capture Palm' : 'Capture Face'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="mb-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
