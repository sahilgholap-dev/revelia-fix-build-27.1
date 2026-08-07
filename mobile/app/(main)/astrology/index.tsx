import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { NewBadge } from '@/components/ui/NewBadge';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { NumerologyBadge } from '@/components/insights/NumerologyBadge';
import { BirthChartWheel } from '@/components/astrology/BirthChartWheel';
import { SectionCard } from '@/components/ui/SectionCard';
import { Sheet } from '@/components/ui/Sheet';
import { Ionicons } from '@expo/vector-icons';

import { getZodiacEmoji } from '@/lib/zodiacEmojis';
// PASS 1a (colour, IDENTITY). `t.color` holds TODAY's palette behind the new semantic
// names — see codemod-plan.md §1.6a. Pass 5 flips the values in theme.js alone.
// PASS 1b (colour, VALUE) then completed the collapses §1.6b lists, and C11b DELETED
//    lib/colors.ts along with all 54 of its importers. `theme.js` is now the only token source.
/* Grepped for a local definition of this name in each file first (O-71/O-79 — the fifth name
   collision in this programme was a LOCAL of exactly this name). None of the four has one. */
import { Plate } from '@/components/ui/Plate';
import * as t from '@/theme';
import { recordMeaningfulAction } from '@/store/reviewStore';

// Moon and Rising signs are read from the birth chart, which (as of Build 27
// R1) is computed server-side with Swiss Ephemeris and mapped into the UI
// shape by lib/astrology/chartGenerator.ts (mapServerChart). The previous
// approximation heuristics — date-only Moon and time-without-latitude Rising —
// were removed in Build 21 because they could be wrong by a sign; the Build 21
// on-device Keplerian engine that replaced them was in turn retired in R1 in
// favor of the arc-second server chart.
//
// Behavior now:
//   - Moon shown when chart.moonSign present AND birth time present
//   - Rising shown when chart.risingSign present AND birth time + location present
//   - Otherwise: educational lock card prompting user to complete profile


function PlanetCard({ planet, data }: { planet: string; data: any }) {
  const [expanded, setExpanded] = useState(false);
  const planetNames: Record<string, string> = {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
    mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
    uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
  };
  const planetEmojis: Record<string, string> = {
    sun: '\u2609', moon: '\u263D', mercury: '\u263F', venus: '\u2640',
    mars: '\u2642', jupiter: '\u2643', saturn: '\u2644',
    uranus: '\u2645', neptune: '\u2646', pluto: '\u2647',
  };

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, marginBottom: 8, padding: 14 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, marginRight: 10, color: t.color.accent }}>{planetEmojis[planet] || ''}</Text>
        <View style={{ flex: 1 }}>
          <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg, fontFamily: t.family['body-semi'] }}>{planetNames[planet] || planet}</Text>
          <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'] }}>
            {data.sign}{data.house ? ` - House ${data.house}` : ''} ({data.degree}°)
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'caret-up' : 'caret-down'}
          size={20}
          color={t.color['fg-muted']}
          accessibilityLabel={expanded ? 'Collapse' : 'Expand'}
        />
      </View>
      {expanded && data.insight && (
        <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-secondary'], marginTop: 8 }}>{data.insight}</Text>
      )}
    </TouchableOpacity>
  );
}

const LIFE_THEME_EMOJIS: Record<string, string> = {
  heart: '❤️',
  briefcase: '💼',
  chatbubbles: '💬',
  water: '💧',
  sparkles: '✨',
};

