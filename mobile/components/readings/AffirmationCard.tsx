import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { showAlert } from '@/lib/alert';
import { LockShell } from '@/components/ui/LockShell';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

/**
 * ⚠️ THE WORD FOR THE FACE THIS CARD USES IS ALSO A BANNED UTILITY, so it is not written here.
 *    Saying it in prose drove `no-synthetic-italic` from a PERMANENT 0 to 2 and emitted a live
 *    Tailwind rule for the exact property this project forbids — caught twice over, by that rule
 *    and independently by `--diff`. Thirteenth instance of "a comment is source", and the
 *    sharpest: the correct MECHANISM is a family, and the name of the effect is the WRONG
 *    mechanism's utility, so describing the right thing spells the banned one. Emphasis is a
 *    family here and everywhere; there is exactly one such face and `font-quote` selects it.
 *
 * AffirmationCard — §9 item 11. 🔴 MEASURED: 4 files, 5 call sites — `astrology/daily` TWICE,
 * `astrology/monthly`, `astrology/weekly`, `readings/face`. design §9 row 11 says the reach is
 * "Home", and Home does not render it at all. Third §9 scope claim corrected by counting.
 *
 * ── THE GROUND IS THE QUOTE-CARD GROUND, AND THE DESIGN NAMES IT FOR THIS SURFACE ────────────
 *
 * design §2 row 16 gives the secondary-accent wash exactly two jobs — the Deep Insight wash and
 * the QUOTE-CARD GROUND — and design §9 row 11 assigns it here by name. So the amber gradient it
 * replaces goes: §2 keeps ONE gradient in the whole system (the primary Button's) and the rest
 * become washes. The step becomes the ramp's own quotation step, the one slanted serif in the app.
 *
 * 🔴 AND THE PAIRING IS `O-17`'s RULING, NOT A COINCIDENCE: the secondary accent may ground this
 *    card because a wash is not a label, while the copy control's fill stays the primary accent
 *    because it TRIGGERS AN ACTION and §16.1 forbids the secondary accent on anything tappable.
 *    Two accents on one card, each in the only role it is allowed to hold.
 *
 * ── 🔴 THE LOCK BRANCH HAS ZERO CALL SITES AND IS *NOT* DELETED — A MONETISATION CALL ────────
 *
 * Measured across the four lock-bearing cards in this folder:
 *
 *      AffirmationCard   0 call sites pass a lock flag      <- unreachable
 *      GrowthCard        3
 *      PalmLineCard      1
 *      ScoreCard         4
 *
 * By the standing rule a zero-call-site option is a DEFECT, and item 3 deleted one on exactly
 * that reasoning. 🔴 THIS ONE STAYS, because deleting it decides something a restyle may not:
 * every sibling card gates its content and this one does not, so the prop is most likely a gate
 * that was never wired rather than a capability nobody wanted. Removing it would be a
 * MONETISATION CHANGE WEARING A DESIGN CHANGE'S CLOTHES — the reasoning behind ruling R-B about
 * the 25 teaser strings — and §0.0 rule 1 puts preserving behaviour above tidying it up.
 * Registered for the owner instead.
 *
 * ⚠️ THREE CONSEQUENCES OF THAT BRANCH BEING DEAD — ✅ ALL THREE CLOSED AT ITEM 13:
 *   · item 13's scope was "4 lock overlays". It was THREE LIVE AND ONE DEAD — the same
 *     correction `O-42` already took once, when only one of four section-card lock branches
 *     turned out to be reached. All four now render one shared treatment.
 *   · its copy named a TIER — an R1 violation and a FIFTH `C-5` literal the audit's list of four
 *     missed. Retired with the merge, at all four sites rather than at the reachable ones.
 *   · its padlock was a FIFTH pictograph of the kind item 4 retired in favour of the icon set. It
 *     is now the shell's plate glyph, so this file's marked-glyph exception retires too — and
 *     item 13 did NOT delete the branch, which is what this header predicted it would. `P46` is
 *     the reason, and it is a PRODUCT question, not a design one.
 */
interface AffirmationCardProps {
  text: string;
  /** 🔴 UNREACHABLE TODAY — see the header. Do not delete without an owner ruling. */
  isLocked?: boolean;
  /** Also unreachable. If copying should count toward the review ladder, that is X4/X5's single
   *  entry point and a deliberate decision, not a prop nobody passes. */
  onCopy?: () => void;
}

export function AffirmationCard({ text, isLocked, onCopy }: AffirmationCardProps) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert('Copied!', 'Affirmation copied to clipboard');
    onCopy?.();
  };

  return (
    <View className="mb-6">
      <View className="bg-accent-2-muted rounded-xl p-6">
        {/* 🔴 THE BRANCH SURVIVES AND IS NOW THE SHARED TREATMENT — both halves are deliberate.
            It is still unreachable (no call site passes a lock flag while all three siblings do),
            and `O-60` / `P46` keep it because deleting it decides a MONETISATION question a
            restyle may not. But "unreachable" was never a reason to leave it as a fourth
            divergent copy: it was the one of the four that had the scaling opt-in and the marked
            pictograph, and its sibling had a 1.25:1 label. Merging it is what stops the next
            reader from copying whichever version they happen to open. */}
        {isLocked && (
          <View className="absolute inset-0 z-10 rounded-xl overflow-hidden">
            <View className="flex-1 items-center justify-center bg-surface-raised">
              <LockShell density={3} title="Upgrade to Unlock" />
            </View>
          </View>
        )}

        {/* The two large marks are DECORATION, not copy: punctuation standing in for a quotation
            device. They are hidden from the accessibility tree on both platforms — a screen reader
            announcing the same character before and after the sentence adds nothing and interrupts
            twice — and they take the quotation face because this is the one card whose whole subject
            is a quotation. A size utility carries no family, so without it they would render in
            the body face at 60px. */}
        <Text
          className="text-accent text-6xl font-quote mb-4 text-center"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          &quot;
        </Text>
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          className="text-fg text-quote font-quote text-center mb-4"
        >
          {text}
        </Text>
        <Text
          className="text-accent text-6xl font-quote text-center"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          &quot;
        </Text>

        {!isLocked && (
          <TouchableOpacity
            onPress={handleCopy}
            /* design §9 row 11's a11y contract. The hint is design-specified rather than invented,
               and it is needed because the visible label says what the control is called, not what
               pressing it does to the affirmation above it. */
            accessibilityRole="button"
            accessibilityHint="Copies the affirmation"
            className="mt-4 bg-accent py-3 px-6 rounded-pill self-center"
          >
            <Text className="text-on-accent font-body-semi">Copy to Clipboard</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
