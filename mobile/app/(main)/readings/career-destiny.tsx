import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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

export default function CareerDestiny() {
  const router = useRouter();
  const bottomPad = useBottomInsetPadding();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [career, setCareer] = useState<any>(null);
  const [canRegenerate, setCanRegenerate] = useState(false);

  useEffect(() => {
    fetchExisting();
  }, []);

  useEffect(() => {
    if (!career) return;
    recordMeaningfulAction('reading:career');
  }, [career]);

  const fetchExisting = async () => {
    try {
      const res = await api.get('/readings/career-destiny');
      if (res.success && res.data) {
        setCareer(res.data.career);
        setCanRegenerate(res.data.canRegenerate);
      }
    } catch (err: any) {
      /* 🔴 `O-27` — the second of the two dead ends, and the same bare catch. See
         numerology/name-destiny.tsx for the mechanism; both screens swallowed a structured 403
         and then printed the middleware's raw tier slug in the danger role with no upgrade path.
         Any other failure keeps the old meaning: no existing career destiny. */
      if (err?.response?.status === 403) setLocked(true);
    } finally {
      setIsFetching(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await api.post('/readings/career-destiny');
      if (res.success && res.data) {
        setCareer(res.data.career);
        setCanRegenerate(res.data.canRegenerate);
      } else {
        setError(res.error || 'Failed to generate career analysis');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to generate career analysis';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔴 THE REPORTED SITE: a bare indicator with no label, beside a sibling screen that says what it
  //    is loading. The fix is not a `<Text>` next to the indicator — it is the LOADING PRIMITIVE,
  //    which is §9 item 12's screen density and already carries the group accessibility role and
  //    the message-as-accessible-name that a hand-rolled pair does not. A screen reader on this
  //    branch previously announced nothing at all.
  if (isFetching) {
    return <LoadingSpinner text="Loading your career path..." fullScreen />;
  }

  return (
    <ScreenContainer withScrollView={false}>
      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={t.color.fg} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-fg text-2xl font-body-bold">Career Destiny</Text>
          <Text className="text-fg-muted text-sm">Your cosmic career path</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Missing readings banner */}
        {career && (!career.inputData?.hasFaceReading || !career.inputData?.hasPalmReading) && (
          <View className="bg-surface rounded-lg p-4 mb-4 border border-border-subtle">
            <Text className="text-accent text-sm font-body-semi mb-1">Enhance Your Results</Text>
            <Text className="text-fg-muted text-xs">
              {!career.inputData?.hasFaceReading && !career.inputData?.hasPalmReading
                ? 'Complete your Face Reading and Palm Reading for more accurate career insights.'
                : !career.inputData?.hasFaceReading
                  ? 'Complete your Face Reading for more accurate career insights.'
                  : 'Complete your Palm Reading for more accurate career insights.'}
            </Text>
          </View>
        )}

        {/* Regenerate Button - at top */}
        {career && canRegenerate && (
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isLoading}
            className="bg-surface rounded-lg p-4 mb-4 border border-border-subtle"
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator color={t.color.accent} size="small" />
                <Text className="text-accent font-body-semi ml-3">Regenerating...</Text>
              </View>
            ) : (
              <View className="flex-row items-center justify-center">
                <Ionicons name="refresh" size={18} color={t.color.accent} />
                <Text className="text-accent font-body-semi ml-2">
                  Regenerate (new readings available)
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {career ? (
          <CareerResults career={career} />
        ) : (
          <Card className="mb-4">
            <View className="items-center py-6">
              <Text style={{ fontSize: 56 /* GLYPH */ }} className="mb-4">&#x1F9ED;</Text>
              <Text className="text-fg text-xl font-body-bold text-center mb-2">
                Discover Your Career Path
              </Text>
              <Text className="text-fg-muted text-sm text-center mb-6 px-4">
                Combining your birth chart, numerology, face reading, and palm reading to reveal your top 5 ideal careers.
              </Text>

              {error && (
                <Text className="text-danger text-sm mb-3 text-center">{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleGenerate}
                disabled={isLoading}
                style={{
                  backgroundColor: t.color.accent,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  borderRadius: t.radius.lg,
                  width: '100%',
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                {/* 🔴 A5, LIVE AND REACHABLE — this control is an accent FILL and both of its
                    labels carried the plain foreground at about 2.31:1, which fails AA at every
                    size. It is the PRIMARY control on this screen, shown to every entitled user.
                    🔴 AND BOTH INSTRUMENTS ARE STRUCTURALLY BLIND TO IT: the fill is an INLINE
                       style so the pair rule (which resolves the StyleSheet graph) cannot see it,
                       and the report-only proximity rule's window is four lines while the labels
                       sit 12 and 15 lines below the fill. Found by reading the file this item
                       edits, which is the third time that has been the only instrument. */}
                {isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color={t.color['on-accent']} size="small" />
                    <Text className="text-on-accent font-body-bold ml-3">Analyzing your cosmic profile...</Text>
                  </View>
                ) : (
                  <Text className="text-on-accent font-body-bold text-lg">Discover My Career Path</Text>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Entertainment Disclaimer */}
        <View className="mb-8 px-4">
          <Text className="text-fg-muted text-xs text-center">
            For entertainment purposes only. Career guidance is based on astrological and numerological traditions and should not replace professional career counseling.
          </Text>
        </View>
      </ScrollView>

      {/* 🔴 `O-27` CLOSED — LockShell density 1, mounted LAST so it covers the screen. Same
          treatment as numerology/name-destiny.tsx: one component, three screens, which is the
          whole argument for doing this here rather than twice (§4.4). The title takes the shipped
          banner pattern with this screen's noun; the body is this screen's own header subtitle.
          Neither names a tier. Registered for PM as new lock copy. */}
      {locked && (
        <LockShell
          density={1}
          title="Unlock Your Career Destiny"
          body="Your cosmic career path"
          secondaryTitle="Maybe Later"
          onSecondary={() => router.back()}
        />
      )}
    </ScreenContainer>
  );
}

function CareerResults({ career }: { career: any }) {
  const cp = career.careerProfile;
  const careers = career.careers || [];
  const altPaths = career.nonTraditionalPaths || [];

  return (
    <>
      {/* Career Profile Card */}
      {cp && (
        <Card className="mb-4">
          <Text className="text-fg text-lg font-body-bold mb-3">Your Career Profile</Text>
          <Text className="text-fg-secondary text-sm mb-4">{cp.summary}</Text>

          {/* Core Strengths */}
          {cp.coreStrengths && cp.coreStrengths.length > 0 && (
            <View className="mb-4">
              <Text className="text-accent text-sm font-body-semi mb-2">Core Strengths</Text>
              <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                {cp.coreStrengths.map((s: string, i: number) => (
                  <View key={i} className="bg-bg px-3 py-1.5 rounded-pill border border-border-subtle">
                    <Text className="text-fg text-xs">{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Work Style */}
          {cp.workStyle && (
            <View className="mb-3">
              <Text style={{ color: t.color.accent }} className="text-sm font-body-semi mb-1">Work Style</Text>
              <Text className="text-fg-secondary text-xs">{cp.workStyle}</Text>
            </View>
          )}

          {/* Leadership Style */}
          {cp.leadershipStyle && (
            <View>
              <Text style={{ color: t.color.accent }} className="text-sm font-body-semi mb-1">Leadership Style</Text>
              <Text className="text-fg-secondary text-xs">{cp.leadershipStyle}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Top 5 Careers */}
      {careers.length > 0 && (
        <View className="mb-4">
          <Text className="text-fg text-lg font-body-bold mb-3">Your Top 5 Career Paths</Text>

          {/* §5.4's card entrance below: 40ms per row, capped at 5 by `staggerFor`. A card with no
              index is simply present — a second entrance would compound to a 16dp rise. */}
          {careers.map((c: any, i: number) => (
            <Card key={i} index={i} className="mb-3">
              <View className="flex-row items-center mb-3">
                <View className="flex-row items-center flex-1">
                  <Text style={{ fontSize: 28 /* GLYPH */ }} className="mr-3">{c.icon || '&#x1F4BC;'}</Text>
                  <View className="flex-1">
                    <Text className="text-fg text-base font-body-bold">{c.title}</Text>
                    <Text className="text-fg-muted text-xs">{c.field}</Text>
                  </View>
                </View>

                {/* Confidence Score */}
                <View className="items-center">
                  <View
                    className="w-12 h-12 rounded-pill items-center justify-center border-2"
                    style={{
                      borderColor: t.color.accent,   // O-24: ONE colour — confidenceScore is uncalibrated LLM output, so a 'worst' hue editorialises. The PERCENTAGE carries the value.
                    }}
                  >
                    <Text
                      className="text-sm font-body-bold"
                      style={{
                        color: t.color.accent,   // O-24: ONE colour — confidenceScore is uncalibrated LLM output, so a 'worst' hue editorialises. The PERCENTAGE carries the value.
                      }}
                    >
                      {c.confidenceScore}%
                    </Text>
                  </View>
                </View>
              </View>

              <Text className="text-fg-secondary text-sm mb-3">{c.description}</Text>

              {/* Aligned Traits */}
              {c.alignedTraits && c.alignedTraits.length > 0 && (
                <View className="mb-2">
                  {c.alignedTraits.map((t: string, j: number) => (
                    <View key={j} className="flex-row items-start mb-1">
                      <Text className="text-accent text-xs mr-2">&#x2022;</Text>
                      <Text className="text-fg-muted text-xs flex-1">{t}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Growth Potential Badge */}
              {c.growthPotential && (
                <View className="flex-row">
                  <View
                    className="px-3 py-1 rounded-pill"
                    style={{
                      backgroundColor: t.alpha(t.color.accent, 10),   // O-24 + §3.0.2.2.1: one colour, and t.alpha() instead of a a template-concatenated alpha suffix, which assumed the value's SHAPE and breaks at pass 5.
                    }}
                  >
                    <Text
                      className="text-xs font-body-semi"
                      style={{
                        color: t.color.accent,   // O-24
                      }}
                    >
                      {c.growthPotential} Growth
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {/* Non-Traditional Paths */}
      {altPaths.length > 0 && (
        <View className="mb-4">
          <Text className="text-fg text-lg font-body-bold mb-3">Alternative Paths</Text>

          {altPaths.map((p: any, i: number) => (
            <View
              key={i}
              className="bg-surface rounded-lg p-4 mb-3 border border-border-subtle"
            >
              <View className="flex-row items-center mb-2">
                <Text style={{ fontSize: 24 /* GLYPH */ }} className="mr-3">{p.icon || '&#x1F680;'}</Text>
                <Text className="text-fg font-body-semi flex-1">{p.title}</Text>
              </View>
              <Text className="text-fg-secondary text-sm mb-2">{p.description}</Text>
              {p.alignedTraits && p.alignedTraits.length > 0 && (
                <View>
                  {p.alignedTraits.map((t: string, j: number) => (
                    <Text key={j} className="text-fg-muted text-xs mb-0.5">&#x2022; {t}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Action Advice */}
      {career.actionAdvice && (
        <View
          className="rounded-lg p-5 mb-4"
          style={{ backgroundColor: t.alpha(t.color.accent, 10), borderWidth: 1, borderColor: t.alpha(t.color.accent, 25) }}
        >
          <Text className="text-accent text-sm font-body-bold mb-2">Action Advice</Text>
          <Text className="text-fg-secondary text-sm">{career.actionAdvice}</Text>
        </View>
      )}

      {/* Share Card */}
      {careers.length > 0 && (() => {
        const topCareer = careers[0];
        const subtitle = `${topCareer.title}, ${topCareer.confidenceScore}%`;
        const rawInsight = cp?.summary || topCareer.description || '';
        const insightLine = rawInsight.split('.')[0] + '.';
        return (
          <ShareCard
            title="Career Destiny"
            subtitle={subtitle}
            insightLine={insightLine}
          />
        );
      })()}
    </>
  );
}