// R1 (2026-07-31) — PRESENCE-DRIVEN, NOT TIER-DRIVEN. The server owns entitlement; the
// client renders what it was actually sent. A theme with a body expands; a theme whose
// body did not arrive renders TITLE-ONLY: no chevron, no tap, and deliberately NO lock
// affordance. Nothing on the wire distinguishes "withheld because unpaid" from "not
// generated yet" (GET /birth-chart does no tier filtering at all), so a 🔒 here would be
// the client claiming knowledge it does not have. The previous `locked` prop was fed by
// `tier !== 'free'` and hid prose that was already in the payload. Do not reintroduce it
// without a server signal — a `locked: string[]` on the response, or server-side omission
// of `lifeThemes`. UI-audit §5.7 site 3 · codemod-plan §6.2 · O-2.
function LifeThemeCard({ title, icon, content }: { title: string; icon: string; content?: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = !!content;

  return (
    <View style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, marginBottom: 8, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        disabled={!hasBody}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
      >
        <Text style={{ fontSize: 18 /* GLYPH */, marginRight: 10 }}>{LIFE_THEME_EMOJIS[icon] || '⭐'}</Text>
        <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg, fontFamily: t.family['body-semi'], flex: 1 }}>{title}</Text>
        {hasBody && (
          <Ionicons
          name={expanded ? 'caret-up' : 'caret-down'}
          size={20}
          color={t.color['fg-muted']}
          accessibilityLabel={expanded ? 'Collapse' : 'Expand'}
        />
        )}
      </TouchableOpacity>
      {expanded && content && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'] }}>{content}</Text>
        </View>
      )}
    </View>
  );
}

