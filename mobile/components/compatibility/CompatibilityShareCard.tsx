import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';

/**
 * CompatibilityShareCard — 🔴 THE THIRD SHARE SURFACE, AND NOTHING SCHEDULES IT. Design §14.6
 * names it beside the other two when it widens W1; design §9's component list does not contain it
 * and neither does this plan's item roster. It is here because the item's own pre-flight required
 * diffing the three cards against each other before touching any of them, and a surface that
 * exports the same brand under a different set of rules is exactly what that pre-flight is for.
 *
 * ── 🟢 AND THE DIFF INVERTED THE EXPECTED RESULT: THIS WAS THE COPY THAT WAS RIGHT ─────────────
 *
 * The rule that duplication hides defects has paid four times in this phase, and every previous
 * time the divergent copy was the broken one. Here the UNSCHEDULED surface — the one no document
 * owns — held the two properties its two scheduled siblings got wrong:
 *
 *   · its ground was already a WASH, not a two-colour slab. Total swing across the whole card is
 *     1.05:1, so every foreground on it varies by under a ratio point and each one's published
 *     figure is true. Both siblings ran accent-to-canvas, where the on-fill role and the plain
 *     role CROSS and a band exists in which neither clears AA.
 *   · its quote already took the quotation face. The component actually NAMED for quotes did not.
 *
 * 🔴 SO ITS GRADIENT IS NOT "FIXED" HERE — IT IS FLATTENED TO THE STEP IT ALREADY CENTRED ON.
 *    design §2's aura row retires every gradient slab in the system except the primary control's
 *    fill, and a three-stop canvas-surface-canvas ramp is still a slab; collapsing it to the one
 *    surface step it spent most of its height at is a subtraction with no contrast consequence
 *    (measured: the label role moves 5.36 -> 5.11, the plain role 16.84 -> 16.04). What it buys is
 *    that all three share surfaces now ground the same way, so the next reader cannot copy the
 *    wrong one — which is the actual lesson of the four findings above.
 *
 * ── 🔴 WHAT WAS GENUINELY WRONG HERE, AND IT IS THE ROLE-vs-ROLE CLASS ────────────────────────
 *
 * The watermark took the PLACEHOLDER role — design §2 row 9, the one deliberately sub-AA
 * foreground in the palette, contracted to the `Input` placeholder ALONE because a required label
 * makes it safe there by construction. On this card it was carrying the brand at 3.15:1. It is one
 * of the census's 17 and the census drops by one with this commit.
 *
 * ── ⚠️ THE CAPTURE REF IS NOT IN THIS FILE, AND THAT IS DELIBERATELY LEFT ALONE ────────────────
 *
 * Its two siblings own their own ref and call the share util themselves. This one takes a required
 * `onShare` and the screen holds the ref one level up, wrapping this card AND its horizontal
 * padding — so moving capture in here would change what the exported PNG contains. §0.0 rule 1
 * puts preserving behaviour above unifying it. What DID get fixed is the screen's end: it had
 * hand-rolled a fourth copy of the whole share pipeline under the same name as the exported util.
 */
interface CompatibilityShareCardProps {
  user1: { name: string; imageUrl?: string };
  user2: { name: string; imageUrl: string };
  score: number;
  headline: string;
  quote: string;
  onShare: () => void;
}

export function CompatibilityShareCard({
  user1,
  user2,
  score,
  headline,
  quote,
  onShare
}: CompatibilityShareCardProps) {
  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShare();
  };

  return (
    <View className="rounded-xl overflow-hidden">
      {/* One opaque surface step. See the header — this is a flattening, not a recolour. */}
      <View className="bg-surface p-6">
        {/* Header */}
        <View className="items-center mb-6">
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.3}
            className="text-fg-muted text-sm font-body mb-2"
          >
            Compatibility Reading
          </Text>
          <View className="flex-row items-center">
            {/* User 1 photo */}
            <View className="w-20 h-20 rounded-pill bg-surface-raised items-center justify-center overflow-hidden">
              {user1.imageUrl ? (
                <Image source={{ uri: user1.imageUrl }} className="w-full h-full" />
              ) : (
                /* §9.2 — no emoji renders as an icon. This is an avatar FALLBACK, i.e. an icon by
                   function, and it also had to move off the card's own fill: the well was the same
                   step as the card behind it and read as nothing at all. */
                <Ionicons name="person" size={36} color={t.color['fg-muted']} />
              )}
            </View>

            {/* The connector between the two portraits — an icon by function, so §9.2 applies to
                it too. The design's only surviving emoji are StreakBadge's, and this is not it. */}
            <View className="mx-4">
              <Ionicons name="sparkles" size={32} color={t.color.accent} />
            </View>

            {/* User 2 photo */}
            <View className="w-20 h-20 rounded-pill bg-surface-raised items-center justify-center overflow-hidden">
              <Image source={{ uri: user2.imageUrl }} className="w-full h-full" />
            </View>
          </View>
        </View>

        {/* Score — 🔴 ONE COLOUR, ruling `O-24` (owner, 2026-07-31): full reasoning in
            ScoreCard.tsx. The score is uncalibrated model output, so a "worst" hue editorialises
            about a person, and a hue ladder would drift the secondary accent into a generic second
            colour (§16). THE NUMBER CARRIES THE VALUE. The single-branch helper that used to
            express this is gone — a function with one call site, no parameters and one possible
            return value is an indirection, not a decision, and as a className the token is
            greppable by every instrument in the tree. 6.95:1 on this ground. */}
        <View className="items-center mb-4">
          <Text className="text-accent text-6xl font-body-bold">
            {score}%
          </Text>
        </View>

        {/* Headline */}
        <Text className="text-fg text-2xl font-body-bold text-center mb-4">
          {headline}
        </Text>

        {/* Quote — the canvas step INSIDE the surface step is a recessed well, which is what it
            already was at the gradient's mid-point. 10.38:1. */}
        <View className="bg-bg rounded-md p-4 mb-4">
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.3}
            className="text-fg-secondary text-base text-center font-quote"
          >
            "{quote}"
          </Text>
        </View>

        {/* Watermark — was the placeholder role at 3.15:1. See the header. 5.11:1 now. */}
        <View className="items-center">
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.3}
            className="text-fg-muted text-xs font-body"
          >
            ✨ Revelia
          </Text>
        </View>
      </View>

      {/* Share button */}
      <TouchableOpacity
        onPress={handleShare}
        className="bg-accent py-4 items-center"
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          className="text-on-accent text-base font-body-semi"
        >
          Share Results
        </Text>
      </TouchableOpacity>
    </View>
  );
}
