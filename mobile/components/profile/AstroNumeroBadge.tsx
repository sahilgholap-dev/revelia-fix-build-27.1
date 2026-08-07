import React from 'react';
import { View, Text } from 'react-native';
import { getZodiacEmoji } from '@/lib/zodiacEmojis';
import * as t from '@/theme';

interface AstroNumeroBadgeProps {
  sunSign: string;
  lifePathNumber: number;
  size?: 'small' | 'medium' | 'large';
  layout?: 'horizontal' | 'vertical';
}

// Explicit dimensions per size — same iOS-prod flex-collapse fix applied
// to other tile/badge components in build 16.
const SIZE_CONFIG = {
  small:  { height: 44, padding: 10, emoji: 22, signText: 13, numberSize: 32, numberText: 14 },
  medium: { height: 56, padding: 14, emoji: 28, signText: 14, numberSize: 40, numberText: 16 },
  large:  { height: 88, padding: 18, emoji: 44, signText: 16, numberSize: 56, numberText: 22 },
} as const;

export const AstroNumeroBadge: React.FC<AstroNumeroBadgeProps> = ({
  sunSign,
  lifePathNumber,
  size = 'medium',
  layout = 'horizontal',
}) => {
  const cfg = SIZE_CONFIG[size];

  if (layout === 'vertical') {
    return (
      <View style={{ alignItems: 'center' }}>
        {/* Sun Sign */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: cfg.emoji }}>{getZodiacEmoji(sunSign)}</Text>
          <Text style={{ fontSize: cfg.signText, color: t.color['fg-secondary'], fontFamily: t.family['body-semi'], marginTop: 4 }}>
            {sunSign}
          </Text>
        </View>

        {/* Life Path Number */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: cfg.numberSize,
              height: cfg.numberSize,
              borderRadius: cfg.numberSize / 2 /* DERIVED */,   // 🔴 X12 — derived from a protected dimension.
              backgroundColor: t.color.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* A5: the fill above is `accent`, so the foreground must be `on-accent`. `bg` is
                the app-canvas role — a canvas token used in the foreground dimension. */}
            <Text style={{ fontSize: cfg.numberText, fontFamily: t.family['body-bold'], color: t.color['on-accent'] }}>
              {lifePathNumber}
            </Text>
          </View>
          <Text style={{ fontSize: cfg.signText, color: t.color['fg-muted'], marginTop: 4 }}>
            Life Path
          </Text>
        </View>
      </View>
    );
  }

  // Horizontal layout
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: cfg.height,
        paddingHorizontal: cfg.padding,
        borderRadius: t.radius.md,
        backgroundColor: t.color.surface,
        borderWidth: 1,
        borderColor: t.color['border-subtle'],
        alignSelf: 'flex-start',
      }}
    >
      {/* Sun Sign */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
        <Text style={{ fontSize: cfg.emoji }}>{getZodiacEmoji(sunSign)}</Text>
        <Text style={{ fontSize: cfg.signText, color: t.color.fg, fontFamily: t.family['body-semi'], marginLeft: 8 }}>
          {sunSign}
        </Text>
      </View>

      {/* Divider */}
      <View style={{ width: 1, height: 32, backgroundColor: t.color['border-subtle'], marginRight: 16 }} />

      {/* Life Path Number */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: cfg.numberSize,
            height: cfg.numberSize,
            borderRadius: cfg.numberSize / 2 /* DERIVED */,   // 🔴 X12 — derived from a protected dimension.
            backgroundColor: t.color.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          {/* A5: `accent` fill above -> `on-accent` foreground, as at :54. */}
          <Text style={{ fontSize: cfg.numberText, fontFamily: t.family['body-bold'], color: t.color['on-accent'] }}>
            {lifePathNumber}
          </Text>
        </View>
        <Text style={{ fontSize: cfg.signText, color: t.color['fg-secondary'] }}>
          Life Path
        </Text>
      </View>
    </View>
  );
};

export default AstroNumeroBadge;
