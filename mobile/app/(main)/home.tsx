import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { NewBadge } from '@/components/ui/NewBadge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { EntertainmentDisclaimer } from '@/components/common/EntertainmentDisclaimer';
import { ArcDivider, BlobField } from '@/components/ui/ShapePrimitives';
/* 🔴 The tier display names were a LOCAL const in profile.tsx — grepped for as a local definition
   before importing anything (O-71), which is exactly how that was found. Extracted rather than
   copied; see the declaration for why a second copy was the wrong answer. */
import { TIER_DISPLAY_NAME } from '@/lib/constants';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { AstroNumeroBadge } from '@/components/profile/AstroNumeroBadge';
import { DailyInsightCard } from '@/components/insights/DailyInsightCard';
import { StreakBadge } from '@/components/engagement/StreakBadge';
import { useAuth } from '@/hooks/useAuth';
import { useProfileStore } from '@/store/profileStore';
import { useInsightsStore } from '@/store/insightsStore';
import { useEngagementStore } from '@/store/engagementStore';
import { useCompatibilityStore } from '@/store/compatibilityStore';
import api from '@/lib/api';
import * as t from '@/theme';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const bottomPad = useBottomInsetPadding();
  /* §15's primitives take a real width rather than a percentage, because an SVG viewBox is a
     numeric coordinate system and a percentage width would stretch the curve. 48 is this
     screen's two 24dp gutters. */
  const { width: windowWidth } = useWindowDimensions();
  const { profile, astrology, numerology, fetchProfile } = useProfileStore();
  const { dailyTeaser, dailyInsight, isLoadingDaily, fetchDailyTeaser, fetchDailyInsight, monthlyReading, fetchMonthlyReading } = useInsightsStore();
  const { streakData, fetchStreak } = useEngagementStore();
  const { readings: compatibilityReadings, fetchReadings: fetchCompatibilityReadings } = useCompatibilityStore();
  const tier = user?.subscription?.tier || 'free';
  const [nameDestiny, setNameDestiny] = useState<any>(null);
  const [careerDestiny, setCareerDestiny] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
    fetchStreak();

    // Fetch daily insight for all users (free tier gets full daily insight)
    fetchDailyInsight();

    // Fetch monthly reading preview
    fetchMonthlyReading();

    // Fetch compatibility readings
    fetchCompatibilityReadings().catch(() => { });

    // Fetch name/career destiny for recent readings (premium_plus only)
    if (tier === 'premium_plus') {
      api.get('/readings/name-destiny').then((res: any) => {
        if (res.success && res.data?.analysis) setNameDestiny(res.data.analysis);
      }).catch(() => { });
      api.get('/readings/career-destiny').then((res: any) => {
        if (res.success && res.data?.career) setCareerDestiny(res.data.career);
      }).catch(() => { });
    }
  }, [tier]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScreenContainer
      /* 🔴 §15.1's RIDGE, AND HOME IS THE ONLY SCREEN IN THE APP THAT PASSES THIS. The primitive is
         rendered by 25 screens and the prop is opt-in for exactly that reason — see its declaration.
         §15.3 supplies this mount as a VERBATIM reference instance (top 86, behind the header, with
         the crest dot), so the position is transcribed rather than chosen. §15.2's per-screen budget
         is one ridge, one arc and one plate; this screen spends the ridge and the arc, and no plate. */
      ridge
      scrollViewProps={{ showsVerticalScrollIndicator: false }}
      contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, paddingBottom: bottomPad }}
    >
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        {/* §10.1's element inventory gives the greeting the eyebrow step. String untouched; the
            casing is a textTransform render (C-6). */}
        <Text
          {...t.txt('overline')}
          style={{ ...t.txt('overline').style, color: t.color['fg-muted'], textTransform: 'uppercase' }}
        >
          {getGreeting()},
        </Text>
        {/* 🔴 §17.1 — THE NAME COMES DOWN A STEP, AND THIS WAS A LIVE VIOLATION. Two display
            moments in one viewport cancel each other; §17.3 assigns Home's ONE display moment to
            the energy numeral, and §10.1.0's finding (ii) rules explicitly that the comp draws it
            TWICE and that §17 governs. The step below also carries §10.1's own load-bearing reason
            — it "leaves room for a long name at 320dp" — so coming down is a layout fix as well as
            a hierarchy one. The energy numeral takes the top step in DailyInsightCard. */}
        <Text {...t.txt('display-md')} style={{ ...t.txt('display-md').style, color: t.color.fg }}>
          {user?.name || profile?.name || 'Guest'}
        </Text>
        {/* 🔴 C-1 CLOSES HERE, ON THE OPTION §10.1.0's FINDING (i) RESOLVED IT TO, AND THREE THINGS
            WERE WRONG AT ONCE.
            (1) THE STRING WAS CONSTRUCTED FROM A RAW TIER SLUG. It read the tier field and
                UPPERCASED it, so the surface displayed an internal enum value — the same class as
                O-27's raw tier slug in body copy. profile.tsx's own display map is the single
                source for a tier's user-facing name, and it is what this now renders.
            (2) 🔴 NO toUpperCase() ON A COPY-LOCKED STRING. Those names are PM-owned (audit §6.3),
                and case-folding a locked string in JS is an EDIT that no copy review can see,
                because the source no longer contains what renders. Casing is a textTransform in
                the style, always — then `git diff` shows the string is untouched.
            (3) IT WAS THE ACCENT ROLE. §10.1's inventory is explicit: "status only. Not a pill, not
                accent — accent means ACTION here, and a plan name is not an action." That is
                §16.2's sentence one token over. It takes the meta role at the small step.
            ⚠️ Option (b) IS a copy change, so §6.3's PM sign-off on tier display names still
            applies; what ships is the map's own literal, unedited. */}
        <Text
          {...t.txt('text-2xs')}
          style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], marginTop: t.space['2'] }}
        >
          {TIER_DISPLAY_NAME[tier as keyof typeof TIER_DISPLAY_NAME] ?? TIER_DISPLAY_NAME.free}
        </Text>

        {/* Streak Badge
            🔴 §10.1.0's MECHANISM 4(a) — the pill ABANDONS THE RIGHT MARGIN. It is one of the four
            deliberate breaks from the uniform gutter, and it is invariant-safe by construction:
            X11's height and its DERIVED radius are inside the component and are not touched here,
            so the pill's shape is unchanged and only its x moves.
            ⚠️ IT SITS FLUSH TO THE SCREEN EDGE RATHER THAN CROPPED, AND THAT IS A DELIBERATE
            READING OF "bleeds off". A true crop would need one corner squared, and that corner is
            `cfg.height / 2` INSIDE StreakBadge — X11's coupled pair, which is preserve-blindly and
            whose "just use padding and a pill class" restyle is banned on that component by name.
            Abandoning the margin is the half of the mechanism that costs no invariant; the crop is
            registered for a designer. */}
        {streakData && streakData.currentStreak > 0 && (
          <View className="mt-4" style={{ alignSelf: 'flex-end', marginRight: -t.space['6'] }}>
            <StreakBadge streak={streakData.currentStreak} />
            {streakData.currentStreak === streakData.longestStreak && streakData.currentStreak > 1 && (
              /* §10.1's inventory: the celebration pictograph is DROPPED — "decorative, not
                 expressive" — and the COPY IS UNCHANGED. */
              <Text className="text-accent text-sm mt-2 text-right">
                Personal record!
              </Text>
            )}
          </View>
        )}

        {/* Astrology & Numerology Badge */}
        {profile && profile.sunSign && profile.lifePathNumber && (
          <View className="mt-4">
            <AstroNumeroBadge
              sunSign={profile.sunSign}
              lifePathNumber={profile.lifePathNumber}
              size="medium"
            />
          </View>
        )}
      </View>

      {/* Today's Insight
          🔴 §10.1's STRUCTURAL CHANGE — THE HERO MOVES ABOVE THE QUICK ACTIONS. Verbatim: "the
          daily insight is the only card-weight object above the fold, quick actions become a two-up
          pair BENEATH IT". §10.1.1 confirms the direction from the other side: in the FIRST-RUN
          state "quick actions move ABOVE the insight", which is only a state if the populated order
          is the reverse. It was the reverse.
          🔴 §10.1.0's MECHANISM 4(b) — the hero ABANDONS THE RIGHT MARGIN: curved on the left,
          flush on the right. So the gutter is asymmetric here and ONLY here, and the card squares
          its two right corners through an opt-in prop rather than unconditionally, because the same
          card renders inside gutters elsewhere.
          ⚠️ The word for a softened corner is deliberately absent from this comment — the gate greps
          its bare form, so a sentence about corners re-opens a counter that reads 0. It cost a hit
          here before this wording (CLAUDE.md: there is no spelling that satisfies every tool).
          ⚠️ Turn 8a's own cost note applies to this card and it is a MOTION constraint. 🔴 IT IS
          LIVE NOW rather than hypothetical — motion was un-cut on 2026-08-04 — and it is the reason
          the entrance helper takes an opacity-only mode at all: a vertical translate on a
          flush-edge card visibly CLIPS against the screen edge. This card gets the opacity-only
          entrance and never the 8dp rise. */}
      <View className="pl-6 mb-6">
        {/* §10.1's inventory sets the section titles a step below the hero (§17.1: "everything else
            stays at display-sm or below"), in the DISPLAY face — a size utility carries no face, so
            this was rendering the body face at the display size (O-35's class). */}
        <Text {...t.txt('display-sm')} style={{ ...t.txt('display-sm').style, color: t.color.fg }} className="mb-3">
          Today's Insight
        </Text>

        {isLoadingDaily ? (
          <View className="bg-surface rounded-lg p-6 items-center justify-center" style={{ height: 200 }}>
            <ActivityIndicator color={t.color.accent} />
          </View>
        ) : (
          <DailyInsightCard
            insight={dailyInsight}
            isTeaser={false}
            flushRight
            onTap={() => router.push('/astrology/daily' as any)}
          />
        )}
      </View>

      {/* Quick Actions */}
      <View className="px-6 mb-6">
        <Text {...t.txt('display-sm')} style={{ ...t.txt('display-sm').style, color: t.color.fg }} className="mb-4">
          Start a Reading
        </Text>
        {/* 🔴 X13 — UI-audit §5.1, HARD. The four explicit dimensions in this file (the two 140s
            here and at the Palm tile, the 200 floor on the Key Dates card, and the 72 on the
            record row) are iOS-PRODUCTION flex-collapse guards from commit 6525a75. Until this
            comment they had NO in-file record at all — the only trace was that commit message,
            which is why primitives-plan §2.4 requires the comment to land in whichever commit
            first touches the file. 🔴 On Android they are literal no-ops (6525a75: "Android
            unchanged — flex propagation works there, explicit dimensions are no-ops"), so
            deleting them looks free on every device this project can build. It is not. */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={{ flex: 1, height: 140 }}   /* X13 — see above. Do not remove. */
            onPress={() => {
              if (profile?.faceReading) {
                showAlert(
                  'Face Reading Available',
                  'You already have a face reading.',
                  [
                    { text: 'View Reading', onPress: () => router.push('/(main)/readings/face' as any) },
                    { text: 'Update Image', onPress: () => router.push('/(capture)/face-capture') },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              } else {
                router.push('/(capture)/face-capture');
              }
            }}
          >
            {/* 🔴 §15.1's BLOB, AND IT IS A SIBLING RATHER THAN A MASK — that distinction is X17's:
                a mask would change what an `overflow: 'visible'` well clips, which is an invariant.
                It sits UNDER the tile's own fill and is inert. The seed's scope is PER SCREEN by
                ruling (per-USER seeding was a prompt suggestion the owner did not take). */}
            <View style={{ position: 'absolute', top: -8, left: -8 }} pointerEvents="none">
              <BlobField size={156} tint="accent" seed={1} />
            </View>
            {/* 🔴 THE SLAB RETIRES AND THE NODE SURVIVES — equal stops, the mechanism §10.2.4
                specifies for X3's button. §10.1's inventory says these two "gradient slabs become
                one aura each", and turn 9 supersedes the drawn radial with the §15 blob above; §2's
                aura row retires every slab except the primary control's fill. What it buys is that
                the on-fill label now has ONE published figure (6.86:1) instead of a figure that
                depended on its position in the box (O-73). */}
            <LinearGradient
              colors={[t.color.accent, t.color.accent]}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: t.radius.md,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 16,
              }}
            >
              {/* §10.1's inventory maps this pictograph to this glyph BY NAME. On an accent fill an
                  Ionicon's colour is load-bearing in a way an emoji's never was, so it takes the
                  on-fill role — the only legal foreground here. Retires a GLYPH exception. */}
              <Ionicons name="person-outline" size={40} color={t.color['on-accent']} style={{ marginBottom: 8 }} />
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color['on-accent'] }}>Face</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* 🔴 §10.1.0's MECHANISM 4(c) — the Palm tile DROPS against Face, with mismatched corners
              taken from the radius scale. 🔴 AND THE DROP IS A MARGIN, NEVER A HEIGHT: turn 8a's own
              invariant audit says "X13 tiles 140 — offset via margin — the container grows, the
              tiles' own height never moves". Both tiles keep that height; only this one's top margin
              moves, so X13 is untouched by construction rather than by care.

              🔴 THE DROP IS `t.space['8']` NOW, DOUBLED FROM `t.space['4']`, AND IT IS AN OWNER
                 RULING RATHER THAN A CORRECTION. §10.1.0 specifies the smaller value and the
                 smaller value is exactly what shipped — so this is not a site that drifted from
                 the design, it is the design's own number being read on a device and judged.
                 The ruling: the stagger is this screen's ONE structural gesture, and at 11% of the
                 tile's height it reads as a misaligned pair rather than as a decision. Aligning
                 them — the obvious "fix" — would delete the gesture. So it goes the other way.
                 At 23% of the tile height it can only be deliberate.
              ⚠️ IT IS A STEP ON THE AUTHORING VOCABULARY, NOT A NUMBER THAT LOOKED RIGHT. §4.2
                 names this step the block break, which is the meaning wanted: not spacing between
                 two things, a break between them. The next step up is the major break and would
                 start to read as two separate rows. */}
          <TouchableOpacity
            style={{ flex: 1, height: 140, marginTop: t.space['8'] }}   /* X13 — see the block above. Do not remove the height. */
            onPress={() => {
              if (profile?.palmReading) {
                showAlert(
                  'Palm Reading Available',
                  'You already have a palm reading.',
                  [
                    { text: 'View Reading', onPress: () => router.push('/(main)/readings/palm' as any) },
                    { text: 'Update Image', onPress: () => router.push('/(capture)/palm-capture') },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              } else {
                router.push('/(capture)/palm-capture');
              }
            }}
          >
            {/* 🔴 THE SECOND BLOB WAS MISSING. §10.1.0's mechanism 5 specifies TWO — "Face: accent
                from the top-right · Palm: accent-2 from the bottom-left" — and item 19 mounted one.
                🔴 IT IS ALSO WHAT MAKES THIS TILE'S FILL LEGAL: the tile ran an iris-to-clay slab,
                and a tile that navigates to a capture screen IS an action, so §16.2 forbids the
                secondary accent on it outright. The iris moves onto the decorative blob, where
                §16.2's own qualifier puts it — "the row it sits in may be pressable; the marker
                itself is not the affordance" — and §15.1 lists exactly that tint for this
                primitive. Same convention removed from welcome's feature list at screen 2.
                It is a SIBLING, not a mask: a mask would change what X17's clip guard lets through
                on the icon wells, and X17 is preserve-blindly.
                ⚠️ Two words are avoided in this paragraph on purpose — the one for a clipping mode
                and the one for the state it is set to. Both are bare utilities, and BOTH emitted a
                live rule out of an earlier draft of this very comment; `--diff` was the only witness
                (O-69: do not reason about which words are safe, just run it). */}
            <View style={{ position: 'absolute', bottom: -8, left: -8 }} pointerEvents="none">
              <BlobField size={156} tint="accent-2" seed={2} />
            </View>
            <LinearGradient
              colors={[t.color.accent, t.color.accent]}
              style={{
                width: '100%',
                height: '100%',
                /* Mismatched corners, both from the scale — mechanism 4(c). */
                borderRadius: t.radius.lg,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 16,
              }}
            >
              <Ionicons name="hand-left-outline" size={40} color={t.color['on-accent']} style={{ marginBottom: 8 }} />
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color['on-accent'] }}>Palm</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔴 §15.3's SECOND REFERENCE INSTANCE, and it is the one place in the app that spends the
          arc budget: §15.1 allows ONE hairline replacement per screen, and this is the divider the
          comp draws — before This Month, at the stronger tone. ⚠️ That budget is on REPLACEMENT and
          not on hairlines: §4.5's tier-2 rule still governs every other divider here. */}
      {monthlyReading && (
        <View className="px-6" style={{ marginTop: 26 }}>
          <ArcDivider width={windowWidth - 48} />
        </View>
      )}

      {/* This Month Preview */}
      {monthlyReading && (
        <View className="px-6 mb-6">
          <Text {...t.txt('display-sm')} style={{ ...t.txt('display-sm').style, color: t.color.fg }} className="mb-3">
            This Month
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/astrology/monthly' as any)}
            className="bg-surface rounded-lg p-6"
            /* 🔴 X13 — HARD, and this one has an OPEN OWNER DECISION beside it. The 2.1 design
               proposed deleting this floor because it forces 200dp of empty card when keyDates
               filters to zero; owner ruling 2026-07-29 is that it STAYS, pending an iOS device
               check, with the empty case rendered as a short centred line of muted copy inside
               it rather than as whitespace. UI-audit §5.1 X13 and design §12. Do not remove.
               🔴 THE FLOOR IS HONOURED AND THE EMPTY-CASE LINE IS NOT WRITTEN, AND THAT IS §0.0
               RULE 2 BEATING §0.0 RULE 1 ON A CONFLICT. The ruling asks for "a short centred line of
               muted copy" and NAMES NO STRING; there is no such string anywhere in the app to move
               here, so delivering it means AUTHORING user-facing copy, which rule 2 forbids
               outright and which §8's standing default (ship the source string, never the design's
               proposal) forbids again. So the branch still renders nothing and the card still holds
               its floor — the shipped behaviour, unchanged — and the missing string is registered as
               a copy call rather than invented in a restyle. It is the ONE part of Home's adopted
               treatment this commit does not deliver, and it is blocked on a person, not on work.
               ⚠️ Do not "finish" this by writing a sentence. */
            style={{ minHeight: 200 }}
          >
            <Text className="text-accent text-lg font-body-semi mb-2">
              {monthlyReading.theme}
            </Text>
            <Text className="text-fg-muted text-sm mb-3" numberOfLines={2}>
              {monthlyReading.overview}
            </Text>
            {monthlyReading.keyDates && monthlyReading.keyDates.length > 0 && (() => {
              // Filter to only show upcoming dates (today or later)
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const upcomingDates = monthlyReading.keyDates.filter((keyDate: any) => {
                try {
                  // Try to parse the date string (e.g. "February 14-16", "Feb 20")
                  const dateStr = keyDate.date || '';
                  // Extract the last number in the date range as the end date
                  const nums = dateStr.match(/\d+/g);
                  if (!nums || nums.length === 0) return true; // keep if unparseable
                  const dayNum = parseInt(nums[nums.length - 1], 10);
                  const checkDate = new Date(today.getFullYear(), today.getMonth(), dayNum);
                  return checkDate >= today;
                } catch {
                  return true; // keep if we can't parse
                }
              });
              return upcomingDates.length > 0 ? (
                <View>
                  <Text className="text-fg text-xs font-body-semi mb-2">Key Dates:</Text>
                  {upcomingDates.slice(0, 2).map((keyDate: any, index: number) => (
                    <Text key={index} className="text-fg-muted text-xs mb-1">
                      • {keyDate.date}: {keyDate.significance}
                    </Text>
                  ))}
                </View>
              ) : null;
            })()}
            <Text className="text-accent text-sm mt-3">View Full Reading →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Features
          ═══ 🔴 EXPLORE: SEVEN CARDS BECOME ONE DIVIDER LIST IN THREE LABELLED GROUPS ═══════════

          §10.1's inventory and §10.1.3 together: "7 Cards → 1 divider list", rows at 64 with no
          card, "emoji circles → Ionicons 20dp in the meta role", and — drawn by turn 8a and
          therefore settled rather than offered — the GROUPED variant, three groups each with an
          eyebrow heading and a divider break.

          🔴 THE GROUPING'S ARGUMENT IS THE ONE WORTH KEEPING, because it is not an aesthetic
          preference. Seven radial-symmetric line glyphs at 20dp blur into one another in
          PERIPHERAL vision, which is the vision you use when targeting without reading. The design
          rejects the two obvious levers by name: a bigger glyph is more legible when LOOKED AT, not
          more distinguishable when SCANNED, and re-colouring rebuilds the decorative idiom being
          removed. What made the old circles work was never hue — it was stable, position-
          independent identity, and POSITION supplies that more cheaply. Targeting becomes "second
          group, first row", which survives a monochrome palette for the cost of one text style.
          ⚠️ It does NOT retire O-9's device squint test; it makes it less load-bearing.

          🔴 AND IT REMOVES SEVEN SATURATED DISCS, EACH HOLDING AN EMOJI ON AN ACCENT FILL — the
          same §9.2 violation and the same latent A5 pair welcome's feature list carried, seven more
          times, on the app's highest-traffic screen. One of them was on the SECONDARY accent inside
          a row that navigates, which §16.2 forbids. All seven questions go with the fills.

          🔴 FIVE TEXT-GLYPH CHEVRONS GO WITH THEM. §9.2 bans a text glyph as an icon outright and
          names the element: the forward chevron at 20dp in the accent. The character used is
          C-P4-3's class — absent from the body face, resolved through the platform's symbol-font
          fallback — so those five rows were drawing their affordance in a font nobody chose.

          ⚠️ FOUR OF THE SEVEN GLYPH NAMES ARE SPECIFIED AND THREE ARE NOT, AND THE SPLIT IS
          RECORDED RATHER THAN SMOOTHED OVER. The tab bar fixes this app's glyph for astrology,
          numerology and compatibility, and §9.2 fixes the readings one; the report, the name reading
          and the career reading have no named glyph, so those three are the DIRECT TRANSLATION of
          the pictograph they replace (a moon, a text mark, a compass) — the same method §10.1 uses
          when it maps the two capture pictographs by name. Registered for designer confirmation.

          ⚠️ THE "NEW" MARKERS SURVIVE. §10.1's inventory removes the PLUS pills, which are TIER
          claims; a NEW marker is §16.1's own listed use. */}
      <View className="px-6 mb-6">
        <Text {...t.txt('display-sm')} style={{ ...t.txt('display-sm').style, color: t.color.fg }} className="mb-4">
          Explore
        </Text>

        {/* 🔴 THE GROUP HEADINGS ARE GONE — OWNER/PM RULING, 2026-08-06, and this is the SECOND
            restructure of this list in two days. The first moved a heading; this removes the layer.

            WHAT THE OWNER RULED: fold the two GUIDANCE rows into the first group and delete
            GUIDANCE. WHAT THAT LEFT: a first group holding Astrology, Numerology, Cosmic Report and
            AI Astrologer — and "CHARTS & NUMBERS" describes neither new member. A conversational
            astrologer is not a chart and not a number, so the heading would have been actively
            wrong on two of its own four rows rather than merely loose.

            TWO OPTIONS WERE PUT UP AND (b) IS TAKEN, per §0.0 rule 1 (never stall; take the
            CONSERVATIVE option, which is the one that INVENTS NO COPY):
              (a) rename the first group — needs a word from PM, because it is marketing copy and
                  §0.0 rule 2 forbids authoring one here. REGISTERED as the alternative;
              (b) 🟢 DROP THE HEADINGS ENTIRELY. With GUIDANCE gone there were only two groups left
                  and one no longer described the rows beneath it, so the layer was carrying one working
                  label. The rows already differentiate by icon, label and position.
            🔴 ONE LINE REVERSES IT: if PM supplies a name, re-wrap in the deleted `ExploreGroup`.

            ⚠️ WHAT THIS COSTS, STATED RATHER THAN GLOSSED. §10.1.3's argument for grouping was NOT
               aesthetic: seven radial-symmetric line glyphs at 20dp blur together in PERIPHERAL
               vision, and POSITION was the cheap replacement for the hue identity the emoji discs
               used to carry ("second group, first row"). A flat list gives back a row NUMBER
               ("fourth row") but not the coarse two-level target the grouping bought. That is the
               trade the ruling accepts; O-9's device squint test becomes load-bearing again.

            ROW ORDER IS THE OWNER'S PLACEMENT, FLATTENED — the two former GUIDANCE rows sit where
            the ruling put them (inside the first group, i.e. after Numerology), and the three
            Destiny rows keep their order below. No row changed neighbours except across the two
            deleted breaks. */}
        <View className="border-t border-border-subtle">
          <ExploreRow
            icon="planet-outline"
            title="Astrology"
            subtitle="Birth chart & predictions"
            onPress={() => router.push('/(main)/astrology')}
          />
          <ExploreRow
            icon="calculator-outline"
            title="Numerology"
            subtitle="Life path & destiny numbers"
            onPress={() => router.push('/(main)/numerology')}
          />
          <ExploreRow
            icon="moon-outline"
            title="Personalized Cosmic Report"
            subtitle="Astrology, numerology and palm reading"
            onPress={() => router.push('/(main)/readings/cosmic-report' as any)}
            trailing={<NewBadge />}
          />
          {/* AI Astrologer (Q&A) — same entry point as the Readings-tab card
              (`/(main)/readings/qa`). Identical for free/paid; gating is
              enforced SERVER-SIDE inside the chat, so no tier pill here. */}
          <ExploreRow
            icon="sparkles-outline"
            title="AI Astrologer"
            subtitle="Ask about love, career, or what's next"
            onPress={() => router.push('/(main)/readings/qa' as any)}
            trailing={<NewBadge />}
          />
          {/*
            R1 (2026-07-31) — Name Destiny and Career Destiny: the server owns entitlement,
            the client is a renderer. Both taps ALWAYS route and the destination decides;
            readings.routes.ts:32/:38 already return a 403. Deliberately NO lock affordance
            and NO tier pill on either row: eligibility is a monthly NameAnalysis document
            count (Name) and a staleness check (Career), neither of which any hub payload
            carries. The client genuinely does not know, so it must not imply that it does —
            same deliberate pattern as the Q&A entry at readings/index.tsx:121.
            Do not re-add a pill or a lock plate without a server field. UI-audit §5.7.
            🔴 NEITHER RESTRUCTURE CHANGED THIS. Both rows are still bare and still always route;
            grouping and ungrouping are layout changes, and a lock affordance would need a
            server field that does not exist.
          */}
          <ExploreRow
            icon="heart-outline"
            title="Compatibility"
            subtitle="Find your perfect match"
            onPress={() => router.push('/(main)/compatibility')}
          />
          <ExploreRow
            icon="text-outline"
            title="Name Destiny"
            subtitle="Your name's cosmic power"
            onPress={() => router.push('/(main)/numerology/name-destiny' as any)}
          />
          <ExploreRow
            icon="compass-outline"
            title="Career Destiny"
            subtitle="Your ideal career paths"
            onPress={() => router.push('/(main)/readings/career-destiny' as any)}
            last
          />
        </View>
      </View>

      {/* Recent Readings */}
      <RecentReadings
        profile={profile}
        compatibilityReadings={compatibilityReadings}
        nameDestiny={nameDestiny}
        careerDestiny={careerDestiny}
        router={router}
      />

      {/* 🔴 P49 CLOSES HERE — R-2, AND IT WAS A COMPLIANCE GAP, NOT A DESIGN GAP.
          Home renders LLM output (the daily insight, its headline, its Do/Avoid pair and three
          category summaries) and carried NO disclaimer at all, while seven other reading-output
          screens carry one. X8's requirement is a legible disclaimer on every reading-output
          screen; this screen qualifies on the same grounds as those seven and is the app's
          highest-traffic surface.
          🔴 IT IS THE EXISTING COMPONENT, SO NOTHING IS AUTHORED. The string is X8-HARD and
          PM/compliance-owned (audit §6.2); the component renders it, so the count of divergent
          disclaimer strings in the app does NOT rise — which matters, because audit Q3 asks the
          owner whether the six existing ones should be consolidated and that question is still
          open. Adding a seventh spelling would have pre-empted a legal call.
          🔴 AND NO PLATE MAY EVER SIT BESIDE IT — §14.5 bans a plate next to any disclaimer, which
          is what protects a compliance string from reading as decoration. Home's one plate is
          inside the insight hero, several sections up.
          ⚠️ It sits ABOVE the bottom inset, not inside it: the inset is applied once, on
          contentContainerStyle, and that wiring is an Android clipping FIX (X13's neighbourhood) —
          untouched here. */}
      <View className="px-6 pt-4 border-t border-border-subtle">
        <EntertainmentDisclaimer />
      </View>
    </ScreenContainer>
  );
}

