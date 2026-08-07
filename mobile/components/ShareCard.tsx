import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { showAlert } from '@/lib/alert';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { shareReadingCard } from '@/utils/shareReading';
import * as t from '@/theme';

/**
 * ShareCard — §9 item 9. 🔴 MEASURED: 4 files, 4 call sites — `readings/face`,
 * `readings/combined`, `readings/career-destiny`, `numerology/name-destiny`.
 *
 * ── 🔴 THE GROUND WAS A TWO-COLOUR SLAB, AND A SLAB HAS NO SINGLE LEGAL FOREGROUND ───────────
 *
 * This card's ground ran from the primary accent at its top edge to the canvas at its bottom, so
 * a text node's contrast was a function of ITS VERTICAL POSITION rather than of its own style
 * rule. Measured across that ramp, sampled every 10%:
 *
 *      the on-fill role   6.86:1 at the top edge  ->  1.06:1 at the bottom
 *      the plain role     2.31:1 at the top edge  -> 16.84:1 at the bottom
 *
 * 🔴 SO THE TWO ROLES CROSS, AND THERE IS A BAND ROUGHLY A THIRD OF THE WAY DOWN WHERE NEITHER
 *    CLEARS AA — no token in the palette is legal there. Two of this card's own rules sat in it:
 *    the numeral row measured 1.77–2.20:1 and its labels 1.30–1.62:1, both reachable today at
 *    `numerology/name-destiny`, which is the one call site that passes numerals.
 *
 * 🟢 THE FIX IS THE ONE DESIGN §2 ALREADY RULED, and it is a subtraction rather than a recolour:
 *    §2's aura row retires every one of the 21 gradient slabs except the primary control's fill,
 *    and item 11 had already taken exactly this step on the sibling quote card. The ground is now
 *    ONE OPAQUE STEP of the surface ladder, so every foreground has one published figure:
 *    the plain role 16.04:1, the reading role 9.89:1, the label role 5.11:1, the accent 6.95:1.
 *
 * 🔴 AND THE BRAND DID NOT LEAVE — IT MOVED ONTO ELEMENTS THAT CARRY THEIR OWN OPAQUE FILL: the
 *    subject pill, the numerals and the share control. That is not a cosmetic distinction. The
 *    A5 pair rule resolves a FILL STYLE RULE to a LABEL STYLE RULE through the style graph, and a
 *    two-colour array is neither — so every accent surface on this card is now a pairing the gate
 *    can actually see, where before all of them were invisible to it.
 *
 * ── ⚠️ WHAT THIS CARD IS FOR, AND THE TWO PROPERTIES A RESTYLE MUST NOT DROP ──────────────────
 *
 * It is captured by `react-native-view-shot` and the PNG leaves the app into someone's feed, so
 * a broken export is worse than a plain one. Two structural preconditions carry that:
 *
 *   1. the capture target keeps its ANTI-FLATTENING prop (the boolean one view-shot needs; it is
 *      spelled once, in the JSX below, and deliberately not spelled again in prose). Without it
 *      Android may flatten the View
 *      away and the capture has no native handle to snapshot. It is invisible in every other
 *      respect, which is exactly why a restyle deletes it.
 *   2. the captured subtree stays OPAQUE. It was opaque only by accident before — the slab it
 *      grounded in happened to be two solid values — so the single surface step below is now
 *      load-bearing for whether the exported PNG has an alpha channel at all.
 *
 * 🔴 X6 / X7 ARE UNTOUCHED AND ARE NOT MINE TO SIMPLIFY: `shareReadingCard` returns a BOOLEAN,
 *    the caller's `onShared` is GATED on it, the fallback chain is exactly one deep, and a
 *    dismissal resolves rather than rejecting. UI-audit §5 X6/X7 and this plan's §2.2 row 9-11
 *    are explicit that the "failed" state is reachable ONLY on a non-dismissal error. A dismissal
 *    lands back in the composed state silently, exactly as it does today.
 *
 * ⚠️ NOT DONE HERE, DELIBERATELY: the design's 1080-square render target does not exist in this
 *    code and never has — the card is captured at its on-screen width. Building it is a render
 *    target, not a restyle. Registered rather than improvised.
 */
interface NumberBadge {
  label: string;
  value: number | string;
}

interface ShareCardProps {
  title: string;
  subtitle: string;
  insightLine: string;
  brandingTag?: string;
  numbers?: NumberBadge[];
  // Optional: invoked after the share resolves without throwing. Lets the
  // calling screen record a 'share:<type>' action without the share util
  // having to know the reading type (keeps shareReading.ts pure).
  onShared?: () => void;
}

