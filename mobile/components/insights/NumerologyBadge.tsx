import React from 'react';
import { View, Text } from 'react-native';
import * as t from '@/theme';

interface NumerologyBadgeProps {
  type: 'lifePathNumber' | 'personalYear' | 'personalMonth';
  value: number;
  meaning?: string;
}

/* 🔴 `O-24` / `P27` COMPLETED — `personalMonth` was the last entry still carrying its own hue, and
   §16.5 is the ground: iris means premium / brand secondary and nothing else. Which of the three
   numbers this is, is stated IN WORDS directly under the disc. */
const typeConfig = {
  lifePathNumber: { label: 'Life Path', color: t.color.accent },   // O-24
  personalYear: { label: 'Personal Year', color: t.color.accent },
  personalMonth: { label: 'Personal Month', color: t.color.accent },
};

export function NumerologyBadge({ type, value, meaning }: NumerologyBadgeProps) {
  const config = typeConfig[type];

  return (
    <View className="items-center flex-1">
      {/* 🔴 A LIVE AA FAILURE, FOUND BY THE HUE SWEEP RATHER THAN BY A GATE, AND IT IS EXACTLY THE
          HALF `CLAUDE.md` SAYS NEITHER INSTRUMENT REACHES: an INLINE fill with a className label.
          The A5 pair rule resolves StyleSheet rule -> StyleSheet rule and cannot read
          `style={{ backgroundColor: … }}`; the proximity rule's window is ±4 lines and its pattern
          is white, not the foreground role. So all three of these discs shipped with the plain
          foreground on an accent fill at **2.31:1** — and the third, on the iris fill this commit
          also retires, at **1.96:1**, the lowest reachable pairing found in this sweep.
          🟢 `on-accent` is the ONE legal foreground on any filled accent-family ground (§2.2 / A5):
             6.86:1 here. This is not a contrast tweak riding a hue change — the hue change is what
             made the wrong pairing visible at all. */}
      <View
        className="w-16 h-16 rounded-pill items-center justify-center mb-2"
        style={{ backgroundColor: config.color }}
      >
        <Text className="text-on-accent text-2xl font-body-bold">{value}</Text>
      </View>
      <Text className="text-fg-muted text-xs text-center">{config.label}</Text>
      {meaning && (
        <Text className="text-fg text-xs text-center mt-1">{meaning}</Text>
      )}
    </View>
  );
}
