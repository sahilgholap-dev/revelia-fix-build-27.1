import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LockShell } from '@/components/ui/LockShell';
import * as t from '@/theme';

interface GrowthCardProps {
  text: string;
  isLocked?: boolean;
  title?: string;
}

export function GrowthCard({ text, isLocked, title = 'Growth Opportunity' }: GrowthCardProps) {
  return (
    <View className="mb-6">
      <LinearGradient
        colors={[t.color.accent, t.color['accent-2']]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-lg p-[2px]"
        /* GRADIENT-FG(none) — this gradient is a 2dp RING, not a fill: every text node below it
           sits on the opaque surface step its immediate child declares, so the ring is nobody's
           ground. Declared rather than left silent, because a gradient that resolves no label is
           indistinguishable from a gradient the walker failed on (X3's Button was exactly that). */
      >
        <View className="bg-surface rounded-lg p-5">
          {/* 🔴 THE LOCK LABEL HERE WAS UNREADABLE ON ANDROID AND IT SHIPPED. It used the
              on-fill foreground role over a blurred neutral, which measures 1.25:1 against the
              backdrop `expo-blur` actually composites (measured in the installed package: no
              tint prop takes the default branch, a WHITE overlay at 255*(radius/100)*0.44, so
              alpha 22 at radius 20). That role is legal ONLY on an accent fill; a blurred card
              is not one. Its three siblings used the plain foreground and were readable — so
              the ONE copy that reached for the accessible-pairing token was the broken one.
              🔴 AND THE TREATMENT IS NOW SHARED: the blurred layer belongs to density 1 and
                 nowhere else (§4.1), so the meaning users learned survives instead of being
                 diluted across four card overlays. The overlay STRUCTURE is kept deliberately —
                 the card must not reflow when it locks (§4's share-the-box invariant) — and it
                 grounds on the raised step so the plate above it still reads as a step. */}
          {isLocked && (
            <View className="absolute inset-0 z-10 rounded-lg overflow-hidden">
              <View className="flex-1 items-center justify-center bg-surface-raised">
                <LockShell density={3} title="Upgrade to Unlock" />
              </View>
            </View>
          )}
          
          <View className="flex-row items-center mb-3">
            <Text className="text-2xl mr-2">🌱</Text>
            <Text className="text-fg text-lg font-body-semi">{title}</Text>
          </View>
          
          <Text className="text-fg-muted text-base">{text}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}
