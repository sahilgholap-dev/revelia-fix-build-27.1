import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as t from '@/theme';

/**
 * 🔴 EVERY FIGURE BELOW IS A MEASURED SERVER FACT, NOT MARKETING. The wording is PM's; the
 * numbers are whatever the enforcement point returns, and each one is cited at its row so a
 * future edit has to go and look rather than guess.
 *
 *   AI Astrologer + Deep Insight  QA_CAPS, server qa-caps.service.ts — 3/1, 10/3, 15/8 per
 *                                 UTC calendar month, no rollover. A Deep Insight ask spends
 *                                 BOTH a question slot and a Deep Insight slot, which is why
 *                                 these are two rows and not one: a free user reading "3"
 *                                 alone would not learn that only one of the three may be deep.
 *   Name Destiny                  reading.controller.ts generateNameDestiny — 1 per calendar
 *                                 month, Premium Plus only.
 *   Personalized Cosmic Report    report.controller.ts reportLimitForTier — 1 per UTC calendar
 *                                 month, Premium Plus only. ⚠️ Both levers are server-side and
 *                                 reversible without a client release, so if the owner reaches
 *                                 a different ruling on the report's tier reach this row goes
 *                                 stale silently. That is the standing argument for the caps
 *                                 payload registered as build-28 work.
 *   Compatibility                 compatibility.service.ts checkCompatibilityAccess — free is
 *                                 ONE reading for the lifetime of the account (it never
 *                                 refills); paid is uncapped. Non-love relationship kinds are
 *                                 Premium Plus only, enforced in compatibility.controller.ts.
 *
 * 🔴 THE "Ad-free experience" ROW WAS DELETED 2026-08-06, AND IT IS A FACT CORRECTION RATHER
 *    THAN A COPY EDIT. There is no ad SDK anywhere in this app — no AdMob, no network, no
 *    placement, and `lib/constants.ts`'s `adFree` flag has zero readers. So a free user's
 *    experience is ALREADY ad-free, and the row's free-column negation was FALSE in the
 *    direction that flatters the paid tiers: it claimed a benefit paid users do not actually
 *    receive over free ones, on the highest-revenue surface in the app.
 *    ⚠️ PM owns the wording of a row. Engineering owns whether the row is TRUE, and this one was
 *    not — which is why this is the one line of P85 that did not wait for a PM sentence.
 *    If ads are ever on a roadmap, the row comes back WITH the SDK, never before it.
 *
 * ⚠️ "Priority support" REMAINS AND IS STILL UNENFORCED — zero implementation, zero references
 *    outside this file, no support route/queue/tag anywhere. It is left VERBATIM on purpose:
 *    unlike the ad row it is not false, it is UNVERIFIABLE, and retiring an unverifiable promise
 *    is a PM decision rather than a fact correction (§0.0 rule 1). Still open in P85.
 */

/** The uncapped marker. A vector mark, deliberately NOT the mathematical character: the
 *  bundled faces are text-focused and may omit that codepoint, which falls back per
 *  manufacturer. Reference-compared, so it can never collide with a real cell string. */
const UNCAPPED = { uncapped: true } as const;

type FeatureCell = boolean | string | typeof UNCAPPED;

interface FeatureRow {
  name: string;
  free: FeatureCell;
  premium: FeatureCell;
  plus: FeatureCell;
}

export function FeatureComparisonTable() {
  const features: FeatureRow[] = [
    { name: 'Basic face & palm readings', free: true, premium: true, plus: true },
    { name: 'Daily personalized insights', free: true, premium: true, plus: true },
    { name: 'AI Astrologer questions', free: '3/month', premium: '10/month', plus: '15/month' },
    { name: 'Deep Insight answers', free: '1/month', premium: '3/month', plus: '8/month' },
    { name: 'Full face reading (all categories)', free: false, premium: true, plus: true },
    { name: 'Full palm reading (both hands)', free: false, premium: true, plus: true },
    { name: 'Monthly reading (full)', free: false, premium: true, plus: true },
    { name: 'Combined cosmic profile', free: false, premium: true, plus: true },
    { name: 'Compatibility', free: '1 free reading', premium: UNCAPPED, plus: 'All' },
    { name: 'Weekly forecasts', free: false, premium: false, plus: true },
    { name: 'Name Destiny Analysis', free: false, premium: false, plus: '1/month' },
    { name: 'Career Destiny Path', free: false, premium: false, plus: true },
    { name: 'Personalized Cosmic Report', free: false, premium: false, plus: '1/month' },
    { name: 'Priority support', free: false, premium: false, plus: true },
  ];

  const renderCheck = (value: FeatureCell) => {
    // Ordered: the marker object is truthy and would be swallowed by the affirm branch.
    if (value === UNCAPPED) {
      // 🔴 P76 — this mark is the SOLE carrier of its meaning. Nothing visible beside it says
      // "unlimited": its row reads "Compatibility" and its column reads "PREM". So it is
      // labelled, unlike a mark that merely repeats adjacent copy.
      return (
        <Ionicons
          name="infinite"
          size={20}
          color={t.color.success}
          accessibilityLabel="Unlimited"
        />
      );
    }
    if (typeof value === 'string') {
      return <Text style={{ ...t.txt('text-2xs').style, color: t.color.success, textAlign: 'center' }}>{value}</Text>;
    }
    if (value) {
      return <Ionicons name="checkmark-circle" size={20} color={t.color.success} />;
    }
    return <Ionicons name="close-circle" size={20} color={t.color.danger} />;
  };

  return (
    <View className="bg-surface rounded-lg p-4">
      <View className="flex-row mb-3 pb-3 border-b border-border-subtle">
        <View className="flex-1" />
        <Text className="w-16 text-center text-fg-muted text-xs">FREE</Text>
        <Text className="w-20 text-center text-accent-2 text-xs font-body-semi">PREM</Text>
        <Text className="w-20 text-center text-accent text-xs font-body-semi">PLUS</Text>
      </View>

      {features.map((feature, index) => (
        <View key={index} className="flex-row items-center py-2">
          <Text className="flex-1 text-fg text-xs">{feature.name}</Text>
          <View className="w-16 items-center">{renderCheck(feature.free)}</View>
          <View className="w-20 items-center">{renderCheck(feature.premium)}</View>
          <View className="w-20 items-center">{renderCheck(feature.plus)}</View>
        </View>
      ))}
    </View>
  );
}