export function ShareCard({
  title,
  subtitle,
  insightLine,
  brandingTag = '✨ Revelia ✨',
  numbers,
  onShared,
}: ShareCardProps) {
  const viewRef = useRef<View>(null);

  const handleShare = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const shared = await shareReadingCard(viewRef);
      if (shared) onShared?.();
    } catch (error) {
      console.error('Share failed:', error);
      showAlert('Share Failed', 'Unable to share at this time');
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* 🔴 THE CAPTURE TARGET. The prop below is the precondition for the snapshot having a
          native view to read on Android — see precondition 1 in the header. */}
      <View ref={viewRef} collapsable={false}>
        <View style={styles.card}>
          {/* The eyebrow is a `scales: false` step and the app-wide default is already frozen
              (lib/textDefaults.ts), so it carries no opt-in — writing one explicitly here would
              read as a deliberate opt-OUT and invite someone to "fix" it. */}
          <Text style={styles.title}>{title}</Text>

          <View style={styles.subtitleBadge}>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.subtitleText}>{subtitle}</Text>
          </View>

          {numbers && numbers.length > 0 && (
            <View style={styles.numbersRow}>
              {numbers.map((n, i) => (
                <View key={i} style={styles.numberCell}>
                  <Text style={styles.numberLabel}>{n.label}</Text>
                  {/* The numerals are ONE colour by ruling `O-24` — the score is uncalibrated
                      model output, so a hue ladder would editorialise. The per-site override
                      that used to sit here was typed as a free string, which is an ingress for a
                      raw value into a token-gated component, and all three call sites passed the
                      default it already had. */}
                  <Text style={styles.numberValue}>{n.value}</Text>
                </View>
              ))}
            </View>
          )}

          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.insight}>{insightLine}</Text>

          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.branding}>{brandingTag}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleShare}
        style={styles.shareButton}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.shareButtonText}>Share</Text>
        {/* §9.2 — no emoji renders as an icon anywhere in the system. This was a pictograph at a
            marked numeric size; the marker retires with it, which is what makes the excepted
            count in `no-numeric-fontsize` a real arrival check rather than a wash. */}
        <Ionicons name="share-social-outline" size={18} color={t.color['on-accent']} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  card: {
    // 🔴 ONE OPAQUE STEP, not a two-colour slab — see the header. Both properties matter: `one`
    //    is what gives every foreground a single published contrast figure, and `opaque` is what
    //    keeps the exported PNG free of an alpha channel.
    backgroundColor: t.color.surface,
    borderRadius: t.radius.xl,
    padding: 32,
  },
  title: {
    // The eyebrow takes the label role — design §2 row 8 gives it labels and meta, and the
    // subject line below carries the content. 5.11:1 on this ground.
    color: t.color['fg-muted'],
    fontFamily: t.family['body-bold'],
    fontSize: t.type['overline'].size,
    lineHeight: t.type['overline'].lineHeight,
    letterSpacing: t.type['overline'].letterSpacing,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  subtitleBadge: {
    backgroundColor: t.color.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: t.radius.pill,
    alignSelf: 'center',
    marginBottom: 24,
  },
  subtitleText: {
    // A5 — an accent FILL takes the on-fill role and nothing else. 6.86:1, and this pairing is
    // now resolvable by the style graph because the fill above is a real style rule.
    color: t.color["on-accent"],
    fontFamily: t.family['body-bold'],
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    textAlign: 'center',
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  numberCell: {
    alignItems: 'center',
    flex: 1,
  },
  numberLabel: {
    // 1.30–1.62:1 on the retired slab, reachable. 5.11:1 here.
    color: t.color['fg-muted'],
    fontFamily: t.family['body-semi'],
    fontSize: t.type['text-2xs'].size,
    lineHeight: t.type['text-2xs'].lineHeight,
    letterSpacing: t.type['text-2xs'].letterSpacing,
    marginBottom: 2,
  },
  numberValue: {
    // 1.77–2.20:1 on the retired slab, reachable. 6.95:1 here.
    color: t.color.accent,
    fontSize: t.type['text-2xl'].size,
    lineHeight: t.type['text-2xl'].lineHeight,
    letterSpacing: t.type['text-2xl'].letterSpacing,
    fontFamily: t.family['body-bold'],
  },
  insight: {
    color: t.color.fg,
    fontFamily: t.family['body-semi'],
    fontSize: t.type['text-lg'].size,
    lineHeight: t.type['text-lg'].lineHeight,
    letterSpacing: t.type['text-lg'].letterSpacing,
    textAlign: 'center',
    marginBottom: 24,
  },
  branding: {
    color: t.color['fg-muted'],
    fontFamily: t.family.body,
    fontSize: t.type['text-xs'].size,
    lineHeight: t.type['text-xs'].lineHeight,
    letterSpacing: t.type['text-xs'].letterSpacing,
    textAlign: 'center',
  },
  shareButton: {
    marginTop: 16,
    // §16.2: the secondary accent is NEVER the colour of an element that triggers an action. This
    // is a share CONTROL, so its fill is the primary accent.
    backgroundColor: t.color.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: t.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: t.color["on-accent"],
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-semi'],
    marginRight: 8,
  },
});
