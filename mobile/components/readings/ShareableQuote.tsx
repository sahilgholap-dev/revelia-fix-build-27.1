import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { shareReadingCard } from '@/utils/shareReading';
import * as t from '@/theme';

/**
 * ⚠️ THE WORD FOR THE FACE THIS CARD USES IS ALSO A BANNED UTILITY, so it is not written here —
 *    the same hazard AffirmationCard's header records. Emphasis is a FAMILY, and `font-quote`
 *    selects the one slanted serif in the app.
 *
 * ShareableQuote — §9 item 10. 🔴 MEASURED: 4 files, 5 call sites — `astrology/daily` TWICE,
 * `astrology/monthly`, `astrology/weekly`, `readings/palm`.
 *
 * ── 🔴 THE FINDING: THE QUOTE ITSELF WAS THE WORST REACHABLE TEXT IN THE PROGRAMME ────────────
 *
 * This card's ground ran from the primary accent to the canvas, and the quote — the entire point
 * of the card, and the only place that string appears — took the ON-FILL role across all of it.
 * That role is correct on an accent FILL and catastrophic on the canvas. Measured down the ramp:
 *
 *      at the top edge      6.86:1     legal
 *      ~a quarter down      5.22:1     legal
 *      ~a third down        3.87:1     🔴 sub-AA
 *      ~three-quarters      1.42:1     🔴
 *      at the bottom edge   1.06:1     🔴 all but invisible
 *
 * 🔴 THE QUOTE SAT FROM ROUGHLY A THIRD TO THREE-QUARTERS DOWN, SO EVERY ONE OF ITS 5 CALL SITES
 *    RENDERED SUB-AA COPY, AND ITS LOWER HALF RENDERED BELOW 2:1. It is model-authored copy on the
 *    surface built to leave the app into someone's feed. The comment that used to sit above the
 *    subject pill justified the pairing as *"matches the quote below it"* — which is the defect
 *    reasoning in one sentence: the pill has a real accent fill and the quote does not.
 *
 * 🔴 AND NO INSTRUMENT COULD SEE IT, FOR A STRUCTURAL REASON WORTH KEEPING. The A5 pair rule
 *    resolves a FILL style rule to a LABEL style rule through the style graph — that is what made
 *    distance irrelevant and what made it blocking. A two-colour gradient array is not a fill
 *    style rule, and which of its two ends applies depends on the text node's VERTICAL POSITION,
 *    which no static analysis can know. So the ground here was a function of layout, not a
 *    property of a rule, and the proximity rule read this file as clean the whole time.
 *
 * 🟢 THE GROUND IS NOW THE ONE DESIGN §2 ROW 16 NAMES FOR THIS EXACT SURFACE — the quote-card
 *    ground — which is also what item 11 gave the sibling card, so the two quote surfaces in the
 *    app finally agree. The quote takes the plain role at 14.04:1 and, at last, the quotation
 *    step and the quotation face: design §9 row 10 specifies that step and this card was rendering
 *    a body step in the body face, which is a component named for quotes not using the quote face.
 *
 * ⚠️ THE WASH IS NOT ONE OF §2's FOUR SURFACE STEPS AND ITS CONTRAST COLUMN IS NOT IN THAT MATRIX.
 *    Measured: the LABEL role is 4.47:1 on it — sub-AA, in the same band as the prohibition §2.1
 *    writes at 4.28:1. That is why the footer moved up a step rather than staying muted. Any
 *    future muted copy on a wash ground is a defect the published figures will not warn you about.
 *
 * ── ⚠️ TWO CAPTURE PRECONDITIONS, and the second one is NEW because of the change above ────────
 *
 *   1. the capture target keeps its anti-flattening prop, or Android has no native view to
 *      snapshot. It is spelled once, in the JSX, and not repeated here on purpose.
 *   2. 🔴 THE CAPTURE TARGET IS NOW EXPLICITLY OPAQUE. The retired slab was two solid values, so
 *      the exported PNG was opaque BY ACCIDENT; the quote-card ground is a translucent wash, so
 *      without an opaque base the capture can carry an alpha channel and a feed may composite it
 *      against white. The canvas token on the ref'd view is that base and it is load-bearing.
 *
 * 🔴 X6 / X7 UNTOUCHED: the util returns a BOOLEAN, `onShare` is GATED on it, the chain is one
 *    deep, and a dismissal resolves silently into the composed state rather than reaching the
 *    failed state. §2.2 row 9-11 is binding here.
 *
 * ⚠️ NOT DONE, DELIBERATELY: design §9 row 10's 1080x1920 export target, and its "scaled to 44/60
 *    at export" figures. No render target exists — the card is captured at its on-screen width —
 *    and building one is not a restyle. Registered.
 */
interface ShareableQuoteProps {
  quote: string;
  userName?: string;
  archetype?: string;
  onShare: () => void;
}

export function ShareableQuote({ quote, userName, archetype, onShare }: ShareableQuoteProps) {
  const viewRef = useRef<View>(null);

  const handleShare = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const shared = await shareReadingCard(viewRef);
      if (shared) onShare();
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('Share Failed', 'Unable to share at this time');
    }
  };

  return (
    <View className="mb-6">
      {/* 🔴 THE CAPTURE TARGET — both properties are preconditions, see the header. */}
      <View ref={viewRef} collapsable={false} className="bg-bg rounded-xl overflow-hidden">
        <View className="bg-accent-2-muted p-8">
          {archetype && (
            <View className="bg-accent px-4 py-2 rounded-pill self-center mb-6">
              {/* A5 — this pill is a real accent FILL, so the on-fill role is correct HERE and
                  only here. 6.86:1. */}
              <Text className="text-on-accent font-body-bold">{archetype}</Text>
            </View>
          )}

          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.3}
            className="text-fg text-quote font-quote text-center mb-6"
          >
            {quote}
          </Text>

          <View className="items-center">
            {/* Up a step from the label role deliberately: 4.47:1 on this wash, 8.65:1 here. */}
            <Text
              allowFontScaling
              maxFontSizeMultiplier={1.3}
              className="text-fg-secondary text-sm font-body"
            >
              ✨ Revelia ✨
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleShare}
        accessibilityRole="button"
        className="mt-4 bg-accent py-4 px-6 rounded-pill flex-row items-center justify-center"
      >
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          className="text-on-accent text-lg font-body-semi mr-2"
        >
          Share
        </Text>
        {/* §9.2 — no emoji renders as an icon anywhere in the system. */}
        <Ionicons name="share-social-outline" size={20} color={t.color['on-accent']} />
      </TouchableOpacity>
    </View>
  );
}
