import React from 'react';
import { View, Text } from 'react-native';
import { LockShell } from '@/components/ui/LockShell';

interface PalmLineCardProps {
  lineName: string;    // "Heart Line"
  strength: 'strong' | 'moderate' | 'faint';
  interpretation: string;
  icon?: string;
  isLocked?: boolean;
}

export function PalmLineCard({ lineName, strength, interpretation, icon, isLocked }: PalmLineCardProps) {
  const getStrengthCount = () => {
    if (strength === 'strong') return 3;
    if (strength === 'moderate') return 2;
    return 1;
  };

  return (
    <View className="bg-surface rounded-lg p-5 mb-4">
      {/* One of the four card lock overlays merged at item 13. The blurred layer is density 1's
          alone (§4.1); the overlay structure stays so the card does not reflow when it locks; the
          pictograph becomes the shell's plate glyph (§9.2 bans emoji-as-icon); the copy loses its
          TIER NAME, which was an R1 violation and a `C-5` literal at three more sites than the
          audit listed. This overlay also had no scaling opt-in — the shell carries it. */}
      {isLocked && (
        <View className="absolute inset-0 z-10 rounded-lg overflow-hidden">
          <View className="flex-1 items-center justify-center bg-surface-raised">
            <LockShell density={3} title="Upgrade to Unlock" />
          </View>
        </View>
      )}
      
      <View className="flex-row items-center mb-3">
        {icon && <Text className="text-2xl mr-2">{icon}</Text>}
        <Text className="text-fg text-lg font-body-semi flex-1" style={{ textTransform: 'capitalize' }}>{lineName}</Text>
      </View>

      {/* Strength indicator */}
      <View className="flex-row gap-2 mb-3">
        {[1, 2, 3].map((index) => (
          <View
            key={index}
            className={`h-2 flex-1 rounded-pill ${
              index <= getStrengthCount() ? 'bg-accent' : 'bg-border-subtle'
            }`}
          />
        ))}
      </View>

      <Text className="text-fg-muted text-sm">{interpretation}</Text>
    </View>
  );
}
