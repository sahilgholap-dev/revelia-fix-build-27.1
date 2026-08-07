import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSuccessEntrance } from '@/lib/motion';
import { LinearGradient } from 'expo-linear-gradient';
import { getZodiacEmoji } from '@/lib/zodiacEmojis';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';

interface SunSignRevealProps {
  visible: boolean;
  sunSign: string;
  sunSignTraits: string[];
  lifePathNumber: number;
  lifePathMeaning: string;
  onContinue: () => void;
}

export const SunSignReveal: React.FC<SunSignRevealProps> = ({
  visible,
  sunSign,
  sunSignTraits,
  lifePathNumber,
  lifePathMeaning,
  onContinue,
}) => {
  /* 🔴 THIS WAS THE ONE LEGACY-`Animated` FILE IN THE TREE, AND THE SPRING IS WHY IT HAD TO GO
     (motion item 1). §18's contract is "ZERO springs, no bounce, no overshoot", and a spring cannot
     be tokenised at all: its settle is a function of tension and friction, so it has no duration for
     `theme.motion` to name. `tension: 50, friction: 7` overshoots 1.0 and comes back — the exact
     bounce the direction bans. ⚠️ `useNativeDriver: true` was not a get-out: it moves the FRAMES off
     the JS thread and leaves the ORCHESTRATION on it, so `Animated.parallel` still scheduled from JS.

     🔴 AND THE TOKEN NOW COMES FROM THE ONE HOOK RATHER THAN FROM HERE (motion item 8). Item 1
     implemented §5.4's success row INLINE — correct, and a SECOND COPY of a contract that belongs in
     one place. Item 8 needed a real success surface and this is it, so the two met:
     `useSuccessEntrance` owns the 0.92 -> 1 scale, `dur-slow` 420 and `ease-enter`; this file owns
     only the trigger and the haptic. The scale never passes 1 — §5.3's no-overshoot rule as a number —
     and it starts at 0.92 rather than 0 because rule 3 forbids scaling up from small.
     ⚠️ IT KEYS ON `visible`, NOT ON MOUNT, and that is deliberate: a modal reopens, and §5.3 rule 2's
        play-once guard governs ENTRANCES rather than state changes. The hook resets to 0 when
        `active` goes false, which is what the hand-rolled else-branch was doing. */
  const revealStyle = useSuccessEntrance(visible);

  React.useEffect(() => {
    if (visible) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-scrim/90 items-center justify-center px-6">
        <Animated.View style={revealStyle} className="w-full max-w-md">
          {/* 🔴 `O-103` / `P79` — the opaque ground moved OFF the stop list and UNDER it. The 25%
              tint is UNCHANGED: at this strength the straight-alpha bulge was the whole defect, and
              with the ramp one-hue the two accent labels read 4.52:1 and 5.32:1 instead of 3.96 and
              3.46. ⚠️ X17 lives on this element — `overflow` stays, and the added ground is a
              separate property that does not touch it. */}
          <LinearGradient
            colors={[t.alpha(t.color.accent, 0), t.alpha(t.color.accent, 25)]}
            className="rounded-xl p-8 border border-border-strong"
            style={{ overflow: 'visible', backgroundColor: t.color.surface }}
          >
            {/* Zodiac Emoji */}
            <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8, overflow: 'visible' }}>
              <View style={{ width: 110, height: 110, borderRadius: t.radius.pill, backgroundColor: t.alpha(t.color.accent, 20), alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 52 /* GLYPH */, lineHeight: 60, textAlign: 'center' }}>{getZodiacEmoji(sunSign)}</Text>
              </View>
              
              {/* Title */}
              <Text className="text-display-lg font-display text-fg text-center mb-2">
                You're a {sunSign}!
              </Text>
              
              {/* Life Path Number */}
              <View className="flex-row items-center mt-2">
                <View className="bg-accent rounded-pill w-12 h-12 items-center justify-center mr-3">
                  {/* A5: `on-accent` is the only legal foreground on an `accent` fill. */}
                  <Text className="text-2xl font-body-bold text-on-accent">
                    {lifePathNumber}
                  </Text>
                </View>
                <Text className="text-accent text-lg font-body-semi">
                  Life Path Number
                </Text>
              </View>
            </View>

            {/* Life Path Meaning */}
            <View className="bg-bg/50 rounded-md p-4 mb-6">
              {/* 2b/D2: `text-sm` ADDED, not renamed — the second of design §6.6 E's two
                  "unpaired" `leading-*` sites (no size step at all). Without it, deleting
                  the scale drops lifePathMeaning from lineHeight 24 to RN's font-metric
                  default ≈16.4 — about −7.6px per line on a body paragraph. §3.3's
                  default body step. Net 14/24 → 15/22. */}
              <Text className="text-fg-secondary text-sm text-center">
                {lifePathMeaning}
              </Text>
            </View>

            {/* Traits */}
            {sunSignTraits && sunSignTraits.length > 0 && (
              <View className="mb-6">
                <Text className="text-fg text-sm font-body-semi mb-3 text-center">
                  Your Key Traits
                </Text>
                {/* 🔴 `P79` — THE CHIP VEIL BELOW FELL 20% -> 10%, AND THIS PAIR IS THE ARGUMENT
                    FOR COMPOSING A PATH RATHER THAN READING A SINGLE GROUND. Three layers stack on
                    each trait chip: the card's raised step, the 25% accent ramp above it, and the
                    chip's own accent veil. Each is individually defensible; TOGETHER they lift the
                    ground to a mid clay and the iris label on it reads 3.85:1. Neither the A5 pair
                    rule nor any proximity window composes a path, so nothing in the tree could see
                    it. At 10% the same label reads 4.54:1.
                    ⚠️ The veil moved rather than the label, for the third time in this item: a
                       decorative tint has no ruling and a hue role does. */}
                <View className="flex-row flex-wrap justify-center gap-2">
                  {sunSignTraits.slice(0, 4).map((trait, index) => (
                    <View
                      key={index}
                      className="bg-accent/10 border border-border-strong rounded-pill px-4 py-2"
                    >
                      <Text className="text-accent-2 text-sm font-body-semi">
                        {trait}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Continue Button */}
            <Button
              title="Continue to Face Reading"
              onPress={onContinue}
              fullWidth
              size="lg"
            />
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default SunSignReveal;
