import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { LockShell } from '@/components/ui/LockShell';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import api from '@/lib/api';
import * as Haptics from 'expo-haptics';
import { ShareCard } from '@/components/ShareCard';
import { recordMeaningfulAction } from '@/store/reviewStore';
import * as t from '@/theme';

// 🔴 O-24 (owner ruling, 2026-07-31) EXTENDED TO THIS MAP, on the ruling's own logic.
//    A SIX-hue qualitative palette does not exist in a one-accent system, and there is no
//    legal sixth token: `accent-2` means premium/brand and nothing else (§16), so a category
//    tint there is exactly the "generic second colour" drift §16 exists to prevent, and the
//    only remaining candidates are two near-identical neutrals. The CATEGORY NAME is already
//    rendered next to the chip, so the hue was decoration carrying no information.
//    ⚠️ REGISTERED FOR CONFIRMATION: the ruling named the 3-band SCORE ladder explicitly;
//       this map is a category ladder, extended here because reason (b) applies identically.
//       If a real qualitative palette is wanted it belongs to the screens phase.
const IMPACT_TINT = t.color.accent;

export default function NameDestiny() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const bottomPad = useBottomInsetPadding();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [credits, setCredits] = useState<{ creditsRemaining: number; resetsOn: string } | null>(null);
  const [showResults, setShowResults] = useState(false);
  // Opens the form over an existing analysis. It is a separate flag from `showResults` and not its
  // inverse: the two answer different questions, and collapsing them would make "I have a credit
  // and want to spend it" indistinguishable from "I tapped through to look at the old one".
  const [showForm, setShowForm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  // nameCompleteness only set on the POST response (not GET /name-destiny which returns
  // the persisted analysis without the live completeness assessment). When absent or
  // 'high', no disclaimer banner shows.
  const [nameCompleteness, setNameCompleteness] = useState<{
    level: 'high' | 'medium' | 'low';
    warnings: string[];
  } | null>(null);

  // Pre-fill name from profile
  useEffect(() => {
    const name = profile?.name || user?.name || '';
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 3) {
        setFirstName(parts[0]);
        setMiddleName(parts.slice(1, -1).join(' '));
        setLastName(parts[parts.length - 1]);
      } else if (parts.length === 2) {
        setFirstName(parts[0]);
        setLastName(parts[1]);
      } else if (parts.length === 1) {
        setFirstName(parts[0]);
      }
    }
    fetchExisting();
  }, []);

  // Record a meaningful action once the name-destiny analysis is present
  // (deduped one-time by reviewStore). Covers both the freshly-generated
  // POST result and the cached GET result on revisit.
  useEffect(() => {
    if (!analysis) return;
    recordMeaningfulAction('reading:nameDestiny');
  }, [analysis]);

  const fetchExisting = async () => {
    try {
      const res = await api.get('/readings/name-destiny');
      if (res.success && res.data) {
        setAnalysis(res.data.analysis);
        setCredits(res.data.credits);
      }
    } catch (err: any) {
      /* 🔴 `O-27` — THE DEAD END WAS THIS BARE CATCH. The server answers this endpoint with a
         structured 403 for an unentitled user, and swallowing it meant the screen rendered its
         normal generate control; tapping it then printed the middleware's raw
         "requires <tier> subscription" string in the danger role, with NO upgrade path and an
         internal tier slug shown to the user. Reading the status here is what turns a dead end
         into a gate. §4.4 rules this the proper fix rather than the cancelled two-line stopgap,
         which would have added a FOURTH lock treatment in the phase that exists to collapse three
         into one. Any other failure keeps the old meaning: no existing analysis. */
      if (err?.response?.status === 403) setLocked(true);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAnalyze = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setIsLoading(true);
    setError(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await api.post('/readings/name-destiny', {
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
      });

      if (res.success && res.data) {
        setAnalysis(res.data.analysis);
        setCredits(res.data.credits);
        // The form was opened OVER an existing analysis; close it so the new result is what shows.
        // Paired with the flag's declaration, and it is the reason the flag is reset on SUCCESS
        // only — a failed post must leave the user on the form with their typing intact.
        setShowForm(false);
        setShowResults(true);
        if (res.data.nameCompleteness) {
          setNameCompleteness(res.data.nameCompleteness);
        }
      } else {
        setError(res.error || 'Failed to generate analysis');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to generate analysis';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDate = credits?.resetsOn
    ? new Date(credits.resetsOn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const hasUsedCredit = credits !== null && credits.creditsRemaining <= 0;

  // The same unlabelled branch as the career screen, byte for byte, and it was NOT reported —
  // which is the argument for sweeping the class rather than patching the site that was.
  if (isFetching) {
    return <LoadingSpinner text="Loading your name reading..." fullScreen />;
  }

  return (
    <ScreenContainer withScrollView={false}>
      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={t.color.fg} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-fg text-2xl font-body-bold">Name Destiny</Text>
          <Text className="text-fg-muted text-sm">Your name's cosmic blueprint</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Landing page: credit used, not viewing results */}
        {analysis && hasUsedCredit && !showResults ? (
          <>
            <View className="bg-surface rounded-lg p-5 mb-4 border border-border-subtle items-center">
              <Ionicons name="time-outline" size={32} color={t.color['fg-muted']} />
              <Text className="text-fg text-base font-body-semi mt-3 mb-1">Credit Used</Text>
              <Text className="text-fg-muted text-sm text-center">
                Credits reset on {resetDate}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: t.color['border-subtle'],
                paddingVertical: 14,
                borderRadius: t.radius.lg,
                alignItems: 'center',
                marginBottom: 12,
              }}
              disabled
            >
              <Text className="text-fg-muted font-body-bold text-lg">Analyze My Name</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowResults(true)}
              style={{
                backgroundColor: t.color.accent,
                paddingVertical: 14,
                borderRadius: t.radius.lg,
                alignItems: 'center',
              }}
              activeOpacity={0.8}
            >
              {/* 🔴 A5, LIVE AND REACHABLE — an accent FILL with the plain foreground on it, about
                  2.31:1. Same blindness as career-destiny's: the fill is an INLINE style, so the
                  pair rule cannot resolve it, and the label is 7 lines from the fill against a
                  four-line proximity window. */}
              <Text className="text-on-accent font-body-bold text-lg">View Past Reading</Text>
            </TouchableOpacity>
          </>
        ) : analysis && (showResults || !hasUsedCredit) && !showForm ? (
          <>
            {/* 🔴 THE DEAD END, AND IT IS REACHABLE EXACTLY ONCE A MONTH BY THE USERS WHO ARE
                ENTITLED TO SPEND. The server hands back the MOST RECENT analysis regardless of
                month, and separately a remaining count scoped to THIS month. So a user who
                analysed in a previous month arrives with an analysis AND a fresh credit — and
                this arm rendered the old result with no route to the form, no remaining count,
                and nothing to press. The credit was on the wire and unspendable.
                ⚠️ The count is READ from the response, never derived here. R1: the server owns
                   entitlement and the client is a renderer. `creditsRemaining` and `resetsOn` are
                   both server fields on this endpoint; nothing on this screen computes a cap.
                ⚠️ The control re-opens the FORM rather than posting, because this reading takes a
                   NAME as input — there is nothing to re-run without one. That is the difference
                   from the career screen, whose equivalent control posts directly because its
                   inputs are the user's other readings. */}
            {credits && credits.creditsRemaining > 0 && (
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="bg-surface rounded-lg p-4 mb-4 border border-border-subtle"
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="refresh" size={18} color={t.color.accent} />
                  <Text className="text-accent font-body-semi ml-2">
                    Analyze a new name (1 available this month)
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Completeness disclaimer — only renders when name appeared partial.
                When level is 'high' or unknown (legacy GET responses), banner is hidden. */}
            {nameCompleteness && nameCompleteness.level !== 'high' && (
              <View
                className="rounded-md p-3 mb-3 border border-border-subtle"
                style={{ backgroundColor: t.alpha(t.color.accent, 10) }}
              >
                <Text className="text-fg-secondary text-xs">
                  Based on the name you provided. Pythagorean numerology traditionally uses your full birth name as it appears on a birth certificate.
                </Text>
              </View>
            )}
            <AnalysisResults analysis={analysis} />

            {/* Share Card — the only site in the app that passes numerals.
                The per-numeral colour override is GONE from ShareCard's props: all three of these
                passed the accent it already defaulted to (ruling `O-24` — one colour), and a
                free-string colour prop is an ingress for a raw value past every token gate. */}
            <ShareCard
              title="Name Destiny"
              subtitle={analysis.fullName}
              insightLine={
                analysis.currentNameAnalysis?.overallAssessment
                  ? analysis.currentNameAnalysis.overallAssessment.split('.')[0] + '.'
                  : 'Your name carries a powerful cosmic blueprint.'
              }
              numbers={[
                { label: 'Expression', value: analysis.expressionNumber },
                { label: 'Soul Urge', value: analysis.soulUrgeNumber },
                { label: 'Personality', value: analysis.personalityNumber },
              ]}
              onShared={() => recordMeaningfulAction('share:nameDestiny')}
            />
          </>
        ) : (
          <>
            {/* The way back OUT of the re-opened form. Without it, opening the form over an
                existing analysis would be a one-way door — which is the same defect this item
                exists to close, rebuilt one screen deeper. It renders only when there is a
                reading to return to, so the first-run path is unchanged. */}
            {analysis && showForm && (
              <TouchableOpacity
                onPress={() => setShowForm(false)}
                className="mb-4"
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View className="flex-row items-center">
                  <Ionicons name="arrow-back" size={18} color={t.color.accent} />
                  <Text className="text-accent font-body-semi ml-2">Back to your reading</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Credit Indicator */}
            {credits && (
              <View className="bg-surface rounded-lg p-4 mb-4 flex-row items-center border border-border-subtle">
                <Ionicons
                  name={credits.creditsRemaining > 0 ? 'sparkles' : 'time-outline'}
                  size={20}
                  color={credits.creditsRemaining > 0 ? t.color.accent : t.color['fg-muted']}
                />
                <Text className="text-fg text-sm ml-3 flex-1">
                  {credits.creditsRemaining > 0
                    ? '1 analysis available this month'
                    : `Credits reset on ${resetDate}`}
                </Text>
              </View>
            )}

            {/* Educational header — explains why birth name matters. Tap (?) for deeper context. */}
            <View
              className="rounded-lg p-4 mb-4 flex-row items-start border border-border-subtle"
              style={{ backgroundColor: t.alpha(t.color.accent, 10) }}
            >
              <View className="flex-1 pr-3">
                <Text className="text-fg text-sm font-body-semi mb-1">Your Full Birth Name</Text>
                <Text className="text-fg-secondary text-xs">
                  Pythagorean numerology uses your full birth name as it appears on your birth certificate. The more accurate the name, the more accurate the reading.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowInfoModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={22} color={t.color.accent} />
              </TouchableOpacity>
            </View>

            {/* Input Form */}
            <Card className="mb-4">
              <Text className="text-fg text-lg font-body-bold mb-4">Enter Your Full Name</Text>

              {/* ADOPTION-EXEMPT(Input): three hand-rolled fields, deferred to the screens phase - they ground on the canvas, pin no height and have no focus state, so adopting is a VALUE change on a funnel-adjacent screen and not a restyle. */}
              {/* 🔴 THE THREE EDGES BELOW ARE THE CONTROL-BOUNDARY ROLE, 2026-08-04. They are real
                  text fields with no fill separation from the canvas, so at 1.16:1 they had no
                  identifiable boundary — `O-87` / `P62`. They still do not adopt the primitive for
                  the reason above, which is precisely why the ROLE had to be written at each of
                  them: the register's "one ruling at the primitive" only reaches the sites that
                  adopted it, and these three did not. 4.07:1 on this ground. */}
              <Text className="text-fg-muted text-xs mb-2">First Name *</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={t.color['fg-placeholder']}
                className="bg-bg text-fg rounded-md px-4 py-3 mb-3 border border-border-control"
                autoCapitalize="words"
              />

              <Text className="text-fg-muted text-xs mb-2">Middle Name (optional)</Text>
              <TextInput
                value={middleName}
                onChangeText={setMiddleName}
                placeholder="Middle name"
                placeholderTextColor={t.color['fg-placeholder']}
                className="bg-bg text-fg rounded-md px-4 py-3 mb-3 border border-border-control"
                autoCapitalize="words"
              />

              <Text className="text-fg-muted text-xs mb-2">Last Name *</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={t.color['fg-placeholder']}
                className="bg-bg text-fg rounded-md px-4 py-3 mb-4 border border-border-control"
                autoCapitalize="words"
              />

              {error && (
                <Text className="text-danger text-sm mb-3">{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleAnalyze}
                disabled={isLoading || (credits !== null && credits.creditsRemaining <= 0)}
                style={{
                  // V-6: a DISABLED ground is `surface-raised`, never a border token used as a fill.
                  backgroundColor: (credits !== null && credits.creditsRemaining <= 0) ? t.color['surface-raised'] : t.color.accent,
                  paddingVertical: 14,
                  borderRadius: t.radius.lg,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color={t.color['on-accent']} size="small" />
                    <Text className="text-on-accent font-body-bold ml-3">Calculating cosmic blueprint...</Text>
                  </View>
                ) : (credits !== null && credits.creditsRemaining <= 0) ? (
                  <Text className="text-fg-disabled font-body-bold">Resets on {resetDate}</Text>
                ) : (
                  <Text className="text-on-accent font-body-bold text-lg">Analyze My Name</Text>
                )}
              </TouchableOpacity>
            </Card>
          </>
        )}

        {/* Entertainment Disclaimer */}
        <View className="mb-8 px-4">
          <Text className="text-fg-muted text-xs text-center">
            For entertainment purposes only. Name numerology is based on Pythagorean traditions and should not be used as a basis for legal name changes.
          </Text>
        </View>
      </ScrollView>

      {/* Educational modal — opens from the (i) button on the header card */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View className="flex-1 bg-bg">
          <View className="px-6 py-4 border-b border-border-subtle flex-row items-center justify-between">
            <Text className="text-fg text-xl font-body-bold">Why does the name matter?</Text>
            <TouchableOpacity onPress={() => setShowInfoModal(false)}>
              <Ionicons name="close" size={24} color={t.color['fg-muted']} />
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-6 pt-6">
            <View className="mb-5">
              <Text className="text-accent text-base font-body-semi mb-2">Birth name matters</Text>
              <Text className="text-fg-secondary text-sm">
                In Pythagorean numerology, your name carries a vibrational signature determined by the letters in it. Traditionally, this is calculated from the name as it was given to you at birth, before any changes (marriage, legal name change, nicknames).
              </Text>
            </View>
            <View className="mb-5">
              <Text className="text-accent text-base font-body-semi mb-2">What if I don't remember it exactly?</Text>
              <Text className="text-fg-secondary text-sm">
                Use your best recollection. If you have a birth certificate available, use the spelling there. Middle names matter and contribute to the calculation.
              </Text>
            </View>
            <View className="mb-8">
              <Text className="text-accent text-base font-body-semi mb-2">Can I update later?</Text>
              <Text className="text-fg-secondary text-sm">
                Yes. You can regenerate your Name Destiny next month after refining.
              </Text>
            </View>
          </ScrollView>
          <View className="px-6 pb-8 pt-4 border-t border-border-subtle">
            <TouchableOpacity
              onPress={() => setShowInfoModal(false)}
              style={{
                backgroundColor: t.color.accent,
                paddingVertical: 14,
                borderRadius: t.radius.lg,
                alignItems: 'center',
              }}
            >
              {/* 🔴 A5 — the third instance in this pair of screens: an accent fill, the plain
                  foreground, about 2.31:1, on the only control that dismisses this sheet. */}
              <Text className="text-on-accent font-body-bold text-base">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🔴 `O-27` CLOSED — LockShell density 1, mounted LAST so it covers the screen. What is
          behind the veil is this screen's own body, i.e. the feature being denied, which is as
          close to §4.1's "real content, not lorem" as the client can get while the server refuses
          the payload outright. Covering also makes the form inert, so an unentitled user can no
          longer type into a field whose submit will 403.
          ⚠️ THE TWO STRINGS ARE COMPOSED FROM SHIPPED ONES, NOT INVENTED (§0.0 rule 2). The title
             takes the banner's shipped pattern with this screen's own noun; the body is this
             screen's own header subtitle. Neither names a tier — the server's message did, and
             that was the R1 half of the defect. Registered for PM as new lock copy. */}
      {locked && (
        <LockShell
          density={1}
          title="Unlock Your Name Destiny"
          body="Your name's cosmic blueprint"
          secondaryTitle="Maybe Later"
          onSecondary={() => router.back()}
        />
      )}
    </ScreenContainer>
  );
}

function AnalysisResults({ analysis }: { analysis: any }) {
  const na = analysis.currentNameAnalysis;
  const variations = analysis.nameVariations || [];

  return (
    <>
      {/* Current Name Header */}
      <Card className="mb-4">
        <Text className="text-accent text-2xl font-body-bold text-center mb-4">{analysis.fullName}</Text>

        {/* Number Badges */}
        <View className="flex-row justify-center mb-4" style={{ gap: 12 }}>
          <View className="items-center bg-bg rounded-md p-3 flex-1 border border-border-subtle">
            <Text className="text-fg-muted text-xs mb-1">Expression</Text>
            <Text className="text-accent text-2xl font-body-bold">{analysis.expressionNumber}</Text>
          </View>
          <View className="items-center bg-bg rounded-md p-3 flex-1 border border-border-subtle">
            <Text className="text-fg-muted text-xs mb-1">Soul Urge</Text>
            <Text style={{ color: t.color.accent }} className="text-2xl font-body-bold">{analysis.soulUrgeNumber}</Text>
          </View>
          <View className="items-center bg-bg rounded-md p-3 flex-1 border border-border-subtle">
            <Text className="text-fg-muted text-xs mb-1">Personality</Text>
            <Text style={{ color: t.color.accent }} className="text-2xl font-body-bold">{analysis.personalityNumber}</Text>
          </View>
        </View>

        {/* Meanings */}
        {na?.expressionMeaning && (
          <View className="mb-3">
            <Text className="text-accent text-sm font-body-semi mb-1">Expression Number</Text>
            <Text className="text-fg-secondary text-sm">{na.expressionMeaning}</Text>
          </View>
        )}
        {na?.soulUrgeMeaning && (
          <View className="mb-3">
            <Text style={{ color: t.color.accent }} className="text-sm font-body-semi mb-1">Soul Urge Number</Text>
            <Text className="text-fg-secondary text-sm">{na.soulUrgeMeaning}</Text>
          </View>
        )}
        {na?.personalityMeaning && (
          <View className="mb-3">
            <Text style={{ color: t.color.accent }} className="text-sm font-body-semi mb-1">Personality Number</Text>
            <Text className="text-fg-secondary text-sm">{na.personalityMeaning}</Text>
          </View>
        )}
      </Card>

      {/* Overall Assessment */}
      {na?.overallAssessment && (
        <Card className="mb-4">
          <Text className="text-fg text-lg font-body-bold mb-2">Overall Assessment</Text>
          <Text className="text-fg-secondary text-sm">{na.overallAssessment}</Text>

          {/* Strengths */}
          {na.strengths && na.strengths.length > 0 && (
            <View className="mt-4">
              <Text className="text-accent text-sm font-body-semi mb-2">Strengths</Text>
              {na.strengths.map((s: string, i: number) => (
                <View key={i} className="flex-row items-center mb-1.5">
                  <Text style={{ color: t.color.accent }} className="text-xs mr-2">&#10003;</Text>
                  <Text className="text-fg-secondary text-sm">{s}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Challenges */}
          {na.challenges && na.challenges.length > 0 && (
            <View className="mt-3">
              <Text className="text-fg-muted text-sm font-body-semi mb-2">Areas for Growth</Text>
              {na.challenges.map((c: string, i: number) => (
                <Text key={i} className="text-fg-muted text-sm mb-1">&#8226; {c}</Text>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Name Variations */}
      {variations.length > 0 && (
        <View className="mb-4">
          <Text className="text-fg text-lg font-body-bold mb-3">Optimized Variations</Text>

          {variations.map((v: any, i: number) => {
            const rankIcons = ['#1', '#2', '#3'];
            /* §5.4's card entrance: 40ms per row, capped at 5 by `staggerFor`. The index is the ONLY
               thing passed — a card without one is simply PRESENT, because a second entrance would
               compound with the screen entrance to a 16dp rise and §5.3 rule 3's limit is 8. */
            return (
              <Card key={i} index={i} className="mb-3">
                <View className="flex-row items-center mb-3">
                  <View
                    className="w-8 h-8 rounded-pill items-center justify-center mr-3"
                    style={{ backgroundColor: i === 0 ? t.color.accent : i === 1 ? t.color['fg-muted'] : t.alpha(t.color.accent, 60) }}
                  >
                    <Text className="text-on-accent text-xs font-body-bold">{rankIcons[i]}</Text>
                  </View>
                  <Text className="text-accent text-lg font-body-bold flex-1">{v.suggestedName}</Text>
                </View>

                <Text className="text-fg-muted text-xs mb-3">{v.changeDescription}</Text>

                {/* New Numbers */}
                <View className="flex-row mb-3" style={{ gap: 8 }}>
                  <View className="items-center bg-bg rounded-sm p-2 flex-1 border border-border-subtle">
                    <Text className="text-fg-muted text-xs">Expr</Text>
                    <Text className="text-accent font-body-bold">{v.newExpressionNumber}</Text>
                  </View>
                  <View className="items-center bg-bg rounded-sm p-2 flex-1 border border-border-subtle">
                    <Text className="text-fg-muted text-xs">Soul</Text>
                    <Text style={{ color: t.color.accent }} className="font-body-bold">{v.newSoulUrgeNumber}</Text>
                  </View>
                  <View className="items-center bg-bg rounded-sm p-2 flex-1 border border-border-subtle">
                    <Text className="text-fg-muted text-xs">Pers</Text>
                    <Text style={{ color: t.color.accent }} className="font-body-bold">{v.newPersonalityNumber}</Text>
                  </View>
                </View>

                <Text className="text-fg-secondary text-sm mb-3">{v.benefitSummary}</Text>

                {/* Impact Area Tags */}
                {v.impactAreas && v.impactAreas.length > 0 && (
                  <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                    {v.impactAreas.map((area: string, j: number) => (
                      <View
                        key={j}
                        className="px-3 py-1 rounded-pill"
                        style={{ backgroundColor: t.alpha(IMPACT_TINT, 10) }}
                      >
                        <Text
                          className="text-xs font-body-semi"
                          style={{ color: IMPACT_TINT }}
                        >
                          {area}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}
    </>
  );
}