export default function AstrologyHubScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { profile, birthChart, isLoadingBirthChart, birthChartError, fetchBirthChart, generateBirthChart } = useProfileStore();
  const tier = user?.subscription?.tier || 'free';
  const bottomPad = useBottomInsetPadding();

  const [autoGenerateAttempted, setAutoGenerateAttempted] = useState(false);
  // Which (moon | rising) the user tapped to open the assumed-time tooltip.
  // null when modal closed.
  const [assumedNoteVisible, setAssumedNoteVisible] = useState<'moon' | 'rising' | null>(null);

  useEffect(() => {
    // Try to load cached birth chart
    fetchBirthChart();
  }, []);

  // Auto-load the birth chart if the user has birth data but no chart yet.
  // Build 27 R1: this is a GET (the server computes + persists lazily) — NOT
  // the rate-limited POST. The explicit "generate" button below still uses the
  // POST (forceRegenerate) for a manual recompute.
  useEffect(() => {
    if (
      profile?.birthData?.date &&
      !birthChart &&
      !isLoadingBirthChart &&
      !autoGenerateAttempted
    ) {
      setAutoGenerateAttempted(true);
      fetchBirthChart();
    }
  }, [profile, birthChart, isLoadingBirthChart, autoGenerateAttempted]);

  // Record astrology/birth-chart completion once the chart is present
  // (deduped one-time by reviewStore as 'reading:astrology').
  useEffect(() => {
    if (!birthChart) return;
    recordMeaningfulAction('reading:astrology');
  }, [birthChart]);

  // Data-presence flags. hasBirthLocation treats any non-empty city/country
  // text as sufficient anchor (server geocoder populates lat/lng/timezone
  // from these fields; legacy data may have city/country without coords).
  const hasBirthTime = !!profile?.birthData?.time;
  const hasBirthLocation = !!(
    profile?.birthData?.location?.city || profile?.birthData?.location?.country
  );
  // Server flips this when it noon-defaulted the user's missing birth time.
  // We still show moon/rising values (the chart can compute them with the
  // noon assumption) but mark them with a (i) provenance indicator below.
  const timeIsAssumed = !!profile?.birthData?.timeIsAssumed;

  // Moon: shown only when birth time is present AND chart computed it.
  // The Keplerian Moon needs a time; without one it falls back to noon
  // which can be wrong by a sign — we'd rather lock than mislead.
  const moonSign: string | null = hasBirthTime ? birthChart?.moonSign || null : null;
  const moonGenerating = hasBirthTime && !birthChart && isLoadingBirthChart && !birthChartError;

  // Rising: shown only when time AND location are present AND chart computed it.
  const risingSign: string | null =
    hasBirthTime && hasBirthLocation ? birthChart?.risingSign || null : null;
  const risingGenerating =
    hasBirthTime && hasBirthLocation && !birthChart && isLoadingBirthChart && !birthChartError;

  const handleGenerateChart = async () => {
    if (!profile?.birthData?.date) {
      Alert.alert(
        'Birth Date Required',
        'Please add your birth date to generate your birth chart.',
        [
          { text: 'Add Birth Data', onPress: () => router.push('/(capture)/birth-data' as any) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    try {
      await generateBirthChart();
    } catch (error) {
      Alert.alert(
        'Chart Generation Failed',
        'There was a problem generating your birth chart. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Sun sign traits helper
  const getSunSignTraits = (sign?: string) => {
    const traits: Record<string, string[]> = {
      Aries: ['Bold', 'Energetic', 'Pioneering'],
      Taurus: ['Reliable', 'Patient', 'Devoted'],
      Gemini: ['Curious', 'Adaptable', 'Communicative'],
      Cancer: ['Intuitive', 'Emotional', 'Protective'],
      Leo: ['Confident', 'Generous', 'Charismatic'],
      Virgo: ['Analytical', 'Practical', 'Meticulous'],
      Libra: ['Diplomatic', 'Harmonious', 'Social'],
      Scorpio: ['Passionate', 'Resourceful', 'Intense'],
      Sagittarius: ['Optimistic', 'Adventurous', 'Philosophical'],
      Capricorn: ['Ambitious', 'Disciplined', 'Responsible'],
      Aquarius: ['Independent', 'Innovative', 'Humanitarian'],
      Pisces: ['Compassionate', 'Artistic', 'Intuitive'],
    };
    return sign ? traits[sign] || [] : [];
  };

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Header
            🔴 §14.3.3's OWN HEADING NAMES THIS SURFACE — "the astrology hub" — so the plate is
            ASSIGNED here rather than chosen. That is what R-1's "every surface §14.3 names" means:
            §14.3's five sub-headings ARE the mount map, and reading them is what turns a designer
            question into a transcription.
            🔴 ONE PLATE IN THIS VIEWPORT (§14.5) — checked, not assumed: this screen mounts no
            other §14 element, and the empty-state component that carries the sibling plate is not
            used on this route. The §15 budget is untouched: no ridge, no arc here.
            ⚠️ NOT beside a disclaimer and NOT inside a package card — §14.5's two content bans. The
            hub's disclaimer is far below the fold and this sits in the header. */}
        <View className="p-6 flex-row items-start justify-between">
          <Text className="text-fg text-display-lg font-display flex-1">
            Cosmic Guidance
          </Text>
          <Plate name="orbits" width={92} />
        </View>

        {/* Big Three Summary
            🔴 `O-24` / `P27` — THIS BLOCK HELD THE APP'S MOST VISIBLE NOMINAL HUE MAP AND IT DID
            NOT EVEN WORK AS ONE. Sun read `accent`, Moon and Rising BOTH read `accent-2` — so of
            three categories the colour distinguished exactly one, while implying it distinguished
            all three. That is the strongest possible case for §16's position: identity here comes
            from the LABEL above each cell ("Sun" / "Moon" / "Rising"), the glyph, and the POSITION
            in a fixed three-across row. All three now read `accent`.
            🔴 AND THE SAME TOKEN WAS DOING THREE UNRELATED JOBS IN THIS ONE BLOCK, which is exactly
            the drift §16.5 forbids ("it must not become the generic second colour"):
              · the sign VALUES — a category hue, above;
              · the two loading SPINNERS — a transient state, now `accent`;
              · the two "Add birth time" hints INSIDE a TouchableOpacity. 🔴 That one is §16.2
                outright — iris "is never the colour of an element that triggers an action" — and it
                also put two hues on one control, since its `Edit Profile` line is already `accent`.
                The hint is META copy about a missing field, so it takes §2 row 8's muted role and
                the control keeps ONE accent, on the line that names the action.
            ⚠️ THE ZODIAC GLYPHS ARE STILL EMOJI and still render in their own vendor colours, which
               is the yellow and green beside these labels. That is §9.2's system-wide debt, not this
               ruling — see the commit body's count. */}
        <View className="px-4 mb-4">
          <View style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, padding: 20 }}>
            <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'], marginBottom: 16, textAlign: 'center' }}>
              Your Cosmic Blueprint
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Sun</Text>
                <Text style={{ fontSize: 24 /* GLYPH */ }}>{profile?.sunSign ? getZodiacEmoji(profile.sunSign) : '?'}</Text>
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent, fontFamily: t.family['body-semi'], marginTop: 4 }}>
                  {profile?.sunSign || '?'}
                </Text>
              </View>
              {/* Moon cell — shown normally when chart computed it (date + time
                  available); locked otherwise. Layout dimensions match the
                  unlocked cell so the row doesn't shift.
                  When time was noon-defaulted server-side, append a small (i)
                  indicator that opens an explanatory modal. */}
              {moonSign ? (
                <View style={{ alignItems: 'center' }}>
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Moon</Text>
                  <Text style={{ fontSize: 24 /* GLYPH */ }}>{getZodiacEmoji(moonSign)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent, fontFamily: t.family['body-semi'] }}>
                      {moonSign}
                    </Text>
                    {timeIsAssumed && (
                      <Pressable
                        onPress={() => setAssumedNoteVisible('moon')}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        style={{ marginLeft: 4 }}
                      >
                        <Ionicons name="information-circle-outline" size={14} color={t.color['fg-muted']} />
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : moonGenerating ? (
                <View style={{ alignItems: 'center' }}>
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Moon</Text>
                  <Text style={{ fontSize: 24 /* GLYPH */ }}>?</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <ActivityIndicator size="small" color={t.color.accent} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push('/(capture)/birth-data' as any)}
                  style={{ alignItems: 'center', maxWidth: 100 }}
                >
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Moon</Text>
                  <Ionicons name="lock-closed-outline" size={22} color={t.color.accent} />
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], marginTop: 4, textAlign: 'center' }}>
                    Add birth time
                  </Text>
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color.accent, marginTop: 2, textDecorationLine: 'underline' }}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              )}
              {/* Rising cell — shown only when chart, time, AND location all
                  present. Lock copy adapts to whichever is missing.
                  When time was noon-defaulted server-side, append a small (i)
                  indicator that opens an explanatory modal. */}
              {risingSign ? (
                <View style={{ alignItems: 'center' }}>
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Rising</Text>
                  <Text style={{ fontSize: 24 /* GLYPH */ }}>{getZodiacEmoji(risingSign)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent, fontFamily: t.family['body-semi'] }}>
                      {risingSign}
                    </Text>
                    {timeIsAssumed && (
                      <Pressable
                        onPress={() => setAssumedNoteVisible('rising')}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        style={{ marginLeft: 4 }}
                      >
                        <Ionicons name="information-circle-outline" size={14} color={t.color['fg-muted']} />
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : risingGenerating ? (
                <View style={{ alignItems: 'center' }}>
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Rising</Text>
                  <Text style={{ fontSize: 24 /* GLYPH */ }}>?</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <ActivityIndicator size="small" color={t.color.accent} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push('/(capture)/birth-data' as any)}
                  style={{ alignItems: 'center', maxWidth: 100 }}
                >
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginBottom: 4 }}>Rising</Text>
                  <Ionicons name="lock-closed-outline" size={22} color={t.color.accent} />
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], marginTop: 4, textAlign: 'center' }}>
                    {!hasBirthTime && !hasBirthLocation
                      ? 'Add birth time + location'
                      : !hasBirthTime
                      ? 'Add birth time'
                      : 'Add birth location'}
                  </Text>
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color.accent, marginTop: 2, textDecorationLine: 'underline' }}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Summary text */}
            {birthChart?.bigThreeInsight && (
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], textAlign: 'center' }}>
                {birthChart.bigThreeInsight}
              </Text>
            )}

            {!birthChart && (
              <View>
                <TouchableOpacity
                  onPress={handleGenerateChart}
                  disabled={isLoadingBirthChart}
                  style={{
                    backgroundColor: isLoadingBirthChart ? t.alpha(t.color.accent, 60) : t.color.accent,
                    borderRadius: t.radius.lg,
                    paddingVertical: 12,
                    marginTop: 8,
                    alignItems: 'center',
                    opacity: isLoadingBirthChart ? 0.7 : 1,
                  }}
                >
                  {isLoadingBirthChart ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator color={t.color["on-accent"]} size="small" />
                      <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color["on-accent"], fontFamily: t.family['body-semi'], marginLeft: 8 }}>Generating...</Text>
                    </View>
                  ) : birthChartError ? (
                    <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color["on-accent"], fontFamily: t.family['body-semi'] }}>Retry Birth Chart</Text>
                  ) : (
                    <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color["on-accent"], fontFamily: t.family['body-semi'] }}>Generate Birth Chart</Text>
                  )}
                </TouchableOpacity>
                {birthChartError && !isLoadingBirthChart && (
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color.danger, textAlign: 'center', marginTop: 6 }}>
                    Chart generation failed. Tap to retry.
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Personalized Cosmic Report entry (R9 §14 step 9). Identical for all
            tiers — gating happens on the generate action in the hub. */}
        <View className="px-4 mb-4">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/readings/cosmic-report' as any)}
            style={{
              backgroundColor: t.color['surface-raised'],
              borderRadius: t.radius.md,
              padding: 18,
              borderWidth: 1,
              borderColor: t.color['border-strong'],
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: t.radius.md,
                  backgroundColor: t.color.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 13,
                }}
              >
                <Text style={{ fontSize: 24 /* GLYPH */ }}>🌙</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg, fontFamily: t.family['body-bold'] }}>
                  Personalized Cosmic Report
                </Text>
                <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], marginTop: 3 }}>
                  Astrology, numerology and palm reading
                </Text>
              </View>
              <NewBadge />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
              {['Dual-zodiac', 'Dated timing', 'Downloadable PDF'].map((tag) => (
                <View
                  key={tag}
                  style={{
                    borderWidth: 1,
                    borderColor: t.color['accent-muted'],
                    backgroundColor: t.alpha(t.color.accent, 5),
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: t.radius.pill,
                  }}
                >
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color.accent }}>{tag}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </View>

        {/* Birth Chart Wheel */}
        {birthChart && (
          <View className="px-4 mb-4">
            <View style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, padding: 16 }}>
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg, textAlign: 'center', marginBottom: 8 }}>
                Your Birth Chart
              </Text>
              <BirthChartWheel chartData={birthChart} />
              {birthChart.summary && (
                <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 8 }}>
                  {birthChart.summary}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Planet Placements */}
        {birthChart?.planets && (
          <SectionCard title="Planet Placements">
            {Object.entries(birthChart.planets).map(([planet, data]: [string, any]) => (
              <PlanetCard
                key={planet}
                planet={planet}
                data={{
                  ...data,
                  insight: birthChart.planetInsights?.[planet],
                }}
              />
            ))}
          </SectionCard>
        )}

        {/* Life Themes */}
        {birthChart?.lifeThemes && (
          <SectionCard title="Life Themes">
            <LifeThemeCard
              title="Love & Relationships"
              icon="heart"
              content={birthChart.lifeThemes.loveAndRelationships}
            />
            <LifeThemeCard
              title="Career & Success"
              icon="briefcase"
              content={birthChart.lifeThemes.careerAndSuccess}
            />
            <LifeThemeCard
              title="Communication Style"
              icon="chatbubbles"
              content={birthChart.lifeThemes.communicationStyle}
            />
            <LifeThemeCard
              title="Emotional World"
              icon="water"
              content={birthChart.lifeThemes.emotionalWorld}
            />
            <LifeThemeCard
              title="Spiritual Path"
              icon="sparkles"
              content={birthChart.lifeThemes.spiritualPath}
            />
          </SectionCard>
        )}

        {/* Insight Cards */}
        <View className="px-4 mb-4">
          <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, marginBottom: 12, paddingHorizontal: 4 }}>
            Your Insights
          </Text>

          {/* Today's Insights Card - Available to all tiers */}
          <TouchableOpacity
            onPress={() => router.push('/astrology/daily' as any)}
            style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, padding: 18, marginBottom: 10 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg, marginBottom: 4 }}>
                  Today's Insights
                </Text>
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'] }}>
                  Personalized guidance for today
                </Text>
              </View>
              <Text style={{ color: t.color['fg-muted'], fontSize: 20 /* GLYPH */ }}>›</Text>
            </View>
          </TouchableOpacity>

          {/*
            Weekly Forecast Card — R1 (2026-07-31). The tap ALWAYS routes and the
            destination decides; insight.service.ts:667-669 already returns a 403. Deleted
            here: the `tier !== 'premium_plus'` check, the Alert whose BODY COPY NAMED A
            TIER, and the PLUS / 🔒 badge pair. No lock affordance — no pre-render
            entitlement signal reaches the client (preflight §B5), so the client cannot
            know before navigating and must not imply that it does. O-3.
          */}
          <TouchableOpacity
            onPress={() => router.push('/astrology/weekly' as any)}
            style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, padding: 18, marginBottom: 10 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg, marginBottom: 4 }}>
                  Weekly Forecast
                </Text>
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'] }}>
                  7-day cosmic forecast
                </Text>
              </View>
              <Text style={{ color: t.color['fg-muted'], fontSize: 20 /* GLYPH */ }}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Monthly Reading Card */}
          <TouchableOpacity
            onPress={() => router.push('/astrology/monthly' as any)}
            style={{ backgroundColor: t.color['surface-raised'], borderRadius: t.radius.md, padding: 18 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg, marginBottom: 4 }}>
                  Monthly Reading
                </Text>
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'] }}>
                  {tier === 'free' ? 'Basic forecast with key dates' : 'Complete monthly guidance'}
                </Text>
              </View>
              <Text style={{ color: t.color['fg-muted'], fontSize: 20 /* GLYPH */ }}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Numerology Section */}
        {profile && (
          <View className="px-4 mb-8">
            <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, marginBottom: 12, paddingHorizontal: 4 }}>
              Your Numbers
            </Text>
            <View className="flex-row justify-between">
              {profile.lifePathNumber && (
                <NumerologyBadge
                  type="lifePathNumber"
                  value={profile.lifePathNumber}
                />
              )}
              {profile.personalYear && (
                <NumerologyBadge
                  type="personalYear"
                  value={profile.personalYear}
                />
              )}
              {profile.personalMonth && (
                <NumerologyBadge
                  type="personalMonth"
                  value={profile.personalMonth}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Assumed-time tooltip — opens from the (i) badge on moon/rising cells when the server
          noon-defaulted a missing birth time. Educational, not alarming. CTA routes to profile.
          🔴 MIGRATED ONTO `Sheet` AT §9 ITEM 15, and this surface is why §3.1 sequences item 15
          BEFORE the astrology hub's screens work: seven hand-rolled StyleSheet rules built a
          bottom-sheet by hand — backdrop, card, title, body, CTA, CTA label, dismiss — and every
          one of them is a value the primitive now owns. The gate asserts all seven are GONE, which
          is the only decreasing counter this item gets.
          ⚠️ The body copy is preserved to the character, including both interpolations and the
          blank line, because §7's standing default is the source string verbatim. */}
      <Sheet
        visible={assumedNoteVisible !== null}
        onDismiss={() => setAssumedNoteVisible(null)}
        icon="time-outline"
        title="Calculated from a noon chart"
        body={
          `Since you didn't provide your birth time, your ` +
          `${assumedNoteVisible === 'moon' ? 'Moon' : 'Rising'} sign is calculated from a noon-default chart. This is a traditional astrological convention when birth time is unknown.` +
          `\n\n` +
          `For your most accurate ${assumedNoteVisible === 'moon' ? 'Moon' : 'Rising'} sign, add your birth time in Profile.`
        }
        primary={{
          title: 'Add Birth Time',
          onPress: () => {
            setAssumedNoteVisible(null);
            router.push('/(capture)/birth-data' as any);
          },
        }}
        cancel={{ title: 'Got it', onPress: () => setAssumedNoteVisible(null) }}
      />
    </ScreenContainer>
  );
}

/* 🔴 THE STYLESHEET IS GONE ENTIRELY, and that is a measurement rather than a tidy-up:
   its ONLY seven rules were the hand-rolled bottom sheet, so a primitive that owns a backdrop,
   a card, a title, a body, a CTA, a CTA label and a dismiss link left this screen with nothing
   of its own to declare. §3.1's gate for item 15 asks for exactly these seven to be absent. */