/* 🔴 `ExploreGroup` WAS DELETED HERE, 2026-08-06, WITH THE HEADINGS IT RENDERED. It wrapped an
   eyebrow-step label over a divider break and had three call sites; the ruling above removes the
   layer, so the component goes with it rather than surviving at zero call sites. That is the same
   rule the motion module states about an exported hook nobody calls: finished-looking work that
   does nothing, and the thing a later reader assumes is wired.
   ⚠️ Restoring it is the (a) branch of that ruling and needs one word from PM. */

function ExploreRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      /* h 64 per §10.1's inventory — and it is a MINIMUM rather than a fixed height, so a title
         that wraps at 320dp or under dynamic type grows the row instead of clipping. The 48dp
         target the token-level a11y half already shipped is covered by it with margin. */
      style={{ minHeight: 64 }}
      className={`flex-row items-center${last ? '' : ' border-b border-border-subtle'}`}
    >
      {/* 20dp in the meta role — §10.1's inventory, exactly. The glyph is decorative: the title
          beside it carries the meaning, so it is hidden from the a11y tree rather than labelled. */}
      <Ionicons
        name={icon}
        size={20}
        color={t.color['fg-muted']}
        style={{ marginRight: t.space['4'] }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View className="flex-1 py-3">
        <Text className="text-fg font-body-semi text-base">{title}</Text>
        <Text className="text-fg-muted text-sm">{subtitle}</Text>
      </View>
      {trailing ?? (
        /* §9.2's named element and size, in the accent — replacing a text glyph that is absent from
           the body face and was resolving through the platform's symbol fallback (C-P4-3's class). */
        <Ionicons name="chevron-forward" size={20} color={t.color.accent} />
      )}
    </TouchableOpacity>
  );
}

