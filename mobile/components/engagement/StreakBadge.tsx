import React from 'react';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as t from '@/theme';

interface StreakBadgeProps {
  streak: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

// Explicit dimensions per size — fixes iOS production where padding-only
// sizing on LinearGradient collapsed the badge to a thin ribbon.
const SIZE_CONFIG = {
  small:  { height: 28, paddingHorizontal: 10, emoji: 14, number: 13, label: 11 },
  medium: { height: 36, paddingHorizontal: 14, emoji: 18, number: 15, label: 12 },
  large:  { height: 48, paddingHorizontal: 18, emoji: 22, number: 19, label: 14 },
} as const;

export function StreakBadge({ streak, size = 'medium', showLabel = true }: StreakBadgeProps) {
  if (streak === 0) return null;

  const cfg = SIZE_CONFIG[size];

  return (
    <LinearGradient
      colors={[t.color.accent, t.color.danger]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: cfg.height,
        paddingHorizontal: cfg.paddingHorizontal,
        borderRadius: cfg.height / 2 /* DERIVED */,   // 🔴 X11 — COUPLED to the height. PRESERVE-BLINDLY (§5.4).
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: cfg.emoji, marginRight: 4 }}>🔥</Text>
      <Text style={{ color: t.color['on-accent'], fontFamily: t.family['body-bold'], fontSize: cfg.number }}>{streak}</Text>
      {/* A5: ENTRY 6 row 13. This label was MISSED by 1b's 16 gradient fixes — the numeral
          above went to `on-accent` and this one stayed `fg`. It is a REGRESSION, not a
          pre-existing violation: on `main` the gradient ended at red-700, where white was
          4.83:1 and passing; the red-600 -> `danger` mapping moved it to 3.76:1, which fails.
          `on-accent` is 9.78:1 at the accent end and 5.58:1 at the danger end.
          ⚠️ No hex literal is quoted here on purpose — a comment quoting a migrated literal is
          indistinguishable from an unmigrated site and holds `no-raw-hex` above its floor. */}
      {showLabel && (
        <Text style={{ color: t.color['on-accent'], fontSize: cfg.label, marginLeft: 4 }}>day streak</Text>
      )}
    </LinearGradient>
  );
}