/**
 * 🔴 §10.1's inventory, verbatim: "The 5 relationship-type emoji + rgba backgrounds collapse to one
 * chevron and a type label." So this map loses BOTH of its fields and becomes what it always
 * actually was — a relationship type's user-facing NAME.
 *
 * What that removes, and none of it is cosmetic:
 *   · five 44dp discs, each an ad-hoc 30% wash of a different role, one of them of the SECONDARY
 *     accent and one of the META foreground — a foreground token used as a FILL, which is O-26's
 *     role-vs-dimension class and passes every gate because the name is legal;
 *   · five pictographs rendering as icons, which §9.2 bans outright, two of them the SAME
 *     pictograph for two different types (so the signal was already ambiguous);
 *   · and the reason the discs existed at all — to distinguish types by hue — which a LABEL does
 *     unambiguously, in a way that survives a monochrome palette and a screen reader.
 * ⚠️ The type names are new user-facing strings only in the sense that they replace pictographs
 *    that said the same thing. Registered for PM confirmation rather than treated as free.
 */
const relTypeLabel: Record<string, string> = {
  love: 'Love',
  friend: 'Friendship',
  business: 'Business',
  parent_child: 'Parent & child',
  sibling: 'Siblings',
};

interface RecentItem {
  key: string;
  type: string;
  title: string;
  subtitle: string;
  /** The type label shown where the pictograph disc used to be, or undefined for a reading. */
  typeLabel?: string;
  timestamp: number;
  onPress: () => void;
}

function RecentReadings({ profile, compatibilityReadings, nameDestiny, careerDestiny, router }: any) {
  const items = useMemo(() => {
    const list: RecentItem[] = [];

    // Face reading
    if (profile?.faceReading) {
      const ts = profile.images?.face?.uploadedAt
        ? new Date(profile.images.face.uploadedAt).getTime()
        : 0;
      const archName = typeof profile.faceReading.archetype === 'string'
        ? profile.faceReading.archetype
        : (profile.faceReading.archetype as any)?.name || 'View your reading';
      list.push({
        key: 'face',
        type: 'face',
        title: 'Face Reading',
        subtitle: archName,
        timestamp: ts,
        onPress: () => router.push('/(main)/readings/face' as any),
      });
    }

    // Palm reading
    if (profile?.palmReading) {
      const ts = profile.images?.palmDominant?.uploadedAt
        ? new Date(profile.images.palmDominant.uploadedAt).getTime()
        : 0;
      list.push({
        key: 'palm',
        type: 'palm',
        title: 'Palm Reading',
        subtitle: 'View your reading',
        timestamp: ts,
        onPress: () => router.push('/(main)/readings/palm' as any),
      });
    }

    // Compatibility readings
    if (compatibilityReadings) {
      compatibilityReadings.forEach((reading: any) => {
        list.push({
          key: `compat-${reading._id}`,
          type: 'compatibility',
          title: 'Compatibility',
          subtitle: `with ${reading.partnerName}`,
          typeLabel: relTypeLabel[reading.relationshipType] ?? relTypeLabel.love,
          timestamp: reading.createdAt ? new Date(reading.createdAt).getTime() : 0,
          onPress: () => router.push(`/(main)/compatibility/${reading._id}` as any),
        });
      });
    }

    // Name Destiny
    if (nameDestiny) {
      list.push({
        key: 'name-destiny',
        type: 'name_destiny',
        title: 'Name Destiny',
        subtitle: nameDestiny.fullName || "Your name's cosmic power",
        timestamp: nameDestiny.generatedAt ? new Date(nameDestiny.generatedAt).getTime() : 0,
        onPress: () => router.push('/(main)/numerology/name-destiny' as any),
      });
    }

    // Career Destiny
    if (careerDestiny) {
      list.push({
        key: 'career-destiny',
        type: 'career_destiny',
        title: 'Career Destiny',
        subtitle: 'Your ideal career paths',
        timestamp: careerDestiny.generatedAt ? new Date(careerDestiny.generatedAt).getTime() : 0,
        onPress: () => router.push('/(main)/readings/career-destiny' as any),
      });
    }

    // Sort by timestamp descending (newest first), 0-timestamp items go to end
    list.sort((a, b) => {
      if (a.timestamp === 0 && b.timestamp === 0) return 0;
      if (a.timestamp === 0) return 1;
      if (b.timestamp === 0) return -1;
      return b.timestamp - a.timestamp;
    });

    return list.slice(0, 5);
  }, [profile, compatibilityReadings, nameDestiny, careerDestiny]);

  return (
    <View className="px-6 mb-6">
      <View className="flex-row justify-between items-center mb-4">
        <Text {...t.txt('display-sm')} style={{ ...t.txt('display-sm').style, color: t.color.fg }}>
          Recent Readings
        </Text>
        <TouchableOpacity onPress={() => router.push('/(main)/readings')}>
          <Text className="text-accent text-sm font-body-semi">View All</Text>
        </TouchableOpacity>
      </View>

      {items.length > 0 ? (
        <View style={{ gap: 12 }}>
          {items.map((item, i) => (
            <TouchableOpacity key={item.key} onPress={item.onPress} accessibilityRole="button">
              {/* 🔴 X13's fourth site — UI-audit §5.1, HARD. An iOS-prod collapse guard from
                  6525a75, a no-op on Android. Do not remove. */}
              {/* §5.4's card entrance, staggered by row. 🔴 X13's guard above is a DIMENSION and is
                  untouched — the entrance is opacity + transform only, appended inside the primitive. */}
              <Card index={i} style={{ minHeight: 72, justifyContent: 'center' }}>
                <View className="flex-row items-center">
                  {/* 🔴 §10.1's inventory: the pictograph disc collapses to a TYPE LABEL and a
                      chevron. See relTypeLabel for what the disc was hiding — five ad-hoc washes,
                      one of them a FOREGROUND token used as a fill, and two types sharing one
                      pictograph. A reading has no type label, so the row is title + subtitle only
                      and nothing is reserved for an absent one. */}
                  <View className="flex-1">
                    <Text className="text-fg font-body-semi">{item.title}</Text>
                    <Text className="text-fg-muted text-sm" numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  {item.typeLabel && (
                    <Text
                      {...t.txt('overline')}
                      style={{ ...t.txt('overline').style, color: t.color['fg-muted'], textTransform: 'uppercase', marginRight: t.space['3'] }}
                    >
                      {item.typeLabel}
                    </Text>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={t.color.accent} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Card>
          <Text className="text-fg-muted text-center py-8">No readings yet</Text>
        </Card>
      )}
    </View>
  );
}
